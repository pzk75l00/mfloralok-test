import React, { useState } from 'react';
import SalesMovilView from './SalesMovilView';
import CashMovilView from './CashMovilView';
import InventoryMovilView from './InventoryMovilView';
import ReportsMovilView from './ReportsMovilView';
import HomeMovilView from './HomeMovilView';
import logo from '../../assets/images/logo.png';

const NavigationMovil = () => {
  const [tab, setTab] = useState('home');

  // Maneja la navegación desde el dashboard principal
  const handleModuleClick = (key) => {
    switch (key) {
      case 'inventory': setTab('inventario'); break;
      case 'cash': setTab('caja'); break;
      case 'sales': setTab('ventas'); break;
      case 'reports': setTab('reportes'); break;
      default: setTab('home'); break;    
    }
  };  
  
  // Headers con título para las vistas secundarias (único sitio donde mostrar el título)
  const renderHeader = (title) => {
    if (!title) return null;
    
    return (
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur py-1.5 px-3 shadow-md flex justify-between items-center rounded-xl mx-2 mt-2 mb-3 border border-gray-100">
        <button 
          className="text-sm font-medium text-green-700 flex items-center bg-green-50 px-2 py-1 rounded-full border border-green-100" 
          onClick={() => setTab('home')}
        >
          ← Inicio
        </button>
        <h1 className="text-base font-bold text-gray-700">{title}</h1>
        <div className="w-16"></div> {/* Spacer para equilibrar el layout */}
      </div>
    );
  };
  
  // Estilos comunes para los botones activos e inactivos
  const getButtonStyles = (isActive, bgColor) => {
    return {
      active: `flex-1 flex flex-col items-center py-2 text-base font-semibold ${bgColor} text-white rounded-t-lg transition-all duration-200`,
      inactive: `flex-1 flex flex-col items-center py-2 text-base font-semibold bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-t-lg transition-all duration-200`
    };
  };
  
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="max-w-2xl mx-auto pt-2 pb-28 px-2">
        {tab === 'home' && <HomeMovilView onModuleClick={handleModuleClick} businessName="Mundo Floral" logoUrl={logo} />}
        
        {tab === 'ventas' && (
          <>
            {renderHeader('Movimientos de Caja')}
            <SalesMovilView />
          </>
        )}
        
        {tab === 'caja' && (
          <>
            {renderHeader('Caja Diaria')}
            <CashMovilView hideTitleInView={true}>
              {/* No necesitamos resumen adicional porque está en el header */}
            </CashMovilView>
          </>
        )}
        
        {tab === 'inventario' && (
          <>
            {renderHeader('Inventario')}
            <InventoryMovilView />
          </>
        )}
        
        {tab === 'reportes' && (
          <>
            {renderHeader('Reportes')}
            <ReportsMovilView />
          </>
        )}
      </div>
      
      {/* Barra de navegación con botones redondeados pero no demasiado flotantes */}
      {tab !== 'home' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white flex z-50 shadow-md border-t border-gray-100">
          {/* Botón Ventas */}
          <button 
            className={tab === 'ventas' 
              ? getButtonStyles(true, 'bg-blue-600').active
              : getButtonStyles(false).inactive
            }
            onClick={() => setTab('ventas')}
          >
            <span className="text-xl">🛒</span>
            <span className="text-xs mt-0.5">Ventas</span>
          </button>
          
          {/* Botón Caja */}
          <button 
            className={tab === 'caja' 
              ? getButtonStyles(true, 'bg-green-600').active
              : getButtonStyles(false).inactive
            }
            onClick={() => setTab('caja')}
          >
            <span className="text-xl">💰</span>
            <span className="text-xs mt-0.5">Caja</span>
          </button>
          
          {/* Botón Inventario */}
          <button 
            className={tab === 'inventario' 
              ? getButtonStyles(true, 'bg-yellow-600').active
              : getButtonStyles(false).inactive
            }
            onClick={() => setTab('inventario')}
          >
            <span className="text-xl">📦</span>
            <span className="text-xs mt-0.5">Inventario</span>
          </button>
          
          {/* Botón Reportes */}
          <button 
            className={tab === 'reportes' 
              ? getButtonStyles(true, 'bg-gray-800').active
              : getButtonStyles(false).inactive
            }
            onClick={() => setTab('reportes')}
          >
            <span className="text-xl">📊</span>
            <span className="text-xs mt-0.5">Reportes</span>
          </button>
          
          {/* Botón Inicio */}
          <button 
            className={getButtonStyles(false, '').inactive + ' bg-gray-200 hover:bg-gray-300'}
            onClick={() => setTab('home')}
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs mt-0.5">Inicio</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default NavigationMovil;
