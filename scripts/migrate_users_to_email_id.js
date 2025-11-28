// Script para migrar documentos de la colección 'users' a que el ID sea el email (en minúsculas)
// Ejecutar con: node scripts/migrate_users_to_email_id.js



require('dotenv').config();
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Si GOOGLE_APPLICATION_CREDENTIALS está definida, Firebase Admin la usará automáticamente
// Puedes definirla en tu .env o en el entorno
// Ejemplo en .env:
// GOOGLE_APPLICATION_CREDENTIALS=C:/Proyectos/Sistema/TEST/mfloralok_test/serviceAccountKey.json

initializeApp({
  credential: applicationDefault(),
});

const db = getFirestore();

async function migrateUsers() {
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  let migrated = 0, skipped = 0, deleted = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const email = (data.email || '').toLowerCase();
    if (!email) {
      console.log(`Documento ${doc.id} sin email, omitido.`);
      skipped++;
      continue;
    }
    if (doc.id === email) {
      // Ya está correcto
      skipped++;
      continue;
    }
    // Crear nuevo doc con ID=email
    await usersRef.doc(email).set(data, { merge: true });
    // Eliminar doc antiguo
    await usersRef.doc(doc.id).delete();
    console.log(`Migrado: ${doc.id} -> ${email}`);
    migrated++;
    deleted++;
  }
  console.log(`\nMigración completa. Migrados: ${migrated}, Eliminados: ${deleted}, Omitidos: ${skipped}`);
}

migrateUsers().catch(err => {
  console.error('Error en la migración:', err);
  process.exit(1);
});
