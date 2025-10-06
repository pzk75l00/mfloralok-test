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

  // Optional: filter likely duplicate mixed-payments created within a short window
  const byDate = [...uniqueMovements].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
  const toleranceSec = 45; // reducir tolerancia por seguridad
  const filtered = [];
  for (let i = 0; i < byDate.length; i++) {
    const curr = byDate[i];
    const currDate = new Date(curr.date || 0);
    const currTotal = getTotalMovementAmount(curr);
    const dist = curr.paymentMethods
      ? Object.entries(curr.paymentMethods)
          .filter(([, amount]) => (parseFloat(amount) || 0) > 0)
          .map(([method, amount]) => `${method}:${parseFloat(amount) || 0}`)
          .sort()
          .join('|')
      : curr.paymentMethod || 'single';

    // Construir firma de productos / detalle para diferenciar operaciones legítimas con mismo total
    const productSignature = (() => {
      try {
        if (Array.isArray(curr.products) && curr.products.length > 0) {
          return curr.products.map(p => `${p.plantId || p.id || 'x'}:${p.quantity || 0}`).sort().join(',');
        }
        if (curr.plantId) return `single:${curr.plantId}:${curr.quantity || 0}`;
        return `detail:${(curr.detail || curr.notes || '').substring(0,40)}`;
      } catch { return 'na'; }
    })();

    const isDup = filtered.some(prev => {
      if (prev.type !== curr.type) return false;
      // Solo aplicamos heurística de duplicados para ventas e ingresos (evitamos filtrar compras/egresos/gastos legítimos)
      if (!(curr.type === 'venta' || curr.type === 'ingreso')) return false;
      const prevDate = new Date(prev.date || 0);
      const secs = Math.abs((currDate - prevDate) / 1000);
      if (secs > toleranceSec) return false;
      const prevTotal = getTotalMovementAmount(prev);
      if (Math.abs(prevTotal - currTotal) > 0.01) return false;
      const prevDist = prev.paymentMethods
        ? Object.entries(prev.paymentMethods)
            .filter(([, amount]) => (parseFloat(amount) || 0) > 0)
            .map(([method, amount]) => `${method}:${parseFloat(amount) || 0}`)
            .sort()
            .join('|')
        : prev.paymentMethod || 'single';
      if (prevDist !== dist) return false;
      // Diferenciar por firma de productos/detalle
      const prevProductSig = (() => {
        try {
          if (Array.isArray(prev.products) && prev.products.length > 0) {
            return prev.products.map(p => `${p.plantId || p.id || 'x'}:${p.quantity || 0}`).sort().join(',');
          }
          if (prev.plantId) return `single:${prev.plantId}:${prev.quantity || 0}`;
          return `detail:${(prev.detail || prev.notes || '').substring(0,40)}`;
        } catch { return 'na'; }
      })();
      if (prevProductSig !== productSignature) return false;
      return true;
    });
    if (!isDup) filtered.push(curr); else {
      console.log('🟡 Heurística duplicado ignorado (solo ventas/ingresos):', { id: curr.id, type: curr.type, total: currTotal });
    }
  }

  // Use the new mixed payment calculation function sobre la lista filtrada
  const balance = calculateMixedPaymentBalance(filtered, paymentMethod);

  // Calculate summary statistics for debugging
  let totalVentas = 0, totalCompras = 0, totalEgresos = 0, totalGastos = 0, totalIngresos = 0;
  let largeTransactions = [];

  filtered.forEach(movement => {
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
 * Versión NORMALIZADA: calcula saldo acumulado hasta una fecha usando la lógica unificada
 * y permitiendo filtrar por método correctamente incluso con pagos mixtos.
 * Importante: aquí NO filtramos por movement.paymentMethod, solo por fecha.
 * El método se aplica dentro de calculateTotalBalance para considerar paymentMethods.
 * @param {Array} movements
 * @param {Date} dateLimit - fecha límite INCLUSIVA
 * @param {'efectivo'|'mercadoPago'|null} paymentMethod
 * @returns {number}
 */
export const calculateBalanceUntilDateNormalized = (movements, dateLimit, paymentMethod = null) => {
  if (!movements || movements.length === 0) return 0;
  const filteredMovements = movements.filter(movement => {
    if (!movement?.date) return false;
    const movementDate = new Date(movement.date);
    return movementDate <= dateLimit; // sólo recortamos por fecha
  });
  return calculateTotalBalance(filteredMovements, paymentMethod);
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

// Nota: usamos getMovementAmountForPaymentMethod de mixedPaymentUtils
// que además corrige casos históricos prorrateando si la suma de métodos
// no coincide con el total de la fila.

/**
 * Calcula totales detallados por tipo de movimiento y método de pago
 * @param {Array} movements - Array de movimientos
 * @returns {Object} - Totales detallados incluyendo gastos
 */
export const calculateDetailedTotals = (movements) => {
  console.log('🔥 calculateDetailedTotals - Total movimientos:', movements.length);
  const ventasEfectivo = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'efectivo'), 0);
  const ventasMP = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const comprasEfectivo = movements.filter(m => m.type === 'compra').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'efectivo'), 0);
  const comprasMP = movements.filter(m => m.type === 'compra').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const ingresosEfectivo = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'efectivo'), 0);
  const ingresosMP = movements.filter(m => m.type === 'ingreso').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const egresosEfectivo = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'efectivo'), 0);
  const egresosMP = movements.filter(m => m.type === 'egreso').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'mercadoPago'), 0);
  const gastosEfectivo = movements.filter(m => m.type === 'gasto').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'efectivo'), 0);
  const gastosMP = movements.filter(m => m.type === 'gasto').reduce((sum, m) => sum + getMovementAmountForPaymentMethod(m, 'mercadoPago'), 0);
  
  console.log('🔥 calculateDetailedTotals EFECTIVO:', {
    ventas: ventasEfectivo,
    compras: comprasEfectivo,
    ingresos: ingresosEfectivo,
    egresos: egresosEfectivo,
    gastos: gastosEfectivo
  });
  console.log('🔥 calculateDetailedTotals MERCADO PAGO:', {
    ventas: ventasMP,
    compras: comprasMP,
    ingresos: ingresosMP,
    egresos: egresosMP,
    gastos: gastosMP
  });
  
  // Calcular saldos de caja (ingresos + ventas - egresos - compras - gastos)
  const cajaFisica = ingresosEfectivo + ventasEfectivo - comprasEfectivo - egresosEfectivo - gastosEfectivo;
  const cajaMP = ingresosMP + ventasMP - comprasMP - egresosMP - gastosMP;
  const totalGeneral = cajaFisica + cajaMP;
  
  console.log('🔥 calculateDetailedTotals RESULTADO FINAL:', {
    cajaFisica,
    cajaMP,
    totalGeneral
  });
  
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

