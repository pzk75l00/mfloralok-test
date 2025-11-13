Colocá aquí (localmente) tu archivo JSON de Service Account para Firebase Admin.

IMPORTANTE
- Esta carpeta está ignorada por Git (.gitignore). No subas claves al repositorio.
- El archivo recomendado es: Keys\mfloralok-service.json (nombre libre, pero mantené la ruta coherente con .env).

Cómo obtener la Service Account (Firebase Console)
1) Abrí: https://console.firebase.google.com > tu proyecto.
2) Configuración del proyecto (ícono ⚙️) > Cuentas de servicio.
3) Click en "Generar nueva clave privada". Guardá el .json en esta carpeta.
4) Rol recomendado del servicio: Editor o un rol que permita leer/escribir en Firestore.

Verificá la variable en .env (usada por scripts Node)
  GOOGLE_APPLICATION_CREDENTIALS=C:\\Proyectos\\Sistema\\TEST\\mfloralok_test\\Keys\\mfloralok-service.json

Sembrar los creadores (owners)
- Usando la variable de entorno (PowerShell, Windows):
  $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\Proyectos\\Sistema\\TEST\\mfloralok_test\\Keys\\mfloralok-service.json"; npm run seed:admins

- Pasando la key por parámetro:
  node scripts/seed-admins.js --key "C:\\Proyectos\\Sistema\\TEST\\mfloralok_test\\Keys\\mfloralok-service.json"

Por defecto, el seed carga estos emails como creadores:
- marianopaciaroni@gmail.com
- ederto66@gmail.com

Para usar una lista personalizada (coma-separada):
- PowerShell (variable de entorno temporal):
  $env:OWNERS = "dueño1@dominio.com,dueño2@dominio.com"; npm run seed:admins

- CLI:
  node scripts/seed-admins.js --key "C:\\...\\mfloralok-service.json" --owners "dueño1@dominio.com,dueño2@dominio.com"

Resultado esperado en Firestore
- Documento: app_config/admins
- Estructura:
  {
    "emails": {
      "marianopaciaroni@gmail.com": true,
      "ederto66@gmail.com": true
    },
    "updatedAt": (serverTimestamp)
  }
