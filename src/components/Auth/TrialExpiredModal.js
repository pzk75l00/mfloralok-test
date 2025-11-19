import React, { useState } from 'react';
import PropTypes from 'prop-types';

// Modal bloqueante para período de prueba expirado con extensión única
export default function TrialExpiredModal({ finDate, diasPrueba, email, extensionUsed, extensionDays, onExtend, onSignOut }) {
  const [extLoading, setExtLoading] = useState(false);
  const [extError, setExtError] = useState('');
  const finLocal = (() => {
    try { return finDate ? new Date(finDate) : null; } catch (_) { return null; }
  })();
  const finStr = finLocal ? finLocal.toLocaleDateString() : '—';

  const handleSolicitar = () => {
    const asunto = encodeURIComponent('Solicitud de compra MundoFloral');
    const cuerpo = encodeURIComponent(`Hola, mi prueba expiró y deseo continuar.\nEmail: ${email || ''}\nFin de prueba: ${finStr}\nDías otorgados: ${diasPrueba || ''}\n`);
    window.location.href = `mailto:ventas@mundofloral.com?subject=${asunto}&body=${cuerpo}`;
  };

  const handleExtension = async () => {
    if (extensionUsed || extLoading) return;
    setExtLoading(true); setExtError('');
    const res = await onExtend();
    if (!res?.ok) {
      if (res?.reason === 'already_used') setExtError('La extensión ya se utilizó.');
      else setExtError('No se pudo extender la prueba.');
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <div style={styles.logoCircle} aria-label="Trial expirado">
          {/* Carita triste */}
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" fill="#fff" />
            <circle cx="9" cy="10" r="1.4" />
            <circle cx="15" cy="10" r="1.4" />
            <path d="M16.2 16c-1.1-1-2.4-1.5-4.2-1.5S8.9 15 7.8 16" />
          </svg>
        </div>
        <h2 style={styles.title}>Tu prueba finalizó</h2>
        <p style={styles.text}>Período inicial: <strong>{diasPrueba}</strong> días</p>
        <p style={styles.text}>Fecha de fin: <strong>{finStr}</strong></p>
        <p style={styles.text}>Podés solicitar la compra o usar una extensión única de <strong>{extensionDays}</strong> días.</p>
        {extError && <div style={styles.error}>{extError}</div>}
        <div style={styles.actions}>
          <button style={styles.primaryBtn} onClick={handleSolicitar}>Solicitar Compra</button>
          <button style={styles.secondaryBtn} onClick={onSignOut}>Cerrar sesión</button>
        </div>
        <div style={{ height: 12 }} />
        <button
          onClick={handleExtension}
          disabled={extensionUsed || extLoading}
          style={{ ...styles.extendBtn, ...(extensionUsed ? styles.extendBtnDisabled : {}) }}
        >
          {extensionUsed ? 'Extensión usada' : extLoading ? 'Extendiendo…' : `Extender prueba (+${extensionDays} días)`}
        </button>
      </div>
    </div>
  );
}

TrialExpiredModal.propTypes = {
  finDate: PropTypes.string,
  diasPrueba: PropTypes.number,
  email: PropTypes.string,
  extensionUsed: PropTypes.bool,
  extensionDays: PropTypes.number,
  onExtend: PropTypes.func,
  onSignOut: PropTypes.func,
};

const styles = {
  backdrop: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'linear-gradient(135deg,#0ea5e9 0%,#16a34a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
    padding: 20
  },
  modal: {
    background: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '30px 32px', width: '100%', maxWidth: 520,
    boxShadow: '0 20px 40px rgba(0,0,0,0.25)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', fontFamily: 'system-ui, sans-serif',
    border: '1px solid rgba(255,255,255,0.65)'
  },
  logoCircle: {
    width: 72, height: 72, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36,
    margin: '0 auto 12px', background: '#fff', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0'
  },
  title: { margin: '0 0 16px', fontSize: 24, fontWeight: 800, textAlign: 'center', color: '#0f172a' },
  text: { margin: '6px 0', lineHeight: 1.45, fontSize: 14, color: '#334155', textAlign: 'center' },
  actions: { display: 'flex', gap: 14, marginTop: 18 },
  primaryBtn: {
    flex: 1, background: 'linear-gradient(135deg,#16a34a,#166534)', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: 14,
    cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 6px 18px rgba(22,101,52,0.35)'
  },
  secondaryBtn: {
    flex: 1, background: '#fff', color: '#0f172a', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: 14,
    cursor: 'pointer', fontWeight: 600, fontSize: 14, boxShadow: '0 2px 6px rgba(0,0,0,0.08)'
  },
  extendBtn: {
    width: '100%', background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', border: 'none', padding: '12px 16px', borderRadius: 14,
    cursor: 'pointer', fontWeight: 700, fontSize: 14, boxShadow: '0 6px 18px rgba(14,165,233,0.35)', transition: 'opacity .15s ease'
  },
  extendBtnDisabled: { opacity: 0.5, cursor: 'not-allowed', boxShadow: 'none' },
  footer: { marginTop: 14, textAlign: 'center' },
  error: { marginTop: 10, textAlign: 'center', color: '#b91c1c', fontSize: 12, fontWeight: 600 }
};
