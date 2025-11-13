# Prototipo E2E (Aislado y desechable)

Prototipo visual end-to-end del flujo conversado: login → demo → registro → pago externo → provisioning → licencias (seats) → upgrades. No ejecuta acciones reales, no usa SDK, no escribe en ninguna parte. Es 100% estático.

- Carpeta: `prototype_e2e/` (se puede eliminar cuando se desee)
- No toca ni referencia el código de `src/` ni archivos de producción
- Ideal para validar UX/conceptos antes de implementar

## Cómo abrir
- Abrí `prototype_e2e/ui/index.html` en el navegador (o Simple Browser de VS Code).

## Qué simula
- Árbol de decisiones (allowlist, demo, alta)
- Página de pago externa (simulada)
- Pasos de provisioning (proyecto, reglas, seeds, repo, deploy)
- Gestión de seats (asignar/revocar) y verificación de acceso
- Distribución de upgrades por versión

## Limitaciones
- Todo es front estático; no hay conexión ni escritura de datos
- Se guarda el estado en `localStorage` del navegador para persistir entre recargas

## Eliminación
- Borra la carpeta `prototype_e2e/` cuando ya no se necesite. No deja residuos.
