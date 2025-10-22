import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { subscribeAuth, ensureLocalPersistence, signOut as doSignOut, getUserProfile, upsertUserProfile, registerDeviceIfNeeded, reserveSeatIfNeeded, isEmailAllowed } from './authService';

const AuthContext = createContext({ user: null, userData: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children, enforceDesktopBinding = true }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsub = () => {};
    (async () => {
      await ensureLocalPersistence();
      unsub = subscribeAuth(async (u) => {
        setLoading(true);
        setUser(u);
        if (u) {
          // Reglas de acceso por email/dominio (configurable en Firestore app_config/auth)
          const allowed = await isEmailAllowed(u.email || '');
          if (!allowed) {
            await doSignOut();
            setUser(null);
            setUserData(null);
            setLoading(false);
            alert('Tu cuenta no está autorizada para acceder a este entorno.');
            return;
          }
          // Seat reservation (first-time users) and base profile
          try {
            await reserveSeatIfNeeded(u.uid, { email: u.email || null, displayName: u.displayName || null });
          } catch (e) {
            if (String(e.message) === 'license_limit_reached') {
              await doSignOut();
              setUser(null);
              setUserData(null);
              setLoading(false);
              alert('Límite de usuarios alcanzado. Contacte al administrador.');
              return;
            }
          }
          // Ensure profile exists/updates
          await upsertUserProfile(u.uid, { email: u.email || null, displayName: u.displayName || null });
          // Device binding check/registration
          const deviceRes = await registerDeviceIfNeeded(u.uid, { enforceDesktopBinding });
          if (!deviceRes.ok) {
            // Not allowed, force sign out and show info
            await doSignOut();
            setUser(null);
            setUserData(null);
            setLoading(false);
            alert('Este dispositivo de escritorio no está autorizado para este usuario. Contacte al administrador.');
            return;
          }
          const fresh = await getUserProfile(u.uid);
          setUserData(fresh);
        } else {
          setUserData(null);
        }
        setLoading(false);
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

AuthProvider.propTypes = {
  children: PropTypes.node,
  enforceDesktopBinding: PropTypes.bool,
};
