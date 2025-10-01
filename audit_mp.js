// Auditoría Mercado Pago desde el arranque
// Usa Firebase Web SDK con la config de DEV ya presente en otros scripts

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const devConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

const app = initializeApp(devConfig);
const db = getFirestore(app);

function toDate(v) {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function getAmountForMethod(m, method) {
  // mixed payments
  if (m.paymentMethods && typeof m.paymentMethods === 'object') {
    const val = m.paymentMethods[method];
    return Number(val) || 0;
  }
  // legacy single method
  if (m.paymentMethod === method) return Number(m.total) || 0;
  return 0;
}

function signedAmountByType(m, method) {
  const amt = getAmountForMethod(m, method);
  if (!amt) return 0;
  const t = m.type;
  if (t === 'venta' || t === 'ingreso') return amt; // entra dinero
  if (t === 'compra' || t === 'egreso' || t === 'gasto') return -amt; // sale dinero
  return 0;
}

function balanceUntil(movements, dateLimit, method) {
  return movements
    .filter(m => {
      const d = toDate(m.date);
      return d && d <= dateLimit;
    })
    .reduce((acc, m) => acc + signedAmountByType(m, method), 0);
}

function computeMonthlyRunning(movements, method = 'mercadoPago') {
  const buckets = new Map();
  for (const m of movements) {
    const d = toDate(m.date);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!buckets.has(key)) buckets.set(key, { key, year: d.getFullYear(), month: d.getMonth() + 1, inflow: 0, outflow: 0, net: 0, start: 0, end: 0 });
    const row = buckets.get(key);
    const amt = getAmountForMethod(m, method);
    if (!amt) continue;
    if (m.type === 'venta' || m.type === 'ingreso') row.inflow += amt;
    else if (m.type === 'compra' || m.type === 'egreso' || m.type === 'gasto') row.outflow += amt;
  }
  const ordered = Array.from(buckets.values()).sort((a, b) => (a.year - b.year) || (a.month - b.month));
  let running = 0;
  for (const row of ordered) {
    row.net = row.inflow - row.outflow;
    row.start = running;
    row.end = row.start + row.net;
    running = row.end;
  }
  return ordered;
}

async function main() {
  console.log('🔎 Descargando movements...');
  const snap = await getDocs(collection(db, 'movements'));
  const movements = [];
  snap.forEach(doc => movements.push({ id: doc.id, ...doc.data() }));
  console.log(`📦 Movements: ${movements.length}`);

  const now = new Date();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const finMesAnterior = new Date(nowYear, nowMonth, 0, 23, 59, 59, 999);
  const finDeHoy = new Date(nowYear, nowMonth, now.getDate(), 23, 59, 59, 999);

  const metodo = 'mercadoPago';
  const saldoInicialMes_MP = balanceUntil(movements, finMesAnterior, metodo);
  const saldoDisponibleHoy_MP = balanceUntil(movements, finDeHoy, metodo);
  const netoMes_MP = saldoDisponibleHoy_MP - saldoInicialMes_MP;

  console.log('\n===== AUDITORÍA MP =====');
  console.log('Saldo inicial del mes (MP):', saldoInicialMes_MP.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('Neto del mes (MP):        ', netoMes_MP.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('Saldo disponible hoy (MP):', saldoDisponibleHoy_MP.toLocaleString('es-AR', { minimumFractionDigits: 2 }));
  console.log('Fórmula: inicial + neto ≈ disponible');

  const monthly = computeMonthlyRunning(movements, metodo);
  console.log('\n===== DETALLE MENSUAL MP (inicio, ingresos, egresos, neto, cierre) =====');
  for (const r of monthly) {
    console.log(
      r.key,
      '| ini:', r.start.toFixed(2),
      '| in:', r.inflow.toFixed(2),
      '| out:', r.outflow.toFixed(2),
      '| net:', r.net.toFixed(2),
      '| end:', r.end.toFixed(2)
    );
  }
}

main().catch(err => {
  console.error('Error en auditoría:', err);
  process.exit(1);
});
