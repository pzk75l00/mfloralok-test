import React from 'react';
import PropTypes from 'prop-types';

export default function ImageZoomModal({ open, image, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70" onClick={onClose}>
      <div className="relative" onClick={e => e.stopPropagation()}>
        <button
          className="absolute top-2 right-2 bg-white rounded-full shadow p-1 text-gray-700 hover:bg-gray-200 z-10"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ✕
        </button>
        <img
          src={image}
          alt="Vista ampliada"
          className="max-w-[90vw] max-h-[80vh] rounded shadow-lg border-4 border-white"
        />
      </div>
    </div>
  );
}

ImageZoomModal.propTypes = {
  open: PropTypes.bool.isRequired,
  image: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
};
