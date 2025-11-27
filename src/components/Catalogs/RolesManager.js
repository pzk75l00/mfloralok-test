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

import { useContext } from 'react';
import { UserContext } from '../../App';

const RolesManager = ({ onClose, onChanged }) => {
  const { userData } = useContext(UserContext) || {};
  const isOwner = userData?.rol === 'owner';
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [itemToDelete, setItemToDelete] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'roles'), orderBy('nombre'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setItems(arr);
        setLoading(false);
      },
      () => {
        setError('Error cargando roles');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    if (items.some((it) => normalizeForCompare(it.nombre) === normalizeForCompare(name))) {
      setError('Ya existe un rol con ese nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const newId = items.length > 0 ? Math.max(...items.map(it => Number(it.id) || 0)) + 1 : 1;
      await addDoc(collection(db, 'roles'), {
        id: newId,
        nombre: name,
        esSistema: false,
        createdAt: serverTimestamp()
      });
      setNewName('');
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || 'Error creando rol');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    const nameLc = String(item.nombre || '').toLowerCase();
    const protectedRole = item.esSistema || nameLc === 'admin' || nameLc === 'usuario';
    if (protectedRole && !isOwner) {
      setError('Solo los usuarios owner pueden editar este rol protegido.');
      return;
    }
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
      setError('Ya existe otro rol con ese nombre.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateDoc(doc(db, 'roles', id), {
        id: Number(id),
        nombre: name,
        updatedAt: serverTimestamp()
      });
      if (onChanged) onChanged();
      cancelEdit();
    } catch (e) {
      setError(e.message || 'Error actualizando rol');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    const nameLc = String(item.nombre || '').toLowerCase();
    const protectedRole = item.esSistema || nameLc === 'admin' || nameLc === 'usuario';
    if (protectedRole && !isOwner) {
      setError('Solo los usuarios owner pueden eliminar este rol protegido.');
      return;
    }
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setSaving(true);
    setError('');
    try {
      await deleteDoc(doc(db, 'roles', itemToDelete.id));
      if (onChanged) onChanged();
    } catch (e) {
      setError(e.message || 'Error eliminando rol');
    } finally {
      setSaving(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Gestionar roles</h3>
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Nuevo rol</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              placeholder="Nombre de rol"
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
            <div className="p-3 text-xs text-gray-500 italic">Sin roles cargados.</div>
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
                    (() => {
                      const nameLc = String(item.nombre || '').toLowerCase();
                      const protectedRole = item.esSistema || nameLc === 'admin' || nameLc === 'usuario';
                      const canEditDelete = !protectedRole || isOwner;
                      return (
                        <>
                          <span className="flex-1 text-sm text-gray-800">
                            {item.nombre || item.id}
                            {protectedRole && (
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-gray-400 border border-gray-200 rounded px-1 py-0.5">
                                sistema
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              disabled={!canEditDelete || saving}
                              title={protectedRole && !isOwner ? 'Solo los owner pueden editar este rol protegido' : 'Editar'}
                              className={`text-xs ${!canEditDelete ? 'text-gray-400' : 'text-blue-600 hover:underline'}`}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={!canEditDelete || saving}
                              title={protectedRole && !isOwner ? 'Solo los owner pueden eliminar este rol protegido' : 'Eliminar'}
                              className={`text-xs ${!canEditDelete ? 'text-gray-400' : 'text-red-600 hover:underline'}`}
                            >
                              Eliminar
                            </button>
                          </div>
                        </>
                      );
                    })()
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
            title="Eliminar rol"
            message={`¿Eliminar el rol "${itemToDelete.nombre}"? Esta acción no se puede deshacer.`}
            confirmText="Eliminar"
            cancelText="Cancelar"
          />
        )}
      </div>
    </div>
  );
};

RolesManager.propTypes = {
  onClose: PropTypes.func.isRequired,
  onChanged: PropTypes.func
};

export default RolesManager;
