import React, { useState } from 'react';
import MovementsView from '../Base/MovementsView';

// Vista móvil para Movimientos: lista de movimientos del día
const MovementsMovilView = (props) => {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      <h2 className="text-lg font-bold mb-4 text-center">Movimientos del Día</h2>
      <div className="bg-white rounded-lg shadow p-3">
        <MovementsView {...props} hideForm={true} />
      </div>
    </div>
  );
};

export default MovementsMovilView;
