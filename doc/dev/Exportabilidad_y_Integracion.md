# Exportabilidad e Integración — Blueprint

Objetivo: que la capa de acceso (fachadas), usuarios/permisos y la configuración sean reutilizables en futuros desarrollos, con límites de seguridad claros y contratos estables.

## 1) Contratos primero (Interfaces)
- Definir interfaces públicas por dominio (Auth, Owners, Seats, Dispositivo, Config-Cliente):
  - Auth: signInWithGoogle, signOut, onAuthStateChanged
  - Owners: isOwnerEmail, listOwners (solo backend), add/remove (solo owners)
  - Seats: reserveSeat, releaseSeat, getSeatUsage (backend)
  - Dispositivo: registerDevice, isDeviceAllowed
  - Config-Cliente: getPreferences, updatePreferences (no sensible)
- Documentar entradas/salidas, códigos de error y precondiciones.

## 2) Adaptadores (Firebase hoy, otros mañana)
- Patrón Adapter: implementaciones para Firebase (Web SDK y Functions) detrás de las interfaces.
- No filtrar objetos crudos de Firebase a la UI: mapear a tipos propios.
- A futuro: agregar adaptadores (REST, GraphQL, Supabase) sin tocar pantallas.

## 3) Empaquetado y versionado
- Extraer `src/facade` a un paquete interno (monorepo) o carpeta `packages/core-facade`:
  - core-facade (interfaces + tipos + utilitarios comunes)
  - firebase-adapter (impl. actual)
  - web-ui-wiring (composición con React)
- Versionado semántico (semver) del paquete: breaking/minor/patch.
- CHANGELOG y política de deprecación (grace period y migración).

## 4) Seguridad y límites
- Operaciones sensibles (owners, seats, whitelists) EXCLUSIVAMENTE en backend (Cloud Functions / API), nunca directo desde cliente.
- Reglas de Firestore como última línea de defensa; la fachada no "abre" permisos.
- Auditoría: logs write-only de acciones sensibles, con trazabilidad de usuario y timestamp.

## 5) Configuración y despliegue
- Config de proyecto vía .env y/o `app_config/*` en Firestore:
  - app_config/admins (owners): lectura autenticados, escritura solo owners.
  - app_config/auth / license / prefs: separar por sensibilidad.
- Scripts de autosetup (sembrado de admins, reglas, envs Vercel) como CLI reutilizable.
- Evitar hardcodes de dominios/clients; usar parámetros y plantillas.

## 6) Roles y permisos extensibles
- Modelo base: Creator/Owner, Admin (cliente), User.
- Extensible por capacidades: `canManageUsers`, `canConfigureStore`, `canViewReports`, etc.
- Evaluación de permisos en fachada + refuerzo en backend.

## 7) Datos y migraciones
- Esquema versionado (app_config/schemaVersion) y migradores idempotentes.
- Cantidades y montos en enteros base (evitar floats); reglas de redondeo centralizadas.
- Estrategia de índices y límites de lectura para escalar.

## 8) Testing y contratos
- Contract tests para cada interfaz (con mocks y con adapter real en entorno de prueba).
- E2E mínimos para flujos críticos: login, seat, device auth.
- Checklists de errores esperables y mensajes de usuario.

## 9) Integración en terceros
- Opción A: publicar `core-facade` como paquete npm privado (o GitHub Packages).
- Opción B: exponer una API HTTP/GraphQL sobre las mismas interfaces (para apps no-React).
- Documentación de endpoints/contratos y ejemplos.

## 10) Roadmap de extracción
- Fase 1: formalizar interfaces y tipos en `src/facade` (sin cambiar lógica).
- Fase 2: mover funciones sensibles a Cloud Functions y consumirlas vía fachada.
- Fase 3: extraer a `packages/core-facade` + `firebase-adapter` y publicar internamente.
- Fase 4: guía de integración (README) y ejemplo mínimo (playground) para futuros proyectos.

Referencias
- `doc/dev/Fachada_Arquitectura.md` (visión actual)
- `doc/Guia_Rapida_Login_y_Fachada.md` (uso y gobernanza)
- Scripts de autosetup: `scripts/autosetup/*`
