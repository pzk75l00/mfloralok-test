# Configuración de Autenticación y Acceso

Este proyecto está preparado para que cualquier dueño/cliente lo configure sin tocar código, usando variables de entorno y documentos de configuración en Firestore.

## 1) Variables de entorno (frontend)
Copiar `.env.example` a `.env` y completar valores del proyecto Firebase:
- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN (ej: tu-proyecto.firebaseapp.com)
- REACT_APP_FIREBASE_PROJECT_ID
- REACT_APP_FIREBASE_APP_ID
- (opcional) DATABASE_URL, STORAGE_BUCKET, MESSAGING_SENDER_ID

En Vercel, definir las mismas variables en Project Settings > Environment Variables.

## 2) Proveedor Google y dominios autorizados
En Firebase Console > Authentication:
- Sign-in method: habilitar “Google” y seleccionar el email de soporte del proyecto.
- Settings > Authorized domains: agregar dominios donde se ejecuta la app
  - Desarrollo: localhost y/o 127.0.0.1
  - Producción: el dominio final (ej. app.cliente.com)
  - Previews: dominios de previsualización que se usen (no admite comodines).

## 3) Límite de licencias (seats)
Crear/editar documento `app_config/license` en Firestore con:
```
{
  "maxUsers": 2,
  "seatsUsed": 0,
  "updatedAt": "serverTimestamp"
}
```
- Si `maxUsers` > 0, se reserva 1 asiento cuando un usuario entra por primera vez.
- Si no existe `license`, no se limita el acceso por seats.

## 4) Reglas de acceso por email/dominio (allowlist)
Crear/editar documento `app_config/auth` en Firestore con la estructura:
```
{
  "allowedEmailDomains": ["empresa.com"],
  "allowedEmails": ["owner@gmail.com"],
  "blockedEmails": ["usuario_bloqueado@empresa.com"]
}
```
- `blockedEmails`: siempre bloquea.
- Si `allowedEmails` tiene elementos, solo esos emails podrán acceder.
- Si `allowedEmails` está vacío pero `allowedEmailDomains` tiene dominios, se permite a emails de esos dominios.
- Si ambos están vacíos/no definidos, no se restringe por email.

Esto permite que un nuevo dueño controle el acceso sin cambiar código.

## 5) Dispositivos permitidos (device binding)
El primer dispositivo de escritorio queda habilitado por usuario. Si ya hay uno, nuevos escritorios quedan bloqueados por defecto (móviles no bloqueados). Los dispositivos quedan en `users/{uid}.allowedDevices`.

## 6) Huella/biometría (fase básica)
Después de iniciar sesión con Google, aparece un banner para habilitar huella en este dispositivo:
- Usa WebAuthn (sin verificación de servidor en esta fase).
- Guarda una marca local y registra `users/{uid}.biometricDevices[deviceId]`.
- Próxima fase: agregar verificación backend para login solo con huella.

## 7) Notas
- Si el login con Google redirige en móvil, asegurarse de tener el dominio en “Authorized domains”.
- El proyecto usa persistencia local: la sesión se mantiene entre reinicios del navegador.
