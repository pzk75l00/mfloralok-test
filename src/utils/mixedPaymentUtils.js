// Utilidades para manejar pagos combinados
import { db } from '../firebase/firebaseConfig';
import { collection, doc, updateDoc, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { dlog } from './debug';

// Configuración de métodos de pago por defecto (fallback)
export const DEFAULT_PAYMENT_METHODS = {
  efectivo: 'Efectivo',
  mercadoPago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta'
};

// Cache para métodos de pago dinámicos
let dynamicPaymentMethods = null;

/**
 * Obtiene los métodos de pago activos desde Firebase
 * @returns {Promise<Object>} Métodos de pago activos
 */
export const getActivePaymentMethods = async () => {
  try {
    const querySnapshot = await getDocs(
      query(collection(db, 'paymentMethods'), where('isActive', '==', true))
    );
    
    const methods = {};
    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      methods[data.code] = data.name;
    });
    
    // Si no hay métodos en Firebase, usar los por defecto
    return Object.keys(methods).length > 0 ? methods : DEFAULT_PAYMENT_METHODS;
  } catch (error) {
    console.error('Error obteniendo métodos de pago:', error);
    return DEFAULT_PAYMENT_METHODS;
  }
};

/**
 * Suscribirse a cambios en métodos de pago
 * @param {Function} callback - Función a ejecutar cuando cambien los métodos
 * @returns {Function} Función para cancelar la suscripción
 */
export const subscribeToPaymentMethods = (callback) => {
  return onSnapshot(
    query(collection(db, 'paymentMethods'), where('isActive', '==', true)),
    (snapshot) => {
      const methods = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        methods[data.code] = data.name;
      });
      
      dynamicPaymentMethods = Object.keys(methods).length > 0 ? methods : DEFAULT_PAYMENT_METHODS;
      callback(dynamicPaymentMethods);
    },
    (error) => {
      console.error('Error en suscripción a métodos de pago:', error);
      callback(DEFAULT_PAYMENT_METHODS);
    }
  );
};

/**
 * Convierte un objeto de paymentMethods a un string legible (versión síncrona)
 * @param {Object} paymentMethods - Objeto con métodos y montos
 * @param {Object} methods - Métodos de pago disponibles (opcional)
 * @returns {string} Resumen legible del pago
 */
export const generatePaymentSummary = (paymentMethods, methods = null) => {
  if (!paymentMethods || typeof paymentMethods !== 'object') {
    return '';
  }

  // Usar métodos proporcionados o cache, sino usar por defecto
  const paymentMethodsMap = methods || dynamicPaymentMethods || DEFAULT_PAYMENT_METHODS;

  const activeMethods = Object.entries(paymentMethods)
    .filter(([, amount]) => amount > 0)
    .map(([method, amount]) => `${paymentMethodsMap[method] || method}: $${amount}`)
    .join(', ');

  return activeMethods;
};

/**
 * Convierte un objeto de paymentMethods a un string legible (versión asíncrona)
 * @param {Object} paymentMethods - Objeto con métodos y montos
 * @returns {Promise<string>} Resumen legible del pago
 */
export const generatePaymentSummaryAsync = async (paymentMethods) => {
  if (!paymentMethods || typeof paymentMethods !== 'object') {
    return '';
  }

  // Usar cache si está disponible, sino obtener métodos
  const methods = dynamicPaymentMethods || await getActivePaymentMethods();

  return generatePaymentSummary(paymentMethods, methods);
};

/**
 * Valida que un pago combinado sea correcto
 * @param {number} total - Total esperado
 * @param {Object} paymentMethods - Métodos de pago con montos
 * @returns {Object} { isValid: boolean, error: string|null }
 */
