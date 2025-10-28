# Auto-setup: Google/Firebase/Vercel (Roadmap)

Objetivo: automatizar el 80–90% del alta de un entorno nuevo (test/prod) sin tocar este repo de la app. Se haría en un repo separado (p.ej. `mfloralok-setup`) con scripts de Node/TypeScript.

## Alcance y límites
- Sí automatizamos:
  - Habilitar APIs de Google necesarias (Identity Toolkit, Firebase, Firestore Rules, Hosting opcional)
  - Crear o recuperar la Web App de Firebase (API Key, App ID, Project ID)
  - Configurar Authentication (enable Google, Authorized Domains)
  - Cargar variables REACT_APP_FIREBASE_* en Vercel (API) y lanzar redeploy
  - Verificaciones y reporte final (client_id activo, dominios, reglas, variables)
- No totalmente automatizable (manual guiado):
  - OAuth Consent Screen (Google) – requiere UI humana
  - Creación del OAuth Client ID genérico de “APIs & Services → Credentials” (no hay API pública estable). Alternativas:
    1) Usar credenciales administradas por Firebase (recomendado para automatización)
    2) Crear el client de forma manual y pasar `OAUTH_CLIENT_ID`/`OAUTH_CLIENT_SECRET` al script

## Entradas (archivo .env en el repo de setup)
- `GOOGLE_APPLICATION_CREDENTIALS=/ruta/al/service-account.json`
- `GCP_PROJECT_ID=mruh-30b1e`
- `GCP_PROJECT_NUMBER=939417373841` (opcional, se puede resolver por API)
- `FIREBASE_WEB_APP_NAME=MundoFloral Web` (si no existe, la crea)
- `AUTHORIZED_DOMAINS=mfloralok-test.vercel.app,localhost,127.0.0.1`
- `USE_OWN_OAUTH_CLIENT=false` (true sólo si se proveen)
- `OAUTH_CLIENT_ID=` (opcional)
- `OAUTH_CLIENT_SECRET=` (opcional)
- `VERCEL_TOKEN=xxxxx`
- `VERCEL_ORG_ID=org_xxx`
- `VERCEL_PROJECT_ID=prj_xxx`
- `VERCEL_ENV=production` (o `preview`/`development`)

## Pasos del script (propuestos)
1) Autenticación y verificación de proyecto
   - Comprobar SA, project ID/number, permisos
2) Habilitar APIs (idempotente)
   - `identitytoolkit.googleapis.com`
   - `firebaserules.googleapis.com`
   - `firebase.googleapis.com`
3) Firebase Web App
   - Si no existe: crear `projects/{project}/webApps`
   - Obtener: `apiKey`, `appId`, `projectId`, `messagingSenderId`
4) Authentication
   - Leer config: `GET https://identitytoolkit.googleapis.com/v1/projects/{projectId}/config`
   - PATCH con `authorizedDomains` (agrega dominios) y `signIn.idpConfig` para habilitar `google.com`
   - Si `USE_OWN_OAUTH_CLIENT=true`: dejar nota de paso manual en consola Firebase para pegar client ID/secret (no hay API pública estable para eso)
5) Vercel – variables de entorno
   - PUT/POST variables: `REACT_APP_FIREBASE_API_KEY`, `REACT_APP_FIREBASE_AUTH_DOMAIN`, `REACT_APP_FIREBASE_DATABASE_URL`, `REACT_APP_FIREBASE_PROJECT_ID`, `REACT_APP_FIREBASE_STORAGE_BUCKET`, `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`, `REACT_APP_FIREBASE_APP_ID`
   - Trigger redeploy del proyecto/entorno indicado
6) Reporte final
   - Mostrar checklist de: dominios autorizados, proveedor Google habilitado, client_id activo (si se usa propio), variables en Vercel aplicadas, URL de deploy

## Esqueleto de comandos (Node/TS)
- `setup/google/enable-apis.ts`
- `setup/firebase/create-web-app.ts`
- `setup/firebase/auth-config.ts` (Identity Toolkit get/patch)
- `setup/vercel/set-envs.ts` (Vercel REST API)
- `setup/report.ts`
- `index.ts` (orquestador, con `yargs` o `commander`)

## Contratos
- Input: .env con credenciales y parámetros
- Output: JSON de resultado + log en consola
- Errores esperados: permisos insuficientes, API no habilitada, proyecto incorrecto, variables faltantes, rate limits

## Edge cases a cubrir
- OAuth client inexistente cuando `USE_OWN_OAUTH_CLIENT=true` → abortar con mensaje claro
- Dominio ya presente → idempotencia (no duplicar)
- Vercel variables existentes → actualizar/crear según corresponda
- Web App ya creada → reutilizar

## Roadmap de implementación
- Fase 1 (1–2 h): prototipo mínima – Identity Toolkit (enable Google + domains), Vercel envs, redeploy
- Fase 2 (2–3 h): creación/obtención de Firebase Web App por API, reporte consolidado
- Fase 3 (manual asistido): guía interactiva para Consent Screen y pegado de OAuth client en Firebase, con validaciones

## Notas de seguridad
- No guardar secrets en repos; usar `.env` y almacenar `service-account.json` fuera del VCS
- Limitar el SA a permisos mínimos (Editor + Firebase Admin si se requiere crear web apps)
- Rotar tokens de Vercel periódicamente
