import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import InventoryMovilView from '../Movil/InventoryMovilView';

const initialForm = { name: '', type: '', stock: 0, basePrice: 0, purchasePrice: 0, purchaseDate: '', supplier: '' };

// Inventario de plantas
// Aquí irá la lógica y UI para listar, agregar, editar y eliminar plantas

const InventoryView = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  if (isMobile) return <InventoryMovilView />;

  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  // Cargar plantas en tiempo real
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => unsubscribe();
  }, []);

  // Manejar cambios en el formulario
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'stock' || name === 'basePrice' || name === 'purchasePrice' ? Number(value) : value }));
  };

  // Guardar o actualizar planta
  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name.trim() || !form.type.trim() || form.stock < 0 || form.basePrice < 0 || form.purchasePrice < 0) {
      alert('Todos los campos son obligatorios y deben ser válidos.');
      return;
    }
    if (form.basePrice > form.purchasePrice) {
      alert('El precio de compra no puede ser mayor al precio de venta.');
      return;
    }
    // Asegurar que todos los campos estén presentes
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const plantData = {
      id: editingId ? editingId : (Math.max(0, ...plants.map(p => Number(p.id) || 0)) + 1).toString(),
      name: form.name,
      type: form.type,
      stock: form.stock,
      basePrice: form.basePrice,
      purchasePrice: form.purchasePrice,
      purchaseDate: form.purchaseDate || todayStr,
      supplier: form.supplier || ''
    };
    try {
      await setDoc(doc(collection(db, 'plants'), plantData.id), plantData);
      setForm(initialForm);
      setEditingId(null);
    } catch (err) {
      alert('Error guardando la planta.');
    }
  };

  // Editar planta
  const handleEdit = plant => {
    setForm({ name: plant.name, type: plant.type, stock: plant.stock, basePrice: plant.basePrice, purchasePrice: plant.purchasePrice, purchaseDate: plant.purchaseDate, supplier: plant.supplier });
    setEditingId(plant.id);
  };

  // Eliminar planta
  const handleDelete = async id => {
    if (!window.confirm('¿Eliminar esta planta?')) return;
    await deleteDoc(doc(collection(db, 'plants'), id));
  };

  return (
    <div className="relative">
      <h2 className="text-xl font-bold mb-4">Inventario de Plantas</h2>
      <form id="form-alta-producto" onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-7 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input name="name" value={form.name} onChange={handleChange} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Tipo</label>
          <select name="type" value={form.type} onChange={handleChange} className="border rounded p-2 w-full" required>
            <option value="">Seleccionar...</option>
            <option value="Plantas de Interior">Plantas de Interior</option>
            <option value="Plantas de Exterior">Plantas de Exterior</option>
            <option value="Macetas">Macetas</option>
            <option value="Otros">Otros</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Stock</label>
          <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Precio de Compra</label>
          <input name="basePrice" type="number" min="0" value={form.basePrice} onChange={handleChange} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Precio de Venta</label>
          <input name="purchasePrice" type="number" min="0" value={form.purchasePrice} onChange={handleChange} className="border rounded p-2 w-full" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Fecha de Compra</label>
          <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} className="border rounded p-2 w-full" />
        </div>
        <div>
          <label className="block text-sm font-medium">Proveedor</label>
          <input name="supplier" value={form.supplier} onChange={handleChange} className="border rounded p-2 w-full" placeholder="(opcional)" />
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded mt-2 md:mt-0">{editingId ? 'Actualizar' : 'Agregar'}</button>
        {editingId && <button type="button" className="ml-2 text-sm text-gray-600 underline" onClick={()=>{setForm(initialForm);setEditingId(null);}}>Cancelar</button>}
      </form>
      <table className="min-w-full bg-white border rounded shadow text-sm">
        <thead>
          <tr className="bg-green-100">
            <th className="p-2">Nombre</th>
            <th className="p-2">Tipo</th>
            <th className="p-2">Stock</th>
            <th className="p-2">Precio de Venta</th>
            <th className="p-2">Precio de Compra</th>
            <th className="p-2">Fecha de Compra</th>
            <th className="p-2">Proveedor</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plants
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(plant => (
              <tr key={plant.id} className="border-t">
                <td className="p-2">{plant.name}</td>
                <td className="p-2">{plant.type}</td>
                <td className="p-2">{plant.stock}</td>
                <td className="p-2">${plant.purchasePrice}</td>
                <td className="p-2">${plant.basePrice}</td>
                <td className="p-2">{plant.purchaseDate || '-'}</td>
                <td className="p-2">{plant.supplier || '-'}</td>
                <td className="p-2 flex gap-2">
                  <button className="text-blue-600 underline" onClick={()=>handleEdit(plant)}>Editar</button>
                  <button className="text-red-600 underline" onClick={()=>handleDelete(plant.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {/* Botón flotante solo visible en móvil */}
      <button
        type="button"
        className="fixed bottom-20 right-4 z-50 bg-green-600 text-white rounded-full shadow-lg p-4 text-3xl md:hidden hover:bg-green-700 transition"
        style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
        onClick={() => {
          const form = document.getElementById('form-alta-producto');
          if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
        aria-label="Nuevo producto"
      >
        +
      </button>
    </div>
  );
};

export default InventoryView;
