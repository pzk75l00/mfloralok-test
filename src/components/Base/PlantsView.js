import React, { useState, useEffect } from 'react';
import PlantCard from './PlantCard';
import PlantForm from './PlantForm';
import ConfirmModal from '../Shared/ConfirmModal';
import ErrorModal from '../Shared/ErrorModal';
import SuccessModal from '../Shared/SuccessModal';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { logToBackend } from '../../utils/logToBackend';

const PlantsView = ({ plants, onAddPlant, onUpdatePlant, onDeletePlant }) => {
  const [showForm, setShowForm] = useState(false);
  const [currentPlant, setCurrentPlant] = useState(null);
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState('name');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' o 'table'
  const [isMobile, setIsMobile] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ open: false, message: '', onConfirm: null });
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Ejemplo: log al montar la vista de plantas
  React.useEffect(() => {
    logToBackend('Vista de plantas abierta', { timestamp: new Date().toISOString() });
  }, []);

  const handleAdd = () => {
    setCurrentPlant(null);
    setShowForm(true);
  };

  const handleEdit = (plant) => {
    setCurrentPlant(plant);
    setShowForm(true);
  };

  const handleSubmit = (plantData) => {
    if (currentPlant) {
      onUpdatePlant({ ...plantData, id: currentPlant.id });
    } else {
      onAddPlant(plantData);
    }
    setShowForm(false);
  };

  // Filtrar y ordenar plantas
  const filteredPlants = plants
    .filter(plant => plant.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (orderBy === 'name') return a.name.localeCompare(b.name);
      if (orderBy === 'stock') return b.stock - a.stock;
      if (orderBy === 'basePrice') return b.basePrice - a.basePrice;
      return 0;
    });

  // Exportar a CSV
  const handleExportCSV = () => {
    const headers = ['Nombre', 'Stock', 'Precio venta', 'Precio compra', 'Tipo'];
    const rows = filteredPlants.map(plant => [
      plant.name,
      plant.stock,
      plant.basePrice,
      plant.purchasePrice,
      plant.type
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(val => `"${val}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventario_plantas.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Vaciar movimientos (caja)
  const handleDeleteAllMovements = async () => {
    setConfirmModal({
      open: true,
      message: '¿Seguro que quieres borrar TODOS los movimientos de caja? Esta acción no se puede deshacer.',
      onConfirm: async () => {
        try {
          const snapshot = await getDocs(collection(db, 'movements'));
          const batchDeletes = [];
          snapshot.forEach((d) => {
            batchDeletes.push(deleteDoc(doc(db, 'movements', String(d.id))));
          });
          await Promise.all(batchDeletes);
          setConfirmModal({ open: false, message: '', onConfirm: null });
          setSuccessModal({ open: true, message: 'Movimientos de caja eliminados correctamente.' });
        } catch (err) {
          setConfirmModal({ open: false, message: '', onConfirm: null });
          setErrorModal({ open: true, message: 'Error al eliminar movimientos: ' + err.message });
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <h2 className="text-2xl font-bold text-gray-800">Inventario de Productos</h2>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-2 text-base flex-1 min-w-0"
          />
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-base"
          >
            + Nuevo Producto
          </button>
          {!isMobile && (
            <>
              <select
                value={orderBy}
                onChange={e => setOrderBy(e.target.value)}
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
              >
                <option value="name">Nombre</option>
                <option value="stock">Stock</option>
                <option value="basePrice">Precio venta</option>
              </select>
              <button
                onClick={handleExportCSV}
                className="px-2 py-1 border rounded-md text-sm bg-blue-100 hover:bg-blue-200"
              >
                Exportar CSV
              </button>
              <button
                onClick={handleDeleteAllMovements}
                className="px-2 py-1 border rounded-md text-sm bg-red-100 hover:bg-red-200"
              >
                Vaciar Caja
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="px-2 py-1 border rounded-md text-sm bg-gray-100 hover:bg-gray-200"
              >
                {viewMode === 'cards' ? 'Ver como tabla' : 'Ver como tarjetas'}
              </button>
            </>
          )}
        </div>
      </div>

      {showForm ? (
        <PlantForm
          initialData={currentPlant}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
        />
      ) : (
        // Solo mostrar tarjetas en móvil, tabla o tarjetas en desktop
        (isMobile || viewMode === 'cards') ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPlants.map(plant => (
              <PlantCard
                key={plant.id}
                plant={plant}
                onEdit={handleEdit}
                onDelete={onDeletePlant}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 py-1 text-left">Nombre</th>
                  <th className="px-2 py-1 text-right">Stock</th>
                  <th className="px-2 py-1 text-right">Precio venta</th>
                  <th className="px-2 py-1 text-right">Precio compra</th>
                  <th className="px-2 py-1 text-right">Costo Promedio</th>
                  <th className="px-2 py-1 text-left">Tipo</th>
                  <th className="px-2 py-1">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPlants.map(plant => (
                  <tr key={plant.id}>
                    <td className="px-2 py-1">{plant.name}</td>
                    <td className="px-2 py-1 text-right">{plant.stock}</td>
                    <td className="px-2 py-1 text-right">${plant.basePrice}</td>
                    <td className="px-2 py-1 text-right">${plant.purchasePrice}</td>
                    <td className="px-2 py-1 text-right">{plant.costoPromedio !== undefined ? `$${plant.costoPromedio}` : '-'}</td>
                    <td className="px-2 py-1">{plant.type}</td>
                    <td className="px-2 py-1 flex gap-2">
                      <button onClick={() => handleEdit(plant)} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100">Editar</button>
                      <button onClick={() => onDeletePlant(plant.id)} className="px-2 py-1 bg-red-50 text-red-600 rounded-md hover:bg-red-100">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <ConfirmModal
        open={confirmModal.open}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ open: false, message: '', onConfirm: null })}
      />
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
    </div>
  );
};

export default PlantsView;