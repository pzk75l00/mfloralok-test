import React from 'react';
import PropTypes from 'prop-types';

// Importamos el logo desde assets
import logo from '../../assets/images/logo.png';
const LOGO_URL = logo; // Usamos la imagen importada como valor predeterminado

const modules = [
  {
    key: 'inventory',
    label: 'Inventario',
    icon: '📦',
    color: 'bg-green-100',
    onClick: null, // Se define desde el padre
  },
  {
    key: 'cash',
    label: 'Caja Diaria',
    icon: '💰',
    color: 'bg-yellow-100',
    onClick: null,
  },
  {
    key: 'sales',
    label: 'Ventas',
    icon: '🛒',
    color: 'bg-blue-100',
    onClick: null,
  },
  {
    key: 'reports',
    label: 'Reportes',
    icon: '📊',
    color: 'bg-purple-100',
    onClick: null,
  },
];

const HomeMovilView = ({ onModuleClick, businessName = 'Mundo Floral', logoUrl = LOGO_URL, modulesConfig }) => {
  // Permite personalizar los módulos desde props
  const displayModules = modulesConfig || modules;
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-24">      
      {/* Header con diseño redondeado pero menos flotante */}
      <header className="sticky top-0 z-20 bg-gradient-to-b from-green-50 to-white/95 backdrop-blur px-4 py-1.5 shadow-md flex items-center justify-between rounded-xl mx-2 mt-2">
        <div className="flex items-center">
          <div className="bg-white p-1 rounded-full border border-green-100">
            <img src={logoUrl} alt="Logo" className="h-9 w-9 object-contain" />
          </div>
          <span className="text-lg font-bold text-green-700 tracking-tight ml-2">{businessName}</span>
        </div>
        <p className="text-sm text-gray-600 bg-white/80 px-3 py-0.5 rounded-full border border-green-50">Sistema de Gestión</p>
      </header>
      
      {/* Espaciado normal */}
      <div className="h-3"></div>
      
      {/* Botones de módulos con bordes redondeados pero no demasiado flotantes */}
      <div className="grid grid-cols-2 gap-4 px-4 mt-2">
        {displayModules.map((mod) => (
          <button
            key={mod.key}
            className={`flex flex-col items-center justify-center rounded-xl shadow-md border border-gray-100 p-5 ${mod.color} hover:scale-102 transition-transform active:scale-98`}
            onClick={() => onModuleClick && onModuleClick(mod.key)}
          >
            <span className="text-3xl mb-2">{mod.icon}</span>
            <span className="text-base font-medium text-gray-700">{mod.label}</span>
          </button>
        ))}
      </div>
      {/* Footer con diseño redondeado pero menos flotante */}
      <footer className="fixed bottom-0 left-0 right-0 mx-2 mb-1 text-center text-xs text-gray-400 py-2 bg-white/80 backdrop-blur border-t border-gray-100 rounded-t-xl shadow-md">
        © {new Date().getFullYear()} {businessName}
      </footer>
    </div>
  );
};

HomeMovilView.propTypes = {
  onModuleClick: PropTypes.func,
  businessName: PropTypes.string,
  logoUrl: PropTypes.string,
  modulesConfig: PropTypes.array,
};

export default HomeMovilView;
