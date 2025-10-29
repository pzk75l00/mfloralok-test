# Manual de Usuario — MundoFloral (v0.1)

Este documento describe el uso del sistema en sus dos experiencias: Escritorio (PC) y Móvil. Incluye acceso, navegación, tareas comunes (ventas, compras, inventario, reportes) y preguntas frecuentes. Actualizaremos este manual a medida que evolucionen las funcionalidades.

## 1. Acceso y autenticación

- Ingreso con Google: desde la pantalla de inicio, presione "Ingresar con Google" y seleccione su cuenta.
- Autorización de dispositivo (Escritorio): por seguridad, el primer equipo de escritorio queda registrado automáticamente. Si intenta ingresar desde otro equipo, verá una ventana que indica que el escritorio no está autorizado. Los dueños (owners) pueden ingresar desde cualquier equipo.
- Dueños/Owners: la lista de correos con permisos de dueño se gestiona de forma interna. Si su correo pertenece a este grupo, tendrá permisos ampliados (por ejemplo, gestionar autorizaciones).
- Móvil: en teléfonos/tablets el sistema no exige autorización de dispositivo, pero se aplican las mismas reglas de autenticación. Si su correo no está permitido para ingresar, verá un mensaje en pantalla (modal) indicando que no tiene acceso.
- Biometría: la sección de autenticación biométrica está deshabilitada por ahora. Se habilitará en futuras versiones.

Consejos:
- Si aparece un mensaje indicando que Google no está habilitado, contacte al administrador: puede haber una configuración de proyecto pendiente.
- Si ve el mensaje de "Escritorio no autorizado" y necesita acceso, contacte a un dueño del sistema.
- Si en móvil aparece un modal de "Acceso denegado" o "Usuario no permitido", contacte al administrador para que verifique la lista de correos permitidos.

## 2. Experiencias: Escritorio vs. Móvil

- Escritorio (PC/mac): experiencia completa, pensada para operación en mostrador y administración. Requiere autorización del equipo.
- Móvil (Android/iOS): experiencia simplificada y optimizada para pantalla táctil. Ideal para consulta rápida, carga móvil y tareas de piso.

Recomendaciones:
- Mantenga su navegador actualizado (Chrome o Edge preferidos).
- En móviles, usar el navegador del sistema o Chrome.

### 2.1 Capturas — Escritorio (PC)

Login (Escritorio):
![Login — Escritorio](./screenshots/desktop/login.png)

Panel/Inicio (Escritorio):
![Panel — Escritorio](./screenshots/desktop/panel.png)

Ventas — Formulario:
![Ventas — Formulario](./screenshots/desktop/ventas_form.png)

Compras — Formulario:
![Compras — Formulario](./screenshots/desktop/compras_form.png)

Inventario — Lista de productos:
![Inventario — Lista](./screenshots/desktop/inventario_lista.png)

Movimientos — Auditoría:
![Movimientos](./screenshots/desktop/movimientos.png)

Reportes — Resumen:
![Reportes — Resumen](./screenshots/desktop/reportes_resumen.png)

Administración — Autorización de equipos:
![Administración — Autorizaciones](./screenshots/desktop/admin_autorizaciones.png)

Mensaje — Escritorio no autorizado (modal):
![Modal — Escritorio no autorizado](./screenshots/desktop/modal_escritorio_no_autorizado.png)

### 2.2 Capturas — Móvil

Login (Móvil):
![Login — Móvil](./screenshots/movil/login.png)

Mensaje — Acceso denegado (Móvil):
![Modal — Acceso denegado](./screenshots/movil/modal_acceso_denegado.png)

Inicio/Principal (Móvil):
![Home — Móvil](./screenshots/movil/home.png)

Carga móvil — Flujo principal:
![Carga móvil](./screenshots/movil/carga_movil.png)

Inventario — Consulta rápida:
![Inventario — Móvil](./screenshots/movil/inventario_consulta.png)

## 3. Navegación general

- Menú principal: desde la barra de navegación accede a Ventas, Compras, Inventario, Reportes y Administración.
- Búsqueda de plantas/productos: disponible en formularios de ventas y compras, con autocompletado.
- Guardado automático: algunos formularios guardan o validan en tiempo real; respete los mensajes del sistema.

## 4. Ventas (Escritorio y Móvil)

- Nueva venta: desde "Ventas" abra el formulario, busque productos, defina cantidades y confirme.
- Métodos de pago: el sistema admite múltiples métodos; cuando corresponda, use pagos combinados siguiendo las instrucciones del formulario.
- Tickets/Comprobantes: consulte o exporte según disponibilidad actual.

Buenas prácticas:
- Verifique siempre stock disponible antes de confirmar.
- Evite duplicar cargas refrescando la página mientras se guarda.

## 5. Compras

- Nueva compra: desde "Compras" cargue productos adquiridos y costos asociados.
- Recepción y ajuste de stock: cada compra impacta el inventario; revise valores antes de confirmar.

## 6. Inventario

- Consulta de stock: acceda a "Inventario" para ver cantidades por producto.
- Ajustes: efectúe ajustes cuando sea necesario, registrando el motivo.
- Movimientos: la vista de movimientos permite auditar entradas y salidas.

## 7. Reportes

- Reportes disponibles: ventas por período, productos más vendidos, stock crítico, entre otros.
- Exportación: algunos reportes permiten exportar a CSV/Excel.

## 8. Administración (solo Escritorio)

- Usuarios: los dueños pueden gestionar permisos especiales.
- Autorización de equipos: si corresponde, autorice nuevos escritorios.
- Configuración: variables de aplicación (según disponibilidad).

## 9. Móvil — flujo recomendado

- Inicio de sesión con Google.
- Consulta rápida de stock y productos.
- Carga móvil: registre movimientos necesarios desde el piso de ventas.

## 10. Resolución de problemas (FAQ)

- No puedo iniciar sesión con Google:
  - Verifique su conexión a Internet.
  - Reintente en ventana de incógnito.
  - Si persiste, contacte al administrador (puede ser un problema de permisos o configuración del proyecto).
- Veo "Escritorio no autorizado":
  - Solicite autorización a un dueño.
  - Si usted es dueño, asegúrese de que su correo esté en la lista de owners.
- No veo la opción de biometría:
  - Está deshabilitada por el momento.

## 11. Glosario

- Owner/Dueño: usuario con permisos ampliados para gestionar la aplicación.
- Autorización del dispositivo: mecanismo que vincula equipos de escritorio específicos a la cuenta/tienda para mayor seguridad.
- Pagos combinados: registro de una venta con más de un método de pago.

## 12. Contacto y soporte

- En caso de incidentes o dudas, contacte a su administrador o escriba al correo de soporte interno.

Nota para soporte: la app cuenta con un panel de depuración opcional. Puede habilitarse agregando `?debug=1` a la URL para ver registros técnicos del inicio de sesión.

---

Changelog del manual:
- v0.2 (Octubre 2025): se documenta el modal de acceso denegado en móvil y el panel de depuración opcional.
- v0.1 (borrador inicial): estructura base y comportamientos actuales de login, autorización y experiencias.
  - Sección de capturas para escritorio y móvil con placeholders.
