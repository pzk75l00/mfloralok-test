# Recordatorios y Acuerdos de Desarrollo — Mundo Floral

Documento central con acuerdos, patrones y validaciones consensuados durante el desarrollo del proyecto desde el inicio hasta hoy.

---

## ✅/❌ Checklist de estado (rev. 10-dic-2025)
- **Productos (pendiente):**
    - Unificar formulario de alta de producto: el modal que aparece al crear producto nuevo desde compras debe ser exactamente el mismo formulario que se usa en inventario/productos (misma UI, validaciones y campos). Pendiente de revisión y refactor.
  - Campo unificado "Productos/Detalles" en gastos/ingresos/egresos
  - Resaltar diferencia precio venta vs costo en UI
  - Migrar nomenclatura `plant` → `producto` en UI/servicios
  - Checklist propuesto (sin ejecutar todavía):
    1) UI: labels y textos a "Producto" (reemplazar "Planta")
    2) Campos: `plantId` → `productId` (frontend) con compatibilidad hacia atrás
    3) Firestore: mantener campos legacy (`plantId`) mientras se migra; agregar `productId` nuevo
    4) Autocomplete/Formularios: actualizar componentes compartidos (PlantAutocomplete, formularios de movimientos)
    5) Reportes/exports: usar `productId`/nombre de producto
    6) Mock/datos iniciales: renombrar claves a producto
- Pagos combinados: ejecutar y monitorear migración masiva; ajustar vistas de reportes/cortes para mostrar distribución de `paymentMethods`.
- Reportes/UX: gráficos de ventas mejorados; filtros avanzados; dashboard de totales del día; productos favoritos/frecuentes; exportar a Excel/PDF; fotos de productos; atajos de teclado; sistema de combos/compose.
- Roadmap técnico: multi-tenant/licenciamiento (provisioning, seats, registro de tenants, upgrades); entornos de prueba por cliente (portal, expiración, modo solo lectura); testing automatizado (Jest/Integración/Cypress + CI/CD); migración a TypeScript; design system (Tailwind/Chakra); custom hooks Firebase (`useFirestore`, `useAuth`, `useForm`).

**Listo / usable:**
- Auto-creación en compras ✅ (ya implementado: permite crear producto nuevo desde el flujo de compra y lo agrega automáticamente al movimiento)
- Pagos mixtos funcionando en `PaymentSelector` + `MixedPaymentModal` con validación en `MovementsView`/`mixedPaymentUtils`; helpers de migración listos.
- Costo promedio ponderado en compras (`updateProductPurchasePrice`), stock automático en ventas/compras, UI muestra "Costo Promedio".
- Buscador de movimientos activo en `MovementsView` (filtra por producto, detalle, notas, ubicación, tipo y resumen de pago).

---

## ✅ COMPLETADO (Versión 1.0.3 actual)
**Funcionalidades implementadas:**
- Sistema de gestión de movimientos (ventas, compras, ingresos, egresos, gastos)
- Formularios móviles y escritorio con diseño responsivo
- CRUD completo de productos/inventario
- Edición inline con auto-guardado (150ms delay)
- Validación de nombres duplicados de productos
- Optimización de imágenes client-side (640px, JPEG 82%)
- Preview y aprobación de imágenes antes de guardar
- Campo "Lugar" en formularios
- Filtros por fecha (mes y año)
- Reportes básicos y estadísticas
- Sistema de autenticación con Google
- Allowlist y owners (admins)
- Vinculación de dispositivos (solo escritorio)
- Deploy automático en Vercel
- Real-time sync con Firebase Firestore
- Conversión String(ID) en todas las operaciones Firestore (auditado 10-Dic-2025)

**Patrones establecidos:**
- Estructura de componentes React estándar
- Naming conventions consistentes
- Mobile-first design
- Reutilización de código (/utils/ y /Shared/)
- Manejo de errores con try/catch y ErrorModal
- Validaciones de stock y formularios

---

## 📊 RESUMEN DEL ESTADO ACTUAL
**Categoría | Completado | Pendiente | En Análisis**
- Core Features: 15+ ✅ | 0 | 2
- Mejoras UX: 8 ✅ | 6 | 0
- Arquitectura: v1.0.3 ✅ | v2.0 ⏳ | Multi-tenant 🗂️
- Testing: Manual ✅ | Automatizado ⏳ | -
- Documentación: Completa ✅ | - | -

**Estado general:** Sistema funcional y productivo en v1.0.3, con roadmap claro para evolución futura.

---

## 🚨 REGLAS OBLIGATORIAS DE REUTILIZACIÓN
**📅 Establecido: Agosto 2025 (v1.0.1-1.0.3)**

### ANTES de escribir código nuevo:
1. **🔍 BUSCAR PRIMERO** - Revisar si ya existe código similar
2. **🔄 REUTILIZAR** - Usar componentes/utilidades existentes
3. **📁 UTILS** - Si es reutilizable, debe ir en `/src/utils/`
4. **🧩 COMPONENTES** - Si es UI reutilizable, debe ir en `/src/components/Shared/`
5. **📖 DOCUMENTAR** - Actualizar NORMAS_REUTILIZACION.md con nuevas utilidades

