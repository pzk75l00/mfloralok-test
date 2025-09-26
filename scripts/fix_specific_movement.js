/**
 * Corrige uno o varios movimientos por búsqueda textual y fecha, asignando pago mixto exacto.
 *
 * Soporta:
 *  --search="EBENECER" (texto que coincide con detail/notes/plantName/location, case-insensitive)
 *  --id=DOC_ID (opcional, ignora search si se pasa id)
 *  --date=YYYY-MM-DD (mismo día local) o --from=YYYY-MM-DD --to=YYYY-MM-DD
 *  --type=venta|compra|ingreso|egreso|gasto (opcional)
 *  --cash=33000 --mp=15500 (montos para Efectivo y MercadoPago)
 *  --split=true|false (default true): si hay varias coincidencias, prorratea según total de cada doc
 *  --dry (no escribe)
 *  --force (aplica aunque la suma cash+mp no coincida con el total del doc; útil con split)
 *
 * Uso:
 *  node scripts/fix_specific_movement.js --date=2025-09-26 --search=EBENECER --cash=33000 --mp=15500 --type=egreso --dry
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
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
  console.error('Faltan variables de entorno de Firebase. Revisá el .env');
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {};
  for (const a of args) {
    const [k, ...rest] = a.split('=');
    const key = k.replace(/^--/, '');
    const val = rest.length ? rest.join('=') : true;
    opts[key] = val;
  }
  return opts;
}

function sameLocalDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function normalizeNumber(x) {
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

function pickText(m) {
  return [m.detail, m.notes, m.plantName, m.location].filter(Boolean).join(' ').toLowerCase();
}

function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

(async function main() {
  const opts = parseArgs();
  const id = opts.id || null;
  const search = (opts.search || '').toLowerCase();
  const dateStr = opts.date || null;
  const from = opts.from ? new Date(opts.from) : null;
  const to = opts.to ? new Date(opts.to) : null;
  const type = opts.type || null;
  const cash = normalizeNumber(opts.cash);
  const mp = normalizeNumber(opts.mp);
  const split = opts.split !== 'false';
  const dry = !!opts.dry;
  const force = !!opts.force;

  if (!id && !search) {
    console.error('Debe indicar --id o --search');
    process.exit(1);
  }
  if (!dateStr && !(from && to)) {
    console.error('Debe indicar --date o el rango --from y --to');
    process.exit(1);
  }

  console.log('Buscando movimientos…', { id, search, date: dateStr, from: from?.toISOString(), to: to?.toISOString(), type, cash, mp, split, dry, force });

  const snap = await getDocs(collection(db, 'movements'));
  let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // Filtro por fecha
  if (dateStr) {
    const target = new Date(dateStr);
    items = items.filter(m => m.date && sameLocalDay(new Date(m.date), target));
  } else {
    items = items.filter(m => {
      if (!m.date) return false;
      const d = new Date(m.date);
      return d >= from && d <= to;
    });
  }

  // Filtro por tipo
  if (type) items = items.filter(m => m.type === type);

  // Filtro por ID o búsqueda
  if (id) {
    items = items.filter(m => m.id === id);
  } else if (search) {
    items = items.filter(m => pickText(m).includes(search));
  }

  if (items.length === 0) {
    console.log('No hay coincidencias.');
    return;
  }

  // Orden por hora asc
  items.sort((a, b) => new Date(a.date) - new Date(b.date));

  const sumTotals = items.reduce((s, m) => s + normalizeNumber(m.total), 0);
  const sumText = items.map(m => `${m.id} ${new Date(m.date).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} ${m.type} $${m.total} [${m.location || ''}]`).join('\n');
  console.log(`Encontradas ${items.length} coincidencias (total filas suman $${sumTotals.toFixed(2)}):\n${sumText}`);

  let updates = [];
  if (items.length === 1 || !split) {
    for (const m of items) {
      const total = normalizeNumber(m.total);
      const totalProvided = cash + mp;
      if (!force && Math.abs(totalProvided - total) > 0.01) {
        console.warn(`⚠️ Suma de cash+mp ($${totalProvided}) no coincide con total del doc ($${total}) en ${m.id}. Use --force o --split.`);
        continue;
      }
      const pm = {
        efectivo: round2(cash),
        mercadoPago: round2(mp),
        transferencia: round2(m.paymentMethods?.transferencia || 0),
        tarjeta: round2(m.paymentMethods?.tarjeta || 0)
      };
      updates.push({ m, pm });
    }
  } else {
    // Prorratear cash/mp por total de cada doc respecto al total de coincidencias
    if (sumTotals <= 0) {
      console.error('La suma de totales es 0, no se puede prorratear.');
      return;
    }
    // Primero calcular scaled y acumular deltas para ajustar en el último
    let accCash = 0, accMp = 0;
    for (let i = 0; i < items.length; i++) {
      const m = items[i];
      const weight = normalizeNumber(m.total) / sumTotals;
      let c = round2(cash * weight);
      let p = round2(mp * weight);
      accCash += c; accMp += p;
      // Ajuste al último para cuadrar centavos
      if (i === items.length - 1) {
        const deltaC = round2(cash - accCash);
        const deltaP = round2(mp - accMp);
        c = round2(c + deltaC);
        p = round2(p + deltaP);
      }
      const pm = {
        efectivo: c,
        mercadoPago: p,
        transferencia: round2(m.paymentMethods?.transferencia || 0),
        tarjeta: round2(m.paymentMethods?.tarjeta || 0)
      };
      updates.push({ m, pm });
    }
  }

  if (updates.length === 0) {
    console.log('No hay actualizaciones que aplicar.');
    return;
  }

  for (const { m, pm } of updates) {
    const main = (pm.mercadoPago || 0) > (pm.efectivo || 0) ? 'mercadoPago' : 'efectivo';
    const paymentSummary = `Efectivo: $${pm.efectivo}, Mercado Pago: $${pm.mercadoPago}`;
    const update = {
      paymentMethods: pm,
      paymentMethod: main,
      paymentSummary
    };
    console.log(`${dry ? '[DRY] ' : ''}Actualizar ${m.id} (${m.type}) $${m.total}:`, update);
    if (!dry) {
      await updateDoc(doc(db, 'movements', m.id), update);
    }
  }

  console.log(`Listo. Actualizadas ${dry ? '(simulado) ' : ''}${updates.length} filas.`);
})();
