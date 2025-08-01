const admin = require('firebase-admin');
const { execSync } = require('child_process');

// Configurar aplicación usando credenciales por defecto de Firebase CLI
const app = admin.initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'mfloralok'
});

let currentDb = app.firestore();

// Función para exportar datos de una colección
async function exportCollection(collectionName) {
  console.log(`Exportando colección: ${collectionName}`);
  
  try {
    const snapshot = await currentDb.collection(collectionName).get();
    console.log(`Encontrados ${snapshot.docs.length} documentos en ${collectionName}`);
    
    if (snapshot.empty) {
      console.log(`No hay documentos en la colección ${collectionName}`);
      return [];
    }
    
    const docs = [];
    snapshot.forEach(doc => {
      docs.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    return docs;
    
  } catch (error) {
    console.error(`Error exportando ${collectionName}:`, error);
    return [];
  }
}

// Función para importar datos a una colección
async function importCollection(collectionName, docs) {
  if (!docs || docs.length === 0) {
    console.log(`No hay datos para importar en ${collectionName}`);
    return;
  }
  
  console.log(`Importando ${docs.length} documentos en ${collectionName}`);
  
  try {
    const batch = currentDb.batch();
    let count = 0;
    
    for (const docData of docs) {
      const docRef = currentDb.collection(collectionName).doc(docData.id);
      batch.set(docRef, docData.data);
      count++;
      
      // Firebase batch tiene límite de 500 operaciones
      if (count % 400 === 0) {
        await batch.commit();
        console.log(`Importados ${count} documentos de ${collectionName}...`);
      }
    }
    
    // Commit restantes
    if (count % 400 !== 0) {
      await batch.commit();
    }
    
    console.log(`✓ Importación completa de ${collectionName}: ${count} documentos`);
    
  } catch (error) {
    console.error(`Error importando ${collectionName}:`, error);
  }
}

// Función principal
async function migrateAllData() {
  const collections = ['plants', 'movements', 'productTypes', 'sales', 'users'];
  const exportedData = {};
  
  console.log('=== EXPORTANDO DATOS DE PRODUCCIÓN ===');
  
  // Primero exportar todos los datos de producción
  for (const collection of collections) {
    exportedData[collection] = await exportCollection(collection);
  }
  
  console.log('=== CAMBIANDO A PROYECTO DEV ===');
  
  // Cambiar al proyecto de desarrollo usando Firebase CLI
  try {
    execSync('firebase use mruh2-398d6', { stdio: 'inherit' });
    console.log('✓ Cambiado a proyecto de desarrollo');
  } catch (error) {
    console.error('Error cambiando de proyecto:', error.message);
    return;
  }
  
  // Reinicializar Firebase Admin para el nuevo proyecto
  admin.app().delete();
  const devApp = admin.initializeApp({
    projectId: 'mruh2-398d6'
  });
  currentDb = devApp.firestore();
  
  console.log('=== IMPORTANDO DATOS A DESARROLLO ===');
  
  // Importar todos los datos al proyecto de desarrollo
  for (const collection of collections) {
    await importCollection(collection, exportedData[collection]);
  }
  
  console.log('✓ Migración completa de todos los datos');
  process.exit(0);
}

// Ejecutar migración
migrateAllData().catch(console.error);
