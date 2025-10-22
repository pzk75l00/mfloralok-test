import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, signOut as fbSignOut, GoogleAuthProvider, signInWithPopup, signInWithRedirect, onAuthStateChanged } from 'firebase/auth';
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
  if (preferRedirectForMobile && isMobileUA()) {
    await signInWithRedirect(auth, provider);
    return null; // redirect flow
  }
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
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
