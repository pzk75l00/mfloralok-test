# Plan de Mejora de Autenticación y Autorización

Estado actual (baseline):
- Login simple email/clave (`LoginForm.js` + Firebase Auth).
- Registro vía `registerUser` que crea documento en `users/{uid}` con rol simple (`rol: 'usuario'|...'`).
- No existe aún un contexto global centralizado (AuthProvider) consolidando `user + profile`.
- Reglas Firestore pendientes de endurecer para roles y campos críticos (no analizadas aquí en detalle).
- No hay separación clara entre "zona de negocio" y preferencias de usuario en perfil.
- No hay auditoría de inicio/cierre de sesión.

## Objetivos por fases

### Fase 1: Contexto y Perfil
1. Crear `src/context/AuthProvider.jsx` que:
   - Escuche `onAuthStateChanged`.
   - Cargue `users/{uid}` al iniciar (perfil) y exponga `{ user, profile, loading }`.
2. Reemplazar usos directos de `getAuth()` en componentes por el contexto.
3. Añadir indicador de carga y protección inicial de rutas/paneles (render condicional).

### Fase 2: Roles y Permisos
1. Definir roles base: `admin`, `operador`, `consulta`.
2. Ampliar documento de usuario:
   ```json
   {
     "uid": "...",
     "email": "...",
     "rol": "admin|operador|consulta",
     "active": true,
     "allowedLocations": ["sucursal", "deposito"],
     "preferredTimeZone": "America/Argentina/Buenos_Aires",
     "modules": ["ventas","inventario"],
     "creado": "ISO",
     "ultimoLogin": "ISO"
   }
   ```
3. Componente/Hook `useCan(permission)` que resuelve permiso a partir de rol (tabla interna) y módulos habilitados.
4. UI: ocultar/inhabilitar botones críticos si `!useCan('movement:create')` etc.

### Fase 3: Reglas Firestore (Esqueleto sugerido)
Ejemplo conceptual (no definitivo):
```
match /databases/{db}/documents {
  function isAuth() { return request.auth != null; }
  function userDoc(uid) { return get(/databases/$(db)/documents/users/$(uid)); }
  function userData() { return userDoc(request.auth.uid).data; }
  function hasRole(r) { return isAuth() && userData().rol == r; }
  function isActive() { return isAuth() && userData().active == true; }

  match /users/{uid} {
    allow read: if isAuth() && (request.auth.uid == uid || hasRole('admin'));
    allow write: if hasRole('admin');
  }

  match /movements/{id} {
    allow read: if isActive();
    allow create: if isActive() && (hasRole('admin') || hasRole('operador'));
    allow update, delete: if hasRole('admin');
  }
}
```
Ajustar luego a restricciones adicionales (ej. allowedLocations).

### Fase 4: Auditoría y Seguridad Adicional
1. Colección `loginEvents`:
   - Campos: `{ uid, ts, userAgent, ipHash }` (ipHash: hash SHA-256 parcial del IP si se obtiene vía Cloud Function HTTP callable).
2. Actualizar `ultimoLogin` en `users/{uid}` tras login exitoso.
3. Agregar flag `forcePasswordReset` para forzar flujo de cambio de clave (mostrar modal tras login).
4. Opción de `reauthenticate` para operaciones críticas (borrar movimientos en bloque, modificar roles).

### Fase 5: Configurabilidad y Multi-Tenant Futuro
1. Colección `settings` o `tenants/{tenantId}/settings` (si multi-tenant en roadmap) con:
   ```json
   {
     "businessTimeZone": "America/Argentina/Buenos_Aires",
     "allowedModules": ["ventas","inventario","reportes"],
     "auth": { "requireEmailVerified": false }
   }
   ```
2. Al iniciar AuthProvider, cachear settings y combinarlos con perfil usuario.

### Fase 6: Experiencia de Usuario
1. Componente `UserMenu` con dropdown: perfil, logout, rol, timezone usada.
2. Modal de cambio de contraseña (delegar a Firebase sendPasswordResetEmail para flujos "olvidé").
3. Mensajes diferenciados: usuario inactivo vs credenciales inválidas.

### Fase 7: Endurecimiento (Opcional Avanzado)
1. Rate limiting de login: Cloud Function con contador en `loginAttempt/{fingerprint}` y bloqueo temporal.
2. Detección de sesiones simultáneas si política lo requiere (campo `currentSessionId`).
3. Alertas (correo o log) ante >N intentos fallidos.
4. Integración futura con proveedores OAuth (Google) + passwordless.

## Tabla de Permisos (Inicial)
| Acción | admin | operador | consulta |
|-------|-------|----------|----------|
| Ver movimientos | ✔ | ✔ | ✔ |
| Crear movimiento | ✔ | ✔ | ✖ |
| Editar / borrar movimiento | ✔ | ✖ | ✖ |
| Ver reportes avanzados | ✔ | ✔ | (config) |
| Administrar usuarios | ✔ | ✖ | ✖ |
| Configuración negocio | ✔ | ✖ | ✖ |

Implementar como objeto en código:
```js
const ROLE_MATRIX = {
  admin: ['movement:read','movement:create','movement:update','movement:delete','users:manage','reports:advanced','settings:edit'],
  operador: ['movement:read','movement:create','reports:advanced'],
  consulta: ['movement:read']
};
```

## Pasos Concretos Iniciales (cuando retomemos)
1. Crear `AuthProvider.jsx` + hook `useAuth()`.
2. Modificar `App.js` para envolver la app con el provider.
3. Expandir registro para setear `active: true`, `allowedLocations: []`, `preferredTimeZone`.
4. Añadir actualización de `ultimoLogin` al login.
5. Escribir borrador de reglas Firestore y probar con emulador (si se configura) o en staging.
6. Reemplazar accesos directos a `getAuth()` en componentes por contexto.
7. Crear `useCan(permission)`.
8. Aplicar `useCan` en botones de creación/edición.

## Riesgos y Mitigaciones
- Riesgo: lag en cargar perfil → UI parpadea. Mitigación: estado `loadingProfile` y skeleton.
- Riesgo: reglas demasiado restrictivas rompen scripts. Mitigación: usar service account en scripts server-side.
- Riesgo: escalado multi-tenant tardío. Mitigación: desde ahora incluir campo `tenantId` (default "main").

## Métricas de Éxito
- T < 1s en obtener perfil tras login (p99).
- 0 movimientos creados por usuarios inactivos (consultar logs).
- Reglas Firestore con 100% tests de lectura/escritura esperados.

---
Este documento sirve como guía incremental; cada fase puede ser un PR independiente.
