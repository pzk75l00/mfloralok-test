const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, setDoc, deleteDoc } = require('firebase/firestore');

// Configuraciones para ambos proyectos
const prodConfig = {
  apiKey: "AIzaSyDVdnmH-l6J4u8mxwRrJN3G5S2_ItZfT9E",
  authDomain: "mfloralok.firebaseapp.com",
  databaseURL: "https://mfloralok-default-rtdb.firebaseio.com",
  projectId: "mfloralok",
  storageBucket: "mfloralok.appspot.com",
  messagingSenderId: "426630649514",
  appId: "1:426630649514:web:d4e7f8b9c6a5b3d2e1f4g5"
};

const devConfig = {
  apiKey: "AIzaSyBHkRJnJ9_X5mY2zP7cQ8vW4tA6sE9kL1m",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6-default-rtdb.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:a2b3c4d5e6f7g8h9i0j1"
};

// Inicializar ambas aplicaciones
const prodApp = initializeApp(prodConfig, 'prod');
const devApp = initializeApp(devConfig, 'dev');

const prodDb = getFirestore(prodApp);
const devDb = getFirestore(devApp);

// Función para migrar una colección
async function migrateCollection(collectionName) {
  console.log(`\n=== Migrando colección: ${collectionName} ===`);
  
  try {
    // Leer datos de producción
    console.log('Leyendo datos de producción...');
    const prodCollection = collection(prodDb, collectionName);
    const prodSnapshot = await getDocs(prodCollection);
    
    console.log(`Encontrados ${prodSnapshot.docs.length} documentos en producción`);
    
    if (prodSnapshot.empty) {
      console.log(`No hay documentos en la colección ${collectionName}`);
      return;
    }
    
    // Migrar datos a desarrollo
    console.log('Migrando datos a desarrollo...');
    let count = 0;
    
    for (const docSnapshot of prodSnapshot.docs) {
      const docData = docSnapshot.data();
      const docRef = doc(devDb, collectionName, docSnapshot.id);
      
      await setDoc(docRef, docData);
      count++;
      
      if (count % 10 === 0) {
        console.log(`Migrados ${count} documentos...`);
      }
    }
    
    console.log(`✓ Migración completa de ${collectionName}: ${count} documentos`);
    
  } catch (error) {
    console.error(`Error migrando ${collectionName}:`, error);
  }
}

// Función principal
async function migrateAllData() {
  const collections = ['plants', 'movements', 'productTypes', 'sales', 'users'];
  
  console.log('===========================================');
  console.log('INICIANDO MIGRACIÓN DE PRODUCCIÓN A DEV');
  console.log('===========================================');
  
  for (const collectionName of collections) {
    await migrateCollection(collectionName);
  }
  
  console.log('\n✓ ¡MIGRACIÓN COMPLETA DE TODOS LOS DATOS!');
  console.log('===========================================');
}

// Ejecutar migración
migrateAllData().catch(console.error);