/**
 * Wrapper que devuelve totales disponibles usando la lógica "contable"
 * (aplica limpieza/normalización usada por calculateTotalBalance)
 * Devuelve la misma forma mínima que usa la UI: { cajaFisica, cajaMP, totalGeneral, cantidadProductosVendidos }
 * @param {Array} movements - movimientos ya filtrados para el periodo deseado
 */
export const calculateAvailableTotalsFromFiltered = (movements) => {
  if (!movements || movements.length === 0) {
    return {
      cajaFisica: 0,
      cajaMP: 0,
      totalGeneral: 0,
      cantidadProductosVendidos: 0
    };
  }

  // Reuse existing normalized calculation which removes duplicates y normaliza pagos mixtos
  const balanceByMethod = calculateBalanceByPaymentMethod(movements);

  // Cantidad de productos vendidos (suma de quantity en ventas)
  const cantidadProductosVendidos = movements.filter(m => m.type === 'venta').reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);
  try {
    const diag = movements.map(m => ({
      id: m.id,
      type: m.type,
      total: m.total,
      pm: m.paymentMethods,
      simple: m.paymentMethod,
      mp: (m.paymentMethods && m.paymentMethods.mercadoPago) ? m.paymentMethods.mercadoPago : (m.paymentMethod==='mercadoPago'?m.total:0)
    }));
    const mpSigned = diag.reduce((acc,x)=>acc + ((x.type==='compra'||x.type==='egreso'||x.type==='gasto')?-(parseFloat(x.mp)||0):(parseFloat(x.mp)||0)),0);
    console.log('🔎 DIAG MP movements (filtered set):', diag);
    console.log('🔎 MP signed sum (raw):', mpSigned, ' -> balance calc MP:', balanceByMethod.mercadoPago);
  } catch(e){ console.log('Diag MP error', e); }

  return {
    cajaFisica: balanceByMethod.efectivo || 0,
    cajaMP: balanceByMethod.mercadoPago || 0,
    totalGeneral: (balanceByMethod.efectivo || 0) + (balanceByMethod.mercadoPago || 0),
    cantidadProductosVendidos
  };
};

/**
 * Genera un desglose mensual acumulado por método (efectivo/mercadoPago) desde el arranque
 * Devuelve por cada mes: inflow, outflow, net, start, end y key YYYY-MM, usando pagos mixtos normalizados.
 * @param {Array} movements
 * @param {'efectivo'|'mercadoPago'} method
 */
export const computeMonthlyRunningByMethod = (movements, method = 'mercadoPago') => {
  if (!movements || movements.length === 0) return [];

  // 1) Agregar por mes entradas/salidas según tipo de movimiento
  const monthly = new Map();
  for (const m of movements) {
    if (!m?.date) continue;
    const amount = getMovementAmountForPaymentMethod(m, method);
    if (!amount || amount === 0) continue;
    const d = new Date(m.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!monthly.has(key)) monthly.set(key, { key, year: d.getFullYear(), month: d.getMonth() + 1, inflow: 0, outflow: 0, net: 0, start: 0, end: 0 });
    const row = monthly.get(key);
    // Determinar signo contable
    const isInflow = m.type === 'venta' || m.type === 'ingreso';
    const isOutflow = m.type === 'compra' || m.type === 'egreso' || m.type === 'gasto';
    if (isInflow) row.inflow += amount;
    else if (isOutflow) row.outflow += amount;
    // otros tipos quedan neutros
  }
  // 2) Ordenar por fecha y calcular net/start/end acumulado
  const ordered = Array.from(monthly.values()).sort((a, b) => (a.year - b.year) || (a.month - b.month));
  let running = 0;
  for (const row of ordered) {
    row.net = row.inflow - row.outflow;
    row.start = running;
    row.end = row.start + row.net;
    running = row.end;
  }
  return ordered;
};
