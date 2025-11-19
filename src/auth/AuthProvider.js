import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { subscribeAuth, ensureLocalPersistence, signOut as doSignOut, getUserProfile, upsertUserProfile, registerDeviceIfNeeded, reserveSeatIfNeeded, isOwnerEmail, setLastAuthReason } from './authService';
import DesktopBlockedModal from '../components/Auth/DesktopBlockedModal';
import TrialExpiredModal from '../components/Auth/TrialExpiredModal';
import { dlog } from '../utils/debug';
import { getDeviceInfo, isMobileUA, getOrCreateDeviceId } from '../utils/deviceId';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const AuthContext = createContext({ user: null, userData: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children, enforceDesktopBinding = true }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceBlocked, setDeviceBlocked] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialInfo, setTrialInfo] = useState(null); // { finDate, diasPrueba, preEmail, extensionUsed, extensionDays }
  const TRIAL_BEHAVIOR = String(process.env.REACT_APP_TRIAL_BLOCK_BEHAVIOR || 'modal').toLowerCase(); // 'modal' | 'block'
  const TRIAL_EXTENSION_DAYS = Number.isFinite(Number(process.env.REACT_APP_TRIAL_EXTENSION_DAYS)) ? Number(process.env.REACT_APP_TRIAL_EXTENSION_DAYS) : 2; // días extra (default 2)
  const ALLOW_DESKTOP_ONCE_KEY = 'mf_allow_desktop_once';
  const ALLOW_DESKTOP_UNTIL_KEY = 'mf_allow_desktop_until';

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      await ensureLocalPersistence();
      dlog('[auth] AuthProvider mounted', { enforceDesktopBinding, isMobile: isMobileUA(), device: getDeviceInfo() });
      unsub = subscribeAuth(async (u) => {
        setLoading(true);
        dlog('[auth] onAuthStateChanged', { hasUser: !!u, email: u?.email });
        setUser(u);
        if (u) {
          // Determinar si es dueño primero para decidir bypasses
          const owner = await isOwnerEmail(u.email || '');
          dlog('[auth] isOwnerEmail', { owner });
          let preEstado = null;
          let cachedEmailLower = null;

          if (owner) {
            // Dueño: bypass de allowlist y seats; asegurar perfil con rol 'owner'
            await upsertUserProfile(u.uid, { email: u.email || null, displayName: u.displayName || null, rol: 'owner' });
            dlog('[auth] upsertUserProfile owner ok');
          } else {
            // No dueño: activar solo si está pre-registrado y no bloqueado
            const emailLower = String(u.email || '').toLowerCase();
            cachedEmailLower = emailLower;
            const preRef = doc(db, 'users_by_email', emailLower);
            const preSnap = await getDoc(preRef);
            if (!preSnap.exists()) {
              console.warn('[Auth] Email no pre-registrado', u.email);
              setLastAuthReason({ code: 'not_pre_registered', message: 'Tu cuenta no está habilitada. Solicitá el alta al administrador.' });
              await doSignOut();
              setUser(null);
              setUserData(null);
              setLoading(false);
              return;
            }
            const pre = preSnap.data() || {};
            const estado = String(pre.estado || 'pendiente');
            preEstado = estado;
            // Normalizar fechas y período de prueba para registros viejos (sin estos campos)
            const diasPrueba = Number.isFinite(Number(pre.tiempoPrueba)) ? Number(pre.tiempoPrueba) : 7;
            const createdLocal = (() => {
              if (pre.fechaCreacion) return new Date(pre.fechaCreacion);
              if (pre.creado) return new Date(pre.creado);
              if (pre.createdAt && typeof pre.createdAt.toDate === 'function') return pre.createdAt.toDate();
              return new Date();
            })();
            const computedFin = new Date(createdLocal.getTime() + diasPrueba * 24 * 60 * 60 * 1000);
            const finDate = pre.fechaFin ? new Date(pre.fechaFin) : computedFin;
            // Si faltaba fechaFin o tiempoPrueba, completar en background para dejar consistente
            if (!pre.fechaFin || pre.tiempoPrueba === undefined) {
              try {
                await updateDoc(preRef, {
                  fechaFin: finDate.toISOString(),
                  tiempoPrueba: diasPrueba,
                  fechaModif: new Date().toISOString(),
                });
              } catch (_) {
                // ignorar
              }
            }
            // Verificar expiración de período de prueba
            let pruebaExpirada = false;
            if (!isNaN(finDate.getTime()) && Date.now() > finDate.getTime()) {
              pruebaExpirada = true;
            }
            if (estado === 'suspendido') {
              setLastAuthReason({ code: 'user_suspended', message: 'Tu usuario está suspendido. Contactá al administrador.' });
              await doSignOut();
              setUser(null);
              setUserData(null);
              setLoading(false);
              return;
            }
            if (estado === 'borrado') {
              setLastAuthReason({ code: 'user_deleted', message: 'Tu usuario fue dado de baja. Solicitá reactivación al administrador.' });
              await doSignOut();
              setUser(null);
              setUserData(null);
              setLoading(false);
              return;
            }
            if (pruebaExpirada) {
              try {
                await updateDoc(preRef, { estado: 'expirado', fechaModif: new Date().toISOString() });
              } catch (_) {
                // ignorar error
              }
              setLastAuthReason({ code: 'trial_expired', message: 'Tu período de prueba finalizó. Podés solicitar la compra para continuar.' });
              if (TRIAL_BEHAVIOR === 'block') {
                // Comportamiento legacy: cerrar sesión y volver al login con mensaje
                await doSignOut();
                setUser(null);
                setUserData(null);
                setLoading(false);
                return;
              } else {
                // Nuevo comportamiento: mantener sesión y mostrar modal bloqueante
                const extensionUsed = Boolean(pre.trialExtensionUsed);
                setTrialExpired(true);
                setTrialInfo({ finDate: finDate.toISOString(), diasPrueba, preEmail: emailLower, extensionUsed, extensionDays: TRIAL_EXTENSION_DAYS });
                setUserData(null); // no activar perfil todavía
                setLoading(false);
                return;
              }
            }
            try {
              await reserveSeatIfNeeded(u.uid, { email: u.email || null, displayName: u.displayName || null });
              dlog('[auth] reserveSeatIfNeeded ok');
            } catch (e) {
              if (String(e.message) === 'license_limit_reached') {
                console.warn('[Auth] Límite de usuarios alcanzado');
                setLastAuthReason({ code: 'license_limit', message: 'Límite de usuarios alcanzado. Contacte al administrador.' });
                await doSignOut();
                setUser(null);
                setUserData(null);
                setLoading(false);
                return;
              }
            }
            // Activar perfil con datos del pre-registro y estado activo
            await upsertUserProfile(u.uid, {
              email: u.email || null,
              displayName: u.displayName || null,
              nombre: pre.nombre || null,
              apellido: pre.apellido || null,
              telefono: pre.telefono || null,
              rol: pre.rol || 'usuario',
              modules: Array.isArray(pre.modules) && pre.modules.length ? pre.modules : ['basico'],
              estado: 'activo',
              activatedFromEmail: emailLower,
              activatedAt: new Date().toISOString()
            });
            dlog('[auth] upsertUserProfile activated from pre-reg ok');
          }

          // Owners pueden omitir el binding de escritorio
          let allowDesktopOnce = false;
          let allowDesktopUntil = 0;
          try {
            allowDesktopOnce = sessionStorage.getItem(ALLOW_DESKTOP_ONCE_KEY) === '1';
            allowDesktopUntil = Number(localStorage.getItem(ALLOW_DESKTOP_UNTIL_KEY) || 0);
          } catch (_) { /* ignore */ }
          const relaxDesktopForExtension = String(preEstado || '').toLowerCase() === 'extendido';
          const allowTemporal = allowDesktopUntil > Date.now();
          // Revalidar estado extendido por si cambió entre pasos
          let latestRelax = relaxDesktopForExtension;
          try {
            if (cachedEmailLower) {
              const ps2 = await getDoc(doc(db, 'users_by_email', cachedEmailLower));
              const p2 = ps2.exists() ? ps2.data() : null;
              latestRelax = String(p2?.estado || '').toLowerCase() === 'extendido' || Boolean(p2?.trialExtensionUsed);
            }
          } catch (_) { /* ignore */ }
          const effectiveEnforce = (enforceDesktopBinding && !owner && !allowDesktopOnce && !latestRelax && !allowTemporal);
          // Usar console.log para garantizar visibilidad de diagnóstico
          // eslint-disable-next-line no-console
          console.log('[auth] device-binding params', { allowDesktopOnce, allowTemporal, relaxDesktopForExtension: latestRelax, enforceDesktopBinding, effectiveEnforce });
          let deviceRes = await registerDeviceIfNeeded(u.uid, { enforceDesktopBinding: effectiveEnforce });
          dlog('[auth] registerDeviceIfNeeded result (first)', deviceRes);
          if (!deviceRes.ok && (allowDesktopOnce || latestRelax || allowTemporal)) {
            // Fallback: forzar registro sin binding en sesión extendida/una-vez
            dlog('[auth] registerDeviceIfNeeded fallback without binding');
            deviceRes = await registerDeviceIfNeeded(u.uid, { enforceDesktopBinding: false });
            dlog('[auth] registerDeviceIfNeeded result (fallback)', deviceRes);
          }
          if (!deviceRes.ok && (latestRelax || allowTemporal)) {
            // Alta directa del device y reintento
            try {
              const deviceId = getOrCreateDeviceId();
              await upsertUserProfile(u.uid, {
                [`allowedDevices.${deviceId}`]: {
                  isDesktop: !isMobileUA(),
                  name: getDeviceInfo().deviceLabel,
                  userAgent: navigator.userAgent || '',
                  createdAt: new Date().toISOString(),
                  lastSeenAt: new Date().toISOString()
                }
              });
              dlog('[auth] forced allow current device');
              deviceRes = await registerDeviceIfNeeded(u.uid, { enforceDesktopBinding: false });
            } catch (e) {
              console.warn('[auth] force allow device failed', e);
            }
          }
          if (!deviceRes.ok) {
            // Not allowed, force sign out and show info
            console.warn('[Auth] Dispositivo de escritorio bloqueado', deviceRes);
            setLastAuthReason({ code: 'desktop_not_allowed', message: 'Este equipo no está autorizado. Solicitá autorización al administrador.' });
            await doSignOut();
            setUser(null);
            setUserData(null);
            setLoading(false);
            setDeviceBlocked(true);
            return;
          }
          setDeviceBlocked(false);
          if (allowDesktopOnce) {
            try { sessionStorage.removeItem(ALLOW_DESKTOP_ONCE_KEY); } catch (_) { /* ignore */ }
          }
          if (allowTemporal) {
            try { localStorage.removeItem(ALLOW_DESKTOP_UNTIL_KEY); } catch (_) { /* ignore */ }
          }
          const fresh = await getUserProfile(u.uid);
          setUserData(fresh);
          dlog('[auth] user profile loaded', { uid: u.uid });
        } else {
          setUserData(null);
        }
        setLoading(false);
        dlog('[auth] AuthProvider state', { loading: false, hasUser: !!u });
      });
    })();
    return () => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (e) {
        // Evitar romper la app si la limpieza falla
        // eslint-disable-next-line no-console
        console.debug('AuthProvider cleanup error', e);
      }
    };
  }, [enforceDesktopBinding]);

  async function extendTrialOnce() {
    if (!trialInfo || trialInfo.extensionUsed) return { ok: false, reason: 'already_used' };
    try {
      const emailLower = trialInfo.preEmail;
      const preRef = doc(db, 'users_by_email', emailLower);
      const snap = await getDoc(preRef);
      if (!snap.exists()) return { ok: false, reason: 'missing_pre' };
      const pre = snap.data();
      if (pre.trialExtensionUsed) return { ok: false, reason: 'already_used' };
      const originalFin = trialInfo.finDate ? new Date(trialInfo.finDate) : new Date();
      const now = new Date();
      const base = isNaN(originalFin.getTime()) ? now : originalFin;
      // Nueva fecha fin = mayor(fechaFinActual, ahora) + extensionDays
      const startPoint = now.getTime() > base.getTime() ? now : base;
      const nuevaFin = new Date(startPoint.getTime() + trialInfo.extensionDays * 24 * 60 * 60 * 1000);
      const nuevosDias = (Number(pre.tiempoPrueba) || trialInfo.diasPrueba || 0) + trialInfo.extensionDays;
      const notaItem = {
        ts: new Date().toISOString(),
        actor: emailLower,
        accion: 'extension_prueba',
        nota: `Extensión de prueba +${trialInfo.extensionDays} días`
      };
      await updateDoc(preRef, {
        fechaFin: nuevaFin.toISOString(),
        tiempoPrueba: nuevosDias,
        trialExtensionUsed: true,
        trialExtensionDays: trialInfo.extensionDays,
        trialExtensionAt: new Date().toISOString(),
        estado: 'extendido', // nuevo estado para distinguir la extensión
        fechaModif: new Date().toISOString(),
        ultimaNota: notaItem,
        notas: arrayUnion(notaItem)
      });
      // Alta directa del dispositivo actual en allowedDevices para evitar bloqueo inmediato
      try {
        const deviceId = getOrCreateDeviceId();
        await upsertUserProfile(user?.uid, {
          [`allowedDevices.${deviceId}`]: {
            isDesktop: !isMobileUA(),
            name: getDeviceInfo().deviceLabel,
            userAgent: navigator.userAgent || '',
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString()
          }
        });
      } catch (_) { /* ignore device registration errors here */ }
      // Permitir registrar este equipo una sola vez tras la extensión
      try { sessionStorage.setItem(ALLOW_DESKTOP_ONCE_KEY, '1'); } catch (_) { /* ignore */ }
      try { localStorage.setItem(ALLOW_DESKTOP_UNTIL_KEY, String(Date.now() + 15 * 60 * 1000)); } catch (_) { /* ignore */ }
      // Limpiar flags y forzar re-evaluación: recargar o reiniciar estados
      setTrialExpired(false);
      setTrialInfo(null);
      // Forzar re-evaluación completa del flujo (más simple que duplicar lógica)
      window.location.reload();
      return { ok: true };
    } catch (e) {
      console.error('[trial] extendTrialOnce error', e);
      return { ok: false, reason: 'error', error: e };
    }
  }

  const value = useMemo(() => ({ user, userData, loading, signOut: doSignOut, trialExpired, trialInfo, extendTrialOnce }), [user, userData, loading, trialExpired, trialInfo]);

  return (
    <AuthContext.Provider value={value}>
      {!trialExpired && children}
      {deviceBlocked && (
        <DesktopBlockedModal onClose={() => setDeviceBlocked(false)} />
      )}
      {trialExpired && (
        <TrialExpiredModal
          finDate={trialInfo?.finDate}
          diasPrueba={trialInfo?.diasPrueba}
          email={trialInfo?.preEmail}
          extensionUsed={trialInfo?.extensionUsed}
          extensionDays={trialInfo?.extensionDays}
          onExtend={extendTrialOnce}
          onSignOut={async () => { await doSignOut(); setUser(null); setUserData(null); }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

AuthProvider.propTypes = {
  children: PropTypes.node,
  enforceDesktopBinding: PropTypes.bool,
};
