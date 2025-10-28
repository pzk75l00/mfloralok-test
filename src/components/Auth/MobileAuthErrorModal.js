import React from 'react';
import PropTypes from 'prop-types';

export default function MobileAuthErrorModal({ message, onClose }) {
  const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    padding: 16
  };
  const card = {
    width: '100%', maxWidth: 420, background: '#fff', borderRadius: 14,
    border: '1px solid #e5e7eb', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
  };
  const header = {
    padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
    fontWeight: 800, color: '#111827'
  };
  const body = { padding: 16, color: '#374151', lineHeight: 1.4 };
  const footer = {
    display: 'flex', gap: 10, justifyContent: 'flex-end', padding: 12,
    borderTop: '1px solid #f1f5f9'
  };
  const btn = (variant = 'primary') => ({
    padding: '8px 12px', borderRadius: 10, fontWeight: 700, cursor: 'pointer',
    border: variant === 'secondary' ? '1px solid #e5e7eb' : 'none',
    background: variant === 'secondary' ? '#fff' : '#16a34a',
    color: variant === 'secondary' ? '#111827' : '#fff',
    boxShadow: variant === 'secondary' ? '0 1px 2px rgba(0,0,0,0.06)' : '0 6px 16px rgba(22,101,52,0.35)'
  });

  return (
    <div style={overlay} role="dialog" aria-modal="true" aria-labelledby="auth-error-title">
      <div style={card}>
        <div style={header} id="auth-error-title">No pudiste ingresar</div>
        <div style={body}>{message || 'No se pudo completar el acceso. Probá nuevamente o consultá al administrador.'}</div>
        <div style={footer}>
          <button onClick={onClose} style={btn('primary')}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

MobileAuthErrorModal.propTypes = {
  message: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
