/*
  Diagnóstico ligero (CommonJS) para comparar totales del mes:
  - No importa módulos del src para evitar incompatibilidades ESM.
  - Heurística:
    * detailedTotals: suma directa por tipo usando m.total (Number)
    * normalizedTotals: primero elimina duplicados por id, luego para cada movimiento usa paymentMethods si existe,
      o paymentMethod para asignar total al método, o distribuye a 'efectivo' por defecto.

  Uso PowerShell:
    $env:GOOGLE_APPLICATION_CREDENTIALS = 'C:\ruta\a\serviceAccountKey.json'
    node .\scripts\diagnose_totals_cjs.js > .\diagnosis_output_cjs.txt 2>&1
*/

const admin = require('firebase-admin');
const path = require('path');

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getTotalFromMovement(m) {
  if (m == null) return 0;
  // Prefer m.total, else try sum of products, else 0
  if (m.total != null) return safeNumber(m.total);
  if (Array.isArray(m.products) && m.products.length > 0) {
    return m.products.reduce((s, p) => s + (safeNumber(p.total) || (safeNumber(p.price) * safeNumber(p.quantity))), 0);
  }
  return 0;
}

function getAmountsByMethod(m) {
  // Returns { efectivo: x, mercadoPago: y }
  const res = { efectivo: 0, mercadoPago: 0 };
  const total = getTotalFromMovement(m);
  if (m.paymentMethods && typeof m.paymentMethods === 'object') {
    // paymentMethods might be like { efectivo: 100, mercadoPago: 200 }
    const pm = m.paymentMethods;
    res.efectivo = safeNumber(pm.efectivo) || 0;
    // Accept alternative keys
    res.mercadoPago = safeNumber(pm.mercadoPago) || safeNumber(pm.mercadopago) || safeNumber(pm.mp) || 0;
    // If sum differs from total, prorate proportionally
    const sumPm = res.efectivo + res.mercadoPago;
    if (Math.abs(sumPm - total) > 0.01 && sumPm > 0) {
      const ratio = total / sumPm;
      res.efectivo *= ratio; res.mercadoPago *= ratio;
    }
    // If sumPm is zero but total > 0, default to efectivo
    if (sumPm === 0 && total > 0) res.efectivo = total;
    return res;
  }

  // Old format: single paymentMethod
  const pmSingle = m.paymentMethod;
  if (pmSingle === 'mercadoPago' || String(pmSingle).toLowerCase().includes('mp')) {
    res.mercadoPago = total;
  } else {
    // default to efectivo
    res.efectivo = total;
  }
  return res;
}

async function main() {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!keyPath) {
    console.error('ERROR: setea GOOGLE_APPLICATION_CREDENTIALS a la ruta del serviceAccount JSON');
    process.exit(1);
  }

  try {
    admin.initializeApp({ credential: admin.credential.cert(require(path.resolve(keyPath))) });
  } catch (err) {
    console.error('Error inicializando firebase-admin:', err.message || err);
    process.exit(1);
  }

  const db = admin.firestore();

  const limit = Number(process.env.DIAG_LIMIT) || 3000;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  console.log(`Descargando hasta ${limit} movimientos...`);
  const snap = await db.collection('movements').orderBy('date', 'desc').limit(limit).get();
  const movements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log('Movimientos totales descargados:', movements.length);

  const movimientosMes = movements.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  console.log('Movimientos en mes actual:', movimientosMes.length);

  // Detailed totals (naive)
  const detailed = {
    cajaFisica: 0,
    cajaMP: 0,
    totalGeneral: 0,
    cantidadProductosVendidos: 0
  };
  movimientosMes.forEach(m => {
    const total = getTotalFromMovement(m);
    detailed.totalGeneral += total;
    const am = getAmountsByMethod(m);
    detailed.cajaFisica += am.efectivo;
    detailed.cajaMP += am.mercadoPago;
    if (m.type === 'venta') detailed.cantidadProductosVendidos += Number(m.quantity) || 0;
  });

  // Normalized totals: dedupe by id then compute amounts
  const seen = new Set();
  const dedup = [];
  for (const m of movimientosMes) {
    if (m.id) {
      if (!seen.has(m.id)) { seen.add(m.id); dedup.push(m); }
    } else {
      dedup.push(m);
    }
  }

  const normalized = { cajaFisica: 0, cajaMP: 0, totalGeneral: 0, cantidadProductosVendidos: 0 };
  dedup.forEach(m => {
    const total = getTotalFromMovement(m);
    normalized.totalGeneral += total;
    const am = getAmountsByMethod(m);
    normalized.cajaFisica += am.efectivo;
    normalized.cajaMP += am.mercadoPago;
    if (m.type === 'venta') normalized.cantidadProductosVendidos += Number(m.quantity) || 0;
  });

  console.log('\n--- Results ---');
  console.log('Detailed (naive):', detailed);
  console.log('Normalized (dedup ids, prorated pm):', normalized);

  console.log('\n--- Differences (detailed - normalized) ---');
  console.log('Efectivo diff:', detailed.cajaFisica - normalized.cajaFisica);
  console.log('MP diff:      ', detailed.cajaMP - normalized.cajaMP);
  console.log('Total diff:   ', detailed.totalGeneral - normalized.totalGeneral);

  if (Math.abs(detailed.totalGeneral - normalized.totalGeneral) > 0.01) {
    console.log('\nCandidate duplicates by id (first 50 if any):');
    const ids = movimientosMes.map(m => m.id).filter(Boolean);
    const dupIds = ids.filter((x, i) => ids.indexOf(x) !== i);
    if (dupIds.length) {
      console.log([...new Set(dupIds)].slice(0,50));
    } else {
      console.log('No duplicate ids found in month.');
    }

    console.log('\nCandidate close-in-time groups (same type, same total, within 60s):');
    const byDate = movimientosMes.slice().sort((a,b) => new Date(a.date || 0) - new Date(b.date || 0));
    const groups = [];
    for (let i = 0; i < byDate.length; i++) {
      const a = byDate[i];
      for (let j = i+1; j < Math.min(byDate.length, i+6); j++) {
        const b = byDate[j];
        const t1 = new Date(a.date || 0); const t2 = new Date(b.date || 0);
        const secs = Math.abs((t2 - t1)/1000);
        if (secs <= 60 && a.type === b.type) {
          const ta = getTotalFromMovement(a); const tb = getTotalFromMovement(b);
          if (Math.abs(ta - tb) <= 0.01) groups.push({ id1: a.id, id2: b.id, type: a.type, total: ta, tsecs: secs });
        }
      }
    }
    if (groups.length) console.table(groups.slice(0,100)); else console.log('No groups found');
  }

  console.log('\nDone.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
