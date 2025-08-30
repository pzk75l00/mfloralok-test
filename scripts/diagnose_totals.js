/*
  Script de diagnóstico para comparar "saldo disponible" (normalizado) vs "totales del mes".
  - Conecta a Firestore usando variables de entorno (mismas que React env).
  - Descarga movimientos (limit configurable).
  - Calcula y muestra: calculateAvailableTotalsFromFiltered, calculateDetailedTotals, y diferencias por método.

  Uso (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\path\to\serviceAccountKey.json';
    $env:REACT_APP_PROJECT_ID = 'tu-project-id'
    # y otras vars de entorno necesarias
    node .\scripts\diagnose_totals.js
*/

const { initializeApp, applicationDefault, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const path = require('path');

// Importar utilidades desde el código fuente
const bc = require('../src/utils/balanceCalculations');

async function main() {
  // Inicializar Firebase Admin con credenciales por env var GOOGLE_APPLICATION_CREDENTIALS
  try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (!keyPath) {
      console.error('ERROR: setea la variable de entorno GOOGLE_APPLICATION_CREDENTIALS con la ruta al serviceAccountKey.json');
      process.exit(1);
    }
    initializeApp({ credential: cert(require(path.resolve(keyPath))) });
  } catch (err) {
    console.error('No se pudo inicializar firebase-admin:', err.message || err);
    process.exit(1);
  }

  const db = getFirestore();

  // Leer movimientos (limit configurable)
  const limit = Number(process.env.DIAG_LIMIT) || 2000;
  console.log(`Descargando hasta ${limit} movimientos...`);
  const movSnap = await db.collection('movements').orderBy('date', 'desc').limit(limit).get();
  const movements = movSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Movimientos descargados: ${movements.length}`);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const movimientosMes = movements.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  console.log(`Movimientos en el mes actual: ${movimientosMes.length}`);

  // Calculations
  const detailed = bc.calculateDetailedTotals(movimientosMes);
  const available = bc.calculateAvailableTotalsFromFiltered(movimientosMes);

  console.log('\n--- Resumen calculado ---');
  console.log('calculateDetailedTotals ->', detailed);
  console.log('calculateAvailableTotalsFromFiltered ->', available);

  console.log('\n--- Diferencias por método ---');
  const diffEfectivo = (detailed.cajaFisica || 0) - (available.cajaFisica || 0);
  const diffMP = (detailed.cajaMP || 0) - (available.cajaMP || 0);
  const diffTotal = (detailed.totalGeneral || 0) - (available.totalGeneral || 0);
  console.log(`Efectivo: detailed - available = ${diffEfectivo}`);
  console.log(`MP:       detailed - available = ${diffMP}`);
  console.log(`Total:    detailed - available = ${diffTotal}`);

  // Si hay diferencia significativa, listar los candidatos a duplicados
  if (Math.abs(diffTotal) > 0.01) {
    console.log('\nBuscando duplicados candidatos (heurística)...');
    // Reusar la función que internalmente filtra duplicados: calculateTotalBalance
    const totalBalance = bc.calculateTotalBalance(movements);
    console.log('\nBalance total (calculateTotalBalance) sobre todos los movimientos:', totalBalance);

    // Heurística simple: encontrar IDs repetidos o pagos mixtos consecutivos con mismo total
    const ids = movimientosMes.map(m => m.id).filter(Boolean);
    const dupIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    if (dupIds.length > 0) {
      console.log('IDs repetidos detectados en el mes:', [...new Set(dupIds)]);
    } else {
      console.log('No se detectaron IDs repetidos en el mes (según doc.id).');
    }

    // Buscar grupos de movimientos en el mes con total similar y mismo tipo en ventana de 60s
    const byDate = movimientosMes.slice().sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
    const groups = [];
    for (let i = 0; i < byDate.length; i++) {
      const curr = byDate[i];
      for (let j = i+1; j < Math.min(byDate.length, i+6); j++) {
        const other = byDate[j];
        const t1 = new Date(curr.date || 0);
        const t2 = new Date(other.date || 0);
        const secs = Math.abs((t2 - t1)/1000);
        if (secs <= 60 && curr.type === other.type) {
          const tot1 = Number(curr.total) || 0;
          const tot2 = Number(other.total) || 0;
          if (Math.abs(tot1 - tot2) <= 0.01) {
            groups.push([curr.id, other.id, curr.type, tot1]);
          }
        }
      }
    }
    if (groups.length > 0) {
      console.log('Grupos candidatos a duplicados (id1, id2, type, total):');
      console.table(groups.slice(0,50));
    } else {
      console.log('No se hallaron grupos candidatos a duplicados por heurística de tiempo/total.');
    }
  }

  console.log('\nDiagnóstico finalizado.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error en diagnóstico:', err);
  process.exit(1);
});
