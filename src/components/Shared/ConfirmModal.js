import React from 'react';
import PropTypes from 'prop-types';

export default function ConfirmModal({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <div className="mb-6 text-gray-700 text-center">{message}</div>
        <div className="flex gap-3 justify-center">
          <button
            className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            onClick={onConfirm}
          >
            Aceptar
          </button>
          <button
            className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-semibold"
            onClick={onCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

ConfirmModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
};
