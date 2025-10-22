import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut as fbSignOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { db } from '../firebase/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { getOrCreateDeviceId, getDeviceInfo, isMobileUA } from '../utils/deviceId';

const auth = getAuth();

// Ensure local persistence so session survives app/browser restarts
export async function ensureLocalPersistence() {
  await setPersistence(auth, browserLocalPersistence);
}

export function subscribeAuth(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signInEmailPassword(email, password) {
  await ensureLocalPersistence();
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signInWithGoogle({ preferRedirectForMobile = true } = {}) {
  await ensureLocalPersistence();
  const provider = new GoogleAuthProvider();
  // provider.setCustomParameters({ prompt: 'select_account' }); // opcional
  if (preferRedirectForMobile && isMobileUA()) {
    await signInWithRedirect(auth, provider);
    return null; // redirect flow
  }
  try {
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (e) {
    const code = String(e?.code || '');
    // Fallback a redirect si el popup está bloqueado o hay conflicto de popups
    if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e;
  }
}

export async function signOut() {
  await fbSignOut(auth);
}

export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function upsertUserProfile(uid, base = {}) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const payload = { uid, updatedAt: serverTimestamp(), ...base };
  if (snap.exists()) {
    await updateDoc(ref, payload);
  } else {
    await setDoc(ref, { createdAt: serverTimestamp(), rol: 'usuario', modules: ['basico'], ...payload });
  }
}

// Device binding helpers
export async function registerDeviceIfNeeded(uid, { enforceDesktopBinding = true } = {}) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  const deviceId = getOrCreateDeviceId();
  const info = getDeviceInfo();

  const data = snap.exists() ? snap.data() : {};
  const allowed = data.allowedDevices || {};

  const isDesktop = !isMobileUA();

  if (allowed[deviceId]) {
    // update lastSeen
    await updateDoc(ref, { [`allowedDevices.${deviceId}.lastSeenAt`]: serverTimestamp() });
    return { ok: true, deviceId, allowed: true };
  }

  if (isDesktop && enforceDesktopBinding) {
    // If there is already at least one desktop device registered, block new desktop by default
    const hasAnyDesktop = Object.values(allowed).some(d => d.isDesktop);
    if (hasAnyDesktop) {
      return { ok: false, reason: 'desktop_not_allowed', deviceId };
    }
  }

  // Register this device
  await upsertUserProfile(uid, {
    [`allowedDevices.${deviceId}`]: {
      isDesktop,
      name: info.deviceLabel,
      userAgent: navigator.userAgent || '',
      createdAt: serverTimestamp(),
      lastSeenAt: serverTimestamp(),
    }
  });

  return { ok: true, deviceId, allowed: true, registered: true };
}

// License seat reservation (Fase A: en cliente, con transacción Firestore)
// - Si el usuario no existe, intenta reservar un asiento según app_config/license
// - Si no hay license o no tiene maxUsers, no aplica límite
export async function reserveSeatIfNeeded(uid, { email = null, displayName = null } = {}) {
  const userRef = doc(db, 'users', uid);
  const licRef = doc(db, 'app_config', 'license');

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (userSnap.exists()) {
      // Ya existe usuario: no consumir asiento nuevo
      return;
    }
    const licSnap = await tx.get(licRef);
    if (licSnap.exists()) {
      const lic = licSnap.data() || {};
      const maxUsers = Number(lic.maxUsers ?? 0);
      const seatsUsed = Number(lic.seatsUsed ?? 0);
      if (maxUsers > 0 && seatsUsed >= maxUsers) {
        throw new Error('license_limit_reached');
      }
      // Crear usuario y aumentar contador
      tx.set(userRef, {
        uid,
        email,
        displayName,
        rol: 'usuario',
        modules: ['basico'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      tx.update(licRef, { seatsUsed: increment(1), updatedAt: serverTimestamp() });
    } else {
      // Sin license: permitir creación sin límite
      tx.set(userRef, {
        uid,
        email,
        displayName,
        rol: 'usuario',
        modules: ['basico'],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  });
}

// Email allowlist/deny rules from Firestore: app_config/auth
// Structure example:
// { allowedEmailDomains: ["empresa.com"], allowedEmails: ["dueño@gmail.com"], blockedEmails: [] }
export async function isEmailAllowed(email) {
  if (!email) return true; // Si no hay email (caso raro), no bloquear
  try {
    const ref = doc(db, 'app_config', 'auth');
    const snap = await getDoc(ref);
    if (!snap.exists()) return true;
    const cfg = snap.data() || {};
    const { allowedEmailDomains = [], allowedEmails = [], blockedEmails = [] } = cfg;
    const normalized = String(email).toLowerCase();
    if (blockedEmails.some(e => String(e).toLowerCase() === normalized)) return false;
    if (allowedEmails.length > 0) {
      return allowedEmails.some(e => String(e).toLowerCase() === normalized);
    }
    if (allowedEmailDomains.length > 0) {
      const domain = normalized.split('@')[1] || '';
      return allowedEmailDomains.some(d => String(d).toLowerCase() === domain);
    }
    return true;
  } catch (e) {
    // En caso de error, permitir para no bloquear acceso por config rota
    return true;
  }
}

// Verificar si hubo resultado/errores del flujo por redirección (móvil)
export async function checkRedirectResult() {
  try {
    await getRedirectResult(auth);
    return { ok: true };
  } catch (e) {
    throw e;
  }
}
