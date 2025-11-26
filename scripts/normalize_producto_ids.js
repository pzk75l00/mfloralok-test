// Script para normalizar los IDs de la colección 'producto' quitando ceros a la izquierda
// Uso: node scripts/normalize_producto_ids.js

require('dotenv').config();
const { db } = require('../src/firebase/admin');

async function normalizeProductoIds() {
  const snapshot = await db.collection('producto').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const oldId = doc.id;
    const newId = String(Number(oldId)); // Quita ceros a la izquierda
    if (oldId !== newId) {
      const data = doc.data();
      await db.collection('producto').doc(newId).set(data);
      await db.collection('producto').doc(oldId).delete();
      count++;
      console.log(`Renombrado: ${oldId} -> ${newId}`);
    }
  }
  console.log(`Normalización completa. Total renombrados: ${count}`);
}

normalizeProductoIds().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
