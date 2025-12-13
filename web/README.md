Mundo Floral - Web Landing + Demo

Carpeta `web/` contiene una web simple y un pequeño servidor Express para servirla.

Arranque rápido:

1. Abrir terminal en `web/`:

```powershell
cd web
npm install
npm start
```

2. Sitio estará en `http://localhost:8080` por defecto.

Notas:
- El servidor provee un endpoint `/api/demo/products?rubro=...` que devuelve productos de ejemplo. Si querés proxyar al tenant demo real, exportá `DEMO_TENANT_URL` antes de arrancar:

```powershell
$env:DEMO_TENANT_URL = "https://mi-tenant-demo.example.com"
npm start
```

- Para solicitar demos el formulario envía POST a `/api/demo/request` y guarda solicitudes en `web/requests.json`.
- La aplicación principal sigue corriendo en `localhost:3000` (no se modifica).

Siguiente paso sugerido:
- Cambiar `DEMO_TENANT_URL` al tenant demo real y ajustar paths de la API del tenant si es necesario.
