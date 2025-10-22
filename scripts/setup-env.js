/* Simple helper to scaffold .env from .env.example if missing and verify keys */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const envPath = path.join(root, '.env');
const examplePath = path.join(root, '.env.example');

function ensureEnv() {
  if (!fs.existsSync(examplePath)) {
    console.log('[setup:env] .env.example no encontrado.');
    return;
  }
  if (!fs.existsSync(envPath)) {
    fs.copyFileSync(examplePath, envPath);
    console.log('[setup:env] .env creado a partir de .env.example. Completar valores REACT_APP_FIREBASE_*');
  } else {
    console.log('[setup:env] .env ya existe.');
  }

  const required = [
    'REACT_APP_FIREBASE_API_KEY',
    'REACT_APP_FIREBASE_AUTH_DOMAIN',
    'REACT_APP_FIREBASE_PROJECT_ID',
    'REACT_APP_FIREBASE_APP_ID'
  ];
  const content = fs.readFileSync(envPath, 'utf8');
  const missing = required.filter(k => !new RegExp(`^${k}=.+`, 'm').test(content));
  if (missing.length) {
    console.log('[setup:env] Falta completar variables:', missing.join(', '));
  } else {
    console.log('[setup:env] Variables requeridas presentes.');
  }
}

ensureEnv();
