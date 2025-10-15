# 🔧 Análisis Técnico - Proyectos de Desarrollo

## 📋 Especificaciones Técnicas Detalladas

---

## 📦 **Proyecto: Sistema de Combos/Compose**

### 🏗️ **Arquitectura Técnica**

#### **1. Modificaciones en Base de Datos:**
```javascript
// Estructura actual (venta simple)
{
  type: "venta",
  plantId: "rosa_roja",
  quantity: 2,
  price: 2500,
  total: 5000
}

// Estructura propuesta (compatible)
{
  type: "venta",
  isCombo: false, // nuevo campo, default false
  
  // Para ventas simples (mantiene compatibilidad)
  plantId: "rosa_roja",
  quantity: 2,
  price: 2500,
  total: 5000,
  
  // Para combos (nuevos campos opcionales)
  comboName: null,
  items: null,
  subtotal: null,
  discountApplied: null
}

// Estructura para combos
{
  type: "venta",
  isCombo: true,
  comboName: "Combo Primavera",
  
  // Campos heredados (para reportes simples)
  plantId: "COMBO",
  quantity: 1,
  price: 7020,
  total: 7020,
  
  // Detalle del combo
  items: [
    { plantId: "rosa_roja", quantity: 2, unitPrice: 2500, itemTotal: 5000 },
    { plantId: "potus", quantity: 1, unitPrice: 1200, itemTotal: 1200 }
  ],
  subtotal: 6200,
  discountRules: [
    { id: "quantity_3", name: "3+ productos", percentage: 10, amount: 620 }
  ],
  discountApplied: 620
}
```

#### **2. Componentes a Crear:**
```
src/components/Combo/
├── ComboBuilder.js         # Constructor principal
├── ComboItemList.js        # Lista de productos en combo
├── ComboDiscountEngine.js  # Motor de descuentos
├── ComboPreview.js         # Preview del combo
└── ComboRules.js          # Configuración de reglas
```

#### **3. Lógica de Descuentos:**
```javascript
// Motor de reglas configurables
const COMBO_RULES = [
  {
    id: "quantity_bulk",
    name: "Descuento por cantidad",
    condition: (items) => items.length >= 3,
    discount: { type: "percentage", value: 10 },
    priority: 1
  },
  {
    id: "suculentas_special",
    name: "3 suculentas especial",
    condition: (items) => {
      const suculentas = items.filter(item => 
        item.category === 'suculenta' || 
        item.name.toLowerCase().includes('suculenta')
      );
      return suculentas.length >= 3;
    },
    discount: { type: "percentage", value: 15 },
    priority: 2
  },
  {
    id: "plant_pot_combo",
    name: "Planta + Maceta",
    condition: (items) => {
      const hasPlant = items.some(item => item.category === 'planta');
      const hasPot = items.some(item => item.category === 'maceta');
      return hasPlant && hasPot;
    },
    discount: { type: "percentage", value: 5 },
    priority: 3
  }
];

// Función de aplicación de descuentos
function calculateBestDiscount(items) {
  const applicableRules = COMBO_RULES
    .filter(rule => rule.condition(items))
    .sort((a, b) => b.priority - a.priority);
  
  // Aplicar el mejor descuento (mayor prioridad)
  return applicableRules[0] || null;
}
```

#### **4. Integración con Formularios Existentes:**
- Modificar `SalesDesktopForm.js` para soportar modo combo
- Agregar toggle "¿Es un combo?" 
- Reutilizar `ProductFormFields` para agregar items
- Mostrar calculator de descuentos en tiempo real

---

## 📝 **Proyecto: Sistema de Pedidos**

### 🏗️ **Arquitectura Técnica**

#### **1. Nueva Colección en Firestore:**
```javascript
// Colección: "pedidos"
{
  id: "pedido_20250806_001",
  type: "pedido",
  status: "pendiente", // pendiente, preparacion, listo, entregado, cancelado
  
  // Información del cliente
  client: {
    name: "María García",
    phone: "11-1234-5678",
    email: "maria@email.com", // opcional
    address: {
      street: "Av. Corrientes 1234",
      city: "Buenos Aires",
      notes: "Portero hasta las 18hs"
    }
  },
  
  // Productos del pedido
  items: [
    {
      plantId: "rosa_roja",
      plantName: "Rosa Roja Mediana", // desnormalizado para performance
      quantity: 3,
      unitPrice: 2500,
      itemTotal: 7500,
      notes: "Color específico rojo intenso"
    }
  ],
  
  // Información de entrega
  delivery: {
    type: "domicilio", // domicilio, retiro, feria
    scheduledDate: "2025-08-10",
    scheduledTime: "14:00-16:00",
    actualDate: null, // cuando se entregó realmente
    cost: 500,
    notes: "Llamar antes de llegar"
  },
  
  // Información de pagos
  payment: {
    method: "efectivo", // efectivo, mercadopago, mixto
    total: 8000,
    advance: 2000, // seña pagada
    pending: 6000, // pendiente de pago
    advanceDate: "2025-08-06T10:30:00Z",
    advanceMethod: "mercadopago"
  },
  
  // Timestamps
  dates: {
    created: "2025-08-06T10:30:00Z",
    modified: "2025-08-06T10:30:00Z",
    promised: "2025-08-10T14:00:00Z",
    delivered: null
  },
  
  // Metadatos
  notes: "Cliente habitual, le gusta empaque especial",
  priority: "normal", // baja, normal, alta, urgente
  source: "telefono", // telefono, whatsapp, local, online
  
  // Trazabilidad
  statusHistory: [
    { status: "pendiente", date: "2025-08-06T10:30:00Z", user: "admin" }
  ]
}
```

