/**
 * Utilidades para cálculos de saldo y reportes financieros
 */

/**
 * Calcula el saldo total acumulado desde el inicio hasta la fecha actual
 * @param {Array} movements - Array de todos los movimientos
 * @param {string} paymentMethod - 'efectivo' o 'mercadoPago' (opcional, si no se especifica calcula ambos)
 * @returns {number} - Saldo total acumulado
 */
export const calculateTotalBalance = (movements, paymentMethod = null) => {
  if (!movements || movements.length === 0) return 0;

  const filteredMovements = paymentMethod 
    ? movements.filter(m => m.paymentMethod === paymentMethod)
    : movements;

  return filteredMovements.reduce((balance, movement) => {
    const amount = Number(movement.total) || 0;
    
    // Sumar: ventas e ingresos
    if (movement.type === 'venta' || movement.type === 'ingreso') {
      return balance + amount;
    }
    
    // Restar: compras, egresos y gastos
    if (movement.type === 'compra' || movement.type === 'egreso' || movement.type === 'gasto') {
      return balance - amount;
    }
    
    return balance;
  }, 0);
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
  const efectivo = calculateTotalBalance(movements, 'efectivo');
  const mercadoPago = calculateTotalBalance(movements, 'mercadoPago');
  
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
 * Calcula totales detallados por tipo de movimiento y método de pago
 * @param {Array} movements - Array de movimientos
 * @returns {Object} - Totales detallados incluyendo gastos
 */
export const calculateDetailedTotals = (movements) => {
  const ventasEfectivo = movements.filter(m => m.type === 'venta' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const ventasMP = movements.filter(m => m.type === 'venta' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const comprasEfectivo = movements.filter(m => m.type === 'compra' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const comprasMP = movements.filter(m => m.type === 'compra' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const ingresosEfectivo = movements.filter(m => m.type === 'ingreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const ingresosMP = movements.filter(m => m.type === 'ingreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const egresosEfectivo = movements.filter(m => m.type === 'egreso' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const egresosMP = movements.filter(m => m.type === 'egreso' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosEfectivo = movements.filter(m => m.type === 'gasto' && m.paymentMethod === 'efectivo').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  const gastosMP = movements.filter(m => m.type === 'gasto' && m.paymentMethod === 'mercadoPago').reduce((sum, m) => sum + (Number(m.total) || 0), 0);
  
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
