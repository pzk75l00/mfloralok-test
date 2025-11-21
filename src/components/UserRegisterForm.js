import React, { useState, useEffect } from 'react';
import { registerUser } from '../firebase/UserService';
import PropTypes from 'prop-types';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import RubrosManager from './Catalogs/RubrosManager';
import PaisesManager from './Catalogs/PaisesManager';
import RolesManager from './Catalogs/RolesManager';

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
  const [roles, setRoles] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [showRubroModal, setShowRubroModal] = useState(false);
  const [showPaisModal, setShowPaisModal] = useState(false);
  const [showRolModal, setShowRolModal] = useState(false);

  // Carga de catálogos rubros y paises
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
          const rolesArr = rolesSnap ? rolesSnap.docs.map(d => ({ id: d.id, ...d.data() })) : [];
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
        }
      } finally {
        if (mounted) setCatalogLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Helpers para recargar catálogos luego de gestionar rubros / países
  const refreshRubros = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'rubros'), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRubros(arr);
    } catch (_) { /* ignore */ }
  };

  const refreshPaises = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'paises'), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setPaises(arr);
      // Si Argentina existe y no hay país elegido, sugerirla
      setForm(f => {
        if (f.paisId) return f;
        const argentina = arr.find(p => String(p.nombre || '').toLowerCase() === 'argentina');
        return { ...f, paisId: argentina ? argentina.id : '' };
      });
    } catch (_) { /* ignore */ }
  };

  const refreshRoles = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'roles'), orderBy('nombre')));
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRoles(arr);
    } catch (_) { /* ignore */ }
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
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md border border-gray-100">
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Registrar usuario</h2>
          <p className="mt-0.5 text-[11px] text-gray-500">Pre-registro para acceso a MundoFloral</p>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-4xl">
        {/* Datos de acceso */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Datos de acceso</p>
          <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
            <label className="block text-xs font-medium text-gray-700">Email (solo la parte antes del @)</label>
            <div className="mt-1 flex gap-2">
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
                className="w-40 border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-xs bg-white"
                disabled={loading}
              >
                <option value="@gmail.com">@gmail.com</option>
                <option value="@gmail.com.ar">@gmail.com.ar</option>
              </select>
            </div>
            <p className="mt-1 text-[11px] text-gray-500 leading-snug">
              Ejemplo: si escribís <span className="font-mono">usuario</span> y elegís <span className="font-mono">@gmail.com</span>,
              se registrará como <span className="font-mono">usuario@gmail.com</span>.
            </p>
          </div>
        </div>

        {/* Fila 2: Nombre | Apellido | Teléfono */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Datos personales</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700">Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Apellido</label>
              <input
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700">Teléfono</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Fila 3: Rol | Rubro | País */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Rol y contexto de negocio</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            {isDios && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-gray-700">Rol</label>
                  <button
                    type="button"
                    onClick={() => setShowRolModal(true)}
                    className="text-[11px] text-green-700 underline"
                    disabled={catalogLoading || loading}
                  >Gestionar roles</button>
                </div>
                <select
                  name="rol"
                  value={form.rol}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm px-2 py-1.5 text-sm"
                  disabled={loading || catalogLoading}
                >
                  {roles.length === 0 && <option value="usuario">Usuario</option>}
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre || r.id}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">Rubro</label>
                <button
                  type="button"
                  onClick={() => setShowRubroModal(true)}
                  className="text-[11px] text-green-700 underline"
                  disabled={catalogLoading || loading}
                >Gestionar rubros</button>
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
              <div className="mt-1">
                {!catalogLoading && rubros.length === 0 && (
                  <p className="text-xs text-red-600">No hay rubros cargados.</p>
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">País (opcional)</label>
                <button
                  type="button"
                  onClick={() => setShowPaisModal(true)}
                  className="text-[11px] text-green-700 underline"
                  disabled={catalogLoading || loading}
                >Gestionar países</button>
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
              <div className="mt-1">
                {!catalogLoading && paises.length === 0 && (
                  <p className="text-xs text-gray-600">No hay países cargados.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Fila 4: Módulos (ancho completo) */}
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5">Módulos habilitados</p>
          <div>
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
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-xs">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs">{success}</div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-3 py-1.5 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Registrando...' : 'Registrar usuario'}
          </button>
        </div>
      </div>
      {/* Modal gestión rubros */}
      {showRubroModal && (
        <RubrosManager
          onClose={() => setShowRubroModal(false)}
          onChanged={async () => {
            // refrescar rubros al cerrar el gestor
            try {
              const rubrosSnap = await getDocs(query(collection(db, 'rubros'), orderBy('nombre')));
              const rubrosArr = rubrosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
              setRubros(rubrosArr);
            } catch (_) { /* ignore */ }
          }}
        />
      )}

      {/* Modal gestión roles */}
      {showRolModal && (
        <RolesManager
          onClose={() => setShowRolModal(false)}
          onChanged={async () => {
            await refreshRoles();
          }}
        />
      )}

      {/* Modal gestión países */}
      {showPaisModal && (
        <PaisesManager
          onClose={() => setShowPaisModal(false)}
          onChanged={async () => {
            await refreshPaises();
          }}
        />
      )}
    </form>
  );
};

UserRegisterForm.propTypes = {
  onUserCreated: PropTypes.func,
  isDios: PropTypes.bool
};

export default UserRegisterForm;