### Estructura de reutilización:
```
/src/utils/              ← Lógica pura (validaciones, cálculos, transformaciones)
/src/components/Shared/  ← Componentes UI reutilizables (inputs, modales, cards)
```

### Utilidades disponibles (ver NORMAS_REUTILIZACION.md):
- `inputUtils.js` - Auto-select, validación numérica, props de inputs
- `mixedPaymentUtils.js` - Lógica de pagos combinados (20+ funciones)
- `productManagement.js` - CRUD productos, validaciones, historial precios
- `balanceCalculations.js` - Cálculos financieros y de caja
- `plantsFirestore.js` - Operaciones batch en Firestore

### Componentes compartidos:
- `SmartInput.js` - Input inteligente con auto-select (variants: price, quantity, stock)
- `ErrorModal.js` - Modal de errores consistente
- `PlantAutocomplete.js` - Autocompletado de productos con creación inline
- `NewProductModal.js` - Modal de creación de productos
- `PaymentMethodsManager.js` - Gestor de métodos de pago

---

## 🛠️ PATRONES DE DESARROLLO ESTABLECIDOS
**📅 Establecido: Agosto 2025 (desde v1.0.1)**

### Estructura de componentes React:
```javascript
function ComponentName({ props }) {
  // 1. State declarations (hooks)
  const [state, setState] = useState();
  
  // 2. Effect hooks (subscripciones Firestore, resize listeners, etc.)
  useEffect(() => {
    const unsubscribe = onSnapshot(...);
    return () => unsubscribe(); // SIEMPRE limpiar suscripciones
  }, [dependencies]);
  
  // 3. Event handlers (handle*)
  const handleEvent = async (e) => {
    e.preventDefault();
    // Validaciones
    // Operaciones Firestore con try/catch
    // Feedback al usuario
  };
  
  // 4. Render helpers (render*)
  const renderHelper = () => <div>...</div>;
  
  // 5. Return JSX
  return <div>{content}</div>;
}
```

### Naming conventions:
- **Funciones handler**: `handleSubmit`, `handleEdit`, `handleDelete`, `handleChange`
- **Booleanos**: `isLoading`, `isMobile`, `hasError`, `showModal`
- **Render helpers**: `renderPaymentSummary`, `renderProductCard`
- **State setters**: `setForm`, `setLoading`, `setErrorModal`

### Responsive Design:
```javascript
// Mobile-first: detectar ancho y renderizar condicional
const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
useEffect(() => {
  const handleResize = () => setIsMobile(window.innerWidth < 768);
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);

if (isMobile) return <MobileComponent />;
return <DesktopComponent />;
```

---

## 📋 Firestore & Base de Datos
**📅 Establecido: Agosto 2025 (desde v1.0.1) | Última auditoría: 10-Dic-2025**

### IDs Numéricos → String en doc()
- **Regla**: SIEMPRE convertir IDs numéricos a `String(id)` al usar `doc()` para cualquier operación (lectura, escritura, actualización, borrado).
- **Patrón**: `doc(db, 'collection', String(id))` o `doc(collection(db, 'col'), String(id))`
- **Por qué**: Firestore almacena IDs como strings; pasar números causa error "indexOf is not a function".
- **Auditoría**: Última revisión completa — 2025-12-10. Todos los archivos ya conformes.
- **Archivos clave**: InventoryView.js, MovementsView.js, AdminPanel.js, ProductTypesManager.js, todos los managers (Rubros, Roles, Países), plantsFirestore.js, etc.
- **No usar `data()` en String IDs**: En conversiones, usar siempre `String(movimiento.id)` directamente del documento, no `movimiento.data().id`
- **Operaciones críticas**: En updates/deletes, SIEMPRE verificar que el ID convertido no sea "null", "undefined", o string vacío antes de proceder

---

## 🎨 UX & Comportamiento de Usuario
**📅 Establecido: Agosto 2025 (v1.0.1-1.0.3)**

### Validaciones de Stock:
```javascript
// Antes de venta: SIEMPRE verificar stock disponible
if (selectedProduct.stock < quantity) {
  setErrorModal({
    show: true,
    message: `Stock insuficiente. Disponible: ${selectedProduct.stock}`
  });
  return;
}
```

### Validaciones de Formularios:
```javascript
// Campos obligatorios en ventas:
- Producto (planta de interior, exterior, macetas, otros)
- Precio > 0
- Stock suficiente

// Mostrar mensajes claros:
"Complete todos los campos antes de registrar la venta"
"El precio debe ser mayor a cero"
```

### Sugerencias de Alta de Productos:
```javascript
// Si compra de producto no existente:
setErrorModal({
  show: true,
  message: "Producto no encontrado. ¿Desea dar de alta el producto?"
});
// Ofrecer botón para abrir formulario de alta
```

