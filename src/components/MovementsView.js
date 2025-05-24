import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import PlantForm from './PlantForm';

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

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let total = form.total;
    if (!total && form.price && form.quantity) {
      total = Number(form.price) * Number(form.quantity);
    }
    await addDoc(collection(db, 'movements'), {
      ...form,
      quantity: Number(form.quantity),
      price: Number(form.price),
      total: Number(total),
      date: new Date(form.date).toISOString()
    });
    // Sugerir alta de planta si corresponde
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

  // --- FILTRO MENSUAL ---
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const movementsThisMonth = movements.filter(mov => {
    if (!mov.date) return false;
    const d = new Date(mov.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // --- TOTALES DEL MES ---
  const totalVentasMes = movementsThisMonth.filter(m => m.type === 'venta').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalComprasMes = movementsThisMonth.filter(m => m.type === 'compra').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalIngresosMes = movementsThisMonth.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + (m.total || 0), 0);
  const totalEgresosMes = movementsThisMonth.filter(m => m.type === 'egreso').reduce((sum, m) => sum + (m.total || 0), 0);
  const productosVendidosMes = movementsThisMonth.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  // Render sugerencia de alta de planta
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Movimientos de Caja - {now.toLocaleString('es-AR', { month: 'long', year: 'numeric' })}</h2>
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
              <label className="block text-sm font-medium text-gray-700">Planta</label>
              <select name="plantId" value={form.plantId} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2">
                <option value="">Selecciona una planta</option>
                {plants && plants.slice().sort((a, b) => a.name.localeCompare(b.name)).map(plant => (
                  <option key={plant.id} value={plant.id}>{plant.name}</option>
                ))}
              </select>
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
                  <td className="px-2 py-1">{mov.date ? new Date(mov.date).toLocaleDateString() : ''}</td>
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
        </div>
      </div>
    </div>
  );
};

export default MovementsView;
