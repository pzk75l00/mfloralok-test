# Plan de Provisioning y Licenciamiento (Versión inicial)

> Documento vivo. Iteraremos según decisiones futuras. Fecha de creación: 2025-11-12.

## Checklist resumido (para operar YA)
- Decidir catálogo de rubros: `app_config/rubros` (doc único) vs `catalogs/rubros` (colección con metadatos).
- Definir DEMO read-only: ¿pública sin login o tras login no aprobado? Datasets por rubro.
- Provisioning Fase 1 manual: seguir los 12 pasos (sección 5) y asignar responsables por paso.
- Email de entrega: plantilla + servicio (manual por ahora, automatizable luego).
- Registro central (fábrica): esquema mínimo `tenants/{id}` con appUrl, repoUrl, ownerEmails, projectId.
- Seats: confirmar si el admin del cliente consume asiento (por defecto SÍ) y si se permiten dominios (por defecto NO).
- Upgrades: SemVer, canary en 1–2 tenants internos, y rollback al tag anterior.
- Secretos: Service Accounts con permisos mínimos y variables en hosting (no embutir secretos en binario).

## Dónde retomar mañana (tareas concretas)
1) Insertar pestaña “Fábrica / Mis Apps” en el prototipo E2E (solo visual) con lookup por email y redirección a `appUrl` simulado. Criterio: ver listado cuando un email tiene 1+ tenants.
2) Elegir almacenamiento de rubros y escribir ejemplo (2–3 rubros) en este documento. Criterio: estructura final definida y ejemplo visible.
3) Esquema del registro central de tenants (JSON de ejemplo) y campos mínimos acordados. Criterio: listado de campos y propósito.
4) Plantilla de email de entrega (texto base con variables: appUrl, email responsable). Criterio: snippet listo para copiar.
5) Alias npm para `promote-admin` y notas rápidas de uso en README. Criterio: comando probado localmente.

## 1. Situación Actual
- App monoinstancia en desarrollo (repositorio actual) con autenticación Google, dueños en `app_config/admins`, allowlist en `app_config/auth`.
- Roles: dueño (governance) vs admin/usuario (operativo) en `users/{uid}.rol`.
- Scripts seed y promoción de admin ya definidos.
- No existe hoy modelo multi-tenant ni licenciamiento por cliente.

## 2. Visión Objetivo (Per-App / Per-Tenant)
Cada cliente que compra:
- Obtiene una instancia aislada: proyecto Firebase propio (Auth/Firestore/Hosting o Vercel) + repositorio privado con SOLO binarios (no código fuente).
- Licencia sin caducidad de tipo “per-app” (compra única) + capacidad de gestionar usuarios (seats) hasta el límite comprado.
- Nosotros distribuimos upgrades mediante publicación de nuevos builds en su repo y redeploy.

## 3. Componentes de Datos por Tenant
### 3.1 Firestore Docs
1. `app_config/license`
```jsonc
{
  "model": "per-app",              // modo de licenciamiento
  "seatsPurchased": 5,              // cantidad de licencias compradas
  "seatsUsed": 3,                   // contador actual
  "salesEnabled": true,             // módulo ventas habilitado tras compra
  "activatedAt": "2025-11-12T10:00:00Z",
  "versionDeployed": "v1.0.0",     // trazabilidad de upgrades
  "suspended": false,               // bloqueo manual excepcional
  "notes": ""
}
```
2. `app_config/admins`
```jsonc
{
  "emails": { "soporte@nuestraapp.com": true, "responsable@cliente.com": true }
}
```
3. `app_config/auth`
```jsonc
{
  "allowedEmails": { "responsable@cliente.com": true, "operativo@cliente.com": true },
  "blockedEmails": {},
  "allowedEmailDomains": [] // vacío para seat estricto
}
```
4. `app_config/rubro` (o `profile/rubro`)
```jsonc
{ "rubroId": "floreria", "nombre": "Florería" }
```
5. (Opcional futuro) `app_config/migrations` para tracking de migraciones aplicadas.

