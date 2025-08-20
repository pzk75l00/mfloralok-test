import React from 'react';
import MovementsReportTable from './MovementsReportTable';

const ReportsView = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reportes</h1>
      <p className="mb-4">Aquí podrás ver y exportar listados detallados de movimientos, ventas, compras, ingresos y egresos.</p>
      {/* Aquí irá la tabla de movimientos con filtros y exportación */}
      <div className="bg-white rounded shadow p-4">
        <MovementsReportTable />
      </div>
    </div>
  );
};

export default ReportsView;
