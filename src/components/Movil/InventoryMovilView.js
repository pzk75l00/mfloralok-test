import React, { useState, useEffect } from 'react';
import ErrorModal from '../Shared/ErrorModal';
import SuccessModal from '../Shared/SuccessModal';
import ConfirmModal from '../Shared/ConfirmModal';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import ProductTypesManager from '../Inventory/ProductTypesManager';
import SmartInput from '../Shared/SmartInput';
import ProductBaseFormFields from '../Shared/ProductBaseFormFields';
import { isDuplicateProductName } from '../../utils/productManagement';

const initialForm = { name: '', productType: '', stock: 0, basePrice: 0, purchasePrice: 0, purchaseDate: '', supplier: '' };

const InventoryMovilView = () => {
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'
  const [search, setSearch] = useState("");
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const [productTypes, setProductTypes] = useState([]);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'producto'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productTypes'), snap => {
      setProductTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === 'stock' || name === 'basePrice' || name === 'purchasePrice' ? Number(value) : value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const nameTrimmed = (form.name || '').trim();
    const typeTrimmed = (form.productType || '').trim();
    const validationMessage = 'Los campos Nombre, Tipo, Stock, Precio de compra y Precio de venta son obligatorios y deben ser válidos.';
    if (!nameTrimmed || !typeTrimmed || form.stock < 0 || form.basePrice < 0 || form.purchasePrice < 0) {
      setErrorModal({ open: true, message: validationMessage });
      return;
    }
    if (form.basePrice > form.purchasePrice) {
      setErrorModal({ open: true, message: 'El precio de compra no puede ser mayor al precio de venta.' });
      return;
    }
    if (isDuplicateProductName(plants, nameTrimmed, editingId)) {
      setErrorModal({ open: true, message: 'Ya existe un producto con ese nombre.' });
      return;
    }
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nextId = editingId ? Number(editingId) : Math.max(0, ...plants.map(p => Number(p.id) || 0)) + 1;
    const plantData = {
      id: nextId,
      name: nameTrimmed,
      type: typeTrimmed,
      productType: typeTrimmed,
      stock: form.stock,
      basePrice: form.basePrice,
      purchasePrice: form.purchasePrice,
      purchaseDate: form.purchaseDate || todayStr,
      supplier: form.supplier || ''
    };
    const wasEditing = Boolean(editingId);
    try {
      await setDoc(doc(collection(db, 'producto'), String(plantData.id)), plantData);
      setForm(initialForm);
      setEditingId(null);
      setShowForm(false);
      setSuccessModal({
        open: true,
        message: wasEditing ? 'Producto actualizado correctamente.' : 'Producto agregado correctamente.'
      });
    } catch (err) {
      let errorMsg = '';
      if (err) {
        if (typeof err === 'string') {
          errorMsg = err;
        } else if (err.message) {
          errorMsg = err.message;
        } else {
          try {
            errorMsg = JSON.stringify(err);
          } catch (e) {
            errorMsg = String(err);
          }
        }
      } else {
        errorMsg = 'Error desconocido';
      }
      console.error('Error guardando la planta:', errorMsg, err);
      setErrorModal({ open: true, message: 'Error guardando la planta. ' + errorMsg });
    }
    // ...
    // Al final del componente:
    return (
      <>
        {/* ...resto del render... */}
        <ErrorModal
          open={errorModal.open}
          message={errorModal.message}
          onClose={() => setErrorModal({ open: false, message: '' })}
        />
        <SuccessModal
          open={successModal.open}
          message={successModal.message}
          onClose={() => setSuccessModal({ open: false, message: '' })}
        />
      </>
    );
  };

  const handleEdit = plant => {
    setForm({ name: plant.name, productType: plant.productType || plant.type || '', isInsumo: plant.isInsumo || false, stock: plant.stock, basePrice: plant.basePrice, purchasePrice: plant.purchasePrice, purchaseDate: plant.purchaseDate, supplier: plant.supplier });
    setEditingId(plant.id);
    setShowForm(true);
  };

  const handleDelete = async id => {
    setConfirmModal({
      open: true,
      message: '¿Eliminar esta planta?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(collection(db, 'producto'), String(id)));
          setConfirmModal({ open: false, message: '', onConfirm: null });
          setSuccessModal({ open: true, message: 'Producto eliminado correctamente.' });
        } catch (err) {
          setConfirmModal({ open: false, message: '', onConfirm: null });
          setErrorModal({ open: true, message: 'Error eliminando el producto: ' + (err?.message || 'Error desconocido') });
        }
      }
    });
  };

  // Filtro de plantas según búsqueda
  const filteredPlants = plants.filter(plant => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      plant.name?.toLowerCase().includes(q) ||
      plant.type?.toLowerCase().includes(q) ||
      String(plant.stock).includes(q) ||
      String(plant.basePrice).includes(q) ||
      String(plant.purchasePrice).includes(q) ||
      (plant.supplier?.toLowerCase().includes(q) || "")
    );
  });

  return (
    <div className="relative min-h-screen bg-gray-50 pb-24">
      <div className="rounded-lg shadow bg-white p-3">
        {/* Barra de búsqueda */}
        <div className="mb-4 max-w-md mx-auto">
          <input
            type="text"
            className="border rounded p-2 w-full"
            placeholder="Buscar por nombre, tipo, proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex justify-center mb-2 gap-2">
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('cards')}
          >Vista de tarjetas</button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('table')}
          >Vista de tabla</button>
          <button
            className="px-3 py-1 rounded font-semibold text-xs bg-green-100 hover:bg-green-200 text-green-700 border border-green-300"
            onClick={() => setShowTypesManager(true)}
          >Gestionar tipos</button>
        </div>
        {showTypesManager && <ProductTypesManager onClose={() => setShowTypesManager(false)} />}
        <button
          type="button"
          className="fixed bottom-20 right-4 z-50 bg-green-600 text-white rounded-full shadow-lg p-4 text-3xl md:hidden hover:bg-green-700 transition"
          style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
          onClick={() => setShowForm(true)}
          aria-label="Nuevo producto"
        >
          +
        </button>
        {showForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-30 p-4">
            <div className="bg-white rounded-lg shadow-md w-full max-w-md max-h-[90vh] flex flex-col">
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 pb-24">
                <ProductBaseFormFields
                  formData={form}
                  onChange={handleChange}
                  productTypes={productTypes}
                  onShowTypesManager={() => setShowTypesManager(true)}
                  disabled={false}
                  context="general"
                  layout="stack"
                />

                <label className="text-sm font-medium text-gray-700">Fecha de Compra</label>
                <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} className="border rounded p-2 w-full mb-2" />
                <label className="text-sm font-medium text-gray-700">Proveedor (opcional)</label>
                <input name="supplier" value={form.supplier} onChange={handleChange} className="border rounded p-2 w-full mb-2" placeholder="Proveedor (opcional)" />
              </form>
              <div className="flex gap-2 p-4 bg-white border-t border-gray-300 shadow-lg">
                <button type="submit" onClick={handleSubmit} className="bg-green-600 text-white px-4 py-3 rounded flex-1 text-lg font-semibold shadow">{editingId ? 'Actualizar' : 'Agregar'}</button>
                <button type="button" className="bg-gray-200 text-gray-700 px-4 py-3 rounded flex-1 text-lg font-semibold shadow" onClick={() => { setForm(initialForm); setEditingId(null); setShowForm(false); }}>Cancelar</button>
              </div>
            </div>
          </div>
        )}
        {viewMode === 'cards' ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {filteredPlants
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(plant => {
                const isLowStock = Number(plant.stock) <= 1;
                const cardColor = isLowStock
                  ? 'bg-red-100 border-red-300'
                  : 'bg-green-50 border-green-200';
                return (
                  <div key={plant.id} className={`rounded-lg shadow p-3 flex flex-col items-start border ${cardColor} transition-colors duration-300`}>
                    <div className="font-bold text-base text-green-700 mb-1">{plant.name}</div>
                    <div className="text-xs text-gray-500 mb-1">{plant.type}</div>
                    <div className={`text-sm mb-1 ${isLowStock ? 'text-red-700 font-bold' : 'text-green-800'}`}>Stock: <b>{plant.stock}</b></div>
                    <div className="text-sm mb-1">Venta: <b>${plant.purchasePrice}</b></div>
                    <div className="flex gap-2 mt-2">
                      <button className="text-blue-600 underline text-xs" onClick={() => handleEdit(plant)}>Editar</button>
                      <button className="text-red-600 underline text-xs" onClick={() => handleDelete(plant.id)}>Eliminar</button>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-2">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-green-100">
                  <th className="p-1">Nombre</th>
                  <th className="p-1">Tipo</th>
                  <th className="p-1">Stock</th>
                  <th className="p-1">Venta</th>
                  <th className="p-1">Compra</th>
                  <th className="p-1">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlants
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(plant => (
                    <tr key={plant.id} className="border-t">
                      <td className="p-1">{plant.name}</td>
                      <td className="p-1">{plant.type}</td>
                      <td className="p-1">{plant.stock}</td>
                      <td className="p-1">${plant.purchasePrice}</td>
                      <td className="p-1">${plant.basePrice}</td>
                      <td className="p-1 flex gap-1">
                        <button className="text-blue-600 underline text-xs" onClick={() => handleEdit(plant)}>Editar</button>
                        <button className="text-red-600 underline text-xs" onClick={() => handleDelete(plant.id)}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ErrorModal
        open={errorModal.open}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: '' })}
      />
      <SuccessModal
        open={successModal.open}
        message={successModal.message}
        onClose={() => setSuccessModal({ open: false, message: '' })}
      />
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
      />
    </div>
  );
};

export default InventoryMovilView;