### Manejo de Fechas (Hora Local Argentina):
```javascript
// Ventas: fecha automática NO editable
const now = new Date();
// Usuario no ve ni edita la fecha
// Se guarda: timestamp de hora actual Argentina

// Caja/Movimientos: fecha editable
// Permite cargar movimientos atrasados o correcciones
// Si no se modifica: hora actual Argentina
// Si se modifica: fecha seleccionada por usuario
// SIEMPRE guardar en Firestore con hora local Argentina
```

---

## ✅ Validaciones de Productos
**📅 Implementado: 09-Dic-2025**

### Validar nombres duplicados
- **Función**: `isDuplicateProductName(plants, productName, currentId = null)` en `src/utils/productManagement.js`
- **Uso**: Importar en formularios de carga (InventoryView, InventoryMovilView) y en PlantAutocomplete.
- **Lógica**: 
  - Normaliza a lowercase/trim
  - Excluye el ID en edición (para permitir guardar el mismo producto sin cambiar nombre)
  - Bloquea si otro producto con el mismo nombre ya existe
- **Feedback**: Mostrar ErrorModal o alert con mensaje "Ya existe un producto con ese nombre."
- **Lugares implementados**: 
  - InventoryView.js (línea ~105)
  - InventoryMovilView.js (línea ~48)
  - PlantAutocomplete.js (autocompletado con sugerencias)

### Limpiar funciones sin uso
- **Acuerdo**: ANTES de borrar una función, buscar referencias con `grep_search` y avisar al usuario.
- **Formato**: Mostrar lista completa de uses/no-uses y pedir confirmación.
- **Descartadas**: `productExists()` (reemplazada por `isDuplicateProductName`).

---

## 🖼️ Gestión de Imágenes
**📅 Implementado: 09-Dic-2025**

### Optimización Client-Side
- **Tamaño máx**: 640px (ancho/alto, manteniendo aspect ratio).
- **Formato**: JPEG con calidad ~82% (compresión moderada).
- **Flujo**:
  1. Usuario selecciona archivo
  2. Se optimiza automáticamente (sin mostrarlo al usuario hasta pasar validación)
  3. Se muestra preview con dimensiones originales → optimizadas y peso (KB)
  4. Mostrar botones: "Usar esta imagen" (aprobación), "Buscar otra" (cambiar), "Quitar" (descartar)
  5. Solo después de aprobación explícita se guarda la versión optimizada
- **Almacenamiento**: Se guarda como data URL (base64) en Firestore en el campo `image` del producto.
- **Imagen por defecto**: Si no hay imagen custom, mostrar `/img/plants/generic_plants.jpg`.
- **Ubicación visual**: Centrada bajo el formulario de carga/edición del inventario (no en el grid de campos).
- **Archivos**: src/components/Inventory/InventoryView.js (lineas ~50-150 en handleFileSelection + render).

---

## 🎨 UI/UX - Inventario
**📅 Establecido: Agosto 2025 | Última actualización: 09-Dic-2025**

### Diseño de form de carga
- **Layout**: Grid responsivo (md:grid-cols-8 en desktop).
- **Campos**: Nombre, Tipo, Stock, Precio Compra, Precio Venta, Fecha Compra, Proveedor, Imagen.
- **Botón "Gestionar tipos"**: 
  - Colocado **junto al label/select de Tipo** (no como botón principal).
  - Tamaño pequeño (text-[11px], underline, sin background).
  - Abre modal ProductTypesManager.
- **Indicador de edición**: 
  - Mostrar "Editando: {nombre}" en color azul (no verde, para diferenciarlo de otros elementos).
  - Sin ícono "edit" (quitado).
- **Nota informativa**: Color azul (no verde) para distinguirla de la sección de imagen ("Nota: La imagen se optimiza automáticamente...").
- **Botones acción**: Actualizar/Agregar (verde) y Cancelar (gris).

---

## 🔄 Flujos de Validación Comunes
**📅 Establecido: Agosto 2025 | Actualizado: 09-Dic-2025**

### Al crear/editar producto
1. Validar campos requeridos (nombre, tipo, precios, stock).
2. Validar valores numéricos (stock ≥ 0, precios ≥ 0, precio_venta > precio_compra).
3. **Validar duplicados**: `isDuplicateProductName(plants, form.name, editingId)`.
4. Si pasa todas, guardar a Firestore con IDs como `String(id)`.

### Al eliminar
- Mostrar modal de confirmación con nombre del producto.
- Usar `deleteDoc(doc(..., String(id)))` con async/await.

### Al importar/exportar CSV
- Convertir IDs a String al guardar en Firestore.
- Parsear correctamente comas y comillas en CSV (usar split + lógica de estado).

---

## 📱 Diseño Responsivo
**📅 Establecido: Agosto 2025 (desde v1.0.1)**

