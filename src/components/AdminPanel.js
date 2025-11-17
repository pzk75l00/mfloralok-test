import React, { useContext, useEffect, useState, useMemo } from 'react';
import { UserContext } from '../App';
import UserRegisterForm from './UserRegisterForm';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

// Vista de administración: gestión de usuarios y módulos
const AdminPanel = () => {
  const { userData } = useContext(UserContext);
  const [users, setUsers] = useState([]); // perfiles activados (colección users)
  const [preUsers, setPreUsers] = useState([]); // pre-registros (colección users_by_email)
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isOwnerByEmail, setIsOwnerByEmail] = useState(false);

  useEffect(() => {
    if (!userData || (userData.rol !== 'admin' && userData.rol !== 'owner')) return;
    const unsubUsers = onSnapshot(collection(db, 'users'), snap => {
      setUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPre = onSnapshot(collection(db, 'users_by_email'), snap => {
      setPreUsers(snap.docs.map(doc => ({ id: doc.id, email: doc.id, ...doc.data() })));
    });
    return () => { unsubUsers(); unsubPre(); };
  }, [userData]);

  // Además del rol en users, verificamos si su email está en app_config/admins
  useEffect(() => {
    const checkOwnerEmail = async () => {
      try {
        if (!userData?.email) {
          setIsOwnerByEmail(false);
          return;
        }
        const ref = doc(db, 'app_config', 'admins');
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setIsOwnerByEmail(false);
          return;
        }
        const data = snap.data() || {};
        const map = data.emails || {};
        const key = String(userData.email).toLowerCase();
        setIsOwnerByEmail(map[key] === true);
      } catch (e) {
        setIsOwnerByEmail(false);
      }
    };
    checkOwnerEmail();
  }, [userData]);

  const handleEdit = (user) => {
    setEditUser(user);
    setEditForm({ ...user });
    setError('');
    setSuccess('');
  };

  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(f => ({ ...f, [name]: value }));
  };

  const handleEditModulesChange = e => {
    const { options } = e.target;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setEditForm(f => ({ ...f, modules: selected }));
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await updateDoc(doc(db, 'users', editUser.id), {
        nombre: editForm.nombre,
        apellido: editForm.apellido,
        telefono: editForm.telefono,
        rol: editForm.rol,
        modules: editForm.modules,
      });
      setSuccess('Usuario actualizado');
      setEditUser(null);
      setEditForm(null);
    } catch (err) {
      setError('Error al actualizar usuario');
    }
    setLoading(false);
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`¿Eliminar usuario ${user.email}?`)) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await deleteDoc(doc(db, 'users', user.id));
      setSuccess('Usuario eliminado');
    } catch (err) {
      setError('Error al eliminar usuario');
    }
    setLoading(false);
  };

  // Cambios de estado sobre pre-registros (users_by_email)
  const updatePreUserEstado = async (emailId, nuevoEstado) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const ref = doc(db, 'users_by_email', emailId.toLowerCase());
      await updateDoc(ref, { estado: nuevoEstado, fechaModif: new Date().toISOString() });
      setSuccess('Estado actualizado');
    } catch (e) {
      setError('Error al actualizar estado');
    } finally {
      setLoading(false);
    }
  };

  const computeDiasRestantes = (fechaFinStr) => {
    if (!fechaFinStr) return '-';
    const fin = new Date(fechaFinStr);
    if (isNaN(fin.getTime())) return '-';
    const diffMs = fin.getTime() - Date.now();
    const dias = Math.ceil(diffMs / (24 * 60 * 60 * 1000));
    return dias < 0 ? 0 : dias;
  };

  // Merge de información: mostrar pre-registros (base) y si el usuario está activado marcar estado 'activo'
  const activatedByEmail = useMemo(() => {
    const map = {};
    users.forEach(u => { if (u.email) map[String(u.email).toLowerCase()] = u; });
    return map;
  }, [users]);

  const rows = useMemo(() => {
    return preUsers.map(p => {
      const emailLower = String(p.email || p.id || '').toLowerCase();
      const activated = activatedByEmail[emailLower];
      const estadoBase = String(p.estado || 'pendiente');
      const estado = activated ? 'activo' : estadoBase; // si existe perfil activado lo mostramos como activo
      return {
        id: emailLower,
        email: p.email || p.id,
        nombre: p.nombre || activated?.nombre || '',
        apellido: p.apellido || activated?.apellido || '',
        telefono: p.telefono || activated?.telefono || '',
        rol: activated?.rol || p.rol || 'usuario',
        modules: activated?.modules || p.modules || ['basico'],
        estado,
        fechaCreacion: p.fechaCreacion || p.creado || '',
        fechaModif: p.fechaModif || '',
        fechaFin: p.fechaFin || '',
        diasRestantes: computeDiasRestantes(p.fechaFin)
      };
    });
  }, [preUsers, activatedByEmail]);

  if (!userData || (userData.rol !== 'admin' && userData.rol !== 'owner')) {
    return <div className="text-red-600 font-bold p-4">Acceso restringido: solo para administradores.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div>
          <h2 className="text-lg font-semibold mb-2">Registrar nuevo usuario</h2>
          {/* Solo el Dueño puede elegir el rol (admin/usuario). El admin crea siempre 'usuario'.
              Consideramos Dueño si tiene rol 'owner' o si su email figura en app_config/admins. */}
          <UserRegisterForm isDios={userData.rol === 'owner' || isOwnerByEmail} />
        </div>

        <div className="mt-6 lg:mt-0">
          <h2 className="text-lg font-semibold mb-2">Usuarios registrados</h2>
          {error && <div className="text-red-600 text-xs mb-2">{error}</div>}
          {success && <div className="text-green-700 text-xs mb-2">{success}</div>}
          <div className="overflow-x-auto bg-white border rounded shadow text-sm">
            <table className="min-w-full">
              <thead>
                <tr className="bg-green-100">
                  <th className="p-2 text-left">Email</th>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Apellido</th>
                  <th className="p-2 text-left">Teléfono</th>
                  <th className="p-2 text-left">Rol</th>
                  <th className="p-2 text-left">Estado</th>
                  <th className="p-2 text-left">Fin Prueba</th>
                  <th className="p-2 text-left">Días Rest.</th>
                  <th className="p-2 text-left">Módulos</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-t">
                    <td className="p-2 align-top">{r.email}</td>
                    <td className="p-2 align-top">{r.nombre}</td>
                    <td className="p-2 align-top">{r.apellido}</td>
                    <td className="p-2 align-top">{r.telefono}</td>
                    <td className="p-2 align-top">{r.rol}</td>
                    <td className="p-2 align-top">
                      <span className={"px-2 py-0.5 rounded text-xs font-semibold " + (
                        r.estado === 'activo' ? 'bg-green-100 text-green-700' :
                        r.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-700' :
                        r.estado === 'suspendido' ? 'bg-orange-100 text-orange-700' :
                        r.estado === 'expirado' ? 'bg-red-100 text-red-700' :
                        r.estado === 'borrado' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-700'
                      )}>{r.estado}</span>
                    </td>
                    <td className="p-2 align-top text-xs">{r.fechaFin ? new Date(r.fechaFin).toLocaleDateString() : '-'}</td>
                    <td className="p-2 align-top text-center">{r.diasRestantes}</td>
                    <td className="p-2 align-top">{(r.modules || []).join(', ')}</td>
                    <td className="p-2 align-top whitespace-nowrap space-x-2">
                      {activatedByEmail[r.id] && (
                        <button className="text-blue-600 underline text-xs" onClick={() => handleEdit(activatedByEmail[r.id])}>Editar</button>
                      )}
                      {/* Acciones de estado sobre pre-registro */}
                      {r.estado !== 'borrado' && r.estado !== 'suspendido' && r.estado !== 'expirado' && (
                        <button className="text-orange-600 underline text-xs" onClick={() => updatePreUserEstado(r.id, 'suspendido')}>Suspender</button>
                      )}
                      {(r.estado === 'suspendido' || r.estado === 'borrado') && (
                        <button className="text-green-700 underline text-xs" onClick={() => updatePreUserEstado(r.id, 'pendiente')}>Reactivar</button>
                      )}
                      {r.estado !== 'borrado' && (
                        <button className="text-red-600 underline text-xs" onClick={() => updatePreUserEstado(r.id, 'borrado')}>Borrar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-3 text-xs text-gray-500" colSpan={10}>Todavía no hay pre-registros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-200">
            <h3 className="text-lg font-bold mb-2 text-green-700">Editar usuario</h3>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Nombre</label>
              <input name="nombre" value={editForm.nombre} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Apellido</label>
              <input name="apellido" value={editForm.apellido} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Teléfono</label>
              <input name="telefono" value={editForm.telefono} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" required />
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Rol</label>
              <select
                name="rol"
                value={editForm.rol}
                onChange={handleEditChange}
                className="border rounded p-2 w-full text-sm"
                disabled={userData.rol !== 'owner'}
                title={userData.rol !== 'owner' ? 'Solo el Dueño puede cambiar el rol' : ''}
              >
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Módulos habilitados</label>
              <select name="modules" multiple value={editForm.modules} onChange={handleEditModulesChange} className="border rounded p-2 w-full text-sm">
                <option value="basico">Básico</option>
                <option value="ventas">Ventas</option>
                <option value="reportes">Reportes</option>
                <option value="inventario">Inventario</option>
                <option value="compras">Compras</option>
              </select>
              <span className="text-xs text-gray-500">Ctrl+Click para seleccionar varios</span>
            </div>
            <div className="flex gap-2 mt-4 justify-end">
              <button type="button" className="px-3 py-1 rounded border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => { setEditUser(null); setEditForm(null); }}>Cancelar</button>
              <button type="submit" className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </form>
        </div>
      )}
      <div className="text-xs text-gray-500 mt-8">Solo visible para Dueño y Administradores.</div>
    </div>
  );
};

export default AdminPanel;
