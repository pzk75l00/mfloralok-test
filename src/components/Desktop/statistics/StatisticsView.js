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

  // Año actual y anterior
  const now = new Date();
  const currentYear = now.getFullYear();
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
        const cost = Number(plant.purchasePrice) * qty || 0;
        
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
