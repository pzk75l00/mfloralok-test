import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

// Configuración de métodos de pago
const PAYMENT_METHODS = {
  efectivo: { 
    label: 'Efectivo', 
    icon: '💰', 
    color: 'text-green-600' 
  },
  mercadoPago: { 
    label: 'Mercado Pago', 
    icon: '📱', 
    color: 'text-blue-600' 
  },
  transferencia: { 
    label: 'Transferencia', 
    icon: '🏦', 
    color: 'text-purple-600' 
  },
  tarjeta: { 
    label: 'Tarjeta', 
    icon: '💳', 
    color: 'text-orange-600' 
  }
};

// Componente individual para cada método de pago
const PaymentMethodRow = ({ method, amount, maxAmount, onChange, disabled, isMobile }) => {
  const config = PAYMENT_METHODS[method];
  const [inputValue, setInputValue] = useState(amount.toString());

  useEffect(() => {
    setInputValue(amount.toString());
  }, [amount]);

  const handleInputChange = (e) => {
    let value = e.target.value;
    
    // Permitir números y un punto decimal
    if (!/^\d*\.?\d*$/.test(value)) return;
    
    setInputValue(value);
    
    // Convertir a número y validar
    const numValue = parseFloat(value) || 0;
    const clampedValue = Math.min(Math.max(0, numValue), maxAmount);
    
    onChange(clampedValue);
  };

  const handleInputBlur = () => {
    // Asegurar que el input muestre el valor correcto al perder el foco
    setInputValue(amount.toString());
  };

  const isActive = amount > 0;

  if (isMobile) {
    return (
      <div className={`p-3 border rounded-lg ${isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => onChange(e.target.checked ? maxAmount : 0)}
              disabled={disabled}
              className="rounded"
            />
            <span className={config.color}>
              {config.icon} {config.label}
            </span>
          </label>
        </div>
        {isActive && (
          <input
            type="text"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            disabled={disabled}
            placeholder="0"
            className="w-full px-3 py-2 border rounded-md text-right text-lg font-mono disabled:opacity-50"
          />
        )}
      </div>
    );
  }

  // Vista de escritorio
  return (
    <div className={`flex items-center gap-3 p-2 rounded ${isActive ? 'bg-blue-50' : ''}`}>
      <label className="flex items-center gap-2 min-w-[140px]">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => onChange(e.target.checked ? maxAmount : 0)}
          disabled={disabled}
          className="rounded"
        />
        <span className={`${config.color} font-medium`}>
          {config.icon} {config.label}
        </span>
      </label>
      <input
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        disabled={disabled || !isActive}
        placeholder="0"
        className="px-3 py-1 border rounded text-right font-mono w-24 disabled:opacity-50"
      />
    </div>
  );
};

// Componente principal
const MixedPaymentSelector = ({ 
  total, 
  paymentMethods, 
  onChange, 
  disabled = false,
  isMobile = false,
  showSimpleMode = true 
}) => {
  const [isSimpleMode, setIsSimpleMode] = useState(true);
  const [payments, setPayments] = useState({
    efectivo: 0,
    mercadoPago: 0,
    transferencia: 0,
    tarjeta: 0,
    ...paymentMethods
  });

  useEffect(() => {
    setPayments({
      efectivo: 0,
      mercadoPago: 0,
      transferencia: 0,
      tarjeta: 0,
      ...paymentMethods
    });

    // Detectar si es pago simple o mixto
    const activeMethods = Object.values(paymentMethods).filter(amount => amount > 0);
    setIsSimpleMode(activeMethods.length <= 1);
  }, [paymentMethods]);

  const totalPaid = Object.values(payments).reduce((sum, amount) => sum + amount, 0);
  const remaining = total - totalPaid;
  const isValid = remaining === 0 && totalPaid > 0;
  const hasPayments = totalPaid > 0;

  const handlePaymentChange = (method, amount) => {
    const newPayments = { ...payments, [method]: amount };
    
    // Auto-ajustar si se excede el total
    const newTotal = Object.values(newPayments).reduce((sum, val) => sum + val, 0);
    if (newTotal > total) {
      newPayments[method] = amount - (newTotal - total);
    }
    
    setPayments(newPayments);
    onChange(newPayments);
  };

  const handleSimpleModeToggle = () => {
    if (isSimpleMode) {
      // Cambiar a modo mixto - mantener pagos actuales
      setIsSimpleMode(false);
    } else {
      // Cambiar a modo simple - resetear a un solo método
      const newPayments = {
        efectivo: total,
        mercadoPago: 0,
        transferencia: 0,
        tarjeta: 0
      };
      setPayments(newPayments);
      onChange(newPayments);
      setIsSimpleMode(true);
    }
  };

  const handleQuickFill = (method) => {
    const newPayments = {
      efectivo: 0,
      mercadoPago: 0,
      transferencia: 0,
      tarjeta: 0,
      [method]: total
    };
    setPayments(newPayments);
    onChange(newPayments);
  };

  // Modo simple - selector tradicional
  if (isSimpleMode) {
    const selectedMethod = Object.keys(payments).find(method => payments[method] > 0) || 'efectivo';
    
    return (
      <div className="space-y-3">
        {showSimpleMode && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Método de pago
            </label>
            <button
              type="button"
              onClick={handleSimpleModeToggle}
              disabled={disabled}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >
              ¿Pago combinado?
            </button>
          </div>
        )}
        
        <select
          value={selectedMethod}
          onChange={(e) => handleQuickFill(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border rounded-md disabled:opacity-50"
        >
          {Object.entries(PAYMENT_METHODS).map(([method, config]) => (
            <option key={method} value={method}>
              {config.icon} {config.label}
            </option>
          ))}
        </select>
        
        <div className="text-right text-lg font-bold">
          Total: ${total}
        </div>
      </div>
    );
  }

  // Modo mixto
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">
          💰 Total: ${total}
        </h3>
        {showSimpleMode && (
          <button
            type="button"
            onClick={handleSimpleModeToggle}
            disabled={disabled}
            className="text-xs text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Pago simple
          </button>
        )}
      </div>

      <div className="border-t pt-3">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          Dividir pago entre métodos:
        </h4>
        
        <div className={`space-y-${isMobile ? '3' : '2'}`}>
          {Object.entries(PAYMENT_METHODS).map(([method, config]) => (
            <PaymentMethodRow
              key={method}
              method={method}
              amount={payments[method]}
              maxAmount={total}
              onChange={(amount) => handlePaymentChange(method, amount)}
              disabled={disabled}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>

      {/* Resumen de pago */}
      <div className={`p-3 rounded-lg ${isValid ? 'bg-green-50 border border-green-200' : hasPayments ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50 border border-gray-200'}`}>
        <div className="flex justify-between items-center">
          <span className="font-medium">
            {isValid ? '✅ Completo' : hasPayments ? '⚠️ Incompleto' : '💰 Sin pagos'}
          </span>
          <div className="text-right">
            <div className="text-sm text-gray-600">
              Pagado: ${totalPaid}
            </div>
            {remaining !== 0 && (
              <div className={`text-sm font-medium ${remaining > 0 ? 'text-orange-600' : 'text-red-600'}`}>
                {remaining > 0 ? `Falta: $${remaining}` : `Excede: $${Math.abs(remaining)}`}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botones rápidos para llenar */}
      {!disabled && remaining > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="text-xs text-gray-500 w-full mb-1">Pago rápido:</span>
          {Object.entries(PAYMENT_METHODS).map(([method, config]) => (
            <button
              key={method}
              type="button"
              onClick={() => handleQuickFill(method)}
              className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
            >
              {config.icon} {config.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

MixedPaymentSelector.propTypes = {
  total: PropTypes.number.isRequired,
  paymentMethods: PropTypes.object,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool,
  showSimpleMode: PropTypes.bool
};

PaymentMethodRow.propTypes = {
  method: PropTypes.string.isRequired,
  amount: PropTypes.number.isRequired,
  maxAmount: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  isMobile: PropTypes.bool
};

export default MixedPaymentSelector;
