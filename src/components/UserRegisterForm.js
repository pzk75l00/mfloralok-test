import React, { useState, useEffect } from 'react';
import { registerUser } from '../firebase/UserService';
import PropTypes from 'prop-types';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const initialForm = {
  email: '', // parte local (antes del @)
  nombre: '',
  apellido: '',
  telefono: '',
  rol: 'usuario',
  modules: ['basico'],
  rubroId: '',
  paisId: ''
};

// Nota: mantenemos la prop isDios por compatibilidad, pero solo habilita elegir entre 'usuario' y 'admin'.
// El rol 'dios' ya no existe en la app; los dueños se gestionan por fuera (rol 'owner').
const UserRegisterForm = ({ onUserCreated, isDios = false }) => {
  const [form, setForm] = useState(initialForm);
  const [domain, setDomain] = useState('@gmail.com');
  const [loading, setLoading] = useState(false); // loading submit
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rubros, setRubros] = useState([]);
  const [paises, setPaises] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showRubroModal, setShowRubroModal] = useState(false);
  const [showPaisModal, setShowPaisModal] = useState(false);
  const [newCatalogName, setNewCatalogName] = useState('');
  const [creatingCatalog, setCreatingCatalog] = useState(false);

  // Carga de catálogos rubros y paises
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rubrosQ = query(collection(db, 'rubros'), orderBy('nombre'));
        const paisesQ = query(collection(db, 'paises'), orderBy('nombre'));
        const [rubrosSnap, paisesSnap] = await Promise.all([
          getDocs(rubrosQ).catch(() => null),
          getDocs(paisesQ).catch(() => null)
        ]);
        if (mounted) {
          const rubrosArr = rubrosSnap ? rubrosSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          const paisesArr = paisesSnap ? paisesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          setRubros(rubrosArr);
          setPaises(paisesArr);
          // Autoseleccionar Argentina si existe y aún no hay país elegido
          if (!form.paisId) {
            const argentina = paisesArr.find(p => String(p.nombre || '').toLowerCase() === 'argentina');
            if (argentina) {
              setForm(f => ({ ...f, paisId: argentina.id }));
            }
          }
        }
      } catch (_) {
        if (mounted) {
          setRubros([]);
          setPaises([]);
        }
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Crear entrada en catálogos (rubro/pais)
  const handleCreateCatalog = async (type) => {
    const nombreNuevo = newCatalogName.trim();
    if (!nombreNuevo) return;
    // Validar duplicado (case-insensitive)
    const lista = type === 'rubro' ? rubros : paises;
    if (lista.some(item => String(item.nombre || '').toLowerCase() === nombreNuevo.toLowerCase())) {
      setError(`Ya existe un ${type} con ese nombre.`);
      return;
    }
    setCreatingCatalog(true);
    try {
      const colName = type === 'rubro' ? 'rubros' : 'paises';
      const docRef = await addDoc(collection(db, colName), {
        nombre: nombreNuevo,
        activo: true,
        createdAt: serverTimestamp()
      });
      setNewCatalogName('');
      if (type === 'rubro') {
        setShowRubroModal(false);
        // refrescar rubros
        const snap = await getDocs(query(collection(db, 'rubros'), orderBy('nombre')));
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRubros(arr);
        // Asignar el que se creó si campo vacío
        setForm(f => ({ ...f, rubroId: f.rubroId || docRef.id }));
      } else {
        setShowPaisModal(false);
        const snap = await getDocs(query(collection(db, 'paises'), orderBy('nombre')));
        const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setPaises(arr);
        // Si Argentina fue creada y no hay país asignado, asignar
        const argentina = arr.find(p => String(p.nombre || '').toLowerCase() === 'argentina');
        setForm(f => ({ ...f, paisId: f.paisId || (argentina ? argentina.id : docRef.id) }));
      }
    } catch (e) {
      setError(e.message || 'Error creando catálogo');
    } finally {
      setCreatingCatalog(false);
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleModulesChange = e => {
    const { options } = e.target;
    const selected = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(options[i].value);
    }
    setForm(f => ({ ...f, modules: selected }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    const localPart = (form.email || '').trim().toLowerCase();
    if (!localPart) {
      setError('Debés ingresar el nombre de la cuenta (parte antes del @).');
      setLoading(false);
      return;
    }
    const email = `${localPart}${domain}`.toLowerCase();
    // Verificar duplicado de email (pre-registro existente)
    try {
      const preRef = doc(db, 'users_by_email', email);
      const preSnap = await getDoc(preRef);
      if (preSnap.exists()) {
        setError('El email ya está pre-registrado.');
        setLoading(false);
        return;
      }
    } catch (_) { /* ignorar error de consulta */ }
    const allowedDomains = ['@gmail.com', '@gmail.com.ar'];
    if (!allowedDomains.includes(domain)) {
      setError('Dominio de correo no permitido.');
      setLoading(false);
      return;
    }
    // Validar rubro (requerido), país opcional
    if (!form.rubroId) {
      setError('Debés seleccionar un rubro.');
      setLoading(false);
      return;
    }
    try {
      await registerUser({
        ...form,
        email,
        rol: isDios ? form.rol : 'usuario',
        modules: form.modules.length ? form.modules : ['basico'],
        rubroId: form.rubroId || null,
        paisId: form.paisId || null
      });
      setSuccess('Usuario registrado correctamente');
      setForm(initialForm);
      if (onUserCreated) onUserCreated();
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-5 rounded-lg shadow-md w-full">
      <h2 className="text-lg font-semibold mb-3">Registrar usuario</h2>
      <div className="space-y-4 w-full">
        {/* 1) Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email (solo la parte antes del @)</label>
          <div className="mt-1 flex flex-col md:flex-row gap-2">
            <input
              name="email"
              type="text"
              value={form.email}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              required
              disabled={loading}
            />
            <select
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="w-full md:w-40 border border-gray-300 rounded-md shadow-sm p-2 text-xs bg-white"
              disabled={loading}
            >
              <option value="@gmail.com">@gmail.com</option>
              <option value="@gmail.com.ar">@gmail.com.ar</option>
            </select>
          </div>
          <p className="mt-1 text-[11px] text-gray-500 leading-snug">
            Ejemplo: si escribís <span className="font-mono">usuario</span> y elegís <span className="font-mono">@gmail.com</span>,
            se registrará como <span className="font-mono">usuario@gmail.com</span>. Debe ser el mismo correo de Google que usará para ingresar.
          </p>
        </div>

        {/* 2) Nombre | Apellido | Teléfono */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Nombre</label>
            <input
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Apellido</label>
            <input
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              disabled={loading}
            />
          </div>
        </div>

        {/* 3) Rol | Rubro | País */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {isDios && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Rol</label>
              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
                disabled={loading}
              >
                <option value="usuario">Usuario</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Rubro</label>
            <select
              name="rubroId"
              value={form.rubroId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              disabled={loading || catalogLoading}
              required
            >
              <option value="">{catalogLoading ? 'Cargando...' : 'Seleccioná rubro'}</option>
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{r.nombre || r.id}</option>
              ))}
            </select>
            <div className="mt-1 flex items-center gap-3">
              {!catalogLoading && rubros.length === 0 && (
                <p className="text-xs text-red-600">No hay rubros cargados.</p>
              )}
              <button
                type="button"
                onClick={() => setShowRubroModal(true)}
                className="text-[11px] text-blue-600 underline"
                disabled={catalogLoading || loading}
              >Crear nuevo</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">País (opcional)</label>
            <select
              name="paisId"
              value={form.paisId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              disabled={loading || catalogLoading}
            >
              <option value="">{catalogLoading ? 'Cargando...' : 'Sin asignar'}</option>
              {paises.map(p => (
                <option key={p.id} value={p.id}>{p.nombre || p.id}</option>
              ))}
            </select>
            <div className="mt-1 flex items-center gap-3">
              {!catalogLoading && paises.length === 0 && (
                <p className="text-xs text-gray-600">No hay países cargados.</p>
              )}
              <button
                type="button"
                onClick={() => setShowPaisModal(true)}
                className="text-[11px] text-blue-600 underline"
                disabled={catalogLoading || loading}
              >Crear nuevo</button>
            </div>
          </div>
        </div>

        {/* 4) Módulos (ancho completo) */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Módulos habilitados</label>
          <select
            name="modules"
            multiple
            value={form.modules}
            onChange={handleModulesChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-xs"
            disabled={loading}
          >
            <option value="basico">Básico</option>
            <option value="ventas">Ventas</option>
            <option value="reportes">Reportes</option>
            <option value="inventario">Inventario</option>
            <option value="compras">Compras</option>
          </select>
          <span className="text-[10px] text-gray-500">Ctrl+Click para seleccionar varios</span>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded text-sm">{success}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar'}
          </button>
        </div>
      </div>
      {/* Modal creación catálogo */}
      {(showRubroModal || showPaisModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold mb-4">Crear {showRubroModal ? 'Rubro' : 'País'}</h3>
            <div className="max-h-32 overflow-auto mb-3 border border-gray-200 rounded p-2 bg-gray-50 text-xs">
              {(showRubroModal ? rubros : paises).map(el => (
                <div key={el.id}>{el.nombre}</div>
              ))}
              {!(showRubroModal ? rubros : paises).length && <div className="italic text-gray-500">Sin elementos aún</div>}
            </div>
            <input
              type="text"
              value={newCatalogName}
              onChange={e => setNewCatalogName(e.target.value)}
              placeholder={`Nombre de ${showRubroModal ? 'rubro' : 'país'}`}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-4"
              disabled={creatingCatalog}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowRubroModal(false); setShowPaisModal(false); setNewCatalogName(''); }}
                className="px-3 py-2 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50"
                disabled={creatingCatalog}
              >Cancelar</button>
              <button
                type="button"
                onClick={() => handleCreateCatalog(showRubroModal ? 'rubro' : 'pais')}
                className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={creatingCatalog || !newCatalogName.trim()}
              >{creatingCatalog ? 'Creando...' : 'Crear'}</button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

UserRegisterForm.propTypes = {
  onUserCreated: PropTypes.func,
  isDios: PropTypes.bool
};

export default UserRegisterForm;
