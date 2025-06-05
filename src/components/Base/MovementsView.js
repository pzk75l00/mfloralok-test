import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import PlantForm from './PlantForm';
import PlantAutocomplete from './PlantAutocomplete';
import { toZonedTime } from 'date-fns-tz';
import { registrarVenta } from './saleUtils';
import PropTypes from 'prop-types';

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

// Este componente se moverá a la carpeta Base
const MovementsView = ({ plants: propPlants, hideForm, showOnlyForm, renderTotals, onMovementAdded, selectedMonth, selectedYear, showOnlySalesOfDay }) => {
  const [plants, setPlants] = useState(propPlants || []);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({
    type: 'venta',
    detail: '',
    plantId: '',
    quantity: 1,
    price: '',
    total: '',
    paymentMethod: 'efectivo',
    date: new Date().toISOString().slice(0, 16),
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
  const [editingMovement, setEditingMovement] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

  // --- FILTRO MENSUAL ---
  const [reloadKey, setReloadKey] = useState(0);
  const now = new Date();
  const currentMonth = typeof selectedMonth === 'number' ? selectedMonth : now.getMonth();
  const currentYear = typeof selectedYear === 'number' ? selectedYear : now.getFullYear();
  const movementsThisMonth = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // --- NUEVO ESTADO PARA VENTA MULTIPRODUCTO ---
  const [products, setProducts] = useState([]);
  const [productForm, setProductForm] = useState({ plantId: '', quantity: 1, price: '' });

  useEffect(() => {
    // Sincronizar plantas y movimientos en un solo efecto para evitar race conditions
    const unsubPlants = onSnapshot(collection(db, 'plants'), (snapshot) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Calcular saldos actuales de caja antes del submit
  const cajaActualEfectivo = movements.filter(m => m.paymentMethod === 'efectivo').reduce((sum, m) => {
    if (m.type === 'venta' || m.type === 'ingreso') return sum + (Number(m.total) || 0);
    if (m.type === 'compra' || m.type === 'egreso') return sum - (Number(m.total) || 0);
    return sum;
  }, 0);
  const cajaActualMP = movements.filter(m => m.paymentMethod === 'mercadoPago').reduce((sum, m) => {
    if (m.type === 'venta' || m.type === 'ingreso') return sum + (Number(m.total) || 0);
    if (m.type === 'compra' || m.type === 'egreso') return sum - (Number(m.total) || 0);
    return sum;
  }, 0);

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
  const ventaTotal = products.reduce((sum, p) => sum + p.total, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    console.log('DEBUG: handleSubmit called', form, products);
    let total = form.total;
    let price = form.price;
    if (form.type === 'venta' || form.type === 'compra') {
      if (products.length === 0) {
        setErrorMsg('Agregue al menos un producto.');
        return;
      }
      total = products.reduce((sum, p) => sum + p.total, 0);
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
      if (products.length === 0) {
        setErrorMsg('Agregue al menos un producto.');
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
        return;
      }
      if (form.paymentMethod === 'efectivo' && monto > cajaActualEfectivo) {
        setErrorMsg('No hay saldo suficiente en Efectivo para realizar esta operación.');
        showToast({ type: 'error', text: 'No hay saldo suficiente en Efectivo para realizar esta operación.' });
        setToastError(true);
        return;
      }
    }
    // Fecha: lógica según dispositivo y tipo
    let dateStr = form.date;
    let dateArg;
    if (form.type === 'venta' && isMobileDevice) {
      // En móvil y venta, la fecha es automática (ahora)
      const nowStr = new Date().toISOString().slice(0, 16);
      const zoned = toZonedTime(nowStr, 'America/Argentina/Buenos_Aires');
      dateArg = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), zoned.getHours(), zoned.getMinutes()));
    } else if (dateStr && dateStr.length === 10) { // Solo fecha, sin hora
      const zoned = toZonedTime(dateStr + 'T00:00', 'America/Argentina/Buenos_Aires');
      dateArg = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), zoned.getHours(), zoned.getMinutes()));
    } else if (dateStr && dateStr.length === 16) { // datetime-local (YYYY-MM-DDTHH:mm)
      const zoned = toZonedTime(dateStr, 'America/Argentina/Buenos_Aires');
      dateArg = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), zoned.getHours(), zoned.getMinutes()));
    } else {
      const nowStr = new Date().toISOString().slice(0, 16);
      const zoned = toZonedTime(nowStr, 'America/Argentina/Buenos_Aires');
      dateArg = new Date(Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate(), zoned.getHours(), zoned.getMinutes()));
    }
    const isoArgentina = dateArg.toISOString();

    try {
      console.log('DEBUG: Intentando guardar movimiento', form, products);
      if (form.type === 'venta' || form.type === 'compra') {
        for (const p of products) {
          // Validar stock antes de registrar venta
          if (form.type === 'venta') {
            const plantRef = doc(db, 'plants', String(p.plantId));
            const plantSnap = await getDoc(plantRef);
            if (!plantSnap.exists()) {
              setErrorMsg('Producto no encontrado en inventario.');
              return;
            }
            const currentStock = plantSnap.data().stock || 0;
            if (currentStock < p.quantity) {
              setErrorMsg(`Stock insuficiente para ${p.name}. Disponible: ${currentStock}`);
              return;
            }
            await updateDoc(plantRef, { stock: currentStock - p.quantity });
          }
          // Actualizar stock en compra
          if (form.type === 'compra') {
            const plantRef = doc(db, 'plants', String(p.plantId));
            const plantSnap = await getDoc(plantRef);
            if (!plantSnap.exists()) {
              setErrorMsg('Producto no encontrado en inventario.');
              return;
            }
            const currentStock = plantSnap.data().stock || 0;
            await updateDoc(plantRef, { stock: currentStock + p.quantity });
          }
          const movementData = {
            ...form,
            plantId: p.plantId,
            quantity: p.quantity,
            price: p.price,
            total: p.total,
            detail: '',
            date: isoArgentina
          };
          // Eliminar campos innecesarios
          delete movementData.products;
          await addDoc(collection(db, 'movements'), movementData);
        }
        showToast({ type: 'success', text: (form.type === 'venta' ? 'Venta' : 'Compra') + ' registrada correctamente' });
        setProducts([]);
        setProductForm({ plantId: '', quantity: 1, price: '' });
        if (onMovementAdded) onMovementAdded();
      } else {
        let movementData = {
          ...form,
          total: Number(total),
          date: isoArgentina
        };
        if (price !== '' && price !== undefined && !isNaN(Number(price))) {
          movementData.price = Number(price);
        }
        delete movementData.quantity;
        delete movementData.plantId;
        await addDoc(collection(db, 'movements'), movementData);
        showToast({ type: 'success', text: 'Movimiento registrado correctamente' });
        if (onMovementAdded) onMovementAdded();
      }
      setForm({
        type: 'venta',
        detail: '',
        plantId: '',
        quantity: 1,
        price: '',
        total: '',
        paymentMethod: 'efectivo',
        date: new Date().toISOString().slice(0, 16),
        location: '',
        notes: ''
      });
    } catch (err) {
      setErrorMsg('Error al registrar el movimiento');
      showToast({ type: 'error', text: 'Error al registrar el movimiento' });
      setToastError(true);
      console.error('ERROR al guardar movimiento:', err);
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
  // Ahora restamos compras y egresos
  const cajaFisicaDia = ingresosEfectivoDia + ventasEfectivoDia - comprasEfectivoDia - totalEgresosEfectivoDia;
  const cajaMPDia = ingresosMPDia + ventasMPDia - comprasMPDia - totalEgresosMPDia;
  const totalGeneralDia = cajaFisicaDia + cajaMPDia;
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
    setEditingMovement(null);
    setEditForm(null);
  };
  const handleEditSave = async () => {
    if (!editForm) return;
    setEditLoading(true);
    console.log('DEBUG: handleEditSave called', editForm, editingMovement);
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
      const movRef = doc(db, 'movements', editingMovement);
      console.log('DEBUG: updateDoc', movRef, data);
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
      suggestedPrice = plant.purchasePrice || plant.basePrice || '';
    } else if (form.type === 'compra') {
      suggestedPrice = plant.basePrice || plant.purchasePrice || '';
    }
    // Solo autocompletar si el usuario no ha modificado el precio manualmente
    if (!productForm.price) {
      setProductForm(prev => ({ ...prev, price: suggestedPrice }));
    }
  }, [productForm.plantId, form.type, plants]);

  // Render sugerencia de alta de planta
  return (
    <div>
      {/* Sticky caja de escritorio con el formulario */}
      <div className="sticky top-0 z-20 bg-white border border-gray-100 rounded-xl shadow-md px-2 py-1 w-full mx-0 mt-6">
        {/* Formulario de carga de caja de escritorio */}
        {!hideForm && (
          <form onSubmit={handleSubmit} className="flex flex-row flex-wrap gap-1 items-end w-full text-xs">
            {/* Selector de tipo de movimiento */}
            <div className="flex flex-col min-w-[110px] max-w-[130px]">
              <label className="text-[11px] font-medium text-gray-700">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs">
                {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            {/* Si es venta o compra, permitir multiproducto */}
            {(form.type === 'venta' || form.type === 'compra') ? (
              <>
                <div className="flex flex-col min-w-[120px] max-w-[160px]">
                  <label className="text-[11px] font-medium text-gray-700">Producto</label>
                  <select name="plantId" value={productForm.plantId} onChange={handleProductFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs">
                    <option value="">Seleccionar...</option>
                    {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {productForm.plantId && (() => {
                    const plant = plants.find(p => String(p.id) === String(productForm.plantId));
                    if (!plant) return null;
                    return (
                      <div className="text-[10px] text-gray-500 mt-1">
                        Stock: <b>{plant.stock}</b> | Precio sugerido: <b>${form.type === 'venta' ? (plant.purchasePrice || plant.basePrice || '-') : (plant.basePrice || plant.purchasePrice || '-')}</b>
                      </div>
                    );
                  })()}
                </div>
                <div className="flex flex-col min-w-[60px] max-w-[80px]">
                  <label className="text-[11px] font-medium text-gray-700">Cantidad</label>
                  <input type="number" name="quantity" min="1" value={productForm.quantity} onChange={handleProductFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs" />
                </div>
                <div className="flex flex-col min-w-[70px] max-w-[90px]">
                  <label className="text-[11px] font-medium text-gray-700">Precio</label>
                  <input type="number" name="price" min="0" step="0.01" value={productForm.price} onChange={handleProductFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs" />
                </div>
                <button type="button" onClick={() => handleAddProduct()} className="bg-blue-600 text-white px-2 py-1 rounded text-xs mt-4" id="btn-agregar-producto">Agregar</button>
                {/* Lista de productos agregados */}
                <div className="w-full mt-2">
                  {products.length > 0 && (
                    <table className="w-full text-xs border border-gray-200 mb-2">
                      <thead>
                        <tr>
                          <th className="border px-1">Producto</th>
                          <th className="border px-1">Cantidad</th>
                          <th className="border px-1">Precio</th>
                          <th className="border px-1">Subtotal</th>
                          <th className="border px-1"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((p, idx) => (
                          <tr key={idx}>
                            <td className="border px-1">{p.name}</td>
                            <td className="border px-1 text-right">{p.quantity}</td>
                            <td className="border px-1 text-right">${Number(p.price).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="border px-1 text-right">${Number(p.total).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="border px-1 text-center"><button type="button" onClick={() => handleRemoveProduct(idx)} className="text-red-600">✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {products.length > 0 && (
                    <div className="text-right font-bold text-green-700 pr-2">Total: ${ventaTotal}</div>
                  )}
                </div>
                {errorMsg && (
                  <div className="w-full text-xs text-red-600 font-semibold bg-red-100 rounded p-1 mb-2" id="error-msg-caja">{errorMsg}</div>
                )}
              </>
            ) : (
              // ...existing code para otros tipos...
              <></>
            )}
            {/* Método de Pago, Fecha, Lugar, Notas, Botón Registrar: siempre */}
            <div className="flex flex-col min-w-[90px] max-w-[110px]">
              <label className="text-[11px] font-medium text-gray-700">Pago</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs">
                {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div className="flex flex-col min-w-[110px] max-w-[130px]">
              <label className="text-[11px] font-medium text-gray-700">Fecha</label>
              <input type="datetime-local" name="date" value={form.date} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs" />
            </div>
            <div className="flex flex-col min-w-[80px] max-w-[100px]">
              <label className="text-[11px] font-medium text-gray-700">Lugar</label>
              <input name="location" value={form.location} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs" />
            </div>
            <div className="flex flex-col min-w-[100px] max-w-[120px]">
              <label className="text-[11px] font-medium text-gray-700">Notas</label>
              <input name="notes" value={form.notes} onChange={handleChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-1 text-xs" />
            </div>
            <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded font-semibold text-xs ml-2" id="btn-registrar-venta">{form.type === 'venta' ? 'Registrar Venta' : 'Registrar'}</button>
          </form>
        )}
      </div>
      {/* Mostrar solo el formulario si showOnlyForm está activo (ej: Caja Diaria móvil) */}
      {showOnlyForm ? null : (
        <>
          {/* Historial de movimientos fuera del sticky */}
          <div className="mt-6 p-3 bg-white rounded-lg shadow w-full mx-0">
            <h2 className="text-base font-bold mb-2">Histórico de Movimientos del Mes</h2>
            {movementsThisMonth.length > 0 ? (
              <table className="w-full border-collapse border border-gray-200 text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-200 px-2 py-1">Fecha</th>
                    <th className="border border-gray-200 px-2 py-1">Producto</th>
                    <th className="border border-gray-200 px-2 py-1">Cantidad</th>
                    <th className="border border-gray-200 px-2 py-1">Precio</th>
                    <th className="border border-gray-200 px-2 py-1">Total</th>
                    <th className="border border-gray-200 px-2 py-1">Método de Pago</th>
                    <th className="border border-gray-200 px-2 py-1">Tipo</th>
                    <th className="border border-gray-200 px-2 py-1">Lugar</th>
                    <th className="border border-gray-200 px-2 py-1">Notas</th>
                    <th className="border border-gray-200 px-2 py-1">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {movementsThisMonth.map(mov => {
                    let rowClass = '';
                    if (mov.type === 'ingreso') rowClass = 'bg-green-100 text-green-900';
                    if (mov.type === 'egreso') rowClass = 'bg-black text-white';
                    if (mov.type === 'compra') rowClass = 'bg-red-600 text-white';
                    if (mov.type === 'gasto') rowClass = 'bg-orange-500 text-white';
                    const isEditing = editingMovement === mov.id;
                    return (
                      <tr key={mov.id} className={rowClass}>
                        {isEditing ? (
                          <>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="datetime-local" name="date" value={formatDateForInput(editForm.date)} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              {(editForm.type === 'venta' || editForm.type === 'compra') ? (
                                <select name="plantId" value={editForm.plantId || ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5">
                                  <option value="">-</option>
                                  {plants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                              ) : '-'}
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              {(editForm.type === 'venta' || editForm.type === 'compra') ? (
                                <input type="number" name="quantity" min="1" value={editForm.quantity ?? ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                              ) : ''}
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="number" name="price" value={editForm.price ?? ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input type="number" name="total" value={editForm.total ?? ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <select name="paymentMethod" value={editForm.paymentMethod || ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5">
                                {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <select name="type" value={editForm.type || ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5">
                                {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                              </select>
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input name="location" value={editForm.location ?? ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1">
                              <input name="notes" value={editForm.notes ?? ''} onChange={handleEditChange} className="w-full text-xs border border-gray-300 rounded bg-white text-black px-1 py-0.5" />
                            </td>
                            <td className="border border-gray-200 px-2 py-1 flex gap-1">
                              <button type="button" onClick={handleEditSave} className="bg-green-600 text-white px-2 py-1 rounded text-xs" disabled={editLoading}>{editLoading ? 'Guardando...' : 'Guardar'}</button>
                              <button type="button" onClick={handleEditCancel} className="bg-gray-400 text-white px-2 py-1 rounded text-xs" disabled={editLoading}>Cancelar</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="border border-gray-200 px-2 py-1">{mov.date ? new Date(mov.date).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                            <td className="border border-gray-200 px-2 py-1">
                              {plants && mov.plantId
                                ? (plants.find(p => String(p.id) === String(mov.plantId))?.name || mov.plantId || '-')
                                : '-'}
                            </td>
                            <td className="border border-gray-200 px-2 py-1 text-right">
                              {(mov.type === 'venta' || mov.type === 'compra') && mov.products && Array.isArray(mov.products)
                                ? mov.products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
                                : (mov.type === 'venta' || mov.type === 'compra') ? mov.quantity : ''}
                            </td>
                            <td className="border border-gray-200 px-2 py-1 text-right">
                              {(mov.type === 'venta' || mov.type === 'compra') && mov.products && Array.isArray(mov.products)
                                ? ''
                                : mov.price ? `$${mov.price}` : ''}
                            </td>
                            <td className="border border-gray-200 px-2 py-1 text-right">{mov.total ? `$${mov.total}` : ''}</td>
                            <td className="border border-gray-200 px-2 py-1">{PAYMENT_METHODS.find(m => m.value === mov.paymentMethod)?.label || mov.paymentMethod}</td>
                            <td className="border border-gray-200 px-2 py-1">{MOVEMENT_TYPES.find(t => t.value === mov.type)?.label || mov.type}</td>
                            <td className="border border-gray-200 px-2 py-1">{mov.location}</td>
                            <td className="border border-gray-200 px-2 py-1">{mov.notes}</td>
                            <td className="border border-gray-200 px-2 py-1">
                              <button onClick={() => handleEditClick(mov)} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Editar</button>
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
        </>
      )}
      {/* DEBUG: Mostrar datos en consola para ver si llegan desde Firebase */}
      <div style={{ display: 'none' }}>
        {useEffect(() => {
          console.log('PLANTS:', plants);
          console.log('MOVEMENTS:', movements);
        }, [plants, movements])}
      </div>
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