### 3.2 Colección `seat_assignments` (opcional para auditoría)
Documento por email normalizado:
```jsonc
{
  "email": "operativo@cliente.com",
  "assignedAt": "2025-11-12T10:15:00Z",
  "assignedBy": "responsable@cliente.com",
  "status": "active", // active | revoked
  "notes": ""
}
```

### 3.3 Colección Prospectos / Signups
`signups/{id}` (antes de la compra):
```jsonc
{
  "comercio": "Floral SA",
  "responsableEmail": "responsable@cliente.com",
  "telefono": "+54...",
  "rubroId": "floreria",
  "status": "pending", // pending | approved | rejected
  "createdAt": "2025-11-12T09:40:00Z",
  "approvedAt": null,
  "approvedBy": null
}
```

### 3.4 Registro central de tenants (Fábrica)
Repositorio/meta fuera de cada tenant. No contiene datos del negocio, sólo metadatos para descubrir y operar instancias.

`factory/tenants/{tenantId}` ejemplo:
```jsonc
{
  "tenantId": "floral-sa",
  "projectId": "mf-floral-sa-prod",        // Firebase project
  "appUrl": "https://apps.mundofloral.com/floral-sa",
  "repoUrl": "https://github.com/factory/floral-sa-app-bin", // repo sólo binarios
  "ownerEmails": ["responsable@cliente.com"],
  "rubroId": "floreria",
  "versionDeployed": "v1.0.0",
  "seats": { "purchased": 5, "used": 0 },
  "provisioningState": "completed",        // pending | in-progress | completed | failed
  "createdAt": "2025-11-12T10:00:00Z",
  "updatedAt": "2025-11-12T10:10:00Z"
}
```

Búsqueda de “Mis Apps”: lookup por email exacto en `ownerEmails` → listar tenants con link a `appUrl`. En producción, este lookup ocurre después del login si el usuario aún no tiene un tenant activo o desea cambiar de tenant.

## 4. Flujo Alto Nivel
1. Prospecto completa formulario (se crea `signups/{id}` en entorno central o tabla CRM interna).
2. Demo de solo lectura (sin crear usuarios) accediendo a `/demo` (dataset fijo o multi-rubro selector).
3. Compra aprobada (pago o habilitación manual) → se dispara PROVISIONING.
4. Provisioning crea tenant: proyecto Firebase + reglas + seeds + repo con binario + deploy.
5. Admin (responsable) asigna seats (emails) → usuarios acceden.
6. Upgrades futuros: publicamos nueva versión binaria y redeploy en cada tenant.

## 5. Provisioning (Fase 1 Manual)
Checklist operador:
1. Crear proyecto Firebase (nomenclatura: `mf-<cliente>-prod`).
2. Activar Auth (Google) y configurar dominios.
3. Subir reglas Firestore e índices base.
4. Crear `app_config/admins`, `app_config/auth`, `app_config/license`, `app_config/rubro`.
5. Ajustar `allowedEmails` con responsable inicial.
6. Generar build (desde repo maestro) parametrizando firebaseConfig del tenant.
7. Crear repo privado cliente: `cliente-mfloral-app`.
8. Subir carpetas: `build/`, `README.md`, `VERSION`, workflow de deploy.
9. Configurar hosting (Firebase Hosting o Vercel) apuntando a repo.
10. Ejecutar deploy inicial.
11. Registrar `versionDeployed` en `app_config/license`.
12. Verificación: login del responsable y acceso a módulo ventas.

## 6. Provisioning (Fase 2 Automatizado)
Script / acción `provision-tenant`:
- Input: tenantId, responsableEmail, rubroId, seatsPurchased.
- Pasos automatizados vía API / CLI:
  1. Crear proyecto Firebase.
  2. Configurar Auth (Google) y dominios.
  3. Subir reglas / índices.
  4. Seed documentos.
  5. Construir binario (build) con configuración.
  6. Crear repo (API GitHub) y push binario.
  7. Configurar secrets (Firebase config) en el repo.
  8. Disparar deploy.
  9. Actualizar `versionDeployed` y log de provisioning.
