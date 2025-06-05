import React, { useState } from 'react';
import MovementsView from '../Base/MovementsView';

// Vista móvil para Ventas Diarias: formulario de ventas/compras del día y totales
const SalesMovilView = (props) => {
  // Selector de mes y año
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const months = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];
  const handleMonthChange = (e) => setSelectedMonth(Number(e.target.value));
  const handleYearChange = (e) => setSelectedYear(Number(e.target.value));

  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      <div className="bg-white rounded-lg shadow p-3">
        {/* Selector de mes compacto */}
        <div className="flex justify-center gap-2 mb-2">
          <select value={selectedMonth} onChange={handleMonthChange} className="text-xs rounded border px-2 py-1">
            {months.map((m, idx) => (
              <option key={m} value={idx}>{m}</option>
            ))}
          </select>
          <select value={selectedYear} onChange={handleYearChange} className="text-xs rounded border px-2 py-1">
            {[selectedYear-1, selectedYear, selectedYear+1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        {/* MovementsView muestra ventas/compras del mes seleccionado */}
        <MovementsView {...props} showOnlySalesOfDay={true} selectedMonth={selectedMonth} selectedYear={selectedYear} />
      </div>
    </div>
  );
};

export default SalesMovilView;
