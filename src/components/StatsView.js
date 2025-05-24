import React from 'react';
import StatsCard from './StatsCard';

const StatsView = ({ plants, sales, purchases }) => {
  // Ventas
  const totalCashSales = sales.filter(s => s.paymentMethod === 'efectivo')
    .reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
  const totalMPSales = sales.filter(s => s.paymentMethod === 'mercadoPago')
    .reduce((sum, s) => sum + (s.salePrice * s.quantity), 0);
  // Compras
  const totalCashPurchases = purchases.filter(p => p.paymentMethod === 'efectivo')
    .reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);
  const totalMPPurchases = purchases.filter(p => p.paymentMethod === 'mercadoPago')
    .reduce((sum, p) => sum + (p.purchasePrice * p.quantity), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Estadísticas</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Ventas Efectivo"
          value={`$${totalCashSales.toFixed(2)}`}
          icon="💵"
          color="green"
        />
        <StatsCard
          title="Ventas MP"
          value={`$${totalMPSales.toFixed(2)}`}
          icon="📱"
          color="purple"
        />
        <StatsCard
          title="Compras Efectivo"
          value={`$${totalCashPurchases.toFixed(2)}`}
          icon="💵"
          color="green"
        />
        <StatsCard
          title="Compras MP"
          value={`$${totalMPPurchases.toFixed(2)}`}
          icon="📱"
          color="purple"
        />
      </div>
    </div>
  );
};

export default StatsView;
// DONE