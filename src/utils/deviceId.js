// Simple device identification helpers for binding a login to a device
// Note: This is a pragmatic approach using localStorage. For stronger assurance on desktop,
// consider WebAuthn/Passkeys in a later phase.

const STORAGE_KEY = 'mf_device_id_v1';

function randomId(n = 32) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = randomId(40);
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch (e) {
    // Fallback if storage not available
    return randomId(40);
  }
}

export function isMobileUA() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod|windows phone/.test(ua);
}

export function getDeviceInfo() {
  const isMobile = isMobileUA();
  const platform = (navigator && navigator.platform) || 'unknown';
  const deviceLabel = isMobile ? 'Mobile Web' : 'Desktop Web';
  return { isMobile, platform, deviceLabel };
}