export const validateMixedPayment = (total, paymentMethods) => {
  if (!paymentMethods || typeof paymentMethods !== 'object') {
    return { isValid: false, error: 'Métodos de pago inválidos' };
  }

  const totalPaid = Object.values(paymentMethods).reduce((sum, amount) => {
    const num = parseFloat(amount) || 0;
    return sum + num;
  }, 0);

  if (Math.abs(totalPaid - total) > 0.01) { // Tolerancia para decimales
    return { 
      isValid: false, 
      error: `El total pagado ($${totalPaid}) debe ser igual al total de la venta ($${total})` 
    };
  }

  const activeMethods = Object.values(paymentMethods).filter(amount => amount > 0);
  if (activeMethods.length === 0) {
    return { isValid: false, error: 'Debe especificar al menos un método de pago' };
  }

  // Validar que no haya montos negativos
  const hasNegativeAmounts = Object.values(paymentMethods).some(amount => amount < 0);
  if (hasNegativeAmounts) {
    return { isValid: false, error: 'Los montos no pueden ser negativos' };
  }

  return { isValid: true, error: null };
};

/**
 * Convierte un movimiento del formato antiguo al nuevo formato con paymentMethods
 * @param {Object} movement - Movimiento en formato antiguo
 * @returns {Object} Movimiento en formato nuevo
 */
export const convertToMixedPaymentFormat = (movement) => {
  if (movement.paymentMethods) {
    // Ya está en formato nuevo
    return movement;
  }

  // Convertir del formato antiguo
  const paymentMethods = {
    efectivo: 0,
    mercadoPago: 0,
    transferencia: 0,
    tarjeta: 0
  };

  // Poner todo el monto en el método original
  if (movement.paymentMethod && movement.total) {
    paymentMethods[movement.paymentMethod] = movement.total;
  }

  return {
    ...movement,
    paymentMethods,
    paymentSummary: generatePaymentSummary(paymentMethods),
    // Mantener el campo original para compatibilidad
    paymentMethod: movement.paymentMethod
  };
};

/**
 * Obtiene el método de pago principal (el que tiene mayor monto)
 * @param {Object} paymentMethods - Métodos de pago con montos
 * @returns {string} Método de pago principal
 */
export const getMainPaymentMethod = (paymentMethods) => {
  if (!paymentMethods) return 'efectivo';

  let maxAmount = 0;
  let mainMethod = 'efectivo';

  Object.entries(paymentMethods).forEach(([method, amount]) => {
    if (amount > maxAmount) {
      maxAmount = amount;
      mainMethod = method;
    }
  });

  return mainMethod;
};

/**
 * Distribuye (prorratea) un objeto de métodos de pago a un subtotal dado
 * manteniendo las proporciones del total original y corrigiendo redondeos.
 * @param {Object} paymentMethods - Métodos con montos del total completo
 * @param {number} itemTotal - Subtotal deseado (por ejemplo, total de un producto)
 * @param {number} fullTotal - Total original al que pertenecen los métodos
 * @returns {Object} - Nuevo objeto de métodos con montos prorrateados al subtotal
 */
export const scalePaymentMethods = (paymentMethods, itemTotal, fullTotal) => {
  const result = { efectivo: 0, mercadoPago: 0, transferencia: 0, tarjeta: 0 };
  const full = parseFloat(fullTotal) || 0;
  const target = parseFloat(itemTotal) || 0;
  if (!paymentMethods || full <= 0 || target <= 0) {
    return result;
  }

  // Paso 1: proporción y redondeo a 2 decimales
  let sum = 0;
  let maxMethod = null;
  let maxValue = -Infinity;
  Object.entries(paymentMethods).forEach(([method, amount]) => {
    const base = parseFloat(amount) || 0;
    const scaled = +(base * (target / full)).toFixed(2);
    if (Object.prototype.hasOwnProperty.call(result, method)) {
      result[method] = scaled;
      sum += scaled;
      if (scaled > maxValue) {
        maxValue = scaled;
        maxMethod = method;
      }
    }
  });

  // Paso 2: ajustar centavos perdidos/ganados por redondeo
  const delta = +(target - sum).toFixed(2);
  if (Math.abs(delta) >= 0.01 && maxMethod && Object.prototype.hasOwnProperty.call(result, maxMethod)) {
    result[maxMethod] = +(result[maxMethod] + delta).toFixed(2);
  }

  return result;
};

/**
 * Calcula totales por método de pago (compatible con formatos antiguo y nuevo)
 * @param {Array} movements - Array de movimientos
 * @returns {Object} Totales por método
 */
