import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import StatsCard from './StatsCard';
import SalesForm from './SalesForm';
import { collection as collectionPurchases, onSnapshot as onSnapshotPurchases } from 'firebase/firestore';

const SalesView = ({ plants }) => {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
      const salesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSales(salesData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribePurchases = onSnapshotPurchases(collectionPurchases(db, 'purchases'), (snapshot) => {
      const purchasesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPurchases(purchasesData);
      setLoadingPurchases(false);
    });
    return () => unsubscribePurchases();
  }, []);

  const handleCompleteSale = async (saleData) => {
    try {
      await addDoc(collection(db, 'sales'), saleData);
    } catch (error) {
      console.error("Error adding sale: ", error);
    }
  };

  // Calcular totales por método de pago
  const totalUnitsSold = sales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
  const totalCash = sales.filter(s => s.paymentMethod === 'efectivo')
                         .reduce((sum, sale) => sum + sale.total, 0);
  const totalMP = sales.filter(s => s.paymentMethod === 'mercadoPago')
                      .reduce((sum, sale) => sum + sale.total, 0);

  // Totales del mes actual
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const salesThisMonth = sales.filter(sale => {
    if (!sale.date) return false;
    const d = new Date(sale.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const purchasesThisMonth = purchases.filter(purchase => {
    if (!purchase.date) return false;
    const d = new Date(purchase.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalMonthSales = salesThisMonth.reduce((sum, sale) => sum + sale.total, 0);
  const totalMonthPurchases = purchasesThisMonth.reduce((sum, purchase) => sum + (purchase.purchasePrice * purchase.quantity), 0);
  const totalMonth = totalMonthSales - totalMonthPurchases;
  const totalMonthMPSales = salesThisMonth.filter(s => s.paymentMethod === 'mercadoPago').reduce((sum, sale) => sum + sale.total, 0);
  const totalMonthMPPurchases = purchasesThisMonth.filter(p => p.paymentMethod === 'mercadoPago').reduce((sum, purchase) => sum + (purchase.purchasePrice * purchase.quantity), 0);
  const totalMonthMP = totalMonthMPSales - totalMonthMPPurchases;
  const totalMonthCashSales = salesThisMonth.filter(s => s.paymentMethod === 'efectivo').reduce((sum, sale) => sum + sale.total, 0);
  const totalMonthCashPurchases = purchasesThisMonth.filter(p => p.paymentMethod === 'efectivo').reduce((sum, purchase) => sum + (purchase.purchasePrice * purchase.quantity), 0);
  const totalMonthCash = totalMonthCashSales - totalMonthCashPurchases;

  if (loading || loadingPurchases) return <div>Cargando ventas y compras...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Ventas</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard
          title="Productos Vendidos"
          value={totalUnitsSold}
          icon="📦"
          color="blue"
        />
        <StatsCard
          title={`Ventas ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`}
          value={`$${totalMonthSales.toFixed(2)}`}
          icon="⬆️"
          color="green"
        />
        <StatsCard
          title={`Compras ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`}
          value={`$${totalMonthPurchases.toFixed(2)}`}
          icon="⬇️"
          color="red"
        />
        <StatsCard
          title={`Balance ${now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}`}
          value={`$${totalMonth.toFixed(2)}`}
          icon="💰"
          color="green"
        />
        <StatsCard
          title={`Balance MP (${now.toLocaleString('es-AR', { month: 'short' })})`}
          value={`$${totalMonthMP.toFixed(2)}`}
          icon="📱"
          color="purple"
        />
        <StatsCard
          title={`Balance Efectivo (${now.toLocaleString('es-AR', { month: 'short' })})`}
          value={`$${totalMonthCash.toFixed(2)}`}
          icon="💵"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SalesForm plants={plants} onCompleteSale={handleCompleteSale} />
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium mb-4">Histórico de Ventas</h3>
          {sales.length > 0 ? (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {sales
                .slice() // Copia para no mutar el estado
                .sort((a, b) => new Date(b.date) - new Date(a.date)) // Orden descendente por fecha
                .map((sale) => (
                <div key={sale.id} className="border-b pb-2 last:border-b-0">
                  <div className="flex justify-between">
                    <p className="font-medium">
                      {plants.find(p => p.id === sale.plantId)?.name || 'Planta eliminada'}
                    </p>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sale.paymentMethod === 'efectivo' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {sale.paymentMethod === 'efectivo' ? 'E' : 'MP'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {sale.quantity} x ${sale.salePrice} = ${sale.total}
                  </p>
                  <p className="text-xs text-gray-500">
                    Fecha: {sale.date ? new Date(sale.date).toLocaleString() : '-'}
                    {sale.location ? ` | Lugar: ${sale.location}` : ''}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No hay ventas registradas</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesView;