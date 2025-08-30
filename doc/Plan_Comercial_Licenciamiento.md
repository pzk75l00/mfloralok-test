# Plan comercial: Licencia de por vida + Prueba 15 días + Usuarios por correo (seats)

Objetivo
- Vender el sistema con pago único (de por vida), habilitar prueba de 15 días y permitir ampliar usuarios por pago de packs.
- Mantener bajo costo operativo usando multi‑tenant; ofrecer self‑host opcional.

Modelo de licencia
- Prueba (trial): 15 días desde el alta del cliente.
  - Al vencer: bloquear escritura (o modo solo lectura) salvo administrador.
  - Mostrar botón “Activar licencia”.
- De por vida (lifetime): sin fecha de vencimiento una vez activado.
- Usuarios (seats): límite por tenant. Invitar correos hasta completar cupo.
  - Packs de usuarios adicionales con pago único (+1, +5, etc.).
- Extras opcionales:
  - Soporte/actualizaciones anuales (20% del plan como referencia).
  - Capacitación inicial.

Precios sugeridos (USD, cobrar en ARS al tipo del día)
- Vida Starter (hasta 2 usuarios): 399
- Vida PyME (hasta 5 usuarios): 799
- Vida Negocio (hasta 15 usuarios): 1.999
- Usuario adicional (one‑time): 69 c/u
- Implantación:
  - Multi‑tenant (tu hosting): 0–99 (según onboarding)
  - Self‑host (Firebase + Vercel del cliente): 300–600

Provisioning (multi‑tenant)
- Alta de cliente (tenant): nombre, rubro, email(s). Elegir un administrador.
- Crear tenants/{tenantId} con: { license: 'trial', trialEnd: now+15d, seats, adminEmail, createdAt }.
- Members: tenants/{tenantId}/members/{uid} con { email, role }.
- Autenticación: asignar custom claims { tenantId, role } a usuarios.

Seguridad y aislamiento
- Cada documento (movements, plants, etc.) incluye tenantId.
- Reglas Firestore: permitir acceso si request.auth.token.tenantId == resource.data.tenantId.
- Trial vencido: denegar escritura (o todo salvo admin) si now > trialEnd y license != 'lifetime'.
- Límite de seats: al invitar, validar members.count < seats (UI + backend/Function).

UI/UX
- Gate inicial: si trial vencido → pantalla “Activar licencia” con links de pago.
- Gestión de usuarios: mostrar usados/total y deshabilitar “Invitar” si se alcanzó el límite.
- Panel de licencia: estado (trial/lifetime), días restantes, seats, acciones para activar o comprar usuarios.

Pagos y activación
- Integración simple con MercadoPago o Stripe (pago único):
  - Conceptos: “Activación licencia” y “Pack +N usuarios”.
  - Webhook (Cloud Function):
    - Si activación → tenants/{tenantId}.license = 'lifetime'.
    - Si pack usuarios → tenants/{tenantId}.seats += N.
- Alternativa temporal: activación manual con código.

Terminología por rubro (fachada)
- Wizard al primer login del admin para elegir rubro y adaptar nombres de UI (producto/artículo/material, costo/precio, etc.).
- Guardar en settings del tenant; Provider de terminología para t('clave') en UI.

Self‑host (opcional)
- Desplegar en proyectos Firebase/Vercel del cliente (sin costo de tu hosting):
  - Asistente para conectar cuentas, setear env vars y desplegar.
  - Cobrar fee de implantación + licencia + packs.

Roadmap mínimo de implementación
1) Campos y filtros por tenantId en documentos y consultas.
2) Firestore Rules multi‑tenant + chequeos de trial y seats.
3) Gate de licencia en UI + pantalla de activación.
4) Gestión de usuarios con conteo de seats.
5) Pagos: endpoint webhook para activar licencia / sumar seats.
6) Wizard de terminología (presets por rubro) y Provider.

Notas y riesgos
- Mantener bajo costo: multi‑tenant es más simple. Self‑host solo si el cliente lo exige.
- Clarificar alcance de soporte/mejoras en la venta (si no contrata soporte anual, igual mantiene acceso de por vida).
- Auditoría mínima: registrar en tenants cambios de licencia/seats y quién ejecutó.
