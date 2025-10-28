# Autosetup (scaffold)

This CLI helps automate common setup steps across Firebase and Vercel.

What it can do now:
- Seed Firestore admins doc at `app_config/admins` (reuses `scripts/seed-admins.js`)
- Deploy Firestore rules via Firebase CLI (if installed/authenticated)
- Upsert Vercel env vars via Vercel API (if `VERCEL_TOKEN` and project provided)

Planned (manual for now):
- Enable Google sign-in provider and bind OAuth Web Client (requires Firebase Console/API with specific scopes)

## Usage

1) Copy the example config and edit values:

```
cp autosetup.config.example.json autosetup.config.json
```

2) Run:

```
node scripts/autosetup/index.js --config autosetup.config.json
```

Environment variables respected:
- `GOOGLE_APPLICATION_CREDENTIALS` (Service Account JSON for Firebase Admin)
- `OWNERS` (comma-separated emails)
- `FIREBASE_TOKEN` (optional, for Firebase CLI)
- `VERCEL_TOKEN`, `VERCEL_PROJECT`, `VERCEL_TEAM` (optional for Vercel)

Notes:
- On Windows/PowerShell, provide absolute paths like `C:\\Keys\\file.json`.
- If Firebase CLI is not installed, rules deploy will be skipped with guidance.
