// Ensure system roles 'usuario' and 'admin' exist in Firestore and are protected (esSistema: true)
// Usage:
//   $Env:GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\serviceAccount.json"; node scripts/ensure_system_roles.js

const path = require('path');
const { db, admin } = require('../src/firebase/admin');

async function getRoleDocByNameExact(name) {
  const snap = await db.collection('roles').where('nombre', '==', name).get();
  if (snap.empty) return null;
  // If multiple (shouldn't), pick the first
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function ensureRole(name) {
  const existing = await getRoleDocByNameExact(name);
  if (!existing) {
    const ref = await db.collection('roles').add({
      nombre: name,
      esSistema: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { action: 'created', id: ref.id, name };
  }
  if (!existing.esSistema) {
    await db.collection('roles').doc(existing.id).update({
      esSistema: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    return { action: 'updated', id: existing.id, name };
  }
  return { action: 'unchanged', id: existing.id, name };
}

async function main() {
  if (!db) throw new Error('Firestore (admin) no inicializado. Verifica credenciales.');

  const targets = ['usuario', 'admin'];
  const results = [];
  for (const t of targets) {
    // eslint-disable-next-line no-await-in-loop
    const r = await ensureRole(t);
    results.push(r);
  }

  const summary = results.reduce((acc, r) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {});

  console.log('Resultados ensure_system_roles:', results);
  console.log('Resumen:', summary);
}

main().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err && err.message ? err.message : err);
  process.exit(1);
});
