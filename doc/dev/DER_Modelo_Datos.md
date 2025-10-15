# DER / Modelo de Datos (Firestore)

Este documento describe el modelo lógico actual (implementado) y los campos planificados para las próximas etapas de refactor. Aunque Firestore es NoSQL (documentos y colecciones), expresamos un DER conceptual para facilitar: normalización, auditoría, y futura capa de dominio.

## Colecciones Principales

| Colección | Propósito | Notas clave |
|-----------|-----------|-------------|
| `plants` | Catálogo de productos / insumos | Mantiene `purchaseHistory` embebido (máx 10 entradas). `basePrice` es costo promedio ponderado. |
| `movements` | Ledger operativo (ventas, compras, ingresos, egresos, gastos) | Una venta multiproducto = varios documentos (uno por producto). Contiene mapa `paymentMethods` para pagos combinados. |
| `sales` | Redundante histórica de ventas simples | Puede migrarse / eliminarse: es subconjunto de `movements (type=venta)`. |
| `productTypes` | Tipos / categorías de producto | Referenciado por `plants.type` (id o name). |
| `paymentMethods` | Métodos de pago configurables | Usados para poblar `paymentMethods` en movimientos. |
| `users` | Usuarios y roles | Hoy sin relación persistida en movimientos (plan: `createdBy`). |

## Entidades y Atributos

Ver diagramas: `diagrams/der.mmd` (Mermaid) y `diagrams/der.puml` (PlantUML).

### plants
- id (string) – asignado manual o auto
- name
- type (FK lógica a `productTypes.id` o `name`)
- basePrice (costo promedio)
- purchasePrice (precio de venta actual sugerido)
- stock (inventario actual)
- image (ruta opcional)
- lastPurchaseDate
- purchaseHistory: array embebido [{ price, date, quantity, timestamp }]
- createdAt / updatedAt

### movements
- id
- type: venta | compra | ingreso | egreso | gasto
- plantId / plantName (denormalizado)
- quantity, price (unitario), total
- paymentMethod (derivado del mapa para compatibilidad)
- paymentMethods: { code: amount }
- paymentSummary: lista derivada (code, name, amount, percent)
- detail, notes, location
- date (ISO / UTC)
- (plan) createdBy, createdAt, hashPrev, hashSelf (auditoría encadenada)

### sales (histórico legacy)
Subconjunto: plantId, quantity, salePrice, total, paymentMethod, date, location, notes. Plan: consolidar en `movements`.

### paymentMethods
- id, code, name, icon, color, isActive
- createdAt, updatedAt

### productTypes
- id, name

### users
- uid, email, nombre, apellido, telefono, rol, modules[], creado
- (plan) estado, última conexión, multifactor, etc.

## Relaciones Clave
- PRODUCT_TYPE 1..n PLANT
- PLANT 1..n MOVEMENT (cada movimiento puede no existir si es movimiento genérico sin producto, pero hoy plantId se usa para ventas/compras; otros tipos podrían no tenerlo ⇒ relación opcional en MOVEMENT)
- PLANT 1..n SALE (legacy)
- PAYMENT_METHOD n..m MOVEMENT (implementada como mapa embebido ⇒ sin colección intermedia)
- USER 1..n MOVEMENT (plan: createdBy)
- purchaseHistory embebido dentro de PLANT (no colección separada)

## Inconsistencias / Oportunidades de Mejora
1. Tabla `sales` redundante: migrar a solo `movements` (añadir índice compuesto si se requiere performance). 
2. Falta trazabilidad (quién creó / editó) en `movements` y `plants` (solo timestamps). 
3. Multiproducto: modelo actual genera múltiples movimientos; alternativa futura: encabezado (SaleHeader) + líneas (SaleLine) para reporting agregado más simple. 
4. `type` en `plants` mezcla id/name: normalizar a referencia consistente (`productTypeId`). 
5. `location` como string libre: crear colección `locations` para multi-sucursal. 
6. Auditoría: agregar hash encadenado (hashPrev/hashSelf) y firma de usuario para detectar alteraciones. 
7. Extraer `paymentSummary` como derivado no persistente (puede recalcularse) salvo necesidad de performance histórica. 
8. Indexes Firestore: asegurar índices compuestos (date+type), (type+plantId), (date+paymentMethod) según queries frecuentes. 

## Roadmap de Cambios al Modelo
| Fase | Cambio | Beneficio |
|------|--------|-----------|
| Sprint 1 | Añadir `createdBy` en movements | Auditoría básica |
| Sprint 2 | Normalizar `plants.type` -> `productTypeId` | Consistencia |
| Sprint 3 | Eliminar `sales` tras migrar registros y ajustar UI | Reducción duplicidad |
| Sprint 4 | Añadir `hashPrev/hashSelf` | Integridad financiera |
| Sprint 5 | Introducir `locations` colección | Multi-sucursal |
| Futuro | Encabezado/Líneas de venta | Reportes y agregación más eficiente |

## Ejemplo Hash Encadenado (plan)
```
prevHash = hash(prevHash + canonicalJSON(movementCoreFields))
```
Campos canónicos: date, type, plantId, quantity, price, total, paymentMethods(sorted), createdBy, createdAt.

## Diagramas
- Mermaid: abrir `der.mmd` (VS Code + extensión Markdown Preview Mermaid) 
- PlantUML: `der.puml` (requiere servidor PlantUML o extensión local)

## Consultas Comunes (Índices Sugeridos)
- Movimientos por mes y tipo: index(date, type)
- Ventas por producto: index(plantId, type) con filtro type='venta'
- Compras para Costo Promedio: index(plantId, type='compra')
- Movimientos por método de pago principal: index(paymentMethod, date)

## Consideraciones NoSQL
- Denormalización aceptada (plantName) para evitar búsqueda adicional en listados. 
- purchaseHistory embebido se trunca (últimas 10) para limitar tamaño de documento y latencia. 
- Mapas de paymentMethods evitan colección intermedia y simplifican escritura atómica.

## Próximos Pasos Técnicos
1. Añadir migrador que copie `sales` => `movements` (si falta algún campo) y marque bandera de corte.
2. Implementar hook de escritura enriqueciendo `movements` con `createdBy` y hash incremental antes de persistir.
3. Crear script verificación de integridad: recalcular hash chain y reportar discrepancias.

---
Actualizar este documento con cada evolución de esquema o introducción de nuevas colecciones (e.g., `locations`, `saleHeaders`, `saleLines`).
