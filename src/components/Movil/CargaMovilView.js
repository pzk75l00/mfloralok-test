import React, { useState } from 'react';
import MovementsView from '../Base/MovementsView';
import PlantsView from '../Base/PlantsView';

// Este componente se encuentra en la carpeta Movil
const CargaMovilView = ({ plants, onQuickAddStock, onQuickSale, onQuickMovement, onAddPlant, onUpdatePlant, onDeletePlant }) => {
  const [modo, setModo] = useState('caja'); // 'caja', 'planta', 'movimientos'

  return (
    <div className="relative min-h-screen bg-gray-50">
      <style>{`
        @media (max-width: 767px) {
          nav, header { display: none !important; }
        }
      `}</style>
      <div className="max-w-2xl mx-auto pt-2 pb-28 px-2">
        {modo === 'caja' && (
          <div className="rounded-lg shadow bg-white p-3">
            <h2 className="text-2xl font-black text-green-700 flex items-center gap-2 mb-2">
              <span role="img" aria-label="caja">💰</span> Caja
            </h2>
            <MovementsView plants={plants} showOnlyForm={true} />
          </div>
        )}
        {modo === 'planta' && (
          <div className="rounded-lg shadow bg-white p-3">
            <h2 className="text-xl font-bold text-green-700 mb-2 text-center">Carga de Plantas</h2>
            <PlantsView plants={plants} onAddPlant={onAddPlant} onUpdatePlant={onUpdatePlant} onDeletePlant={onDeletePlant} />
          </div>
        )}
        {modo === 'movimientos' && (
          <div className="rounded-lg shadow bg-white p-3">
            <h2 className="text-xl font-bold text-purple-700 mb-2 text-center">Movimientos del Mes</h2>
            <MovementsView plants={plants} hideForm={true} />
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-50 shadow-lg">
        <button className={`flex-1 py-4 text-lg font-bold transition-colors duration-200 ${modo==='caja' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('caja')}>Caja</button>
        <button className={`flex-1 py-4 text-lg font-bold transition-colors duration-200 ${modo==='planta' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('planta')}>Plantas</button>
        <button className={`flex-1 py-4 text-lg font-bold transition-colors duration-200 ${modo==='movimientos' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('movimientos')}>Movimientos</button>
      </div>
    </div>
  );
};

export default CargaMovilView;
