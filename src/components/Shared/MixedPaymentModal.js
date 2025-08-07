import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../firebase/firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';

// Modal para configurar pagos combinados de manera más amigable
const MixedPaymentModal = ({ 
  isOpen, 
  onClose, 
  total, 
  paymentMethods, 
  onChange, 
  title = "Configurar Pago" 
}) => {
  const [localPayments, setLocalPayments] = useState({
    efectivo: 0,
    mercadoPago: 0,
    transferencia: 0,
    tarjeta: 0
  });
  const [availableMethods, setAvailableMethods] = useState([]);
  const [activeTab, setActiveTab] = useState('simple');

  // Cargar métodos de pago disponibles desde Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'paymentMethods'), (snapshot) => {
      const methods = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(method => method.isActive)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setAvailableMethods(methods);
    });

    return () => unsubscribe();
  }, []);

  // Inicializar pagos locales cuando se abre el modal
  useEffect(() => {
    if (isOpen && paymentMethods) {
      setLocalPayments({ ...paymentMethods });
      
      // Determinar si es pago simple o mixto
      const activeMethods = Object.values(paymentMethods).filter(amount => amount > 0);
      setActiveTab(activeMethods.length > 1 ? 'mixto' : 'simple');
    }
  }, [isOpen, paymentMethods]);

  // Métodos de pago por defecto si no hay en Firebase
  const defaultMethods = [
    { code: 'efectivo', name: 'Efectivo', icon: '💰', color: 'text-green-600' },
    { code: 'mercadoPago', name: 'Mercado Pago', icon: '📱', color: 'text-blue-600' },
    { code: 'transferencia', name: 'Transferencia', icon: '🏦', color: 'text-purple-600' },
    { code: 'tarjeta', name: 'Tarjeta', icon: '💳', color: 'text-orange-600' }
  ];

  const methods = availableMethods.length > 0 ? availableMethods : defaultMethods;

  const totalPaid = Object.values(localPayments).reduce((sum, amount) => sum + amount, 0);
  const remaining = total - totalPaid;
  const isValid = Math.abs(remaining) < 0.01 && totalPaid > 0;

  const handleAmountChange = (method, value) => {
    const amount = parseFloat(value) || 0;
    const clampedAmount = Math.min(Math.max(0, amount), total);
    
    setLocalPayments(prev => ({
      ...prev,
      [method]: clampedAmount
    }));
  };

  const handleQuickFill = (method) => {
    const newPayments = {
      efectivo: 0,
      mercadoPago: 0,
      transferencia: 0,
      tarjeta: 0
    };
    newPayments[method] = total;
    setLocalPayments(newPayments);
    setActiveTab('simple');
  };

  const handleAutoDistribute = () => {
    const activeMethods = methods.filter(m => localPayments[m.code] > 0);
    if (activeMethods.length === 0) return;

    const amountPerMethod = total / activeMethods.length;
    const newPayments = { ...localPayments };
    
    activeMethods.forEach(method => {
      newPayments[method.code] = amountPerMethod;
    });
    
    setLocalPayments(newPayments);
  };

  const handleSave = () => {
    if (!isValid) {
      alert('El total de pagos debe ser igual al monto de la venta');
      return;
    }
    
    onChange(localPayments);
    onClose();
  };

  const handleCancel = () => {
    setLocalPayments(paymentMethods);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            💰 {title}
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Total de la venta */}
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-gray-800">
              Total: ${total.toFixed(2)}
            </div>
            <div className={`text-sm ${isValid ? 'text-green-600' : 'text-orange-600'}`}>
              {isValid ? '✅ Pago completo' : `⚠️ ${remaining > 0 ? `Falta: $${remaining.toFixed(2)}` : `Excede: $${Math.abs(remaining).toFixed(2)}`}`}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setActiveTab('simple')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'simple' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pago Simple
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mixto')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'mixto' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Pago Mixto
            </button>
          </div>

          {activeTab === 'simple' ? (
            /* Modo Simple */
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Seleccione un método de pago:
              </p>
              
              {methods.map(method => (
                <button
                  type="button"
                  key={method.code}
                  onClick={() => handleQuickFill(method.code)}
                  className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                    localPayments[method.code] === total
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className={`flex items-center gap-3 ${method.color}`}>
                    <span className="text-2xl">{method.icon}</span>
                    <div>
                      <div className="font-semibold">{method.name}</div>
                      <div className="text-sm text-gray-500">
                        ${total.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Modo Mixto */
            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <p className="text-sm text-gray-600">
                  Distribuya el pago entre métodos:
                </p>
                <button
                  onClick={handleAutoDistribute}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  Auto-dividir
                </button>
              </div>

              {methods.map(method => (
                <div key={method.code} className="space-y-2">
                  <div className={`flex items-center gap-2 ${method.color}`}>
                    <span className="text-lg">{method.icon}</span>
                    <span className="font-medium">{method.name}</span>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      max={total}
                      step="0.01"
                      value={localPayments[method.code] || ''}
                      onChange={(e) => handleAmountChange(method.code, e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 border rounded-md text-right font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => handleAmountChange(method.code, remaining + localPayments[method.code])}
                      disabled={remaining <= 0}
                      className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
                    >
                      Resto
                    </button>
                  </div>
                </div>
              ))}

              {/* Botones rápidos para cantidades comunes */}
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-gray-500 mb-2">Cantidades rápidas:</p>
                <div className="flex gap-2 flex-wrap">
                  {[100, 200, 500, 1000, 2000, 5000].filter(amount => amount <= total).map(amount => (
                    <button
                      type="button"
                      key={amount}
                      onClick={() => {
                        const method = Object.keys(localPayments)[0];
                        handleAmountChange(method, amount);
                      }}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Resumen de pago */}
          <div className={`mt-6 p-4 rounded-lg ${
            isValid ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
          }`}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total a pagar:</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total pagado:</span>
                <span className="font-bold">${totalPaid.toFixed(2)}</span>
              </div>
              {Math.abs(remaining) > 0.01 && (
                <div className={`flex justify-between text-sm font-medium ${
                  remaining > 0 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  <span>{remaining > 0 ? 'Falta:' : 'Excede:'}</span>
                  <span>${Math.abs(remaining).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t bg-gray-50">
          <button
            type="button"
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );
};

MixedPaymentModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  total: PropTypes.number.isRequired,
  paymentMethods: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  title: PropTypes.string
};

export default MixedPaymentModal;
