# Mundo Floral — App de Gestión (DEV)

Aplicación React + Firebase para inventario, ventas, caja y reportes.

Documentación clave:
- doc/Guia_Usuario_MundoFloral.md — Manual de usuario
- doc/dev/Implementacion_Cliente_Paso_a_Paso.md — Guía de implementación (interno)
- doc/Guia_Rapida_Login_y_Fachada.md — Login, allowlist y política de dispositivos
- doc/dev/Fachada_Arquitectura.md — Contratos de fachada y gobernanza

Entorno:
- Variables unificadas en `.env` con prefijo `REACT_APP_FIREBASE_*` (ver `.env.example`)
- No commitear `.env` reales

## Autenticación y acceso

- Proveedor: Google (Firebase Auth)
- Allowlist: Firestore `app_config/auth` con `allowedEmails`, `allowedEmailDomains`, `blockedEmails`.
- Owners: Firestore `app_config/admins` (solo lectura/escritura por owners; correos en minúsculas).
- Dispositivos: vinculación solo en Escritorio; excluido en Móvil.

## Scripts de seeding (Node)

- Owners (admins): `node scripts/seed-admins.js "correo1@example.com,correo2@example.com"`
- Allowlist: `node scripts/seed-auth-allowlist.js --emails "correo1@example.com,correo2@example.com" --domains "dominio.com"`

Requiere Service Account local (no se versiona). Configurar ruta mediante `GOOGLE_APPLICATION_CREDENTIALS` o `.env` apuntando a `Keys/serviceAccount.json`.

## Despliegue

- Frontend: Vercel (push a `main` dispara build y deploy)
- Reglas de Firestore: desplegar con Firebase CLI desde este repo (no via Vercel)

## Debug

- Agregar `?debug=1` a la URL para ver el panel de depuración (`src/components/Shared/DebugPanel.js`).
- Útil para seguir inicio de sesión, allowlist, owners, seats y dispositivos.