### Mobile-first en formularios
- Modales flotantes o fixed-bottom para formularios en móvil.
- Botones de acción fijos abajo (height: 70px típicamente).
- Inputs full-width en mobile.
- Ocultar elementos complejos (exportar CSV, selector de vista) en screens < 768px.

---

## 🛠️ Patrones de Código
**📅 Establecido: Agosto 2025 (desde v1.0.1)**

### Estados / Hooks
- Usar `useState` para UI local (show/hide modals, errores, loading).
- Usar `useEffect` + `onSnapshot` para sincronizar datos de Firestore (collections y docs).
- Limpiar suscripciones en return de useEffect.

### Manejo de errores
- Try/catch en operaciones Firestore.
- Mostrar ErrorModal para UX clara.
- Loguear en console.error para debug.

### Nombres de estado/funciones
- Verbo + propiedad: `setShowForm`, `handleSubmit`, `handleEdit`, `handleDelete`.
- Prefix `is/has` para booleanos: `isMobile`, `isSubmitting`, `hasImages`.

---

## 📝 Cambios Recientes & Estado
**📅 Última actualización: 10-Dic-2025**

- **Última auditoría IDs**: 2025-12-10 — todos los archivos con Firestore ops auditados ✅
- **Validación duplicados**: implementada en InventoryView, InventoryMovilView, PlantAutocomplete ✅
- **Imagen optimización**: implementada en InventoryView con preview/aprobación ✅
- **UI inventario**: Gestionar tipos junto a select, indicador edición en azul, nota en azul ✅

---

## 🏗️ DECISIONES ARQUITECTÓNICAS HISTÓRICAS
**📅 Decisiones tomadas: Agosto 2025 (v1.0.1-1.0.3)**

### Stack Tecnológico:
```
✅ React 18+ (Create React App)
- Por qué: Ecosistema maduro, documentación extensa, rápido setup
- Alternativas consideradas: Vue, Angular, Next.js
- Trade-off: Bundle size vs funcionalidad

✅ Firebase Firestore (NoSQL)
- Por qué: Real-time, escalable, sin server management, offline support
- Beneficio: Sincronización automática, queries flexibles
- Alternativas: PostgreSQL + Backend custom, MongoDB

✅ Vercel Hosting
- Por qué: Integración perfecta con React, edge functions, performance
- Beneficio: Deploy automático desde Git, CDN global
- Alternativas: Netlify, AWS Amplify

✅ CSS tradicional + inline styles (NO styled-components)
- Por qué: Simplicidad, no runtime overhead, debugging fácil
- Beneficio: Performance, control total sobre estilos
- Futuro considerado: Tailwind CSS

✅ useState + Context API (NO Redux)
- Por qué: Aplicación simple, estado local suficiente
- Beneficio: Menos complejidad, bundle más pequeño
- Futuro: Considerar Zustand si crece complejidad
```

### Decisiones de UX:
```
✅ Inline Editing (double-click en MovementsView)
- Por qué: Mejor UX, menos clicks, flujo natural
- Implementación: Auto-save con delay inteligente (150ms)
- Beneficio: Mobile-friendly, productividad

✅ Mobile-First Design
- Por qué: Usuarios principales en smartphones
- Implementación: Detección de viewport + componentes condicionales
- Breakpoint: 768px

✅ Real-time Sync (onSnapshot)
- Por qué: Múltiples usuarios simultáneos, cambios inmediatos
- Trade-off: Firebase quota usage vs UX
```

### Patrones de Firestore:
```javascript
// Colecciones principales:
- movements: Transacciones (ventas, compras, ingresos, egresos)
- producto: Inventario de productos
- types: Tipos/categorías de productos
- roles: Roles de usuario
- payment_methods: Métodos de pago configurables

// Queries optimizadas:
- Usar .limit() para paginación
- Índices compuestos para filtros (firestore.indexes.json)
- Real-time listeners selectivos (solo datos necesarios)
- Cache local automático de Firebase
```

### Seguridad:
```javascript
// Firebase Security Rules (firestore.rules)
- Authentication requerida
- API keys en environment variables
- HTTPS only (Vercel automático)
- No sensitive data en localStorage

// Validación Frontend:
- Input sanitization (trim, toLowerCase)
- Type checking (Number, String, Boolean)
- Form validation antes de Firestore
```

### Performance:
```javascript
// Optimizaciones actuales:
- Function components (no class components)
- useState/useEffect (no unnecessary re-renders)
- Conditional rendering (evitar componentes innecesarios)
- Firebase queries limitadas (.limit(50))
- Create React App optimizations automáticas

// Métricas objetivo:
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Bundle size: < 500KB gzipped
```

---

## 🔮 MEJORAS FUTURAS CONSIDERADAS
**📅 Roadmap actualizado: Agosto 2025**

