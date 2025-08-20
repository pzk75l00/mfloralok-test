import React from 'react';
import PropTypes from 'prop-types';

// Modal de alerta personalizado
const AlertModal = ({ 
  isOpen, 
  onClose, 
  title = "Mensaje", 
  message = "", 
  type = "info", // error, success, warning, info
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  // Auto close si está habilitado
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return {
          headerBg: 'bg-red-50',
          headerText: 'text-red-800',
          borderColor: 'border-red-200',
          icon: '❌',
          iconColor: 'text-red-600'
        };
      case 'success':
        return {
          headerBg: 'bg-green-50',
          headerText: 'text-green-800',
          borderColor: 'border-green-200',
          icon: '✅',
          iconColor: 'text-green-600'
        };
      case 'warning':
        return {
          headerBg: 'bg-orange-50',
          headerText: 'text-orange-800',
          borderColor: 'border-orange-200',
          icon: '⚠️',
          iconColor: 'text-orange-600'
        };
      default: // info
        return {
          headerBg: 'bg-blue-50',
          headerText: 'text-blue-800',
          borderColor: 'border-blue-200',
          icon: 'ℹ️',
          iconColor: 'text-blue-600'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-lg shadow-xl max-w-md w-full border-2 ${styles.borderColor}`}>
        {/* Header */}
        <div className={`${styles.headerBg} px-6 py-4 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`text-2xl ${styles.iconColor}`}>{styles.icon}</span>
              <h2 className={`text-lg font-semibold ${styles.headerText}`}>
                {title}
              </h2>
            </div>
            <button
              onClick={onClose}
              className={`text-gray-500 hover:text-gray-700 text-xl ${styles.headerText}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
          
          {autoClose && (
            <div className="mt-3 text-xs text-gray-500">
              Este mensaje se cerrará automáticamente en {autoCloseDelay / 1000} segundos
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

AlertModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  type: PropTypes.oneOf(['error', 'success', 'warning', 'info']),
  autoClose: PropTypes.bool,
  autoCloseDelay: PropTypes.number
};

export default AlertModal;
