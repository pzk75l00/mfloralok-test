# Diseño de Paquetes y Tenants

## Objetivo
Definir un modelo escalable para planes ("paquetes") y tenants futuros que permita:
- Asignar límites (seats, productos, almacenamiento) y features (reportes avanzados, multicurrency, etc.).
- Gestionar trials (días por paquete) y upgrades/downgrades.
- Consolidar métricas sin exponer datos sensibles.
- Extender a multi–proyecto (control plane vs data plane) si se requiere.

## Colecciones Principales
### packages
Catálogo estático/versionado de paquetes disponibles.
Documento ejemplo (`packages/basic`):
```json
{
  "code": "basic",
  "name": "Básico",
  "tier": 1,
  "active": true,
  "trialDaysDefault": 7,
  "seatLimit": 3,
  "limits": {"plantsMax": 500, "storageMB": 200, "usersMax": 5},
  "features": {
    "advancedReports": false,
    "multiCurrency": false,
    "externalIntegrations": false,
    "supportPriority": "standard"
  },
  "pricing": {"period": "monthly", "priceCents": 0, "currency": "ARS"},
  "schemaVersion": 1,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```
Otro paquete (`packages/pro`):
```json
{
  "code": "pro",
  "name": "Profesional",
  "tier": 2,
  "active": true,
  "trialDaysDefault": 14,
  "seatLimit": 10,
  "limits": {"plantsMax": 5000, "storageMB": 1024, "usersMax": 50},
  "features": {
    "advancedReports": true,
    "multiCurrency": true,
    "externalIntegrations": true,
    "supportPriority": "fast"
  },
  "pricing": {"period": "monthly", "priceCents": 79900, "currency": "ARS"},
  "schemaVersion": 1,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp"
}
```

### tenants
Representa una instancia lógica (hoy implícito, mañana explícito). Documento ejemplo (`tenants/tenant_abc123`):
```json
{
  "tenantId": "tenant_abc123",
  "displayName": "Florería Las Rosas",
  "ownerEmail": "owner@lasrosas.com",
  "packageCode": "basic",
  "seatLimitOverride": null, // si != null reemplaza seatLimit del paquete
  "trialEndsAt": 1732838400000, // epoch ms
  "activatedAt": 1732233600000, // inicio real
  "upgradedAt": null,
  "billingStatus": "trial", // trial|active|past_due|cancelled
  "featuresEffective": {"advancedReports": false, ...},
  "limitsEffective": {"plantsMax": 500, ...},
  "seatsUsed": 2,
  "seatsReserved": 3,
  "createdAt": "serverTimestamp",
  "updatedAt": "serverTimestamp",
  "schemaVersion": 1
}
```

## Derivación de Configuración
1. Al crear tenant: leer paquete por `packageCode`.
2. Construir `featuresEffective = package.features` y `limitsEffective = package.limits`.
3. `seatLimit = seatLimitOverride ?? package.seatLimit`.
4. `trialEndsAt = now + package.trialDaysDefault` (si se crea en trial).
5. Guardar documento `tenants/{id}`.

## Flujo Trial → Activación
- Mientras `now < trialEndsAt` y `billingStatus == 'trial'` permitir seats limitados.
- Al confirmar compra: set `billingStatus = 'active'`, opcional `upgradedAt = now`.
- Si expira: `billingStatus = 'cancelled'` o `past_due`; disparar Cloud Function que marca usuarios en estado `expirado`.

## Upgrade / Downgrade
- Upgrade: cambiar `packageCode`, recalcular `featuresEffective`, `limitsEffective`, ajustar `seatLimit` (validar seats usados <= nuevo límite).
- Downgrade: bloquear si `seatsUsed > nuevoSeatLimit`; requerir reducir usuarios antes.
- Registrar nota de auditoría en `tenant_events` colección:
```json
{ "tenantId": "tenant_abc123", "at": 1732300000000, "actor": "owner@system", "type": "package_change", "from": "basic", "to": "pro" }
```

## Métricas y Control Plane
Para panel de creadores sin entrar al tenant:
- `metrics_daily/{tenantId}_{YYYYMMDD}` con snapshot diario (Cloud Function programada).
- `metrics_seats/{tenantId}` documento resumido actualizado en cada cambio de asiento.
Ejemplo `metrics_daily`:
```json
{
  "tenantId": "tenant_abc123",
  "date": "2025-11-19",
  "activeSeats": 2,
  "seatLimit": 3,
  "trialPending": 1,
  "trialExpired": 0,
  "activationsToday": 1,
  "churnedToday": 0,
  "cumulativeActivations": 15,
  "cumulativeChurn": 3,
  "conversionRate30d": 0.62,
  "avgTimeToActivationMs30d": 5400000,
  "updatedAt": "serverTimestamp"
}
```

