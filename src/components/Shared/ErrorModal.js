import React from 'react';
import PropTypes from 'prop-types';

export default function ErrorModal({ open, message, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-semibold mb-2 text-red-600">Error</h2>
        <div className="mb-4 text-gray-700">{message}</div>
        <button
          className="px-4 py-2 bg-green-700 text-white rounded hover:bg-green-800"
          onClick={onClose}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

ErrorModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
