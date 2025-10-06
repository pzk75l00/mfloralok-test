import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
// import getNow from '../../utils/mockDate'; // Eliminar mock
import MovementsView from '../Base/MovementsView';
import { calculateDetailedTotals, calculateAvailableTotalsFromFiltered } from '../../utils/balanceCalculations';
import { dlog } from '../../utils/debug';
import PropTypes from 'prop-types';

// Vista móvil para Caja: muestra totales del día y formulario
const CashMovilView = (props) => {
  // --- BLOQUE SUTIL DE COMPRAS/EGRESOS DEL DÍA ---
  const [comprasEgresosHoy, setComprasEgresosHoy] = useState([]);
  // --- Estado para selector de mes ---
  const initialNow = new Date(); // Usar fecha real
  const [now, setNow] = useState(initialNow);
  const [selectedMonth, setSelectedMonth] = useState(initialNow.getMonth());
  const [selectedYear, setSelectedYear] = useState(initialNow.getFullYear());
  const [movements, setMovements] = useState([]);
  const [plants, setPlants] = useState([]);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    setNow(new Date()); // Actualiza la fecha real cada vez que recargamos movimientos
    // Suscribirse a movimientos y filtrar compras/egresos del día
    const unsubscribe = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const movimientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(movimientos);
      const nowValue = new Date(); // Usar fecha real
      const currentDay = nowValue.getDate();
      const currentMonth = nowValue.getMonth();
      const currentYear = nowValue.getFullYear();
      const comprasEgresos = movimientos.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date);
        if (isNaN(d.getTime())) return false;
        return (m.type === 'compra' || m.type === 'egreso' || m.type === 'gasto') &&
          d.getDate() === currentDay &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear;
      });
      setComprasEgresosHoy(comprasEgresos);
    });
    const unsubPlants = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => {
      unsubscribe();
      unsubPlants();
    };
  }, [reloadKey]);

  // --- Lógica para filtrar movimientos hasta el final del mes seleccionado ---
  const endOfSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999); // Último día del mes a las 23:59:59
  const movementsUpToMonthEnd = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d <= endOfSelectedMonth;
  });
  // --- Lógica para filtrar movimientos del mes seleccionado (para productos vendidos) ---
  const movementsThisMonth = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });
  // --- Lógica para filtrar movimientos del día actual (solo si mes/año actual) ---
  const isCurrentMonth = selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  const currentDay = now.getDate();
  const movementsToday = isCurrentMonth
    ? movementsUpToMonthEnd.filter(mov => {
        const d = new Date(mov.date);
        return d.getDate() === currentDay && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      })
    : [];

  // --- Totales del mes o del día ---
  // Usar la función reutilizable de utils
  dlog('CASH_MOVIL diagnostico', { day: movementsToday.length, monthAccum: movementsUpToMonthEnd.length });
  // Totales acumulados hasta el fin de mes seleccionado (base para mostrar SALDO disponible)
  const totalsAccumulated = calculateAvailableTotalsFromFiltered(movementsUpToMonthEnd);
  const cantidadProductosVendidosMes = movementsThisMonth
    .filter(m => m.type === 'venta')
    .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  totalsAccumulated.cantidadProductosVendidos = cantidadProductosVendidosMes;

  // Totales netos del día (solo movimientos de hoy) - pueden ser negativos si primer movimiento es una compra
  const dailyTotalsRaw = isCurrentMonth && movementsToday.length > 0
    ? calculateAvailableTotalsFromFiltered(movementsToday)
    : null;

  // 🔎 DIAGNÓSTICO: listar movimientosToday y montos MP individuales
  if (movementsToday.length > 0) {
    try {
      const debugList = movementsToday.map(m => ({
        id: m.id,
        type: m.type,
        total: m.total,
        paymentMethod: m.paymentMethod,
        pm: m.paymentMethods,
        mpAmount: (m.paymentMethods && m.paymentMethods.mercadoPago) ? m.paymentMethods.mercadoPago : (m.paymentMethod === 'mercadoPago' ? m.total : 0)
      }));
      const sumDeclared = debugList.reduce((s, x) => s + (parseFloat(x.mpAmount)||0) * (x.type==='compra'||x.type==='egreso'||x.type==='gasto'?-1:1), 0);
      dlog('MovementsToday MP detalle', debugList, 'sumSignada', sumDeclared);
    } catch(e) { dlog('Diag movementsToday error', e); }
  }

  if (dailyTotalsRaw) {
    const cantidadProductosVendidosDia = movementsToday
      .filter(m => m.type === 'venta')
      .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
    dailyTotalsRaw.cantidadProductosVendidos = cantidadProductosVendidosDia;
  }

  // Nueva regla: si hay movimientos hoy -> mostrar totales DEL DÍA.
  // Si no hay movimientos hoy -> mostrar saldo disponible acumulado del mes hasta hoy.
  const showDayTotals = !!dailyTotalsRaw;
  const totals = showDayTotals ? dailyTotalsRaw : totalsAccumulated;
  dlog('Mostrar totals', showDayTotals ? 'DIA' : 'ACUM', totals);

  // Forzar recarga de movimientos tras registrar uno nuevo
  const handleMovementAdded = (...args) => {
    setReloadKey(k => k + 1);
    setNow(new Date()); // Fuerza actualización de la fecha real
  };

  // Determinar color según lugar
  const lugar = props.lugar || props.location || '';
  const colorMap = {
    'sucursal': { bg: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700' },
    'deposito': { bg: 'bg-yellow-50', border: 'border-yellow-400', text: 'text-yellow-700' },
    'online': { bg: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700' },
    // Agregar más lugares y colores si es necesario
    '': { bg: 'bg-green-50', border: 'border-green-400', text: 'text-green-700' } // default
  };
  const color = colorMap[lugar] || colorMap[''];

  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      <div className="rounded-lg shadow bg-white p-3">
        {/* Panel superior dinámico */}
        <div className={`w-full max-w-xl mx-auto flex flex-wrap gap-2 sm:gap-4 justify-center mb-2`}>
          <div className={`flex-1 min-w-[110px] rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border ${showDayTotals ? 'bg-green-100 border-green-300' : 'bg-blue-50 border-blue-200'}`}> 
            <span className={`text-xs sm:text-sm ${showDayTotals ? 'text-green-700' : 'text-blue-700'}`}>{showDayTotals ? 'Efectivo' : 'Saldo Efectivo'}</span>
            <span className={`text-lg sm:text-2xl font-bold ${showDayTotals ? 'text-green-700' : 'text-blue-700'} truncate`}>
              ${totals.cajaFisica.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`flex-1 min-w-[110px] rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border ${showDayTotals ? 'bg-blue-100 border-blue-300' : 'bg-purple-50 border-purple-200'}`}> 
            <span className={`text-xs sm:text-sm ${showDayTotals ? 'text-blue-700' : 'text-purple-700'}`}>{showDayTotals ? 'Mercado Pago' : 'Saldo MP'}</span>
            <span className={`text-lg sm:text-2xl font-bold ${showDayTotals ? 'text-blue-700' : 'text-purple-700'} truncate`}>
              ${totals.cajaMP.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className={`flex-1 min-w-[110px] rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border ${showDayTotals ? 'bg-yellow-100 border-yellow-300' : 'bg-yellow-50 border-yellow-200'}`}> 
            <span className={`text-xs sm:text-sm ${showDayTotals ? 'text-yellow-700' : 'text-yellow-700'}`}>{showDayTotals ? 'Total' : 'Saldo Total'}</span>
            <span className={`text-lg sm:text-2xl font-bold text-yellow-700 truncate`}>
              ${totals.totalGeneral.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
        {/* Leyenda visual */}
        <div className="text-center text-xs mb-2">
          {showDayTotals ? (
            <span className="text-green-700 font-semibold">Totales del día actual</span>
          ) : (
            <span className="text-blue-700 font-semibold">Saldo disponible acumulado</span>
          )}
        </div>
        {/* Productos vendidos */}
        <div className="mt-2 w-full max-w-xl mx-auto flex flex-row gap-4 justify-center">
          <div className="flex-1 bg-purple-100 rounded-lg shadow p-4 flex flex-col items-center border border-purple-300">
            <span className="text-gray-500 text-sm">{showDayTotals ? 'Artículos vendidos hoy' : 'Artículos vendidos en el mes'}</span>
            <span className="text-2xl font-bold text-purple-700">{totals.cantidadProductosVendidos}</span>
          </div>
        </div>
        {/* Formulario y totales, sin historial de movimientos */}
        <MovementsView
          {...props}
          showOnlyForm={true}
          renderTotals={null}
          onMovementAdded={handleMovementAdded}
        />
        {/* Bloque sutil de compras y egresos del día, solo si es el mes actual */}
        {isCurrentMonth && (
          <div className="mt-8 w-full max-w-xl mx-auto">
            {comprasEgresosHoy.length > 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 shadow-sm p-2 mt-2">
                <div className="text-xs font-semibold text-red-700 mb-2 text-center">Compras, egresos y gastos de hoy</div>
                <ul className="divide-y divide-red-100">
                  <li className="flex flex-row items-center justify-between px-1 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded mb-1">
                    <span className="w-14 text-left">Tipo</span>
                    <span className="flex-1 px-2 text-left">Producto/Detalle</span>
                    <span className="w-20 text-center">Precio</span>
                    <span className="w-14 text-center">Método</span>
                    <span className="max-w-[80px] text-left">Lugar</span>
                  </li>
                  {comprasEgresosHoy.map((m, idx) => {
                    let productoDetalle = '-';
                    if (m.type === 'compra') {
                      if (Array.isArray(m.products) && m.products.length > 0) {
                        productoDetalle = m.products.map(p => p.name).join(', ');
                      } else if (m.plantName) {
                        productoDetalle = m.plantName;
                      } else if (m.plantId && Array.isArray(plants) && plants.length > 0) {
                        const plant = plants.find(p => String(p.id) === String(m.plantId));
                        productoDetalle = plant ? plant.name : (m.detail || m.notes || '-');
                      } else {
                        productoDetalle = m.detail || m.notes || '-';
                      }
                    } else {
                      productoDetalle = m.detail || m.notes || '-';
                    }
                    // Etiqueta corta del método de pago, compatible con pagos mixtos
                    const methodLabel = (() => {
                      try {
                        if (m && m.paymentMethods && typeof m.paymentMethods === 'object') {
                          const active = Object.entries(m.paymentMethods).filter(([, amount]) => (parseFloat(amount) || 0) > 0);
                          if (active.length > 1) return 'Mixto';
                          if (active.length === 1) {
                            const key = active[0][0];
                            if (key === 'mercadoPago') return 'MP';
                            if (key === 'efectivo') return 'Efectivo';
                            return key;
                          }
                        }
                        // Fallback al campo simple
                        if (m.paymentMethod === 'mercadoPago') return 'MP';
                        if (m.paymentMethod === 'efectivo') return 'Efectivo';
                        return m.paymentMethod || '-';
                      } catch {
                        return m?.paymentMethod || '-';
                      }
                    })();
                    return (
                      <li key={m.id || idx} className="flex flex-row items-center justify-between px-1 py-1 text-xs">
                        <span className="text-gray-700 w-14 text-left">{m.type ? m.type.charAt(0).toUpperCase() + m.type.slice(1) : '-'}</span>
                        <span className="text-gray-600 flex-1 px-2 truncate text-left">{productoDetalle}</span>
                        <span className="font-semibold text-red-700 w-20 text-center">${m.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-gray-700 w-14 text-center">{methodLabel}</span>
                        <span className="text-gray-500 max-w-[80px] truncate text-left ml-2">{m.location || '-'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

CashMovilView.propTypes = {
  lugar: PropTypes.string,
  location: PropTypes.string,
};

export default CashMovilView;
