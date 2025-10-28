#!/usr/bin/env node
/*
  Autosetup CLI (initial scaffold):
  - Seeds Firestore admins doc (reuses scripts/seed-admins.js)
  - Deploys Firestore rules via Firebase CLI if available
  - Optionally sets Vercel env vars via Vercel API

  Requirements:
  - Node.js
  - Service Account JSON for Firebase (Editor)
  - Optionally: firebase-tools installed and authenticated (or FIREBASE_TOKEN set)
  - Optionally: VERCEL_TOKEN and project name/id for env configuration
*/

try { require('dotenv').config(); } catch (_) {}
const { spawnSync } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');
const vercel = require('./lib/vercel');

function log(step, msg) { console.log(`[${step}] ${msg}`); }
function warn(step, msg) { console.warn(`[${step}] WARN: ${msg}`); }
function fail(step, msg) { console.error(`[${step}] ERROR: ${msg}`); }

function parseArgs() {
  const out = { configPath: 'autosetup.config.json' };
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--config' && args[i + 1]) { out.configPath = args[++i]; }
  }
  return out;
}

function loadConfig(configPath) {
  const full = path.isAbsolute(configPath) ? configPath : path.join(process.cwd(), configPath);
  if (!existsSync(full)) {
    warn('config', `Config file not found at ${full}. Proceeding with env variables only.`);
    return {};
  }
  const data = JSON.parse(readFileSync(full, 'utf8'));
  log('config', `Loaded ${full}`);
  return data;
}

function runSeedAdmins({ serviceAccountKeyPath, owners, projectId }) {
  const script = path.join(process.cwd(), 'scripts', 'seed-admins.js');
  if (!existsSync(script)) { fail('seed-admins', 'scripts/seed-admins.js not found'); return false; }

  const args = ['scripts/seed-admins.js'];
  if (serviceAccountKeyPath) { args.push('--key', serviceAccountKeyPath); }
  if (owners && owners.length) { args.push('--owners', owners.join(',')); }
  if (projectId) { args.push('--project', projectId); }

  log('seed-admins', `Running: node ${args.join(' ')}`);
  const res = spawnSync('node', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (res.status !== 0) { fail('seed-admins', `exit code ${res.status}`); return false; }
  return true;
}

function deployFirestoreRules({ projectId, rulesPath = 'firestore.rules' }) {
  // Prefer Firebase CLI if available
  const hasFirebase = spawnSync('firebase', ['--version'], { shell: true });
  if (hasFirebase.status !== 0) {
    warn('rules', 'Firebase CLI not found. Skipping automatic deploy. You can run: firebase deploy --only firestore:rules');
    return false;
  }
  const args = ['deploy', '--only', 'firestore:rules'];
  if (projectId) { args.push('--project', projectId); }
  // If FIREBASE_TOKEN is present, CLI uses it automatically
  log('rules', `Deploying via Firebase CLI (${rulesPath})`);
  const res = spawnSync('firebase', args, { stdio: 'inherit', shell: true });
  if (res.status !== 0) { fail('rules', `firebase CLI exit code ${res.status}`); return false; }
  return true;
}

async function configureVercelEnv({ token, project, teamId, env }) {
  if (!token || !project) {
    warn('vercel', 'Missing VERCEL_TOKEN or project; skipping Vercel env configuration.');
    return false;
  }
  const upserts = [];
  for (const [key, value] of Object.entries(env || {})) {
    if (value == null || value === '') continue;
    upserts.push(vercel.upsertEnv({ token, projectIdOrName: project, teamId, key, value, target: ['production','preview','development'] }));
  }
  const results = await Promise.allSettled(upserts);
  const failures = results.filter(r => r.status === 'rejected');
  if (failures.length) {
    failures.forEach(f => fail('vercel', f.reason?.message || String(f.reason)));
    return false;
  }
  log('vercel', `Configured ${results.length} env vars in project ${project}.`);
  return true;
}

(async () => {
  const { configPath } = parseArgs();
  const cfg = loadConfig(configPath);

  const projectId = cfg.firebase?.projectId || process.env.REACT_APP_FIREBASE_PROJECT_ID;
  const serviceAccountKeyPath = cfg.firebase?.serviceAccountKeyPath || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const owners = cfg.owners || (process.env.OWNERS ? process.env.OWNERS.split(',').map(s=>s.trim()) : undefined);

  const envForVercel = {};
  if (cfg.vercel?.envFromDotenv) {
    for (const k of Object.keys(process.env)) {
      if (k.startsWith('REACT_APP_')) envForVercel[k] = process.env[k];
    }
  }
  Object.assign(envForVercel, cfg.vercel?.extraEnv || {});

  // 1) Seed admins
  runSeedAdmins({ serviceAccountKeyPath, owners, projectId });

  // 2) Deploy Firestore rules (best-effort)
  deployFirestoreRules({ projectId, rulesPath: cfg.firebase?.rulesPath });

  // 3) Configure Vercel envs (optional)
  await configureVercelEnv({ token: cfg.vercel?.token || process.env.VERCEL_TOKEN, project: cfg.vercel?.project || process.env.VERCEL_PROJECT, teamId: cfg.vercel?.teamId || process.env.VERCEL_TEAM, env: envForVercel });

  log('done', 'Autosetup finished (some steps may require manual confirmation).');
})();
