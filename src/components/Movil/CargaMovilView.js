import React, { useState } from 'react';
import MovementsView from '../Base/MovementsView';
import PlantsView from '../Base/PlantsView';

// Este componente se encuentra en la carpeta Movil
const CargaMovilView = ({ plants, onQuickAddStock, onQuickSale, onQuickMovement, onAddPlant, onUpdatePlant, onDeletePlant }) => {
  const [modo, setModo] = useState('caja'); // 'caja' o 'planta'

  // Envolver la vista en un div que oculte el menú superior en móvil
  return (
    <div className="relative">
      <style>{`
        @media (max-width: 767px) {
          nav, header { display: none !important; }
        }
      `}</style>
      {modo === 'caja' ? (
        <div className="p-0">
          <div className="pb-28"> {/* Espacio inferior para los botones fijos */}
            <MovementsView plants={plants} />
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-50">
            <button className={`flex-1 py-4 text-lg font-bold ${modo==='caja' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('caja')}>Carga de Caja</button>
            <button className={`flex-1 py-4 text-lg font-bold ${modo==='planta' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('planta')}>Carga de Plantas</button>
          </div>
        </div>
      ) : (
        <div className="p-0">
          <div className="pb-28"> {/* Espacio inferior para los botones fijos */}
            <PlantsView plants={plants} onAddPlant={onAddPlant} onUpdatePlant={onUpdatePlant} onDeletePlant={onDeletePlant} />
          </div>
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex z-50">
            <button className={`flex-1 py-4 text-lg font-bold ${modo==='caja' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('caja')}>Carga de Caja</button>
            <button className={`flex-1 py-4 text-lg font-bold ${modo==='planta' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setModo('planta')}>Carga de Plantas</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CargaMovilView;
