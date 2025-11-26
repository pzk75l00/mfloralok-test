// src/utils/plantsFirestore.js
// Utilidades para manipular plantas en Firestore
import { collection, setDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export async function deleteAllPlants() {
  const snapshot = await getDocs(collection(db, 'producto'));
  const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'producto', d.id)));
  await Promise.all(deletePromises);
}

export async function uploadPlants(plants) {
  for (const plant of plants) {
    const plantWithId = { ...plant, id: plant.id.toString() };
    await setDoc(doc(collection(db, 'producto'), plantWithId.id), plantWithId);
  }
}
