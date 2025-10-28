# Guía Rápida — Login y Fachada (Facade)

Esta guía resume cómo ingresar al sistema (Google) y cómo funciona la autorización de equipos de escritorio, junto con una vista técnica de la fachada (facade) utilizada en la app.

## 1) Ingreso con Google

- Desde la pantalla de inicio, presione "Ingresar con Google".
- Seleccione su cuenta. Si es la primera vez, deberá aceptar los permisos.
- Si su correo pertenece al grupo de dueños (owners), tendrá permisos ampliados.

Problemas comunes:
- "Google no está habilitado": el proyecto aún no tiene activado Google como proveedor. Contacte al administrador.
- Error de cliente OAuth: suele resolverse regenerando el cliente Web y asociándolo en Firebase Auth → Google.

## 2) Autorización de equipos (solo Escritorio)

- Política de alta inicial: el primer escritorio del Administrador (designado por los Creadores) queda autorizado automáticamente en su primer login, siempre que el correo coincida con el Administrador registrado.
- Resto de escritorios: quedarán bloqueados y verán una ventana modal indicando "Escritorio no autorizado" hasta ser autorizados explícitamente según la política definida (por el Administrador o por Creadores).
- Creadores/Owners: acceso técnico total (bypass) para tareas internas; esta capacidad NO es un entregable del cliente ni configurable por futuros “editores”.

Dónde se guarda:
- Se asigna un identificador de dispositivo en el navegador (almacenamiento local) y se registra en Firestore.

Qué hacer si estoy bloqueado:
- Solicite autorización a un dueño del sistema.
- Si usted es dueño y no aparece como tal, confirme que su correo está en `app_config/admins`.

## 3) Dueños (Owners)

- Creadores/Owners (nosotros): rol "modo Dios" para gobernanza del producto. Definen quién es el Administrador de cada cliente/instancia.
- Administrador (cliente): es designado por los Creadores. Puede usar/configurar/editar todo lo operativo EXCEPTO gestionar otros Administradores. Es responsable de dar de alta usuarios finales hasta el límite de licencias contratado.
- Usuarios (operación): creados por el Administrador dentro del cupo de asientos/licencias.
- Lista técnica de owners: Firestore `app_config/admins` con estructura `{ emails: { "owner@mail.com": true } }`. Lectura: autenticados; escritura: solo owners (ver `firestore.rules`). Esta lista no es editable por clientes.

## 4) Biometría (estado actual)

- La autenticación biométrica está deshabilitada por ahora.
- Se activará mediante un flag cuando el flujo esté finalizado.

## 5) Fachada (Facade) — visión técnica breve

Objetivo técnico: desacoplar pantallas de los servicios internos (Auth, Firestore, lógica), NO "facilitar el acceso" para usuarios especiales. La fachada no otorga permisos ni abre configuraciones; solo organiza el código y aplica reglas existentes.

Gobernanza y configuración (criterio actual):
- Creadores/Owners: son los administradores del sistema (nivel producto). La configuración sensible de usuarios/permisos NO es editable por clientes finales ni por futuros "editores". Por ahora, estas configuraciones no son públicas ni autogestionables desde UI.
- Clientes (tiendas/instancias): tendrán una configuración propia y acotada en el futuro, separada de la de creadores. Esa capa será otra fachada distinta y con permisos limitados.

Separación propuesta de fachadas de configuración:
- Fachada de Configuración de Creadores (owners): operaciones de alto impacto (p. ej., lista de owners, reglas de autorización, licencias). Acceso restringido y validado en backend.
- Fachada de Configuración de Cliente (instancia): parámetros operativos no sensibles (p. ej., preferencias de interfaz), sin acceso a gestión de usuarios de alto nivel.

Componentes relacionados (referencia actual):
- `src/auth/AuthProvider.js`: orquesta sesión, seats y dispositivo.
- `src/auth/authService.js`: funciones para login, owners, reservas y dispositivo.
- `src/utils/deviceId.js`: gestión de id de dispositivo y datos del equipo.
- `src/firebase/firebaseConfig.js`: inicialización de Firebase/Firestore.

Contratos sugeridos (interface de fachada operativa):
- `signInWithGoogle(): Promise<User>`
- `isOwnerEmail(email): Promise<boolean>`
- `registerDeviceIfNeeded(user, deviceInfo): Promise<{ allowed: boolean }>`
- `reserveSeatIfNeeded(user): Promise<void>`

Notas de seguridad:
- La fachada no debe exponer endpoints que permitan a clientes modificar owners ni configuración crítica.
- Toda operación "de creador" debe pasar por validación estricta y/o backend (Cloud Functions) y no estar disponible para ediciones de clientes.

Buenas prácticas:
- Las pantallas llaman solo a la fachada; la fachada habla con Firebase/Firestore.
- Manejar errores y mensajes de usuario en la fachada con códigos claros.

## 6) Troubleshooting

- No se puede leer `app_config/admins`:
  - Ver reglas en `firestore.rules` (lectura para autenticados; escritura solo owners).
- Veo "Escritorio no autorizado" aun siendo dueño:
  - Verifique que su correo esté en `app_config/admins` (lowercase) y que la app pueda leerlo.
- El login funciona en producción pero no en local:
  - Revise `.env` (REACT_APP_FIREBASE_*), dominios autorizados y el cliente OAuth.

## 7) Próximos pasos (documentación)

- Agregar capturas a `doc/screenshots/desktop` y `doc/screenshots/movil`.
- Ampliar el manual de usuario con el flujo completo de login y autorización.
- Documentar decisiones de fachada en `doc/dev/Fachada_Arquitectura.md`.