- Output: `provisioningState='completed'` o `'failed'` (con razón).

## 7. Gestión de Seats
### Asignar
- Precondición: `seatsUsed < seatsPurchased` y email no asignado.
- Acción: añadir a `app_config/auth.allowedEmails`, crear doc en `seat_assignments`.
- Incrementar `seatsUsed` (transacción o función cloud futura).

### Revocar
- Quitar de `allowedEmails` y marcar `seat_assignments.status='revoked'`.
- Decrementar `seatsUsed`.
- (Opcional) Flag en `users/{uid}`: `disabled: true`.

### Transferir
- Revocar antiguo → Asignar nuevo.

### Auditoría
- Historial en `seat_assignments` + logs de Cloud Function (futuro) para cambios.

## 8. Reglas de Firestore (Ajustes futuros propuestos)
- `app_config/license`: sólo dueños (admins doc) pueden escribir.
- `app_config/auth`: sólo dueños pueden escribir (gestión de seats).
- `seat_assignments`: dueños pueden crear/actualizar; lectura restringida a dueños y usuarios involucrados (opcional para privacidad).
- `users/{uid}`: usuario dueño escribe su doc; dueños pueden leer/escribir cualquier doc.

## 9. Distribución de Upgrades
- Pipeline central construye versión vX.Y.Z.
- Para cada tenant activo:
  1. Reemplaza carpeta `build/` con binario nuevo.
  2. Actualiza archivo `VERSION`.
  3. Commit + tag en repo cliente.
  4. Dispara workflow de deploy.
  5. Pone `versionDeployed` en Firestore.
- Rollback: re-publicar build anterior (tag previo) siguiendo mismo flujo.

## 10. Demo Read-Only
- Ruta `/demo` servida desde entorno estático (mismo build) con flag `DEMO_MODE=true`.
- Lecturas apuntan a dataset público (colección `demo_*`) o JSON embebido.
- Sin login: no se crean usuarios ni se consumen seats.

## 11. Riesgos y Mitigaciones
| Riesgo | Mitigación |
|--------|------------|
| Provisioning falla a mitad | Campo `provisioningState` y reintento idempotente |
| Exposición accidental de código | Repos cliente sólo binarios; revisión de pipeline |
| Conteo de seats inconsistente | Uso de transacciones / función que recalcula `seatsUsed` periódicamente |
| Upgrade rompe tenant | Canary (aplicar a 1-2 tenants internos antes) + rollback rápido |
| Abuse de email asientos | Validar dominio/email, logs y revocación rápida |

## 12. Roadmap (Iterativo)
1. Documento y validación (este paso).
2. Implementar demo read-only (bandera DEMO_MODE).
3. Añadir colecciones seeds para provisioning manual.
4. Script manual de provisioning (CLI) con prompts.
5. UI interna para gestión de seats (dueños del tenant).
6. Automatización provisioning (acción GitHub / script Node integrando APIs Firebase + GitHub).
7. Pipeline de upgrades multi-tenant.
8. Auditoría y métricas (migraciones, versions, seats libres).

## 13. Próximas Decisiones Pendientes
- Definir catálogo de rubros definitivo y dónde almacenarlo (`app_config/rubros` vs `catalogs/rubros`).
- Confirmar si el admin del cliente consume seat (por defecto: sí).
- Política de suspensión (`suspended=true`): proceso y motivo.
- Formato de versionado (SemVer adoptado vX.Y.Z).

## 14. Glosario
- Tenant: instancia aislada (proyecto Firebase + hosting + repo binario).
- Seat: permiso de acceso para un email.
- Dueño (owner): listado en `app_config/admins` del tenant; controla seats y config.
- Admin (operativo): usuario con rol 'admin' en `users/{uid}` (consumidor de seat).

---
Fin de versión inicial. Ajustar según feedback.
