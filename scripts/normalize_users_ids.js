// Script para normalizar los IDs de la colección users a numéricos consecutivos y agregar el campo id numérico como primer campo
// Uso: node scripts/normalize_users_ids.js

require('dotenv').config();
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {})
});

const db = getFirestore();

async function normalizeUsersIds() {
  const snapshot = await db.collection('users').get();
  const docs = snapshot.docs;
  if (docs.length === 0) {
    console.log('No hay documentos en users.');
    return;
  }

  // Ordenar por nombre o email para mantener consistencia
  const sorted = docs.slice().sort((a, b) => (a.data().name || a.data().email || '').localeCompare(b.data().name || b.data().email || ''));

  let batch = db.batch();
  let newId = 1;
  for (const docSnap of sorted) {
    const data = docSnap.data();
    const oldId = docSnap.id;
    const newIdStr = String(newId);
    if (oldId !== newIdStr) {
      // Crear nuevo doc con ID numérico y campo id como primer campo
      const newRef = db.collection('users').doc(newIdStr);
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
  console.log('IDs de users normalizados a numéricos consecutivos.');
}

normalizeUsersIds().catch(console.error);
