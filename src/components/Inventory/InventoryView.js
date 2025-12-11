import React, { useState, useEffect, useRef } from 'react';
import ErrorModal from '../Shared/ErrorModal';
import ImageZoomModal from '../Shared/ImageZoomModal';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import InventoryMovilView from '../Movil/InventoryMovilView';
import PlantCard from './PlantCard';
import LoadPlantsToFirestore from '../Base/LoadPlantsToFirestore';
import ProductTypesManager from './ProductTypesManager';
import SmartInput from '../Shared/SmartInput';
import { isDuplicateProductName } from '../../utils/productManagement';

const initialForm = { name: '', productType: '', isInsumo: false, stock: 0, basePrice: 0, purchasePrice: 0, purchaseDate: '', supplier: '' };

// Inventario de plantas
// Aquí irá la lógica y UI para listar, agregar, editar y eliminar plantas

const InventoryView = () => {
  const [zoomImage, setZoomImage] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [plants, setPlants] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState('table'); // 'table' o 'cards'
  const formRef = useRef(null);
  const titleRef = useRef(null);
  const mainContainerRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [optimizedImage, setOptimizedImage] = useState(null);
  const [imageInfo, setImageInfo] = useState(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [imageApproved, setImageApproved] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [reloadFlag, setReloadFlag] = useState(0);
  const [showTypesManager, setShowTypesManager] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [productTypes, setProductTypes] = useState([]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'producto'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [reloadFlag]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productTypes'), snap => {
      setProductTypes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const optimizeImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 640;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const optimizedKb = Math.round((dataUrl.length * 3) / 4 / 1024);
        const originalKb = Math.round(file.size / 1024);
        resolve({ dataUrl, width, height, optimizedKb, originalKb });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const handleFileSelection = async (file) => {
    setImageFile(file || null);
    setOptimizedImage(null);
    setImagePreview(null);
    setImageInfo(null);
    setImageApproved(false);
    if (!file) return;
    setProcessingImage(true);
    try {
      const optimized = await optimizeImage(file);
      setOptimizedImage(optimized.dataUrl);
      setImagePreview(optimized.dataUrl);
      setImageInfo({
        width: optimized.width,
        height: optimized.height,
        originalKb: optimized.originalKb,
        optimizedKb: optimized.optimizedKb
      });
    } catch (err) {
      setErrorModal({ open: true, message: 'No se pudo procesar la imagen. Intenta con otro archivo.' });
    } finally {
      setProcessingImage(false);
    }
  };

  // Filtro de plantas según búsqueda
  const filteredPlants = plants.filter(plant => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      plant.name?.toLowerCase().includes(q) ||
      plant.productType?.toLowerCase().includes(q) ||
      String(plant.stock).includes(q) ||
      String(plant.basePrice).includes(q) ||
      String(plant.purchasePrice).includes(q) ||
      (plant.supplier?.toLowerCase().includes(q) || "")
    );
  });

  // Manejar cambios en el formulario
  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      handleFileSelection(files && files[0]);
      return;
    }
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
    if (isDuplicateProductName(plants, form.name, editingId)) {
      setErrorModal({ open: true, message: 'Ya existe un producto con ese nombre.' });
      return;
    }
    // Asegurar que todos los campos estén presentes
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const nextId = editingId ? Number(editingId) : Math.max(0, ...plants.map(p => Number(p.id) || 0)) + 1;
    const plantData = {
      id: nextId,
      name: form.name,
      type: form.type,
      stock: form.stock,
      basePrice: form.basePrice,
      purchasePrice: form.purchasePrice,
      purchaseDate: form.purchaseDate || todayStr,
      supplier: form.supplier || ''
    };
    try {
      let imageToSave = editingImage || null;
      if (imageFile) {
        if (!optimizedImage || !imageApproved) {
          setErrorModal({ open: true, message: 'Confirma la imagen optimizada antes de guardar.' });
          return;
        }
        imageToSave = optimizedImage;
      }
      if (imageToSave) {
        plantData.image = imageToSave;
      }
      await setDoc(doc(collection(db, 'producto'), String(plantData.id)), plantData);
      setForm(initialForm);
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
      setOptimizedImage(null);
      setImageInfo(null);
      setImageApproved(false);
      setEditingImage(null);
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
  };

  // Editar planta
  const handleEdit = plant => {
    setForm({ name: plant.name, productType: plant.productType || plant.type || '', isInsumo: plant.isInsumo || false, stock: plant.stock, basePrice: plant.basePrice, purchasePrice: plant.purchasePrice, purchaseDate: plant.purchaseDate, supplier: plant.supplier });
    setEditingId(plant.id);
    setEditingImage(plant.image || null);
    setImagePreview(plant.image || null);
    setOptimizedImage(null);
    setImageFile(null);
    setImageInfo(null);
    setImageApproved(false);
    setTimeout(() => {
      if (mainContainerRef.current) {
        mainContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (titleRef.current) {
        titleRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      // Fallback: window scroll
      setTimeout(() => {
        const rect = titleRef.current?.getBoundingClientRect();
        if (rect) window.scrollTo({ top: window.scrollY + rect.top - 24, behavior: 'smooth' });
      }, 200);
      if (formRef.current) {
        const firstInput = formRef.current.querySelector('input,select,textarea');
        if (firstInput) firstInput.focus();
        formRef.current.classList.add('ring-2', 'ring-green-400');
        setTimeout(() => formRef.current.classList.remove('ring-2', 'ring-green-400'), 1200);
      }
    }, 100);
  };

  // Eliminar planta (abre modal)
  const handleDelete = (id, name) => {
    setDeleteModal({ open: true, id, name });
  };

  // Confirmar eliminación
  const confirmDelete = async () => {
    await deleteDoc(doc(collection(db, 'producto'), String(deleteModal.id)));
    setDeleteModal({ open: false, id: null, name: '' });
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setDeleteModal({ open: false, id: null, name: '' });
  };

  // Botón para recargar desde Firebase
  const handleReload = () => {
    setLoading(true);
    setReloadFlag(flag => flag + 1);
  };

  // Render condicional después de los hooks
  if (isMobile) return <InventoryMovilView />;

  return (
    <div className="w-full max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Inventario</h2>
        {/* Botón "Cargar desde Firebase" oculto por requerimiento */}
        {/*
        <button
          onClick={handleReload}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
          disabled={loading}
        >
          {loading ? 'Cargando...' : 'Cargar desde Firebase'}
        </button>
        */}
      </div>
      {/* Línea superior: barra flotante con selector de vista, búsqueda, exportar/importar y botón actualizar firestore */}
      <div className="sticky top-2 z-20 bg-white/90 backdrop-blur rounded-xl shadow-md border border-gray-100 px-4 py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        {/* Selector de vista (izquierda) */}
        <div className="flex gap-2 order-1 md:order-none">
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${viewMode === 'table' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('table')}
          >Tabla</button>
          <button
            className={`px-3 py-1 rounded font-semibold text-sm ${viewMode === 'cards' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setViewMode('cards')}
          >Widgets</button>
        </div>
        {/* Barra de búsqueda (centro) */}
        <div className="flex-1 flex justify-center order-3 md:order-none">
          <input
            type="text"
            className="border rounded p-2 w-full max-w-xs text-sm"
            placeholder="Buscar por nombre, tipo, proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {/* Exportar/Importar CSV y botón actualizar firestore (derecha) */}
        <div className="flex items-center gap-2 order-2 md:order-none min-w-[220px] justify-end">
          <button
            className="px-3 py-1 rounded text-xs bg-green-100 hover:bg-green-200 text-green-700 border border-green-200"
            onClick={() => {
              // Exportar como CSV
              if (!plants.length) return;
              const headers = ['id','name','type','stock','basePrice','purchasePrice','purchaseDate','supplier','image'];
              const rows = [headers.join(',')].concat(
                plants.map(p => headers.map(h => {
                  let val = p[h] ?? '';
                  if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
                    val = '"' + val.replace(/"/g, '""') + '"';
                  }
                  return val;
                }).join(','))
              );
              const csv = rows.join('\r\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'plantas_export.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}
          >Exportar CSV</button>
          <label className="px-3 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 cursor-pointer mb-0">
            Importar CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={async e => {
                const file = e.target.files[0];
                if (!file) return;
                const text = await file.text();
                try {
                  const lines = text.split(/\r?\n/).filter(Boolean);
                  const headers = lines[0].split(',').map(h => h.trim());
                  const imported = lines.slice(1).map(line => {
                    // Manejar comillas y comas dentro de campos
                    const values = [];
                    let current = '';
                    let inQuotes = false;
                    for (let i = 0; i < line.length; i++) {
                      const char = line[i];
                      if (char === '"') {
                        if (inQuotes && line[i+1] === '"') {
                          current += '"'; i++; // Doble comilla
                        } else {
                          inQuotes = !inQuotes;
                        }
                      } else if (char === ',' && !inQuotes) {
                        values.push(current); current = '';
                      } else {
                        current += char;
                      }
                    }
                    values.push(current);
                    const obj = {};
                    headers.forEach((h, idx) => {
                      let v = values[idx] ?? '';
                      if (h === 'stock' || h === 'basePrice' || h === 'purchasePrice') v = Number(v) || 0;
                      obj[h] = v;
                    });
                    return obj;
                  });
                  if (!window.confirm('¿Sobrescribir todas las plantas actuales con las importadas?')) return;
                  // Borra todas las plantas actuales
                  for (const plant of plants) {
                    await deleteDoc(doc(collection(db, 'producto'), String(plant.id)));
                  }
                  // Agrega las importadas
                  for (const plant of imported) {
                    await setDoc(doc(collection(db, 'producto'), String(plant.id)), plant);
                  }
                  alert('Importación completada. Recargue la página para ver los cambios.');
                } catch (err) {
                  alert('Error al importar CSV: ' + err.message);
                }
              }}
            />
          </label>
          {/* Botón de actualizar Firestore solo visible si se descomenta (para uso técnico) */}
          {/* <div className="text-xs opacity-70">
            <LoadPlantsToFirestore />
          </div> */}
          {/* Si alguna vez se necesita, descomentar la línea de arriba */}
        </div>
      </div>
      {/* Bloque 1: Carga/edición de plantas */}
      <section className="bg-white rounded-xl shadow p-6 border border-gray-100">
        <h2 ref={titleRef} className="text-2xl font-bold mb-2 text-green-700 flex items-center gap-2">
          Carga - Actualización de productos
        </h2>
        {showTypesManager && <ProductTypesManager onClose={() => setShowTypesManager(false)} />}
        {editingId && (
          <div className="mb-2 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
            Editando: <b className="ml-1">{form.name}</b>
          </div>
        )}
        <form ref={formRef} onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
          <div className="w-full flex flex-wrap gap-2 items-end">
            {/* Nombre */}
            <div style={{minWidth: '180px', flex: '1 1 180px'}}>
              <label className="block text-xs font-medium">Nombre</label>
              <input name="name" value={form.name} onChange={handleChange} className="border rounded p-1 w-full text-xs" required />
            </div>
            
            {/* Tipo */}
            <div style={{minWidth: '110px', flex: '0 1 110px'}}>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium">Tipo</label>
                <button type="button" onClick={() => setShowTypesManager(true)} className="text-[11px] text-green-700 underline">Gestionar tipos</button>
              </div>
              <select name="productType" value={form.productType} onChange={handleChange} className="border rounded p-1 w-full text-xs" required>
                <option value="">Seleccionar...</option>
                {productTypes.length > 0 ? productTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>) : <><option value="planta">Planta</option><option value="maceta">Maceta</option><option value="flores">Flores</option></>}
              </select>
            </div>
            
            {/* Stock */}
            <div style={{minWidth: '70px', flex: '0 1 70px'}}>
              <label className="block text-xs font-medium">Stock</label>
              <input name="stock" type="number" value={form.stock} onChange={handleChange} className="border rounded p-1 w-full text-xs" placeholder="0" required />
            </div>
            
            {/* Precio Compra */}
            <div style={{minWidth: '95px', flex: '0 1 95px'}}>
              <label className="block text-xs font-medium">Precio Compra</label>
              <input name="basePrice" type="number" value={form.basePrice} onChange={handleChange} className="border rounded p-1 w-full text-xs" placeholder="0" required />
            </div>
            
            {/* Precio Venta */}
            <div style={{minWidth: '95px', flex: '0 1 95px'}}>
              <label className="block text-xs font-medium">Precio Venta</label>
              <input name="purchasePrice" type="number" value={form.purchasePrice} onChange={handleChange} className="border rounded p-1 w-full text-xs" placeholder="0" required />
            </div>
            
            {/* Fecha Compra */}
            <div style={{minWidth: '115px', flex: '0 1 115px'}}>
              <label className="block text-xs font-medium">Fecha Compra</label>
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} className="border rounded p-1 w-full text-xs" />
            </div>
            
            {/* Proveedor */}
            <div style={{minWidth: '110px', flex: '0 1 110px'}}>
              <label className="block text-xs font-medium">Proveedor</label>
              <input name="supplier" value={form.supplier} onChange={handleChange} className="border rounded p-1 w-full text-xs" placeholder="(opcional)" />
            </div>
                        {/* Uso Interno */}
            <div style={{minWidth: '85px', flex: '0 1 85px'}}>
              <label className="block text-xs font-medium mb-1">Uso</label>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  name="isInsumo"
                  checked={form.isInsumo || false}
                  onChange={(e) => setForm(prev => ({ ...prev, isInsumo: e.target.checked }))}
                  className="h-3 w-3 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <span className="text-[11px]">Interno</span>
              </label>
            </div>
                        {/* Imagen */}
            <div style={{minWidth: '130px', flex: '0 1 130px'}}>
              <label className="block text-xs font-medium">Imagen</label>
              <button
                type="button"
                className="px-2 py-1 rounded text-xs bg-green-600 hover:bg-green-700 text-white border border-green-700 cursor-pointer shadow flex items-center gap-2 w-full justify-center"
                onClick={() => document.getElementById('input-img-producto').click()}
              >
                <span role="img" aria-label="imagen" className="text-base">🖼️</span>
                Buscar imagen
              </button>
              <input
                id="input-img-producto"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => handleFileSelection(e.target.files && e.target.files[0])}
              />
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex flex-col items-center gap-3">
              {processingImage && <span className="block text-gray-600 text-[11px]">Optimizando...</span>}
              {optimizedImage && (
                <div className="w-full max-w-md p-3 border border-green-200 rounded bg-green-50">
                  <div className="text-[11px] text-green-800 font-semibold mb-2 text-center">Vista previa optimizada</div>
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={imagePreview}
                      alt="preview producto"
                      className="w-40 h-40 object-cover rounded border cursor-zoom-in"
                      onDoubleClick={() => setZoomImage(imagePreview)}
                      title="Doble click para ampliar"
                    />
                    <div className="flex flex-col gap-1 text-[11px] text-gray-700 text-center w-full">
                      {imageInfo && (
                        <>
                          <span><b>Dimensiones:</b> {imageInfo.width}x{imageInfo.height}px</span>
                          <span><b>Peso:</b> {imageInfo.originalKb} KB → {imageInfo.optimizedKb} KB</span>
                        </>
                      )}
                      <div className="flex gap-2 mt-2 justify-center flex-wrap">
                        {!imageApproved && (
                          <button type="button" className="px-3 py-1 rounded bg-green-600 text-white text-[11px]" onClick={() => setImageApproved(true)}>
                            Usar esta imagen
                          </button>
                        )}
                        <button type="button" className="px-3 py-1 rounded bg-gray-200 text-gray-800 text-[11px] border" onClick={() => document.getElementById('input-img-producto').click()}>
                          Buscar otra
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1 rounded bg-red-50 text-red-700 text-[11px] border border-red-200"
                          onClick={() => {
                            setImageFile(null);
                            setOptimizedImage(null);
                            setImagePreview(null);
                            setImageInfo(null);
                            setImageApproved(false);
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                      {imageApproved && <span className="text-[11px] text-green-700 font-semibold mt-1">✓ Imagen aprobada</span>}
                    </div>
                  </div>
                </div>
              )}
              {!optimizedImage && imagePreview && !imageFile && (
                <div className="w-full max-w-md p-3 border border-gray-200 rounded bg-gray-50 flex flex-col items-center gap-2">
                  <div className="text-[11px] text-gray-700 font-semibold">Imagen actual</div>
                  <img
                    src={imagePreview}
                    alt="imagen actual"
                    className="w-32 h-32 object-cover rounded border cursor-zoom-in"
                    onDoubleClick={() => setZoomImage(imagePreview)}
                    title="Doble click para ampliar"
                  />
                </div>
              )}
              {/* Modal de zoom de imagen */}
              <ImageZoomModal open={!!zoomImage} image={zoomImage} onClose={() => setZoomImage(null)} />
            </div>
          </div>
          <div className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded p-2 mt-2 mb-2">
            <b>Nota:</b> La imagen se optimiza automáticamente (máx. 640px) y se guarda la versión optimizada que apruebes. Si no cargas imagen, se usará la genérica.
          </div>
          <div className="flex gap-2 mt-3 justify-start border-t border-gray-100 pt-3">
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded font-semibold text-xs">{editingId ? 'Actualizar' : 'Agregar'}</button>
            {editingId && (
              <button
                type="button"
                className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-semibold border border-gray-400 hover:bg-gray-300 transition text-xs"
                onClick={()=>{
                  setForm(initialForm);
                  setEditingId(null);
                  setImageFile(null);
                  setImagePreview(null);
                  setOptimizedImage(null);
                  setImageInfo(null);
                  setImageApproved(false);
                  setEditingImage(null);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
      <div className="border-t border-gray-200 my-2" />
      {/* Bloque 3: Listado de productos */}
      <section>
        {viewMode === 'table' ? (
          <table className="min-w-full bg-white border rounded shadow text-sm">
            <thead>
              <tr className="bg-green-100">
                <th className="p-2">Nombre</th>
                <th className="p-2">Tipo</th>
                <th className="p-2">Uso Interno</th>
                <th className="p-2">Stock</th>
                <th className="p-2">Precio de Venta</th>
                <th className="p-2">Precio de Compra</th>
                <th className="p-2">Fecha de Compra</th>
                <th className="p-2">Proveedor</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlants
                .slice()
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(plant => (
                  <tr key={plant.id} className="border-t">
                    <td className="p-2">{plant.name}</td>
                    <td className="p-2">{plant.productType || plant.type}</td>
                    <td className="p-2 text-center">{plant.isInsumo ? 'Sí' : 'No'}</td>
                    <td className="p-2">{plant.stock}</td>
                    <td className="p-2">${plant.purchasePrice}</td>
                    <td className="p-2">${plant.basePrice}</td>
                    <td className="p-2">{plant.purchaseDate || '-'}</td>
                    <td className="p-2">{plant.supplier || '-'}</td>
                    <td className="p-2 flex gap-2">
                      <button
                        className="px-2 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        onClick={() => handleEdit(plant)}
                      >Editar</button>
                      <button
                        className="px-2 py-1 rounded text-xs bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300"
                        onClick={() => handleDelete(plant.id, plant.name)}
                      >Eliminar</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPlants
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(plant => (
                <PlantCard key={plant.id} plant={plant} onEdit={handleEdit} onDelete={() => handleDelete(plant.id, plant.name)} onImageDoubleClick={img => setZoomImage(img)} />
              ))}
          </div>
        )}
      </section>
      {/* Modal de confirmación de eliminación */}
      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-xs w-full border border-gray-200">
            <h3 className="text-lg font-bold mb-2 text-red-700 flex items-center gap-2"><span className="material-icons text-2xl">warning</span> Confirmar eliminación</h3>
            <p className="mb-4 text-gray-700 text-sm">¿Seguro que deseas eliminar el producto <b>{deleteModal.name}</b>? Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end mt-4">
              <button className="px-3 py-1 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={cancelDelete}>Cancelar</button>
              <button className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
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
      {/* ErrorModal para mensajes de error */}
      <ErrorModal
        open={errorModal.open}
        message={errorModal.message}
        onClose={() => setErrorModal({ open: false, message: '' })}
      />
    </div>
  );
};

export default InventoryView;
