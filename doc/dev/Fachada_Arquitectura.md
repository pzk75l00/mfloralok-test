# Arquitectura de Fachada (Facade) — Resumen Técnico

La fachada abstrae el acceso a servicios (Auth, Firestore y lógica de negocio), para que las vistas/pantallas dependan de contratos estables y no de implementaciones concretas.

## Objetivos
- Reducir acoplamiento entre UI y servicios.
- Centralizar validaciones, manejo de errores y mensajes.
- Habilitar reemplazo/escala (p. ej., mover partes a Functions) sin romper pantallas.

## Ubicación y módulos actuales (referencia)
- `src/auth/authService.js` — fachada práctica para autenticación/owners/dispositivo/seats.
- `src/auth/AuthProvider.js` — orquestación de sesión y render según estado.
- `src/utils/deviceId.js` — utilidades de identificación de dispositivo.
- `src/firebase/firebaseConfig.js` — inicialización de Firebase/Firestore.

## Contratos sugeridos (interfaces)
```ts
// Auth
signInWithGoogle(): Promise<User>
checkRedirectResult(): Promise<User | null>
signOut(): Promise<void>

// Owners
isOwnerEmail(email: string): Promise<boolean>

// Seats
reserveSeatIfNeeded(user: User): Promise<void>

// Dispositivo
registerDeviceIfNeeded(user: User, deviceInfo: DeviceInfo): Promise<{ allowed: boolean, reason?: string }>
```

Notas:
- Las pantallas deberían usar estos contratos, no Firebase directamente.
- Errores deben mapearse a códigos/mensajes amigables (ej.: `auth/popup-closed`, `device/not-authorized`).

## Roles y Gobernanza

- Creadores/Owners (producto):
	- Definen el Administrador de cada instancia/cliente.
	- Pueden intervenir en configuración sensible (no expuesta al cliente) y poseen bypass técnico cuando haga falta.
- Administrador (cliente):
	- Usa/configura/edita lo operativo; NO crea ni modifica otros administradores.
	- Da de alta usuarios finales hasta el tope de asientos/licencias.
- Usuarios (operación):
	- Operan ventas, compras, inventario, reportes según permisos asignados por el Administrador.

Licenciamiento y asientos (seats):
- La reserva/validación de asientos debe ejecutarse en backend (Cloud Functions) y auditarse.
- El Administrador no puede exceder el cupo; los Creadores pueden modificar cupos/licencias.

Autorización de dispositivos (escritorio):
- Primer escritorio del Administrador: autorizado automáticamente en su primer login (si el correo coincide con el Administrador designado).
- Escritorios adicionales: requieren autorización explícita (definir flujo UI/FA en siguiente iteración); bloquear por defecto.
- En móvil NO se aplica vinculación de dispositivo; la política de dispositivos rige solo para escritorio.

## Flujo de Login (alto nivel)
1. `signInWithGoogle()` (popup/redirect) → `User`.
2. Allowlist: validar en `app_config/auth` (`allowedEmails`, `allowedEmailDomains`, `blockedEmails`).
3. `isOwnerEmail(user.email)` → owners pueden saltar vinculación.
4. `reserveSeatIfNeeded(user)` → reserva de asiento/licencia si aplica.
5. `registerDeviceIfNeeded(user, deviceInfo)` → bloquea/es permite escritorio (no aplica en móvil).
6. UI: si bloqueado, se muestra modal; si ok, render de la app. En móvil, si denegado por allowlist, se muestra `MobileAuthErrorModal`.

## Registros y seguridad
- `app_config/admins`: owners (lectura y escritura: solo owners; correos en minúsculas).
- `app_config/auth`: allowlist de login (lectura: app; escritura: solo owners).
- Reglas en `firestore.rules` para mantener invariante de seguridad.
- Evitar exponer lógica sensible en el cliente; plan de migración a Functions para operaciones críticas (seats, whitelists).

## Roadmap de la fachada
- Extraer contratos a módulo `src/facade/index.ts` (o .js) y exportar tipos comunes.
- Agregar capa de “métricas/telemetría” (eventos de login, bloqueos de dispositivo).
- Mover `reserveSeatIfNeeded` y `registerDeviceIfNeeded` a Cloud Functions (seguridad/atomicidad).
- Tests unitarios de contratos (mocks de Firebase) y de mapeo de errores.

Más sobre exportabilidad e integración: ver `doc/dev/Exportabilidad_y_Integracion.md`.

## Fachadas de configuración (split propuesto)

Motivación: separar responsabilidades y evitar que clientes finales gestionen configuración sensible de usuarios/sistema.

- Fachada de Configuración de Creadores (owners)
	- Alcance: owners y equipo de producto.
	- Operaciones: gestión de owners, reglas de autorización, licencias/seats, parámetros globales.
	- Seguridad: solo backend (Cloud Functions) y UI restringida; nunca expuesta a clientes.

- Fachada de Configuración de Cliente (instancia)
	- Alcance: administradores de la tienda/cliente.
	- Operaciones: preferencias no sensibles (por ejemplo, branding menor, opciones de interfaz).
	- Seguridad: sin acceso a usuarios/roles globales; lectura acotada; escrituras validadas.

Reglas:
- Ninguna operación de owners debe estar disponible en el cliente sin control de backend.
- Las Firestore rules deben reflejar claramente esta separación.

## Referencias
- Documentación de reglas en `firestore.rules`.
- Guía rápida: `doc/Guia_Rapida_Login_y_Fachada.md`.
- Manual de usuario: `doc/Manual_Usuario_MundoFloral.md`.
 - Panel de debug en UI: `src/components/Shared/DebugPanel.js` (activar con `?debug=1`).
