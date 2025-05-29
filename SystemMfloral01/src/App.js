import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';
import salesData from './mock/sales';
import purchasesData from './mock/purchases';
import PlantsView from './components/Base/PlantsView';
import SalesView from './components/Base/SalesView';
import { PurchasesView } from './components/Base/PurchasesView';
import StatsView from './components/Base/StatsView';
import Navigation from './components/Base/Navigation';
import MovementsView from './components/Base/MovementsView';
import ReportesView from './components/Base/ReportesView';
import CargaMovilView from './components/Movil/CargaMovilView';

const App = () => {
  const [currentView, setCurrentView] = useState('plants');
  const [plants, setPlants] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);

  const isMobile = window.innerWidth < 768;

  // Cargar plantas desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const plantsFromFirestore = snapshot.docs.map(doc => ({
        id: Number(doc.id),
        ...doc.data()
      }));
      setPlants(plantsFromFirestore);
    });
    return () => unsubscribe();
  }, []);

  // Cargar ventas desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesFromFirestore = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSales(salesFromFirestore);
    });
    return () => unsubscribe();
  }, []);

  // Cargar compras desde Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'purchases'), (snapshot) => {
      const purchasesFromFirestore = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPurchases(purchasesFromFirestore);
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

  const handleCompleteSale = async (newSale) => {
    // Validaciones estrictas
    if (!newSale.plantId || !plants.find(p => p.id === newSale.plantId)) {
      alert('Debe seleccionar una planta válida.');
      return;
    }
    if (
      newSale.salePrice === undefined ||
      newSale.salePrice === null ||
      isNaN(Number(newSale.salePrice)) ||
      Number(newSale.salePrice) <= 0
    ) {
      alert('Debe ingresar un precio de venta válido y mayor a cero.');
      return;
    }
    if (
      newSale.quantity === undefined ||
      newSale.quantity === null ||
      isNaN(Number(newSale.quantity)) ||
      Number(newSale.quantity) <= 0
    ) {
      alert('Debe ingresar una cantidad válida y mayor a cero.');
      return;
    }
    // Validar stock suficiente
    const plant = plants.find(p => String(p.id) === String(newSale.plantId));
    if (!plant || (plant.stock || 0) < Number(newSale.quantity)) {
      alert('No hay suficiente stock para realizar la venta.');
      return;
    }
    // Guardar venta en Firestore y actualizar stock
    try {
      await setDoc(doc(collection(db, 'sales')), newSale);
      const plantRef = doc(collection(db, 'plants'), String(newSale.plantId));
      const newStock = (plant.stock || 0) - Number(newSale.quantity);
      await setDoc(plantRef, { ...plant, stock: newStock });
    } catch (err) {
      console.error('Error guardando venta o actualizando stock:', err);
      alert('Error guardando la venta o actualizando el stock.');
    }
  };

  const handleCompletePurchase = async (newPurchase) => {
    // Validaciones estrictas
    if (!newPurchase.plantId || !plants.find(p => p.id === newPurchase.plantId)) {
      alert('Debe seleccionar una planta válida.');
      return;
    }
    if (
      newPurchase.purchasePrice === undefined ||
      newPurchase.purchasePrice === null ||
      isNaN(Number(newPurchase.purchasePrice)) ||
      Number(newPurchase.purchasePrice) <= 0
    ) {
      alert('Debe ingresar un precio de compra válido y mayor a cero.');
      return;
    }
    if (
      newPurchase.quantity === undefined ||
      newPurchase.quantity === null ||
      isNaN(Number(newPurchase.quantity)) ||
      Number(newPurchase.quantity) <= 0
    ) {
      alert('Debe ingresar una cantidad válida y mayor a cero.');
      return;
    }
    // Guardar compra en Firestore y actualizar stock
    try {
      await setDoc(doc(collection(db, 'purchases')), newPurchase);
      const plant = plants.find(p => p.id === newPurchase.plantId);
      const plantRef = doc(collection(db, 'plants'), String(newPurchase.plantId));
      const newStock = (plant.stock || 0) + Number(newPurchase.quantity);
      await setDoc(plantRef, { ...plant, stock: newStock });
    } catch (err) {
      console.error('Error guardando compra o actualizando stock:', err);
      alert('Error guardando la compra o actualizando el stock.');
    }
  };

  const renderView = () => {
    if (isMobile) {
      // En móvil, solo mostrar la vista de caja móvil
      return (
        <CargaMovilView
          plants={plants}
          onAddPlant={handleAddPlant}
          onUpdatePlant={handleUpdatePlant}
          onDeletePlant={handleDeletePlant}
        />
      );
    }
    // Desktop: menú clásico
    switch (currentView) {
      case 'plants':
        return (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-green-700 mb-4 text-center">Inventario de Plantas</h2>
            <PlantsView
              plants={plants}
              onAddPlant={handleAddPlant}
              onUpdatePlant={handleUpdatePlant}
              onDeletePlant={handleDeletePlant}
            />
          </div>
        );
      case 'movements':
        return (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-blue-700 mb-4 text-center">Caja y Movimientos</h2>
            <MovementsView plants={plants} />
          </div>
        );
      case 'stats':
        return (
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-yellow-700 mb-4 text-center">Estadísticas y Reportes</h2>
            <StatsView
              plants={plants}
              sales={sales}
              purchases={purchases}
            />
          </div>
        );
      default:
        return <div>Vista no encontrada</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {!isMobile && (
          <header className="text-center">
            <h1 className="text-3xl font-bold text-green-700">Mundo Floral (mfloralok)</h1>
            <p className="text-gray-600">Sistema de gestión para tu vivero digital</p>
            <p className="text-xs text-gray-400 mt-2">© {new Date().getFullYear()} Mundo Floral. Todos los derechos reservados.</p>
          </header>
        )}
        {!isMobile && <Navigation currentView={currentView} setCurrentView={setCurrentView} />}
        <main className="bg-white rounded-xl shadow-sm p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;

// DONE