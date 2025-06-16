import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList, Cell } from 'recharts';

const COLORS = [
  '#38a169', '#3182ce', '#e53e3e', '#d69e2e', '#805ad5', '#319795', '#f56565', '#ecc94b', '#4fd1c5', '#f6ad55', '#63b3ed', '#b794f4'
];

// Utilidad para mostrar el mes en español
const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
function formatMes(mesKey) {
  // mesKey: '2025-05'
  const [year, month] = mesKey.split('-');
  return `${MONTHS_ES[parseInt(month, 10) - 1]} ${year}`;
}

const StatisticsView = () => {
  const [movements, setMovements] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [monthlyProducts, setMonthlyProducts] = useState([]);
  const [kpis, setKpis] = useState({ ventas: 0, compras: 0, ingresos: 0, egresos: 0 });
  const [startMonth, setStartMonth] = useState(null); // mes de inicio para filtrar

  // Año actual y anterior
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    // Agrupar ventas por mes y calcular KPIs
    const salesByMonth = {};
    const productsByMonth = {};
    let ventas = 0, compras = 0, ingresos = 0, egresos = 0;
    let efectivo = 0, mp = 0;
    movements.forEach(mov => {
      if (!mov.date) return;
      const d = new Date(mov.date);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!salesByMonth[key]) salesByMonth[key] = { mes: key, ventas: 0 };
      if (!productsByMonth[key]) productsByMonth[key] = { mes: key, productos: 0 };
      if (mov.type === 'venta') {
        salesByMonth[key].ventas += mov.total ? Number(mov.total) : 0;
        // Sumar cantidad de productos vendidos
        if (Array.isArray(mov.products)) {
          productsByMonth[key].productos += mov.products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        } else if (mov.quantity) {
          productsByMonth[key].productos += Number(mov.quantity);
        }
        ventas += mov.total ? Number(mov.total) : 0;
      }
      if (mov.type === 'compra') compras += mov.total ? Number(mov.total) : 0;
      if (mov.type === 'ingreso') ingresos += mov.total ? Number(mov.total) : 0;
      if (mov.type === 'egreso') egresos += mov.total ? Number(mov.total) : 0;
      // Calcular saldos
      if (mov.paymentMethod === 'efectivo') {
        if (mov.type === 'venta' || mov.type === 'ingreso') efectivo += mov.total ? Number(mov.total) : 0;
        if (mov.type === 'compra' || mov.type === 'egreso') efectivo -= mov.total ? Number(mov.total) : 0;
      }
      if (mov.paymentMethod === 'mercadoPago') {
        if (mov.type === 'venta' || mov.type === 'ingreso') mp += mov.total ? Number(mov.total) : 0;
        if (mov.type === 'compra' || mov.type === 'egreso') mp -= mov.total ? Number(mov.total) : 0;
      }
    });
    setMonthlySales(Object.values(salesByMonth).sort((a,b) => a.mes.localeCompare(b.mes)));
    setMonthlyProducts(Object.values(productsByMonth).sort((a,b) => a.mes.localeCompare(b.mes)));
    setKpis({ ventas, compras, ingresos, egresos, efectivo, mp });
  }, [movements]);

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
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Estadísticas</h1>
      {/* Selector de mes de inicio si hay más de 12 meses */}
      {selectableMonths.length > 0 && (
        <div className="mb-4">
          <label className="mr-2 font-semibold">Ver desde:</label>
          <select value={startMonth || selectableMonths[selectableMonths.length - 1]} onChange={e => setStartMonth(e.target.value)} className="border rounded px-2 py-1">
            {selectableMonths.map(mes => (
              <option key={mes} value={mes}>{formatMes(mes)}</option>
            ))}
          </select>
        </div>
      )}
      {/* KPIs de totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        <div className="bg-green-100 rounded shadow p-4 text-center">
          <div className="text-xs text-gray-500">Total Ventas</div>
          <div className="text-2xl font-bold text-green-700">${(kpis.ventas ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-blue-100 rounded shadow p-4 text-center">
          <div className="text-xs text-gray-500">Total Compras</div>
          <div className="text-2xl font-bold text-blue-700">${(kpis.compras ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-yellow-100 rounded shadow p-4 text-center">
          <div className="text-xs text-gray-500">Total Ingresos</div>
          <div className="text-2xl font-bold text-yellow-700">${(kpis.ingresos ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-red-100 rounded shadow p-4 text-center">
          <div className="text-xs text-gray-500">Total Egresos</div>
          <div className="text-2xl font-bold text-red-700">${(kpis.egresos ?? 0).toLocaleString('es-AR')}</div>
        </div>
      </div>
      {/* Saldos disponibles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-100 rounded shadow p-4 text-center border border-gray-300">
          <div className="text-xs text-gray-500">Disponible Efectivo</div>
          <div className="text-2xl font-bold text-gray-700">${(kpis.efectivo ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-purple-100 rounded shadow p-4 text-center border border-purple-300">
          <div className="text-xs text-gray-500">Disponible MP</div>
          <div className="text-2xl font-bold text-purple-700">${(kpis.mp ?? 0).toLocaleString('es-AR')}</div>
        </div>
        <div className="bg-green-50 rounded shadow p-4 text-center border border-green-300">
          <div className="text-xs text-gray-500">Total Disponible</div>
          <div className="text-2xl font-bold text-green-700">${((kpis.efectivo ?? 0) + (kpis.mp ?? 0)).toLocaleString('es-AR')}</div>
        </div>
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
    </div>
  );
};

export default StatisticsView;
