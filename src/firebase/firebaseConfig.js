// Configuración de Firebase/Firestore
// Reemplaza los valores con los de tu proyecto de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Variables unificadas: usar SIEMPRE REACT_APP_FIREBASE_* (sin fallback legacy)
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID
};

// Diagnóstico mínimo en producción si faltan claves críticas (no interrumpe)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // eslint-disable-next-line no-console
  console.error('[Firebase] Config incompleta. Definir REACT_APP_FIREBASE_* en .env o en variables del host.');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };