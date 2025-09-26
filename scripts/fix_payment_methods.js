/**
 * Script para corregir movimientos guardados como 'efectivo' que en realidad fueron MP o mixtos
 * Opciones:
 *  - por rango de fechas (ISO desde/hasta)
 *  - por tipo (venta/compra/ingreso/egreso/gasto) opcional
 *  - estrategia: 'mp' (todo a MP) o proporción fija { efectivo:x, mercadoPago:y }
 *
 * Uso (Node):
 *  node scripts/fix_payment_methods.js --from=2025-09-01 --to=2025-09-30 --type=venta --strategy=mp --dry
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

// Cargar config desde variables de entorno (.env)
require('dotenv').config();

const config = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error('Faltan variables de entorno de Firebase. Revisá el .env.');
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    const [k, v] = a.split('=');
    const key = k.replace(/^--/, '');
    opts[key] = v === undefined ? true : v;
  }
  return opts;
}

function buildStrategy(strategyArg, total) {
  if (!strategyArg || strategyArg === 'mp') {
    return { efectivo: 0, mercadoPago: Number(total) };
  }
  // Permite pasar una proporción como "50:50" o "30:70" (efectivo:mp)
  if (/^\d{1,3}:\d{1,3}$/.test(strategyArg)) {
    const [ef, mp] = strategyArg.split(':').map(Number);
    const sum = ef + mp;
    if (sum <= 0) return { efectivo: 0, mercadoPago: Number(total) };
    const efAmount = +(Number(total) * (ef / sum)).toFixed(2);
    const mpAmount = +(Number(total) - efAmount).toFixed(2);
    return { efectivo: efAmount, mercadoPago: mpAmount };
  }
  // JSON: { efectivo: 1000, mercadoPago: 500 }
  try {
    const obj = JSON.parse(strategyArg);
    return { efectivo: Number(obj.efectivo) || 0, mercadoPago: Number(obj.mercadoPago) || 0 };
  } catch {
    return { efectivo: 0, mercadoPago: Number(total) };
  }
}

(async function main() {
  const opts = parseArgs();
  const from = opts.from ? new Date(opts.from) : null;
  const to = opts.to ? new Date(opts.to) : null;
  const type = opts.type || null;
  const strategyArg = opts.strategy || 'mp';
  const dry = !!opts.dry;

  console.log('Iniciando corrección de métodos de pago...');
  console.log({ from: from?.toISOString(), to: to?.toISOString(), type, strategy: strategyArg, dry });

  // Traer movimientos (con filtros simples por tipo; el filtro por fecha lo hacemos en memoria para simplicidad)
  const q = type ? query(collection(db, 'movements'), where('type', '==', type)) : collection(db, 'movements');
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Filtrar por fecha si corresponde
  const filtered = items.filter(m => {
    if (!m.date) return false;
    const d = new Date(m.date);
    if (Number.isNaN(d.getTime())) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });

  console.log(`Encontrados ${filtered.length} movimientos a revisar`);

  let updated = 0;
  for (const m of filtered) {
    const total = Number(m.total) || 0;
    if (total <= 0) continue;

    // Solo corregir si está como efectivo simple o no tiene mapa
    const isLegacyCash = (!m.paymentMethods) && (m.paymentMethod === 'efectivo');
    const hasWrongMap = (m.paymentMethods && (Number(m.paymentMethods.mercadoPago || 0) === 0) && (Number(m.paymentMethods.efectivo || 0) === total));

    if (isLegacyCash || hasWrongMap) {
      const pm = buildStrategy(strategyArg, total);
      const update = {
        paymentMethods: {
          efectivo: Number(pm.efectivo) || 0,
          mercadoPago: Number(pm.mercadoPago) || 0,
          transferencia: Number(m.paymentMethods?.transferencia || 0),
          tarjeta: Number(m.paymentMethods?.tarjeta || 0)
        },
        paymentMethod: (pm.mercadoPago || 0) > (pm.efectivo || 0) ? 'mercadoPago' : 'efectivo',
        paymentSummary: `Efectivo: $${(pm.efectivo || 0)}, Mercado Pago: $${(pm.mercadoPago || 0)}`
      };

      console.log(`→ ${dry ? '[DRY]' : ''} Corrigiendo ${m.id} (${m.type}) total $${total}:`, update.paymentMethods);

      if (!dry) {
        await updateDoc(doc(db, 'movements', m.id), update);
        updated++;
      }
    }
  }

  console.log(`Finalizado. Movimientos actualizados: ${updated}${dry ? ' (dry-run)' : ''}`);
})();
