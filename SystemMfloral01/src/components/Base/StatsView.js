import React, { useState } from 'react';
import StatsCard from './StatsCard';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Chart, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend } from 'chart.js';

Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend);

const StatsView = ({ plants, sales, purchases }) => {
  // --- Estadísticas simples ---
  const totalCashSales = sales.filter(s => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + (Number(s.total) || (Number(s.salePrice) * Number(s.quantity)) || 0), 0);
  const totalMPSales = sales.filter(s => s.paymentMethod === 'mercadoPago')
    .reduce((sum, s) => sum + (Number(s.total) || (Number(s.salePrice) * Number(s.quantity)) || 0), 0);
  const totalCashPurchases = purchases.filter(p => p.paymentMethod === 'efectivo')
    .reduce((sum, p) => sum + (Number(p.purchasePrice) * Number(p.quantity) || 0), 0);
  const totalMPPurchases = purchases.filter(p => p.paymentMethod === 'mercadoPago')
    .reduce((sum, p) => sum + (Number(p.purchasePrice) * Number(p.quantity) || 0), 0);

  // --- Reportes y gráficos ---
  // Helper para obtener la fecha en Argentina
  function getDateInArgentina(dateStr) {
    // dateStr: ISO string en UTC
    // Devuelve un objeto Date en la zona horaria de Argentina
    if (!dateStr) return null;
    // Siempre parsear como UTC y luego mostrar en Argentina
    const utcDate = new Date(dateStr);
    // Para filtrar y mostrar, usar toLocaleString con timeZone
    return utcDate;
  }
  // Meses
  const months = Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('es-AR', { month: 'short' }));
  const salesByMonth = Array(12).fill(0);
  const purchasesByMonth = Array(12).fill(0);
  sales.forEach(sale => {
    if (!sale.date) return;
    const d = getDateInArgentina(sale.date);
    const monto = Number(sale.total) || (Number(sale.salePrice) * Number(sale.quantity)) || 0;
    if (!isNaN(d.getMonth()) && !isNaN(monto)) {
      salesByMonth[d.getMonth()] += monto;
    }
  });
  purchases.forEach(purchase => {
    if (!purchase.date) return;
    const d = getDateInArgentina(purchase.date);
    const monto = Number(purchase.purchasePrice) * Number(purchase.quantity) || 0;
    if (!isNaN(d.getMonth()) && !isNaN(monto)) {
      purchasesByMonth[d.getMonth()] += monto;
    }
  });

  // Asegurar que los datos de los gráficos no sean negativos ni NaN
  const cleanArray = arr => arr.map(v => (isNaN(v) || v < 0 ? 0 : v));
  const salesByMonthClean = cleanArray(salesByMonth);
  const purchasesByMonthClean = cleanArray(purchasesByMonth);

  // Stock por tipo de planta
  const stockByType = {};
  plants.forEach(plant => {
    stockByType[plant.type] = (stockByType[plant.type] || 0) + (plant.stock || 0);
  });
  const typeLabels = Object.keys(stockByType);
  const typeData = Object.values(stockByType);

  // Ranking de plantas por lugar
  const [selectedLocation, setSelectedLocation] = useState('');
  const locations = Array.from(new Set(sales.map(s => s.location).filter(Boolean)));
  const salesByLocation = selectedLocation
    ? sales.filter(s => s.location === selectedLocation)
    : sales;
  const plantSalesCount = {};
  salesByLocation.forEach(sale => {
    if (!sale.plantId) return;
    // Unificar tipo de ID para evitar errores de ranking
    const pid = String(sale.plantId);
    plantSalesCount[pid] = (plantSalesCount[pid] || 0) + (Number(sale.quantity) || 0);
  });
  const topPlantSales = Object.entries(plantSalesCount)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Planta eliminada',
      qty
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Progreso del mes actual
  const now = new Date();
  // Obtener la fecha actual en Argentina
  const nowArg = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
  const currentMonth = nowArg.getMonth();
  const currentYear = nowArg.getFullYear();
  const salesThisMonth = sales.filter(sale => {
    if (!sale.date) return false;
    const d = getDateInArgentina(sale.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const purchasesThisMonth = purchases.filter(purchase => {
    if (!purchase.date) return false;
    const d = getDateInArgentina(purchase.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalSalesThisMonth = salesThisMonth.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalPurchasesThisMonth = purchasesThisMonth.reduce((sum, purchase) => sum + ((purchase.purchasePrice || 0) * (purchase.quantity || 0)), 0);
  const netThisMonth = totalSalesThisMonth - totalPurchasesThisMonth;

  // Progreso diario
  const currentDay = nowArg.getDate();
  const salesToday = sales.filter(sale => {
    if (!sale.date) return false;
    const d = getDateInArgentina(sale.date);
    return d.getDate() === currentDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const purchasesToday = purchases.filter(purchase => {
    if (!purchase.date) return false;
    const d = getDateInArgentina(purchase.date);
    return d.getDate() === currentDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const totalSalesToday = salesToday.reduce((sum, sale) => sum + (sale.total || 0), 0);
  const totalPurchasesToday = purchasesToday.reduce((sum, purchase) => sum + ((purchase.purchasePrice || 0) * (purchase.quantity || 0)), 0);
  const netToday = totalSalesToday - totalPurchasesToday;

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-800">Estadísticas y Reportes</h2>
      {/* Resumen del mes actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Ventas del mes</span>
          <span className="text-2xl font-bold text-green-600">${totalSalesThisMonth.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Compras del mes</span>
          <span className="text-2xl font-bold text-red-600">${totalPurchasesThisMonth.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Resultado neto</span>
          <span className={`text-2xl font-bold ${netThisMonth >= 0 ? 'text-green-700' : 'text-red-700'}`}>{netThisMonth >= 0 ? '+' : ''}${netThisMonth.toFixed(2)}</span>
        </div>
      </div>
      {/* Resumen del día actual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Ventas de hoy</span>
          <span className="text-2xl font-bold text-green-600">${totalSalesToday.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Compras de hoy</span>
          <span className="text-2xl font-bold text-red-600">${totalPurchasesToday.toFixed(2)}</span>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center">
          <span className="text-gray-500 text-sm">Resultado neto hoy</span>
          <span className={`text-2xl font-bold ${netToday >= 0 ? 'text-green-700' : 'text-red-700'}`}>{netToday >= 0 ? '+' : ''}${netToday.toFixed(2)}</span>
        </div>
      </div>
      {/* Estadísticas simples */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <StatsCard
          title="Ventas Efectivo"
          value={`$${totalCashSales.toFixed(2)}`}
          icon="💵"
          color="green"
        />
        <StatsCard
          title="Ventas MP"
          value={`$${totalMPSales.toFixed(2)}`}
          icon="📱"
          color="purple"
        />
        <StatsCard
          title="Compras Efectivo"
          value={`$${totalCashPurchases.toFixed(2)}`}
          icon="💵"
          color="green"
        />
        <StatsCard
          title="Compras MP"
          value={`$${totalMPPurchases.toFixed(2)}`}
          icon="📱"
          color="purple"
        />
      </div>
      {/* Gráficos y reportes avanzados */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Ventas vs Compras por Mes</h3>
          <Bar
            data={{
              labels: months,
              datasets: [
                { label: 'Ventas', data: salesByMonthClean, backgroundColor: 'rgba(34,197,94,0.7)' },
                { label: 'Compras', data: purchasesByMonthClean, backgroundColor: 'rgba(239,68,68,0.7)' }
              ]
            }}
            options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
          />
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-2">Stock por Tipo de Planta</h3>
          <Pie
            data={{
              labels: typeLabels,
              datasets: [
                { data: typeData, backgroundColor: ['#22c55e', '#f59e42', '#38bdf8', '#a78bfa', '#f43f5e'] }
              ]
            }}
            options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }}
          />
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h3 className="font-semibold mb-2">Evolución de Ventas Mensuales</h3>
          <Line
            data={{
              labels: months,
              datasets: [
                { label: 'Ventas', data: salesByMonthClean, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.2)', fill: true }
              ]
            }}
            options={{ responsive: true, plugins: { legend: { position: 'top' } } }}
          />
        </div>
        <div className="bg-white rounded-lg shadow p-4 md:col-span-2">
          <h3 className="font-semibold mb-2">Plantas más vendidas por lugar</h3>
          <div className="flex items-center gap-2 mb-4">
            <label className="font-medium">Lugar:</label>
            <select value={selectedLocation} onChange={e => setSelectedLocation(e.target.value)} className="border rounded px-2 py-1">
              <option value="">Todos</option>
              {locations.map(loc => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          {topPlantSales.length > 0 ? (
            <table className="min-w-full text-sm overflow-x-auto" style={{tableLayout:'fixed', width:'100%'}}>
              <thead>
                <tr>
                  <th className="text-left px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">Planta</th>
                  <th className="text-right px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">Cantidad vendida</th>
                </tr>
              </thead>
              <tbody>
                {topPlantSales.map((item, idx) => (
                  <tr key={item.name} className={idx === 0 ? 'font-bold text-green-700' : ''}>
                    <td className="px-2 py-1 whitespace-nowrap overflow-hidden text-ellipsis max-w-[180px]">{item.name}</td>
                    <td className="px-2 py-1 text-right whitespace-nowrap overflow-hidden text-ellipsis max-w-[100px]">{item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No hay ventas registradas en este lugar.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsView;