import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { db } from '../../firebase/firebaseConfig';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { normalizeForCompare } from '../../utils/stringUtils';
import ConfirmationModal from '../Shared/ConfirmationModal';

const PaisesManager = ({ onClose, onChanged }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'paises'), orderBy('nombre'));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(arr);
      setLoading(false);
    }, () => {
      setError('Error cargando países');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (items.some((it) => normalizeForCompare(it.nombre) === normalizeForCompare(name))) {
      setError('Ya existe un país con ese nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await addDoc(collection(db, 'paises'), {
        nombre: name,
        activo: true,
        createdAt: serverTimestamp()
      });
      setNewName('');
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || 'Error creando país');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingName(item.nombre || '');
    setError('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async (id) => {
    const name = editingName.trim();
    if (!name) return;
    if (items.some((it) => it.id !== id && normalizeForCompare(it.nombre) === normalizeForCompare(name))) {
      setError('Ya existe otro país con ese nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'paises', id), {
        nombre: name,
        updatedAt: serverTimestamp()
      });
      if (onChanged) onChanged();
      cancelEdit();
    } catch (e) {
      setError(e.message || 'Error actualizando país');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'paises', itemToDelete.id));
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || 'Error eliminando país');
    } finally {
      setSaving(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gestionar países</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cerrar
          </button>
        </div>

        {error && (
          <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo país</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              placeholder="Nombre de país"
              disabled={saving}
            />
            <button
              type="button"
              onClick={handleAdd}
              className="px-3 py-2 text-xs rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              disabled={saving || !newName.trim()}
            >
              {saving ? 'Guardando...' : 'Agregar'}
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded max-h-64 overflow-auto text-sm">
          {loading ? (
            <div className="p-3 text-xs text-gray-500">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 italic">Sin países cargados.</div>
          ) : (
            <ul>
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 border-gray-100"
                >
                  {editingId === item.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md shadow-sm p-1 text-sm"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdate(item.id)}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="px-2 py-1 text-xs rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{item.nombre || item.id}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {itemToDelete && (
          <ConfirmationModal
            isOpen={true}
            onClose={() => setItemToDelete(null)}
            onConfirm={confirmDelete}
            type="danger"
            title="Eliminar país"
            message={`¿Eliminar el país "${itemToDelete.nombre}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
          />
        )}
      </div>
    </div>
  );
};
PaisesManager.propTypes = {
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func
};

export default PaisesManager;
