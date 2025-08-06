# 🚀 Roa## 🎯 **Proyectos en Consideración**

### 🔧 **1. Mejoras a la Gestión de Productos**
**Est### 📦 **3. Sistema de Combos/Compose**do**: 💭 En análisis técnico  
**Prioridad**: ⭐⭐⭐⭐⭐ Crítica  
**Tiempo est### 📱 **Para Móvil:**
| Mejora | Prioridad | Tiempo | Estado |
|--------|-----------|--------|---------|
| 🔧 Gestión de productos mejorada | ⭐⭐⭐⭐⭐ | 5-7 sem | 💭 En análisis |
| 💰 Pagos combinados/mixtos | ⭐⭐⭐⭐ | 3-4 sem | 💭 En análisis |
| 🔍 Buscador de movimientos | ⭐⭐⭐ | 30 min | 💭 Pendiente |
| 📊 Dashboard con totales del día | ⭐⭐ | 45 min | 💭 Pendiente |
| ⭐ Productos favoritos/frecuentes | ⭐⭐ | 1 hora | 💭 Pendiente |
| 📷 Fotos de productos | ⭐ | 2 horas | 💭 Pendiente |

### 💻 **Para Escritorio:**
| Mejora | Prioridad | Tiempo | Estado |
|--------|-----------|--------|---------|
| 🔧 Gestión de productos mejorada | ⭐⭐⭐⭐⭐ | 5-7 sem | 💭 En análisis |
| 💰 Pagos combinados/mixtos | ⭐⭐⭐⭐ | 3-4 sem | 💭 En análisis |
| 📈 Gráficos de ventas mejorados | ⭐⭐⭐ | 1 hora | 💭 Pendiente |
| 🎯 Filtros avanzados | ⭐⭐ | 1 hora | 💭 Pendiente |
| 📤 Exportar a Excel/PDF | ⭐⭐ | 1.5 horas | 💭 Pendiente |
| ⚡ Atajos de teclado | ⭐ | 30 min | 💭 Pendiente |nas  

#### **Descripción:**
Sistema mejorado para manejo de productos, stock, costos y precios con funcionalidades profesionales.

#### **Problemas que resuelve:**
1. **🛒 Productos nuevos**: Poder comprar productos que no existen y crearlos automáticamente
2. **💰 Costos reales**: Actualizar precio de compra → costo del producto (promedio ponderado)
3. **📊 Stock automático**: Control de inventario que se actualiza con ventas/compras
4. **💲 Precios vs costos**: Diferenciación clara entre costo y precio de venta con márgenes
5. **📝 Campo unificado**: "Productos/Detalles" para gastos, ingresos y egresos

#### **Arquitectura propuesta:**
```javascript
// Producto mejorado:
{
  name: "Rosa Roja",
  costPrice: 800,           // Costo promedio ponderado
  basePrice: 1200,          // Precio de venta base
  marginPercentage: 50,     // Margen de ganancia
  stock: 15,                // Stock actual
  lastPurchasePrice: 850,   // Último precio de compra
  isAutoCreated: true,      // Creado automáticamente
  priceHistory: [...]       // Historial de precios
}

// Campo unificado para movimientos:
{
  productOrDetail: "Rosa | Pago de luz",  // Unificado
  isProduct: true,                        // Para distinguir
  quantity: 5,                            // Solo productos
  unitPrice: 800                          // Solo productos
}
```

#### **Beneficios esperados:**
- ✅ **Flujo natural**: No interrupciones por productos nuevos
- ✅ **Costos precisos**: Precios que reflejan la realidad del negocio
- ✅ **Control de stock**: Inventario actualizado automáticamente
- ✅ **Análisis de rentabilidad**: Datos reales para decisiones

**📄 Ver análisis completo**: [Mejoras_Gestion_Productos.md](Mejoras_Gestion_Productos.md)

---

### 💰 **2. Sistema de Pagos Combinados**p de Desarrollo - Mundo Floral

## 📋 Proyectos de Mejoras Futuras

Este documento contiene ideas y proyectos planificados para mejorar la aplicación Mundo Floral. 

---

## 🎯 **Proyectos en Consideración**

### � **1. Sistema de Pagos Combinados**
**Estado**: 💭 En análisis detallado  
**Prioridad**: ⭐⭐⭐⭐ Muy Alta  
**Tiempo estimado**: 3-4 semanas  

#### **Descripción:**
Sistema para permitir pagos mixtos combinando múltiples métodos (efectivo + Mercado Pago + transferencia + tarjeta).

#### **Problema actual:**
- ❌ Solo se puede elegir UN método de pago por venta
- ❌ Casos reales requieren dividir pagos (ej: $150 efectivo + $350 Mercado Pago)
- ❌ Clientes sin cambio exacto no pueden comprar cómodamente

