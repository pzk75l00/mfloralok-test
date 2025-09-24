// Configuración de Firebase/Firestore
// Reemplaza los valores con los de tu proyecto de Firebase
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Soporta ambas convenciones de variables: REACT_APP_FIREBASE_* (recomendada)
// y REACT_APP_* (legacy). Preferimos la primera si está definida.
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || process.env.REACT_APP_AUTH_DOMAIN,
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || process.env.REACT_APP_DATABASE_URL,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || process.env.REACT_APP_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || process.env.REACT_APP_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || process.env.REACT_APP_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID || process.env.REACT_APP_APP_ID
};

// Diagnóstico mínimo en producción si faltan claves críticas (no interrumpe)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
  // eslint-disable-next-line no-console
  console.error('[Firebase] Config incompleta. Verificar variables REACT_APP_FIREBASE_* o REACT_APP_* en el host.');
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };