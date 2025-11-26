// Inicialización centralizada de Firebase Admin
// Usa la variable de entorno GOOGLE_APPLICATION_CREDENTIALS si está definida
// En GCP (Cloud Functions / Cloud Run) la aplicación puede usar Application Default Credentials
const admin = require('firebase-admin');
const fs = require('fs');

function initAdmin() {
  if (admin.apps && admin.apps.length > 0) return admin;

  try {
    const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (keyPath && fs.existsSync(keyPath)) {
      const serviceAccount = require(keyPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback to application default credentials (useful on GCP)
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (err) {
    // Re-throw with clearer message
    throw new Error('Error inicializando firebase-admin: ' + (err.message || err));
  }

  return admin;
}

const adminApp = initAdmin();
const firestore = adminApp.firestore ? adminApp.firestore() : null;
//const rtdb = adminApp.database ? adminApp.database() : null;

module.exports = {
  admin: adminApp,
  db: firestore//,
 // rtdb
};
