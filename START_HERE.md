# START HERE (Resumen para retomar)

Fecha: 2025-11-12
Documento rápido para continuar mañana sin perder contexto.

## Estado actual clave
- Autenticación Google funcionando (dueños vs admins vs usuario).
- Separación dueños (`app_config/admins`) y allowlist (`app_config/auth`).
- Script para promover admin creado (falta agregar npm script y documentar uso).
- Plan de licenciamiento per-app y provisioning multi-tenant definido en `doc/Plan_Provisioning_Licencias.md`.
- Prototipo E2E aislado en `prototype_e2e/` simulando:
  - Login / decisiones (allowlist, tenant, dueño)
  - Demo read-only
  - Formulario de alta
  - Pago externo (simulado)
  - Provisioning (stepper)
  - Licencias (seats) asignar/revocar
  - Upgrades de versión

## Próximas prioridades sugeridas (orden)
1. Checklist resumido en el documento principal (pendiente tarea #14).
2. Decidir almacenamiento de catálogo de rubros (doc único vs colección). (tarea #8)
3. Diseñar colección `signups` y reglas básicas de lectura/escritura. (tarea #6)
4. Definir estructura del registro central de tenants (metadatos mínimos). (tarea #11)
5. Prototipar email de entrega (plantilla de texto + variables). (extensión de tarea #6/#11)
6. Añadir pestaña "Fábrica / Mis Apps" en prototipo para redirección (opcional si queremos validarlo visualmente antes de código real).
7. Agregar npm script `promote:admin` y documentarlo (tareas #3 y #4).
8. Primer boceto de `seed-tenant` CLI (sólo imprimir dry-run). (tarea #12)

## Decisiones esperadas antes de implementar
- ¿Admin del cliente consume seat? (defecto: sí)
- ¿Demo pública sin login? (defecto: sí)
- ¿Catálogo de rubros: simple doc vs colección? (necesario para #8)
- ¿Nombre estándar de proyecto Firebase (mf-<tenant>-prod)? (confirmar para scripts)
- ¿Registro central: Firestore en fábrica vs otra base? (para #11)

## Criterios de aceptación próximos entregables
- Checklist resumido visible al inicio de `Plan_Provisioning_Licencias.md`.
- Prototipo E2E extendido (si se aprueba) con pestaña "Mis Apps" que dado un email muestra una lista simulada y link a `appUrl`.
- Archivo `scripts/promote-admin.js` referenciado en `package.json` con alias y README actualizado.
- Definición de `rubros` (estructura final + ejemplo) escrita en `doc/Plan_Provisioning_Licencias.md` sección nueva.
- Registro central de tenants: JSON de ejemplo y campos mínimos.

## Riesgos a observar
- Derivar demasiado tiempo en prototipo visual en lugar de fijar contratos definitivos.
- Complejidad de multi-tenant antes de tener 1–2 clientes reales.
- Falta de automatización de provisioning generando errores manuales (mitigar con checklist).

## Próximo paso mínimo mañana
Si hay poco tiempo: completar tarea #14 (Checklist resumido) y añadir alias npm para `promote-admin` (#3) + documentar uso (#4). Eso deja cerrado el bloque de administración actual y despeja camino para multi-tenant.

## Enlaces rápidos
- Plan detallado: `doc/Plan_Provisioning_Licencias.md`
- Prototipo E2E: `prototype_e2e/ui/index.html`
- Script promoción admin: `scripts/promote-admin.js` (ver si existe y alias pendiente)

---
Fin. Ajustar este start si cambian prioridades mañana.
