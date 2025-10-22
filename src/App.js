import React, { createContext, useState, useEffect } from 'react';
import { AuthProvider } from './auth/AuthProvider';
import AuthGate from './auth/AuthGate';
import InventoryView from './components/Inventory/InventoryView';
import CashView from './components/Cash/CashView';
import ReportsView from './components/Reports/ReportsView';
import StatisticsView from './components/Desktop/statistics/StatisticsView';
import NavigationMovil from './components/Movil/NavigationMovil';
import DesktopLayout from './components/DesktopLayout';
import { initializeDefaultPaymentMethods } from './utils/paymentMethodsInit';
import BiometricSetup from './components/Auth/BiometricSetup';

// Crear y exportar UserContext
export const UserContext = createContext({ user: null, userData: null });

const App = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = useState('plants');
  // Estado de usuario global (ajustar según lógica real de autenticación)
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inicializar métodos de pago por defecto
  useEffect(() => {
    const initPaymentMethods = async () => {
      try {
        await initializeDefaultPaymentMethods();
      } catch (error) {
        console.error('Error inicializando métodos de pago:', error);
      }
    };
    
    initPaymentMethods();
  }, []);

  // Aquí debería ir la lógica real de autenticación y carga de user/userData
  // Por ahora, se deja como null para evitar errores de los consumidores

  if (isMobile) return <NavigationMovil />;

  const renderView = () => {
    switch (currentView) {
      case 'plants':
        return <InventoryView />;
      case 'movements':
      case 'caja':
        return <CashView />;
      case 'stats':
        return <StatisticsView />;
      case 'reportes':
        return <ReportsView />;
      default:
        return <div className="text-center text-gray-500">Seleccione un módulo.</div>;
    }
  };

  return (
    <AuthProvider enforceDesktopBinding={true}>
      <UserContext.Provider value={{ user, userData }}>
        <AuthGate>
          {/* Banner para habilitar huella en este dispositivo */}
          <BiometricSetup />
          <DesktopLayout currentView={currentView === 'movements' ? 'caja' : currentView} setCurrentView={setCurrentView}>
            {renderView()}
          </DesktopLayout>
        </AuthGate>
      </UserContext.Provider>
    </AuthProvider>
  );
};

export default App;