#### **Solución propuesta:**
```javascript
// En lugar de:
paymentMethod: 'efectivo'

// Tendríamos:
paymentMethods: {
  efectivo: 150,
  mercadoPago: 350,
  transferencia: 0,
  tarjeta: 0
}
```

#### **Casos de uso:**
1. **Cliente sin cambio exacto**: $480 compra → $450 efectivo + $30 Mercado Pago
2. **Límites de Mercado Pago**: $2000 compra → $1500 MP + $500 efectivo
3. **Ventas grupales en ferias**: $1200 → $400 efectivo + $300 tarjeta + $500 MP

#### **Fases de implementación:**
- **Fase 1**: Componente UI para división de pagos
- **Fase 2**: Actualización de base de datos y migración
- **Fase 3**: Reportes actualizados con pagos mixtos
- **Fase 4**: Testing completo y documentación

**📄 Ver análisis completo**: [Pagos_Combinados_Analisis.md](Pagos_Combinados_Analisis.md)

---

### �📦 **2. Sistema de Combos/Compose**
**Estado**: 💭 En análisis  
**Prioridad**: ⭐⭐⭐ Alta  
**Tiempo estimado**: 4-6 horas  

#### **Descripción:**
Sistema para crear combos de productos con descuentos automáticos usando arquitectura de composición.

#### **Características propuestas:**
- ✅ Composición dinámica de múltiples productos
- ✅ Reglas de descuento configurables
- ✅ Transparencia total (se ven productos individuales)
- ✅ Aplicación automática de descuentos por cantidad/tipo
- ✅ Compatible con sistema actual de ventas

#### **Arquitectura técnica:**
```javascript
// Estructura propuesta
{
  isCombo: true,
  comboName: "Combo Primavera",
  items: [
    { plantId: "rosa_roja", quantity: 2, unitPrice: 2500 },
    { plantId: "potus", quantity: 1, unitPrice: 1200 }
  ],
  discountRules: [
    { type: "quantity", rule: "3+ items = 10%", amount: 780 }
  ],
  subtotal: 7800,
  finalTotal: 7020
}
```

#### **Reglas de descuento consideradas:**
- 3+ productos = 10% descuento
- 3+ suculentas = 15% descuento  
- Planta + Maceta = 5% descuento
- Configurables y extensibles

#### **Fases de implementación:**
1. **Fase 1**: Base del compose (estructura de datos, cálculos)
2. **Fase 2**: Reglas de descuento automáticas
3. **Fase 3**: UX mejorada (nombres personalizados, previsualización)

#### **Decisiones pendientes:**
- [ ] ¿Cómo mostrar en reportes? (combo vs productos separados)
- [ ] ¿Descuentos fijos o configurables por el usuario?
- [ ] ¿Combos predefinidos o solo armado libre?
- [ ] ¿Retrocompatibilidad con ventas existentes?

---

### 📝 **4. Sistema de Pedidos**
**Estado**: 💭 En análisis  
**Prioridad**: ⭐⭐⭐ Alta  
**Tiempo estimado**: 6-8 horas  

#### **Descripción:**
Sistema completo para gestionar pedidos de clientes con estados, entregas y conversión a ventas.

#### **Estados del pedido:**
```
📝 Pendiente → 🔄 En Preparación → ✅ Listo → 💰 Entregado → Venta
                ↓
              ❌ Cancelado
```

#### **Características propuestas:**
- ✅ Gestión completa de datos del cliente
- ✅ Control de estados del pedido
- ✅ Manejo de señas y pagos pendientes
- ✅ Programación de entregas (domicilio/retiro)
- ✅ Conversión automática a venta al entregar
- ✅ Dashboard con pedidos urgentes y próximos
- ✅ Notificaciones y recordatorios

#### **Estructura de datos:**
```javascript
{
  type: "pedido",
  status: "pendiente",
  client: {
    name: "María García",
    phone: "11-1234-5678",
    address: "Av. Corrientes 1234"
  },
  items: [...],
  delivery: {
    type: "domicilio",
    date: "2025-08-10",
    time: "14:00-16:00"
  },
  payment: {
    advance: 2000,
    pending: 7000
  }
}
```

#### **Fases de implementación:**
1. **Fase 1**: CRUD básico de pedidos + estados
2. **Fase 2**: Dashboard organizado por fechas
3. **Fase 3**: Gestión avanzada (notificaciones, reportes)
4. **Fase 4**: Integración WhatsApp/delivery

#### **Casos de uso identificados:**
- 🎪 Reservas para ferias
- 🚚 Pedidos a domicilio
- 🏪 Encargos especiales para el local
- 💰 Manejo de señas y anticipos

---

## 🎯 **Mejoras Menores Identificadas**