### Prioridad Alta (⭐⭐⭐⭐⭐):
```
🔧 Gestión de productos mejorada (5-7 sem) - Estado: Parcial (rev. 10-dic-2025)
- ✅ Actualizar precio de compra → costo del producto (promedio ponderado) ya implementado en updateProductPurchasePrice
- ✅ Stock automático que se actualiza con ventas/compras (ya vigente en movimientos)
- ❌ Compra de productos que no existen (auto-creación) pendiente
- ❌ Campo unificado "Productos/Detalles" para gastos/ingresos/egresos pendiente (se sigue usando plantId + detail)
- ⚠ Diferenciación clara precio venta vs costo: revisar UI para remarcar ambos valores
```

### Prioridad Muy Alta (⭐⭐⭐⭐):
```
💰 Sistema de Pagos Combinados (3-4 sem) - Estado: Parcial/usable (rev. 10-dic-2025)
- ✅ Permitir pagos mixtos (efectivo + Mercado Pago + transferencia + tarjeta) en `PaymentSelector` + `MixedPaymentModal` + validación en `MovementsView`/`mixedPaymentUtils`
- ✅ UI para división/configuración rápida de pagos (botones rápidos + modal Mixto)
- ✅ Migración: helpers `migrateAllMovementsToMixedPayments` / `migrateMovementToMixedPayment` listos (requiere ejecución bajo demanda)
- ⚠ Reportes actualizados con pagos mixtos: utilidades soportan `paymentMethods`, pero revisar vistas de reportes para mostrar distribución detallada
- ⚠ Pendiente monitorear/ejecutar migración masiva en entornos productivos y validar cortes de caja
```

### Prioridad Alta (⭐⭐⭐):
```
📦 Sistema de Combos/Compose (4-6 horas) - En análisis
- Crear combos de productos con descuentos automáticos
- Composición dinámica de múltiples productos
- Reglas de descuento configurables
- Transparencia total (se ven productos individuales)

📈 Gráficos de ventas mejorados (1 hora) - Pendiente
🔍 Buscador de movimientos (30 min) - Completado (rev. 10-dic-2025)
- Implementado en `MovementsView` con `searchTerm` filtrando por nombre de producto, detalle, notas, ubicación, tipo y resumen de pago
🎯 Filtros avanzados (1 hora) - Pendiente
```

### Prioridad Media (⭐⭐):
```
📊 Dashboard con totales del día (45 min)
⭐ Productos favoritos/frecuentes (1 hora)
📤 Exportar a Excel/PDF (1.5 horas)
```

### Prioridad Baja (⭐):
```
📷 Fotos de productos (2 horas)
⚡ Atajos de teclado (30 min)
```

### Evolución Arquitectónica:
```
Versión Actual (1.0.3):
- Monolito React simple
- Firebase directo desde componentes
- CSS tradicional
- Manual testing

Versión Futura (2.0):
- Custom hooks para Firebase (useFirestore, useAuth, useForm)
- Design system (Tailwind/Chakra)
- Automated testing (Jest/Cypress)
- TypeScript migration
- Micro-frontends potencial
```

---

## 📅 HISTORIAL DE CAMBIOS PRINCIPALES

### 🚀 Versión 1.0.3 - Agosto 2025:
```
✨ Nuevas Características:
- Campo "Lugar" en formularios de escritorio (caja, ventas/compras)
- Edición inline en tabla sin botones (double-click, solo escritorio)
- Auto-guardado inteligente (delay 150ms al salir de campos)
- Título dinámico: "Mundo Floral" (producción) vs "Desarrollo Mfloralok" (dev)
- Documentación completa (guías usuario, casos de uso, guía visual)

🛠️ Mejoras UX:
- Botones deshabilitados durante procesamiento
- Selección de texto en campos de edición
- Navegación mejorada (Tab, Enter, Escape)
- Feedback visual (anillos azules, resaltado de filas)

🐛 Correcciones:
- Eliminada columna duplicada "notas" en modo edición
- Mejor responsividad móvil/escritorio
- Mejor sincronización de estados durante edición

🔧 Técnico:
- Estado blurTimeout para auto-guardado inteligente
- Funciones handleFieldBlur/handleFieldFocus
- Detección automática de entorno para título
```

### 🚀 Versión 1.0.2 - Agosto 2025:
```
- Deploy automático en Vercel configurado
- Sistema de estadísticas (totales por mes y método de pago)
- Gestión de plantas: CRUD completo de productos
- Interfaz responsive (móvil/escritorio)
- Código de colores por tipo de movimiento
- Filtros por fecha (mes y año)
```

### 🚀 Versión 1.0.1 - Agosto 2025 (Inicial):
```
- Gestión de movimientos (ventas, compras, ingresos, egresos, gastos)
- Formularios móviles optimizados para touch
- Formularios escritorio con ventas múltiples
- Integración completa Firebase Firestore
- Reportes básicos (totales y estadísticas por período)
```

