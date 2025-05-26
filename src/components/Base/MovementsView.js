import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import PlantForm from './PlantForm';
import PlantAutocomplete from './PlantAutocomplete';

const MOVEMENT_TYPES = [
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' }
];

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo (E)' },
  { value: 'mercadoPago', label: 'Mercado Pago (MP)' }
];

// Este componente se moverá a la carpeta Base
const MovementsView = ({ plants }) => {
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

  // --- FILTRO MENSUAL ---
  const [reloadKey, setReloadKey] = useState(0);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const movementsThisMonth = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    if (isNaN(d.getTime())) return false;
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
    return () => unsubscribe();
  }, [reloadKey]);

  const handleReload = () => {
    setReloadKey(k => k + 1);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let total = form.total;
    if ((form.type === 'venta' || form.type === 'compra')) {
      if (!total && form.price && form.quantity) {
        total = Number(form.price) * Number(form.quantity);
      }
    } else {
      if (!total && form.price) {
        total = Number(form.price);
      }
    }
    // Si el usuario selecciona una fecha (YYYY-MM-DD), forzar a medianoche de Argentina
    let dateStr = form.date;
    let dateArg;
    if (dateStr && dateStr.length === 10) { // Solo fecha, sin hora
      // YYYY-MM-DD a Date en Argentina
      dateArg = new Date(dateStr + 'T00:00:00-03:00');
    } else if (dateStr && dateStr.length === 16) { // datetime-local (YYYY-MM-DDTHH:mm)
      dateArg = new Date(dateStr + ':00-03:00');
    } else {
      // Si no, usar la fecha actual en Argentina
      const now = new Date();
      dateArg = new Date(now.toLocaleString('en-US', { timeZone: 'America/Argentina/Buenos_Aires' }));
    }
    const isoArgentina = dateArg.toISOString().slice(0, 19) + '-03:00';
    let movementData = {
      ...form,
      total: Number(total) || 0,
      date: isoArgentina
    };
    if (form.type === 'venta' || form.type === 'compra') {
      movementData.quantity = Number(form.quantity);
      movementData.price = Number(form.price);
    } else {
      delete movementData.quantity;
      delete movementData.price;
    }
    await addDoc(collection(db, 'movements'), movementData);
    if ((form.type === 'venta' || form.type === 'compra') && !form.plantId && form.detail) {
      setSuggestedPlantName(form.detail);
      setShowSuggestPlant(true);
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
  const ventasEfectivoDia = movementsToday.filter(m => m.type === 'venta' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const ventasMPDia = movementsToday.filter(m => m.type === 'venta' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  const ingresosEfectivoDia = movementsToday.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  const ingresosMPDia = movementsToday.filter(m => m.type === 'ingreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  const cajaFisicaDia = ingresosEfectivoDia + ventasEfectivoDia;
  const cajaMPDia = ingresosMPDia + ventasMPDia;
  const totalGeneralDia = cajaFisicaDia + cajaMPDia;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Caja - Totales del Día</h2>
        <div className="bg-orange-100 rounded p-4 text-center border-2 border-orange-400 shadow-md mb-2">
          <div className="text-xs text-gray-700 font-semibold">Total General</div>
          <div className="text-3xl font-extrabold text-orange-700">${totalGeneralDia.toFixed(2)}</div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-green-50 rounded p-3 text-center border border-green-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Efectivo</div>
            <div className="text-xl font-bold text-green-700">${cajaFisicaDia.toFixed(2)}</div>
          </div>
          <div className="flex-1 bg-purple-50 rounded p-3 text-center border border-purple-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Mercado Pago</div>
            <div className="text-xl font-bold text-purple-700">${cajaMPDia.toFixed(2)}</div>
          </div>
        </div>
        {/* Formulario simplificado: sin selector de fecha */}
        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4 mt-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Detalle</label>
              <input name="detail" value={form.detail} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
            {(form.type === 'venta' || form.type === 'compra') && (
              <div>
                {/* Reemplazo: input+select sincronizados */}
                <PlantAutocomplete
                  plants={plants}
                  value={form.plantId}
                  onChange={val => setForm(f => ({ ...f, plantId: val }))}
                  required
                />
              </div>
            )}
            {(form.type === 'venta' || form.type === 'compra') && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Cantidad</label>
                <input type="number" name="quantity" min="1" value={form.quantity} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Precio</label>
              <input type="number" name="price" min="0" value={form.price} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Total</label>
              <input type="number" name="total" min="0" value={form.total} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Se calcula automáticamente" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
              <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Lugar</label>
              <input name="location" value={form.location} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <input name="notes" value={form.notes} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
          </div>
          <button type="submit" className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Registrar Movimiento</button>
        </form>
      </div>
    );
  }

  // --- TOTALES DEL MES ---
  const totalVentasMes = movementsThisMonth.filter(m => m.type === 'venta').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalComprasMes = movementsThisMonth.filter(m => m.type === 'compra').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalIngresosMes = movementsThisMonth.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalEgresosMes = movementsThisMonth.filter(m => m.type === 'egreso').reduce((sum, m) => sum + (m.total || 0), 0);
  const productosVendidosMes = movementsThisMonth.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // --- TOTALES PERSONALIZADOS CORREGIDOS ---
  // Ingresos en efectivo
  const ingresosEfectivo = movementsThisMonth.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  // Ingresos en Mercado Pago
  const ingresosMP = movementsThisMonth.filter(m => m.type === 'ingreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  // Ventas en efectivo
  const ventasEfectivo = movementsThisMonth.filter(m => m.type === 'venta' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (m.total || 0), 0);
  // Ventas Mercado Pago
  const ventasMP = movementsThisMonth.filter(m => m.type === 'venta' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (m.total || 0), 0);
  // Caja física: ingresos efectivo + ventas efectivo
  const cajaFisica = ingresosEfectivo + ventasEfectivo;
  // Caja Mercado Pago: ingresos MP + ventas MP
  const cajaMP = ingresosMP + ventasMP;
  // Gastos: suma de compras
  const gastosMes = totalComprasMes;
  // Total general (caja física + MP)
  const totalGeneral = cajaFisica + cajaMP;
  // Diferencia entre total general y gastos
  const diferenciaTotalGastos = totalGeneral - gastosMes;

  // Render sugerencia de alta de planta
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">Movimientos de Caja - {now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}
        <button onClick={handleReload} className="ml-2 px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 rounded border border-blue-300">Recargar</button>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
        <div className="bg-green-50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Ventas del mes</div>
          <div className="text-lg font-bold text-green-700">${totalVentasMes.toFixed(2)}</div>
        </div>
        <div className="bg-red-50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Compras del mes</div>
          <div className="text-lg font-bold text-red-700">${totalComprasMes.toFixed(2)}</div>
        </div>
        <div className="bg-blue-50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Ingresos del mes</div>
          <div className="text-lg font-bold text-blue-700">${totalIngresosMes.toFixed(2)}</div>
        </div>
        <div className="bg-yellow-50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Egresos del mes</div>
          <div className="text-lg font-bold text-yellow-700">${totalEgresosMes.toFixed(2)}</div>
        </div>
        <div className="bg-gray-50 rounded p-2 text-center">
          <div className="text-xs text-gray-500">Productos vendidos</div>
          <div className="text-lg font-bold text-gray-700">{productosVendidosMes}</div>
        </div>
      </div>
      {/* BLOQUE 1: TOTALES DE CAJA */}
      <div className="mb-6">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Totales de Caja</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 rounded p-4 text-center border border-green-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Caja física</div>
            <div className="text-2xl font-bold text-green-700">${cajaFisica.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Ingresos y ventas en efectivo</div>
          </div>
          <div className="bg-purple-50 rounded p-4 text-center border border-purple-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Caja Mercado Pago</div>
            <div className="text-2xl font-bold text-purple-700">${cajaMP.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Ingresos y ventas por Mercado Pago</div>
          </div>
          <div className="bg-orange-100 rounded p-4 text-center border-2 border-orange-400 shadow-md">
            <div className="text-xs text-gray-700 font-semibold">Total disponible</div>
            <div className="text-3xl font-extrabold text-orange-700">${diferenciaTotalGastos.toFixed(2)}</div>
            <div className="text-xs text-gray-600">Total de ingresos y ventas menos gastos del mes (incluye efectivo y Mercado Pago)</div>
          </div>
        </div>
      </div>
      {/* BLOQUE 2: DETALLE DE VENTAS Y GASTOS */}
      <div className="mb-8">
        <h3 className="text-lg font-bold mb-2 text-gray-800">Detalle de Ventas y Gastos</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded p-4 text-center border border-blue-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Ventas en Efectivo</div>
            <div className="text-xl font-bold text-blue-700">${ventasEfectivo.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Solo ventas cobradas en efectivo</div>
          </div>
          <div className="bg-purple-50 rounded p-4 text-center border border-purple-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Ventas Mercado Pago</div>
            <div className="text-xl font-bold text-purple-700">${ventasMP.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Solo ventas cobradas por Mercado Pago</div>
          </div>
          <div className="bg-red-50 rounded p-4 text-center border border-red-200 shadow-sm">
            <div className="text-xs text-gray-700 font-semibold">Gastos del Mes</div>
            <div className="text-xl font-bold text-red-700">${gastosMes.toFixed(2)}</div>
            <div className="text-xs text-gray-500">Suma de compras/egresos</div>
          </div>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Tipo</label>
            <select name="type" value={form.type} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Detalle</label>
            <input name="detail" value={form.detail} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          {(form.type === 'venta' || form.type === 'compra') && (
            <div>
              {/* Reemplazo: input+select sincronizados */}
              <PlantAutocomplete
                plants={plants}
                value={form.plantId}
                onChange={val => setForm(f => ({ ...f, plantId: val }))}
                required
              />
            </div>
          )}
          {(form.type === 'venta' || form.type === 'compra') && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Cantidad</label>
              <input type="number" name="quantity" min="1" value={form.quantity} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Precio</label>
            <input type="number" name="price" min="0" value={form.price} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Total</label>
            <input type="number" name="total" min="0" value={form.total} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" placeholder="Se calcula automáticamente" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Método de Pago</label>
            <select name="paymentMethod" value={form.paymentMethod} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
              {PAYMENT_METHODS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Fecha</label>
            <input type="date" name="date" value={form.date?.slice(0,10) || ''} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Lugar</label>
            <input name="location" value={form.location} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Notas</label>
            <input name="notes" value={form.notes} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2" />
          </div>
        </div>
        <button type="submit" className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Registrar Movimiento</button>
      </form>
      {showSuggestPlant && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded mb-4">
          <p className="mb-2">¿Deseas agregar <b>{suggestedPlantName}</b> como nueva planta al inventario?</p>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 mr-2"
            onClick={() => { setShowPlantForm(true); setShowSuggestPlant(false); }}
          >
            Sí, agregar planta
          </button>
          <button
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
            onClick={() => setShowSuggestPlant(false)}
          >
            No, gracias
          </button>
        </div>
      )}
      {showPlantForm && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <h3 className="text-lg font-bold mb-2">Nueva Planta</h3>
          <PlantForm
            initialData={{ name: suggestedPlantName, basePrice: '', purchasePrice: '', stock: '', type: 'interior' }}
            onSubmit={() => { setShowPlantForm(false); }}
            onCancel={() => setShowPlantForm(false)}
          />
        </div>
      )}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="text-lg font-medium mb-4">Histórico de Movimientos del Mes</h3>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          {movementsThisMonth.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No hay movimientos registrados este mes.</div>
          ) : (
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1">Fecha</th>
                <th className="px-2 py-1">Tipo</th>
                <th className="px-2 py-1">Detalle</th>
                <th className="px-2 py-1">Planta</th>
                <th className="px-2 py-1">Cantidad</th>
                <th className="px-2 py-1">Precio</th>
                <th className="px-2 py-1">Total</th>
                <th className="px-2 py-1">Método</th>
                <th className="px-2 py-1">Lugar</th>
                <th className="px-2 py-1">Notas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {movementsThisMonth.map(mov => (
                <tr key={mov.id} className={mov.type === 'compra' ? 'bg-red-50' : mov.type === 'egreso' ? 'bg-yellow-50' : mov.type === 'ingreso' ? 'bg-green-50' : ''}>
                  <td className="px-2 py-1">{mov.date ? new Date(mov.date).toLocaleString('es-AR', {
                    timeZone: 'America/Argentina/Buenos_Aires',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  }) : ''}</td>
                  <td className="px-2 py-1">{MOVEMENT_TYPES.find(t => t.value === mov.type)?.label || mov.type}</td>
                  <td className="px-2 py-1">{mov.detail}</td>
                  <td className="px-2 py-1">{plants && mov.plantId ? (plants.find(p => p.id === Number(mov.plantId))?.name || '-') : '-'}</td>
                  <td className="px-2 py-1 text-right">
                    {(mov.type === 'venta' || mov.type === 'compra') ? mov.quantity : ''}
                  </td>
                  <td className="px-2 py-1 text-right">{mov.price ? `$${mov.price}` : ''}</td>
                  <td className="px-2 py-1 text-right">{mov.total ? `$${mov.total}` : ''}</td>
                  <td className="px-2 py-1">{PAYMENT_METHODS.find(m => m.value === mov.paymentMethod)?.label || mov.paymentMethod}</td>
                  <td className="px-2 py-1">{mov.location}</td>
                  <td className="px-2 py-1">{mov.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovementsView;

// NOTA: El campo 'date' almacena fecha y hora completa en formato ISO. Si en el futuro se requiere un reporte o gráfico por horario de ventas, se puede usar new Date(mov.date).getHours() para agrupar por hora.
// En la sección de caja solo se muestra la fecha (día/mes/año) para mayor simplicidad visual.
