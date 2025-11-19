import React, { useContext, useEffect, useState, useMemo } from 'react';
import { UserContext } from '../App';
import UserRegisterForm from './UserRegisterForm';
import { db } from '../firebase/firebaseConfig';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, getDoc, arrayUnion, getDocs, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore';

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
  const [actionModal, setActionModal] = useState(null); // { type: 'suspender'|'reactivar'|'borrar', emailId }
  const [noteText, setNoteText] = useState('');
  const [seatModal, setSeatModal] = useState(null); // { title, message }
  const [rubros, setRubros] = useState([]);
  const [paises, setPaises] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showCatalogModal, setShowCatalogModal] = useState(null); // { type: 'rubro'|'pais' }
  const [newCatalogName, setNewCatalogName] = useState('');
  const [creatingCatalog, setCreatingCatalog] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);

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

  // Cargar catálogos para edición (rubros y países)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [rSnap, pSnap] = await Promise.all([
          getDocs(query(collection(db, 'rubros'), orderBy('nombre'))).catch(() => null),
          getDocs(query(collection(db, 'paises'), orderBy('nombre'))).catch(() => null)
        ]);
        if (!mounted) return;
        setRubros(rSnap ? rSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
        setPaises(pSnap ? pSnap.docs.map(d => ({ id: d.id, ...d.data() })) : []);
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

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
    setError('');
    setSuccess('');
    const base = { ...user };
    // enriquecer con datos del pre-registro ya cargados
    try {
      if (user?.email) {
        const emailLower = String(user.email).toLowerCase();
        const pre = preUsers.find(p => p.id === emailLower);
        if (pre) {
          base.rubroId = pre.rubroId || '';
          base.paisId = pre.paisId || '';
          base.fechaFin = pre.fechaFin || '';
          if (pre.fechaFin) {
            const fin = new Date(pre.fechaFin);
            const dias = Math.ceil((fin.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            base.diasRestantes = dias < 0 ? 0 : dias;
          } else {
            base.diasRestantes = '';
          }
        }
      }
    } catch (_) { /* ignore */ }
    setEditForm(base);
  };

  const createCatalog = async () => {
    if (!showCatalogModal || !newCatalogName.trim()) return;
    const nombreNuevo = newCatalogName.trim();
    const lista = showCatalogModal.type === 'rubro' ? rubros : paises;
    if (lista.some(item => String(item.nombre || '').toLowerCase() === nombreNuevo.toLowerCase())) {
      setError(`Ya existe un ${showCatalogModal.type} con ese nombre.`);
      return;
    }
    setCreatingCatalog(true);
    try {
      const colName = showCatalogModal.type === 'rubro' ? 'rubros' : 'paises';
      const docRef = await addDoc(collection(db, colName), {
        nombre: nombreNuevo,
        activo: true,
        createdAt: serverTimestamp()
      });
      setNewCatalogName('');
      // refrescar
      const snap = await getDocs(query(collection(db, colName), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (showCatalogModal.type === 'rubro') {
        setRubros(arr);
        setEditForm(f => ({ ...f, rubroId: f.rubroId || docRef.id }));
      } else {
        setPaises(arr);
        setEditForm(f => ({ ...f, paisId: f.paisId || docRef.id }));
      }
      setShowCatalogModal(null);
    } catch (e) {
      setError(e.message || 'Error creando catálogo');
    } finally {
      setCreatingCatalog(false);
    }
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
      // actualizar rubro/pais y fechaFin en pre-registro
      if (editUser?.email) {
        const emailLower = String(editUser.email).toLowerCase();
        const preRef = doc(db, 'users_by_email', emailLower);
        const updates = {
          rubroId: editForm.rubroId || null,
          paisId: editForm.paisId || null,
          fechaModif: new Date().toISOString()
        };
        if (editForm.diasRestantes !== undefined && editForm.diasRestantes !== '' && !isNaN(Number(editForm.diasRestantes))) {
          const dias = Math.max(0, parseInt(editForm.diasRestantes, 10));
          updates.fechaFin = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
        }
        try { await updateDoc(preRef, updates); } catch (_) { /* ignore */ }
      }
      setSuccess('Usuario actualizado');
      setEditUser(null);
      setEditForm(null);
    } catch (err) {
      setError('Error al actualizar usuario');
    }
    setLoading(false);
  };

  // Verificar disponibilidad de seats
  const hasSeatAvailable = async () => {
    try {
      const licRef = doc(db, 'app_config', 'license');
      const licSnap = await getDoc(licRef);
      if (!licSnap.exists()) return true; // sin licencia => sin límite
      const lic = licSnap.data() || {};
      const maxUsers = Number(lic.maxUsers ?? 0);
      const seatsUsed = Number(lic.seatsUsed ?? 0);
      if (maxUsers <= 0) return true;
      return seatsUsed < maxUsers;
    } catch (_) {
      return true; // no bloquear por error
    }
  };

  // Abrir modal de acción para capturar nota
  const openAction = (type, row) => {
    setActionModal({ type, emailId: row.id, row });
    setNoteText('');
  };

  const applyAction = async () => {
    if (!actionModal) return;
    const { type, emailId, row } = actionModal;
    if (type === 'reactivar') {
      const ok = await hasSeatAvailable();
      if (!ok) {
        setSeatModal({
          title: 'Sin disponibilidad de licencias',
          message: 'No hay asientos disponibles para reactivar este usuario. Libere un asiento o amplíe la licencia.'
        });
        setActionModal(null);
        return;
      }
    }
    await updatePreUserEstado(emailId, type === 'suspender' ? 'suspendido' : type === 'borrar' ? 'borrado' : 'pendiente', type, row);
    setActionModal(null);
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
  const updatePreUserEstado = async (emailId, nuevoEstado, actionType = 'manual', row = null) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const ref = doc(db, 'users_by_email', emailId.toLowerCase());
      const notaItem = {
        ts: new Date().toISOString(),
        actor: userData?.email || 'sistema',
        accion: actionType,
        nota: noteText || (actionType === 'suspender' ? 'Suspensión manual' : actionType === 'borrar' ? 'Baja manual' : 'Reactivación manual')
      };
      const ahora = new Date().toISOString();
      const updates = {
        estado: nuevoEstado,
        fechaModif: ahora,
        ultimaNota: notaItem,
        notas: arrayUnion(notaItem)
      };
      if (['suspendido', 'borrado', 'expirado'].includes(nuevoEstado)) {
        updates.deactivatedAt = ahora;
      } else if (nuevoEstado === 'pendiente') {
        updates.deactivatedAt = null;
      }
      await updateDoc(ref, updates);
      // Si existe usuario activado, reflejar estado en su doc para feedback inmediato en la app
      const activated = activatedByEmail[emailId.toLowerCase()];
      if (activated && activated.id) {
        await updateDoc(doc(db, 'users', activated.id), { estado: (nuevoEstado === 'pendiente' || nuevoEstado === 'extendido') ? 'activo' : nuevoEstado });
      }
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
      // Priorizar estados restrictivos del pre-registro
      const estado = ['suspendido', 'borrado', 'expirado'].includes(estadoBase)
        ? estadoBase
        : (estadoBase === 'extendido' ? 'extendido' : (activated ? 'activo' : estadoBase));
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
        diasRestantes: computeDiasRestantes(p.fechaFin),
        trialExtensionUsed: Boolean(p.trialExtensionUsed),
        ultimaNota: p.ultimaNota || null
      };
    }).filter(r => showDeleted ? true : r.estado !== 'borrado');
  }, [preUsers, activatedByEmail, showDeleted]);

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
          <div className="flex items-center gap-4 mb-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
              <input type="checkbox" checked={showDeleted} onChange={e => setShowDeleted(e.target.checked)} />
              Mostrar borrados
            </label>
            <span className="text-[11px] text-gray-500">Total: {rows.length} {showDeleted ? '(incluye borrados)' : ''}</span>
          </div>
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
                  <th className="p-2 text-left">Extend.</th>
                  <th className="p-2 text-left">Últ. nota</th>
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
                        r.estado === 'extendido' ? 'bg-blue-100 text-blue-700' :
                        r.estado === 'suspendido' ? 'bg-orange-100 text-orange-700' :
                        r.estado === 'expirado' ? 'bg-red-100 text-red-700' :
                        r.estado === 'borrado' ? 'bg-gray-200 text-gray-600' : 'bg-gray-100 text-gray-700'
                      )}>{r.estado}</span>
                    </td>
                    <td className="p-2 align-top text-xs">{r.fechaFin ? new Date(r.fechaFin).toLocaleDateString() : '-'}</td>
                    <td className="p-2 align-top text-center">{r.diasRestantes}</td>
                    <td className="p-2 align-top">{r.trialExtensionUsed ? 'Sí' : 'No'}</td>
                    <td className="p-2 align-top max-w-[260px]">
                      {r.ultimaNota && (
                        <div className="text-xs text-gray-700 truncate" title={(r.ultimaNota.nota || '')}>
                          <span className="font-medium">{r.ultimaNota.accion || ''}</span>
                          {r.ultimaNota.ts ? ` · ${new Date(r.ultimaNota.ts).toLocaleDateString()}` : ''}
                          {r.ultimaNota.nota ? ` · ${r.ultimaNota.nota}` : ''}
                        </div>
                      )}
                      {!r.ultimaNota && <span className="text-xs text-gray-400">—</span>}
                    </td>
                    <td className="p-2 align-top">{(r.modules || []).join(', ')}</td>
                    <td className="p-2 align-top whitespace-nowrap space-x-2">
                      {activatedByEmail[r.id] && (
                        <button className="text-blue-600 underline text-xs" onClick={() => handleEdit(activatedByEmail[r.id])}>Editar</button>
                      )}
                      {/* Acciones de estado sobre pre-registro (con modal de nota) */}
                      {r.estado !== 'borrado' && r.estado !== 'suspendido' && r.estado !== 'expirado' && (
                        <button className="text-orange-600 underline text-xs" onClick={() => openAction('suspender', r)}>Suspender</button>
                      )}
                      {(r.estado === 'suspendido' || r.estado === 'borrado') && (
                        <button className="text-green-700 underline text-xs" onClick={() => openAction('reactivar', r)}>Reactivar</button>
                      )}
                      {r.estado !== 'borrado' && (
                        <button className="text-red-600 underline text-xs" onClick={() => openAction('borrar', r)}>Borrar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td className="p-3 text-xs text-gray-500" colSpan={12}>Todavía no hay pre-registros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Modal acción con nota */}
      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3 capitalize">{actionModal.type} usuario</h3>
            <p className="text-sm text-gray-600 mb-3">{actionModal.type === 'suspender' ? 'Indicá el motivo de la suspensión.' : actionModal.type === 'borrar' ? 'Indicá el motivo de la baja.' : 'Podés dejar una nota para la reactivación.'}</p>
            <textarea
              rows={3}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2 text-sm"
              placeholder="Nota (requerida para acciones manuales)"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button className="px-3 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50" onClick={() => setActionModal(null)}>Cancelar</button>
              <button className="px-3 py-2 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60" onClick={applyAction} disabled={loading || (actionModal.type !== 'reactivar' && !noteText.trim())}>
                {loading ? 'Aplicando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal seats */}
      {seatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-3">{seatModal.title}</h3>
            <p className="text-sm text-gray-700 mb-4">{seatModal.message}</p>
            <div className="flex justify-end">
              <button className="px-3 py-2 text-sm rounded bg-blue-600 text-white" onClick={() => setSeatModal(null)}>Entendido</button>
            </div>
          </div>
        </div>
      )}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <form onSubmit={handleEditSubmit} className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg border border-gray-200">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="mb-2">
                <label className="block text-xs font-semibold">Rubro</label>
                <select name="rubroId" value={editForm.rubroId || ''} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" disabled={catalogLoading}>
                  <option value="">{catalogLoading ? 'Cargando...' : 'Sin asignar'}</option>
                  {rubros.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre || r.id}</option>
                  ))}
                </select>
                <button type="button" className="mt-1 text-[11px] text-blue-600 underline" onClick={() => setShowCatalogModal({ type: 'rubro' })} disabled={catalogLoading || creatingCatalog}>Crear nuevo rubro</button>
              </div>
              <div className="mb-2">
                <label className="block text-xs font-semibold">País</label>
                <select name="paisId" value={editForm.paisId || ''} onChange={handleEditChange} className="border rounded p-2 w-full text-sm" disabled={catalogLoading}>
                  <option value="">{catalogLoading ? 'Cargando...' : 'Sin asignar'}</option>
                  {paises.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre || p.id}</option>
                  ))}
                </select>
                <button type="button" className="mt-1 text-[11px] text-blue-600 underline" onClick={() => setShowCatalogModal({ type: 'pais' })} disabled={catalogLoading || creatingCatalog}>Crear nuevo país</button>
              </div>
            </div>
            <div className="mb-2">
              <label className="block text-xs font-semibold">Días restantes de prueba</label>
              <input type="number" min="0" name="diasRestantes" value={editForm.diasRestantes ?? ''} onChange={handleEditChange} className="border rounded p-2 w-40 text-sm" />
              <span className="text-[10px] text-gray-500 ml-2">Al guardar, recalcula fecha de fin</span>
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
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Crear {showCatalogModal.type === 'rubro' ? 'Rubro' : 'País'}</h3>
            <div className="max-h-32 overflow-auto mb-3 border border-gray-200 rounded p-2 bg-gray-50 text-xs">
              {(showCatalogModal.type === 'rubro' ? rubros : paises).map(el => (
                <div key={el.id}>{el.nombre}</div>
              ))}
              {!(showCatalogModal.type === 'rubro' ? rubros : paises).length && <div className="italic text-gray-500">Sin elementos aún</div>}
            </div>
            <input
              type="text"
              value={newCatalogName}
              onChange={e => setNewCatalogName(e.target.value)}
              placeholder={`Nombre de ${showCatalogModal.type}`}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-4 text-sm"
              disabled={creatingCatalog}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowCatalogModal(null); setNewCatalogName(''); }} className="px-3 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50" disabled={creatingCatalog}>Cancelar</button>
              <button type="button" onClick={createCatalog} className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60" disabled={creatingCatalog || !newCatalogName.trim()}>{creatingCatalog ? 'Creando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
      <div className="text-xs text-gray-500 mt-8">Solo visible para Dueño y Administradores.</div>
    </div>
  );
};

export default AdminPanel;
