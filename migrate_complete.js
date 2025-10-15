// Script directo para migrar datos usando Firebase CLI y Admin SDK con autenticación por defecto
const admin = require('firebase-admin');

// Inicializar con credenciales por defecto
process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS || '';

// Función para inicializar Firebase Admin con proyecto específico
function initializeFirebase(projectId) {
  try {
    // Verificar si ya hay una app inicializada y eliminarla
    if (admin.apps.length > 0) {
      admin.apps.forEach(app => app?.delete());
    }
    
    const app = admin.initializeApp({
      projectId: projectId
    });
    
    return app.firestore();
  } catch (error) {
    console.error(`Error inicializando Firebase para proyecto ${projectId}:`, error.message);
    return null;
  }
}

// Función para exportar todos los datos de una colección
async function exportCollectionData(db, collectionName) {
  console.log(`📦 Exportando colección: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const docs = [];
    
    snapshot.forEach(doc => {
      docs.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`   ✓ Exportados ${docs.length} documentos de ${collectionName}`);
    return docs;
    
  } catch (error) {
    console.error(`   ✗ Error exportando ${collectionName}:`, error.message);
    return [];
  }
}

// Función para importar datos a una colección
async function importCollectionData(db, collectionName, docs) {
  if (!docs || docs.length === 0) {
    console.log(`   ⚠️  No hay datos para importar en ${collectionName}`);
    return;
  }
  
  console.log(`📥 Importando ${docs.length} documentos en ${collectionName}`);
  
  try {
    const batch = db.batch();
    let batchCount = 0;
    let totalCount = 0;
    
    for (const docData of docs) {
      const docRef = db.collection(collectionName).doc(docData.id);
      batch.set(docRef, docData.data);
      batchCount++;
      totalCount++;
      
      // Commit cada 400 documentos (límite de Firebase es 500)
      if (batchCount >= 400) {
        await batch.commit();
        console.log(`   ⏳ Importados ${totalCount} documentos...`);
        batchCount = 0;
      }
    }
    
    // Commit documentos restantes
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log(`   ✅ Importación completa de ${collectionName}: ${totalCount} documentos`);
    
  } catch (error) {
    console.error(`   ❌ Error importando ${collectionName}:`, error.message);
  }
}

// Función principal de migración
async function migrateAllData() {
  console.log('🚀 INICIANDO MIGRACIÓN COMPLETA DE DATOS');
  console.log('==========================================');
  
  const collections = ['plants', 'movements', 'productTypes', 'sales', 'users'];
  const allData = {};
  
  // PASO 1: Exportar datos de producción
  console.log('\n📤 PASO 1: EXPORTANDO DATOS DE PRODUCCIÓN');
  console.log('------------------------------------------');
  
  const prodDb = initializeFirebase('mfloralok');
  if (!prodDb) {
    console.error('❌ No se pudo conectar al proyecto de producción');
    return;
  }
  
  for (const collection of collections) {
    allData[collection] = await exportCollectionData(prodDb, collection);
  }
  
  // Mostrar resumen de datos exportados
  console.log('\n📊 RESUMEN DE DATOS EXPORTADOS:');
  for (const [collection, data] of Object.entries(allData)) {
    console.log(`   ${collection}: ${data.length} documentos`);
  }
  
  // PASO 2: Importar datos a desarrollo
  console.log('\n📥 PASO 2: IMPORTANDO DATOS A DESARROLLO');
  console.log('------------------------------------------');
  
  const devDb = initializeFirebase('mruh2-398d6');
  if (!devDb) {
    console.error('❌ No se pudo conectar al proyecto de desarrollo');
    return;
  }
  
  for (const collection of collections) {
    await importCollectionData(devDb, collection, allData[collection]);
  }
  
  console.log('\n🎉 ¡MIGRACIÓN COMPLETA EXITOSA!');
  console.log('================================');
  console.log('Todos los datos de producción han sido migrados a desarrollo.');
  console.log('Ahora puedes trabajar en el proyecto con datos reales.');
  
  process.exit(0);
}

// Ejecutar migración
migrateAllData().catch(error => {
  console.error('💥 ERROR EN LA MIGRACIÓN:', error);
  process.exit(1);
});
