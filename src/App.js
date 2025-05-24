import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import salesData from './mock/sales';
import purchasesData from './mock/purchases';
import PlantsView from './components/PlantsView';
import SalesView from './components/SalesView';
import { PurchasesView } from './components/PurchasesView';
import StatsView from './components/StatsView'; // ¡Este import faltaba!
import Navigation from './components/Navigation';
import MovementsView from './components/MovementsView';
import ReportesView from './components/ReportesView';

const App = () => {
  const [currentView, setCurrentView] = useState('plants');
  const [plants, setPlants] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  // Cargar plantas desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const plantsFromFirestore = snapshot.docs.map(doc => ({
        id: Number(doc.id), // Asegura que el id sea número
        ...doc.data()
      }));
      setPlants(plantsFromFirestore);
    });
    return () => unsubscribe();
  }, []);

  // Guardar datos cuando cambian
  useEffect(() => {
    localStorage.setItem('sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('purchases', JSON.stringify(purchases));
  }, [purchases]);

  const handleAddPlant = async (newPlant) => {
    const plantWithId = {
      ...newPlant,
      id: Math.max(0, ...plants.map(p => p.id)) + 1
    };
    await setDoc(doc(collection(db, 'plants'), plantWithId.id.toString()), plantWithId);
    // El onSnapshot actualizará el estado automáticamente
  };

  const handleUpdatePlant = async (updatedPlant) => {
    await setDoc(doc(collection(db, 'plants'), updatedPlant.id.toString()), updatedPlant);
    // El onSnapshot actualizará el estado automáticamente
  };

  const handleDeletePlant = async (plantId) => {
    await deleteDoc(doc(collection(db, 'plants'), plantId.toString()));
    // El onSnapshot actualizará el estado automáticamente
  };

  const handleCompleteSale = (newSale) => {
    // Actualizar stock
    const updatedPlants = plants.map(p => {
      if (p.id === newSale.plantId) {
        return { ...p, stock: p.stock - newSale.quantity };
      }
      return p;
    });
    
    setPlants(updatedPlants);
    setSales([...sales, newSale]);
  };

  const handleCompletePurchase = (newPurchase) => {
    // Actualizar stock
    const updatedPlants = plants.map(p => {
      if (p.id === newPurchase.plantId) {
        return { ...p, stock: p.stock + newPurchase.quantity };
      }
      return p;
    });
    
    setPlants(updatedPlants);
    setPurchases([...purchases, newPurchase]);
  };

  const renderView = () => {
    switch (currentView) {
      case 'plants':
        return (
          <PlantsView
            plants={plants}
            onAddPlant={handleAddPlant}
            onUpdatePlant={handleUpdatePlant}
            onDeletePlant={handleDeletePlant}
          />
        );
      case 'movements':
        return (
          <MovementsView
            plants={plants}
          />
        );
      case 'stats':
        return (
          <StatsView
            plants={plants}
            sales={sales}
            purchases={purchases}
          />
        );
      case 'reportes':
        return (
          <ReportesView
            plants={plants}
            sales={sales}
            purchases={purchases}
          />
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-green-700">Mundo Floral (mfloralok)</h1>
          <p className="text-gray-600">Sistema de gestión para tu vivero digital</p>
          <p className="text-xs text-gray-400 mt-2">© {new Date().getFullYear()} Mundo Floral. Todos los derechos reservados.</p>
        </header>
        
        <Navigation currentView={currentView} setCurrentView={setCurrentView} />
        <main className="bg-white rounded-xl shadow-sm p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;

// DONE