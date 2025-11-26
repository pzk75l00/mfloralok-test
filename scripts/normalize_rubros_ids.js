// Script para normalizar los IDs de la colección rubros a numéricos consecutivos y agregar el campo id numérico como primer campo
// Uso: node scripts/normalize_rubros_ids.js

require('dotenv').config();
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {})
});

const db = getFirestore();

async function normalizeRubrosIds() {
  const snapshot = await db.collection('rubros').get();
  const docs = snapshot.docs;
  if (docs.length === 0) {
    console.log('No hay documentos en rubros.');
    return;
  }

  // Ordenar por nombre para mantener consistencia
  const sorted = docs.slice().sort((a, b) => (a.data().name || '').localeCompare(b.data().name || ''));

  let batch = db.batch();
  let newId = 1;
  for (const docSnap of sorted) {
    const data = docSnap.data();
    const oldId = docSnap.id;
    const newIdStr = String(newId);
    if (oldId !== newIdStr) {
      // Crear nuevo doc con ID numérico y campo id como primer campo
      const newRef = db.collection('rubros').doc(newIdStr);
      const newDoc = { id: newId, ...data };
      batch.set(newRef, newDoc);
      // Borrar el doc viejo
      batch.delete(docSnap.ref);
    }
    newId++;
    // Commit cada 400 docs por límite de batch
    if (newId % 400 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();
  console.log('IDs de rubros normalizados a numéricos consecutivos.');
}

normalizeRubrosIds().catch(console.error);
