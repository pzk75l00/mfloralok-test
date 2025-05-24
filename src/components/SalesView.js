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
    if (isNaN(d.getTime())) return false;
    const fechaArg = d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' });
    const nowArg = now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' });
    return fechaArg === nowArg;
  });
  const purchasesThisMonth = purchases.filter(purchase => {
    if (!purchase.date) return false;
    const d = new Date(purchase.date);
    if (isNaN(d.getTime())) return false;
    const fechaArg = d.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' });
    const nowArg = now.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit' });
    return fechaArg === nowArg;
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

  // Detectar si es móvil (CSS responsive, pero también JS para lógica condicional)
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /*
  Wireframe visual esperado en móvil:
  +-----------------------------+
  |   Total General   $9999.99  |
  +-----------------------------+
  | Efectivo $9999 | MP $9999   |
  +-----------------------------+
  |  [ Formulario de venta ]    |
  +-----------------------------+
  (No se muestra histórico ni stats)
  */

  if (loading || loadingPurchases) return <div>Cargando ventas y compras...</div>;

  // --- BLOQUE DE TOTALES CLAVE PARA MÓVIL ---
  const TotalesMobile = () => (
    <div className="space-y-3 mb-4">
      <div className="bg-orange-100 rounded p-4 text-center border-2 border-orange-400 shadow-md">
        <div className="text-xs text-gray-700 font-semibold">Total General</div>
        <div className="text-3xl font-extrabold text-orange-700">${(totalMonthCash + totalMonthMP).toFixed(2)}</div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-green-50 rounded p-3 text-center border border-green-200 shadow-sm">
          <div className="text-xs text-gray-700 font-semibold">Ventas Efectivo</div>
          <div className="text-xl font-bold text-green-700">${totalMonthCash.toFixed(2)}</div>
        </div>
        <div className="flex-1 bg-purple-50 rounded p-3 text-center border border-purple-200 shadow-sm">
          <div className="text-xs text-gray-700 font-semibold">Ventas MP</div>
          <div className="text-xl font-bold text-purple-700">${totalMonthMP.toFixed(2)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Ventas</h2>
      {/* Vista móvil: solo formulario y totales clave */}
      {isMobile ? (
        <>
          {/* Si el usuario ve esto y no el diseño simplificado, debe limpiar caché o esperar deploy */}
          <div className="mb-2 text-xs text-yellow-700 bg-yellow-100 border-l-4 border-yellow-400 p-2 rounded">
            Si no ves solo los totales y el formulario, prueba recargar la página o limpiar caché. Si el problema persiste, espera a que el deploy se actualice.
          </div>
          <TotalesMobile />
          <div className="mt-2">
            <SalesForm plants={plants} onCompleteSale={handleCompleteSale} />
          </div>
        </>
      ) : (
        <>
          {/* Escritorio: stats completos y todo el histórico */}
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
                    .slice()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
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
                          Fecha: {sale.date ? new Date(sale.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' }) : '-'}
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
        </>
      )}
    </div>
  );
};

export default SalesView;