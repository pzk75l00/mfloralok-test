import React from 'react';
import { collection, setDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import plantsData from '../mock/plants_full.json';

const LoadPlantsToFirestore = () => {
  const handleLoad = async () => {
    for (const plant of plantsData) {
      await setDoc(doc(collection(db, 'plants'), plant.id.toString()), plant);
    }
    alert('¡Plantas actualizadas en Firestore!');
  };

  return (
    <div className="p-4">
      <button
        onClick={handleLoad}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Actualizar plantas en Firestore
      </button>
    </div>
  );
};

export default LoadPlantsToFirestore;