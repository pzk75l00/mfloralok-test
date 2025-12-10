import React, { useState, useEffect } from 'react';
import { collection, setDoc, getDocs, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import PlantForm from './PlantForm';
import PlantAutocomplete from './PlantAutocomplete';
import { toZonedTime } from 'date-fns-tz';
import { registrarVenta } from './saleUtils';
import PropTypes from 'prop-types';
import { updateProductPurchasePrice } from '../../utils/productManagement';
import { 
  validateMixedPayment, 
  generatePaymentSummary, 
  getMainPaymentMethod,
  createPaymentMethodsFromSingle,
  calculateTotalsByPaymentMethod,
  scalePaymentMethods 
} from '../../utils/mixedPaymentUtils';
import SalesMobileForm from '../Movil/forms/SalesMobileForm';
import SalesDesktopForm from '../Desktop/forms/SalesDesktopForm';
import CashMobileForm from '../Movil/forms/CashMobileForm';
import CashDesktopForm from '../Desktop/forms/CashDesktopForm';

const MOVEMENT_TYPES = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'gasto', label: 'Gasto' }
];

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo (E)' },
  { value: 'mercadoPago', label: 'Mercado Pago (MP)' }
];

// Función para obtener fecha/hora local inicial
const getInitialLocalDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

// Este componente se moverá a la carpeta Base
const MovementsView = ({ plants: propPlants, hideForm, showOnlyForm, renderTotals, onMovementAdded, selectedMonth, selectedYear, showOnlySalesOfDay, selectedDate }) => {
  const [plants, setPlants] = useState(propPlants || []);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({
    type: 'venta', // Volver al valor por defecto original
    detail: '',
    plantId: '',
    quantity: 1,
    price: '',
    total: '',
    paymentMethod: 'efectivo',
    paymentMethods: {
      efectivo: 0,
      mercadoPago: 0,
      transferencia: 0,
      tarjeta: 0
    },
    date: getInitialLocalDateTime(),
    location: '',
    notes: ''
  });
  const [showSuggestPlant, setShowSuggestPlant] = useState(false);
  const [suggestedPlantName, setSuggestedPlantName] = useState('');
  const [showPlantForm, setShowPlantForm] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState(null);
  const [toastError, setToastError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0); // Prevenir submits muy rápidos
  const [isChangingPayment, setIsChangingPayment] = useState(false); // Nuevo flag para métodos de pago
  const [isPaymentManual, setIsPaymentManual] = useState(false); // Si el usuario configuró pagos manualmente
  const [editingMovement, setEditingMovement] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [blurTimeout, setBlurTimeout] = useState(null);
  // Estados para filtros de escritorio
  const [selectedYearDesktop, setSelectedYearDesktop] = useState(new Date().getFullYear());
  const [selectedMonthDesktop, setSelectedMonthDesktop] = useState(new Date().getMonth());
  const [searchTerm, setSearchTerm] = useState('');
  // Estados para drag-scroll
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScrollLeft, setDragStartScrollLeft] = useState(0);

  // Helper para mostrar método de pago correcto por fila
  const renderPaymentSummary = (mov) => {
    try {
      const rowTotal = parseFloat(mov?.total) || 0;
      if (rowTotal <= 0) {
        // Si el total es 0, no mostrar montos heredados; solo etiqueta del método si existe
        return (PAYMENT_METHODS.find(m => m.value === mov.paymentMethod)?.label || mov.paymentMethod || '-');
      }
      // Si tiene estructura nueva, calcular proporcional al total de la fila si hace falta
      if (mov && mov.paymentMethods && typeof mov.total !== 'undefined') {
        const fullTotal = Object.values(mov.paymentMethods).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        if (fullTotal > 0 && rowTotal > 0) {
          if (Math.abs(fullTotal - rowTotal) < 0.01) {
            return generatePaymentSummary(mov.paymentMethods);
          }
          const scaled = scalePaymentMethods(mov.paymentMethods, rowTotal, fullTotal);
          return generatePaymentSummary(scaled);
        }
      }
      // Si no hay estructura nueva, usar resumen guardado o el método simple
      return mov.paymentSummary || (PAYMENT_METHODS.find(m => m.value === mov.paymentMethod)?.label || mov.paymentMethod || '-');
    } catch (e) {
      return mov.paymentSummary || (PAYMENT_METHODS.find(m => m.value === mov.paymentMethod)?.label || mov.paymentMethod || '-');
    }
  };

  // --- FILTRO MENSUAL ---
  const [reloadKey, setReloadKey] = useState(0);
  const now = new Date();
  const currentMonth = typeof selectedMonth === 'number' ? selectedMonth : now.getMonth();
  const currentYear = typeof selectedYear === 'number' ? selectedYear : now.getFullYear();
  
  // En escritorio: usar selectores, en móvil: mes/año actuales
  const filterMonth = isMobile ? currentMonth : selectedMonthDesktop;
  const filterYear = isMobile ? currentYear : selectedYearDesktop;
  
  // Filtrar por mes/año
  const movementsFilteredByDate = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === filterMonth && d.getFullYear() === filterYear;
  }).sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha más reciente primero
  
  // Aplicar búsqueda textual
  const movementsThisMonth = movementsFilteredByDate.filter(mov => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    const plantName = plants && mov.plantId 
      ? (plants.find(p => String(p.id) === String(mov.plantId))?.name || '').toLowerCase()
      : '';
    const detail = (mov.detail || '').toLowerCase();
    const notes = (mov.notes || '').toLowerCase();
    const location = (mov.location || '').toLowerCase();
    const typeLabel = (MOVEMENT_TYPES.find(t => t.value === mov.type)?.label || '').toLowerCase();
    const paymentSummary = (renderPaymentSummary(mov) || '').toLowerCase();
    return plantName.includes(searchLower) || detail.includes(searchLower) || 
           notes.includes(searchLower) || location.includes(searchLower) ||
           typeLabel.includes(searchLower) || paymentSummary.includes(searchLower);
  });

  // --- NUEVO ESTADO PARA VENTA MULTIPRODUCTO ---
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ plantId: '', quantity: 1, price: '' });

  useEffect(() => {
    // Sincronizar plantas y movimientos en un solo efecto para evitar race conditions
    const unsubPlants = onSnapshot(collection(db, 'producto'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    const unsubMovements = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
    return () => {
      unsubPlants();
      unsubMovements();
    };
  }, [reloadKey]);

  const handleReload = () => {
    setReloadKey(k => k + 1);
  };

  // Manejadores para drag-scroll horizontal
  const handleHistoryMouseDown = (e) => {
    if (!isMobileDevice && e.button === 0) {
      const container = e.currentTarget;
      setIsDraggingScroll(true);
      setDragStartX(e.clientX);
      setDragStartScrollLeft(container.scrollLeft);
    }
  };

  const handleHistoryMouseMove = (e) => {
    if (!isDraggingScroll || isMobileDevice) return;
    const container = e.currentTarget;
    const deltaX = e.clientX - dragStartX;
    container.scrollLeft = dragStartScrollLeft - deltaX;
  };

  const handleHistoryMouseUpOrLeave = () => {
    setIsDraggingScroll(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Calcular saldos actuales de caja antes del submit (compatible con pagos combinados)
  const calculateCashBalance = (movements, method) => {
    let totalBalance = 0;
    let processedMovements = 0;
    
    const balance = movements.reduce((sum, m) => {
      let amount = 0;
      
      // Si tiene paymentMethods (nuevo formato)
      if (m.paymentMethods && m.paymentMethods[method]) {
        amount = Number(m.paymentMethods[method]) || 0;
        if (amount > 0) {
          processedMovements++;
        }
      } 
      // Si usa formato antiguo
      else if (m.paymentMethod === method) {
        amount = Number(m.total) || 0; // Usar m.total para el monto del movimiento
        if (amount > 0) {
          processedMovements++;
        }
      }
      
      if (m.type === 'venta' || m.type === 'ingreso') return sum + amount;
      if (m.type === 'compra' || m.type === 'egreso' || m.type === 'gasto') return sum - amount;
      return sum;
    }, 0);
    
    return balance;
  };
  
  const cajaActualEfectivo = calculateCashBalance(movements, 'efectivo');
  const cajaActualMP = calculateCashBalance(movements, 'mercadoPago');

  // --- FUNCIONES PARA MANEJAR PRODUCTOS EN LA VENTA ---
  const handleProductFormChange = (e) => {
    const { name, value } = e.target;
    setProductForm(prev => ({ ...prev, [name]: value }));
  };
  const handleAddProduct = async (e) => {
    e?.preventDefault && e.preventDefault();
    if (!productForm.plantId || !productForm.quantity || !productForm.price) return;
    // Validar stock al agregar producto SOLO si es venta
    if (form.type === 'venta') {
      const plant = plants.find(p => String(p.id) === String(productForm.plantId));
      if (!plant) {
        setErrorMsg('Producto no encontrado en inventario.');
        return;
      }
      const currentStock = plant.stock || 0;
      if (currentStock < Number(productForm.quantity)) {
        setErrorMsg(`Stock insuficiente para ${plant.name}. Disponible: ${currentStock}`);
        return;
      }
    }
    const plant = plants.find(p => String(p.id) === String(productForm.plantId));
    setProducts(prev => [...prev, {
      plantId: productForm.plantId,
      name: plant?.name || '',
      quantity: Number(productForm.quantity),
      price: Number(productForm.price),
      total: Number(productForm.quantity) * Number(productForm.price)
    }]);
    setProductForm({ plantId: '', quantity: 1, price: '' });
    setErrorMsg('');
  };
  const handleRemoveProduct = (idx) => {
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };
  
  // Función para actualizar la lista de plantas cuando se crea un producto nuevo
  const handleProductsUpdated = (updatedPlants) => {
    setPlants(updatedPlants);
  };
  
  // Agregar automáticamente el producto recién creado al movimiento actual (solo para compras)
  const handleCreateAndAdd = (newProduct) => {
    try {
      if (form.type !== 'compra') {
        // Por ahora solo auto-agregamos en Compras para evitar ventas con stock 0
        return;
      }
  // Usar cantidad prevista (intendedQty) provista por el modal para compras; fallback a 1
  const qty = Math.max(1, parseInt(newProduct?.intendedQty) || 1);
      const unitPrice = parseFloat(newProduct?.basePrice) || 0; // En compras usamos basePrice (precio de compra)
      setProducts(prev => [
        ...prev,
        {
          plantId: newProduct.id,
          name: newProduct.name || '',
          quantity: qty,
          price: unitPrice,
          total: qty * unitPrice
        }
      ]);
      setProductForm({ plantId: '', quantity: 1, price: '' });
      setErrorMsg('');
    } catch (e) {
      console.warn('No se pudo auto-agregar el producto recién creado:', e);
    }
  };
  
  // Función para manejar cambios en métodos de pago combinados
  const handlePaymentMethodsChange = (paymentMethods) => {
    // Marcar que se está cambiando el método de pago
    setIsChangingPayment(true);
  setIsPaymentManual(true);
    
    const mainMethod = getMainPaymentMethod(paymentMethods);
    setForm(prev => ({
      ...prev,
      paymentMethods,
      paymentMethod: mainMethod // Mantener compatibilidad
    }));
    
    // Resetear el flag después de un tiempo
    setTimeout(() => {
      setIsChangingPayment(false);
    }, 1000);
  };

  // Confirmar pago desde el modal y enviar el movimiento inmediatamente
  const handleConfirmPaymentAndSubmit = async ({ payments, confirmedAt }) => {
    try {
      // Cargar métodos confirmados y marcar como manual
      const mainMethod = getMainPaymentMethod(payments);
      setForm(prev => ({ ...prev, paymentMethods: payments, paymentMethod: mainMethod }));
      setIsPaymentManual(true);
      setIsChangingPayment(false);
      // Ejecutar el submit con un pequeño delay para que se aplique el estado
      setTimeout(() => {
        const fakeEvent = { preventDefault: () => {}, isTrusted: true };
        // Pasar los métodos confirmados para evitar condiciones de carrera con el estado
        handleSubmit(fakeEvent, { overridePaymentMethods: payments, confirmedAt });
      }, 0);
    } catch (e) {
      console.error('Error al confirmar pago y enviar:', e);
    }
  };
  
  const ventaTotal = products.reduce((sum, p) => sum + p.total, 0);
  
  // ELIMINAMOS EL useEffect PROBLEMÁTICO TEMPORALMENTE

  const handleSubmit = async (e, options = {}) => {
    e.preventDefault();
    
    // Prevenir doble envío
    if (isSubmitting) {
      return;
    }
    
    // PROTECCIÓN CONTRA SUBMIT DURANTE CAMBIO DE MÉTODO DE PAGO
    if (isChangingPayment) {
      setErrorMsg('⚠️ Configurando método de pago, espere...');
      setTimeout(() => setErrorMsg(''), 2000);
      return;
    }
    
    // PROTECCIÓN ANTI-SUBMIT AUTOMÁTICO PARA MÓVILES
    const currentTime = Date.now();
    if (isMobileDevice && (form.type === 'venta' || form.type === 'compra')) {
      // Prevenir submits muy rápidos (menos de 2 segundos)
      if (currentTime - lastSubmitTime < 2000) {
        setErrorMsg('⚠️ Espere un momento antes de enviar otra transacción');
        setTimeout(() => setErrorMsg(''), 3000);
        return;
      }
      
      // Verificar que el usuario realmente quiere proceder
      const isIntentional = e?.isTrusted !== false; // Verificar que es un evento real del usuario
      
      if (!isIntentional) {
        return;
      }
    }
    
    setLastSubmitTime(currentTime);
    setIsSubmitting(true);
    setErrorMsg('');
    let total = form.total;
    let price = form.price;
    // --- AJUSTE FLUJO VENTA/COMPRA UN SOLO PRODUCTO EN MÓVIL ---
    let currentProducts = products;
    let autoProduct = null;
    if ((form.type === 'venta' || form.type === 'compra') && products.length === 0) {
      // Si los campos requeridos están completos, agregamos el producto automáticamente
      if (productForm.plantId && productForm.quantity && productForm.price) {
        const plant = plants.find(p => String(p.id) === String(productForm.plantId));
        // Validar stock solo para ventas
        if (form.type === 'venta') {
          if (!plant) {
            setErrorMsg('Producto no encontrado en inventario.');
            console.log('[MovementsView] ERROR: Producto no encontrado', {productForm, plants});
            setIsSubmitting(false);
            return;
          }
          const currentStock = plant.stock || 0;
          if (currentStock < Number(productForm.quantity)) {
            setErrorMsg(`Stock insuficiente para ${plant.name}. Disponible: ${currentStock}`);
            console.log('[MovementsView] ERROR: Stock insuficiente', {plant, productForm});
            setIsSubmitting(false);
            return;
          }
        }
        autoProduct = {
          plantId: productForm.plantId,
          name: plant?.name || '',
          quantity: Number(productForm.quantity),
          price: Number(productForm.price),
          total: Number(productForm.quantity) * Number(productForm.price)
        };
        currentProducts = [autoProduct];
        // No usar setProducts aquí, solo para el render visual
        setProductForm({ plantId: '', quantity: 1, price: '' });
      } else {
        setErrorMsg('Agregue al menos un producto.');
        setIsSubmitting(false);
        return;
      }
    }
    if (form.type === 'venta' || form.type === 'compra') {
      if (currentProducts.length === 0) {
        setErrorMsg('Agregue al menos un producto.');
        setIsSubmitting(false);
        return;
      }
      total = currentProducts.reduce((sum, p) => sum + p.total, 0);
    }
    // Forzar siempre dos decimales exactos
    if (form.type === 'venta' || form.type === 'compra') {
      if (!total) total = 0;
      price = '';
    } else {
      if (!total && form.price) {
        total = Number(form.price).toFixed(2);
      }
      price = form.price ? Number(form.price).toFixed(2) : '';
    }
    // Validaciones adicionales para ventas y compras multiproducto
    if (form.type === 'venta' || form.type === 'compra') {
      if (currentProducts.length === 0) {
        setErrorMsg('Agregue al menos un producto.');
        setIsSubmitting(false);
        return;
      }
    }
    // Validación de saldo suficiente para egresos
    if ((form.type === 'egreso')) {
      const monto = Number(form.price);
      
      if (form.paymentMethod === 'mercadoPago' && monto > cajaActualMP) {
        setErrorMsg('No hay saldo suficiente en Mercado Pago para realizar esta operación.');
        showToast({ type: 'error', text: 'No hay saldo suficiente en Mercado Pago para realizar esta operación.' });
        setToastError(true);
        setIsSubmitting(false);
        return;
      }
      if (form.paymentMethod === 'efectivo' && monto > cajaActualEfectivo) {
        setErrorMsg('No hay saldo suficiente en Efectivo para realizar esta operación.');
        showToast({ type: 'error', text: 'No hay saldo suficiente en Efectivo para realizar esta operación.' });
        setToastError(true);
        setIsSubmitting(false);
        return;
      }
    }

    // Validación de fecha futura para movimientos en escritorio
    if (!isMobileDevice && (form.type === 'venta' || form.type === 'compra' || form.type === 'ingreso' || form.type === 'egreso' || form.type === 'gasto')) {
      const fechaMovimiento = new Date(form.date);
      const fechaActual = new Date();
      if (fechaMovimiento > fechaActual) {
        setErrorMsg('No se puede registrar un movimiento con fecha futura.');
        showToast({ type: 'error', text: 'No se puede registrar un movimiento con fecha futura.' });
        setToastError(true);
        setIsSubmitting(false);
        return;
      }
    }

    // === LÓGICA FECHA/HORA REFINADA (BUSINESS TZ) ===
    // Objetivo: evitar que un movimiento de "hoy" (hora local negocio) salte al día siguiente por almacenar en UTC.
    // Estrategia: almacenamos 'date' en UTC (ISO), pero los campos dateLocal* se calculan en la zona de negocio fija
    // (ej: America/Argentina/Buenos_Aires) para consistencia de cortes diarios, independientemente del navegador.
  const businessTimeZone = 'America/Argentina/Buenos_Aires';
  const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; // zona real del dispositivo
  const userProvided = form.date; // posible YYYY-MM-DD o YYYY-MM-DDTHH:mm o vacío
    let baseDate;
    if (userProvided) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(userProvided)) {
        const [Y,M,D] = userProvided.split('-').map(Number);
        baseDate = new Date(Date.UTC(Y, M-1, D, 0, 0, 0, 0)); // interpretamos medianoche business; ajustaremos abajo
      } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(userProvided)) {
        const [datePart,timePart] = userProvided.split('T');
        const [Y,M,D] = datePart.split('-').map(Number);
        const [h,min] = timePart.split(':').map(Number);
        baseDate = new Date(Date.UTC(Y, M-1, D, h, min, 0, 0));
      } else {
        baseDate = new Date(userProvided);
      }
    } else {
      baseDate = new Date();
    }
    if (isNaN(baseDate.getTime())) baseDate = new Date();

    // dateUTCISO: simplemente el ISO estándar del objeto base (que ya representa la hora actual del navegador)
    const dateUTCISO = baseDate.toISOString();

    // Función para extraer partes en la zona de negocio
    const extractPartsInTZ = (date, timeZone) => {
      const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
      const parts = Object.fromEntries(fmt.formatToParts(date).map(p => [p.type, p.value]));
      return { Y: parts.year, M: parts.month, D: parts.day, H: parts.hour, m: parts.minute };
    };
  const biz = extractPartsInTZ(baseDate, businessTimeZone); // Estos valores son consistentes para cortes diarios del negocio
  const usr = extractPartsInTZ(baseDate, userTimeZone); // Vista local del usuario (puede coincidir o no)
  // Campos BUSINESS (compatibles con legado -> dateLocal*)
  const dateLocalDate = `${biz.Y}-${biz.M}-${biz.D}`;            // LEGACY: día de negocio
  const dateLocalTime = `${biz.H}:${biz.m}`;                     // LEGACY: hora de negocio
  const dateLocalComposite = `${dateLocalDate}T${dateLocalTime}`; // LEGACY composite
  const timeZone = businessTimeZone; // LEGACY alias
  // Nuevos campos explícitos business
  const dateBusinessDate = dateLocalDate;
  const dateBusinessTime = dateLocalTime;
  const dateBusiness = dateLocalComposite;
  // Nuevos campos usuario
  const dateUserDate = `${usr.Y}-${usr.M}-${usr.D}`;
  const dateUserTime = `${usr.H}:${usr.m}`;
  const dateUser = `${dateUserDate}T${dateUserTime}`;
  const userTZ = userTimeZone;

    try {
      
      // 🆕 VALIDAR PAGOS COMBINADOS
      if (form.type === 'venta' || form.type === 'compra' || form.type === 'ingreso' || form.type === 'egreso' || form.type === 'gasto') {
        const totalMovimiento = form.type === 'venta' || form.type === 'compra' ? 
          currentProducts.reduce((sum, p) => sum + p.total, 0) : 
          Number(total);
          
        // Verificar si se están usando pagos combinados
        const overridePM = options?.overridePaymentMethods;
        const hasPaymentMethods = (overridePM && Object.values(overridePM).some(v => v > 0)) || (form.paymentMethods && Object.values(form.paymentMethods).some(amount => amount > 0));
        let finalPaymentMethods = overridePM || form.paymentMethods;
        
        if (!hasPaymentMethods) {
          // Crear paymentMethods desde el método tradicional
          finalPaymentMethods = createPaymentMethodsFromSingle(form.paymentMethod, totalMovimiento);
        }
        
        const validation = validateMixedPayment(totalMovimiento, finalPaymentMethods);
        if (!validation.isValid) {
          setErrorMsg(validation.error);
          setIsSubmitting(false);
          return;
        }
        
        // Generar resumen de pago
        const paymentSummary = generatePaymentSummary(finalPaymentMethods);
        
        // Actualizar form para usar en el guardado
        form.paymentMethods = finalPaymentMethods;
        form.paymentSummary = paymentSummary;
        form.paymentMethod = getMainPaymentMethod(finalPaymentMethods);
      }
      
      if (form.type === 'venta' || form.type === 'compra') {
        // Usar currentProducts (puede venir de products o del submit directo)
        // Calcular total global para prorrateo
        const totalGlobal = currentProducts.reduce((sum, x) => sum + (x.total || 0), 0);

        // === NORMALIZACIÓN PREVENTIVA DE MÉTODOS DE PAGO ===
        const normalizePaymentMethods = (total, pm) => {
          if (!pm || Object.values(pm).every(v => !v || v === 0)) {
            // fallback: todo a método principal (o efectivo) si no hay distribución
            const def = { efectivo: 0, mercadoPago: 0, transferencia: 0, tarjeta: 0 };
            const principal = form.paymentMethod || 'efectivo';
            def[principal] = parseFloat(total.toFixed(2));
            return def;
          }
          const keys = ['efectivo','mercadoPago','transferencia','tarjeta'];
            const filtered = {};
            let sum = 0;
            keys.forEach(k => {
              if (pm[k] && pm[k] > 0) {
                const v = parseFloat(pm[k]) || 0;
                filtered[k] = v;
                sum += v;
              }
            });
            if (sum <= 0) {
              // todo a principal
              const principal = form.paymentMethod || 'efectivo';
              return { efectivo: 0, mercadoPago: 0, transferencia: 0, tarjeta: 0, [principal]: parseFloat(total.toFixed(2)) };
            }
            // Si difiere más de 0.01 ajustar con factor
            const delta = total - sum;
            if (Math.abs(delta) <= 0.01) {
              // Cerrar centavos ajustando al método mayor
              if (Math.abs(delta) > 0) {
                const maxK = Object.entries(filtered).sort((a,b)=>b[1]-a[1])[0][0];
                filtered[maxK] = +(filtered[maxK] + delta).toFixed(2);
              }
              // Asegurar llaves completas
              keys.forEach(k=>{ if(!(k in filtered)) filtered[k]=0; });
              return filtered;
            }
            const factor = total / sum;
            let acc = 0;
            let maxKey = null; let maxVal = -Infinity;
            Object.entries(filtered).forEach(([k,v]) => {
              const scaled = +(v * factor).toFixed(2);
              filtered[k] = scaled;
              acc += scaled;
              if (scaled > maxVal) { maxVal = scaled; maxKey = k; }
            });
            const finalDelta = +(total - acc).toFixed(2);
            if (Math.abs(finalDelta) >= 0.01 && maxKey) {
              filtered[maxKey] = +(filtered[maxKey] + finalDelta).toFixed(2);
            }
            // Completar llaves faltantes
            keys.forEach(k=>{ if(!(k in filtered)) filtered[k]=0; });
            return filtered;
        };

        const normalizedPM = normalizePaymentMethods(totalGlobal, form.paymentMethods);
        form.paymentMethods = normalizedPM;

        for (const p of currentProducts) {
          // Validar stock antes de registrar venta
          if (form.type === 'venta') {
            const plantRef = doc(db, 'producto', String(p.plantId));
            const plantSnap = await getDoc(plantRef);
            if (!plantSnap.exists()) {
              setErrorMsg('Producto no encontrado en inventario.');
              setIsSubmitting(false);
              return;
            }
            const currentStock = plantSnap.data().stock || 0;
            if (currentStock < p.quantity) {
              setErrorMsg(`Stock insuficiente para ${p.name}. Disponible: ${currentStock}`);
              setIsSubmitting(false);
              return;
            }
            await updateDoc(plantRef, { stock: currentStock - p.quantity });
          }
          // Actualizar stock en compra
          if (form.type === 'compra') {
            const plantRef = doc(db, 'producto', String(p.plantId));
            const plantSnap = await getDoc(plantRef);
            if (!plantSnap.exists()) {
              setErrorMsg('Producto no encontrado en inventario.');
              setIsSubmitting(false);
              return;
            }
            const currentStock = plantSnap.data().stock || 0;
            await updateDoc(plantRef, { stock: currentStock + p.quantity });
            
            // 🆕 ACTUALIZAR PRECIO DE COMPRA Y MANTENER HISTORIAL
            // price ya es precio unitario; NO dividir por la cantidad
            const purchasePrice = p.price; // Precio unitario
            await updateProductPurchasePrice(p.plantId, purchasePrice, p.quantity);
          }
          // Prorratear métodos de pago del movimiento al total de este ítem
          const itemPaymentMethods = scalePaymentMethods(form.paymentMethods, p.total, totalGlobal);
          const itemPaymentSummary = generatePaymentSummary(itemPaymentMethods);

          const movementData = {
            ...form,
            plantId: p.plantId,
            quantity: p.quantity,
            price: p.price,
            total: p.total,
            paymentMethods: itemPaymentMethods,
            paymentSummary: itemPaymentSummary,
            paymentMethod: getMainPaymentMethod(itemPaymentMethods),
            detail: form.notes || '',
            date: dateUTCISO,                // UTC persistente
            // LEGACY (mantener para no romper filtros actuales):
            dateLocal: dateLocalComposite,
            dateLocalDate,
            dateLocalTime,
            timeZone,
            // Nuevos campos explícitos:
            dateBusiness: dateBusiness,
            dateBusinessDate: dateBusinessDate,
            dateBusinessTime: dateBusinessTime,
            businessTimeZone: businessTimeZone,
            dateUser: dateUser,
            dateUserDate: dateUserDate,
            dateUserTime: dateUserTime,
            userTimeZone: userTZ
          };
          // Eliminar campos innecesarios
          delete movementData.products;
          const allSnap = await getDocs(collection(db, 'movements'));
          const allMovs = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          const newId = allMovs.length > 0 ? Math.max(...allMovs.map(m => Number(m.id) || 0)) + 1 : 1;
          await setDoc(doc(db, 'movements', String(newId)), { ...movementData, id: newId });
        }
        showToast({ type: 'success', text: (form.type === 'venta' ? 'Venta' : 'Compra') + ' registrada correctamente' });
        setProducts([]);
        setProductForm({ plantId: '', quantity: 1, price: '' });
  setIsPaymentManual(false);
        if (onMovementAdded) onMovementAdded();
      } else {
        let movementData = {
          ...form,
            total: Number(total),
            date: dateUTCISO,
            // LEGACY
            dateLocal: dateLocalComposite,
            dateLocalDate,
            dateLocalTime,
            timeZone,
            // Nuevos campos
            dateBusiness: dateBusiness,
            dateBusinessDate: dateBusinessDate,
            dateBusinessTime: dateBusinessTime,
            businessTimeZone: businessTimeZone,
            dateUser: dateUser,
            dateUserDate: dateUserDate,
            dateUserTime: dateUserTime,
            userTimeZone: userTZ,
            detail: form.notes || ''
        };
        // Si es compra de un solo producto, guardar también el nombre
        if (form.type === 'compra' && form.plantId) {
          const plant = plants.find(p => String(p.id) === String(form.plantId));
          if (plant) movementData.plantName = plant.name;
        }
        if (price !== '' && price !== undefined && !isNaN(Number(price))) {
          movementData.price = Number(price);
        }
        delete movementData.quantity;
        delete movementData.plantId;
        const allSnap = await getDocs(collection(db, 'movements'));
        const allMovs = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const newId = allMovs.length > 0 ? Math.max(...allMovs.map(m => Number(m.id) || 0)) + 1 : 1;
        await setDoc(doc(db, 'movements', String(newId)), { ...movementData, id: newId });
        
        // 🆕 ACTUALIZAR STOCK Y PRECIO PARA COMPRAS SIMPLES
        if (form.type === 'compra' && form.plantId && form.quantity && form.price) {
          try {
            const plantRef = doc(db, 'producto', String(form.plantId));
            const plantSnap = await getDoc(plantRef);
            if (plantSnap.exists()) {
              const currentStock = plantSnap.data().stock || 0;
              const newStock = currentStock + Number(form.quantity);
              await updateDoc(plantRef, { stock: newStock });
              
              // Actualizar precio de compra y mantener historial
              const purchasePrice = Number(form.price) / Number(form.quantity); // Precio unitario
              await updateProductPurchasePrice(form.plantId, purchasePrice, Number(form.quantity));
            }
          } catch (stockError) {
            console.error('Error actualizando stock/precio en compra simple:', stockError);
          }
        }
        
        showToast({ type: 'success', text: 'Movimiento registrado correctamente' });
        if (onMovementAdded) onMovementAdded();
      }
      setForm({
        type: 'venta', // Volver al valor por defecto original
        detail: '',
        plantId: '',
        quantity: 1,
        price: '',
        total: '',
        paymentMethod: 'efectivo',
        paymentMethods: {
          efectivo: 0,
          mercadoPago: 0,
          transferencia: 0,
          tarjeta: 0
        },
        date: new Date().toISOString().slice(0, 16),
        location: form.location, // Mantener el último lugar
        notes: ''
      });
      // Guardar el último lugar en localStorage
      if (form.location) {
        localStorage.setItem('lastLocation', form.location);
      }
    } catch (err) {
      setErrorMsg('Error al registrar el movimiento');
      showToast({ type: 'error', text: 'Error al registrar el movimiento' });
      setToastError(true);
      console.error('ERROR al guardar movimiento:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- FILTRO DEL DÍA (para móvil) ---
  const currentDay = now.getDate();
  const movementsToday = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d.getDate() === currentDay && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  // --- TOTALES DEL DÍA (para móvil) ---
  console.log('🔥 DIAGNÓSTICO ESCRITORIO MovementsView - Calculando totales...');
  console.log('🔥 Movimientos hoy:', movementsToday.length);
  console.log('🔥 Movimientos del mes:', movementsThisMonth.length);
  const totalVentasDia = movementsToday.filter(m => m.type === 'venta').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalComprasDia = movementsToday.filter(m => m.type === 'compra').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalEgresosEfectivoDia = movementsToday.filter(m => m.type === 'egreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalEgresosMPDia = movementsToday.filter(m => m.type === 'egreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  const ventasEfectivoDia = movementsToday.filter(m => m.type === 'venta' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const ventasMPDia = movementsToday.filter(m => m.type === 'venta' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  const comprasEfectivoDia = movementsToday.filter(m => m.type === 'compra' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const comprasMPDia = movementsToday.filter(m => m.type === 'compra' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  const ingresosEfectivoDia = movementsToday.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const ingresosMPDia = movementsToday.filter(m => m.type === 'ingreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  console.log('🔥 ESCRITORIO EFECTIVO:', {
    ventas: ventasEfectivoDia,
    compras: comprasEfectivoDia,
    ingresos: ingresosEfectivoDia,
    egresos: totalEgresosEfectivoDia
  });
  console.log('🔥 ESCRITORIO MERCADO PAGO:', {
    ventas: ventasMPDia,
    compras: comprasMPDia,
    ingresos: ingresosMPDia,
    egresos: totalEgresosMPDia
  });
  // Ahora restamos compras y egresos
  const cajaFisicaDia = ingresosEfectivoDia + ventasEfectivoDia - comprasEfectivoDia - totalEgresosEfectivoDia;
  const cajaMPDia = ingresosMPDia + ventasMPDia - comprasMPDia - totalEgresosMPDia;
  const totalGeneralDia = cajaFisicaDia + cajaMPDia;
  console.log('🔥 ESCRITORIO RESULTADO FINAL:', {
    cajaFisicaDia,
    cajaMPDia,
    totalGeneralDia
  });
  // Cantidad total de productos vendidos en el día
  const cantidadProductosVendidosDia = movementsToday.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isMobileDevice = isMobile;

  // Toast para mostrar mensajes de éxito/error
  const showToast = (msg) => {
    setToastMsg(msg);
    setToastError(msg.type === 'error');
    if (msg.type === 'success') {
      // Scroll al top en móvil
      if (window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      setTimeout(() => setToastMsg(null), 4000); // 4 segundos
    }
  };

  // --- BLOQUE DE TOTALES DIARIOS PARA MÓVIL ---
  const TotalsBlock = () => (
    <div className="mb-4">
      <div className="flex w-full gap-2 mb-2">
        <div className="flex-1 bg-green-100 rounded-lg shadow p-2 flex flex-col items-center border border-green-300">
          <span className="text-gray-500 text-xs">Efectivo</span>
          <span className="text-lg font-bold text-green-700">${cajaFisicaDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex-1 bg-blue-100 rounded-lg shadow p-2 flex flex-col items-center border border-blue-300">
          <span className="text-gray-500 text-xs">Mercado Pago</span>
          <span className="text-lg font-bold text-blue-700">${cajaMPDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex-1 bg-yellow-100 rounded-lg shadow p-2 flex flex-col items-center border border-yellow-300">
          <span className="text-gray-500 text-xs">Total</span>
          <span className="text-lg font-bold text-yellow-700">${totalGeneralDia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div className="w-full bg-purple-100 rounded-lg shadow p-4 flex flex-col items-center border border-purple-300">
        <span className="text-gray-500 text-sm">Artículos vendidos hoy</span>
        <span className="text-2xl font-bold text-purple-700">{cantidadProductosVendidosDia}</span>
      </div>
    </div>
  );

  // --- BLOQUE DE HEADER Y FORMULARIO PARA ESCRITORIO ---
  // Solo para escritorio, no modificar la lógica móvil

  // --- TOTALES DEL MES ---
  // (Ocultamos todos los totales y resúmenes automáticos, solo mostramos el formulario y la tabla de movimientos)

  // --- FUNCIONES DE EDICIÓN INLINE ---
  const handleEditClick = (mov) => {
    setEditingMovement(mov.id);
    setEditForm({ ...mov });
  };
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };
  const handleEditCancel = () => {
    // Limpiar timeout si está pendiente
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      setBlurTimeout(null);
    }
    setEditingMovement(null);
    setEditForm(null);
  };
  
  // Nuevas funciones para edición inline sin botones
  const handleCellDoubleClick = (mov, field) => {
    if (!isMobileDevice) { // Solo en desktop
      setEditingMovement(mov.id);
      setEditForm({ ...mov });
    }
  };
  
  const handleFieldBlur = async (e) => {
    // Cancelar cualquier timeout previo
    if (blurTimeout) {
      clearTimeout(blurTimeout);
    }
    
    // Crear un delay antes de guardar automáticamente
    const timeoutId = setTimeout(async () => {
      // Verificar si el foco está aún dentro de la fila de edición
      const editingRow = document.querySelector('.ring-2.ring-blue-400');
      const activeElement = document.activeElement;
      
      // Solo guardar si el foco salió completamente de la fila de edición
      if (editingMovement && (!editingRow || !editingRow.contains(activeElement))) {
        await handleEditSave();
      }
    }, 150); // 150ms de delay
    
    setBlurTimeout(timeoutId);
  };

  const handleFieldFocus = () => {
    // Cancelar el timeout si el usuario hace focus en otro campo de la misma fila
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      setBlurTimeout(null);
    }
  };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleEditCancel();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.target.blur(); // Esto activará el onBlur que guarda
    } else if (e.key === 'Tab') {
      // Permitir Tab para navegar, pero guardar al salir
      setTimeout(() => {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'SELECT') {
          handleEditSave();
        }
      }, 0);
    }
  };
  
  const isFieldEditable = (field, movType) => {
    const baseFields = ['date', 'paymentMethod', 'type', 'location', 'notes'];
    const salesPurchaseFields = ['plantId', 'quantity', 'price', 'total'];
    const otherFields = ['price', 'total'];
    
    if (baseFields.includes(field)) return true;
    if ((movType === 'venta' || movType === 'compra') && salesPurchaseFields.includes(field)) return true;
    if ((movType === 'ingreso' || movType === 'egreso' || movType === 'gasto') && otherFields.includes(field)) return true;
    // Permitir editar plantId como "detalle" para gastos/ingresos/egresos
    if ((movType === 'ingreso' || movType === 'egreso' || movType === 'gasto') && field === 'plantId') return true;
    return false;
  };
  const handleEditSave = async () => {
    if (!editForm) return;
    setEditLoading(true);
    try {
      if ((editForm.type === 'venta' || editForm.type === 'compra') && (!editForm.plantId || !editForm.quantity)) {
        showToast({ type: 'error', text: 'Producto y cantidad requeridos para ventas/compras.' });
        setEditLoading(false);
        return;
      }
      // Solo incluir los campos relevantes según el tipo
      const data = { ...editForm };
      if (editForm.type !== 'venta' && editForm.type !== 'compra') {
        delete data.quantity;
        delete data.price;
        delete data.plantId;
      } else {
        data.quantity = Number(editForm.quantity);
        data.price = Number(editForm.price);
        data.plantId = editForm.plantId;
      }
      data.total = editForm.total ? Number(editForm.total) : 0;
      const movRef = doc(db, 'movements', String(editingMovement));
      await updateDoc(movRef, data);
      showToast({ type: 'success', text: 'Movimiento actualizado.' });
      setEditingMovement(null);
      setEditForm(null);
    } catch (err) {
      console.error('ERROR en handleEditSave:', err);
      showToast({ type: 'error', text: 'Error al actualizar el movimiento.' });
    }
    setEditLoading(false);
  };

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    // Acepta ISO con o sin zona horaria, recorta a YYYY-MM-DDTHH:mm
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // Ajusta a local para input type="datetime-local"
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Autocompletar precio y mostrar stock al seleccionar producto
  useEffect(() => {
    if (!productForm.plantId) return;
    const plant = plants.find(p => String(p.id) === String(productForm.plantId));
    if (!plant) return;
    // Sugerir precio según tipo de movimiento
    let suggestedPrice = '';
    if (form.type === 'venta') {
      suggestedPrice = plant.purchasePrice || plant.basePrice || ''; // Para ventas: usar purchasePrice (precio de venta)
    } else if (form.type === 'compra') {
      suggestedPrice = plant.basePrice || plant.purchasePrice || ''; // Para compras: usar basePrice (precio de compra)
    }
    // Solo autocompletar si el usuario no ha modificado el precio manualmente
    if (!productForm.price) {
      setProductForm(prev => ({ ...prev, price: suggestedPrice }));
    }
  }, [productForm.plantId, form.type, plants]);

  // Sincronizar paymentMethods por defecto con el total cuando no hay selección manual
  useEffect(() => {
    if (!(form.type === 'venta' || form.type === 'compra')) return;
    // Autoconfigurar método simple actual con el total completo cuando no hubo selección manual
    const total = ventaTotal;
    if (total <= 0) return;
    if (isPaymentManual) return; // no pisar lo que configuró el usuario
    // Siempre setear el método simple actual con el total completo
    const newPaymentMethods = createPaymentMethodsFromSingle(form.paymentMethod, total);
    setForm(prev => ({
      ...prev,
      paymentMethods: newPaymentMethods
    }));
  }, [ventaTotal, form.type, form.paymentMethod, isPaymentManual, isMobile]);

  // Inicializar location desde localStorage si existe
  useEffect(() => {
    const lastLocation = localStorage.getItem('lastLocation');
    if (lastLocation) {
      setForm(prev => ({ ...prev, location: lastLocation }));
    }
  }, []);

  // Detectar si se debe mostrar el selector de fecha (solo móvil, solo si selectedDate viene como prop)
  const showDateInput = isMobile && selectedDate !== undefined && false; // Forzar a false para ventas móvil

  // Render sugerencia de alta de planta
  return (
    <div>
      {/* Sticky caja de escritorio con el formulario */}
      <div className={`sticky top-0 z-20 bg-white border border-gray-100 rounded-xl shadow-md px-2 py-1 w-full mx-0 mt-6 ${isMobileDevice ? 'block' : ''}`}>
        {/* Selector de tipo de movimiento en escritorio y móvil */}
        {!hideForm && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Movimiento</label>
            <select 
              name="type" 
              value={form.type} 
              onChange={handleChange} 
              className="w-full border rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MOVEMENT_TYPES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Formulario desacoplado según dispositivo y tipo */}
        {!hideForm && (
          isMobileDevice ? (
            (form.type === 'venta' || form.type === 'compra') ? (
              <SalesMobileForm
                form={form}
                productForm={productForm}
                plants={plants}
                handleChange={handleChange}
                handleProductFormChange={handleProductFormChange}
                handleAddProduct={handleAddProduct}
                handleRemoveProduct={handleRemoveProduct}
                ventaTotal={ventaTotal}
                products={products}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                errorMsg={errorMsg}
                onProductsUpdated={handleProductsUpdated}
                onPaymentMethodsChange={handlePaymentMethodsChange}
                onCreateAndAdd={handleCreateAndAdd}
                onConfirmAndSubmit={handleConfirmPaymentAndSubmit}
              />
            ) : (
              <CashMobileForm
                form={form}
                handleChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                errorMsg={errorMsg}
              />
            )
          ) : (
            ((form.type === 'venta' || form.type === 'compra') ? (
              <SalesDesktopForm
                form={form}
                productForm={productForm}
                plants={plants}
                handleChange={handleChange}
                handleProductFormChange={handleProductFormChange}
                handleAddProduct={handleAddProduct}
                handleRemoveProduct={handleRemoveProduct}
                ventaTotal={ventaTotal}
                products={products}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                errorMsg={errorMsg}
                onProductsUpdated={handleProductsUpdated}
                onPaymentMethodsChange={handlePaymentMethodsChange}
                onCreateAndAdd={handleCreateAndAdd}
              />
            ) : (
              <CashDesktopForm
                form={form}
                handleChange={handleChange}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                errorMsg={errorMsg}
              />
            ))
          )
        )}
      </div>
      {/* Mostrar solo el formulario si showOnlyForm está activo (ej: Caja Diaria móvil) */}
      {showOnlyForm ? null : (
        <>
          <div className="mt-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm w-full mx-0 overflow-x-auto select-none cursor-grab"
            onMouseDown={handleHistoryMouseDown}
            onMouseMove={handleHistoryMouseMove}
            onMouseUp={handleHistoryMouseUpOrLeave}
            onMouseLeave={handleHistoryMouseUpOrLeave}
          >
            <div className="p-3 bg-slate-100/80 rounded-lg mx-3 mt-3 mb-2">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold text-slate-800">📁 Histórico de Movimientos</h2>
                {!isMobileDevice && (
                  <div className="text-[11px] text-slate-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 shadow-sm">
                    Doble clic para editar • Se guarda al salir del campo • Esc cancela
                  </div>
                )}
              </div>
            </div>

            {!isMobileDevice && (
              <div className="mx-3 mb-2 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 flex gap-2 items-center flex-wrap">
                <label className="text-xs font-medium text-slate-700">Carpeta del mes:</label>
                <select 
                  value={selectedMonthDesktop} 
                  onChange={(e) => setSelectedMonthDesktop(Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:ring-2 focus:ring-blue-400"
                >
                  {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((name, idx) => (
                    <option key={idx} value={idx}>{name}</option>
                  ))}
                </select>
                <select 
                  value={selectedYearDesktop} 
                  onChange={(e) => setSelectedYearDesktop(Number(e.target.value))}
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white text-slate-900 focus:ring-2 focus:ring-blue-400"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <input 
                  type="text"
                  placeholder="Ej: bonsai, gasto, efectivo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-xs border border-slate-300 rounded-full px-3 py-1 bg-white text-slate-900 flex-1 min-w-[150px] focus:ring-2 focus:ring-blue-400"
                />
              </div>
            )}

            {!isMobileDevice && (
              <div className="mx-3 mb-2 text-[11px] text-slate-500">
                Mostrando {movementsThisMonth.length} movimiento{movementsThisMonth.length !== 1 ? 's' : ''}{searchTerm.trim() ? ' (filtrados)' : ''}
              </div>
            )}

            <div className="px-3 pb-3">
            {movementsThisMonth.length > 0 ? (
              <table className="min-w-[1100px] border-collapse border border-gray-200 text-xs whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="border border-gray-200 px-2 py-1">Fecha</th>
                    <th className="border border-gray-200 px-2 py-1">Producto / Detalle</th>
                    <th className="border border-gray-200 px-2 py-1">Cantidad</th>
                    <th className="border border-gray-200 px-2 py-1">Precio</th>
                    <th className="border border-gray-200 px-2 py-1">Total</th>
                    <th className="border border-gray-200 px-2 py-1">Método de Pago</th>
                    <th className="border border-gray-200 px-2 py-1">Tipo</th>
                    <th className="border border-gray-200 px-2 py-1">Lugar</th>
                    {/* Ocultar Notas en móvil para mejor visualización */}
                    <th className="border border-gray-200 px-2 py-1 hidden sm:table-cell">Notas</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsThisMonth.map(mov => {
                    let rowClass = '';
                    if (mov.type === 'ingreso') rowClass = 'bg-green-50 text-green-900';
                    if (mov.type === 'egreso') rowClass = 'bg-gray-900 text-white';
                    if (mov.type === 'compra') rowClass = 'bg-red-600 text-white';
                    if (mov.type === 'gasto') rowClass = 'bg-orange-500 text-white';
                    const isEditing = editingMovement === mov.id;
                    return (
                      <tr key={mov.id} className={`${rowClass} ${isEditing ? 'ring-2 ring-blue-400' : ''}`}>
                        {isEditing ? (
                          <>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="datetime-local" name="date" value={formatDateForInput(editForm.date)} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" autoFocus />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              {(editForm.type === 'venta' || editForm.type === 'compra') ? (
                                <select name="plantId" value={editForm.plantId || ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400">
                                  <option value="">-</option>
                                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              ) : (editForm.type === 'gasto' || editForm.type === 'ingreso' || editForm.type === 'egreso') ? (
                                <input name="detail" value={editForm.detail ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" placeholder="Producto / Detalle" />
                              ) : '-'}
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              {(editForm.type === 'venta' || editForm.type === 'compra') ? (
                                <input type="number" name="quantity" min="1" value={editForm.quantity ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" />
                              ) : ''}
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="number" name="price" value={editForm.price ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="number" name="total" value={editForm.total ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <select name="paymentMethod" value={editForm.paymentMethod || ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400">
                                {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <select name="type" value={editForm.type || ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400">
                                {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input name="location" value={editForm.location ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1 hidden sm:table-cell">
                              <input name="notes" value={editForm.notes ?? ''} onChange={handleEditChange} onKeyDown={handleKeyDown} onBlur={handleFieldBlur} onFocus={handleFieldFocus} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5 focus:ring-2 focus:ring-blue-400" />
                            </td>
                          </>
                        ) : (
                          <>
                            <td 
                              className={`border border-gray-200 px-2 py-1 ${!isMobileDevice && isFieldEditable('date', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'date')}
                            >
                              {mov.date ? new Date(mov.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 ${!isMobileDevice && isFieldEditable('plantId', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'plantId')}
                            >
                              {/* Para ventas/compras: mostrar nombre del producto */}
                              {(mov.type === 'venta' || mov.type === 'compra') && plants && mov.plantId
                                ? (plants.find(p => String(p.id) === String(mov.plantId))?.name || mov.plantId || '-')
                                : /* Para gastos/ingresos/egresos: mostrar detalle */
                                  (mov.type === 'gasto' || mov.type === 'ingreso' || mov.type === 'egreso') && mov.detail
                                    ? mov.detail
                                    : '-'}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 text-right ${!isMobileDevice && isFieldEditable('quantity', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'quantity')}
                            >
                              {(mov.type === 'venta' || mov.type === 'compra') && mov.products && Array.isArray(mov.products)
                                ? mov.products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
                                : (mov.type === 'venta' || mov.type === 'compra') ? mov.quantity : ''}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 text-right ${!isMobileDevice && isFieldEditable('price', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'price')}
                            >
                              {(mov.type === 'venta' || mov.type === 'compra') && mov.products && Array.isArray(mov.products)
                                ? ''
                                : mov.price ? `$${mov.price}` : ''}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 text-right ${!isMobileDevice && isFieldEditable('total', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'total')}
                            >
                              {mov.total ? `$${mov.total}` : ''}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 ${!isMobileDevice && isFieldEditable('paymentMethod', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'paymentMethod')}
                            >
                              {renderPaymentSummary(mov)}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 ${!isMobileDevice && isFieldEditable('type', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'type')}
                            >
                              {MOVEMENT_TYPES.find(t => t.value === mov.type)?.label || mov.type}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 ${!isMobileDevice && isFieldEditable('location', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'location')}
                            >
                              {mov.location}
                            </td>
                            <td 
                              className={`border border-gray-200 px-2 py-1 hidden sm:table-cell ${!isMobileDevice && isFieldEditable('notes', mov.type) ? 'cursor-pointer hover:outline hover:outline-2 hover:outline-yellow-300 hover:bg-white/10' : ''}`}
                              onDoubleClick={() => handleCellDoubleClick(mov, 'notes')}
                            >
                              {mov.notes}
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-xs">No hay movimientos registrados este mes.</p>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

MovementsView.propTypes = {
  plants: PropTypes.array,
  hideForm: PropTypes.bool,
  showOnlyForm: PropTypes.bool,
  renderTotals: PropTypes.func,
  onMovementAdded: PropTypes.func,
  selectedMonth: PropTypes.number,
  selectedYear: PropTypes.number,
  showOnlySalesOfDay: PropTypes.bool,
  selectedDate: PropTypes.string,
};

export default MovementsView;

// NOTA: El campo 'date' almacena fecha y hora completa en formato ISO. Si en el futuro se requiere un reporte o gráfico por horario de ventas, se puede usar new Date(mov.date).getHours() para agrupar por hora.
// En la sección de caja solo se muestra la fecha (día/mes/año) para mayor simplicidad visual.

/*
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-32px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-slide-down {
  animation: slideDown 0.4s cubic-bezier(0.4,0,0.2,1);
}
*/
