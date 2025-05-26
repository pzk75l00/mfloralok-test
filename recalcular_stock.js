// Script Node.js para recalcular el stock de todas las plantas según los movimientos históricos
// No lo ejecutes sin revisar y hacer backup de tu base de datos

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = getFirestore();

async function recalcularStock() {
  // 1. Obtener todas las plantas
  const plantsSnap = await db.collection('plants').get();
  const plants = {};
  plantsSnap.forEach(doc => {
    plants[doc.id] = doc.data();
    plants[doc.id].stock = 0; // Inicializar stock en 0 (o puedes usar stock inicial si lo prefieres)
  });

  // 2. Obtener todos los movimientos
  const movSnap = await db.collection('movements').get();
  movSnap.forEach(doc => {
    const mov = doc.data();
    if (!mov.plantId || !mov.quantity) return;
    const pid = String(mov.plantId);
    if (!plants[pid]) return;
    if (mov.type === 'compra') {
      plants[pid].stock += Number(mov.quantity);
    } else if (mov.type === 'venta') {
      plants[pid].stock -= Number(mov.quantity);
    }
    // Otros tipos de movimiento no afectan stock
  });

  // 3. Actualizar el stock en Firestore
  for (const pid in plants) {
    await db.collection('plants').doc(pid).update({ stock: plants[pid].stock });
    console.log(`Planta ${plants[pid].name}: stock actualizado a ${plants[pid].stock}`);
  }

  console.log('Re-cálculo de stock finalizado.');
}

recalcularStock().catch(console.error);
