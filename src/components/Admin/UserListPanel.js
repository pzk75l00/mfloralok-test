import React, { useContext, useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { UserContext } from '../../App';
import { db } from '../../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc, arrayUnion, getDocs, query, orderBy } from 'firebase/firestore';
import ErrorModal from '../Shared/ErrorModal';
import SuccessModal from '../Shared/SuccessModal';

const UserListPanel = ({ isAdmin, refreshTrigger, isMobile = false }) => {
  const { userData } = useContext(UserContext);
  const [users, setUsers] = useState([]);
  const [preUsers, setPreUsers] = useState([]);
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [errorModal, setErrorModal] = useState({ open: false, message: '' });
  const [successModal, setSuccessModal] = useState({ open: false, message: '' });
  const [rubros, setRubros] = useState([]);
  const [paises, setPaises] = useState([]);

  // Cargar usuarios
  useEffect(() => {
    if (!userData || (userData.rol !== 'admin' && userData.rol !== 'owner')) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPre = onSnapshot(collection(db, 'users_by_email'), snap => {
      setPreUsers(snap.docs.map(doc => ({ id: doc.id, email: doc.id, ...doc.data() })));
    });
    return () => { unsubUsers(); unsubPre(); };
  }, [userData, refreshTrigger]);

  // Cargar catálogos
  useEffect(() => {
    (async () => {
      try {
        const [rSnap, pSnap] = await Promise.all([
          getDocs(query(collection(db, 'rubros'), orderBy('nombre'))).catch(() => null),
          getDocs(query(collection(db, 'paises'), orderBy('nombre'))).catch(() => null)
        ]);
        setRubros(rSnap ? rSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
        setPaises(pSnap ? pSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
      } catch (_) { /* ignore */ }
    })();
  }, []);

  // Computar lista de usuarios mostrados
  const activatedByEmail = useMemo(() => {
    const map = {};
    users.forEach(u => {
      const key = String(u.id || '').toLowerCase();
      map[key] = u;
    });
    return map;
  }, [users]);

  const rows = useMemo(() => {
    return preUsers
      .filter(p => showDeleted || p.estado !== 'borrado')
      .filter(r => (userData?.rol === 'admin' ? r.rol !== 'owner' : true))
      .map(p => {
        const activated = activatedByEmail[String(p.id || '').toLowerCase()];
        return {
          id: String(p.id || '').toLowerCase(),
          email: p.email,
          nombre: activated?.nombre || p.nombre || '',
          apellido: activated?.apellido || p.apellido || '',
          telefono: activated?.telefono || p.telefono || '',
          rol: activated?.rol || p.rol || 'usuario',
          estado: p.estado || 'pendiente',
          fechaFin: p.fechaFin,
          diasRestantes: p.diasRestantes || 0,
          trialExtensionUsed: p.trialExtensionUsed || false,
          ultimaNota: p.ultimaNota,
          modules: activated?.modules || p.modules || [],
          rubroId: activated?.rubroId,
          paisId: activated?.paisId
        };
      });
  }, [preUsers, activatedByEmail, showDeleted, userData]);

  const handleEdit = (user) => {
    setEditUser(user);
    const activated = activatedByEmail[String(user.id || '').toLowerCase()];
    setEditForm({
      nombre: activated?.nombre || user.nombre || '',
      apellido: activated?.apellido || user.apellido || '',
      telefono: activated?.telefono || user.telefono || '',
      rol: activated?.rol || user.rol || 'usuario',
      modules: activated?.modules || user.modules || ['basico'],
      rubroId: activated?.rubroId || user.rubroId || '',
      paisId: activated?.paisId || user.paisId || '',
      diasRestantes: user.diasRestantes || 0
    });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditModulesChange = (e) => {
    const selected = Array.from(e.target.selectedOptions, option => option.value);
    setEditForm(prev => ({ ...prev, modules: selected }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUser || !editForm) return;
    setLoading(true);
    try {
      const emailLower = String(editUser.id || '').toLowerCase();
      const userRef = doc(db, 'users', emailLower);
      await updateDoc(userRef, {
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        telefono: editForm.telefono,
        rol: editForm.rol,
        modules: editForm.modules,
        rubroId: editForm.rubroId || '',
        paisId: editForm.paisId || ''
      });
      
      const preRef = doc(db, 'users_by_email', emailLower);
      const updates = {
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        telefono: editForm.telefono,
        rol: editForm.rol,
        modules: editForm.modules,
        rubroId: editForm.rubroId || '',
        paisId: editForm.paisId || ''
      };

      if (editForm.diasRestantes !== undefined && editForm.diasRestantes !== '' && !isNaN(Number(editForm.diasRestantes))) {
        const diasRestantes = Math.max(0, parseInt(editForm.diasRestantes, 10));
        const ahora = new Date();
        const nuevaFin = new Date(ahora.getTime() + diasRestantes * 24 * 60 * 60 * 1000);
        updates.fechaFin = nuevaFin.toISOString();
      }

      await updateDoc(preRef, updates);
      setSuccessModal({ open: true, message: 'Usuario actualizado correctamente.' });
      setEditUser(null);
      setEditForm(null);
    } catch (err) {
      setErrorModal({ open: true, message: 'Error al actualizar usuario: ' + err.message });
    }
    setLoading(false);
  };

  const openAction = (type, row) => {
    setActionModal({ type, emailId: row.id, row });
    setNoteText('');
  };

  const applyAction = async () => {
    if (!actionModal) return;
    const { emailId } = actionModal;
    setLoading(true);
    try {
      const preRef = doc(db, 'users_by_email', emailId);
      const newEstado = actionModal.type === 'suspender' ? 'suspendido' : 
                        actionModal.type === 'borrar' ? 'borrado' : 'pendiente';
      
      await updateDoc(preRef, {
        estado: newEstado,
        ultimaNota: {
          ts: new Date().toISOString(),
          actor: userData?.email || 'sistema',
          accion: actionModal.type,
          nota: noteText
        }
      });
      setSuccessModal({ open: true, message: `Usuario ${actionModal.type}ado correctamente.` });
      setActionModal(null);
    } catch (err) {
      setErrorModal({ open: true, message: 'Error: ' + err.message });
    }
    setLoading(false);
  };

  const getEstadoBadgeColor = (estado) => {
    const colors = {
      'activo': 'bg-green-100 text-green-700',
      'pendiente': 'bg-yellow-100 text-yellow-700',
      'extendido': 'bg-blue-100 text-blue-700',
      'suspendido': 'bg-orange-100 text-orange-700',
      'expirado': 'bg-red-100 text-red-700',
      'borrado': 'bg-gray-200 text-gray-600'
    };
    return colors[estado] || 'bg-gray-100 text-gray-700';
  };

  if (!isMobile) {
    // Vista desktop - tabla completa
    return (
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
            Mostrar borrados
          </label>
          <span className="text-xs text-gray-500">Total: {rows.length}</span>
        </div>
        {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
        {success && <div className="text-green-700 text-xs mb-2">{success}</div>}
        <div className="overflow-x-auto bg-white border rounded shadow text-sm">
          <table className="min-w-full">
            <thead>
              <tr className="bg-green-100">
                <th className="p-2 text-left">Email</th>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-left">Estado</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{r.email}</td>
                  <td className="p-2">{r.nombre} {r.apellido}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getEstadoBadgeColor(r.estado)}`}>
                      {r.estado}
                    </span>
                  </td>
                  <td className="p-2 whitespace-nowrap space-x-2">
                    <button className="text-blue-600 underline text-xs hover:font-semibold" onClick={() => handleEdit(r)}>Editar</button>
                    {r.estado !== 'borrado' && r.estado !== 'suspendido' && (
                      <button className="text-orange-600 underline text-xs hover:font-semibold" onClick={() => openAction('suspender', r)}>Suspender</button>
                    )}
                    {(r.estado === 'suspendido' || r.estado === 'borrado') && (
                      <button className="text-green-700 underline text-xs hover:font-semibold" onClick={() => openAction('reactivar', r)}>Reactivar</button>
                    )}
                    {r.estado !== 'borrado' && (
                      <button className="text-red-600 underline text-xs hover:font-semibold" onClick={() => openAction('borrar', r)}>Borrar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Vista móvil - cards
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
          Mostrar borrados
        </label>
        <span className="text-xs text-gray-500">Total: {rows.length}</span>
      </div>

      {rows.length === 0 ? (
        <div className="text-center p-4 text-gray-500 text-sm">
          No hay usuarios registrados
        </div>
      ) : (
        rows.map(r => (
          <div key={r.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-sm text-gray-800">{r.nombre} {r.apellido}</h3>
                <p className="text-xs text-gray-600">{r.email}</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap ${getEstadoBadgeColor(r.estado)}`}>
                {r.estado}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
              <div>
                <span className="font-semibold">Teléfono:</span> {r.telefono || '-'}
              </div>
              <div>
                <span className="font-semibold">Rol:</span> {r.rol}
              </div>
            </div>

            {r.diasRestantes !== undefined && (
              <div className="mb-3 p-2 bg-gray-50 rounded text-xs">
                <span className="font-semibold">Días Rest.:</span> {r.diasRestantes}
                {r.fechaFin && (
                  <span className="ml-2 text-gray-600">
                    (hasta {new Date(r.fechaFin).toLocaleDateString()})
                  </span>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                className="flex-1 px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold"
                onClick={() => handleEdit(r)}
              >
                Editar
              </button>
              {r.estado !== 'borrado' && r.estado !== 'suspendido' && (
                <button
                  className="flex-1 px-2 py-1 text-xs rounded bg-orange-100 text-orange-700 hover:bg-orange-200 font-semibold"
                  onClick={() => openAction('suspender', r)}
                >
                  Suspender
                </button>
              )}
              {(r.estado === 'suspendido' || r.estado === 'borrado') && (
                <button
                  className="flex-1 px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200 font-semibold"
                  onClick={() => openAction('reactivar', r)}
                >
                  Reactivar
                </button>
              )}
              {r.estado !== 'borrado' && (
                <button
                  className="flex-1 px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200 font-semibold"
                  onClick={() => openAction('borrar', r)}
                >
                  Borrar
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {/* Modal de acción */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
          <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-3 capitalize text-gray-800">{actionModal.type} usuario</h3>
            <textarea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="w-full border border-gray-300 rounded p-2 text-sm mb-4"
              placeholder="Nota (requerida para acciones)"
            />
            <div className="flex gap-2">
              <button
                className="flex-1 px-3 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                onClick={() => setActionModal(null)}
              >
                Cancelar
              </button>
              <button
                className="flex-1 px-3 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                onClick={applyAction}
                disabled={loading || !noteText.trim()}
              >
                {loading ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {editUser && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 p-4">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-lg shadow-lg p-4 w-full max-w-sm max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 text-green-700">Editar usuario</h3>
            
            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Nombre</label>
              <input name="nombre" value={editForm.nombre} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Apellido</label>
              <input name="apellido" value={editForm.apellido} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Teléfono</label>
              <input name="telefono" value={editForm.telefono} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Rol</label>
              <select
                name="rol"
                value={editForm.rol}
                onChange={handleEditChange}
                className="border rounded p-2 w-full text-sm"
                disabled={userData?.rol !== 'owner'}
              >
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Rubro</label>
              <select name="rubroId" value={editForm.rubroId || ''} onChange={handleEditChange} className="border rounded p-2 w-full text-sm">
                <option value="">Sin asignar</option>
                {rubros.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">País</label>
              <select name="paisId" value={editForm.paisId || ''} onChange={handleEditChange} className="border rounded p-2 w-full text-sm">
                <option value="">Sin asignar</option>
                {paises.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="block text-xs font-semibold mb-1">Días restantes</label>
              <input type="number" min="0" name="diasRestantes" value={editForm.diasRestantes ?? ''} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 px-3 py-2 rounded bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300"
                onClick={() => { setEditUser(null); setEditForm(null); }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-3 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

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

UserListPanel.propTypes = {
  isAdmin: PropTypes.bool,
  refreshTrigger: PropTypes.number,
  isMobile: PropTypes.bool
};

export default UserListPanel;
