#!/usr/bin/env node
/*
Seed app_config/auth document to restrict who can log in.

Structure written:
app_config/auth => {
  allowedEmails: string[] (exact emails in lowercase),
  allowedEmailDomains: string[] (domains in lowercase, e.g., "empresa.com"),
  blockedEmails: string[]
}

Priority enforced by client:
- If blockedEmails includes the email => denied
- Else if allowedEmails has entries => only those emails are allowed
- Else if allowedEmailDomains has entries => only those domains are allowed
- Else => allow all (not recommended)

Usage (PowerShell):
  # Using env vars (.env is loaded if present)
  npm run seed:auth

Environment variables:
  # comma-separated emails; if empty and OWNERS is set, it will default to OWNERS
  ALLOWED_EMAILS=mail1@dominio.com,mail2@dominio.com
  ALLOWED_DOMAINS=empresa.com,otra.com
  BLOCKED_EMAILS=spam@spam.com

Notes:
- If all three are empty, this script will FALLBACK to ALLOWED_EMAILS = OWNERS to be safe.
- Requires GOOGLE_APPLICATION_CREDENTIALS pointing to a valid Service Account JSON.
*/

try { require('dotenv').config(); } catch (_) {}
const admin = require('firebase-admin');
const { readFileSync } = require('fs');

function parseList(v) {
  return String(v || '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function getCredential() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // applicationDefault() will read from env var automatically
    return admin.credential.applicationDefault();
  }
  throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS');
}

async function main() {
  const credential = getCredential();
  const app = admin.initializeApp({
    credential,
    projectId:
      process.env.FIREBASE_PROJECT_ID ||
      process.env.REACT_APP_FIREBASE_PROJECT_ID ||
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : undefined),
  });
  const db = admin.firestore(app);

  let allowedEmails = parseList(process.env.ALLOWED_EMAILS);
  const fallbackOwners = parseList(process.env.OWNERS);
  const allowedDomains = parseList(process.env.ALLOWED_DOMAINS);
  const blockedEmails = parseList(process.env.BLOCKED_EMAILS);

  if (allowedEmails.length === 0 && allowedDomains.length === 0 && blockedEmails.length === 0) {
    // Safe default: restrict to OWNERS if nothing specified
    allowedEmails = fallbackOwners;
  }

  const payload = {
    allowedEmails,
    allowedEmailDomains: allowedDomains,
    blockedEmails,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.doc('app_config/auth').set(payload, { merge: true });
  const snap = await db.doc('app_config/auth').get();
  console.log('app_config/auth written:');
  console.log(JSON.stringify(snap.data(), null, 2));

  await app.delete();
}

main().catch(e => {
  console.error('Failed to seed auth allowlist:', e);
  process.exit(1);
});
