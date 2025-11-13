#!/usr/bin/env node
/*
  Promote an existing user (not owner) to admin by email.

  Pre-requisites:
  - The user must exist in Firestore under users/{uid} (i.e., has logged in once),
    OR you pass --uid to create/update the doc explicitly.
  - GOOGLE_APPLICATION_CREDENTIALS must point to a Service Account JSON with Firestore access.

  Usage (PowerShell):
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"; 
    node scripts/promote-admin.js --email "usuario@dominio.com"

  Optional:
    --uid "firebase-auth-uid"    # if the user doc doesn't exist yet
    --project "mruh-30b1e"       # override project id
*/

try { require('dotenv').config(); } catch (_) {}
const admin = require('firebase-admin');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--email' && args[i + 1]) out.email = args[++i];
    else if (a === '--uid' && args[i + 1]) out.uid = args[++i];
    else if (a === '--project' && args[i + 1]) out.projectId = args[++i];
  }
  return out;
}

function requireEnvCreds() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS pointing to a Service Account JSON');
  }
  return admin.credential.applicationDefault();
}

async function main() {
  const { email, uid, projectId } = parseArgs();
  if (!email && !uid) {
    console.error('Usage: node scripts/promote-admin.js --email "user@domain.com" [--uid UID] [--project PROJECT_ID]');
    process.exit(1);
  }

  const credential = requireEnvCreds();
  const app = admin.initializeApp({
    credential,
    projectId:
      projectId ||
      process.env.FIREBASE_PROJECT_ID ||
      process.env.REACT_APP_FIREBASE_PROJECT_ID ||
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : undefined),
  });
  const db = admin.firestore(app);

  // Locate the user doc
  let targetUid = uid || null;
  let targetDocRef = null;

  if (!targetUid) {
    const normalized = String(email).toLowerCase();
    const qSnap = await db.collection('users').where('email', '==', normalized).limit(2).get();
    if (qSnap.empty) {
      console.warn('No users/{uid} doc found with that email.');
      console.warn('Tip: ask the user to log in once so the doc is created, or re-run providing --uid.');
      await app.delete();
      process.exit(2);
    }
    const doc = qSnap.docs[0];
    targetUid = doc.id;
    targetDocRef = doc.ref;
  } else {
    targetDocRef = db.collection('users').doc(targetUid);
  }

  await targetDocRef.set(
    {
      rol: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  const after = await targetDocRef.get();
  console.log('Promoted users/%s to admin. Current doc:', targetUid);
  console.log(JSON.stringify(after.data(), null, 2));

  await app.delete();
}

main().catch((e) => {
  console.error('Failed to promote admin:', e);
  process.exit(1);
});
