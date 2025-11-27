import React, { useState, useEffect } from 'react';
import { registerUser } from '../firebase/UserService';
import PropTypes from 'prop-types';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';
import RubrosManager from './Catalogs/RubrosManager';
import PaisesManager from './Catalogs/PaisesManager';
import RolesManager from './Catalogs/RolesManager';

const makeInitialForm = (defaultRole = 'usuario') => ({
  email: '', // parte local (antes del @)
  nombre: '',
  apellido: '',
  telefono: '',
  rol: defaultRole,
  modules: ['basico'],
  rubroId: '',
  paisId: ''
});

// Nota: mantenemos la prop isDios por compatibilidad, pero solo habilita elegir entre 'usuario' y 'admin'.
// El rol 'dios' ya no existe en la app; los dueños se gestionan por fuera (rol 'owner').
const UserRegisterForm = ({ onUserCreated, isDios = false, isAdmin = false, defaultRole = undefined, hideModules = false }) => {
  // Si defaultRole se pasa (ej: 'Test'), usarlo como valor inicial del rol
  const [form, setForm] = useState(() => makeInitialForm(defaultRole || (isDios ? 'usuario' : 'usuario')));
  const [domain, setDomain] = useState('@gmail.com');
  const [loading, setLoading] = useState(false); // loading submit
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [rubros, setRubros] = useState([]);
  const [paises, setPaises] = useState([]);
  const [roles, setRoles] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showRubroModal, setShowRubroModal] = useState(false);
  const [showPaisModal, setShowPaisModal] = useState(false);
  const [showRolesModal, setShowRolesModal] = useState(false);
  
  // Refrescar rubros luego de gestionar en el manager
  const refreshRubros = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'rubros'), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRubros(arr);
    } catch (_) { /* ignore */ }
  };

  // Refrescar países luego de gestionar en el manager
  const refreshPaises = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'paises'), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPaises(arr);
      if (!form.paisId) {
        const argentina = arr.find(p => String(p.nombre || '').toLowerCase() === 'argentina');
        if (argentina) setForm(f => ({ ...f, paisId: argentina.id }));
      }
    } catch (_) { /* ignore */ }
  };

  // Refrescar roles luego de gestionar en el manager
  const refreshRoles = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'roles'), orderBy('nombre')));
      const arrRaw = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const arr = arrRaw.filter(r => String(r.nombre || '').toLowerCase() !== 'owner');
      setRoles(arr);
      setForm(f => {
        if (arr.some(r => r.nombre === f.rol)) return f;
        const usuario = arr.find(r => String(r.nombre || '').toLowerCase() === 'usuario');
        return { ...f, rol: usuario ? usuario.nombre : f.rol };
      });
    } catch (_) { /* ignore */ }
  };

  // Carga de catálogos rubros, paises y roles
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rubrosQ = query(collection(db, 'rubros'), orderBy('nombre'));
        const paisesQ = query(collection(db, 'paises'), orderBy('nombre'));
        const rolesQ = query(collection(db, 'roles'), orderBy('nombre'));
        const [rubrosSnap, paisesSnap, rolesSnap] = await Promise.all([
          getDocs(rubrosQ).catch(() => null),
          getDocs(paisesQ).catch(() => null),
          getDocs(rolesQ).catch(() => null)
        ]);
        if (mounted) {
          const rubrosArr = rubrosSnap ? rubrosSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          const paisesArr = paisesSnap ? paisesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          const rolesArrRaw = rolesSnap ? rolesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
          const rolesArr = rolesArrRaw.filter(r => String(r.nombre || '').toLowerCase() !== 'owner');
          setRubros(rubrosArr);
          setPaises(paisesArr);
          setRoles(rolesArr);
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
          setRoles([]);
        }
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // (El alta/edición de catálogos se gestiona ahora con managers específicos)

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
        rol: defaultRole ? defaultRole : (isDios ? form.rol : 'usuario'),
        modules: form.modules.length ? form.modules : ['basico'],
        rubroId: form.rubroId || null,
        paisId: form.paisId || null
      });
      setSuccess('Usuario registrado correctamente');
      setForm(makeInitialForm(defaultRole || (isDios ? 'usuario' : 'usuario')));
      // Si se provee onUserCreated (pantalla de register), mostrar modal y no mensaje
      if (typeof onUserCreated === 'function') {
        onUserCreated();
        setSuccess(''); // Limpiar mensaje para que no se muestre el verde
      }
    } catch (err) {
      setError(err.message || 'Error al registrar usuario');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-4 rounded-lg shadow-md w-full">
      <h2 className="text-lg font-semibold mb-2">Registrar usuario</h2>
      <div className="space-y-3 w-full">
        {/* 1) Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Email (solo la parte antes del @)</label>
          <div className="mt-1 flex flex-col md:flex-row gap-2">
            <input
              name="email"
              type="text"
              value={form.email}
              onChange={handleChange}
              className="flex-1 border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              required
              disabled={loading}
            />
            <select
              value={domain}
              onChange={e => setDomain(e.target.value)}
              className="w-full md:w-40 border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-xs bg-white"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Apellido</label>
            <input
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Teléfono</label>
            <input
              name="telefono"
              value={form.telefono}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              disabled={loading}
            />
          </div>
        </div>

        {/* 3) Rol | Rubro | País */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isDios || isAdmin) && (
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <button
                  type="button"
                  onClick={() => setShowRolesModal(true)}
                  className="text-[11px] text-blue-700 underline"
                  disabled={loading}
                >Gestionar roles</button>
              </div>
              <select
                name="rol"
                value={form.rol}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
                disabled={loading || catalogLoading}
              >
                <option value="">{catalogLoading ? 'Cargando...' : 'Seleccioná rol'}</option>
                {roles
                  .filter(r => String(r.nombre || '').toLowerCase() !== 'owner')
                  .map(r => (
                    <option key={r.id} value={r.nombre}>{r.nombre}</option>
                  ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Rubro</label>
              {(isDios || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setShowRubroModal(true)}
                  className="text-[11px] text-green-700 underline"
                  disabled={catalogLoading || loading}
                >Gestionar rubros</button>
              )}
            </div>
            <select
              name="rubroId"
              value={form.rubroId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              disabled={loading || catalogLoading}
              required
            >
              <option value="">{catalogLoading ? 'Cargando...' : 'Seleccioná rubro'}</option>
              {rubros.map(r => (
                <option key={r.id} value={r.id}>{r.nombre || r.id}</option>
              ))}
            </select>
            {!catalogLoading && rubros.length === 0 && (
              <p className="mt-1 text-xs text-red-600">No hay rubros cargados.</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">País (opcional)</label>
              {(isDios || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setShowPaisModal(true)}
                  className="text-[11px] text-blue-700 underline"
                  disabled={catalogLoading || loading}
                >Gestionar países</button>
              )}
            </div>
            <select
              name="paisId"
              value={form.paisId}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
              disabled={loading || catalogLoading}
            >
              <option value="">{catalogLoading ? 'Cargando...' : 'Sin asignar'}</option>
              {paises.map(p => (
                <option key={p.id} value={p.id}>{p.nombre || p.id}</option>
              ))}
            </select>
            {!catalogLoading && paises.length === 0 && (
              <p className="mt-1 text-xs text-gray-600">No hay países cargados.</p>
            )}
          </div>
        </div>

        {/* 4) Módulos (ancho completo) */}
        {!hideModules && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Módulos habilitados</label>
            <select
              name="modules"
              multiple
              value={form.modules}
              onChange={handleModulesChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-xs"
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
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">{error}</div>
        )}
        {/* Solo mostrar mensaje de éxito si NO se provee onUserCreated (escritorio) */}
        {success && typeof onUserCreated !== 'function' && (
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
      {/* Modal gestión Rubros */}
      {showRubroModal && (
        <RubrosManager
          onClose={() => setShowRubroModal(false)}
          onChanged={refreshRubros}
        />
      )}

      {/* Modal gestión Países */}
      {showPaisModal && (
        <PaisesManager
          onClose={() => setShowPaisModal(false)}
          onChanged={refreshPaises}
        />
      )}
      {/* Modal gestión Roles */}
      {showRolesModal && (
        <RolesManager
          onClose={() => setShowRolesModal(false)}
          onChanged={refreshRoles}
        />
      )}
    </form>
  );
};

UserRegisterForm.propTypes = {
  onUserCreated: PropTypes.func,
  isDios: PropTypes.bool,
  isAdmin: PropTypes.bool,
  defaultRole: PropTypes.string,
  hideModules: PropTypes.bool
};

export default UserRegisterForm;
