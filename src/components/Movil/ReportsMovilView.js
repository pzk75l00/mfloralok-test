import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Vista móvil para reportes (puedes personalizar según necesidades)
const ReportsMovilView = () => {
  const [movements, setMovements] = useState([]);
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const unsubMov = onSnapshot(collection(db, 'movements'), snap => {
      setMovements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPlants = onSnapshot(collection(db, 'plants'), snap => {
      setPlants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubMov(); unsubPlants(); };
  }, []);

  // Filtrar movimientos de hoy
  const now = new Date();
  const hoy = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // Totales del día
  const totalVentas = hoy.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalCompras = hoy.filter(m => m.type === 'compra').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalEgresos = hoy.filter(m => m.type === 'egreso').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalIngresos = hoy.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + (Number(m.total) || 0), 0);

  // Caja efectivo y MP: ventas+ingresos - compras-egresos SOLO del día actual
  const cajaEfectivo = hoy.filter(m => m.paymentMethod === 'efectivo').reduce((sum, m) => {
    if (m.type === 'venta' || m.type === 'ingreso') return sum + (Number(m.total) || 0);
    if (m.type === 'compra' || m.type === 'egreso') return sum - (Number(m.total) || 0);
    return sum;
  }, 0);
  const cajaMP = hoy.filter(m => m.paymentMethod === 'mercadoPago').reduce((sum, m) => {
    if (m.type === 'venta' || m.type === 'ingreso') return sum + (Number(m.total) || 0);
    if (m.type === 'compra' || m.type === 'egreso') return sum - (Number(m.total) || 0);
    return sum;
  }, 0);
  // Cantidad total de productos vendidos hoy
  const cantidadProductosVendidos = hoy.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // Ranking productos más vendidos hoy
  const ventasPorProducto = {};
  hoy.filter(m => m.type === 'venta').forEach(m => {
    if (!m.plantId) return;
    ventasPorProducto[m.plantId] = (ventasPorProducto[m.plantId] || 0) + (Number(m.quantity) || 0);
  });
  const topVendidos = Object.entries(ventasPorProducto)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Producto eliminado',
      qty
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

  // Productos con bajo stock (menos de 5)
  const bajoStock = plants.filter(p => Number(p.stock) <= 5).sort((a, b) => a.stock - b.stock).slice(0, 10);

  // Datos para el gráfico de barras
  const barData = {
    labels: topVendidos.map(item => item.name),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: topVendidos.map(item => item.qty),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderColor: 'rgba(34,197,94,1)',
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Productos vendidos hoy' },
    },
    scales: {
      x: { title: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
    },
  };

  // --- Productos más vendidos del mes ---
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const movimientosMes = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
  });
  const ventasPorProductoMes = {};
  movimientosMes.filter(m => m.type === 'venta').forEach(m => {
    if (!m.plantId) return;
    ventasPorProductoMes[m.plantId] = (ventasPorProductoMes[m.plantId] || 0) + (Number(m.quantity) || 0);
  });
  const topVendidosMes = Object.entries(ventasPorProductoMes)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Producto eliminado',
      qty
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);
  const barDataMes = {
    labels: topVendidosMes.map(item => item.name),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: topVendidosMes.map(item => item.qty),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 1,
      },
    ],
  };
  const barOptionsMes = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Productos vendidos este mes' },
    },
    scales: {
      x: { title: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
    },
  };

  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      <div className="rounded-lg shadow bg-white p-3">
        <div className="font-semibold text-green-700 mb-2">Totales del día</div>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <div className="bg-green-100 rounded px-3 py-1">Ventas: <b>${totalVentas.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-red-100 rounded px-3 py-1">Compras: <b>${totalCompras.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-orange-100 rounded px-3 py-1">Egresos: <b>${totalEgresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-lime-100 rounded px-3 py-1">Ingresos: <b>${totalIngresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-blue-100 rounded px-3 py-1">Caja Efectivo: <b>${cajaEfectivo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-purple-100 rounded px-3 py-1">Caja MP: <b>${cajaMP.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></div>
          <div className="bg-gray-100 rounded px-3 py-1">Productos vendidos: <b>{cantidadProductosVendidos}</b></div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="font-semibold text-blue-700 mb-2">Productos más vendidos hoy</div>
        {topVendidos.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay ventas registradas hoy.</div>
        ) : (
          <>
            <Bar data={barData} options={barOptions} height={220} />
            <ul className="text-sm mt-2">
              {topVendidos.map((item, idx) => (
                <li key={item.name} className={idx === 0 ? 'font-bold text-green-700' : ''}>{item.name}: {item.qty}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="font-semibold text-blue-700 mb-2">Productos más vendidos del mes</div>
        {topVendidosMes.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay ventas registradas este mes.</div>
        ) : (
          <>
            <Bar data={barDataMes} options={barOptionsMes} height={220} />
            <ul className="text-sm mt-2">
              {topVendidosMes.map((item, idx) => (
                <li key={item.name} className={idx === 0 ? 'font-bold text-blue-700' : ''}>{item.name}: {item.qty}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="bg-white rounded-lg shadow p-3">
        <div className="font-semibold text-orange-700 mb-2">Productos a reponer (bajo stock)</div>
        {bajoStock.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay productos con bajo stock.</div>
        ) : (
          <ul className="text-sm">
            {bajoStock.map(p => (
              <li key={p.id}>{p.name} <span className="text-gray-500">({p.stock} en stock)</span></li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ReportsMovilView;
