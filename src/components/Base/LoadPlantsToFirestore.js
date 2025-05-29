import React, { useState } from 'react';
import { collection, setDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import plantsData from '../../mock/plants_full.json';

const LoadPlantsToFirestore = () => {
  const [loading, setLoading] = useState(false);
  const handleLoad = async () => {
    setLoading(true);
    try {
      // Eliminar todas las plantas existentes
      const snapshot = await getDocs(collection(db, 'plants'));
      const deletePromises = snapshot.docs.map(d => deleteDoc(doc(db, 'plants', d.id)));
      await Promise.all(deletePromises);
      // Cargar todas las plantas del JSON
      for (const plant of plantsData) {
        const plantWithId = { ...plant, id: plant.id.toString() };
        await setDoc(doc(collection(db, 'plants'), plantWithId.id), plantWithId);
      }
      alert('¡Plantas actualizadas en Firestore! Si no ves los cambios, recarga la página.');
    } catch (err) {
      alert('Error al actualizar plantas en Firestore: ' + err.message);
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="p-4">
      <button
        onClick={handleLoad}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        disabled={loading}
      >
        {loading ? 'Actualizando...' : 'Actualizar plantas en Firestore'}
      </button>
    </div>
  );
};

export default LoadPlantsToFirestore;