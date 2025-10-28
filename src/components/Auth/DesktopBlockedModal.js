import React from 'react';
import PropTypes from 'prop-types';

export default function DesktopBlockedModal({ onClose }) {
  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="dbm-title">
      <div style={modal}>
        <h2 id="dbm-title" style={title}>Equipo no autorizado</h2>
        <p style={text}>
          Este dispositivo de escritorio no está autorizado para este usuario.
          Contacte al administrador.
        </p>
        <div style={{ textAlign: 'right' }}>
          <button style={btn} onClick={onClose} autoFocus>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
}

DesktopBlockedModal.propTypes = {
  onClose: PropTypes.func
};

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
};

const modal = {
  width: 420,
  maxWidth: '92vw',
  background: '#fff',
  borderRadius: 12,
  boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
  padding: '18px 16px'
};

const title = {
  margin: '0 0 6px',
  fontSize: 18,
  fontWeight: 800,
  color: '#111827'
};

const text = {
  margin: '4px 0 16px',
  fontSize: 14,
  color: '#374151'
};

const btn = {
  background: '#166534',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  padding: '10px 14px',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: '0 6px 16px rgba(22,101,52,0.35)'
};
