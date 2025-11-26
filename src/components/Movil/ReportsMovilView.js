import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { Bar } from 'react-chartjs-2';
import { 
  calculateBalanceByPaymentMethod, 
  calculatePeriodBalance,
  calculateDetailedTotals,
  calculateAvailableTotalsFromFiltered,
  calculateBalanceUntilDateNormalized,
  computeMonthlyRunningByMethod
} from '../../utils/balanceCalculations';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement, // <-- Agregado
  LineElement,  // <-- Agregado
  LineController, // <-- AGREGADO PARA GRÁFICOS DE LÍNEA
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, LineController, Title, Tooltip, Legend);

// Vista móvil para reportes (puedes personalizar según necesidades)
const ReportsMovilView = () => {
  const [movements, setMovements] = useState([]);
  const [plants, setPlants] = useState([]);
  const [showMpDetail, setShowMpDetail] = useState(false);
  // --- FILTRO POR FECHA SELECCIONADA (solo para ventas móvil) ---
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });

  useEffect(() => {
    const unsubMov = onSnapshot(collection(db, 'movements'), snap => {
      setMovements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPlants = onSnapshot(collection(db, 'producto'), snap => {
      setPlants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubMov(); unsubPlants(); };
  }, []);

  // Filtrar movimientos de hoy (ajustado para comparar solo año, mes y día, ignorando hora/min/seg y desfases de zona horaria)
  const now = new Date();
  const nowMonth = now.getMonth();
  const nowYear = now.getFullYear();
  const hoy = movements.filter(mov => {
    if (!mov.date) return false;
    // Soporta tanto timestamps como strings ISO
    const d = new Date(mov.date);
    return d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
  });

  // Totales del día
  const totalVentas = hoy.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalCompras = hoy.filter(m => m.type === 'compra').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalEgresos = hoy.filter(m => m.type === 'egreso').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalIngresos = hoy.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + (Number(m.total) || 0), 0);

  // --- CÁLCULOS DE SALDO MEJORADOS ---
  // Saldo total acumulado (desde el inicio HASTA HOY inclusive)
  console.log('🔥 DIAGNÓSTICO REPORTES MÓVIL - Calculando saldos...');
  console.log('🔥 Total de movimientos para cálculo:', movements.length);
  
  // Filtrar movimientos con fecha válida y no posteriores a "ahora" para respetar el texto de la tarjeta
  const movimientosHastaHoy = movements.filter(m => {
    if (!m?.date) return false;
    const d = new Date(m.date);
    return d <= now; // incluye hoy y excluye futuras
  });

  // Calcular usando únicamente movimientos hasta hoy
  const saldoTotalAcumulado = calculateBalanceByPaymentMethod(movimientosHastaHoy);
  console.log('🔥 RESULTADO saldoTotalAcumulado (función original):', saldoTotalAcumulado);
  // Regla de negocio solicitada: el SALDO TOTAL DISPONIBLE no se muestra negativo
  const clampedDisponibleEfectivo = Math.max(0, saldoTotalAcumulado.efectivo || 0);
  const clampedDisponibleMP = Math.max(0, saldoTotalAcumulado.mercadoPago || 0);
  const clampedDisponibleTotal = clampedDisponibleEfectivo + clampedDisponibleMP;
  const wasClampedDisponible = clampedDisponibleEfectivo !== (saldoTotalAcumulado.efectivo || 0) || clampedDisponibleMP !== (saldoTotalAcumulado.mercadoPago || 0);
  
  // Saldos del día actual (para mostrar movimientos del día)
  const saldoDelDia = calculatePeriodBalance(movements, 'day', now);
  
  // Saldos del mes actual (para comparación) - unificado con Cash usando wrapper normalizado
  const movimientosMes2 = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
  });
  const saldoDelMes = calculateAvailableTotalsFromFiltered(movimientosMes2);

  // Mantener compatibilidad con variables existentes para el resto del código
  const totalDisponibleEfectivo = saldoTotalAcumulado.efectivo;
  const totalDisponibleMP = saldoTotalAcumulado.mercadoPago;
  const cajaEfectivo = saldoDelDia.efectivo;
  const cajaMP = saldoDelDia.mercadoPago;
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
  // Total productos vendidos en el mes
  const totalProductosVendidosMes = movimientosMes2.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // Totales por método de pago y tipo usando pagos mixtos
  const totalsHoy = calculateDetailedTotals(hoy);
  const gastosEfectivo = totalsHoy.egresosEfectivo + totalsHoy.comprasEfectivo + totalsHoy.gastosEfectivo;
  const gastosMP = totalsHoy.egresosMP + totalsHoy.comprasMP + totalsHoy.gastosMP;
  // Variables ya definidas arriba con los nuevos cálculos

  // Mes
  const totalsMes = calculateDetailedTotals(movimientosMes2);
  const gastosEfectivoMes = totalsMes.egresosEfectivo + totalsMes.comprasEfectivo + totalsMes.gastosEfectivo;
  const gastosMPMes = totalsMes.egresosMP + totalsMes.comprasMP + totalsMes.gastosMP;
  const ventasEfectivoMes = totalsMes.ventasEfectivo;
  const ventasMPMes = totalsMes.ventasMP;

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
  const gastosEfectivoMesEgreso = totalsMes.egresosEfectivo;
  const gastosEfectivoMesCompra = totalsMes.comprasEfectivo;
  const gastosEfectivoMesGasto = totalsMes.gastosEfectivo;
  const gastosMPMesEgreso = totalsMes.egresosMP;
  const gastosMPMesCompra = totalsMes.comprasMP;
  const gastosMPMesGasto = totalsMes.gastosMP;

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

  // --- GRÁFICO DE VENTAS VS GASTOS DEL MES (sin diferenciar método de pago) ---
  // Usar variable diferente para evitar duplicado
  const totalVentasMes = movimientosMes2.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const totalGastoMes_Vs = movimientosMes2.filter(m => m.type === 'egreso' || m.type === 'compra' || m.type === 'gasto').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const barDataVentasVsGastos = {
    labels: ['Ventas', 'Gastos'],
    datasets: [
      {
        label: 'Total ($)',
        data: [totalVentasMes, totalGastoMes_Vs],
        backgroundColor: ['rgba(34,197,94,0.7)', 'rgba(239,68,68,0.7)'],
        borderColor: ['rgba(34,197,94,1)', 'rgba(239,68,68,1)'],
        borderWidth: 1,
      },
    ],
  };
  const barOptionsVentasVsGastos = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Ventas vs Gastos del mes' },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Total ($)' } },
    },
  };

  // Filtrar movimientos por la fecha seleccionada (solo ventas, compras, ingresos, egresos, gastos)
  const movimientosEnFecha = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    const fechaMov = d.toISOString().slice(0, 10);
    return fechaMov === selectedDate;
  });

  // Ranking productos vendidos en la fecha seleccionada
  const ventasPorProductoFecha = {};
  movimientosEnFecha.filter(m => m.type === 'venta').forEach(m => {
    if (!m.plantId) return;
    ventasPorProductoFecha[m.plantId] = (ventasPorProductoFecha[m.plantId] || 0) + (Number(m.quantity) || 0);
  });
  const productosVendidosFecha = Object.entries(ventasPorProductoFecha)
    .map(([plantId, qty]) => ({
      name: plants.find(p => String(p.id) === String(plantId))?.name || 'Producto eliminado',
      qty
    }))
    .sort((a, b) => b.qty - a.qty);

  // Datos para el gráfico de barras (fecha seleccionada)
  const barDataFecha = {
    labels: productosVendidosFecha.map(item => item.name),
    datasets: [
      {
        label: 'Cantidad vendida',
        data: productosVendidosFecha.map(item => item.qty),
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderColor: 'rgba(34,197,94,1)',
        borderWidth: 1,
      },
    ],
  };
  const barOptionsFecha = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Productos vendidos en la fecha seleccionada' },
    },
    scales: {
      x: { title: { display: false } },
      y: { beginAtZero: true, title: { display: true, text: 'Cantidad' } },
    },
  };

  // NOTA: Los cálculos de saldo ahora usan las utilidades para mostrar el saldo real acumulado
  // Mantener las variables del mes para comparación si es necesario
  const cajaEfectivoMes = saldoDelMes.cajaFisica;
  const cajaMPMes = saldoDelMes.cajaMP;
  const totalDisponibleMes = saldoDelMes.totalGeneral;
  // Desglose mensual MP desde el arranque (auditoría)
  const mpMonthly = computeMonthlyRunningByMethod(movements, 'mercadoPago');

  // --- AUDITORÍA RÁPIDA DE MERCADO PAGO: inicial del mes, neto del mes y final ---
  const inicioDeMes = new Date(nowYear, nowMonth, 1, 0, 0, 0, 0);
  const finMesAnterior = new Date(nowYear, nowMonth, 0, 23, 59, 59, 999); // día 0 = último del mes previo
  const finDeHoy = new Date(nowYear, nowMonth, now.getDate(), 23, 59, 59, 999);
  const saldoInicialMes_MP = calculateBalanceUntilDateNormalized(movements, finMesAnterior, 'mercadoPago');
  const saldoDisponibleHoy_MP = calculateBalanceUntilDateNormalized(movements, finDeHoy, 'mercadoPago');
  // Neto del mes = saldo disponible hoy - saldo inicial del mes (aprox. hasta hoy)
  const netoMes_MP = saldoDisponibleHoy_MP - saldoInicialMes_MP;

  return (
    <div className="p-3">
      <h1 className="text-lg font-bold mb-3">Reportes - Móvil</h1>
      
      {/* SALDO TOTAL DISPONIBLE - PRINCIPAL */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-4 mb-4 border border-green-200">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800">💰 Saldo Total Disponible</span>
            <span className="text-2xl font-bold text-green-700">${clampedDisponibleTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600 bg-white bg-opacity-60 rounded px-2 py-1">
            <span>💵 Efectivo: <b>${clampedDisponibleEfectivo.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            <span>💳 Mercado Pago: <b>${clampedDisponibleMP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
          </div>
          <div className="text-xs text-gray-600 mt-1 font-medium">
            ✅ Saldo disponible (no negativo) acumulado desde el inicio hasta hoy.
            {wasClampedDisponible && (
              <span className="ml-1 text-red-600">(se evitó mostrar valores negativos)</span>
            )}
          </div>
        </div>
      </div>

      {/* SALDO DEL MES - SECUNDARIO */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">📅 Total del mes actual</span>
            <span className="text-xl font-bold text-blue-700">${totalDisponibleMes.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Efectivo: <b>${cajaEfectivoMes.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            <span>Mercado Pago: <b>${cajaMPMes.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Movimientos únicamente del mes actual.
          </div>
          {/* Auditoría breve para despejar dudas de diferencia entre MP disponible y del mes */}
          <div className="mt-2 p-2 rounded bg-blue-50 text-[11px] text-blue-900">
            <div className="font-semibold mb-1">Auditoría MP (rápida)</div>
            <div className="flex flex-wrap gap-2">
              <span>Saldo inicial mes MP: <b>${saldoInicialMes_MP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
              <span>Neto del mes MP: <b>${netoMes_MP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
              <span>Saldo disponible hoy MP: <b>${saldoDisponibleHoy_MP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b></span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span>Fórmula: inicial + neto ≈ disponible.</span>
              <button onClick={() => setShowMpDetail(v => !v)} className="ml-auto text-blue-700 underline">{showMpDetail ? 'ocultar detalle' : 'ver detalle'}</button>
            </div>
            {showMpDetail && (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-[420px] w-full text-[11px]">
                  <thead>
                    <tr className="bg-blue-100">
                      <th className="p-1 text-left">Mes</th>
                      <th className="p-1 text-right">Inicio</th>
                      <th className="p-1 text-right">Ingresos</th>
                      <th className="p-1 text-right">Egresos</th>
                      <th className="p-1 text-right">Neto</th>
                      <th className="p-1 text-right">Cierre</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mpMonthly.map(row => (
                      <tr key={row.key}>
                        <td className="p-1">{row.key}</td>
                        <td className="p-1 text-right">{row.start.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right">{row.inflow.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right">{row.outflow.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right">{row.net.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-1 text-right font-semibold">{row.end.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* TOTALES DEL DÍA */}
      {hoy.length === 0 ? (
        <div className="rounded-lg shadow bg-white p-3 mb-4">
          <div className="font-semibold text-blue-700 mb-2">📊 Saldo del día (sin movimientos)</div>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <div className="bg-blue-100 rounded px-3 py-1">Efectivo: <b>{saldoDelDia.efectivo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-purple-100 rounded px-3 py-1">MP: <b>{saldoDelDia.mercadoPago.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg shadow bg-white p-3 mb-4">
          <div className="font-semibold text-green-700 mb-2">Totales del día</div>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <div className="bg-green-100 rounded px-3 py-1">Ventas: <b>{totalVentas.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-red-100 rounded px-3 py-1">Compras: <b>{totalCompras.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-orange-100 rounded px-3 py-1">Egresos: <b>{totalEgresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-pink-100 rounded px-3 py-1">Gastos: <b>{hoy.filter(m => m.type === 'gasto').reduce((sum, m) => sum + (Number(m.total) || 0), 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
            <div className="bg-lime-100 rounded px-3 py-1">Ingresos: <b>{totalIngresos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          </div>
        </div>
      )}
      {/* Saldo de caja actual (opcional, si se quiere mostrar) */}
      {/*
      <div className="rounded-lg shadow bg-white p-3 mb-4">
        <div className="font-semibold text-blue-700 mb-2">Saldo de caja actual</div>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <div className="bg-blue-100 rounded px-3 py-1">Efectivo: <b>{totalDisponibleEfectivo.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          <div className="bg-purple-100 rounded px-3 py-1">MP: <b>{totalDisponibleMP.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
        </div>
      </div>
      */}
      {/* TOTALES DEL MES */}
      <div className="rounded-lg shadow bg-white p-3 mb-4">
        <div className="font-semibold text-green-700 mb-2">Totales del mes</div>
        <div className="flex flex-wrap gap-2 justify-center text-sm">
          <div className="bg-green-100 rounded px-3 py-1">Ventas Efectivo: <b>{ventasEfectivoMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          <div className="bg-purple-100 rounded px-3 py-1">Ventas MP: <b>{ventasMPMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          <div className="bg-blue-50 rounded px-3 py-1">Gastos/Compras/Egresos/Gastos Efectivo: <b>{gastosEfectivoMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
          <div className="bg-purple-50 rounded px-3 py-1">Gastos/Compras/Egresos/Gastos MP: <b>{gastosMPMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</b></div>
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
      {/* GRÁFICO DE GASTOS DEL MES */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="font-semibold text-red-700 mb-2">Gastos del mes por tipo y método de pago</div>
        <Bar data={barDataGastosMes} options={barOptionsGastosMes} height={220} />
      </div>
      {/* GRÁFICO DE VENTAS VS GASTOS DEL MES */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="font-semibold text-blue-700 mb-2">Ventas vs Gastos del mes</div>
        <Bar data={barDataVentasVsGastos} options={barOptionsVentasVsGastos} height={120} />
      </div>
      {/* Selector de fecha para ventas móvil */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2 max-w-xs mx-auto">
        <label className="text-xs font-semibold text-gray-700">Seleccionar fecha:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border rounded px-2 py-1 text-xs"
          max={new Date().toISOString().slice(0, 10)}
        />
      </div>
      {/* Gráfico y lista de productos vendidos en la fecha seleccionada */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 overflow-x-auto">
        <div className="font-semibold text-blue-700 mb-2">Productos vendidos en la fecha seleccionada</div>
        {productosVendidosFecha.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay ventas registradas en esa fecha.</div>
        ) : (
          <>
            <Bar data={barDataFecha} options={barOptionsFecha} height={220} />
            <ul className="text-sm mt-2 min-w-[320px]">
              {productosVendidosFecha.map((item, idx) => (
                <li key={item.name} className={idx === 0 ? 'font-bold text-green-700' : ''}>{item.name}: {item.qty}</li>
              ))}
            </ul>
          </>
        )}
      </div>
      {/* TABLA DE GANANCIA POR PRODUCTO */}
      <div className="bg-white rounded-lg shadow p-3 mb-4 overflow-x-auto">
        <div className="font-semibold text-green-700 mb-2">Ganancia por producto vendido (mes)</div>
        <div className="mb-1 text-green-800 text-sm font-bold">Ganancia total: {gananciaTotalMes.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</div>
        <div className="mb-2 text-green-800 text-sm font-bold">% Ganancia total: {porcentajeGananciaTotalMes !== null ? porcentajeGananciaTotalMes.toFixed(1) + '%' : '-'}</div>
        {gananciaArray.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay ventas registradas este mes.</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="min-w-[480px] w-full text-xs whitespace-nowrap">
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
          </div>
        )}
      </div>
      {/* PRODUCTOS A REPONER */}
      <div className="bg-white rounded-lg shadow p-3 mb-4">
        <div className="font-semibold text-orange-700 mb-2">Productos a reponer (bajo stock)</div>
        {bajoStock2.length === 0 ? (
          <div className="text-gray-400 text-sm">No hay productos con bajo stock.</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <ul className="text-sm min-w-[320px]">
              {bajoStock2.map(p => (
                <li key={p.id}>{p.name} <span className="text-gray-500">({p.stock} en stock)</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>


    </div>
  );
};

export default ReportsMovilView;
