import React from 'react';

const Navigation = ({ currentView, setCurrentView }) => {
  const views = [
    { id: 'plants', label: 'Plantas', icon: '🌱' },
    { id: 'movements', label: 'Caja', icon: '💼' },
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
    { id: 'reportes', label: 'Reportes', icon: '📈' },
    { id: 'carga-movil', label: 'Carga Móvil', icon: '📲', mobileOnly: true } // NUEVO, solo móvil
  ];

  // Detectar si es móvil
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <nav className="bg-white shadow-sm rounded-lg overflow-hidden">
      <ul className="flex divide-x divide-gray-200 overflow-x-auto">
        {views
          .filter(view => isMobile ? (view.mobileOnly || view.id === 'carga-movil' || view.id === 'plants' || view.id === 'movements') : view.id !== 'carga-movil' || view.mobileOnly)
          .map(view => (
            <li key={view.id} className="flex-1 min-w-[80px]">
              <button
                onClick={() => setCurrentView(view.id)}
                className={`w-full py-3 px-4 text-center font-medium ${currentView === view.id ? 'bg-green-50 text-green-600' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                <span className="block text-lg">{view.icon}</span>
                <span>{view.label}</span>
              </button>
            </li>
          ))}
      </ul>
    </nav>
  );
};

export default Navigation;