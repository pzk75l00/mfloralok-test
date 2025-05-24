import React from 'react';

const Navigation = ({ currentView, setCurrentView }) => {
  const views = [
    { id: 'plants', label: 'Plantas', icon: '🌱' },
    { id: 'movements', label: 'Caja', icon: '💼' },
    { id: 'stats', label: 'Estadísticas', icon: '📊' },
    { id: 'reportes', label: 'Reportes', icon: '📈' },
    { id: 'carga-movil', label: 'Carga Móvil', icon: '📲' } // NUEVO
  ];

  return (
    <nav className="bg-white shadow-sm rounded-lg overflow-hidden">
      <ul className="flex divide-x divide-gray-200">
        {views.map(view => (
          <li key={view.id} className="flex-1">
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