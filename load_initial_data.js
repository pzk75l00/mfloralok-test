// Script para cargar datos iniciales al proyecto de desarrollo
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, addDoc } = require('firebase/firestore');
const plantsData = require('./src/mock/plants_full.json');

// Configuración para desarrollo (usando las configuraciones reales del .env)
const devConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

// Inicializar aplicación de desarrollo
const devApp = initializeApp(devConfig);
const db = getFirestore(devApp);

// Función para cargar plantas
async function loadPlants() {
  console.log('Cargando plantas...');
  
  try {
    for (const plant of plantsData) {
      // Convertir el formato del mock al formato de Firestore
      const plantDoc = {
        name: plant.name,
        basePrice: plant.basePrice,
        purchasePrice: plant.purchasePrice,
        stock: plant.stock,
        type: plant.type,
        image: plant.image || "",
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Usar el ID del mock como ID del documento
      const docRef = doc(db, 'plants', plant.id.toString());
      await setDoc(docRef, plantDoc);
      
      console.log(`✓ Planta cargada: ${plant.name}`);
    }
    
    console.log(`✓ Se cargaron ${plantsData.length} plantas exitosamente`);
  } catch (error) {
    console.error('Error cargando plantas:', error);
  }
}

// Función para crear tipos de productos básicos
async function loadProductTypes() {
  console.log('Cargando tipos de productos...');
  
  const productTypes = [
    { name: 'Interior', description: 'Plantas de interior' },
    { name: 'Exterior', description: 'Plantas de exterior' },
    { name: 'Florales', description: 'Arreglos florales' },
    { name: 'Macetas', description: 'Macetas y contenedores' },
    { name: 'Herramientas', description: 'Herramientas de jardinería' }
  ];
  
  try {
    for (const type of productTypes) {
      const typeDoc = {
        ...type,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await addDoc(collection(db, 'productTypes'), typeDoc);
      console.log(`✓ Tipo de producto cargado: ${type.name}`);
    }
    
    console.log(`✓ Se cargaron ${productTypes.length} tipos de productos`);
  } catch (error) {
    console.error('Error cargando tipos de productos:', error);
  }
}

// Función para crear un usuario administrador básico
async function loadUsers() {
  console.log('Cargando usuarios básicos...');
  
  const users = [
    {
      email: 'admin@mfloralok.com',
      role: 'admin',
      name: 'Administrador',
      createdAt: new Date()
    }
  ];
  
  try {
    for (const user of users) {
      await addDoc(collection(db, 'users'), user);
      console.log(`✓ Usuario cargado: ${user.name}`);
    }
    
    console.log(`✓ Se cargaron ${users.length} usuarios`);
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

// Función principal
async function loadInitialData() {
  console.log('===========================================');
  console.log('CARGANDO DATOS INICIALES A DESARROLLO');
  console.log('===========================================');
  
  await loadPlants();
  await loadProductTypes();
  await loadUsers();
  
  console.log('\n✓ ¡CARGA DE DATOS INICIALES COMPLETA!');
  console.log('===========================================');
  
  // Nota para el usuario
  console.log('\nNOTA: Para completar la recuperación de datos:');
  console.log('1. Revisa si tienes backups de movimientos y ventas');
  console.log('2. Contacta al equipo para obtener datos de producción');
  console.log('3. Los datos de plantas se han restaurado desde el archivo mock');
}

// Ejecutar carga
loadInitialData().catch(console.error);
