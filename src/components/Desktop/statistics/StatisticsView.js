import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList, Cell, LineChart, Line } from 'recharts';

const COLORS = [
  '#38a169', '#3182ce', '#e53e3e', '#d69e2e', '#805ad5', '#319795', '#f56565', '#ecc94b', '#4fd1c5', '#f6ad55', '#63b3ed', '#b794f4'
];

// Utilidad para mostrar el mes en español
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatMes(mesKey) {
  // mesKey: '2025-05'
  const [year, month] = mesKey.split('-');
  return `${MONTHS_ES[parseInt(month, 10) - 1]} ${year}`;
}

const StatisticsView = () => {
  const [movements, setMovements] = useState([]);
  const [plants, setPlants] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [monthlyProducts, setMonthlyProducts] = useState([]);
  const [kpis, setKpis] = useState({ ventas: 0, compras: 0, ingresos: 0, egresos: 0, gastos: 0 });
  const [startMonth, setStartMonth] = useState(null); // mes de inicio para filtrar
  // Nuevos estados para análisis adicionales
  const [productProfitability, setProductProfitability] = useState([]);
  const [dailyCashFlow, setDailyCashFlow] = useState([]);
  const [paymentMethodStats, setPaymentMethodStats] = useState({ efectivo: 0, mercadoPago: 0 });
  
  // Estados para las nuevas estadísticas
  const [monthlyProductProfitability, setMonthlyProductProfitability] = useState([]);
  const [purchaseRecommendations, setPurchaseRecommendations] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stagnantProducts, setStagnantProducts] = useState([]);
  const [trendAnalysis, setTrendAnalysis] = useState([]);
  
  // Estados para estadísticas adicionales (punto 3, 4, 5)
  const [locationAnalysis, setLocationAnalysis] = useState([]);
  const [timePatterns, setTimePatterns] = useState([]);
  const [productLifecycle, setProductLifecycle] = useState([]);
  
  // Estado para ROI por producto
  const [productROI, setProductROI] = useState([]);

  // Año actual y anterior
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const prevYear = currentYear - 1;

  useEffect(() => {
    const unsubMovements = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data);
    });
    const unsubPlants = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => { unsubMovements(); unsubPlants(); };
  }, []);

  useEffect(() => {
    // Agrupar ventas por mes y calcular KPIs
    const salesByMonth = {};
    const productsByMonth = {};
    let ventas = 0, compras = 0, ingresos = 0, egresos = 0, gastos = 0;
    let efectivo = 0, mp = 0;
    
    // Fechas para filtrar el mes actual
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    movements.forEach(mov => {
      if (!mov.date) return;
      const d = new Date(mov.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!salesByMonth[key]) salesByMonth[key] = { mes: key, ventas: 0 };
      if (!productsByMonth[key]) productsByMonth[key] = { mes: key, productos: 0 };
      
      // KPIs solo del mes actual
      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      
      if (mov.type === 'venta') {
        salesByMonth[key].ventas += mov.total ? Number(mov.total) : 0;
        // Sumar cantidad de productos vendidos
        if (Array.isArray(mov.products)) {
          productsByMonth[key].productos += mov.products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        } else if (mov.quantity) {
          productsByMonth[key].productos += Number(mov.quantity);
        }
        if (isCurrentMonth) ventas += mov.total ? Number(mov.total) : 0;
      }
      if (mov.type === 'compra' && isCurrentMonth) compras += mov.total ? Number(mov.total) : 0;
      if (mov.type === 'ingreso' && isCurrentMonth) ingresos += mov.total ? Number(mov.total) : 0;
      if (mov.type === 'egreso' && isCurrentMonth) egresos += mov.total ? Number(mov.total) : 0;
      if (mov.type === 'gasto' && isCurrentMonth) gastos += mov.total ? Number(mov.total) : 0;
      
      // Calcular saldos TOTALES (acumulados desde el inicio)
      if (mov.paymentMethod === 'efectivo') {
        if (mov.type === 'venta' || mov.type === 'ingreso') efectivo += mov.total ? Number(mov.total) : 0;
        if (mov.type === 'compra' || mov.type === 'egreso' || mov.type === 'gasto') efectivo -= mov.total ? Number(mov.total) : 0;
      }
      if (mov.paymentMethod === 'mercadoPago') {
        if (mov.type === 'venta' || mov.type === 'ingreso') mp += mov.total ? Number(mov.total) : 0;
        if (mov.type === 'compra' || mov.type === 'egreso' || mov.type === 'gasto') mp -= mov.total ? Number(mov.total) : 0;
      }
    });
    setMonthlySales(Object.values(salesByMonth).sort((a,b) => a.mes.localeCompare(b.mes)));
    setMonthlyProducts(Object.values(productsByMonth).sort((a,b) => a.mes.localeCompare(b.mes)));
    setKpis({ ventas, compras, ingresos, egresos, gastos, efectivo, mp });

    // --- ANÁLISIS DE RENTABILIDAD POR PRODUCTO ---
    const productStats = {};
    movements.filter(mov => mov.type === 'venta' && mov.plantId).forEach(sale => {
      const plantId = String(sale.plantId);
      const plant = plants.find(p => String(p.id) === plantId);
      if (plant) {
        if (!productStats[plantId]) {
          productStats[plantId] = {
            name: plant.name,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          };
        }
        const qty = Number(sale.quantity) || 0;
        const revenue = sale.total ? Number(sale.total) : (Number(sale.price) * qty) || 0;
        const cost = Number(plant.basePrice) * qty || 0; // ✅ CORREGIDO: basePrice es el costo real
        
        productStats[plantId].quantitySold += qty;
        productStats[plantId].revenue += revenue;
        productStats[plantId].cost += cost;
        productStats[plantId].profit = productStats[plantId].revenue - productStats[plantId].cost;
        productStats[plantId].margin = productStats[plantId].revenue > 0 
          ? ((productStats[plantId].profit / productStats[plantId].revenue) * 100) 
          : 0;
      }
    });
    const profitabilityData = Object.values(productStats)
      .filter(p => p.quantitySold > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
    setProductProfitability(profitabilityData);

    // --- ANÁLISIS DE FLUJO DE CAJA DIARIO DEL MES ---
    const dailyFlow = {};
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // Inicializar todos los días del mes
    for (let day = 1; day <= daysInMonth; day++) {
      dailyFlow[day] = { day, ingresos: 0, egresos: 0, neto: 0 };
    }
    
    movements.forEach(mov => {
      if (!mov.date) return;
      const d = new Date(mov.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const day = d.getDate();
        const amount = Number(mov.total) || 0;
        
        if (mov.type === 'venta' || mov.type === 'ingreso') {
          dailyFlow[day].ingresos += amount;
        } else if (mov.type === 'compra' || mov.type === 'egreso' || mov.type === 'gasto') {
          dailyFlow[day].egresos += amount;
        }
        dailyFlow[day].neto = dailyFlow[day].ingresos - dailyFlow[day].egresos;
      }
    });
    setDailyCashFlow(Object.values(dailyFlow));

    // --- ANÁLISIS DE MÉTODOS DE PAGO DEL MES ---
    let efectivoMes = 0, mpMes = 0;
    movements.forEach(mov => {
      if (!mov.date) return;
      const d = new Date(mov.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && mov.type === 'venta') {
        const amount = Number(mov.total) || 0;
        if (mov.paymentMethod === 'efectivo') efectivoMes += amount;
        if (mov.paymentMethod === 'mercadoPago') mpMes += amount;
      }
    });
    setPaymentMethodStats({ efectivo: efectivoMes, mercadoPago: mpMes });

    // --- GANANCIA POR PRODUCTO DEL MES ACTUAL ---
    const monthlyProductStats = {};
    movements.filter(mov => {
      if (!mov.date || mov.type !== 'venta' || !mov.plantId) return false;
      const d = new Date(mov.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).forEach(sale => {
      const plantId = String(sale.plantId);
      const plant = plants.find(p => String(p.id) === plantId);
      if (plant) {
        if (!monthlyProductStats[plantId]) {
          monthlyProductStats[plantId] = {
            name: plant.name,
            quantitySold: 0,
            revenue: 0,
            cost: 0,
            profit: 0,
            margin: 0
          };
        }
        const qty = Number(sale.quantity) || 0;
        const revenue = sale.total ? Number(sale.total) : (Number(sale.price) * qty) || 0;
        const cost = Number(plant.basePrice) * qty || 0;
        
        monthlyProductStats[plantId].quantitySold += qty;
        monthlyProductStats[plantId].revenue += revenue;
        monthlyProductStats[plantId].cost += cost;
        monthlyProductStats[plantId].profit = monthlyProductStats[plantId].revenue - monthlyProductStats[plantId].cost;
        monthlyProductStats[plantId].margin = monthlyProductStats[plantId].revenue > 0 
          ? ((monthlyProductStats[plantId].profit / monthlyProductStats[plantId].revenue) * 100) 
          : 0;
      }
    });
    const monthlyProfitability = Object.values(monthlyProductStats)
      .filter(p => p.quantitySold > 0)
      .sort((a, b) => b.profit - a.profit);
    setMonthlyProductProfitability(monthlyProfitability);

    // --- RECOMENDACIONES DE COMPRA ---
    const recommendations = [];
    // Obtener ventas de los últimos 3 meses para calcular promedio
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    plants.forEach(plant => {
      // Calcular ventas promedio de los últimos 3 meses
      const salesLast3Months = movements.filter(mov => {
        if (!mov.date || mov.type !== 'venta' || String(mov.plantId) !== String(plant.id)) return false;
        const d = new Date(mov.date);
        return d >= threeMonthsAgo;
      });
      
      const totalSold = salesLast3Months.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
      const avgSalesPerMonth = totalSold / 3;
      
      if (avgSalesPerMonth > 0) {
        const currentStock = Number(plant.stock) || 0;
        const rotationVelocity = currentStock > 0 ? Math.round(30 / (avgSalesPerMonth / currentStock)) : 999;
        const expectedProfit = avgSalesPerMonth * ((Number(plant.purchasePrice) || 0) - (Number(plant.basePrice) || 0));
        
        let priority = 'Baja';
        if (currentStock <= 2 && avgSalesPerMonth >= 3) priority = 'Alta';
        else if (currentStock <= 5 && avgSalesPerMonth >= 2) priority = 'Media';
        
        recommendations.push({
          name: plant.name,
          currentStock,
          avgSalesPerMonth: avgSalesPerMonth.toFixed(1),
          rotationVelocity: rotationVelocity === 999 ? 'N/A' : rotationVelocity,
          priority,
          suggestedProfit: Math.round(expectedProfit),
          score: avgSalesPerMonth - (currentStock * 0.1) // Score para ordenar
        });
      }
    });
    
    const sortedRecommendations = recommendations
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
    setPurchaseRecommendations(sortedRecommendations);

    // --- ALERTAS DE INVENTARIO ---
    const lowStock = plants.filter(plant => (Number(plant.stock) || 0) <= 2);
    setLowStockProducts(lowStock);
    
    // Productos sin ventas en los últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const stagnant = plants.filter(plant => {
      const hasRecentSales = movements.some(mov => {
        if (!mov.date || mov.type !== 'venta' || String(mov.plantId) !== String(plant.id)) return false;
        const d = new Date(mov.date);
        return d >= thirtyDaysAgo;
      });
      return !hasRecentSales && (Number(plant.stock) || 0) > 0;
    });
    setStagnantProducts(stagnant);

    // --- ANÁLISIS DE TENDENCIAS ---
    const trends = [];
    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const lastMonthEnd = new Date(currentYear, currentMonth, 0);
    
    plants.forEach(plant => {
      // Ventas del mes actual
      const currentMonthSales = movements.filter(mov => {
        if (!mov.date || mov.type !== 'venta' || String(mov.plantId) !== String(plant.id)) return false;
        const d = new Date(mov.date);
        return d >= currentMonthStart;
      }).reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
      
      // Ventas del mes anterior
      const lastMonthSales = movements.filter(mov => {
        if (!mov.date || mov.type !== 'venta' || String(mov.plantId) !== String(plant.id)) return false;
        const d = new Date(mov.date);
        return d >= lastMonthStart && d <= lastMonthEnd;
      }).reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
      
      if (lastMonthSales > 0 || currentMonthSales > 0) {
        let change = 0;
        let trend = 'stable';
        
        if (lastMonthSales === 0 && currentMonthSales > 0) {
          change = 100;
          trend = 'up';
        } else if (currentMonthSales === 0 && lastMonthSales > 0) {
          change = -100;
          trend = 'down';
        } else if (lastMonthSales > 0) {
          change = Math.round(((currentMonthSales - lastMonthSales) / lastMonthSales) * 100);
          if (change > 20) trend = 'up';
          else if (change < -20) trend = 'down';
        }
        
        trends.push({
          name: plant.name,
          currentMonthSales,
          lastMonthSales,
          change,
          trend
        });
      }
    });
    
    const sortedTrends = trends.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    setTrendAnalysis(sortedTrends);

    // --- ANÁLISIS POR LUGAR ---
    const locationStats = {};
    movements.filter(mov => mov.type === 'venta' && mov.location).forEach(sale => {
      const location = sale.location.trim();
      if (!locationStats[location]) {
        locationStats[location] = {
          name: location,
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
          avgTicket: 0,
          salesCount: 0
        };
      }
      
      const revenue = Number(sale.total) || 0;
      const quantity = Number(sale.quantity) || 0;
      
      locationStats[location].totalSales += 1;
      locationStats[location].totalRevenue += revenue;
      locationStats[location].totalQuantity += quantity;
      locationStats[location].salesCount += 1;
    });
    
    // Calcular ticket promedio y ordenar
    const locationData = Object.values(locationStats).map(loc => ({
      ...loc,
      avgTicket: loc.salesCount > 0 ? loc.totalRevenue / loc.salesCount : 0
    })).sort((a, b) => b.totalRevenue - a.totalRevenue);
    setLocationAnalysis(locationData);

    // --- PATRONES TEMPORALES ---
    const hourlyStats = Array(24).fill(0).map((_, hour) => ({ hour, sales: 0, revenue: 0 }));
    const dailyStats = Array(7).fill(0).map((_, day) => ({ 
      day, 
      dayName: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][day], 
      sales: 0, 
      revenue: 0 
    }));
    
    movements.filter(mov => mov.type === 'venta' && mov.date).forEach(sale => {
      const date = new Date(sale.date);
      const hour = date.getHours();
      const dayOfWeek = date.getDay();
      const revenue = Number(sale.total) || 0;
      
      hourlyStats[hour].sales += 1;
      hourlyStats[hour].revenue += revenue;
      
      dailyStats[dayOfWeek].sales += 1;
      dailyStats[dayOfWeek].revenue += revenue;
    });
    
    setTimePatterns({ hourlyStats, dailyStats });

    // --- CICLO DE VIDA DE PRODUCTOS ---
    const lifecycle = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    plants.forEach(plant => {
      // Determinar cuándo se agregó el producto (primera venta o compra)
      const firstMovement = movements
        .filter(mov => String(mov.plantId) === String(plant.id) && mov.date)
        .sort((a, b) => new Date(a.date) - new Date(b.date))[0];
      
      if (!firstMovement) return; // Sin movimientos, saltar
      
      const firstDate = new Date(firstMovement.date);
      const daysSinceFirst = Math.floor((now - firstDate) / (1000 * 60 * 60 * 24));
      
      // Calcular ventas totales y recientes
      const allSales = movements.filter(mov => 
        mov.type === 'venta' && String(mov.plantId) === String(plant.id)
      );
      const recentSales = allSales.filter(sale => {
        const saleDate = new Date(sale.date);
        return saleDate >= sixMonthsAgo;
      });
      
      const totalSales = allSales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
      const recentSalesCount = recentSales.reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0);
      const salesVelocity = daysSinceFirst > 0 ? totalSales / daysSinceFirst : 0;
      
      // Clasificar en ciclo de vida
      let stage = 'maduro';
      let stageColor = 'blue';
      
      if (daysSinceFirst <= 30) {
        stage = 'nuevo';
        stageColor = 'green';
      } else if (daysSinceFirst <= 90 && recentSalesCount > totalSales * 0.7) {
        stage = 'crecimiento';
        stageColor = 'green';
      } else if (recentSalesCount < totalSales * 0.1 && daysSinceFirst > 90) {
        stage = 'declive';
        stageColor = 'red';
      } else if (salesVelocity > 0.5) {
        stage = 'maduro';
        stageColor = 'blue';
      }
      
      lifecycle.push({
        name: plant.name,
        stage,
        stageColor,
        daysSinceFirst,
        totalSales,
        recentSales: recentSalesCount,
        salesVelocity: salesVelocity.toFixed(3),
        currentStock: Number(plant.stock) || 0
      });
    });
    
    const sortedLifecycle = lifecycle.sort((a, b) => {
      const stageOrder = { 'nuevo': 1, 'crecimiento': 2, 'maduro': 3, 'declive': 4 };
      return stageOrder[a.stage] - stageOrder[b.stage];
    });
    setProductLifecycle(sortedLifecycle);

    // --- ROI POR PRODUCTO ---
    const roiAnalysis = [];
    plants.forEach(plant => {
      // Calcular todas las compras del producto
      const purchases = movements.filter(mov => 
        mov.type === 'compra' && String(mov.plantId) === String(plant.id)
      );
      
      // Calcular todas las ventas del producto
      const sales = movements.filter(mov => 
        mov.type === 'venta' && String(mov.plantId) === String(plant.id)
      );
      
      if (purchases.length > 0 && sales.length > 0) {
        // Total invertido (compras)
        const totalInvested = purchases.reduce((sum, purchase) => {
          return sum + (Number(purchase.total) || 0);
        }, 0);
        
        // Total vendido (ingresos)
        const totalRevenue = sales.reduce((sum, sale) => {
          return sum + (Number(sale.total) || 0);
        }, 0);
        
        // Cantidad comprada vs vendida
        const quantityPurchased = purchases.reduce((sum, purchase) => {
          return sum + (Number(purchase.quantity) || 0);
        }, 0);
        
        const quantitySold = sales.reduce((sum, sale) => {
          return sum + (Number(sale.quantity) || 0);
        }, 0);
        
        // Calcular ROI
        const profit = totalRevenue - totalInvested;
        const roiPercentage = totalInvested > 0 ? ((profit / totalInvested) * 100) : 0;
        
        // Stock actual valuado al costo
        const currentStock = Number(plant.stock) || 0;
        const stockValue = currentStock * (Number(plant.basePrice) || 0);
        
        // ROI ajustado considerando stock actual
        const adjustedProfit = profit + stockValue;
        const adjustedROI = totalInvested > 0 ? ((adjustedProfit / totalInvested) * 100) : 0;
        
        roiAnalysis.push({
          name: plant.name,
          totalInvested,
          totalRevenue,
          profit,
          roiPercentage,
          adjustedROI,
          quantityPurchased,
          quantitySold,
          currentStock,
          stockValue,
          rotationRate: quantityPurchased > 0 ? ((quantitySold / quantityPurchased) * 100) : 0
        });
      }
    });
    
    // Ordenar por ROI ajustado (mejor ROI primero)
    const sortedROI = roiAnalysis.sort((a, b) => b.adjustedROI - a.adjustedROI);
    setProductROI(sortedROI);

  }, [movements, plants]);

  // Filtrado de los últimos 12 meses o desde el mes seleccionado
  const allMonths = monthlySales.map(m => m.mes).sort();
  let filteredSales = monthlySales;
  let filteredProducts = monthlyProducts;
  let selectableMonths = [];
  if (allMonths.length > 12) {
    selectableMonths = allMonths.slice(0, allMonths.length - 11);
    const start = startMonth || selectableMonths[selectableMonths.length - 1];
    const idx = allMonths.indexOf(start);
    filteredSales = monthlySales.slice(idx, idx + 12);
    filteredProducts = monthlyProducts.slice(idx, idx + 12);
  } else {
    filteredSales = monthlySales;
    filteredProducts = monthlyProducts;
  }

  // Encuentra el mes con mayor ventas y mayor cantidad de productos vendidos
  const bestSalesMonth = filteredSales.reduce((max, curr) => (curr.ventas > (max?.ventas ?? 0) ? curr : max), null);
  const bestProductsMonth = filteredProducts.reduce((max, curr) => (curr.productos > (max?.productos ?? 0) ? curr : max), null);

  // --- COMPARATIVO AÑO A AÑO ---
  // Generar datos agrupados por mes (enero-diciembre) para año actual y anterior
  function getYearlyData(monthlyArr, key) {
    // key: 'ventas' o 'productos'
    const data = Array(12).fill(0).map((_, i) => ({
      mes: MONTHS_ES[i],
      [currentYear]: 0,
      [prevYear]: 0
    }));
    monthlyArr.forEach(item => {
      const [year, month] = item.mes.split('-');
      const idx = parseInt(month, 10) - 1;
      if (parseInt(year, 10) === currentYear) data[idx][currentYear] = item[key];
      if (parseInt(year, 10) === prevYear) data[idx][prevYear] = item[key];
    });
    return data;
  }
  const salesYearly = getYearlyData(monthlySales, 'ventas');
  const productsYearly = getYearlyData(monthlyProducts, 'productos');

  // Variación porcentual por mes y total
  function getYearlyVariation(yearlyData, key) {
    let totalActual = 0, totalPrev = 0;
    const variaciones = yearlyData.map(row => {
      const actual = row[currentYear] || 0;
      const prev = row[prevYear] || 0;
      totalActual += actual;
      totalPrev += prev;
      let varPct = prev === 0 ? (actual === 0 ? 0 : 100) : ((actual - prev) / prev) * 100;
      return { mes: row.mes, actual, prev, varPct };
    });
    let totalVarPct = totalPrev === 0 ? (totalActual === 0 ? 0 : 100) : ((totalActual - totalPrev) / totalPrev) * 100;
    return { variaciones, totalActual, totalPrev, totalVarPct };
  }
  const ventasVar = getYearlyVariation(salesYearly, 'ventas');
  const productosVar = getYearlyVariation(productsYearly, 'productos');

  return (
    <div className="">
      <h1 className="text-2xl font-bold mb-6">Estadísticas del Negocio</h1>
      
      {/* Indicador de período */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          📊 <strong>KPIs del mes actual:</strong> {MONTHS_ES[new Date().getMonth()]} {new Date().getFullYear()} | 
          💰 <strong>Saldos disponibles:</strong> Acumulado desde el inicio del negocio
        </p>
      </div>
      
      {/* Selector de mes de inicio si hay más de 12 meses */}
      {selectableMonths.length > 0 && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">Ver gráficos desde:</label>
          <select value={startMonth || selectableMonths[selectableMonths.length - 1]} onChange={e => setStartMonth(e.target.value)} className="border rounded px-2 py-1">
            {selectableMonths.map(mes => (
              <option key={mes} value={mes}>{formatMes(mes)}</option>
            ))}
          </select>
        </div>
      )}
      
      {/* KPIs del mes actual */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-green-100 rounded shadow p-4 text-center border border-green-300">
          <div className="text-xs text-gray-600 mb-1">Ventas del mes</div>
          <div className="text-2xl font-bold text-green-700">${(kpis.ventas ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-blue-100 rounded shadow p-4 text-center border border-blue-300">
          <div className="text-xs text-gray-600 mb-1">Compras del mes</div>
          <div className="text-2xl font-bold text-blue-700">${(kpis.compras ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-yellow-100 rounded shadow p-4 text-center border border-yellow-300">
          <div className="text-xs text-gray-600 mb-1">Ingresos del mes</div>
          <div className="text-2xl font-bold text-yellow-700">${(kpis.ingresos ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-red-100 rounded shadow p-4 text-center border border-red-300">
          <div className="text-xs text-gray-600 mb-1">Egresos del mes</div>
          <div className="text-2xl font-bold text-red-700">${(kpis.egresos ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-orange-100 rounded shadow p-4 text-center border border-orange-300">
          <div className="text-xs text-gray-600 mb-1">Gastos del mes</div>
          <div className="text-2xl font-bold text-orange-700">${(kpis.gastos ?? 0).toLocaleString('es-AR')}</div>
        </div>
      </div>
      
      {/* Resultado neto del mes */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
        <div className={`rounded shadow p-4 text-center border ${((kpis.ventas + kpis.ingresos) - (kpis.compras + kpis.egresos + kpis.gastos)) >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="text-sm text-gray-600 mb-1">Resultado neto del mes (Ventas + Ingresos - Compras - Egresos - Gastos)</div>
          <div className={`text-3xl font-bold ${((kpis.ventas + kpis.ingresos) - (kpis.compras + kpis.egresos + kpis.gastos)) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            ${((kpis.ventas + kpis.ingresos) - (kpis.compras + kpis.egresos + kpis.gastos)).toLocaleString('es-AR')}
          </div>
        </div>
      </div>
      
      {/* Saldos disponibles (acumulados) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 rounded shadow p-4 text-center border border-gray-300">
          <div className="text-xs text-gray-600 mb-1">💵 Saldo Efectivo</div>
          <div className="text-xs text-gray-500 mb-2">(Acumulado total)</div>
          <div className="text-2xl font-bold text-gray-700">${(kpis.efectivo ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-purple-100 rounded shadow p-4 text-center border border-purple-300">
          <div className="text-xs text-gray-600 mb-1">📱 Saldo Mercado Pago</div>
          <div className="text-xs text-gray-500 mb-2">(Acumulado total)</div>
          <div className="text-2xl font-bold text-purple-700">${(kpis.mp ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-green-50 rounded shadow p-4 text-center border border-green-300">
          <div className="text-xs text-gray-600 mb-1">💰 Total Disponible</div>
          <div className="text-xs text-gray-500 mb-2">(Efectivo + MP)</div>
          <div className="text-2xl font-bold text-green-700">${((kpis.efectivo ?? 0) + (kpis.mp ?? 0)).toLocaleString('es-AR')}</div>
        </div>
      </div>
      
      {/* Separador para gráficos históricos */}
      <div className="my-8 border-t border-gray-200"></div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📈 Análisis Histórico</h2>
        <p className="text-sm text-gray-600">Los siguientes gráficos muestran la evolución histórica de tu negocio por meses.</p>
      </div>
      
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Ventas por mes</h2>
        {bestSalesMonth && (
          <div className="mb-2 text-green-700 font-semibold text-sm">
            🏆 Mes con más ventas: {formatMes(bestSalesMonth.mes)} (${bestSalesMonth.ventas.toLocaleString('es-AR')})
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredSales.map(m => ({ ...m, mes: formatMes(m.mes) }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="ventas" name="Ventas ($)" >
              {filteredSales.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={bestSalesMonth && entry.mes === bestSalesMonth.mes ? '#f6ad55' : COLORS[index % COLORS.length]} />
              ))}
              <LabelList dataKey="ventas" position="top" formatter={v => v?.toLocaleString('es-AR')} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Cantidad de productos vendidos por mes</h2>
        {bestProductsMonth && (
          <div className="mb-2 text-blue-700 font-semibold text-sm">
            🏆 Mes con más productos vendidos: {formatMes(bestProductsMonth.mes)} ({bestProductsMonth.productos})
          </div>
        )}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={filteredProducts.map(m => ({ ...m, mes: formatMes(m.mes) }))} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="productos" name="Productos vendidos" >
              {filteredProducts.map((entry, index) => (
                <Cell key={`cell-prod-${index}`} fill={bestProductsMonth && entry.mes === bestProductsMonth.mes ? '#f6ad55' : COLORS[index % COLORS.length]} />
              ))}
              <LabelList dataKey="productos" position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* --- COMPARATIVO AÑO A AÑO --- */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Comparativo de Ventas por mes ({prevYear} vs {currentYear})</h2>
        {ventasVar.totalPrev === 0 && (
          <div className="mb-2 text-gray-500 italic">Sin datos del año anterior para comparar.</div>
        )}
        <div className="mb-2 text-sm">
          Total {currentYear}: <span className="font-bold text-green-700">${ventasVar.totalActual.toLocaleString('es-AR')}</span> | {prevYear}: <span className="font-bold text-blue-700">${ventasVar.totalPrev.toLocaleString('es-AR')}</span> | Variación: <span className={ventasVar.totalVarPct >= 0 ? 'text-green-700' : 'text-red-700'}>{ventasVar.totalVarPct.toFixed(1)}%</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={salesYearly} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value?.toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey={prevYear} name={`Ventas ${prevYear}`} fill="#63b3ed">
              <LabelList dataKey={prevYear} position="top" formatter={v => v ? `$${v.toLocaleString('es-AR')}` : ''} />
            </Bar>
            <Bar dataKey={currentYear} name={`Ventas ${currentYear}`} fill="#38a169">
              <LabelList dataKey={currentYear} position="top" formatter={v => v ? `$${v.toLocaleString('es-AR')}` : ''} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">Comparativo de Productos vendidos por mes ({prevYear} vs {currentYear})</h2>
        {productosVar.totalPrev === 0 && (
          <div className="mb-2 text-gray-500 italic">Sin datos del año anterior para comparar.</div>
        )}
        <div className="mb-2 text-sm">
          Total {currentYear}: <span className="font-bold text-green-700">{productosVar.totalActual.toLocaleString('es-AR')}</span> | {prevYear}: <span className="font-bold text-blue-700">{productosVar.totalPrev.toLocaleString('es-AR')}</span> | Variación: <span className={productosVar.totalVarPct >= 0 ? 'text-green-700' : 'text-red-700'}>{productosVar.totalVarPct.toFixed(1)}%</span>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productsYearly} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={prevYear} name={`Productos ${prevYear}`} fill="#63b3ed">
              <LabelList dataKey={prevYear} position="top" />
            </Bar>
            <Bar dataKey={currentYear} name={`Productos ${currentYear}`} fill="#38a169">
              <LabelList dataKey={currentYear} position="top" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* --- NUEVOS ANÁLISIS ADICIONALES --- */}
      <div className="my-8 border-t border-gray-200"></div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-2">🎯 Análisis de Negocio Avanzado</h2>
        <p className="text-sm text-gray-600">Insights profundos para optimizar tu negocio.</p>
      </div>

      {/* Análisis de Rentabilidad por Producto */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">💰 Top 10 Productos más Rentables</h2>
        {productProfitability.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-green-50">
                  <th className="text-left px-3 py-2 font-semibold">Producto</th>
                  <th className="text-right px-3 py-2 font-semibold">Vendidos</th>
                  <th className="text-right px-3 py-2 font-semibold">Ingresos</th>
                  <th className="text-right px-3 py-2 font-semibold">Costos</th>
                  <th className="text-right px-3 py-2 font-semibold">Ganancia</th>
                  <th className="text-right px-3 py-2 font-semibold">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {productProfitability.map((product, idx) => (
                  <tr key={product.name} className={idx === 0 ? 'bg-green-100 font-semibold' : idx < 3 ? 'bg-green-50' : ''}>
                    <td className="px-3 py-2">{idx === 0 ? '🏆 ' : ''}{product.name}</td>
                    <td className="px-3 py-2 text-right">{product.quantitySold}</td>
                    <td className="px-3 py-2 text-right text-green-700">${product.revenue.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right text-red-600">${product.cost.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right font-bold text-green-800">${product.profit.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right font-bold">{product.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay datos de ventas para analizar rentabilidad.</div>
        )}
      </div>

      {/* Ganancia por Producto del Mes Actual */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">📊 Ganancia por Producto - {MONTHS_ES[currentMonth]} {currentYear}</h2>
        {monthlyProductProfitability.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-blue-50">
                  <th className="text-left px-3 py-2 font-semibold">Producto</th>
                  <th className="text-right px-3 py-2 font-semibold">Unidades</th>
                  <th className="text-right px-3 py-2 font-semibold">Ingresos</th>
                  <th className="text-right px-3 py-2 font-semibold">Costos</th>
                  <th className="text-right px-3 py-2 font-semibold">Ganancia</th>
                  <th className="text-right px-3 py-2 font-semibold">Margen %</th>
                </tr>
              </thead>
              <tbody>
                {monthlyProductProfitability.map((product, idx) => (
                  <tr key={product.name} className={idx < 3 ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2">{product.name}</td>
                    <td className="px-3 py-2 text-right">{product.quantitySold}</td>
                    <td className="px-3 py-2 text-right text-green-700">${product.revenue.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right text-red-600">${product.cost.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right font-bold text-blue-800">${product.profit.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right font-bold">{product.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 p-3 bg-blue-100 rounded">
              <div className="flex justify-between">
                <span className="font-bold">💰 Ganancia Total del Mes:</span>
                <span className="font-bold text-blue-700">${monthlyProductProfitability.reduce((sum, p) => sum + p.profit, 0).toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay ventas en el mes actual para analizar.</div>
        )}
      </div>

      {/* Análisis y Recomendaciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Recomendaciones de Compra */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">🛒 Recomendaciones de Compra</h2>
          <p className="text-sm text-gray-600 mb-4">Productos con mejor velocidad de rotación</p>
          {purchaseRecommendations.length > 0 ? (
            <div className="space-y-3">
              {purchaseRecommendations.map((rec, idx) => (
                <div key={rec.name} className={`p-3 rounded border-l-4 ${
                  idx === 0 ? 'border-green-500 bg-green-50' : 
                  idx === 1 ? 'border-blue-500 bg-blue-50' : 
                  'border-yellow-500 bg-yellow-50'
                }`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-sm">{idx === 0 ? '🏆' : idx + 1}. {rec.name}</h4>
                      <p className="text-xs text-gray-600">Stock actual: {rec.currentStock} | Vendidos/mes: {rec.avgSalesPerMonth}</p>
                      <p className="text-xs text-gray-500">Velocidad: {rec.rotationVelocity} días por unidad</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-bold ${
                        rec.priority === 'Alta' ? 'text-red-600' : 
                        rec.priority === 'Media' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {rec.priority}
                      </div>
                      <div className="text-xs text-gray-500">${rec.suggestedProfit}/mes</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-4">No hay suficientes datos para recomendaciones.</div>
          )}
        </div>

        {/* Alertas de Stock */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">⚠️ Alertas de Inventario</h2>
          <div className="space-y-4">
            
            {/* Stock Bajo */}
            <div>
              <h3 className="font-medium text-red-600 mb-2">🔴 Stock Crítico (≤ 2 unidades)</h3>
              {lowStockProducts.length > 0 ? (
                <div className="space-y-2">
                  {lowStockProducts.map(product => (
                    <div key={product.id} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="text-sm font-medium">{product.name}</span>
                      <span className="text-sm text-red-700 font-bold">{product.stock} restantes</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">✅ Todos los productos tienen stock suficiente</p>
              )}
            </div>

            {/* Productos sin Movimiento */}
            <div>
              <h3 className="font-medium text-orange-600 mb-2">🔶 Sin ventas (últimos 30 días)</h3>
              {stagnantProducts.length > 0 ? (
                <div className="space-y-2">
                  {stagnantProducts.slice(0, 5).map(product => (
                    <div key={product.id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                      <span className="text-sm">{product.name}</span>
                      <span className="text-sm text-orange-700">Stock: {product.stock}</span>
                    </div>
                  ))}
                  {stagnantProducts.length > 5 && (
                    <p className="text-xs text-gray-500">... y {stagnantProducts.length - 5} productos más</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">✅ Todos los productos tienen movimiento reciente</p>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Análisis de Tendencias */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">📈 Análisis de Tendencias</h2>
        <p className="text-sm text-gray-600 mb-4">Comparación mes actual vs mes anterior</p>
        
        {trendAnalysis.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* En Crecimiento */}
            <div className="p-4 bg-green-50 rounded border border-green-200">
              <h3 className="font-semibold text-green-700 mb-3">📈 En Crecimiento</h3>
              {trendAnalysis.filter(p => p.trend === 'up').slice(0, 5).map(product => (
                <div key={product.name} className="flex justify-between text-sm mb-2">
                  <span>{product.name}</span>
                  <span className="text-green-600 font-semibold">+{product.change}%</span>
                </div>
              ))}
              {trendAnalysis.filter(p => p.trend === 'up').length === 0 && (
                <p className="text-sm text-gray-500">No hay productos en crecimiento</p>
              )}
            </div>

            {/* Estables */}
            <div className="p-4 bg-blue-50 rounded border border-blue-200">
              <h3 className="font-semibold text-blue-700 mb-3">➡️ Estables</h3>
              {trendAnalysis.filter(p => p.trend === 'stable').slice(0, 5).map(product => (
                <div key={product.name} className="flex justify-between text-sm mb-2">
                  <span>{product.name}</span>
                  <span className="text-blue-600 font-semibold">{product.change > 0 ? '+' : ''}{product.change}%</span>
                </div>
              ))}
              {trendAnalysis.filter(p => p.trend === 'stable').length === 0 && (
                <p className="text-sm text-gray-500">No hay productos estables</p>
              )}
            </div>

            {/* En Declive */}
            <div className="p-4 bg-red-50 rounded border border-red-200">
              <h3 className="font-semibold text-red-700 mb-3">📉 En Declive</h3>
              {trendAnalysis.filter(p => p.trend === 'down').slice(0, 5).map(product => (
                <div key={product.name} className="flex justify-between text-sm mb-2">
                  <span>{product.name}</span>
                  <span className="text-red-600 font-semibold">{product.change}%</span>
                </div>
              ))}
              {trendAnalysis.filter(p => p.trend === 'down').length === 0 && (
                <p className="text-sm text-gray-500">No hay productos en declive</p>
              )}
            </div>
            
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay suficientes datos para análisis de tendencias.</div>
        )}
      </div>

      {/* Análisis por Ubicación */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">📍 Análisis por Ubicación</h2>
        <p className="text-sm text-gray-600 mb-4">Rendimiento de ventas por lugar</p>
        
        {locationAnalysis.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-purple-50">
                  <th className="text-left px-3 py-2 font-semibold">Ubicación</th>
                  <th className="text-right px-3 py-2 font-semibold">Ventas</th>
                  <th className="text-right px-3 py-2 font-semibold">Ingresos</th>
                  <th className="text-right px-3 py-2 font-semibold">Productos</th>
                  <th className="text-right px-3 py-2 font-semibold">Ticket Promedio</th>
                </tr>
              </thead>
              <tbody>
                {locationAnalysis.map((location, idx) => (
                  <tr key={location.name} className={idx === 0 ? 'bg-purple-100 font-semibold' : idx < 3 ? 'bg-purple-50' : ''}>
                    <td className="px-3 py-2">{idx === 0 ? '🏆 ' : ''}{location.name}</td>
                    <td className="px-3 py-2 text-right">{location.totalSales}</td>
                    <td className="px-3 py-2 text-right text-green-700">${location.totalRevenue.toLocaleString('es-AR')}</td>
                    <td className="px-3 py-2 text-right">{location.totalQuantity}</td>
                    <td className="px-3 py-2 text-right font-bold text-purple-700">${location.avgTicket.toLocaleString('es-AR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay datos de ubicaciones para analizar.</div>
        )}
      </div>

      {/* Patrones Temporales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Ventas por Hora */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">⏰ Ventas por Hora del Día</h2>
          {timePatterns.hourlyStats && timePatterns.hourlyStats.some(h => h.sales > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timePatterns.hourlyStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(hour) => `${hour}:00 hs`}
                    formatter={(value, name) => [value, name === 'sales' ? 'Ventas' : 'Ingresos']}
                  />
                  <Bar dataKey="sales" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>Hora pico:</strong> {
                  timePatterns.hourlyStats.reduce((max, curr) => curr.sales > max.sales ? curr : max, {sales: 0}).hour
                }:00 hs</p>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-center py-8">No hay datos de ventas por hora.</div>
          )}
        </div>

        {/* Ventas por Día de la Semana */}
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">📅 Ventas por Día de la Semana</h2>
          {timePatterns.dailyStats && timePatterns.dailyStats.some(d => d.sales > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timePatterns.dailyStats} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="dayName" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [value, name === 'sales' ? 'Ventas' : 'Ingresos']}
                  />
                  <Bar dataKey="sales" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-sm text-gray-600">
                <p><strong>Mejor día:</strong> {
                  timePatterns.dailyStats.reduce((max, curr) => curr.sales > max.sales ? curr : max, {sales: 0}).dayName
                }</p>
              </div>
            </>
          ) : (
            <div className="text-gray-500 text-center py-8">No hay datos de ventas por día.</div>
          )}
        </div>

      </div>

      {/* Ciclo de Vida de Productos */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">🔄 Ciclo de Vida de Productos</h2>
        <p className="text-sm text-gray-600 mb-4">Clasificación de productos según su etapa de vida</p>
        
        {productLifecycle.length > 0 ? (
          <>
            {/* Resumen por etapas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {['nuevo', 'crecimiento', 'maduro', 'declive'].map(stage => {
                const count = productLifecycle.filter(p => p.stage === stage).length;
                const stageIcons = {
                  'nuevo': '🌱',
                  'crecimiento': '🚀', 
                  'maduro': '🌳',
                  'declive': '🍂'
                };
                const stageColors = {
                  'nuevo': 'bg-green-100 text-green-800',
                  'crecimiento': 'bg-blue-100 text-blue-800',
                  'maduro': 'bg-yellow-100 text-yellow-800',
                  'declive': 'bg-red-100 text-red-800'
                };
                
                return (
                  <div key={stage} className={`p-3 rounded ${stageColors[stage]}`}>
                    <div className="text-lg font-bold">{stageIcons[stage]} {count}</div>
                    <div className="text-sm capitalize">{stage}</div>
                  </div>
                );
              })}
            </div>

            {/* Tabla detallada */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 font-semibold">Producto</th>
                    <th className="text-center px-3 py-2 font-semibold">Etapa</th>
                    <th className="text-right px-3 py-2 font-semibold">Días en Sistema</th>
                    <th className="text-right px-3 py-2 font-semibold">Ventas Totales</th>
                    <th className="text-right px-3 py-2 font-semibold">Ventas Recientes</th>
                    <th className="text-right px-3 py-2 font-semibold">Stock Actual</th>
                  </tr>
                </thead>
                <tbody>
                  {productLifecycle.map((product, idx) => (
                    <tr key={product.name} className={`border-b ${
                      product.stage === 'nuevo' ? 'bg-green-50' :
                      product.stage === 'crecimiento' ? 'bg-blue-50' :
                      product.stage === 'maduro' ? 'bg-yellow-50' :
                      'bg-red-50'
                    }`}>
                      <td className="px-3 py-2 font-medium">{product.name}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          product.stage === 'nuevo' ? 'bg-green-200 text-green-800' :
                          product.stage === 'crecimiento' ? 'bg-blue-200 text-blue-800' :
                          product.stage === 'maduro' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-red-200 text-red-800'
                        }`}>
                          {product.stage === 'nuevo' ? '🌱 Nuevo' :
                           product.stage === 'crecimiento' ? '🚀 Crecimiento' :
                           product.stage === 'maduro' ? '🌳 Maduro' :
                           '🍂 Declive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{product.daysSinceFirst}</td>
                      <td className="px-3 py-2 text-right">{product.totalSales}</td>
                      <td className="px-3 py-2 text-right">{product.recentSales}</td>
                      <td className="px-3 py-2 text-right">{product.currentStock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insights automáticos */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded border border-blue-200">
                <h4 className="font-semibold text-blue-700 mb-2">💡 Insights</h4>
                <ul className="text-sm text-blue-600 space-y-1">
                  <li>• {productLifecycle.filter(p => p.stage === 'nuevo').length} productos nuevos en evaluación</li>
                  <li>• {productLifecycle.filter(p => p.stage === 'maduro').length} productos en etapa madura (estables)</li>
                  <li>• {productLifecycle.filter(p => p.stage === 'declive').length} productos requieren atención</li>
                </ul>
              </div>
              
              <div className="p-3 bg-orange-50 rounded border border-orange-200">
                <h4 className="font-semibold text-orange-700 mb-2">⚠️ Recomendaciones</h4>
                <ul className="text-sm text-orange-600 space-y-1">
                  {productLifecycle.filter(p => p.stage === 'declive').length > 0 && (
                    <li>• Revisar precios de productos en declive</li>
                  )}
                  {productLifecycle.filter(p => p.stage === 'crecimiento').length > 0 && (
                    <li>• Aumentar stock de productos en crecimiento</li>
                  )}
                  {productLifecycle.filter(p => p.stage === 'nuevo').length > 3 && (
                    <li>• Evaluar performance de productos nuevos</li>
                  )}
                </ul>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay datos suficientes para análisis de ciclo de vida.</div>
        )}
      </div>

      {/* ROI por Producto */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">💎 ROI por Producto</h2>
        <p className="text-sm text-gray-600 mb-4">Retorno de inversión y eficiencia de cada producto</p>
        
        {productROI.length > 0 ? (
          <>
            {/* Resumen general de ROI */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded border border-green-200">
                <div className="text-2xl font-bold text-green-700">
                  {productROI.filter(p => p.adjustedROI > 50).length}
                </div>
                <div className="text-sm text-green-600">Productos ROI &gt; 50%</div>
              </div>
              
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">
                  {productROI.length > 0 ? Math.round(productROI.reduce((sum, p) => sum + p.adjustedROI, 0) / productROI.length) : 0}%
                </div>
                <div className="text-sm text-blue-600">ROI Promedio</div>
              </div>
              
              <div className="p-4 bg-purple-50 rounded border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">
                  ${productROI.reduce((sum, p) => sum + p.totalInvested, 0).toLocaleString('es-AR')}
                </div>
                <div className="text-sm text-purple-600">Total Invertido</div>
              </div>
              
              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <div className="text-2xl font-bold text-yellow-700">
                  ${productROI.reduce((sum, p) => sum + p.profit, 0).toLocaleString('es-AR')}
                </div>
                <div className="text-sm text-yellow-600">Ganancia Total</div>
              </div>
            </div>

            {/* Tabla detallada de ROI */}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-green-50 to-blue-50">
                    <th className="text-left px-3 py-2 font-semibold">Producto</th>
                    <th className="text-right px-3 py-2 font-semibold">Invertido</th>
                    <th className="text-right px-3 py-2 font-semibold">Vendido</th>
                    <th className="text-right px-3 py-2 font-semibold">Ganancia</th>
                    <th className="text-right px-3 py-2 font-semibold">ROI Simple</th>
                    <th className="text-right px-3 py-2 font-semibold">ROI Ajustado</th>
                    <th className="text-right px-3 py-2 font-semibold">Rotación</th>
                    <th className="text-right px-3 py-2 font-semibold">Stock Valuado</th>
                  </tr>
                </thead>
                <tbody>
                  {productROI.map((product, idx) => (
                    <tr key={product.name} className={`border-b ${
                      idx === 0 ? 'bg-gradient-to-r from-green-100 to-blue-100 font-semibold' :
                      idx < 3 ? 'bg-gradient-to-r from-green-50 to-blue-50' :
                      product.adjustedROI < 0 ? 'bg-red-50' : ''
                    }`}>
                      <td className="px-3 py-2">
                        {idx === 0 ? '🏆 ' : ''}
                        {product.name}
                        {product.adjustedROI > 100 && <span className="ml-1 text-green-600">🚀</span>}
                        {product.adjustedROI < 0 && <span className="ml-1 text-red-600">⚠️</span>}
                      </td>
                      <td className="px-3 py-2 text-right text-red-600">
                        ${product.totalInvested.toLocaleString('es-AR')}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600">
                        ${product.totalRevenue.toLocaleString('es-AR')}
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        <span className={product.profit >= 0 ? 'text-green-700' : 'text-red-700'}>
                          ${product.profit.toLocaleString('es-AR')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        <span className={product.roiPercentage >= 0 ? 'text-green-700' : 'text-red-700'}>
                          {product.roiPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-lg">
                        <span className={
                          product.adjustedROI >= 50 ? 'text-green-700' :
                          product.adjustedROI >= 20 ? 'text-blue-700' :
                          product.adjustedROI >= 0 ? 'text-yellow-700' : 'text-red-700'
                        }>
                          {product.adjustedROI.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={
                          product.rotationRate >= 80 ? 'text-green-600' :
                          product.rotationRate >= 50 ? 'text-blue-600' : 'text-orange-600'
                        }>
                          {product.rotationRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-purple-600">
                        ${product.stockValue.toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Insights de ROI */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 rounded border border-green-200">
                <h4 className="font-semibold text-green-700 mb-2">🏆 Mejores Performers</h4>
                <div className="space-y-2">
                  {productROI.filter(p => p.adjustedROI > 50).slice(0, 3).map(product => (
                    <div key={product.name} className="text-sm">
                      <span className="font-medium">{product.name}</span>
                      <span className="float-right text-green-600 font-bold">
                        {product.adjustedROI.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {productROI.filter(p => p.adjustedROI > 50).length === 0 && (
                    <p className="text-sm text-gray-500">No hay productos con ROI &gt; 50%</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 rounded border border-yellow-200">
                <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Requieren Atención</h4>
                <div className="space-y-2">
                  {productROI.filter(p => p.adjustedROI < 20 && p.adjustedROI >= 0).slice(0, 3).map(product => (
                    <div key={product.name} className="text-sm">
                      <span className="font-medium">{product.name}</span>
                      <span className="float-right text-yellow-600 font-bold">
                        {product.adjustedROI.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {productROI.filter(p => p.adjustedROI < 20 && p.adjustedROI >= 0).length === 0 && (
                    <p className="text-sm text-gray-500">Todos los productos tienen buen ROI</p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-red-50 rounded border border-red-200">
                <h4 className="font-semibold text-red-700 mb-2">🚨 ROI Negativo</h4>
                <div className="space-y-2">
                  {productROI.filter(p => p.adjustedROI < 0).slice(0, 3).map(product => (
                    <div key={product.name} className="text-sm">
                      <span className="font-medium">{product.name}</span>
                      <span className="float-right text-red-600 font-bold">
                        {product.adjustedROI.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                  {productROI.filter(p => p.adjustedROI < 0).length === 0 && (
                    <p className="text-sm text-gray-500">✅ No hay productos con pérdidas</p>
                  )}
                </div>
              </div>
            </div>

            {/* Explicación del ROI */}
            <div className="mt-4 p-4 bg-gray-50 rounded border">
              <h4 className="font-semibold text-gray-700 mb-2">📚 ¿Cómo se calcula el ROI?</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>ROI Simple:</strong> (Ingresos por Ventas - Inversión en Compras) / Inversión × 100</p>
                <p><strong>ROI Ajustado:</strong> Incluye el valor del stock actual al costo como activo</p>
                <p><strong>Rotación:</strong> % de productos comprados que ya se vendieron</p>
                <p><strong>Interpretación:</strong> 
                  <span className="text-green-600 font-medium"> &gt; 50% Excelente</span>, 
                  <span className="text-blue-600 font-medium"> 20-50% Bueno</span>, 
                  <span className="text-yellow-600 font-medium"> 0-20% Regular</span>, 
                  <span className="text-red-600 font-medium"> &lt; 0% Pérdida</span>
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-500 text-center py-4">No hay suficientes datos de compras y ventas para calcular ROI.</div>
        )}
      </div>

      {/* Flujo de Caja Diario */}
      <div className="bg-white rounded shadow p-4 mb-6">
        <h2 className="text-lg font-semibold mb-2">📊 Flujo de Caja Diario - {MONTHS_ES[now.getMonth()]} {now.getFullYear()}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={dailyCashFlow} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip formatter={(value) => `$${value?.toLocaleString('es-AR')}`} />
            <Legend />
            <Bar dataKey="ingresos" name="Ingresos" fill="#38a169" />
            <Bar dataKey="egresos" name="Egresos" fill="#e53e3e" />
            <Bar dataKey="neto" name="Resultado Neto" fill="#3182ce" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Análisis de Métodos de Pago */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">💳 Métodos de Pago - {MONTHS_ES[now.getMonth()]}</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-100 rounded">
              <span className="font-medium">💵 Efectivo</span>
              <span className="font-bold text-green-700">${paymentMethodStats.efectivo.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-purple-100 rounded">
              <span className="font-medium">📱 Mercado Pago</span>
              <span className="font-bold text-purple-700">${paymentMethodStats.mercadoPago.toLocaleString('es-AR')}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-100 rounded border-2 border-blue-300">
              <span className="font-bold">💰 Total Ventas</span>
              <span className="font-bold text-blue-700">${(paymentMethodStats.efectivo + paymentMethodStats.mercadoPago).toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded shadow p-4">
          <h2 className="text-lg font-semibold mb-4">📈 Proporción de Pagos</h2>
          <div className="space-y-4">
            {paymentMethodStats.efectivo + paymentMethodStats.mercadoPago > 0 ? (
              <>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Efectivo</span>
                    <span>{((paymentMethodStats.efectivo / (paymentMethodStats.efectivo + paymentMethodStats.mercadoPago)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full" 
                      style={{width: `${(paymentMethodStats.efectivo / (paymentMethodStats.efectivo + paymentMethodStats.mercadoPago)) * 100}%`}}
                    ></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Mercado Pago</span>
                    <span>{((paymentMethodStats.mercadoPago / (paymentMethodStats.efectivo + paymentMethodStats.mercadoPago)) * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-500 h-3 rounded-full" 
                      style={{width: `${(paymentMethodStats.mercadoPago / (paymentMethodStats.efectivo + paymentMethodStats.mercadoPago)) * 100}%`}}
                    ></div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center py-4">No hay ventas en el mes actual.</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default StatisticsView;
