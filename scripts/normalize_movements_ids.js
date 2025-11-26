// Script para normalizar los IDs de la colección movements a numéricos consecutivos y agregar el campo id numérico
// Uso: node scripts/normalize_movements_ids.js

require('dotenv').config();
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {})
});

const db = getFirestore();

async function normalizeMovementsIds() {
  const snapshot = await db.collection('movements').get();
  const docs = snapshot.docs;
  if (docs.length === 0) {
    console.log('No hay documentos en movements.');
    return;
  }

  // Ordenar por fecha (o por nombre si prefieres)
  const sorted = docs.slice().sort((a, b) => {
    const da = a.data().date || '';
    const db_ = b.data().date || '';
    return da.localeCompare(db_);
  });

  let batch = db.batch();
  let newId = 1;
  for (const docSnap of sorted) {
    const data = docSnap.data();
    const oldId = docSnap.id;
    const newIdStr = String(newId);
    if (oldId !== newIdStr) {
      // Crear nuevo doc con ID numérico y campo id
      const newRef = db.collection('movements').doc(newIdStr);
      // El campo 'id' numérico como primer campo
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
  console.log('IDs de movements normalizados a numéricos consecutivos.');
}

normalizeMovementsIds().catch(console.error);