### 📊 Métricas del Proyecto:
```
- Archivos creados: 50+
- Funcionalidades: 15+ características principales
- Responsividad: 100% móvil y escritorio
- Documentación: 5 guías completas
- Testing: Manual completo en cada feature
- Carga inicial: < 2 segundos
- PWA ready: Preparado para instalación
```

---

## 🚫 ANTI-PATRONES / NO HACER
**📅 Documentado: Agosto-Diciembre 2025**

### Firestore:
- ❌ Pasar IDs numéricos directamente a `doc()` sin `String()`
- ❌ Hacer operaciones Firestore en loops sin batch (usar batch writes)
- ❌ Cambiar estructura Firestore sin migración de datos existentes
- ❌ Usar `movimiento.data().id` en lugar de `movimiento.id` para conversiones

### Código:
- ❌ Dejar funciones sin usar en el código (revisar con grep_search y borrar tras avisar)
- ❌ Asumir que cambios están completos sin auditoría exhaustiva (siempre revisar refs globales)
- ❌ Crear funciones duplicadas cuando ya existe una centralizada (revisar utils/)
- ❌ Componentes UI en archivos de lógica (separar en /Shared/)

### Validaciones:
- ❌ Usar nombres de productos duplicados sin validación
- ❌ Permitir guardar formularios con campos obligatorios vacíos
- ❌ No validar stock antes de ventas

### Imágenes:
- ❌ Guardar imágenes grandes/sin optimizar en Firestore
- ❌ Permitir subir imágenes sin preview/aprobación del usuario

### UX:
- ❌ Colocar modales dentro de event handlers (siempre en component root)
- ❌ Operaciones críticas sin feedback al usuario (loading, éxito, error)
- ❌ Fechas/timestamps sin considerar hora local Argentina

### Desarrollo:
- ❌ Código directo sin revisar NORMAS_REUTILIZACION.md primero
- ❌ Borrar funciones sin buscar referencias en toda la codebase
- ❌ Cambios sin actualizar documentación (RECORDATORIOS, README_DEV, Changelog)

---

## 🎯 FLUJOS DE TRABAJO TÍPICOS
**📅 Establecido: Agosto 2025 (v1.0.1-1.0.3)**

### Venta Simple en el Local:
```
1. Abrir app en celular
2. Verificar tipo = "Venta"
3. Completar: Producto, Cantidad, Precio, Método de pago, Lugar, Notas
4. Presionar "Registrar venta"
5. Stock se descuenta automáticamente
```

### Compra a Proveedor:
```
1. Abrir app en computadora
2. Cambiar tipo a "Compra"
3. Registrar cada tipo de planta (Producto, Cantidad, Precio unitario, Lugar, Notas)
4. Método de pago: como se pagó (efectivo/MP/transferencia/tarjeta)
5. Stock se incrementa automáticamente
```

### Pago de Servicios:
```
1. Cambiar tipo a "Gasto"
2. Completar: Detalle, Monto, Método de pago, Fecha
3. Registrar gasto
4. Aparece en reportes de egresos
```

### Ingreso Extra:
```
1. Tipo = "Ingreso"
2. Detalle (ej: "Venta de macetas usadas")
3. Monto, Método de pago
4. Registrar → aparece en reportes de ingresos
```

### Edición de Movimiento (solo escritorio):
```
1. Double-click en campo a editar
2. Modificar valor
3. Auto-guardado al hacer blur (delay 150ms)
4. O presionar Enter para guardar inmediato
5. Escape para cancelar edición
```

---

## 🔐 AUTENTICACIÓN Y ACCESO
**📅 Implementado: Agosto 2025 (v1.0.2-1.0.3)**

### Configuración Firebase:
```
- Proveedor: Google (Firebase Auth)
- Variables: .env con prefijo REACT_APP_FIREBASE_* (no commitear .env reales)
- Service Account: Keys/serviceAccount.json (no versionado)
- Configurar ruta: GOOGLE_APPLICATION_CREDENTIALS o .env
```

### Sistema de Allowlist:
```javascript
// Firestore: app_config/auth
{
  allowedEmails: ["correo1@example.com", "correo2@example.com"],
  allowedEmailDomains: ["dominio.com"],
  blockedEmails: ["bloqueado@example.com"]
}

// Owners (admins): Firestore app_config/admins
// Solo lectura/escritura por owners
// Correos SIEMPRE en minúsculas
```

### Dispositivos:
```
- Vinculación solo en Escritorio
- Excluido en Móvil
- Ver DebugPanel (?debug=1 en URL) para seguir login, allowlist, owners, seats
```

### Scripts de Seeding (Node):
```bash
# Owners (admins):
node scripts/seed-admins.js "correo1@example.com,correo2@example.com"

# Allowlist:
node scripts/seed-auth-allowlist.js --emails "correo1@example.com,correo2@example.com" --domains "dominio.com"
```

---

## 🚀 DESPLIEGUE Y BUILD
**📅 Configurado: Agosto 2025 (v1.0.2)**

