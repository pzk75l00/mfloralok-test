import React, { useState, useEffect } from 'react';
import MovementsView from '../Base/MovementsView';
import CashMovilView from '../Movil/CashMovilView';

// Caja y movimientos (usa el formulario avanzado y la tabla de movimientos)
const CashView = (props) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (isMobile) return <CashMovilView {...props} />;
  return (
    <div className="max-w-4xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4 text-blue-800">Caja y Movimientos</h2>
      <MovementsView {...props} />
    </div>
  );
};

export default CashView;
