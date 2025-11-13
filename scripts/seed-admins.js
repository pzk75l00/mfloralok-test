#!/usr/bin/env node
/*
  Seed Firestore admins document at path: app_config/admins

  Usage (Windows PowerShell):
    # Option A: Using GOOGLE_APPLICATION_CREDENTIALS env var
    $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\serviceAccount.json"; node scripts/seed-admins.js

    # Option B: Pass --key and optionally --owners
    node scripts/seed-admins.js --key "C:\\path\\to\\serviceAccount.json" --owners "marianopaciaroni@gmail.com,ederto66@gmail.com"

  Owners can also be provided via OWNERS env var (comma-separated).
*/

// Load .env if present so we can read GOOGLE_APPLICATION_CREDENTIALS / OWNERS
try { require('dotenv').config(); } catch (_) {}
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--key' && args[i + 1]) { out.key = args[++i]; }
    else if (a === '--owners' && args[i + 1]) { out.owners = args[++i]; }
    else if (a === '--project' && args[i + 1]) { out.projectId = args[++i]; }
  }
  return out;
}

function ownersFromInput(input) {
  if (!input) return [];
  return input
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

async function main() {
  const args = parseArgs();

  // Determine credentials
  let credential;
  if (args.key) {
    const svc = JSON.parse(readFileSync(args.key, 'utf8'));
    credential = admin.credential.cert(svc);
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = admin.credential.applicationDefault();
  } else {
    console.error('Missing credentials. Provide --key path or set GOOGLE_APPLICATION_CREDENTIALS.');
    process.exit(1);
  }

  const app = admin.initializeApp({
    credential,
    projectId:
      args.projectId ||
      process.env.GCLOUD_PROJECT ||
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : undefined) ||
      process.env.REACT_APP_FIREBASE_PROJECT_ID,
  });

  const db = admin.firestore(app);

  // Determine owners
  const defaultOwners = [
    'marianopaciaroni@gmail.com',
    'ederto66@gmail.com',
  ];
  const owners = ownersFromInput(args.owners || process.env.OWNERS) || defaultOwners;
  const emailsMap = {};
  (owners.length ? owners : defaultOwners).forEach(email => {
    emailsMap[email.toLowerCase()] = true;
  });

  const docRef = db.doc('app_config/admins');
  await docRef.set({
    emails: emailsMap,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  const snap = await docRef.get();
  console.log('admins doc written at app_config/admins:');
  console.log(JSON.stringify(snap.data(), null, 2));

  // Opcional: asegurar que cada owner tenga rol 'owner' en users/{uid}
  try {
    const auth = admin.auth(app);
    const ownerEmails = Object.keys(emailsMap);
    for (const email of ownerEmails) {
      try {
        const userRec = await auth.getUserByEmail(email);
        const uid = userRec.uid;
        await db.collection('users').doc(uid).set({
          email: email,
          rol: 'owner',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`users/${uid} marcado como rol=owner`);
      } catch (e) {
        console.warn(`No se pudo asegurar rol=owner para ${email}: ${e.message || e}`);
      }
    }
  } catch (e) {
    console.warn('No se pudo ejecutar el refuerzo de rol owner en users/{uid}:', e.message || e);
  }

  await app.delete();
}

main().catch(err => {
  console.error('Failed to seed admins:', err);
  process.exit(1);
});
