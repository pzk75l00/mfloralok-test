// Script para inicializar métodos de pago por defecto en Firebase
import { db } from '../firebase/firebaseConfig';
import { collection, setDoc, doc, getDocs, query, where } from 'firebase/firestore';

// Métodos de pago por defecto que se crearán en Firebase
const DEFAULT_PAYMENT_METHODS = [
  {
    name: 'Efectivo',
    code: 'efectivo',
    icon: '💰',
    color: 'text-green-600',
    isActive: true
  },
  {
    name: 'Mercado Pago',
    code: 'mercadoPago',
    icon: '📱',
    color: 'text-blue-600',
    isActive: true
  },
  {
    name: 'Transferencia',
    code: 'transferencia',
    icon: '🏦',
    color: 'text-purple-600',
    isActive: true
  },
  {
    name: 'Tarjeta de Débito',
    code: 'tarjeta',
    icon: '💳',
    color: 'text-orange-600',
    isActive: true
  }
];

/**
 * Inicializa los métodos de pago por defecto en Firebase si no existen
 */
export const initializeDefaultPaymentMethods = async () => {
  try {
    console.log('🔄 Verificando métodos de pago en Firebase...');
    
    // Verificar si ya existen métodos de pago
    const existingMethods = await getDocs(collection(db, 'paymentMethods'));
    
    if (existingMethods.empty) {
      console.log('📝 Creando métodos de pago por defecto...');
      
      // Crear los métodos por defecto
      let nextId = 1;
      for (const method of DEFAULT_PAYMENT_METHODS) {
        await setDoc(doc(db, 'paymentMethods', String(nextId)), {
          ...method,
          id: nextId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Creado método: ${method.name}`);
        nextId++;
      }
      
      console.log('🎉 Métodos de pago inicializados correctamente');
      return { success: true, created: DEFAULT_PAYMENT_METHODS.length };
    } else {
      console.log(`ℹ️ Ya existen ${existingMethods.size} métodos de pago`);
      return { success: true, created: 0, existing: existingMethods.size };
    }
  } catch (error) {
    console.error('❌ Error inicializando métodos de pago:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Migra métodos de pago hardcodeados a la nueva estructura
 */
export const migrateHardcodedPaymentMethods = async () => {
  try {
    console.log('🔄 Migrando métodos de pago hardcodeados...');
    
    // Verificar cada método por defecto
    for (const method of DEFAULT_PAYMENT_METHODS) {
      const existingQuery = query(
        collection(db, 'paymentMethods'),
        where('code', '==', method.code)
      );
      const existingDocs = await getDocs(existingQuery);
      
      if (existingDocs.empty) {
        // Calcular nuevo ID
        const allSnap = await getDocs(collection(db, 'paymentMethods'));
        const allMethods = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const newId = allMethods.length > 0 ? Math.max(...allMethods.map(m => Number(m.id) || 0)) + 1 : 1;
        // Crear el método si no existe
        await setDoc(doc(db, 'paymentMethods', String(newId)), {
          ...method,
          id: newId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log(`✅ Migrado método: ${method.name} (${method.code})`);
      }
    }
    
    console.log('🎉 Migración completada');
    return { success: true };
  } catch (error) {
    console.error('❌ Error en migración:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Obtiene información sobre el estado de los métodos de pago
 */
export const getPaymentMethodsInfo = async () => {
  try {
    const allMethods = await getDocs(collection(db, 'paymentMethods'));
    const activeMethods = await getDocs(
      query(collection(db, 'paymentMethods'), where('isActive', '==', true))
    );
    
    return {
      total: allMethods.size,
      active: activeMethods.size,
      inactive: allMethods.size - activeMethods.size,
      methods: allMethods.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error('Error obteniendo información de métodos de pago:', error);
    return { total: 0, active: 0, inactive: 0, methods: [] };
  }
};
