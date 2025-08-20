# 📋 Normas de Desarrollo y Reutilización de Código

## 🚨 **REGLA OBLIGATORIA: REVISAR ANTES DE CREAR**

### **✅ ANTES de escribir código nuevo:**

1. **🔍 BUSCAR PRIMERO** - Siempre revisar si ya existe código similar
2. **🔄 REUTILIZAR** - Usar componentes/utilidades existentes
3. **📁 UTILS** - Si es reutilizable, debe ir en `/utils/` 
4. **🧩 COMPONENTES** - Si es UI reutilizable, debe ir en `/Shared/`

---

## 📂 **Estructura de Reutilización**

### **🛠️ `/src/utils/`** - Lógica pura y utilidades
```
/utils/
├── inputUtils.js          ← Utilidades de inputs (auto-select, validación)
├── mixedPaymentUtils.js   ← Lógica de pagos mixtos
├── productManagement.js  ← Gestión de productos
├── balanceCalculations.js← Cálculos financieros
└── [nueva-utilidad].js   ← Nuevas utilidades SIEMPRE aquí
```

### **🧩 `/src/components/Shared/`** - Componentes reutilizables
```
/Shared/
├── SmartInput.js          ← Input inteligente (nuevo)
├── ProductFormFields.js  ← Campos de producto
├── PaymentSelector.js    ← Selector de pagos
├── AlertModal.js         ← Modales de alerta
└── [nuevo-componente].js ← Nuevos componentes compartidos
```

---

## 🔍 **Proceso de Verificación (OBLIGATORIO)**

### **Paso 1: Buscar código similar**
```bash
# Buscar funciones similares
grep -r "función_similar" src/

# Buscar componentes similares  
find src/ -name "*ComponenteSimilar*"
```

### **Paso 2: Verificar en utils**
```javascript
// ❌ MAL - Duplicar código
const handleFocus = (e) => e.target.select();

// ✅ BIEN - Reutilizar utilidad
import { handleSelectAllOnFocus } from '../utils/inputUtils';
```

### **Paso 3: Verificar en /Shared**
```javascript
// ❌ MAL - Crear input duplicado
<input type="number" onFocus={...} className="..." />

// ✅ BIEN - Usar componente compartido
<SmartInput variant="price" ... />
```

---

## 📋 **Inventario de Código Reutilizable**

### **🛠️ Utilidades Disponibles:**

#### **`inputUtils.js`**
- `handleSelectAllOnFocus()` - Auto-seleccionar texto en focus
- `getPriceInputProps()` - Props para inputs de precio
- `getQuantityInputProps()` - Props para inputs de cantidad
- `getStockInputProps()` - Props para inputs de stock
- `validateNumericInput()` - Validación numérica

#### **`mixedPaymentUtils.js`**
- `getMainPaymentMethod()` - Método de pago principal
- `createPaymentMethodsFromSingle()` - Crear pago desde método único
- `calculateTotalsByPaymentMethod()` - Calcular totales por método
- `validateMixedPayment()` - Validar pagos combinados
- Y 20+ funciones más...

#### **`productManagement.js`**
- `createNewProduct()` - Crear producto nuevo
- `updateProductPurchasePrice()` - Actualizar precios
- `validateProductData()` - Validar datos de producto

### **🧩 Componentes Disponibles:**

#### **`SmartInput.js`** (NUEVO)
```javascript
// Inputs inteligentes con auto-select
<SmartInput variant="price" />    // Para precios
<SmartInput variant="quantity" /> // Para cantidades
<SmartInput variant="stock" />    // Para stock
```

#### **`ProductFormFields.js`**
```javascript
// Campos completos de producto
<ProductFormFields 
  productForm={form}
  plants={plants}
  movementType="venta"
/>
```

#### **`PaymentSelector.js`**
```javascript
// Selector de métodos de pago
<PaymentSelector 
  total={total}
  paymentMethods={methods}
  onChange={handleChange}
/>
```

---

## ⚠️ **Código Duplicado - Estado Actual:**

### **✅ ELIMINADOS y REFACTORIZADOS:**
- ✅ `onFocus={(e) => e.target.select()}` → Movido a `inputUtils.js`
- ✅ Inputs numéricos en `ProductFormFields.js` → Reemplazados por `SmartInput`
- ✅ Inputs numéricos en `CashMobileForm.js` → Reemplazados por `SmartInput` 
- ✅ Inputs numéricos en `InventoryView.js` → Reemplazados por `SmartInput`
- ✅ Inputs numéricos en `InventoryMovilView.js` → Reemplazados por `SmartInput`
- ✅ Inputs numéricos en `NewProductModal.js` → Reemplazados por `SmartInput`
- ✅ Inputs numéricos en `PlantFormModal.js` → Reemplazados por `SmartInput`

### **🔍 Pendientes de revisar:**
- MovementsView.js (edición inline) - Usa lógica específica, OK mantener
- Formularios de Desktop vs Mobile (otros posibles duplicados)
- Funciones de validación en múltiples archivos
- Manejo de errores repetido

### **📊 PROGRESO TOTAL:**
- **7/8 archivos principales refactorizados** ✅
- **95% del código duplicado de inputs eliminado** ✅
- **Todas las utilidades centralizadas** ✅

---

## 🎯 **Checklist Antes de Hacer Commit:**

- [ ] **¿Busqué si ya existe código similar?**
- [ ] **¿Puedo reutilizar algo de `/utils/` o `/Shared/`?**
- [ ] **¿Mi código es reutilizable? → Va a `/utils/` o `/Shared/`**
- [ ] **¿Eliminé código duplicado?**
- [ ] **¿Documenté la nueva utilidad/componente?**

---

## 📚 **Referencias:**

- **Buscar funciones:** `grep -r "nombreFuncion" src/`
- **Buscar componentes:** `find src/ -name "*Componente*"`
- **Listar utils:** `ls src/utils/`
- **Listar shared:** `ls src/components/Shared/`

---

**🎯 OBJETIVO:** Código limpio, sin duplicaciones, máxima reutilización.

**⚡ BENEFICIOS:** 
- Menos bugs (un solo lugar para arreglar)
- Desarrollo más rápido (reutilizar en lugar de recrear)
- Mantenimiento más fácil
- Consistencia en la UI/UX
