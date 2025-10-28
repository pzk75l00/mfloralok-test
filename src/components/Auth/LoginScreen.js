import React, { useEffect, useState } from 'react';
import { signInWithGoogle, checkRedirectResult, consumeLastAuthReason } from '../../auth/authService';
import { dlog } from '../../utils/debug';
import logo from '../../assets/images/logo.png';
import { isMobileUA } from '../../utils/deviceId';
import MobileAuthErrorModal from './MobileAuthErrorModal';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supportsPasskey, setSupportsPasskey] = useState(false);
  const BIOMETRICS_ENABLED = String(process.env.REACT_APP_ENABLE_BIOMETRICS || '').toLowerCase() === 'true';

  useEffect(() => {
    try {
      const basic = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
      setSupportsPasskey(Boolean(basic));
    } catch (_) {
      setSupportsPasskey(false);
    }
    // Capturar errores del flujo por redirección (móvil)
    (async () => {
      try {
        await checkRedirectResult();
      } catch (e) {
        const code = String(e?.code || '');
        setError(mapAuthError(code));
      }
      // Mostrar motivo de denegación previa si lo hubo
      const last = consumeLastAuthReason();
      if (last && last.message) {
        setError(last.message);
      }
    })();
  }, []);

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      dlog('[auth] LoginScreen: Google button clicked');
      await signInWithGoogle({ preferRedirectForMobile: true });
    } catch (e) {
      const code = String(e?.code || '');
      dlog('[auth] LoginScreen: Google error', code);
      setError(mapAuthError(code));
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = () => {
    // Placeholder para Passkeys/WebAuthn. Próxima etapa: registro y autenticación real.
    if (supportsPasskey) {
      alert('Acceso por huella: si ya está configurado, te pediremos autenticación. Próximamente activaremos el registro.');
    } else {
      alert('Tu navegador no soporta huella/FaceID (WebAuthn). Puedes ingresar con Google.');
    }
  };

  const bgWrap = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    background: 'radial-gradient(1200px 600px at 10% 10%, rgba(14,165,233,0.25), transparent),\nradial-gradient(900px 500px at 90% 20%, rgba(22,163,74,0.25), transparent),\nlinear-gradient(135deg, #0ea5e9 0%, #16a34a 100%)',
  };

  const card = {
    width: 380,
    maxWidth: '92vw',
    position: 'relative',
    borderRadius: 20,
    padding: '28px 24px',
    background: 'rgba(255,255,255,0.75)',
    boxShadow: '0 20px 40px rgba(0,0,0,0.20)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.6)'
  };

  const title = {
    margin: '6px 0 4px',
    color: '#0f172a',
    fontWeight: 800,
    fontSize: 22,
    textAlign: 'center'
  };

  const subtitle = {
    margin: '0 0 16px',
    color: '#334155',
    fontWeight: 500,
    fontSize: 13,
    textAlign: 'center'
  };

  const logoWrap = {
    width: 72,
    height: 72,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 10px 20px rgba(0,0,0,0.15)',
    margin: '0 auto 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'white',
    border: '1px solid #eef2ff'
  };

  const btn = (variant = 'light') => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 12,
    fontWeight: 700,
    cursor: 'pointer',
    border: variant === 'light' ? '1px solid #e5e7eb' : 'none',
    color: variant === 'light' ? '#111827' : '#fff',
    background:
      variant === 'light'
        ? '#fff'
        : 'linear-gradient(135deg, #16a34a 0%, #166534 100%)',
    boxShadow:
      variant === 'light'
        ? '0 1px 2px rgba(0,0,0,0.06)'
        : '0 6px 16px rgba(22,101,52,0.35)',
    transition: 'transform 120ms ease, box-shadow 120ms ease, opacity 120ms ease',
    opacity: loading ? 0.7 : 1
  });

  const iconWrap = {
    width: 20,
    height: 20,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  function mapAuthError(code) {
    switch (code) {
      case 'auth/operation-not-allowed':
        return 'Google no está habilitado en Firebase. Activalo en Authentication > Sign-in method.';
      case 'auth/unauthorized-domain':
        return 'Dominio no autorizado en Firebase. Agregalo en Authentication > Settings > Authorized domains.';
      case 'auth/popup-blocked':
        return 'El navegador bloqueó la ventana de Google. Permití popups para este sitio o probá de nuevo.';
      case 'auth/popup-closed-by-user':
        return 'Cerraste la ventana de Google. Probá otra vez.';
      case 'auth/cancelled-popup-request':
        return 'Se canceló el popup anterior. Probá nuevamente.';
      case 'auth/network-request-failed':
        return 'Fallo de red. Verificá tu conexión e intentá de nuevo.';
      default:
        return 'No se pudo iniciar sesión con Google.';
    }
  }

  return (
    <div style={bgWrap}>
      <div style={card}>
        <div style={logoWrap}>
          <img src={logo} alt="Logo" style={{ width: 56, height: 56, objectFit: 'contain' }} />
        </div>
        <h2 style={title}>Bienvenido</h2>
        <p style={subtitle}>Elegí cómo querés ingresar</p>

        {/* En móvil mostramos el error como modal, en desktop inline */}
        {!isMobileUA() && error && (
          <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 10, textAlign: 'center' }}>{error}</div>
        )}

  <button onClick={handleGoogle} disabled={loading} style={btn('light')} aria-label="Ingresar con Google">
          <span style={iconWrap}>
            {/* Google icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12 s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C33.046,6.053,28.728,4,24,4C12.955,4,4,12.955,4,24 s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,16.108,18.961,13,24,13c3.059,0,5.842,1.154,7.961,3.039 l5.657-5.657C33.046,6.053,28.728,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
              <path fill="#4CAF50" d="M24,44c4.646,0,8.902-1.784,12.11-4.692l-5.586-4.727C28.502,36.391,26.377,37,24,37 c-5.198,0-9.607-3.317-11.27-7.946l-6.52,5.025C9.5,39.556,16.227,44,24,44z"/>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.236-2.231,4.166-4.093,5.581 c0.001-0.001,0.002-0.001,0.003-0.002l5.586,4.727C35.657,39.487,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
            </svg>
          </span>
          {loading ? 'Conectando…' : 'Ingresar con Google'}
        </button>

        {BIOMETRICS_ENABLED && (
          <>
            <div style={{ height: 10 }} />
            <button onClick={handleBiometric} disabled={loading || !supportsPasskey} style={btn('solid')} aria-label="Usar huella">
              <span style={iconWrap}>
                {/* Fingerprint icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11a4 4 0 0 0-4 4v1" />
                  <path d="M12 11a4 4 0 0 1 4 4v1" />
                  <path d="M12 2a10 10 0 0 0-7.546 16.588" />
                  <path d="M12 2a10 10 0 0 1 7.546 16.588" />
                  <path d="M12 6a6 6 0 0 0-6 6v1" />
                  <path d="M12 6a6 6 0 0 1 6 6v1" />
                </svg>
              </span>
              {supportsPasskey ? 'Usar huella' : 'Huella no disponible'}
            </button>
            {supportsPasskey ? (
              <div style={{ marginTop: 12, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                Podés habilitar huella después del primer ingreso con Google.
              </div>
            ) : (
              <div style={{ marginTop: 12, textAlign: 'center', color: '#64748b', fontSize: 11 }}>
                Tu navegador/dispositivo no soporta huella (WebAuthn).
              </div>
            )}
          </>
        )}
      </div>
      {/* Modal de error para móvil */}
      {isMobileUA() && !!error && (
        <MobileAuthErrorModal message={error} onClose={() => setError('')} />
      )}
    </div>
  );
}
