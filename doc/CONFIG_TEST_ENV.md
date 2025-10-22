# Configuración de entorno de TEST (Firebase + Vercel)

Este documento describe cómo apuntar la app al proyecto Firebase de TEST `mruh-30b1e` y desplegar en Vercel bajo el proyecto `mfloralok-test` (dominio: mfloralok-test.vercel.app).

## 1) Variables de entorno requeridas (CRA)
Definir estas variables con los valores de la Web App de Firebase del proyecto `mruh-30b1e`:

- REACT_APP_FIREBASE_API_KEY
- REACT_APP_FIREBASE_AUTH_DOMAIN
- REACT_APP_FIREBASE_DATABASE_URL (opcional si no usás RTDB)
- REACT_APP_FIREBASE_PROJECT_ID (debería ser `mruh-30b1e`)
- REACT_APP_FIREBASE_STORAGE_BUCKET
- REACT_APP_FIREBASE_MESSAGING_SENDER_ID
- REACT_APP_FIREBASE_APP_ID

Dónde configurarlas:
- Local: en un archivo `.env` (no se commitea).
- Vercel: Project > Settings > Environment Variables (Production/Preview/Development) y luego redeploy.

## 2) Firebase Project
- Archivo `.firebaserc` ya apunta por defecto a: `mruh-30b1e`.
- El archivo `src/firebase/firebaseConfig.js` lee SIEMPRE `REACT_APP_FIREBASE_*`.

## 3) Vercel
- Proyecto objetivo: `mfloralok-test` (dominio: `mfloralok-test.vercel.app`).
- Asegurate de vincular la carpeta con `vercel link` y elegir ese proyecto.
- Cargar las variables de entorno arriba listadas en `Production`.
- Deploy: `vercel --prod`.

## 4) Pasos rápidos
1. Obtener el config Web de Firebase (mruh-30b1e) desde Console > Project Settings > Your apps > Web app.
2. Pegar los valores en Vercel (Environment Variables) y/o en `.env` local si vas a correr local.
3. Ejecutar:
   - `npm run build`
   - `vercel --prod`

## 5) Verificación
- Abrir la app y revisar en la consola de la app (o en logs de Firestore) que se conecte a `mruh-30b1e` (por ejemplo, viendo el `projectId`).
- Si faltan variables, la app emitirá un error de config en consola.

## 6) Notas
- Nunca commitear `.env` con claves reales.
- Si cambiás variables en Vercel, necesitas redeploy para que apliquen.
