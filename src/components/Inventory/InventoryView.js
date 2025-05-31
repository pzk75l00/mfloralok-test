import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import InventoryMovilView from '../Movil/InventoryMovilView';
import PlantCard from './PlantCard';
import LoadPlantsToFirestore from '../Base/LoadPlantsToFirestore';

const initialForm = { name: '', type: '', stock: 0, basePrice: 0, purchasePrice: 0, purchaseDate: '', supplier: '' };

// Inventario de plantas
// Aquí irá la lógica y UI para listar, agregar, editar y eliminar plantas

const InventoryView = () => {
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => unsubscribe();
  }, []);

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

  // Manejar cambios en el formulario
  const handleChange = e => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      const file = files[0];
      setImageFile(file);
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setImagePreview(reader.result);
        reader.readAsDataURL(file);
      } else {
        setImagePreview(null);
      }
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
      // Guardar imagen si se seleccionó una nueva
      if (imageFile) {
        // Guardar en public/img/plants/plant_{id}.jpg (solo funciona en desarrollo local)
        // En producción real, se recomienda usar Firebase Storage
        const fileName = `plant_${plantData.id}.jpg`;
        const filePath = `/img/plants/${fileName}`;
        // No se puede guardar en public desde el navegador, solo mostrar preview y documentar
        plantData.image = filePath;
        // Mostrar advertencia si no se puede guardar realmente
        alert('La imagen se asociará al producto, pero para que se vea en producción debe copiarse manualmente a public/img/plants/ con el nombre sugerido: ' + fileName);
      }
      await setDoc(doc(collection(db, 'plants'), plantData.id), plantData);
      setForm(initialForm);
      setEditingId(null);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      alert('Error guardando la planta.');
    }
  };

  // Editar planta
  const handleEdit = plant => {
    setForm({ name: plant.name, type: plant.type, stock: plant.stock, basePrice: plant.basePrice, purchasePrice: plant.purchasePrice, purchaseDate: plant.purchaseDate, supplier: plant.supplier });
    setEditingId(plant.id);
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
    await deleteDoc(doc(collection(db, 'plants'), deleteModal.id));
    setDeleteModal({ open: false, id: null, name: '' });
  };

  // Cancelar eliminación
  const cancelDelete = () => {
    setDeleteModal({ open: false, id: null, name: '' });
  };

  // Render condicional después de los hooks
  if (isMobile) return <InventoryMovilView />;

  return (
    <div ref={mainContainerRef} className="relative space-y-8">
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
                    await deleteDoc(doc(collection(db, 'plants'), plant.id));
                  }
                  // Agrega las importadas
                  for (const plant of imported) {
                    await setDoc(doc(collection(db, 'plants'), plant.id), plant);
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
        <h2 ref={titleRef} className="text-2xl font-bold mb-2 text-green-700">Carga - Actualización de productos</h2>
        {editingId && (
          <div className="mb-2 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-800 text-xs font-semibold flex items-center gap-2">
            <span className="material-icons text-base align-middle">edit</span>
            Editando: <b className="ml-1">{form.name}</b>
          </div>
        )}
        <form id="form-alta-producto" ref={formRef} onSubmit={handleSubmit} className="mb-2 w-full transition-shadow">
          <div className="w-full grid grid-cols-1 md:grid-cols-8 gap-2 items-end">
            <div>
              <label className="block text-xs font-medium">Nombre</label>
              <input name="name" value={form.name} onChange={handleChange} className="border rounded p-1 w-full text-xs" required />
            </div>
            <div>
              <label className="block text-xs font-medium">Tipo</label>
              <select name="type" value={form.type} onChange={handleChange} className="border rounded p-1 w-full text-xs" required>
                <option value="">Seleccionar...</option>
                <option value="Plantas de Interior">Plantas de Interior</option>
                <option value="Plantas de Exterior">Plantas de Exterior</option>
                <option value="Macetas">Macetas</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium">Stock</label>
              <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} className="border rounded p-1 w-full text-xs" required style={{maxWidth:'80px'}} />
            </div>
            <div>
              <label className="block text-xs font-medium">Precio Compra</label>
              <input name="basePrice" type="number" min="0" value={form.basePrice} onChange={handleChange} className="border rounded p-1 w-full text-xs" required style={{maxWidth:'100px'}} />
            </div>
            <div>
              <label className="block text-xs font-medium">Precio Venta</label>
              <input name="purchasePrice" type="number" min="0" value={form.purchasePrice} onChange={handleChange} className="border rounded p-1 w-full text-xs" required style={{maxWidth:'100px'}} />
            </div>
            <div>
              <label className="block text-xs font-medium">Fecha Compra</label>
              <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} className="border rounded p-1 w-full text-xs" style={{maxWidth:'120px'}} />
            </div>
            <div>
              <label className="block text-xs font-medium">Proveedor</label>
              <input name="supplier" value={form.supplier} onChange={handleChange} className="border rounded p-1 w-full text-xs" placeholder="(opcional)" style={{maxWidth:'120px'}} />
            </div>
            <div>
              <label className="block text-xs font-medium">Imagen</label>
              <div className="relative">
                <button
                  type="button"
                  className="px-2 py-1 rounded text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 cursor-pointer w-full text-left"
                  onClick={() => document.getElementById('input-img-producto').click()}
                >
                  Seleccionar imagen
                </button>
                <input
                  id="input-img-producto"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files[0];
                    setImageFile(file || null);
                    if (file) {
                      setImagePreview(null); // No previsualizar
                    } else {
                      setImagePreview(null);
                    }
                  }}
                />
                {imageFile && (
                  <span className="block text-green-700 text-[11px] mt-1 font-semibold">Imagen cargada</span>
                )}
              </div>
            </div>
          </div>
          <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded p-2 mt-2 mb-2">
            <b>Nota:</b> Para asociar una imagen personalizada al producto, debes copiar manualmente el archivo a <code>/public/img/plants/plant_{editingId || '[id]'}.jpg</code>.<br />
            El nombre del archivo debe coincidir exactamente con el ID del producto. Puedes exportar el CSV para ver todos los IDs actuales.<br />
            Si no se sube una imagen, se mostrará una imagen genérica.
          </div>
          <div className="flex gap-2 mt-3 justify-start border-t border-gray-100 pt-3">
            <button type="submit" className="bg-green-600 text-white px-3 py-1 rounded font-semibold text-xs">{editingId ? 'Actualizar' : 'Agregar'}</button>
            {editingId && (
              <button type="button" className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-semibold border border-gray-400 hover:bg-gray-300 transition text-xs" onClick={()=>{setForm(initialForm);setEditingId(null);setImageFile(null);setImagePreview(null);}}>Cancelar</button>
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
                    <td className="p-2">{plant.type}</td>
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
                <PlantCard key={plant.id} plant={plant} onEdit={handleEdit} onDelete={() => handleDelete(plant.id, plant.name)} />
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
    </div>
  );
};

export default InventoryView;
