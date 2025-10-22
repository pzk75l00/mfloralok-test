/*
Automatiza configuración básica de Firebase Auth vía Google Identity Toolkit Admin API:
- Habilitar Google como proveedor
- Asegurar dominio 'localhost' en Authorized domains

Requisitos:
- Tener GOOGLE_APPLICATION_CREDENTIALS apuntando a un Service Account con permisos de edición del proyecto.
- Tener habilitado el API: Identity Toolkit API (identitytoolkit.googleapis.com) en el proyecto.

Uso:
  npm run setup:firebase-auth

Variables:
- FIREBASE_PROJECT_ID (o REACT_APP_FIREBASE_PROJECT_ID)
- EXTRA_AUTHORIZED_DOMAINS (opcional, separados por coma)
*/

const { GoogleAuth } = require('google-auth-library');
const fetch = require('node-fetch');

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.REACT_APP_FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.log('[setup:firebase-auth] FIREBASE_PROJECT_ID no definido. Usá .env o variable de entorno.');
    return;
  }
  const extraDomains = (process.env.EXTRA_AUTHORIZED_DOMAINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const desiredDomains = Array.from(new Set(['localhost', ...extraDomains]));

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
  let client;
  try {
    client = await auth.getClient();
  } catch (e) {
    console.log('[setup:firebase-auth] No se obtuvo credencial. Definí GOOGLE_APPLICATION_CREDENTIALS con un Service Account válido.');
    return;
  }
  const token = await client.getAccessToken();

  // 1) Leer configuración actual
  const getUrl = `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/config`;
  const headers = { 'Authorization': `Bearer ${token.token}`, 'Content-Type': 'application/json' };
  const current = await fetch(getUrl, { headers }).then(r => r.json());

  // 2) Construir nueva configuración
  const authorizedDomains = Array.from(new Set([...(current.authorizedDomains || []), ...desiredDomains]));

  // idpConfig para Google
  const googleProviderId = 'google.com';
  const idpConfig = (current.signIn && current.signIn.idpConfig) ? [...current.signIn.idpConfig] : [];
  const idx = idpConfig.findIndex(p => p.provider === googleProviderId);
  if (idx >= 0) {
    idpConfig[idx] = { ...idpConfig[idx], enabled: true };
  } else {
    idpConfig.push({ provider: googleProviderId, enabled: true });
  }

  const body = {
    authorizedDomains,
    signIn: {
      ...current.signIn,
      idpConfig
    }
  };

  // 3) Enviar update con updateMask para dominios e idpConfig
  const masks = ['authorizedDomains', 'signIn.idpConfig'];
  const patchUrl = `${getUrl}?updateMask=${encodeURIComponent(masks.join(','))}`;
  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[setup:firebase-auth] Error al actualizar config:', res.status, txt);
    console.log('Sugerencia: verificá que el API Identity Toolkit esté habilitado y que el Service Account tenga permisos.');
    return;
  }

  console.log('[setup:firebase-auth] Actualizado correctamente: Google habilitado y dominios:', authorizedDomains.join(', '));
}

main().catch(e => {
  console.error('[setup:firebase-auth] Error inesperado:', e);
});
