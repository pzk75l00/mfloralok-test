import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { collection, onSnapshot, setDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { normalizeForCompare } from '../../utils/stringUtils';
import ConfirmationModal from '../Shared/ConfirmationModal';

const RubrosManager = ({ onClose, onChanged }) => {
  const [rubros, setRubros] = useState([]);
  const [newRubro, setNewRubro] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState('');
    const [rubroToDelete, setRubroToDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'rubros'), orderBy('nombre'));
    const unsub = onSnapshot(q, snap => {
      setRubros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const nombre = newRubro.trim();
    if (!nombre) return;
    if (rubros.some(r => normalizeForCompare(r.nombre) === normalizeForCompare(nombre))) return;
    const newId = rubros.length > 0 ? Math.max(...rubros.map(r => Number(r.id) || 0)) + 1 : 1;
    await setDoc(doc(db, 'rubros', String(newId)), { id: newId, nombre, activo: true });
    setNewRubro('');
    if (onChanged) onChanged();
  };

  const handleEdit = (id, nombre) => {
    setEditingId(id);
    setEditingValue(nombre || '');
  };

  const handleUpdate = async (id) => {
    const nombre = editingValue.trim();
    if (!nombre) return;
    if (rubros.some(r => r.id !== id && normalizeForCompare(r.nombre) === normalizeForCompare(nombre))) return;
    await updateDoc(doc(db, 'rubros', String(id)), { id: Number(id), nombre });
    setEditingId(null);
    setEditingValue('');
    if (onChanged) onChanged();
  };

  const handleDelete = (id) => {
    const found = rubros.find(r => r.id === id) || null;
    setRubroToDelete(found);
  };

  const confirmDelete = async () => {
    if (!rubroToDelete) return;
    await deleteDoc(doc(db, 'rubros', String(rubroToDelete.id)));
    setRubroToDelete(null);
    if (onChanged) onChanged();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-xs border border-gray-200">
        <h3 className="text-lg font-bold mb-2 text-green-700">Gestionar Rubros</h3>
        <div className="mb-4">
          <input
            type="text"
            value={newRubro}
            onChange={e => setNewRubro(e.target.value)}
            className="border rounded p-1 w-full text-xs mb-2"
            placeholder="Nuevo rubro..."
          />
          <button onClick={handleAdd} className="bg-green-600 text-white px-2 py-1 rounded text-xs w-full">Agregar</button>
        </div>
        <ul className="mb-4 max-h-40 overflow-y-auto divide-y divide-gray-100">
          {rubros.map(r => (
            <li key={r.id} className="flex items-center gap-2 py-1">
              {editingId === r.id ? (
                <>
                  <input
                    value={editingValue}
                    onChange={e => setEditingValue(e.target.value)}
                    className="border rounded p-1 text-xs flex-1"
                  />
                  <button onClick={() => handleUpdate(r.id)} className="text-green-700 text-xs font-bold">✔</button>
                  <button onClick={() => setEditingId(null)} className="text-gray-500 text-xs">✕</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-xs">{r.nombre}</span>
                  <button onClick={() => handleEdit(r.id, r.nombre)} className="text-blue-600 text-xs">Editar</button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 text-xs">Eliminar</button>
                </>
              )}
            </li>
          ))}
          {!rubros.length && (
            <li className="py-2 text-[11px] text-gray-500 italic">Sin rubros aún</li>
          )}
        </ul>
        <button onClick={onClose} className="bg-gray-200 text-gray-700 px-3 py-1 rounded w-full mt-2">Cerrar</button>
      </div>
      {rubroToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setRubroToDelete(null)}
          onConfirm={confirmDelete}
          type="danger"
          title="Eliminar rubro"
          message={`¿Eliminar el rubro "${rubroToDelete.nombre}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
        />
      )}
    </div>
  );
};

RubrosManager.propTypes = {
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func,
};

export default RubrosManager;
