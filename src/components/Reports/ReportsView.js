// Punto de entrada para reportes: elige la vista según el dispositivo
import React, { useState, useEffect } from 'react';
import ReportsDesktopView from '../Desktop/reports/ReportsDesktopView';
// Unificar a la vista móvil real (no la versión placeholder en /reports)
import ReportsMovilView from '../Movil/ReportsMovilView';

const ReportsView = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile ? <ReportsMovilView /> : <ReportsDesktopView />;
};

export default ReportsView;
