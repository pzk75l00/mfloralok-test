// Script para sincronizar automáticamente plants_full.json con Firestore
// Requiere: npm install firebase-admin chokidar

const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const admin = require('firebase-admin');

// Ruta al archivo JSON
const PLANTS_JSON = path.join(__dirname, 'src', 'mock', 'plants_full.json');

// Inicializa Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
    console.error('Falta el archivo serviceAccountKey.json en la raíz del proyecto. Descárgalo desde la consola de Firebase > Configuración del proyecto > Cuentas de servicio.');
    process.exit(1);
}
admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
});
const db = admin.firestore();

async function syncPlants() {
    try {
        const data = fs.readFileSync(PLANTS_JSON, 'utf8');
        const plants = JSON.parse(data);
        const plantsRef = db.collection('plants');

        // Obtener todos los documentos actuales
        const snapshot = await plantsRef.get();
        const existingIds = new Set();
        snapshot.forEach(doc => existingIds.add(Number(doc.data().id)));

        // Actualizar o crear documentos
        for (const plant of plants) {
            // Intercambiar los valores de basePrice y purchasePrice
            const temp = plant.basePrice;
            plant.basePrice = plant.purchasePrice;
            plant.purchasePrice = temp;
            await plantsRef.doc(String(plant.id)).set(plant, { merge: false });
            existingIds.delete(plant.id);
        }

        // Eliminar los que ya no existen en el JSON
        for (const id of existingIds) {
            await plantsRef.doc(String(id)).delete();
        }

        console.log(`[${new Date().toLocaleTimeString()}] Sincronización completa: ${plants.length} plantas.`);
    } catch (err) {
        console.error('Error al sincronizar:', err);
    }
}

// Monitorea el archivo JSON
console.log('Observando cambios en plants_full.json...');
chokidar.watch(PLANTS_JSON).on('change', () => {
    console.log('Detectado cambio en plants_full.json. Sincronizando...');
    syncPlants();
});

// Sincroniza al iniciar
syncPlants();