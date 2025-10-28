import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { subscribeAuth, ensureLocalPersistence, signOut as doSignOut, getUserProfile, upsertUserProfile, registerDeviceIfNeeded, reserveSeatIfNeeded, isEmailAllowed, isOwnerEmail, setLastAuthReason } from './authService';
import DesktopBlockedModal from '../components/Auth/DesktopBlockedModal';
import { dlog } from '../utils/debug';
import { getDeviceInfo, isMobileUA } from '../utils/deviceId';

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
          // Reglas de acceso por email/dominio (configurable en Firestore app_config/auth)
          const allowed = await isEmailAllowed(u.email || '');
          dlog('[auth] email allow check', { email: u.email, allowed });
          if (!allowed) {
            console.warn('[Auth] Email no autorizado', u.email);
            setLastAuthReason({ code: 'email_not_allowed', message: 'Tu cuenta no está autorizada para acceder a este entorno.' });
            await doSignOut();
            setUser(null);
            setUserData(null);
            setLoading(false);
            return;
          }
          // Seat reservation (first-time users) and base profile
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
          // Ensure profile exists/updates
          await upsertUserProfile(u.uid, { email: u.email || null, displayName: u.displayName || null });
          dlog('[auth] upsertUserProfile ok');
          // Owners pueden omitir el binding de escritorio
          const owner = await isOwnerEmail(u.email || '');
          dlog('[auth] isOwnerEmail', { owner });
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