### Vercel Deployment:
```
- Frontend: Vercel (push a main → build automático → deploy)
- Build command: npm run build
- Output directory: build/
- Environment variables: Automáticas desde Vercel settings
```

### Firebase Deployment:
```bash
# Reglas de Firestore: desplegar con Firebase CLI
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes

# NO via Vercel, siempre desde este repo
```

### Environment Detection:
```javascript
// Detectar producción vs desarrollo:
const isProduction = window.location.hostname.includes('vercel.app') || 
                    window.location.hostname.includes('mundo-floral');

// Título dinámico:
document.title = isProduction ? 'Mundo Floral' : 'Desarrollo Mfloralok';
```

### Debug Mode:
```
- Agregar ?debug=1 a la URL
- Ver DebugPanel (src/components/Shared/DebugPanel.js)
- Útil para: login, allowlist, owners, seats, dispositivos
```

---

## 🧪 TESTING Y ERROR HANDLING

### Estrategia de Testing:
```
Actual (v1.0.3):
- Testing manual completo en cada feature
- Verificación en móvil y escritorio
- Casos de uso documentados en doc/Casos_de_Uso.md

Futuro:
- Unit tests con Jest para utils/
- Integration tests con React Testing Library
- E2E tests con Cypress
- Automated testing en CI/CD
```

### Patrón de Error Handling:
```javascript
// Operaciones Firestore:
try {
  await addDoc(collection(db, 'movements'), data);
  setErrorModal({ show: true, message: '✅ Operación exitosa' });
} catch (error) {
  console.error('Error en operación:', error);
  setErrorModal({ 
    show: true, 
    message: '❌ Error al guardar. Intente nuevamente.' 
  });
}

// Validaciones previas:
if (!form.name || !form.type) {
  setErrorModal({ 
    show: true, 
    message: 'Complete todos los campos obligatorios' 
  });
  return; // Detener ejecución
}
```

### Logging y Debugging:
```javascript
// Ambiente desarrollo: console.log detallado
if (!isProduction) {
  console.log('[DEBUG] Estado del formulario:', form);
  console.log('[DEBUG] Productos cargados:', plants.length);
}

// Ambiente producción: solo errores críticos
console.error('[ERROR] Fallo en operación Firestore:', error);

// Usar DebugPanel para inspección en vivo (?debug=1)
```

### Validación de Datos:
```javascript
// Números: verificar NaN y valores válidos
const quantity = Number(form.quantity);
if (isNaN(quantity) || quantity <= 0) {
  setErrorModal({ show: true, message: 'Cantidad inválida' });
  return;
}

// Strings: trim y validar no vacío
const name = form.name.trim();
if (!name) {
  setErrorModal({ show: true, message: 'Nombre es obligatorio' });
  return;
}

// Firestore IDs: verificar antes de operaciones
if (!id || id === 'null' || id === 'undefined') {
  console.error('[ERROR] ID inválido:', id);
  return;
}
```

---

## 🏢 MULTI-TENANT Y LICENCIAMIENTO
**📅 Planificado: Noviembre 2025 | Estado: En análisis**

### Modelo Per-App:
```javascript
// Cada cliente obtiene:
- Proyecto Firebase propio (Auth/Firestore/Hosting)
- Repositorio privado con SOLO binarios (no código fuente)
- Licencia sin caducidad (compra única)
- Gestión de usuarios (seats) hasta límite comprado
```

### Estructura de Licencia:
```javascript
// app_config/license
{
  model: "per-app",
  seatsPurchased: 5,
  seatsUsed: 3,
  salesEnabled: true,
  activatedAt: "2025-11-12T10:00:00Z",
  versionDeployed: "v1.0.0",
  suspended: false
}
```

### Provisioning Manual (Fase 1):
```
1. Crear proyecto Firebase (mf-<cliente>-prod)
2. Activar Auth (Google) y configurar dominios
3. Subir reglas Firestore e índices base
4. Crear docs: app_config/admins, auth, license, rubro
5. Generar build parametrizado con firebaseConfig del tenant
6. Crear repo privado cliente
7. Configurar hosting (Firebase/Vercel)
8. Deploy inicial y verificación
```

### Gestión de Seats:
```javascript
// Asignar seat:
- Precondición: seatsUsed < seatsPurchased
- Añadir a app_config/auth.allowedEmails
- Incrementar seatsUsed

// Revocar seat:
- Quitar de allowedEmails
- Decrementar seatsUsed
- Marcar seat_assignments.status='revoked'
```

### Registro Central de Tenants:
```javascript
// factory/tenants/{tenantId}
{
  tenantId: "floral-sa",
  projectId: "mf-floral-sa-prod",
  appUrl: "https://apps.mundofloral.com/floral-sa",
  repoUrl: "https://github.com/factory/floral-sa-app-bin",
  ownerEmails: ["responsable@cliente.com"],
  rubroId: "floreria",
  versionDeployed: "v1.0.0",
  seats: { purchased: 5, used: 0 },
  provisioningState: "completed"
}
```

