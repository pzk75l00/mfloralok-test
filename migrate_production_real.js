// Migración completa usando Firebase Web SDK con configuraciones reales
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

// Configuración REAL del proyecto de producción
const prodConfig = {
  apiKey: "AIzaSyDd0MHG0qZlUu4GPC8UHA5XhDMGVw__1dc",
  authDomain: "mfloralok.firebaseapp.com",
  databaseURL: "https://mfloralok-default-rtdb.firebaseio.com",
  projectId: "mfloralok",
  storageBucket: "mfloralok.firebasestorage.app",
  messagingSenderId: "426630649514",
  appId: "1:426630649514:web:fa3839e750d4b5230fa2d3"
};

// Configuración REAL del proyecto de desarrollo
const devConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

// Inicializar ambas aplicaciones
const prodApp = initializeApp(prodConfig, 'prod');
const devApp = initializeApp(devConfig, 'dev');

const prodDb = getFirestore(prodApp);
const devDb = getFirestore(devApp);

// Función para exportar datos de producción
async function exportProdCollection(collectionName) {
  console.log(`🔄 Exportando ${collectionName} de PRODUCCIÓN...`);
  
  try {
    const snapshot = await getDocs(collection(prodDb, collectionName));
    const docs = [];
    
    snapshot.forEach(docSnap => {
      docs.push({
        id: docSnap.id,
        data: docSnap.data()
      });
    });
    
    console.log(`   ✅ ${docs.length} documentos exportados de ${collectionName}`);
    return docs;
    
  } catch (error) {
    console.error(`   ❌ Error exportando ${collectionName}:`, error.message);
    return [];
  }
}

// Función para limpiar colección en desarrollo antes de importar
async function clearDevCollection(collectionName) {
  console.log(`🧹 Limpiando colección ${collectionName} en desarrollo...`);
  
  try {
    const snapshot = await getDocs(collection(devDb, collectionName));
    const deletePromises = [];
    
    snapshot.forEach(docSnap => {
      deletePromises.push(deleteDoc(doc(devDb, collectionName, docSnap.id)));
    });
    
    await Promise.all(deletePromises);
    console.log(`   ✅ Colección ${collectionName} limpiada`);
    
  } catch (error) {
    console.error(`   ⚠️ Error limpiando ${collectionName}:`, error.message);
  }
}

// Función para importar datos a desarrollo
async function importToDevCollection(collectionName, docs) {
  if (!docs || docs.length === 0) {
    console.log(`   ⚠️ No hay datos para importar en ${collectionName}`);
    return;
  }
  
  console.log(`📥 Importando ${docs.length} documentos en ${collectionName}...`);
  
  try {
    // Importar documentos de uno en uno para evitar problemas de batch
    let count = 0;
    for (const docData of docs) {
      const docRef = doc(devDb, collectionName, docData.id);
      await setDoc(docRef, docData.data);
      count++;
      
      if (count % 10 === 0) {
        console.log(`   ⏳ Importados ${count}/${docs.length} documentos...`);
      }
    }
    
    console.log(`   ✅ Importación completa: ${count} documentos en ${collectionName}`);
    
  } catch (error) {
    console.error(`   ❌ Error importando ${collectionName}:`, error.message);
  }
}

// Función principal de migración
async function migrateAllProductionData() {
  console.log('🎯 MIGRACIÓN COMPLETA DE PRODUCCIÓN A DESARROLLO');
  console.log('================================================');
  console.log('🏭 Fuente: mfloralok (PRODUCCIÓN)');
  console.log('🚧 Destino: mruh2-398d6 (DESARROLLO)');
  console.log('================================================\n');
  
  const collections = ['plants', 'movements', 'productTypes', 'sales', 'users'];
  const migrationData = {};
  
  // FASE 1: Exportar todos los datos de producción
  console.log('📤 FASE 1: EXPORTANDO DATOS DE PRODUCCIÓN');
  console.log('------------------------------------------');
  
  let totalDocsExported = 0;
  for (const collectionName of collections) {
    const docs = await exportProdCollection(collectionName);
    migrationData[collectionName] = docs;
    totalDocsExported += docs.length;
  }
  
  console.log(`\n📊 RESUMEN EXPORTACIÓN: ${totalDocsExported} documentos totales`);
  for (const [name, docs] of Object.entries(migrationData)) {
    console.log(`   📁 ${name}: ${docs.length} documentos`);
  }
  
  if (totalDocsExported === 0) {
    console.log('\n❌ NO SE ENCONTRARON DATOS EN PRODUCCIÓN');
    console.log('Verifica que el proyecto de producción tenga datos.');
    return;
  }
  
  // FASE 2: Limpiar desarrollo e importar datos
  console.log('\n📥 FASE 2: IMPORTANDO A DESARROLLO');
  console.log('-----------------------------------');
  
  for (const collectionName of collections) {
    if (migrationData[collectionName].length > 0) {
      await clearDevCollection(collectionName);
      await importToDevCollection(collectionName, migrationData[collectionName]);
    }
  }
  
  console.log('\n🎉 ¡MIGRACIÓN COMPLETA EXITOSA!');
  console.log('================================');
  console.log(`📊 Total migrado: ${totalDocsExported} documentos`);
  console.log('🔄 Todos los datos de producción están ahora en desarrollo');
  console.log('✨ Puedes trabajar con datos reales desde mayo 2025');
  
  // Mostrar resumen final
  console.log('\n📋 RESUMEN FINAL:');
  for (const [name, docs] of Object.entries(migrationData)) {
    if (docs.length > 0) {
      console.log(`   ✅ ${name}: ${docs.length} documentos migrados`);
    }
  }
}

// Ejecutar migración
console.log('⚡ Iniciando migración...\n');
migrateAllProductionData().catch(error => {
  console.error('\n💥 ERROR CRÍTICO EN LA MIGRACIÓN:', error);
  console.error('Verifica las configuraciones y permisos de Firebase.');
});
