/**
 * Lista los movimientos cargados HOY (según tu zona horaria local) y muestra un resumen.
 * Usa las variables de entorno REACT_APP_FIREBASE_* de tu .env.
 *
 * Uso:
 *  node scripts/list_today_movements.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
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

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function pmLabel(m) {
  if (m && m.paymentMethods) {
    const entries = Object.entries(m.paymentMethods).filter(([, v]) => (parseFloat(v) || 0) > 0);
    if (entries.length > 1) return 'Mixto';
    if (entries.length === 1) {
      const k = entries[0][0];
      if (k === 'mercadoPago') return 'MP';
      if (k === 'efectivo') return 'Efectivo';
      return k;
    }
  }
  if (m.paymentMethod === 'mercadoPago') return 'MP';
  if (m.paymentMethod === 'efectivo') return 'Efectivo';
  return m.paymentMethod || '-';
}

(async function main() {
  const today = new Date();
  console.log(`Listando movimientos de hoy: ${today.toLocaleDateString('es-AR')}`);

  const snap = await getDocs(collection(db, 'movements'));
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  const todays = items.filter(m => m.date && sameLocalDay(new Date(m.date), today));

  // Orden por fecha asc
  todays.sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = todays.map(m => ({
    id: m.id,
    fecha: new Date(m.date).toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    tipo: m.type,
    total: Number(m.total || 0).toFixed(2),
    metodo: pmLabel(m),
    lugar: m.location || '',
    detalle: m.detail || m.notes || ''
  }));

  console.table(rows);

  // Resumen simple
  const summary = todays.reduce((acc, m) => {
    const t = m.type || 'otros';
    const total = Number(m.total || 0);
    if (!acc[t]) acc[t] = 0;
    acc[t] += total;
    return acc;
  }, {});

  console.log('\nResumen por tipo (sumando totales de fila):');
  Object.entries(summary).forEach(([k, v]) => console.log(` - ${k}: $${v.toFixed(2)}`));

  // Conteo
  const countByType = todays.reduce((acc, m) => {
    const t = m.type || 'otros';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  console.log('\nCantidad por tipo:');
  Object.entries(countByType).forEach(([k, v]) => console.log(` - ${k}: ${v}`));

  console.log(`\nTotal movimientos hoy: ${todays.length}`);
})();
