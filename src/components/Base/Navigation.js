import React from 'react';

const Navigation = ({ currentView, setCurrentView }) => {
  const views = [
    { id: 'plants', label: 'Productos', icon: '📦' },
    { id: 'movements', label: 'Caja', icon: '💼' },
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
    { id: 'reportes', label: 'Reportes', icon: '📈' },
    { id: 'carga-movil', label: 'Carga Móvil', icon: '📲', mobileOnly: true } // NUEVO, solo móvil
  ];

  // Detectar si es móvil
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <nav className="flex flex-wrap gap-2 justify-center mb-6">
      <button
        className={`px-4 py-2 rounded-md font-semibold ${currentView === 'plants' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        onClick={() => setCurrentView('plants')}
      >
        Productos
      </button>
      <button
        className={`px-4 py-2 rounded-md font-semibold ${currentView === 'movements' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        onClick={() => setCurrentView('movements')}
      >
        Caja
      </button>
      <button
        className={`px-4 py-2 rounded-md font-semibold ${currentView === 'stats' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        onClick={() => setCurrentView('stats')}
      >
        Estadísticas
      </button>
      {isMobile && (
        <button
          className={`px-4 py-2 rounded-md font-semibold ${currentView === 'carga-movil' ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setCurrentView('carga-movil')}
        >
          Carga Móvil
        </button>
      )}
    </nav>
  );
};

export default Navigation;