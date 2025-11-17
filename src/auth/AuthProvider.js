import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { subscribeAuth, ensureLocalPersistence, signOut as doSignOut, getUserProfile, upsertUserProfile, registerDeviceIfNeeded, reserveSeatIfNeeded, isOwnerEmail, setLastAuthReason } from './authService';
import DesktopBlockedModal from '../components/Auth/DesktopBlockedModal';
import { dlog } from '../utils/debug';
import { getDeviceInfo, isMobileUA } from '../utils/deviceId';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

const AuthContext = createContext({ user: null, userData: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children, enforceDesktopBinding = true }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deviceBlocked, setDeviceBlocked] = useState(false);

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

          if (owner) {
            // Dueño: bypass de allowlist y seats; asegurar perfil con rol 'owner'
            await upsertUserProfile(u.uid, { email: u.email || null, displayName: u.displayName || null, rol: 'owner' });
            dlog('[auth] upsertUserProfile owner ok');
          } else {
            // No dueño: activar solo si está pre-registrado y no bloqueado
            const emailLower = String(u.email || '').toLowerCase();
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
              // Marcar estado expirado en pre-registro para referencia futura
              try {
                await updateDoc(preRef, { estado: 'expirado', fechaModif: new Date().toISOString() });
              } catch (_) {
                // ignorar error
              }
              setLastAuthReason({ code: 'trial_expired', message: 'Tu período de prueba finalizó. Podés solicitar la compra para continuar.' });
              await doSignOut();
              setUser(null);
              setUserData(null);
              setLoading(false);
              return;
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
              activatedFromEmail: emailLower
            });
            dlog('[auth] upsertUserProfile activated from pre-reg ok');
          }

          // Owners pueden omitir el binding de escritorio
          const deviceRes = await registerDeviceIfNeeded(u.uid, { enforceDesktopBinding: enforceDesktopBinding && !owner });
          dlog('[auth] registerDeviceIfNeeded', deviceRes);
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

  const value = useMemo(() => ({ user, userData, loading, signOut: doSignOut }), [user, userData, loading]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {deviceBlocked && (
        <DesktopBlockedModal onClose={() => setDeviceBlocked(false)} />
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