#### **2. Estados y Transiciones:**
```javascript
const PEDIDO_STATES = {
  pendiente: {
    label: "Pendiente",
    color: "yellow",
    nextStates: ["preparacion", "cancelado"],
    actions: ["editar", "cancelar", "iniciar_preparacion"]
  },
  preparacion: {
    label: "En Preparación", 
    color: "blue",
    nextStates: ["listo", "pendiente", "cancelado"],
    actions: ["marcar_listo", "volver_pendiente", "cancelar"]
  },
  listo: {
    label: "Listo para Entrega",
    color: "green", 
    nextStates: ["entregado", "preparacion"],
    actions: ["entregar", "volver_preparacion"]
  },
  entregado: {
    label: "Entregado",
    color: "gray",
    nextStates: [],
    actions: ["ver_venta_generada"],
    final: true
  },
  cancelado: {
    label: "Cancelado",
    color: "red",
    nextStates: [],
    actions: ["ver_motivo"],
    final: true
  }
};
```

#### **3. Componentes a Crear:**
```
src/components/Pedidos/
├── PedidosDashboard.js     # Vista principal
├── PedidoForm.js          # Formulario nuevo pedido
├── PedidoCard.js          # Card individual de pedido
├── PedidoDetail.js        # Vista detallada
├── PedidoStatusManager.js # Cambio de estados
├── ClienteForm.js         # Datos del cliente
├── DeliveryForm.js        # Datos de entrega
├── PedidosFilters.js      # Filtros y búsqueda
└── PedidosCalendar.js     # Vista calendario
```

#### **4. Integración con Ventas:**
```javascript
// Función de conversión pedido → venta
async function convertirPedidoAVenta(pedidoId) {
  const pedido = await getPedido(pedidoId);
  
  // Crear venta basada en el pedido
  const venta = {
    type: "venta",
    // Si es un solo producto
    plantId: pedido.items.length === 1 ? pedido.items[0].plantId : "PEDIDO_MULTIPLE",
    quantity: pedido.items.reduce((sum, item) => sum + item.quantity, 0),
    price: pedido.payment.total,
    total: pedido.payment.total,
    
    // Metadatos del pedido
    paymentMethod: pedido.payment.method,
    date: new Date().toISOString(),
    location: pedido.delivery.type === "domicilio" ? "Domicilio" : "Local",
    notes: `Pedido #${pedido.id} - Cliente: ${pedido.client.name}`,
    
    // Referencia al pedido original
    fromPedido: true,
    pedidoId: pedido.id,
    
    // Si es múltiple, guardar detalle
    items: pedido.items.length > 1 ? pedido.items : null
  };
  
  // Actualizar estado del pedido
  await updatePedido(pedidoId, { 
    status: "entregado",
    dates: { ...pedido.dates, delivered: new Date().toISOString() }
  });
  
  return await createMovement(venta);
}
```

---

## 🔄 **Plan de Migración**

### **Para Combos:**
1. **Agregar campos opcionales** a la estructura actual
2. **Mantener retrocompatibilidad** total
3. **Migración gradual** - las ventas nuevas pueden usar combos
4. **Reportes híbridos** - funcionan con ambos formatos

### **Para Pedidos:**
1. **Nueva colección independiente** - no afecta datos existentes
2. **Integración opcional** - se puede usar junto al sistema actual
3. **Conversión a ventas** - mantiene el flujo de datos actual

---

## 📊 **Impacto en Performance**

### **Combos:**
- ➕ **Mínimo impacto** - solo agrega campos opcionales
- ➕ **Queries existentes siguen funcionando**
- ➖ **Cálculos adicionales** en tiempo real
- 🔧 **Solución**: Cache de reglas de descuento

### **Pedidos:**
- ➕ **Cero impacto** en funcionalidad actual
- ➕ **Colección separada** - queries independientes  
- ➖ **Nueva carga de datos** en dashboard
- 🔧 **Solución**: Lazy loading, pagination

---

## 🧪 **Plan de Testing**

### **Fase 1: Testing Básico**
- [ ] CRUD de combos funciona
- [ ] Cálculo de descuentos correcto
- [ ] Retrocompatibilidad con ventas simples
- [ ] CRUD de pedidos funciona
- [ ] Transiciones de estado correctas

### **Fase 2: Testing de Integración**
- [ ] Conversión pedido → venta
- [ ] Reportes incluyen combos correctamente
- [ ] Performance con muchos pedidos
- [ ] Sincronización móvil/escritorio

### **Fase 3: Testing de Usuario**
- [ ] UX intuitiva para crear combos
- [ ] Dashboard de pedidos útil
- [ ] Flujo completo pedido → entrega
- [ ] Testing con usuario real

---

**📅 Documento creado**: Agosto 2025  
**🔄 Última actualización**: Agosto 2025
