/**
 * Utilidades para cálculos de saldo y reportes financieros
 */
import { 
  getMovementAmountForPaymentMethod, 
  getTotalMovementAmount,
  calculateMixedPaymentBalance,
  generateDuplicateReport,
  calculateDuplicateImpact
} from './mixedPaymentUtils.js';

/**
 * Calcula el saldo total acumulado desde el inicio hasta la fecha actual
 * @param {Array} movements - Array de todos los movimientos
 * @param {string} paymentMethod - 'efectivo' o 'mercadoPago' (opcional, si no se especifica calcula ambos)
 * @returns {number} - Saldo total acumulado
 */
export const calculateTotalBalance = (movements, paymentMethod = null) => {
  if (!movements || movements.length === 0) return 0;

  console.log(`🔍 calculateTotalBalance called with ${movements.length} movements, paymentMethod: ${paymentMethod}`);

  // CRITICAL FIX: Remove duplicates by ID first
  const uniqueMovements = movements.reduce((acc, movement) => {
    if (movement.id && !acc.find(m => m.id === movement.id)) {
      acc.push(movement);
    } else if (!movement.id) {
      // Keep movements without ID (shouldn't happen but defensive programming)
      acc.push(movement);
    }
    return acc;
  }, []);

  if (uniqueMovements.length !== movements.length) {
    console.log(`⚠️ REMOVED ${movements.length - uniqueMovements.length} DUPLICATE MOVEMENTS!`);
  }

  // Use the new mixed payment calculation function
  const balance = calculateMixedPaymentBalance(uniqueMovements, paymentMethod);

  // Calculate summary statistics for debugging
  let totalVentas = 0, totalCompras = 0, totalEgresos = 0, totalGastos = 0, totalIngresos = 0;
  let largeTransactions = [];

  uniqueMovements.forEach(movement => {
    let amount = 0;
    
    if (paymentMethod) {
      amount = getMovementAmountForPaymentMethod(movement, paymentMethod);
    } else {
      amount = getTotalMovementAmount(movement);
    }

    // Track by type
    if (movement.type === 'venta') totalVentas += amount;
    else if (movement.type === 'compra') totalCompras += amount;
    else if (movement.type === 'egreso') totalEgresos += amount;
    else if (movement.type === 'gasto') totalGastos += amount;
    else if (movement.type === 'ingreso') totalIngresos += amount;

    // Track large transactions (>= 50000)
    if (amount >= 50000) {
      largeTransactions.push({ type: movement.type, amount, paymentMethod: paymentMethod || 'all' });
    }
  });

  // Log summary
  console.log(`📊 RESUMEN para ${paymentMethod || 'TODOS LOS MÉTODOS'}:`);
  console.log(`   💰 Ventas: $${totalVentas}`);
  console.log(`   🛒 Compras: $${totalCompras}`);
  console.log(`   📤 Egresos: $${totalEgresos}`);
  console.log(`   💸 Gastos: $${totalGastos}`);
  console.log(`   📥 Ingresos: $${totalIngresos}`);
  console.log(`   🔢 Balance: $${balance}`);
  
  if (largeTransactions.length > 0) {
    console.log(`   🚨 TRANSACCIONES GRANDES (>=50K): ${largeTransactions.length}`);
    largeTransactions.slice(0, 15).forEach(t => console.log(`     - ${t.type}: $${t.amount}`));
  }

  return balance;
};

/**
 * Calcula el saldo acumulado hasta una fecha específica
 * @param {Array} movements - Array de todos los movimientos
 * @param {Date} dateLimit - Fecha límite para el cálculo
 * @param {string} paymentMethod - 'efectivo' o 'mercadoPago' (opcional)
 * @returns {number} - Saldo acumulado hasta la fecha especificada
 */
export const calculateBalanceUntilDate = (movements, dateLimit, paymentMethod = null) => {
  if (!movements || movements.length === 0) return 0;

  const filteredMovements = movements.filter(movement => {
    if (!movement.date) return false;
    
    const movementDate = new Date(movement.date);
    const isBeforeOrEqualLimit = movementDate <= dateLimit;
    const hasCorrectPaymentMethod = paymentMethod ? movement.paymentMethod === paymentMethod : true;
    
    return isBeforeOrEqualLimit && hasCorrectPaymentMethod;
  });

  return calculateTotalBalance(filteredMovements);
};

/**
 * Calcula saldos separados por método de pago
 * @param {Array} movements - Array de todos los movimientos
 * @returns {Object} - { efectivo: number, mercadoPago: number, total: number }
 */
