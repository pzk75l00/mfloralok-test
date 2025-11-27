import React from 'react';
import PropTypes from 'prop-types';

export default function RegisterSuccessModal({ open, onClose }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
        padding: '32px 28px',
        maxWidth: 380,
        width: '100%',
        border: '1px solid #d1fae5',
        textAlign: 'center'
      }}>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: '#047857', marginBottom: 12 }}>
          Usuario en proceso de registración
        </h3>
        <p style={{ color: '#374151', fontSize: 15, marginBottom: 24 }}>
          Ingrese desde el login con el usuario.
        </p>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            background: 'linear-gradient(90deg, #16a34a 0%, #22d3ee 100%)',
            color: 'white',
            fontWeight: 700,
            fontSize: 16,
            border: 'none',
            borderRadius: 10,
            padding: '12px 0',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(16,185,129,0.10)'
          }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}

RegisterSuccessModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
};
