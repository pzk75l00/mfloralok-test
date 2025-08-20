import React from 'react';
import PropTypes from 'prop-types';

// Modal de confirmación personalizado
const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirmar acción", 
  message = "¿Está seguro de realizar esta acción?",
  confirmText = "Confirmar",
  cancelText = "Cancelar",
  type = "warning" // warning, danger, info, success
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          headerBg: 'bg-red-50',
          headerText: 'text-red-800',
          icon: '⚠️',
          confirmBtn: 'bg-red-600 hover:bg-red-700'
        };
      case 'success':
        return {
          headerBg: 'bg-green-50',
          headerText: 'text-green-800',
          icon: '✅',
          confirmBtn: 'bg-green-600 hover:bg-green-700'
        };
      case 'info':
        return {
          headerBg: 'bg-blue-50',
          headerText: 'text-blue-800',
          icon: 'ℹ️',
          confirmBtn: 'bg-blue-600 hover:bg-blue-700'
        };
      default: // warning
        return {
          headerBg: 'bg-orange-50',
          headerText: 'text-orange-800',
          icon: '⚠️',
          confirmBtn: 'bg-orange-600 hover:bg-orange-700'
        };
    }
  };

  const styles = getTypeStyles();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className={`${styles.headerBg} px-6 py-4 rounded-t-lg`}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{styles.icon}</span>
            <h2 className={`text-lg font-semibold ${styles.headerText}`}>
              {title}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`flex-1 text-white py-2 px-4 rounded transition-colors ${styles.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

ConfirmationModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['warning', 'danger', 'info', 'success'])
};

export default ConfirmationModal;
