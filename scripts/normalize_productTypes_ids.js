// Cargar variables de entorno desde .env si existe
require('dotenv').config();
// Script para normalizar los IDs de la colección productTypes a numéricos consecutivos
// Uso: node scripts/normalize_productTypes_ids.js

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Permitir projectId explícito desde variable de entorno
const projectId = process.env.GCLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID;

initializeApp({
  credential: applicationDefault(),
  ...(projectId ? { projectId } : {})
});

const db = getFirestore();

async function normalizeProductTypesIds() {
  const snapshot = await db.collection('productTypes').get();
  const docs = snapshot.docs;
  if (docs.length === 0) {
    console.log('No hay documentos en productTypes.');
    return;
  }

  // Ordenar por nombre para mantener consistencia
  const sorted = docs.slice().sort((a, b) => a.data().name.localeCompare(b.data().name));

  let batch = db.batch();
  let newId = 1;
  for (const docSnap of sorted) {
    const data = docSnap.data();
    const oldId = docSnap.id;
    const newIdStr = String(newId);
    if (oldId !== newIdStr) {
      // Crear nuevo doc con ID numérico
      const newRef = db.collection('productTypes').doc(newIdStr);
      batch.set(newRef, { ...data, id: newId });
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
  console.log('IDs de productTypes normalizados a numéricos consecutivos.');
}

normalizeProductTypesIds().catch(console.error);