## Reglas Firestore (borrador conceptual)
```javascript
match /tenants/{tenantId} {
  allow read: if request.auth.token.role == 'owner' || request.auth.token.tenantId == tenantId;
  allow write: if request.auth.token.role == 'owner';
}
match /packages/{code} {
  allow read: if true; // público o restringir
  allow write: if request.auth.token.role == 'owner';
}
match /metrics_daily/{docId} {
  allow read: if request.auth.token.role == 'owner';
  allow write: if request.auth.token.isFunction == true;
}
```

## Índices Recomendados
- `tenants`: index compuesto `(packageCode, billingStatus)` para listados filtrados.
- `metrics_daily`: `(tenantId, date)` para rangos por tenant.

## Operaciones Cloud Functions (a futuro)
1. `onTenantCreate`: deriva config inicial.
2. `scheduledDailyMetrics`: recalcula y escribe `metrics_daily`.
3. `onPackageUpdate`: propaga cambios si se decide actualizar features automáticamente (versión controlada; puede requerir confirmación manual para evitar sorpresas en tenants).
4. `onUserStateChange`: actualiza `seatsUsed` y `metrics_seats` instantáneo.

## Servicio en Frontend (esqueleto sugerido)
Archivo propuesto: `src/firebase/packageService.js` (a crear cuando se implemente).
```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export async function getTenantPackage(tenantId) {
  const tenantSnap = await getDoc(doc(db, 'tenants', tenantId));
  if (!tenantSnap.exists()) throw new Error('Tenant no existe');
  const tenant = tenantSnap.data();
  const pkgSnap = await getDoc(doc(db, 'packages', tenant.packageCode));
  if (!pkgSnap.exists()) throw new Error('Paquete no existe');
  const pkg = pkgSnap.data();
  const seatLimit = tenant.seatLimitOverride ?? pkg.seatLimit;
  return {
    tenantId,
    packageCode: tenant.packageCode,
    seatLimit,
    features: tenant.featuresEffective ?? pkg.features,
    limits: tenant.limitsEffective ?? pkg.limits,
    billingStatus: tenant.billingStatus,
    trialEndsAt: tenant.trialEndsAt
  };
}
```

## Estrategia de Migración Futura a Multi-Proyecto
- Abstraer acceso a Firestore por `tenantContext`.
- Utilizar mapping `tenants` central con credenciales (service accounts) para cada proyecto.
- Mantener mismo esquema `packages` central evitando duplicación.

## Próximos Pasos
1. Crear colección `packages` con mínimo `basic`, `pro`.
2. Crear documento `tenants/{id}` para instancia actual (backfill) si aplica.
3. Añadir claims `tenantId` al usuario owner.
4. Implementar `getTenantPackage` y uso en control de seats.
5. Programar función de métricas diarias.

---
*Este documento es un borrador inicial y puede evolucionar conforme se materialice multi‑tenant.*

## Infraestructura Multi‑Tenant (Repositorios, Base de Datos, Deploy)

Esta sección amplía la discusión sobre cómo manejar múltiples tenants a medida que se escale.

### Estrategias de Código / Repositorio
1. Monorepo único (shared codebase):
  - Un solo repo (como el actual) con lógica que discrimina por `tenantId`.
  - Pros: menor costo de mantenimiento, releases sincronizadas.
  - Contras: riesgo de que cambios para un tenant afecten a todos; mayor cuidado en pruebas.
2. Multi‑repo por tenant:
  - Clonar plantilla base para cada nuevo tenant y personalizar.
  - Pros: aislamiento total, deploy independiente, rollback específico.
  - Contras: duplicación de código, difícil aplicar patches de seguridad globales.
3. Monorepo + configuración por tenant:
  - Un repo con carpeta `tenants/` que contiene metadatos (branding, límites, ajustes UI) y el runtime lee esa carpeta.
  - Pros: evita duplicar código, permite variaciones ligeras.
  - Contras: complejidad de build si hay muchas variaciones.

