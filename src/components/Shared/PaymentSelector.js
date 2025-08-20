import React, { useState } from 'react';
import PropTypes from 'prop-types';
import MixedPaymentModal from './MixedPaymentModal';
import PaymentMethodsManager from './PaymentMethodsManager';
import { generatePaymentSummary, isMixedPayment } from '../../utils/mixedPaymentUtils';

// Componente simplificado que abre modales para gestionar pagos
const PaymentSelector = ({ 
  total, 
  paymentMethods, 
  onChange, 
  disabled = false,
  showManageButton = true 
}) => {
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);

  const totalPaid = Object.values(paymentMethods).reduce((sum, amount) => sum + amount, 0);
  const isConfigured = totalPaid > 0;
  const paymentSummary = generatePaymentSummary(paymentMethods);
  const isMixed = isMixedPayment(paymentMethods);

  const handleOpenPaymentModal = () => {
    if (disabled) return;
    setIsPaymentModalOpen(true);
  };

  const handlePaymentChange = (newPaymentMethods) => {
    onChange(newPaymentMethods);
  };

  return (
    <>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Método de pago
          </label>
          {showManageButton && (
            <button
              type="button"
              onClick={() => setIsManageModalOpen(true)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              ⚙️ Gestionar métodos
            </button>
          )}
        </div>

        {/* Botón principal para configurar pago */}
        <button
          type="button"
          onClick={handleOpenPaymentModal}
          disabled={disabled || total <= 0}
          className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
            disabled 
              ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
              : isConfigured
                ? 'border-green-500 bg-green-50 hover:bg-green-100'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {isConfigured ? (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600">
                      {isMixed ? '💰📱' : '💰'}
                    </span>
                    <span className="font-medium text-green-800">
                      {isMixed ? 'Pago Combinado' : 'Pago Configurado'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {paymentSummary}
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    Total: ${totalPaid.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-gray-400">💰</span>
                    <span className="font-medium text-gray-600">
                      Configurar método de pago
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Haga clic para seleccionar cómo pagará
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Total: ${total.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </button>

        {/* Indicadores de estado */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className={isConfigured ? 'text-green-600' : ''}>
              {isConfigured ? '✅ Configurado' : '⚪ Sin configurar'}
            </span>
            {isMixed && (
              <span className="text-blue-600">
                🔄 Múltiples métodos
              </span>
            )}
          </div>
          
          {total > 0 && (
            <span className="text-gray-400">
              Monto: ${total.toFixed(2)}
            </span>
          )}
        </div>
      </div>

      {/* Modal de configuración de pagos */}
      <MixedPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        total={total}
        paymentMethods={paymentMethods}
        onChange={handlePaymentChange}
        title="Configurar Pago"
      />

      {/* Modal de gestión de métodos de pago */}
      <PaymentMethodsManager
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
      />
    </>
  );
};

PaymentSelector.propTypes = {
  total: PropTypes.number.isRequired,
  paymentMethods: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  showManageButton: PropTypes.bool
};

export default PaymentSelector;