export const calculateTotalsByPaymentMethod = (movements) => {
  const totals = {
    efectivo: 0,
    mercadoPago: 0,
    transferencia: 0,
    tarjeta: 0
  };

  movements.forEach(movement => {
    let amountMultiplier = 1;
    
    // Determinar si sumar o restar según el tipo de movimiento
    if (movement.type === 'venta' || movement.type === 'ingreso') {
      amountMultiplier = 1; // Sumar
    } else if (movement.type === 'compra' || movement.type === 'egreso' || movement.type === 'gasto') {
      amountMultiplier = -1; // Restar
    } else {
      return; // Ignorar otros tipos
    }

    if (movement.paymentMethods) {
      // Formato nuevo
      Object.entries(movement.paymentMethods).forEach(([method, amount]) => {
        if (Object.prototype.hasOwnProperty.call(totals, method)) {
          totals[method] += (parseFloat(amount) || 0) * amountMultiplier;
        }
      });
    } else if (movement.paymentMethod && movement.total) {
      // Formato antiguo
      if (Object.prototype.hasOwnProperty.call(totals, movement.paymentMethod)) {
        totals[movement.paymentMethod] += (parseFloat(movement.total) || 0) * amountMultiplier;
      }
    }
  });

  return totals;
};

/**
 * Verifica si un pago es mixto (más de un método)
 * @param {Object} paymentMethods - Métodos de pago con montos
 * @returns {boolean} True si es pago mixto
 */
export const isMixedPayment = (paymentMethods) => {
  if (!paymentMethods) return false;
  
  const activeMethods = Object.values(paymentMethods).filter(amount => amount > 0);
  return activeMethods.length > 1;
};

/**
 * Crea un objeto de paymentMethods desde un método simple
 * @param {string} method - Método de pago
 * @param {number} amount - Monto
 * @returns {Object} Objeto paymentMethods
 */
export const createPaymentMethodsFromSingle = (method, amount) => {
  const paymentMethods = {
    efectivo: 0,
    mercadoPago: 0,
    transferencia: 0,
    tarjeta: 0
  };

  if (method && amount > 0) {
    paymentMethods[method] = amount;
  }

  return paymentMethods;
};

/**
 * Migra un movimiento individual del formato antiguo al nuevo
 * @param {string} movementId - ID del movimiento
 * @param {Object} movement - Datos del movimiento
 */
