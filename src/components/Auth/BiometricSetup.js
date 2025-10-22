import React, { useEffect, useMemo, useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getOrCreateDeviceId, isMobileUA } from '../../utils/deviceId';
import { getAuth } from 'firebase/auth';

// Utilidad simple base64url
function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomChallenge(len = 32) {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return arr;
}

export default function BiometricSetup() {
  const [supported, setSupported] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const deviceId = useMemo(() => getOrCreateDeviceId(), []);
  const keyLocal = `mf_bio_enabled_${deviceId}`;
  const auth = getAuth();

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
    setSupported(Boolean(ok));
    setEnrolled(localStorage.getItem(keyLocal) === '1');
  }, [keyLocal]);

  if (!supported) return null;

  const handleEnable = async () => {
    setMsg('');
    setBusy(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setMsg('Ingresá primero con Google.');
        return;
      }
      // Generar parámetros mínimos para pedir credencial de plataforma (UX biométrica)
      const publicKey = {
        challenge: randomChallenge(32),
        rp: { name: 'MundoFloral', id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(user.uid),
          name: user.email || `user-${user.uid}`,
          displayName: user.displayName || 'Usuario'
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 }, // ES256
          { type: 'public-key', alg: -257 } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred'
        },
        timeout: 60000,
        attestation: 'none'
      };

      // Nota: Esto sólo dispara la UI biométrica y guarda localmente; no hay verificación de servidor aún.
      const cred = await navigator.credentials.create({ publicKey });
      const credId = cred?.rawId ? toBase64Url(cred.rawId) : null;

      // Marcar habilitado en localStorage y Firestore para este dispositivo
      localStorage.setItem(keyLocal, '1');
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [`biometricDevices.${deviceId}`]: {
          credentialId: credId || null,
          isMobile: isMobileUA(),
          createdAt: serverTimestamp(),
          lastUsedAt: serverTimestamp()
        }
      });
      setEnrolled(true);
      setMsg('Huella habilitada en este dispositivo.');
    } catch (e) {
      console.error('Biometric enable error', e);
      setMsg('No se pudo habilitar la huella.');
    } finally {
      setBusy(false);
    }
  };

  if (enrolled) return null; // Ya habilitado en este dispositivo

  return (
    <div style={{
      margin: '16px 16px 0',
      padding: '12px 14px',
      borderRadius: 12,
      background: '#ecfdf5',
      border: '1px solid #d1fae5',
      color: '#065f46',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12
    }}>
      <div>
        <div style={{ fontWeight: 800 }}>Habilitar acceso con huella</div>
        <div style={{ fontSize: 12 }}>Podrás ingresar más rápido desde este dispositivo.</div>
        {msg && <div style={{ fontSize: 12, marginTop: 6, color: '#064e3b' }}>{msg}</div>}
      </div>
      <button onClick={handleEnable} disabled={busy} style={{
        padding: '10px 12px',
        borderRadius: 10,
        background: '#10b981',
        color: 'white',
        fontWeight: 700,
        border: 'none',
        cursor: 'pointer'
      }}>
        {busy ? 'Habilitando…' : 'Habilitar'}
      </button>
    </div>
  );
}