export const calculateBalanceByPaymentMethod = (movements) => {
  console.log(`💰 calculateBalanceByPaymentMethod called with ${movements?.length || 0} movements`);
  
  // Log some sample data to understand the structure
  if (movements && movements.length > 0) {
    console.log('🔍 Sample movement:', movements[0]);
    console.log('🔍 Movement types:', [...new Set(movements.map(m => m.type))]);
    
    // Check for mixed payments
    const mixedPayments = movements.filter(m => m.paymentMethods);
    const oldFormatPayments = movements.filter(m => !m.paymentMethods && m.paymentMethod);
    console.log(`🔍 Formato mixto (paymentMethods): ${mixedPayments.length} movimientos`);
    console.log(`🔍 Formato antiguo (paymentMethod): ${oldFormatPayments.length} movimientos`);
    
    // Sample mixed payment if exists
    if (mixedPayments.length > 0) {
      console.log('💳 Ejemplo pago mixto:', {
        type: mixedPayments[0].type,
        total: mixedPayments[0].total,
        paymentMethods: mixedPayments[0].paymentMethods
      });
      
      // ANÁLISIS DE DUPLICADOS DE PAGOS MIXTOS
      console.log('\n🚨 ANALIZANDO DUPLICADOS DE PAGOS MIXTOS...');
      const duplicateAnalysis = generateDuplicateReport(movements);
      
      if (duplicateAnalysis.duplicateGroups.length > 0) {
        const impact = calculateDuplicateImpact(movements);
        console.log('\n💸 IMPACTO FINANCIERO DE DUPLICADOS:');
        console.log(`   🔴 Impacto en Efectivo: +$${impact.impactEffectivo} (recuperables)`);
        console.log(`   🔴 Impacto en MercadoPago: +$${impact.impactMercadoPago} (recuperables)`);
        console.log(`   🔴 Impacto Total: +$${impact.totalImpact} (al eliminar duplicados)`);
        console.log('\n✅ BALANCE CORREGIDO SERÍA:');
        console.log(`   Efectivo actual: balance calculado + $${impact.impactEffectivo}`);
        console.log(`   MercadoPago actual: balance calculado + $${impact.impactMercadoPago}`);
      }
    }
    
    // Check for potential duplicates by looking at IDs
    const ids = movements.map(m => m.id).filter(Boolean);
    const uniqueIds = [...new Set(ids)];
    if (ids.length !== uniqueIds.length) {
      console.log('⚠️ DUPLICATE IDs DETECTED!', 'Total movements:', movements.length, 'Unique IDs:', uniqueIds.length);
    }
    
    // Check date range
    const dates = movements.map(m => m.date).filter(Boolean).sort();
    if (dates.length > 0) {
      console.log('🔍 Date range:', dates[0], '...', dates[dates.length - 1]);
    }
  }
  
  const efectivo = calculateTotalBalance(movements, 'efectivo');
  const mercadoPago = calculateTotalBalance(movements, 'mercadoPago');
  
  console.log(`💰 Resultado - Efectivo: ${efectivo}, MercadoPago: ${mercadoPago}, Total: ${efectivo + mercadoPago}`);
  
  return {
    efectivo,
    mercadoPago,
    total: efectivo + mercadoPago
  };
};

/**
 * Calcula saldos para un período específico (día, mes, etc.)
 * @param {Array} movements - Array de todos los movimientos
 * @param {string} period - 'day', 'month', 'year'
 * @param {Date} referenceDate - Fecha de referencia para el período
 * @returns {Object} - Saldos por método de pago para el período
 */
export const calculatePeriodBalance = (movements, period, referenceDate = new Date()) => {
  if (!movements || movements.length === 0) {
    return { efectivo: 0, mercadoPago: 0, total: 0 };
  }

  const filteredMovements = movements.filter(movement => {
    if (!movement.date) return false;
    
    const movementDate = new Date(movement.date);
    
    switch (period) {
      case 'day':
        return movementDate.getDate() === referenceDate.getDate() &&
               movementDate.getMonth() === referenceDate.getMonth() &&
               movementDate.getFullYear() === referenceDate.getFullYear();
      
      case 'month':
        return movementDate.getMonth() === referenceDate.getMonth() &&
               movementDate.getFullYear() === referenceDate.getFullYear();
      
      case 'year':
        return movementDate.getFullYear() === referenceDate.getFullYear();
      
      default:
        return false;
    }
  });

  return calculateBalanceByPaymentMethod(filteredMovements);
};

/**
 * Función auxiliar para obtener el monto de un movimiento por método de pago
 * @param {Object} movement - Movimiento
 * @param {string} paymentMethod - Método de pago
 * @returns {number} - Monto para ese método
 */
const getAmountForPaymentMethod = (movement, paymentMethod) => {
  // Si tiene paymentMethods (nuevo formato)
  if (movement.paymentMethods && movement.paymentMethods[paymentMethod]) {
    return Number(movement.paymentMethods[paymentMethod]) || 0;
  }
  // Si usa formato antiguo y coincide el método
  else if (movement.paymentMethod === paymentMethod) {
    return Number(movement.total) || 0; // Usar total para el monto del movimiento
  }
  return 0;
};

/**
 * Calcula totales detallados por tipo de movimiento y método de pago
 * @param {Array} movements - Array de movimientos
 * @returns {Object} - Totales detallados incluyendo gastos
 */
export const calculateDetailedTotals = (movements) => {
  const ventasEfectivo = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'efectivo'), 0);
  const ventasMP = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const comprasEfectivo = movements.filter(m => m.type === 'compra').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'efectivo'), 0);
  const comprasMP = movements.filter(m => m.type === 'compra').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const ingresosEfectivo = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'efectivo'), 0);
  const ingresosMP = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const egresosEfectivo = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'efectivo'), 0);
  const egresosMP = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const gastosEfectivo = movements.filter(m => m.type === 'gasto').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'efectivo'), 0);
  const gastosMP = movements.filter(m => m.type === 'gasto').reduce((sum, m) => sum + getAmountForPaymentMethod(m, 'mercadoPago'), 0);
  
  // Calcular saldos de caja (ingresos + ventas - egresos - compras - gastos)
  const cajaFisica = ingresosEfectivo + ventasEfectivo - comprasEfectivo - egresosEfectivo - gastosEfectivo;
  const cajaMP = ingresosMP + ventasMP - comprasMP - egresosMP - gastosMP;
  const totalGeneral = cajaFisica + cajaMP;
  
  // Cantidad de productos vendidos
  const cantidadProductosVendidos = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  
  return {
    cajaFisica,
    cajaMP,
    totalGeneral,
    cantidadProductosVendidos,
    ventasEfectivo,
    ventasMP,
    comprasEfectivo,
    comprasMP,
    ingresosEfectivo,
    ingresosMP,
    egresosEfectivo,
    egresosMP,
    gastosEfectivo,
    gastosMP
  };
};
