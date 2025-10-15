// Vista de reportes para escritorio
import React from 'react';
import MovementsReportTable from './MovementsReportTable';

const ReportsDesktopView = () => {
  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-6">Reportes y Exportación</h1>
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Tabla de Movimientos</h2>
          <p className="text-gray-600 text-sm mb-4">
            Visualiza, filtra y exporta todos los movimientos de tu negocio. 
            Incluye ventas, compras, ingresos, egresos y gastos con opciones de exportación a Excel, CSV y PDF.
          </p>
        </div>
        <MovementsReportTable />
      </div>
    </div>
  );
};

export default ReportsDesktopView;