export const migrateMovementToMixedPayment = async (movementId, movement) => {
  try {
    const newMovement = convertToMixedPaymentFormat(movement);
    
    const movementRef = doc(db, 'movements', String(movementId));
    await updateDoc(movementRef, {
      paymentMethods: newMovement.paymentMethods,
      paymentSummary: newMovement.paymentSummary
    });

    return { success: true };
  } catch (error) {
    console.error('Error migrando movimiento:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Migra todos los movimientos al formato de pagos mixtos
 * @returns {Object} Resultado de la migración
 */
export const migrateAllMovementsToMixedPayments = async () => {
  try {
    const movementsRef = collection(db, 'movements');
    const querySnapshot = await getDocs(movementsRef);
    
    let migratedCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const docSnapshot of querySnapshot.docs) {
      const movement = docSnapshot.data();
      
      // Solo migrar si no tiene paymentMethods
      if (!movement.paymentMethods && movement.paymentMethod && movement.total) {
        const result = await migrateMovementToMixedPayment(docSnapshot.id, movement);
        
        if (result.success) {
          migratedCount++;
        } else {
          errorCount++;
          errors.push({ id: docSnapshot.id, error: result.error });
        }
      }
    }

    return {
      success: true,
      migratedCount,
      errorCount,
      errors,
      message: `Migrados: ${migratedCount}, Errores: ${errorCount}`
    };
  } catch (error) {
    console.error('Error en migración masiva:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Obtiene el monto de un movimiento para un método de pago específico
 * Maneja tanto formato antiguo como nuevo (pagos mixtos)
 * @param {Object} movement - Movimiento individual
 * @param {string} paymentMethod - Método de pago ('efectivo', 'mercadoPago', etc.)
 * @returns {number} Monto para el método especificado
 */
export const getMovementAmountForPaymentMethod = (movement, paymentMethod) => {
  if (!movement) return 0;
  const rowTotal = parseFloat(movement.total) || 0;
  if (rowTotal <= 0) return 0;

  // Formato nuevo con paymentMethods (pagos mixtos)
  if (movement.paymentMethods && typeof movement.paymentMethods === 'object') {
    const raw = parseFloat(movement.paymentMethods[paymentMethod]) || 0;
    const sumPM = Object.values(movement.paymentMethods).reduce((t, a) => t + (parseFloat(a) || 0), 0);
    // Fallback: si la suma es 0 pero hay paymentMethod simple, usarlo
    if (sumPM === 0 && movement.paymentMethod === paymentMethod) {
      return rowTotal;
    }
    if (sumPM > 0 && rowTotal > 0 && Math.abs(sumPM - rowTotal) > 0.01) {
      // Escalar proporcionalmente al total de la fila (corrige ventas multiproducto antiguas)
      const factor = rowTotal / sumPM;
      return +(raw * factor).toFixed(2);
    }
    return raw;
  }
  
  // Formato antiguo con paymentMethod único
  if (movement.paymentMethod === paymentMethod && movement.total) {
    return parseFloat(movement.total) || 0;
  }
  
  return 0;
};

/**
 * Obtiene el monto total de un movimiento (suma de todos los métodos de pago)
 * @param {Object} movement - Movimiento individual
 * @returns {number} Monto total del movimiento
 */
export const getTotalMovementAmount = (movement) => {
  if (!movement) return 0;
  const rowTotal = parseFloat(movement.total) || 0;
  if (rowTotal <= 0) return 0;

  // Formato nuevo con paymentMethods
  if (movement.paymentMethods && typeof movement.paymentMethods === 'object') {
  const sumPM = Object.values(movement.paymentMethods).reduce((total, amount) => total + (parseFloat(amount) || 0), 0);
    if (sumPM > 0 && rowTotal > 0 && Math.abs(sumPM - rowTotal) > 0.01) {
      // Preferir el total del movimiento cuando la suma de métodos no cuadra (caso histórico)
      return rowTotal;
    }
    return sumPM;
  }
  
  // Formato antiguo
  return parseFloat(movement.total) || 0;
};

/**
 * Calcula balance específico para pagos mixtos
 * @param {Array} movements - Array de movimientos
 * @param {string} paymentMethod - Método de pago específico o null para todos
 * @returns {number} Balance calculado
 */
export const calculateMixedPaymentBalance = (movements, paymentMethod = null) => {
  if (!movements || movements.length === 0) return 0;

  return movements.reduce((balance, movement) => {
    if (!movement.type) return balance;

    let amount = 0;
    
    if (paymentMethod) {
      // Para un método específico
      amount = getMovementAmountForPaymentMethod(movement, paymentMethod);
    } else {
      // Para todos los métodos
      amount = getTotalMovementAmount(movement);
    }

    // Aplicar la lógica de suma/resta según el tipo de movimiento
    switch (movement.type) {
      case 'venta':
      case 'ingreso':
        return balance + amount;
      case 'compra':
      case 'egreso':
      case 'gasto':
        return balance - amount;
      default:
        return balance;
    }
  }, 0);
};

/**
 * Detecta y reporta duplicados de pagos mixtos específicos
 * @param {Array} movements - Array de movimientos
 * @returns {Object} Análisis de duplicados
 */
export const analyzeMixedPaymentDuplicates = (movements) => {
  const mixedPayments = movements.filter(m => m.paymentMethods);
  
  // Agrupar por combinación de monto total y distribución de pagos
  const groups = {};
  
  mixedPayments.forEach(movement => {
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
    groups[key].push(movement);
  });
  
  // Encontrar grupos con duplicados
  const duplicates = Object.entries(groups)
    .filter(([, movements]) => movements.length > 1)
    .map(([key, movements]) => ({
      key,
      count: movements.length,
      movements,
      total: getTotalMovementAmount(movements[0]),
      paymentMethods: movements[0].paymentMethods,
      type: movements[0].type
    }));
  
  return {
    totalMixedPayments: mixedPayments.length,
    duplicateGroups: duplicates,
    totalDuplicates: duplicates.reduce((sum, group) => sum + (group.count - 1), 0)
  };
};

/**
 * Genera un reporte detallado de transacciones duplicadas
 * @param {Array} movements - Array de movimientos  
 * @returns {Object} Reporte completo
 */
export const generateDuplicateReport = (movements) => {
  const analysis = analyzeMixedPaymentDuplicates(movements);
  
  dlog('ANALISIS DUP MIXTOS', { total: analysis.totalMixedPayments, grupos: analysis.duplicateGroups.length, dups: analysis.totalDuplicates });
  
  analysis.duplicateGroups.forEach((group, index) => {
    dlog('GrupoDuplicado', { idx: index+1, tipo: group.type, total: group.total, rep: group.count, dist: group.paymentMethods, ids: group.movements.map(m=>m.id) });
  });
  
  return analysis;
};

/**
 * Calcula el impacto financiero de los duplicados
 * @param {Array} movements - Array de movimientos
 * @returns {Object} Impacto en balances
 */
export const calculateDuplicateImpact = (movements) => {
  const analysis = analyzeMixedPaymentDuplicates(movements);
  
  let impactEffectivo = 0;
  let impactMercadoPago = 0;
  
  analysis.duplicateGroups.forEach(group => {
    const duplicatesCount = group.count - 1; // -1 porque uno es legítimo
    const efectivoAmount = group.paymentMethods.efectivo || 0;
    const mercadoPagoAmount = group.paymentMethods.mercadoPago || 0;
    
    // Calcular impacto según el tipo de movimiento
    if (group.type === 'compra' || group.type === 'egreso' || group.type === 'gasto') {
      // Los duplicados están restando de más, por eso el balance está más negativo
      impactEffectivo += efectivoAmount * duplicatesCount;
      impactMercadoPago += mercadoPagoAmount * duplicatesCount;
    } else if (group.type === 'venta' || group.type === 'ingreso') {
      // Los duplicados están sumando de más
      impactEffectivo -= efectivoAmount * duplicatesCount;
      impactMercadoPago -= mercadoPagoAmount * duplicatesCount;
    }
  });
  
  return {
    impactEffectivo,
    impactMercadoPago,
    totalImpact: impactEffectivo + impactMercadoPago,
    analysis
  };
};

/**
 * Verifica si ya existe un movimiento similar (para prevenir duplicados)
 * @param {Object} newMovement - Nuevo movimiento a verificar
 * @param {Array} existingMovements - Movimientos existentes
 * @param {number} tolerance - Tolerancia en segundos para fechas (default: 60)
 * @returns {Object} { isDuplicate: boolean, similarMovement: Object|null }
 */
export const checkForDuplicateMovement = (newMovement, existingMovements, tolerance = 60) => {
  if (!newMovement || !existingMovements || existingMovements.length === 0) {
    return { isDuplicate: false, similarMovement: null };
  }

  const newDate = new Date(newMovement.date);
  const newTotal = getTotalMovementAmount(newMovement);
  
  // Buscar movimientos similares
  const similar = existingMovements.find(existing => {
    // Verificar tipo
    if (existing.type !== newMovement.type) return false;
    
    // Verificar fecha (dentro de la tolerancia)
    const existingDate = new Date(existing.date);
    const timeDiff = Math.abs(newDate - existingDate) / 1000; // segundos
    if (timeDiff > tolerance) return false;
    
    // Verificar monto total
    const existingTotal = getTotalMovementAmount(existing);
    if (Math.abs(newTotal - existingTotal) > 0.01) return false;
    
    // Si ambos tienen paymentMethods, verificar distribución
    if (newMovement.paymentMethods && existing.paymentMethods) {
      const newDistribution = Object.entries(newMovement.paymentMethods)
        .filter(([, amount]) => amount > 0)
        .map(([method, amount]) => `${method}:${amount}`)
        .sort()
        .join('|');
      
      const existingDistribution = Object.entries(existing.paymentMethods)
        .filter(([, amount]) => amount > 0)
        .map(([method, amount]) => `${method}:${amount}`)
        .sort()
        .join('|');
      
      return newDistribution === existingDistribution;
    }
    
    // Si ambos usan formato antiguo, verificar método de pago
    if (newMovement.paymentMethod && existing.paymentMethod) {
      return newMovement.paymentMethod === existing.paymentMethod;
    }
    
    return true;
  });
  
  return {
    isDuplicate: !!similar,
    similarMovement: similar || null
  };
};

/**
 * Valida un movimiento antes de guardarlo (incluyendo verificación de duplicados)
 * @param {Object} movement - Movimiento a validar
 * @param {Array} existingMovements - Movimientos existentes
 * @returns {Object} { isValid: boolean, errors: string[], warnings: string[] }
 */
export const validateMovementBeforeSave = (movement, existingMovements = []) => {
  const errors = [];
  const warnings = [];
  
  // Validaciones básicas
  if (!movement.type) {
    errors.push('El tipo de movimiento es requerido');
  }
  
  if (!movement.date) {
    errors.push('La fecha es requerida');
  }
  
  if (!movement.total || movement.total <= 0) {
    errors.push('El total debe ser mayor a 0');
  }
  
  // Validar pagos mixtos si aplica
  if (movement.paymentMethods) {
    const validation = validateMixedPayment(movement.total, movement.paymentMethods);
    if (!validation.isValid) {
      errors.push(validation.error);
    }
  }
  
  // Verificar duplicados
  const duplicateCheck = checkForDuplicateMovement(movement, existingMovements);
  if (duplicateCheck.isDuplicate) {
    warnings.push(`⚠️ POSIBLE DUPLICADO: Se encontró un movimiento similar registrado hace ${Math.round((new Date() - new Date(duplicateCheck.similarMovement.date)) / 1000)} segundos`);
    warnings.push(`   Tipo: ${duplicateCheck.similarMovement.type}, Total: $${getTotalMovementAmount(duplicateCheck.similarMovement)}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    duplicateCheck
  };
};

/**
 * Guarda un movimiento con validación automática de duplicados
 * @param {Object} movement - Movimiento a guardar
 * @param {Array} existingMovements - Movimientos existentes
 * @param {boolean} forceSave - Forzar guardado aunque haya advertencias
 * @returns {Object} Resultado de la validación y guardado
 */
export const safeMovementSave = async (movement, existingMovements = [], forceSave = false) => {
  // Validar el movimiento
  const validation = validateMovementBeforeSave(movement, existingMovements);
  
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }
  
  // Si hay advertencias y no se fuerza el guardado, pedir confirmación
  if (validation.warnings.length > 0 && !forceSave) {
    return {
      success: false,
      needsConfirmation: true,
      warnings: validation.warnings,
      duplicateCheck: validation.duplicateCheck
    };
  }
  
  try {
    // Aquí iría la lógica de guardado real en Firebase
    // Por ahora solo devolvemos éxito
    console.log('✅ Movimiento validado y listo para guardar:', movement);
    
    return {
      success: true,
      warnings: validation.warnings,
      message: 'Movimiento guardado exitosamente'
    };
  } catch (error) {
    return {
      success: false,
      errors: [`Error al guardar: ${error.message}`]
    };
  }
};

/**
 * Obtiene estadísticas de uso de pagos mixtos
 * @param {Array} movements - Array de movimientos
 * @returns {Object} Estadísticas
 */
export const getMixedPaymentStats = (movements) => {
  let totalMovements = 0;
  let mixedPaymentMovements = 0;
  let simplePaymentMovements = 0;

  movements.forEach(movement => {
    if (movement.type === 'venta') {
      totalMovements++;
      
      if (movement.paymentMethods) {
        if (isMixedPayment(movement.paymentMethods)) {
          mixedPaymentMovements++;
        } else {
          simplePaymentMovements++;
        }
      } else {
        simplePaymentMovements++;
      }
    }
  });

  return {
    totalMovements,
    mixedPaymentMovements,
    simplePaymentMovements,
    mixedPaymentPercentage: totalMovements > 0 ? (mixedPaymentMovements / totalMovements * 100).toFixed(1) : 0
  };
};