### 📱 **Para Móvil:**
| Mejora | Prioridad | Tiempo | Estado |
|--------|-----------|--------|---------|
| � Pagos combinados/mixtos | ⭐⭐⭐⭐ | 3-4 sem | 💭 En análisis |
| �🔍 Buscador de movimientos | ⭐⭐⭐ | 30 min | 💭 Pendiente |
| 📊 Dashboard con totales del día | ⭐⭐ | 45 min | 💭 Pendiente |
| ⭐ Productos favoritos/frecuentes | ⭐⭐ | 1 hora | 💭 Pendiente |
| 📷 Fotos de productos | ⭐ | 2 horas | 💭 Pendiente |

### 💻 **Para Escritorio:**
| Mejora | Prioridad | Tiempo | Estado |
|--------|-----------|--------|---------|
| 💰 Pagos combinados/mixtos | ⭐⭐⭐⭐ | 3-4 sem | 💭 En análisis |
| 📈 Gráficos de ventas mejorados | ⭐⭐⭐ | 1 hora | 💭 Pendiente |
| 🎯 Filtros avanzados | ⭐⭐ | 1 hora | 💭 Pendiente |
| 📤 Exportar a Excel/PDF | ⭐⭐ | 1.5 horas | 💭 Pendiente |
| ⚡ Atajos de teclado | ⭐ | 30 min | 💭 Pendiente |

### 📊 **Análisis y Reportes:**
| Mejora | Prioridad | Tiempo | Estado |
|--------|-----------|--------|---------|
| 📈 Top productos más vendidos | ⭐⭐ | 45 min | 💭 Pendiente |
| 💰 Análisis de rentabilidad | ⭐⭐ | 1 hora | 💭 Pendiente |
| 📅 Comparativo mensual | ⭐⭐ | 30 min | 💭 Pendiente |
| 🏆 Metas y objetivos | ⭐ | 2 horas | 💭 Pendiente |

---

## 💡 **Ideas para el Futuro**

### 🛒 **Gestión Avanzada:**
- 📦 Control de stock automático
- 👥 Base de datos de clientes
- 🚚 Sistema de entregas con rutas
- 💳 Integración directa con Mercado Pago API

### 🔧 **Funcionalidad:**
- 🔔 Sistema de notificaciones push
- 💾 Backup automático programado
- 👥 Multi-usuario con roles
- 🌙 Modo oscuro/claro

### 📱 **Mobile First:**
- 📱 PWA (Progressive Web App)
- 📲 Notificaciones push nativas
- 📷 Escáner de códigos QR
- 🗣️ Comandos por voz

---

## 📈 **Roadmap Tentativo**

### **🚀 Versión 1.1** (Próximos 2-3 meses)
**Objetivo**: Mejorar funcionalidad core
- ✅ Sistema de Combos/Compose
- ✅ Buscador móvil
- ✅ Gráficos básicos de ventas
- ✅ Filtros avanzados

### **🚀 Versión 1.2** (3-6 meses)
**Objetivo**: Gestión avanzada
- ✅ Sistema de Pedidos completo
- ✅ Dashboard mejorado
- ✅ Exportar reportes
- ✅ Top productos

### **🚀 Versión 2.0** (6-12 meses)
**Objetivo**: Escalabilidad
- ✅ Multi-usuario
- ✅ Control de stock
- ✅ Integración WhatsApp
- ✅ Base de clientes

---

## 📝 **Notas de Desarrollo**

### **Principios de diseño:**
- 🎯 **Simplicidad primero**: No complicar la UX actual
- 📱 **Mobile first**: Priorizar experiencia móvil
- 🔄 **Retrocompatibilidad**: No romper funcionalidad existente
- ⚡ **Performance**: Mantener velocidad de carga
- 📊 **Data driven**: Decisiones basadas en uso real

### **Criterios de priorización:**
1. **⭐⭐⭐ Alta**: Impacto directo en ventas/productividad diaria
2. **⭐⭐ Media**: Mejora la experiencia pero no es crítica
3. **⭐ Baja**: Nice to have, para cuando tengamos tiempo

### **Metodología:**
- 🔄 Desarrollo iterativo en fases pequeñas
- 🧪 Testing con usuario real antes de cada release
- 📝 Documentación actualizada con cada cambio
- 🔍 Análisis de uso antes de implementar features complejas

---

## 💭 **Ideas de la Comunidad**

_Espacio para anotar sugerencias y ideas que surjan del uso diario:_

- [ ] **Idea 1**: [Descripción pendiente]
- [ ] **Idea 2**: [Descripción pendiente]
- [ ] **Idea 3**: [Descripción pendiente]

---

**📅 Última actualización**: Agosto 2025  
**🔄 Próxima revisión**: Septiembre 2025  

*Este roadmap es dinámico y se actualiza según las necesidades reales del negocio y feedback de usuarios.*
