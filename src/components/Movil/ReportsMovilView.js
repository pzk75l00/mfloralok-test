import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement, // <-- Agregado
  LineElement,  // <-- Agregado
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend);

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
  // Ranking productos vendidos hoy
  const ventasPorProducto = {};
  hoy.filter(m => m.type === 'venta').forEach(m => {
    if (!m.plantId) return;
    ventasPorProducto[m.plantId] = (ventasPorProducto[m.plantId] || 0) + (Number(m.quantity) || 0);
  });
  // Productos vendidos hoy (todos)
  const productosVendidosHoy = Object.entries(ventasPorProducto)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Producto eliminado',
      qty
    }))
    .sort((a, b) => b.qty - a.qty);

  // Datos para el gráfico de barras (hoy)
  const barData = {
    labels: productosVendidosHoy.map(item => item.name),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: productosVendidosHoy.map(item => item.qty),
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

  // --- Productos vendidos del mes ---
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
  const productosVendidosMes = Object.entries(ventasPorProductoMes)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Producto eliminado',
      qty
    }))
    .sort((a, b) => b.qty - a.qty);
  const barDataMes = {
    labels: productosVendidosMes.map(item => item.name),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: productosVendidosMes.map(item => item.qty),
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

  // --- REEMPLAZAR bajoStock y movimientosMes para evitar duplicados ---
  // --- NUEVOS TOTALES Y SEPARACIÓN MP/EFECTIVO ---
  // Totales del mes
  const movimientosMes2 = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
  });
  // Total productos vendidos en el mes
  const totalProductosVendidosMes = movimientosMes2.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // Totales por método de pago y tipo
  const sumMov = (arr, type, method) => arr.filter(m => m.type === type && m.paymentMethod === method).reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  // Día
  const gastosEfectivo = sumMov(hoy, 'egreso', 'efectivo') + sumMov(hoy, 'compra', 'efectivo');
  const gastosMP = sumMov(hoy, 'egreso', 'mercadoPago') + sumMov(hoy, 'compra', 'mercadoPago');
  const totalDisponibleEfectivo = cajaEfectivo;
  const totalDisponibleMP = cajaMP;

  // Mes
  const gastosEfectivoMes = sumMov(movimientosMes2, 'egreso', 'efectivo') + sumMov(movimientosMes2, 'compra', 'efectivo');
  const gastosMPMes = sumMov(movimientosMes2, 'egreso', 'mercadoPago') + sumMov(movimientosMes2, 'compra', 'mercadoPago');
  const ventasEfectivoMes = sumMov(movimientosMes2, 'venta', 'efectivo');
  const ventasMPMes = sumMov(movimientosMes2, 'venta', 'mercadoPago');

  // --- GRÁFICO MENSUAL POR DÍA ---
  const diasEnMes = new Date(nowYear, nowMonth + 1, 0).getDate();
  const ventasPorDia = Array(diasEnMes).fill(0);
  const productosPorDia = Array(diasEnMes).fill(0);
  movimientosMes2.forEach(m => {
    if (!m.date) return;
    const d = new Date(m.date);
    if (m.type === 'venta') {
      ventasPorDia[d.getDate() - 1] += Number(m.total) || 0;
      productosPorDia[d.getDate() - 1] += Number(m.quantity) || 0;
    }
  });
  // --- GRÁFICO MENSUAL POR DÍA (NUEVO: SOLO TOTAL VENDIDO, BARRAS SIMPLES) ---
  const barDataVentasPorDia = {
    labels: Array.from({ length: diasEnMes }, (_, i) => `${i + 1}`),
    datasets: [
      {
        label: 'Total vendido ($)',
        data: ventasPorDia,
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderColor: 'rgba(34,197,94,1)',
        borderWidth: 1,
      },
    ],
  };
  const barOptionsVentasPorDia = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Total vendido por día del mes' },
    },
    scales: {
      x: { title: { display: true, text: 'Día del mes' } },
      y: { beginAtZero: true, title: { display: true, text: 'Total vendido ($)' } },
    },
  };

  // --- GRÁFICO MENSUAL POR DÍA (NUEVO: SOLO CANTIDAD DE PRODUCTOS, BARRAS SIMPLES) ---
  const barDataProductosPorDia = {
    labels: Array.from({ length: diasEnMes }, (_, i) => `${i + 1}`),
    datasets: [
      {
        label: 'Cantidad productos vendidos',
        data: productosPorDia,
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: 'rgba(59,130,246,1)',
        borderWidth: 1,
      },
    ],
  };
  const barOptionsProductosPorDia = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Cantidad de productos vendidos por día del mes' },
    },
    scales: {
      x: { title: { display: true, text: 'Día del mes' } },
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad productos' } },
    },
  };

  // --- TABLA DE GANANCIA POR PRODUCTO VENDIDO EN EL MES ---
  const gananciaPorProducto = {};
  movimientosMes2.filter(m => m.type === 'venta').forEach(m => {
    if (!m.plantId) return;
    const plant = plants.find(p => String(p.id) === String(m.plantId));
    const costo = plant ? (Number(plant.basePrice) || 0) : 0;
    const totalVenta = Number(m.total) || 0;
    const cantidad = Number(m.quantity) || 0;
    if (!gananciaPorProducto[m.plantId]) {
      gananciaPorProducto[m.plantId] = { name: plant?.name || 'Producto eliminado', cantidad: 0, totalVenta: 0, totalCosto: 0, ganancia: 0 };
    }
    gananciaPorProducto[m.plantId].cantidad += cantidad;
    gananciaPorProducto[m.plantId].totalVenta += totalVenta;
    gananciaPorProducto[m.plantId].totalCosto += costo * cantidad;
    gananciaPorProducto[m.plantId].ganancia += (totalVenta - costo * cantidad);
  });
  // Calcular % de ganancia sobre el costo total (si el costo es 0, mostrar '-')
  const gananciaArray = Object.values(gananciaPorProducto).map(row => ({
    ...row,
    porcentaje: row.totalCosto > 0 ? ((row.ganancia / row.totalCosto) * 100) : null
  })).sort((a, b) => b.ganancia - a.ganancia);

  // Ganancia total del mes
  const gananciaTotalMes = gananciaArray.reduce((sum, row) => sum + row.ganancia, 0);
  const costoTotalMes = gananciaArray.reduce((sum, row) => sum + row.totalCosto, 0);
  const porcentajeGananciaTotalMes = costoTotalMes > 0 ? (gananciaTotalMes / costoTotalMes) * 100 : null;

  // --- PRODUCTOS A REPONER (stock <= 1) ---
  const bajoStockMin = 1;
  const bajoStock2 = plants.filter(p => Number(p.stock) <= bajoStockMin).sort((a, b) => a.stock - b.stock);

  // --- GRAFICO DE GASTOS DEL MES POR TIPO Y METODO DE PAGO (egreso, compra, gasto) ---
  const gastosEfectivoMesEgreso = movimientosMes2.filter(m => m.type === 'egreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosEfectivoMesCompra = movimientosMes2.filter(m => m.type === 'compra' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosEfectivoMesGasto = movimientosMes2.filter(m => m.type === 'gasto' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosMPMesEgreso = movimientosMes2.filter(m => m.type === 'egreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosMPMesCompra = movimientosMes2.filter(m => m.type === 'compra' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosMPMesGasto = movimientosMes2.filter(m => m.type === 'gasto' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);

  const barDataGastosMes = {
    labels: [
      'Egreso Efectivo',
      'Egreso MP',
      'Compra Efectivo',
      'Compra MP',
      'Gasto Efectivo',
      'Gasto MP',
    ],
    datasets: [
      {
        label: 'Gastos ($)',
        data: [
          gastosEfectivoMesEgreso,
          gastosMPMesEgreso,
          gastosEfectivoMesCompra,
          gastosMPMesCompra,
          gastosEfectivoMesGasto,
          gastosMPMesGasto,
        ],
        backgroundColor: [
          'rgba(239,68,68,0.7)', // egreso efectivo - rojo
          'rgba(168,85,247,0.7)', // egreso MP - violeta
          'rgba(251,191,36,0.7)', // compra efectivo - amarillo
          'rgba(59,130,246,0.7)', // compra MP - azul
          'rgba(16,185,129,0.7)', // gasto efectivo - verde
          'rgba(244,63,94,0.7)', // gasto MP - rosa
        ],
        borderColor: [
          'rgba(239,68,68,1)',
          'rgba(168,85,247,1)',
          'rgba(251,191,36,1)',
          'rgba(59,130,246,1)',
          'rgba(16,185,129,1)',
          'rgba(244,63,94,1)',
        ],
        borderWidth: 1,
      },
    ],
  };
  const barOptionsGastosMes = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Gastos del mes por tipo y método de pago' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Gastos ($)' } },
    },
  };

  return (
    <div>
      <div className="relative min-h-screen bg-gray-50 pb-24">
        {/* NUEVOS TOTALES */}
        <div className="rounded-lg shadow bg-white p-3 mb-4">
          <div className="font-semibold text-green-700 mb-2">Totales del día</div>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <div className="bg-green-100 rounded px-3 py-1">Ventas: <b>{totalVentas.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-red-100 rounded px-3 py-1">Compras: <b>{totalCompras.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-orange-100 rounded px-3 py-1">Egresos: <b>{totalEgresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-lime-100 rounded px-3 py-1">Ingresos: <b>{totalIngresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-sm mt-2">
            <div className="bg-blue-100 rounded px-3 py-1">Total Disponible Efectivo: <b>{totalDisponibleEfectivo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-purple-100 rounded px-3 py-1">Total Disponible MP: <b>{totalDisponibleMP.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-sm mt-2">
            <div className="bg-blue-50 rounded px-3 py-1">Gastos/Compras/Egresos Efectivo: <b>{gastosEfectivo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-purple-50 rounded px-3 py-1">Gastos/Compras/Egresos MP: <b>{gastosMP.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          </div>
        </div>
        {/* TOTALES DEL MES */}
        <div className="rounded-lg shadow bg-white p-3 mb-4">
          <div className="font-semibold text-green-700 mb-2">Totales del mes</div>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <div className="bg-green-100 rounded px-3 py-1">Ventas Efectivo: <b>{ventasEfectivoMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-purple-100 rounded px-3 py-1">Ventas MP: <b>{ventasMPMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-blue-50 rounded px-3 py-1">Gastos/Compras/Egresos Efectivo: <b>{gastosEfectivoMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-purple-50 rounded px-3 py-1">Gastos/Compras/Egresos MP: <b>{gastosMPMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-gray-100 rounded px-3 py-1">Productos vendidos en el mes: <b>{totalProductosVendidosMes}</b></div>
          </div>
        </div>
        {/* GRÁFICO DE PRODUCTOS VENDIDOS HOY */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">Productos vendidos hoy</div>
          {productosVendidosHoy.length === 0 ? (
            <div className="text-gray-400 text-sm">No hay ventas registradas hoy.</div>
          ) : (
            <>
              <Bar data={barData} options={barOptions} height={220} />
              <ul className="text-sm mt-2">
                {productosVendidosHoy.map((item, idx) => (
                  <li key={item.name} className={idx === 0 ? 'font-bold text-green-700' : ''}>{item.name}: {item.qty}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        {/* GRÁFICO DE PRODUCTOS VENDIDOS MES */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">Productos vendidos del mes</div>
          {productosVendidosMes.length === 0 ? (
            <div className="text-gray-400 text-sm">No hay ventas registradas este mes.</div>
          ) : (
            <>
              <Bar data={barDataMes} options={barOptionsMes} height={220} />
              <ul className="text-sm mt-2">
                {productosVendidosMes.map((item, idx) => (
                  <li key={item.name} className={idx === 0 ? 'font-bold text-blue-700' : ''}>{item.name}: {item.qty}</li>
                ))}
              </ul>
            </>
          )}
        </div>
        {/* GRÁFICO MENSUAL POR DÍA (SOLO TOTAL VENDIDO) */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">Total vendido por día del mes</div>
          <Bar data={barDataVentasPorDia} options={barOptionsVentasPorDia} height={220} />
        </div>
        {/* GRÁFICO MENSUAL POR DÍA (SOLO CANTIDAD DE PRODUCTOS) */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">Cantidad de productos vendidos por día del mes</div>
          <Bar data={barDataProductosPorDia} options={barOptionsProductosPorDia} height={220} />
        </div>
        {/* GRÁFICO MENSUAL POR DÍA (JUNTOS: TOTAL VENDIDO Y CANTIDAD DE PRODUCTOS) */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">Total vendido y cantidad de productos por día del mes</div>
          <Bar
            data={{
              labels: Array.from({ length: diasEnMes }, (_, i) => `${i + 1}`),
              datasets: [
                {
                  type: 'bar',
                  label: 'Total vendido ($)',
                  data: ventasPorDia,
                  backgroundColor: 'rgba(34,197,94,0.7)',
                  borderColor: 'rgba(34,197,94,1)',
                  borderWidth: 1,
                  yAxisID: 'y',
                },
                {
                  type: 'line',
                  label: 'Cantidad productos',
                  data: productosPorDia,
                  backgroundColor: 'rgba(59,130,246,0.7)',
                  borderColor: 'rgba(59,130,246,1)',
                  borderWidth: 2,
                  fill: false,
                  yAxisID: 'y1',
                },
              ],
            }}
            options={{
              responsive: true,
              plugins: {
                legend: { display: true },
                title: { display: true, text: 'Total vendido ($) y cantidad de productos por día' },
              },
              scales: {
                x: { title: { display: true, text: 'Día del mes' } },
                y: { beginAtZero: true, title: { display: true, text: 'Total vendido ($)' } },
                y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Cantidad productos' }, grid: { drawOnChartArea: false } },
              },
            }}
            height={220}
          />
        </div>
        {/* TABLA DE GANANCIA POR PRODUCTO */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-green-700 mb-2">Ganancia por producto vendido (mes)</div>
          <div className="mb-1 text-green-800 text-sm font-bold">Ganancia total: {gananciaTotalMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</div>
          <div className="mb-2 text-green-800 text-sm font-bold">% Ganancia total: {porcentajeGananciaTotalMes !== null ? porcentajeGananciaTotalMes.toFixed(1) + '%' : '-'}</div>
          {gananciaArray.length === 0 ? (
            <div className="text-gray-400 text-sm">No hay ventas registradas este mes.</div>
          ) : (
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-green-100">
                  <th className="p-1">Producto</th>
                  <th className="p-1">Cantidad</th>
                  <th className="p-1">Total Venta</th>
                  <th className="p-1">Total Costo</th>
                  <th className="p-1">Ganancia</th>
                  <th className="p-1">% Ganancia</th>
                </tr>
              </thead>
              <tbody>
                {gananciaArray.map((row, idx) => (
                  <tr key={row.name + idx}>
                    <td className="p-1">{row.name}</td>
                    <td className="p-1 text-center">{row.cantidad}</td>
                    <td className="p-1 text-right">{row.totalVenta.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</td>
                    <td className="p-1 text-right">{row.totalCosto.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</td>
                    <td className="p-1 text-right font-bold">{row.ganancia.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</td>
                    <td className="p-1 text-right">{row.porcentaje !== null ? row.porcentaje.toFixed(1) + '%' : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {/* PRODUCTOS A REPONER */}
        <div className="bg-white rounded-lg shadow p-3">
          <div className="font-semibold text-orange-700 mb-2">Productos a reponer (bajo stock)</div>
          {bajoStock2.length === 0 ? (
            <div className="text-gray-400 text-sm">No hay productos con bajo stock.</div>
          ) : (
            <ul className="text-sm">
              {bajoStock2.map(p => (
                <li key={p.id}>{p.name} <span className="text-gray-500">({p.stock} en stock)</span></li>
              ))}
            </ul>
          )}
        </div>
        {/* GRÁFICO DE GASTOS DEL MES */}
        <div className="bg-white rounded-lg shadow p-3 mb-4">
          <div className="font-semibold text-red-700 mb-2">Gastos del mes por tipo y método de pago</div>
          <Bar data={barDataGastosMes} options={barOptionsGastosMes} height={220} />
        </div>
      </div>
    </div>
  );
};

export default ReportsMovilView;
