import React from 'react';
import InventoryView from './components/Inventory/InventoryView';
import CashView from './components/Cash/CashView';
import ReportsView from './components/Reports/ReportsView';
import LoadPlantsToFirestore from './components/Base/LoadPlantsToFirestore';
import NavigationMovil from './components/Movil/NavigationMovil';

const App = () => {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (isMobile) return <NavigationMovil />;

  const [currentView, setCurrentView] = React.useState('inventory');

  const renderView = () => {
    switch (currentView) {
      case 'inventory':
        return <InventoryView />;
      case 'cash':
        return <CashView />;
      case 'reports':
        return <ReportsView />;
      default:
        return <div className="text-center text-gray-500">Seleccione un módulo.</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold text-green-700">Mundo Floral (mfloralok)</h1>
          <p className="text-gray-600">Sistema de gestión para tu vivero digital</p>
          <p className="text-xs text-gray-400 mt-2">© {new Date().getFullYear()} Mundo Floral. Todos los derechos reservados.</p>
        </header>
        <nav className="flex justify-center gap-4 my-4">
          <button className={`px-3 py-1 rounded ${currentView==='inventory'?'bg-green-200':'bg-gray-200'}`} onClick={()=>setCurrentView('inventory')}>Inventario</button>
          <button className={`px-3 py-1 rounded ${currentView==='cash'?'bg-green-200':'bg-gray-200'}`} onClick={()=>setCurrentView('cash')}>Caja</button>
          <button className={`px-3 py-1 rounded ${currentView==='reports'?'bg-green-200':'bg-gray-200'}`} onClick={()=>setCurrentView('reports')}>Reportes</button>
        </nav>
        <main className="bg-white rounded-xl shadow-sm p-6">
          <div className="mb-4">
            <LoadPlantsToFirestore />
          </div>
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;