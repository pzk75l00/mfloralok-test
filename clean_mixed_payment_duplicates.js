// Script para limpiar duplicados de pagos mixtos
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, deleteDoc, getDocs } = require('firebase/firestore');

// Configuración para desarrollo
const devConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

// Inicializar aplicación
const app = initializeApp(devConfig);
const db = getFirestore(app);

// Función para obtener el monto total de un movimiento
function getTotalMovementAmount(movement) {
  if (!movement) return 0;

  // Formato nuevo con paymentMethods
  if (movement.paymentMethods && typeof movement.paymentMethods === 'object') {
    return Object.values(movement.paymentMethods).reduce((total, amount) => {
      return total + (parseFloat(amount) || 0);
    }, 0);
  }
  
  // Formato antiguo
  return parseFloat(movement.total) || 0;
}

// Función para detectar duplicados de pagos mixtos
function findMixedPaymentDuplicates(movements) {
  const mixedPayments = movements.filter(m => m.data.paymentMethods);
  
  // Agrupar por combinación de monto total y distribución de pagos
  const groups = {};
  
  mixedPayments.forEach(doc => {
    const movement = doc.data;
    // Crear una clave única basada en el total y la distribución
    const total = getTotalMovementAmount(movement);
    const distribution = Object.entries(movement.paymentMethods)
      .filter(([, amount]) => amount > 0)
      .map(([method, amount]) => `${method}:${amount}`)
      .sort()
      .join('|');
    
    const key = `${movement.type}_${total}_${distribution}`;
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push({ id: doc.id, data: movement });
  });
  
  // Encontrar grupos con duplicados
  const duplicates = Object.entries(groups)
    .filter(([, movements]) => movements.length > 1);
  
  return duplicates;
}

// Función principal para limpiar duplicados
async function cleanMixedPaymentDuplicates() {
  try {
    console.log('🔍 Obteniendo todos los movimientos...');
    
    const querySnapshot = await getDocs(collection(db, 'movements'));
    const movements = [];
    
    querySnapshot.forEach(doc => {
      movements.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`📊 Total movimientos: ${movements.length}`);
    
    // Encontrar duplicados de pagos mixtos
    const duplicateGroups = findMixedPaymentDuplicates(movements);
    
    console.log(`\n🚨 Grupos duplicados encontrados: ${duplicateGroups.length}`);
    
    if (duplicateGroups.length === 0) {
      console.log('✅ No se encontraron duplicados de pagos mixtos');
      return;
    }
    
    // Mostrar análisis detallado
    let totalDuplicates = 0;
    duplicateGroups.forEach(([key, group], index) => {
      const duplicatesCount = group.length - 1;
      totalDuplicates += duplicatesCount;
      
      console.log(`\n🔸 Grupo ${index + 1}: ${key}`);
      console.log(`   Repeticiones: ${group.length} (${duplicatesCount} duplicados)`);
      console.log(`   Total: $${getTotalMovementAmount(group[0].data)}`);
      console.log(`   Distribución:`, group[0].data.paymentMethods);
      console.log(`   IDs:`, group.map(item => item.id));
    });
    
    console.log(`\n⚠️ Total duplicados a eliminar: ${totalDuplicates}`);
    
    // Confirmar antes de eliminar
    console.log('\n⚠️ ATENCIÓN: Este script eliminará los duplicados de la base de datos.');
    console.log('   Se conservará el primer registro de cada grupo.');
    console.log('   Los duplicados se eliminarán permanentemente.');
    
    // En un entorno real, aquí pedirías confirmación del usuario
    // Para este script, vamos a proceder automáticamente con el ejemplo conocido
    
    let deletedCount = 0;
    
    for (const [key, group] of duplicateGroups) {
      // Conservar el primer elemento, eliminar el resto
      const toDelete = group.slice(1);
      
      console.log(`\n🗑️ Eliminando ${toDelete.length} duplicados del grupo: ${key}`);
      
      for (const item of toDelete) {
        try {
          await deleteDoc(doc(db, 'movements', item.id));
          console.log(`   ✅ Eliminado: ${item.id}`);
          deletedCount++;
        } catch (error) {
          console.error(`   ❌ Error eliminando ${item.id}:`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 Limpieza completada!`);
    console.log(`   Duplicados eliminados: ${deletedCount}`);
    console.log(`   El balance debería corregirse automáticamente.`);
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
  }
}

// Función para hacer solo análisis (sin eliminar)
async function analyzeMixedPaymentDuplicates() {
  try {
    console.log('🔍 Analizando duplicados de pagos mixtos...');
    
    const querySnapshot = await getDocs(collection(db, 'movements'));
    const movements = [];
    
    querySnapshot.forEach(doc => {
      movements.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`📊 Total movimientos: ${movements.length}`);
    
    const duplicateGroups = findMixedPaymentDuplicates(movements);
    
    console.log(`\n🚨 Análisis de duplicados:`);
    console.log(`   Grupos duplicados: ${duplicateGroups.length}`);
    
    let totalImpactEffectivo = 0;
    let totalImpactMercadoPago = 0;
    
    duplicateGroups.forEach(([key, group], index) => {
      const duplicatesCount = group.length - 1;
      const movement = group[0].data;
      const efectivo = movement.paymentMethods.efectivo || 0;
      const mercadoPago = movement.paymentMethods.mercadoPago || 0;
      
      console.log(`\n🔸 Grupo ${index + 1}:`);
      console.log(`   Tipo: ${movement.type}`);
      console.log(`   Total: $${getTotalMovementAmount(movement)}`);
      console.log(`   Repeticiones: ${group.length} (${duplicatesCount} duplicados)`);
      console.log(`   Efectivo: $${efectivo} x ${duplicatesCount} = $${efectivo * duplicatesCount}`);
      console.log(`   MercadoPago: $${mercadoPago} x ${duplicatesCount} = $${mercadoPago * duplicatesCount}`);
      
      if (movement.type === 'compra') {
        totalImpactEffectivo += efectivo * duplicatesCount;
        totalImpactMercadoPago += mercadoPago * duplicatesCount;
      }
    });
    
    console.log(`\n💰 IMPACTO TOTAL EN BALANCES:`);
    console.log(`   Efectivo se recuperaría: +$${totalImpactEffectivo}`);
    console.log(`   MercadoPago se recuperaría: +$${totalImpactMercadoPago}`);
    console.log(`   Total a recuperar: +$${totalImpactEffectivo + totalImpactMercadoPago}`);
    
  } catch (error) {
    console.error('❌ Error durante el análisis:', error);
  }
}

// Ejecutar análisis
if (process.argv.includes('--clean')) {
  cleanMixedPaymentDuplicates();
} else {
  analyzeMixedPaymentDuplicates();
}
