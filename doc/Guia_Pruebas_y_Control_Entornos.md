# Guía de Pruebas, Control de Entornos y Git

Esta guía resume cómo preparar entornos de prueba por cliente, controlar la expiración de acceso, desplegar en Vercel y manejar Git en Windows PowerShell sin modificar tu proyecto actual.

## Objetivo
- Entregar a cada cliente un entorno de prueba aislado con fecha de caducidad configurable.
- Centralizar el control (activar/desactivar, solo lectura) sin tener que redeployar.
- Mantener el proyecto actual estable y crear un “portal de control” separado cuando sea necesario.

---

## Arquitectura recomendada

1) Portal de Control (nuevo proyecto separado):
- Web simple (React/Next.js) para:
  - Listar clientes de prueba y sus URLs.
  - Definir fecha de expiración por cliente.
  - Cambiar estado: activo / expirado / solo lectura.
- Persiste la configuración en Firestore (o DB equivalente).

2) App de prueba por cliente (tu app actual):
- Mismo código base, configurada con variables de entorno de Vercel y un Firebase por cliente.
- Al iniciar, la app lee un documento de configuración (clienteId) en Firestore con la fecha de expiración y estado.
- Si expiró: muestra aviso y bloquea acciones de escritura (solo lectura).

3) Despliegues independientes por cliente:
- Un proyecto de Vercel por cliente (o un proyecto con múltiples despliegues configurados por env vars).
- Un proyecto de Firebase (Firestore/Storage/Auth) por cliente.

---

## Modelo de datos sugerido (Firestore)
Colección: `app_control`
Documento por cliente: `CLIENTE_ID`

Ejemplo de documento:
```json
{
  "clienteId": "cliente_acme",
  "expiresAt": { "_seconds": 1767225600, "_nanoseconds": 0 },
  "status": "active",
  "message": "Ambiente de prueba válido hasta 01/01/2026"
}
```

Consultas típicas:
- Leer al inicio de la app: `app_control/CLIENTE_ID`.
- Si `now > expiresAt`: tratar como `expired`.
- Si `status === 'read-only'`: bloquear mutaciones.

### Reglas Firestore (boceto)
Ajusta a tus colecciones reales y roles. Idea general:
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /app_control/{clienteId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }

    match /movimientos/{docId} {
      allow read: if true;
      allow create, update, delete: if request.auth != null; // Ajustar según tu lógica
    }
  }
}
```

Nota: Para hacer cumplir “solo lectura” a nivel backend sin reglas complejas, considera:
- Hacer todas las escrituras vía Cloud Functions HTTPS, y que la Function consulte `app_control` antes de escribir.
- O agregar un campo/claim de rol para admins y negar a usuarios no-admin cuando el estado sea `read-only`/`expired`.

---

## Patrón en la App para “solo lectura / expirado”
Ejemplo conceptual en React (referencia):
```jsx
// Pseudocódigo
const [control, setControl] = useState({ status: 'active', expiresAt: null, message: '' });
const [now, setNow] = useState(Date.now());

useEffect(() => {
  // Carga control desde Firestore: doc(`app_control/${CLIENTE_ID}`)
  // setControl({ status, expiresAt, message })
}, []);

const isExpired = control.expiresAt && now > control.expiresAt;
const isReadOnly = control.status === 'read-only' || isExpired;

function guardWrite(action) {
  if (isReadOnly) {
    alert(control.message || 'Ambiente de prueba en modo solo lectura o expirado.');
    return;
  }
  action();
}

// En botones de crear/editar/borrar
<Button onClick={() => guardWrite(() => crearMovimiento(datos))}>Guardar</Button>
```

Centraliza TODAS las operaciones de escritura en una capa (por ejemplo `src/utils/productManagement.js`) y aplica ahí el guard.

---

## Flujo para crear un entorno de prueba nuevo por cliente
1) Crear proyecto Firebase (Firestore/Auth/Storage) del cliente.
2) Configurar variables de entorno en Vercel para ese cliente (ver sección Vercel).
3) Crear documento `app_control/CLIENTE_ID` con `expiresAt`, `status` y `message`.
4) Desplegar la app en Vercel y verificar que lee el control.
5) Compartir URL con el cliente.
6) Cuando finaliza la prueba, cambiar `status` a `expired` o ajustar `expiresAt`.

---

## Vercel: despliegue y variables de entorno
Comandos básicos en PowerShell:
```powershell
vercel link
vercel --prod
vercel ls
vercel remove https://TU-DEPLOY.vercel.app
```

Variables de entorno por cliente (ejemplos):
- `REACT_APP_CLIENTE_ID`
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

En Vercel: Project → Settings → Environment Variables (Production/Preview/Development). Luego redeploy.

---

## Git: flujo y comandos útiles (Windows PowerShell)

### Clonar repositorio
```powershell
# HTTPS
git clone https://github.com/ORGANIZACION/mfloralok_Dev.git C:\Proyectos\Sistema\TEST\mfloralok_Dev

# SSH
git clone git@github.com:ORGANIZACION/mfloralok_Dev.git C:\Proyectos\Sistema\TEST\mfloralok_Dev

# Rama específica
git clone --branch develop --single-branch https://github.com/ORGANIZACION/mfloralok_Dev.git C:\Proyectos\Sistema\TEST\mfloralok_Dev

# Clon ligero
git clone --depth 1 https://github.com/ORGANIZACION/mfloralok_Dev.git C:\Proyectos\Sistema\TEST\mfloralok_Dev
```

### Ramas por cliente
```powershell
cd C:\Proyectos\Sistema\TEST\mfloralok_Dev

git checkout -b client/cliente-acme
# cambios…

git add .
git commit -m "Setup entorno prueba cliente ACME"
git push -u origin client/cliente-acme
```

### Sincronizar con main
```powershell
git checkout main
git pull origin main
git checkout client/cliente-acme
git merge --no-ff main
git push
```

### Remotos y forks
```powershell
git remote -v
git remote add cliente git@github.com:CLIENTE/mfloralok_Dev.git
git push -u cliente client/cliente-acme
```

---

## Checklist rápido para un nuevo cliente de prueba
- [ ] Crear proyecto Firebase del cliente y obtener credenciales.
- [ ] Configurar variables de entorno en Vercel.
- [ ] Crear `app_control/CLIENTE_ID` con `expiresAt`, `status`, `message`.
- [ ] Verificar que la app aplica `active` / `read-only` / `expired`.
- [ ] Desplegar (`vercel --prod`) y compartir URL.
- [ ] Programar revisión/caducidad.

---

## Troubleshooting
- Variables de entorno no aplican: requiere redeploy.
- Scope de Vercel incorrecto: revisa `vercel link` y cuenta/organización.
- Permisos Firestore: ajusta reglas o usa Cloud Functions para escrituras.
- Múltiples Firebase por cliente: confirmar `REACT_APP_FIREBASE_PROJECT_ID` y `firebaseConfig` por env vars.

---

## Abrir proyecto en nueva ventana (VS Code)
```powershell
code -n C:\Proyectos\Sistema\TEST\mfloralok_Dev
```
