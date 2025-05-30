import React, { useState } from 'react';
import Navigation from './Navigation';
import logo from '../assets/images/logo.png';
import PropTypes from 'prop-types';

const socialLinks = [
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75h9A3.75 3.75 0 0120.25 7.5v9a3.75 3.75 0 01-3.75 3.75h-9A3.75 3.75 0 013.75 16.5v-9A3.75 3.75 0 017.5 3.75zm0 0V3m9 0v.75m-9 0h9m-9 0A3.75 3.75 0 003.75 7.5v9A3.75 3.75 0 007.5 20.25h9A3.75 3.75 0 0020.25 16.5v-9A3.75 3.75 0 0016.5 3.75h-9z" />
        <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    name: 'WhatsApp',
    url: 'https://wa.me/',
    icon: (
      <svg fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 13.487a6.5 6.5 0 10-2.375 2.375l2.122.53a.75.75 0 00.91-.91l-.53-2.122z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75h.008v.008H9.75V9.75zm4.5 0h.008v.008h-.008V9.75zm-2.25 2.25h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  // Puedes agregar más redes aquí
];

const DesktopLayout = ({ currentView, setCurrentView, children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="w-full bg-white shadow flex items-center justify-between px-6 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 w-10 rounded-full shadow" />
          <span className="text-2xl font-bold text-green-700 tracking-tight">Mundo Floral</span>
        </div>
        <div className="flex items-center gap-3">
          {socialLinks.map(link => (
            <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" title={link.name} className="text-gray-500 hover:text-green-600 transition">
              {link.icon}
            </a>
          ))}
          {/* Botón para agregar más redes */}
          <button className="ml-2 text-gray-400 hover:text-green-600" title="Agregar red social">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className={`transition-all duration-300 bg-white shadow-lg flex flex-col ${sidebarOpen ? 'w-56' : 'w-16'} h-screen sticky top-0 min-h-0 z-20`}>
          <button
            className="p-2 m-2 rounded hover:bg-green-100 text-green-700 self-end"
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? 'M6 18L18 12L6 6' : 'M6 6l12 6-12 6'} />
            </svg>
          </button>
          <Navigation currentView={currentView} setCurrentView={setCurrentView} sidebarMode={!sidebarOpen ? 'compact' : 'full'} />
        </aside>
        {/* Main content */}
        <main className="flex-1 p-6 overflow-y-auto min-h-0">
          {children}
        </main>
      </div>
      {/* Footer */}
      <footer className="w-full bg-white text-center text-xs text-gray-400 py-2 border-t mt-2">
        © {new Date().getFullYear()} Mundo Floral. Todos los derechos reservados.
      </footer>
    </div>
  );
};

DesktopLayout.propTypes = {
  currentView: PropTypes.string.isRequired,
  setCurrentView: PropTypes.func.isRequired,
  children: PropTypes.node
};

export default DesktopLayout;
