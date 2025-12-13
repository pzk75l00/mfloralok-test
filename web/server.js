const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;
const DEMO_TENANT_URL = process.env.DEMO_TENANT_URL || ''; // opcional, si se quiere proxy al tenant demo real

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Endpoint para obtener productos simulados o proxy hacia DEMO_TENANT_URL
app.get('/api/demo/products', async (req, res) => {
  const rubro = req.query.rubro || '';
  // Si está configurado DEMO_TENANT_URL, intentar proxy (simple fetch)
  if (DEMO_TENANT_URL) {
    try {
      const fetch = require('node-fetch');
      const url = `${DEMO_TENANT_URL.replace(/\/$/, '')}/api/products?rubro=${encodeURIComponent(rubro)}`;
      const r = await fetch(url);
      const json = await r.json();
      return res.json(json);
    } catch (err) {
      console.error('Proxy to demo tenant failed:', err);
      // seguir a fallback
    }
  }

  // Fallback: datos de ejemplo agrupados por rubro
  const sample = {
    flores: [
      { id: 'f1', name: 'Rosa Roja', price: 1200 },
      { id: 'f2', name: 'Lirio Blanco', price: 900 }
    ],
    macetas: [
      { id: 'm1', name: 'Maceta Terracota', price: 450 },
      { id: 'm2', name: 'Maceta Cerámica', price: 650 }
    ],
    default: [
      { id: 'p1', name: 'Producto A', price: 300 },
      { id: 'p2', name: 'Producto B', price: 500 }
    ]
  };

  const list = sample[rubro.toLowerCase()] || sample.default;
  res.json({ rubro, products: list });
});

// Endpoint para recibir solicitudes de demo
app.post('/api/demo/request', (req, res) => {
  const payload = {
    receivedAt: new Date().toISOString(),
    name: req.body.name || '',
    email: req.body.email || '',
    rubro: req.body.rubro || '',
    message: req.body.message || ''
  };

  // Append to requests.json (simple persistence)
  const file = path.join(__dirname, 'requests.json');
  let arr = [];
  try {
    if (fs.existsSync(file)) arr = JSON.parse(fs.readFileSync(file));
  } catch (e) { arr = []; }
  arr.push(payload);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2));

  console.log('Demo request saved:', payload);
  res.json({ ok: true, payload });
});

// Fallback to serve index.html for SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Web site running on http://localhost:${PORT}`));
