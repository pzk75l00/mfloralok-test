import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
// import MovementsView from '../Base/MovementsView'; // Solo para el formulario y totales
import MovementsView from '../Base/MovementsView';
import PropTypes from 'prop-types';

// Vista móvil para Caja: muestra totales del día y formulario
const CashMovilView = (props) => {
  // --- BLOQUE SUTIL DE COMPRAS/EGRESOS DEL DÍA ---
  const [comprasEgresosHoy, setComprasEgresosHoy] = useState([]);
  useEffect(() => {
    // Suscribirse a movimientos y filtrar compras/egresos del día
    const unsubscribe = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const movimientos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const comprasEgresos = movimientos.filter(m => {
        if (!m.date) return false;
        const d = new Date(m.date);
        if (isNaN(d.getTime())) return false;
        return (m.type === 'compra' || m.type === 'egreso') &&
          d.getDate() === currentDay &&
          d.getMonth() === currentMonth &&
          d.getFullYear() === currentYear;
      });
      setComprasEgresosHoy(comprasEgresos);
    });
    return () => unsubscribe();
  }, []);

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
        {/* El título principal ahora está en el header de NavigationMovil */}
        <MovementsView
          {...props}
          showOnlyForm={true}
          renderTotals={(tot) => (
            <>
              <div className="mt-6 w-full max-w-xl mx-auto flex flex-wrap gap-2 sm:gap-4 justify-center">
                <div className="flex-1 min-w-[110px] bg-green-100 rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border border-green-300">
                  <span className="text-gray-500 text-xs sm:text-sm">Efectivo</span>
                  <span className="text-lg sm:text-2xl font-bold text-green-700 truncate">
                    ${tot.cajaFisicaDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex-1 min-w-[110px] bg-blue-100 rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border border-blue-300">
                  <span className="text-gray-500 text-xs sm:text-sm">Mercado Pago</span>
                  <span className="text-lg sm:text-2xl font-bold text-blue-700 truncate">
                    ${tot.cajaMPDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex-1 min-w-[110px] bg-yellow-100 rounded-lg shadow p-2 sm:p-4 flex flex-col items-center border border-yellow-300">
                  <span className="text-gray-500 text-xs sm:text-sm">Total</span>
                  <span className="text-lg sm:text-2xl font-bold text-yellow-700 truncate">
                    ${tot.totalGeneralDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
              <div className="mt-4 w-full max-w-xl mx-auto flex flex-row gap-4 justify-center">
                <div className="flex-1 bg-purple-100 rounded-lg shadow p-4 flex flex-col items-center border border-purple-300">
                  <span className="text-gray-500 text-sm">Artículos vendidos hoy</span>
                  <span className="text-2xl font-bold text-purple-700">
                    {tot.cantidadProductosVendidosDia}
                  </span>
                </div>
              </div>
            </>
          )}
        />
        {/* Bloque sutil de compras y egresos del día, directo, sin MovementsView */}
        <div className="mt-8 w-full max-w-xl mx-auto">
          {comprasEgresosHoy.length > 0 && (
            <div className="rounded-lg bg-red-50 border border-red-200 shadow-sm p-2 mt-2">
              <div className="text-xs font-semibold text-red-700 mb-2 text-center">Compras y egresos de hoy</div>
              <ul className="divide-y divide-red-100">
                <li className="flex flex-row items-center justify-between px-1 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded mb-1">
                  <span className="w-14 text-left">Fecha</span>
                  <span className="w-20 text-center">Total</span>
                  <span className="w-14 text-center">Método</span>
                  <span className="flex-1 px-2 text-left">Lugar</span>
                  <span className="max-w-[80px] text-left">Nota</span>
                </li>
                {comprasEgresosHoy.map((m, idx) => (
                  <li key={m.id || idx} className="flex flex-row items-center justify-between px-1 py-1 text-xs">
                    <span className="text-gray-700 w-14 text-left">{new Date(m.date).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="font-semibold text-red-700 w-20 text-center">${m.total?.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                    <span className="text-gray-700 w-14 text-center">{m.paymentMethod === 'efectivo' ? 'Efectivo' : m.paymentMethod === 'mercadoPago' ? 'MP' : '-'}</span>
                    <span className="text-gray-600 flex-1 px-2 truncate text-left">{m.location || '-'}</span>
                    <span className="text-gray-500 max-w-[80px] truncate text-left ml-2">{m.notes || '-'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

CashMovilView.propTypes = {
  lugar: PropTypes.string,
  location: PropTypes.string,
};

export default CashMovilView;
