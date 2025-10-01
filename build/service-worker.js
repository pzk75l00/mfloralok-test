// Service Worker en modo "network-first" y sin cache persistente para evitar versiones viejas.
// Esto asegura que producción siempre cargue la última versión del bundle.

self.addEventListener('install', (event) => {
  // Forzar activación inmediata del SW actualizado
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Borrar cualquier cache previo que pudiera dejar versiones viejas
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Siempre ir a red. Si falla, devolvemos un 503 simple.
  event.respondWith(
    fetch(event.request).catch(() =>
      new Response('Recurso no disponible offline o error de red.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      })
    )
  );
});
