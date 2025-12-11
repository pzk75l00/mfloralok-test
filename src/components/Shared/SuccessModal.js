import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

export default function SuccessModal({ open, message, onClose, autoCloseDelay }) {
  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(onClose, autoCloseDelay);
    return () => clearTimeout(timer);
  }, [open, onClose, autoCloseDelay]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30"
      onClick={onClose}
      aria-live="polite"
    >
      <div
        className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full"
        role="status"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-2 text-green-700">Éxito</h2>
        <div className="mb-4 text-gray-700">{message}</div>
      </div>
    </div>
  );
}

SuccessModal.propTypes = {
  open: PropTypes.bool.isRequired,
  message: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  autoCloseDelay: PropTypes.number,
};

SuccessModal.defaultProps = {
  autoCloseDelay: 3000,
};