### Distribución de Upgrades:
```
1. Pipeline central construye versión vX.Y.Z
2. Para cada tenant activo:
   - Reemplaza build/ con binario nuevo
   - Actualiza VERSION
   - Commit + tag en repo cliente
   - Dispara workflow de deploy
   - Actualiza versionDeployed en Firestore
3. Rollback: re-publicar build anterior (tag previo)
```

**📄 Documentación completa**: `doc/Plan_Provisioning_Licencias.md`

---

## 🧪 ENTORNOS DE PRUEBA POR CLIENTE
**📅 Establecido: Noviembre 2025**

### Control de Expiración:
```javascript
// Colección: app_control
// Documento: CLIENTE_ID
{
  clienteId: "cliente_acme",
  expiresAt: Timestamp,
  status: "active" | "expired" | "read-only",
  message: "Ambiente de prueba válido hasta 01/01/2026"
}
```

### Modo Solo Lectura:
```javascript
// Guard para operaciones de escritura:
function guardWrite(action) {
  if (isReadOnly || isExpired) {
    alert('Ambiente de prueba en modo solo lectura o expirado.');
    return;
  }
  action();
}

// Aplicar en TODAS las operaciones de escritura
<Button onClick={() => guardWrite(() => crearMovimiento(datos))}>Guardar</Button>
```

### Arquitectura:
```
- Portal de Control: nuevo proyecto separado para gestión
  * Listar clientes y URLs
  * Definir fecha expiración
  * Cambiar estado (activo/expirado/solo lectura)

- App por cliente: mismo código base
  * Variables entorno Vercel
  * Firebase por cliente
  * Lee documento app_control al iniciar

- Despliegues independientes:
  * Un proyecto Vercel por cliente
  * Un proyecto Firebase por cliente
```

**📄 Documentación completa**: `doc/Guia_Pruebas_y_Control_Entornos.md`

---

## 🔄 ADAPTACIÓN A OTROS RUBROS
**📅 Guía creada: Agosto 2025**

### Proceso de Adaptación:
```
1. Cambiar textos: "Planta" → "Producto"/"Pan"/"Item"
   - Usar buscar y reemplazar en src/components/

2. Ajustar formularios:
   - Campos relevantes al rubro (tipo, peso, categoría)
   - Validaciones específicas

3. Imágenes y categorías:
   - Crear carpeta: public/img/pan/ (ejemplo panadería)
   - Logo: public/imgLogo/

4. Nuevos campos:
   - Agregar en formularios
   - Actualizar lógica de guardado en Firebase

5. Configurar rubro:
   - app_config/rubro o profile/rubro
   { rubroId: "panaderia", nombre: "Panadería" }
```

### Rubros Soportados:
```
- Florería (base actual)
- Panadería
- Almacén
- Otros (configurables)
```

### Estructura de Imágenes:
```
public/
  img/
    plants/     ← Florería
    pan/        ← Panadería
    productos/  ← Almacén genérico
  imgLogo/      ← Logo del negocio
```

**📄 Guía completa**: `Guia_Instalacion_Despliegue_y_Adaptacion.txt`

---

## 📚 Referencias Rápidas

### Documentación de Usuario:
- `doc/Guia_Usuario_MundoFloral.md` — Manual completo de usuario
- `doc/Casos_de_Uso.md` — Escenarios comunes de uso
- `doc/Guia_Visual.md` — Guía visual con capturas
- `doc/Guia_Rapida.md` — Referencia rápida

### Documentación Técnica:
- `doc/dev/Arquitectura_Tecnica.md` — Arquitectura y decisiones
- `doc/dev/README_DEV.md` — Guía de desarrollo
- `doc/dev/Changelog.md` — Historial de cambios
- `doc/dev/Roadmap_Desarrollo.md` — Mejoras futuras
- `NORMAS_REUTILIZACION.md` — Normas de código reutilizable

### Documentación de Autenticación:
- `doc/Guia_Rapida_Login_y_Fachada.md` — Login y autorización
- `doc/dev/Fachada_Arquitectura.md` — Arquitectura de fachada
- `README.md` — Setup y configuración

### Documentación Multi-tenant:
- `doc/Plan_Provisioning_Licencias.md` — Provisioning y licencias
- `doc/Plan_Comercial_Licenciamiento.md` — Modelo comercial
- `doc/Guia_Pruebas_y_Control_Entornos.md` — Entornos de prueba

### Componentes Clave:
- `src/utils/productManagement.js` — Utilidades de productos
- `src/components/Inventory/InventoryView.js` — Gestión inventario
- `src/components/Inventory/ProductTypesManager.js` — Tipos de productos
- `src/components/Shared/PlantAutocomplete.js` — Autocompletado
- `src/auth/authService.js` — Servicios de autenticación
- `src/auth/AuthProvider.js` — Proveedor de autenticación

---

**Última actualización**: 2025-12-10  
**Responsable**: Desarrollo MundoFloral
