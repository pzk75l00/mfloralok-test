// Vista de reportes para escritorio (puedes personalizar según necesidades)
import React from 'react';
import MovementsReportTable from './MovementsReportTable';

const ReportsDesktopView = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Reportes - Escritorio</h1>
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <MovementsReportTable />
      </div>
      {/* Aquí puedes agregar más reportes, gráficos o visualizaciones */}
    </div>
  );
};

export default ReportsDesktopView;
