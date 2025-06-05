import React, { createContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getUserData } from './firebase/UserService';
import InventoryView from './components/Inventory/InventoryView';
import CashView from './components/Cash/CashView';
import ReportsView from './components/Reports/ReportsView';
import NavigationMovil from './components/Movil/NavigationMovil';
import DesktopLayout from './components/DesktopLayout';
import UserRegisterForm from './components/UserRegisterForm';
import AdminPanel from './components/AdminPanel';
import LoginForm from './components/LoginForm';

// Contexto global de usuario
export const UserContext = createContext(null);

const App = () => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = React.useState('plants');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.uid);
        setUserData(data);
      } else {
        setUserData(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (loading) return <div>Cargando...</div>;
  if (!user) return <LoginForm />;
  if (isMobile) return <NavigationMovil />;

  const renderView = () => {
    switch (currentView) {
      case 'plants':
        return <InventoryView />;
      case 'movements':
      case 'caja':
        return <CashView />;
      case 'reportes':
        return <ReportsView />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <div className="text-center text-gray-500">Seleccione un módulo.</div>;
    }
  };

  return (
    <>
      <UserContext.Provider value={{ user, userData }}>
        <DesktopLayout currentView={currentView === 'movements' ? 'caja' : currentView} setCurrentView={setCurrentView}>
          {renderView()}
        </DesktopLayout>
      </UserContext.Provider>
    </>
  );
};

export default App;