import React from 'react';
import InventoryView from './components/Inventory/InventoryView';
import CashView from './components/Cash/CashView';
import ReportsView from './components/Reports/ReportsView';
import NavigationMovil from './components/Movil/NavigationMovil';
import DesktopLayout from './components/DesktopLayout';

const App = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  const [currentView, setCurrentView] = React.useState('plants');
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (isMobile) return <NavigationMovil />;

  const renderView = () => {
    switch (currentView) {
      case 'plants':
        return <InventoryView />;
      case 'movements':
        return <CashView />;
      case 'reportes':
        return <ReportsView />;
      default:
        return <div className="text-center text-gray-500">Seleccione un módulo.</div>;
    }
  };

  return (
    <DesktopLayout currentView={currentView} setCurrentView={setCurrentView}>
      {renderView()}
    </DesktopLayout>
  );
};

export default App;