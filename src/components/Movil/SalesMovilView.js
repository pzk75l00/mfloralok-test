import React from 'react';
import MovementsView from '../Base/MovementsView';

// Vista móvil para Ventas Diarias: formulario de ventas/compras del día y totales
const SalesMovilView = (props) => {
  // Aquí podrías filtrar y mostrar solo ventas/compras del día y los totales requeridos
  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      {/* Título principal se muestra desde MovementsView, no aquí para evitar duplicados */}
      <div className="bg-white rounded-lg shadow p-3">
        {/* Puedes personalizar MovementsView para mostrar solo ventas/compras del día y totales */}
        <MovementsView {...props} showOnlySalesOfDay={true} />
      </div>
    </div>
  );
};

export default SalesMovilView;
