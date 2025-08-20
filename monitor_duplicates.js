// Monitor automático para detectar y alertar sobre duplicados
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

const app = initializeApp(devConfig);
const db = getFirestore(app);

// Función para obtener el monto total de un movimiento
function getTotalMovementAmount(movement) {
  if (!movement) return 0;

  if (movement.paymentMethods && typeof movement.paymentMethods === 'object') {
    return Object.values(movement.paymentMethods).reduce((total, amount) => {
      return total + (parseFloat(amount) || 0);
    }, 0);
  }
  
  return parseFloat(movement.total) || 0;
}

// Monitor de duplicados con alertas
async function monitorDuplicates() {
  try {
    console.log('🔍 Monitoreando base de datos en busca de duplicados...');
    
    const querySnapshot = await getDocs(collection(db, 'movements'));
    const movements = [];
    
    querySnapshot.forEach(doc => {
      movements.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    console.log(`📊 Total movimientos analizados: ${movements.length}`);
    
    // Buscar duplicados por ID (más crítico)
    const ids = movements.map(m => m.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      console.log('🚨 ALERTA CRÍTICA: Duplicados por ID detectados!');
      console.log('   IDs duplicados:', duplicateIds);
    }
    
    // Buscar duplicados de pagos mixtos
    const mixedPayments = movements.filter(m => m.data.paymentMethods);
    const groups = {};
    
    mixedPayments.forEach(doc => {
      const movement = doc.data;
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
    
    const duplicateGroups = Object.entries(groups)
      .filter(([, movements]) => movements.length > 1);
    
    if (duplicateGroups.length > 0) {
      console.log('\n🚨 ALERTA: Duplicados de pagos mixtos detectados!');
      
      duplicateGroups.forEach(([key, group], index) => {
        console.log(`\n🔸 Grupo ${index + 1}: ${key}`);
        console.log(`   Repeticiones: ${group.length}`);
        console.log(`   IDs:`, group.map(item => item.id));
        
        // Verificar si son duplicados recientes (últimas 24 horas)
        const recent = group.filter(item => {
          const date = new Date(item.data.date);
          const now = new Date();
          const diffHours = (now - date) / (1000 * 60 * 60);
          return diffHours <= 24;
        });
        
        if (recent.length > 1) {
          console.log(`   ⚠️ ${recent.length} duplicados son RECIENTES (últimas 24h)`);
        }
      });
      
      console.log('\n💡 Sugerencia: Ejecuta el script de limpieza si es necesario:');
      console.log('   node clean_mixed_payment_duplicates.js --clean');
    } else {
      console.log('\n✅ No se detectaron duplicados de pagos mixtos');
    }
    
    // Buscar patrones sospechosos
    const recentMovements = movements.filter(m => {
      const date = new Date(m.data.date);
      const now = new Date();
      const diffMinutes = (now - date) / (1000 * 60);
      return diffMinutes <= 5; // Últimos 5 minutos
    });
    
    if (recentMovements.length > 5) {
      console.log('\n⚠️ ALERTA: Alta actividad reciente detectada');
      console.log(`   ${recentMovements.length} movimientos en los últimos 5 minutos`);
      console.log('   Verificar si son registros legítimos');
    }
    
    console.log('\n📊 RESUMEN DEL MONITOREO:');
    console.log(`   Total movimientos: ${movements.length}`);
    console.log(`   Pagos mixtos: ${mixedPayments.length}`);
    console.log(`   Grupos duplicados: ${duplicateGroups.length}`);
    console.log(`   Movimientos recientes: ${recentMovements.length}`);
    
  } catch (error) {
    console.error('❌ Error durante el monitoreo:', error);
  }
}

// Ejecutar monitoreo
monitorDuplicates();
