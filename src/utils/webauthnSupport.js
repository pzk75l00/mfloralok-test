// Utilidades para detectar soporte de WebAuthn/Passkeys
// No realiza registro ni autenticación: solo diagnóstico de capacidades.

export async function detectWebAuthnSupport() {
  const res = {
    supported: false,
    platformAuthenticatorAvailable: false,
    conditionalMediationAvailable: false,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    isMobileApprox: false
  };

  try {
    const hasPKC = typeof window !== 'undefined' && 'PublicKeyCredential' in window;
    if (!hasPKC) return res;
    res.supported = true;

    // ¿El dispositivo tiene autenticador de plataforma (ej. Touch ID / Windows Hello / Android biométrico)?
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      try {
        res.platformAuthenticatorAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch (_) { /* noop */ }
    }

    // ¿El navegador soporta Passkeys con mediación condicional?
    if (typeof PublicKeyCredential.isConditionalMediationAvailable === 'function') {
      try {
        res.conditionalMediationAvailable = await PublicKeyCredential.isConditionalMediationAvailable();
      } catch (_) { /* noop */ }
    }

    const ua = res.userAgent.toLowerCase();
    res.isMobileApprox = /(android|iphone|ipad|ipod|mobile)/.test(ua);
  } catch (_) {
    // swallow
  }

  return res;
}