Recomendación inicial: mantener monorepo y consolidar todas las diferencias en Firestore (`tenants` + `packages`). Evaluar separación en repos solo para casos de fuerte personalización o requisitos legales.

### Estrategias de Datos / Firestore
1. Partición lógica (colecciones con campo `tenantId`):
  - Sencillo, un solo proyecto Firebase.
  - Uso de índices compuestos por `tenantId + campo` para queries.
  - Aislamiento mediante reglas: `request.auth.token.tenantId == resource.data.tenantId`.
2. Multi‑proyecto (un proyecto Firebase por tenant):
  - Aislamiento físico, límites de cuota separados.
  - Control plane central con lista de proyectos y service accounts.
  - Mayor coste de gestión (credenciales, facturación múltiple).
3. Híbrido progresivo:
  - Comenzar con partición lógica.
  - Migrar tenants grandes a su propio proyecto cuando superen thresholds (ej. > N usuarios, > X lecturas diarias).

Consideraciones de seguridad:
- Evitar filtrados únicamente en el cliente; siempre reforzar en reglas Firestore.
- Revisar reglas ante nuevas colecciones (ej. métricas) para no exponer información cruzada.

### Estrategias de Deploy (Vercel u otro)
1. Single deployment multi‑tenant:
  - Un único dominio/app; selección de tenant por login (claim) y/o subdominio (`tenantX.midominio.com`).
  - Branding adaptable (logos, colores) cargado por Firestore al montar.
2. Deploy por tenant (multiple Vercel projects):
  - Permite URL y certificación independiente.
  - Requiere pipeline automatizado para crear nuevo proyecto con variables env correctas.
3. Subdominios dinámicos en un solo proyecto:
  - Usar rewrites y detección de host para cargar configuraciones.
  - Minimiza overhead de múltiples proyectos.

Recomendación inicial: single deployment con subdominios o parámetro y claims para aislar datos.

### Variables de Entorno / Configuración
Mantener solo credenciales globales (Firebase) si partición lógica. Si multi‑proyecto:
- Mapear `tenantId -> firebaseConfig` en colección `tenant_configs` en control plane.
- Cloud Function de generación de runtime config (firmada) que el frontend obtiene al entrar por subdominio.

### Creación de Nuevo Tenant (Workflow Propuesto)
1. Owner ejecuta acción "Crear tenant" en panel de control plane.
2. Se selecciona paquete inicial y opcional branding (nombre comercial, logo).
3. Cloud Function crea doc `tenants/{tenantId}` y setea trial.
4. (Opcional multi‑proyecto) Provisiona nuevo proyecto Firebase (API Admin + plantilla) y devuelve credenciales base.
5. Actualiza index de `tenants` para panel de métricas.
6. Notifica por correo al owner con pasos de activación.

### Manejo de Usuarios por Tenant
- Reclamos (claims) en Firebase Auth: `tenantId`, `role`.
- Al iniciar sesión: se lee `tenantId` y se restringe Firestore queries.
- Para mover usuario entre tenants (poco frecuente): proceso de migración (export/import doc + actualizar claim).

### Escalado y Límites
- Thresholds para migrar a proyecto propio: lecturas/día, tamaño de colección `movements`, latencia.
- Uso de BigQuery export si un tenant supera análisis avanzado (no cargar en el proyecto compartido).

### Auditoría y Observabilidad
- `tenant_events` registra creación, upgrade, migración, suspensión.
- Logs de Functions etiquetados por `tenantId` para rastreo.
- Métricas de saturación: seats usados vs límite, productos vs límite, consumo storage (si se integra otro servicio).

### Pros/Contras Resumidos
- Partición lógica: simple, rápido, menor costo; menor aislamiento.
- Multi‑proyecto: máximo aislamiento, granularidad en billing; complejidad operativa alta.
- Híbrido: flexibilidad, posible complejidad incremental pero controlable.

### Decisiones Pendientes
1. ¿Necesidad real de aislamiento físico en primera versión? (Probablemente no.)
2. ¿Se requiere branding por subdominio? Definir convención (`{tenant}.app.com`).
3. Definir umbrales para migración (documentar en sección futura).
4. Automatización de creación de proyecto (solo si multi‑proyecto se activa).

### Próximos Pasos para Esta Sección
- Añadir sección de umbrales y playbook de migración cuando se establezcan métricas reales de uso.
- Implementar claims `tenantId` y panel control plane mínimo.
- Validar costos antes de optar por multi‑proyecto.

