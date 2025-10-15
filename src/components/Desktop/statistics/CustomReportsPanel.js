import React, { useMemo, useState } from 'react';

/*
  Panel genérico de generación de reportes.
  Usa las colecciones ya cargadas en el padre (movements, plants) para no duplicar listeners.
  Cada reporte se define en el array reportDefinitions con:
    id, nombre, descripcion, run({movements, plants, params}) => { rows, columns }
  columns: [{ key, label, align? }]
  rows: array de objetos planos.
*/

const reportDefinitions = [
  {
    id: 'consistentesTodosLosMeses',
    nombre: 'Productos vendidos TODOS los meses',
    descripcion: 'Productos que tuvieron al menos una venta en cada mes con ventas registradas.',
    params: [],
    run: ({ movements, plants }) => {
      const sales = movements.filter(m => m.type === 'venta' && m.plantId && m.date);
      if (!sales.length) return { rows: [], columns: [] };
      const monthMap = new Map();
      sales.forEach(s => {
        const d = new Date(s.date);
        if (isNaN(d.getTime())) return;
        const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        if (!monthMap.has(key)) monthMap.set(key, new Set());
        monthMap.get(key).add(String(s.plantId));
      });
      const months = [...monthMap.keys()].sort();
      if (!months.length) return { rows: [], columns: [] };
      let intersection = new Set(monthMap.get(months[0]));
      for (let i = 1; i < months.length; i++) {
        const set = monthMap.get(months[i]);
        intersection = new Set([...intersection].filter(x => set.has(x)));
        if (!intersection.size) break;
      }
      const rows = [...intersection].map(id => {
        const plant = plants.find(p => String(p.id) === id);
        return { id, nombre: plant ? plant.name : '(sin nombre)' };
      }).sort((a, b) => a.nombre.localeCompare(b.nombre));
      return {
        columns: [
          { key: 'id', label: 'ID' },
            { key: 'nombre', label: 'Nombre' }
        ],
        rows
      };
    }
  },
  {
    id: 'nuncaVendidosConStock',
    nombre: 'Con stock y nunca vendidos',
    descripcion: 'Productos con stock > 0 y cero ventas históricas.',
    params: [],
    run: ({ movements, plants }) => {
      const soldIds = new Set(movements.filter(m => m.type === 'venta' && m.plantId).map(m => String(m.plantId)));
      const rows = plants.filter(p => (Number(p.stock) || 0) > 0 && !soldIds.has(String(p.id)))
        .map(p => ({ id: p.id, nombre: p.name, stock: Number(p.stock) || 0 }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
      return {
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'nombre', label: 'Nombre' },
          { key: 'stock', label: 'Stock', align: 'right' }
        ],
        rows
      };
    }
  },
  {
    id: 'top10GananciaMesActual',
    nombre: 'Top 10 ganancia (mes actual)',
    descripcion: 'Productos con mayor ganancia neta en el mes actual.',
    params: [],
    run: ({ movements, plants }) => {
      const now = new Date();
      const m = now.getMonth();
      const y = now.getFullYear();
      const stats = {};
      movements.filter(mov => mov.type === 'venta' && mov.plantId && mov.date).forEach(mov => {
        const d = new Date(mov.date);
        if (d.getMonth() !== m || d.getFullYear() !== y) return;
        const pid = String(mov.plantId);
        if (!stats[pid]) stats[pid] = { id: pid, cantidad: 0, ingresos: 0, costo: 0 };
        const qty = Number(mov.quantity) || 0;
        const plant = plants.find(p => String(p.id) === pid);
        const baseCost = plant ? Number(plant.basePrice) || 0 : 0;
        const ingresos = mov.total ? Number(mov.total) : (Number(mov.price) * qty);
        stats[pid].cantidad += qty;
        stats[pid].ingresos += ingresos;
        stats[pid].costo += baseCost * qty;
      });
      const rows = Object.values(stats).map(r => {
        const plant = plants.find(p => String(p.id) === r.id);
        const ganancia = r.ingresos - r.costo;
        return {
          id: r.id,
          nombre: plant ? plant.name : '(sin nombre)',
          cantidad: r.cantidad,
          ingresos: r.ingresos,
          costo: r.costo,
          ganancia
        };
      }).sort((a, b) => b.ganancia - a.ganancia).slice(0, 10);
      return {
        columns: [
          { key: 'id', label: 'ID' },
          { key: 'nombre', label: 'Nombre' },
          { key: 'cantidad', label: 'Cant.', align: 'right' },
          { key: 'ingresos', label: 'Ingresos', align: 'right' },
          { key: 'costo', label: 'Costo', align: 'right' },
          { key: 'ganancia', label: 'Ganancia', align: 'right' }
        ],
        rows
      };
    }
  }
];

function exportCSV(columns, rows, filename) {
  if (!rows.length) return;
  const header = columns.map(c => '"' + c.label + '"').join(',');
  const lines = rows.map(r => columns.map(c => '"' + (r[c.key] ?? '') + '"').join(','));
  const csv = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CustomReportsPanel = ({ movements, plants }) => {
  const [selectedId, setSelectedId] = useState(reportDefinitions[0].id);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState({ columns: [], rows: [] });

  const currentDef = useMemo(() => reportDefinitions.find(r => r.id === selectedId), [selectedId]);

  const runReport = () => {
    if (!currentDef) return;
    setRunning(true);
    try {
      const r = currentDef.run({ movements, plants, params: {} });
      setResult(r);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded shadow p-4 mb-6">
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <h2 className="text-lg font-semibold">🧪 Generador de Reportes (Beta)</h2>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        >
          {reportDefinitions.map(def => (
            <option key={def.id} value={def.id}>{def.nombre}</option>
          ))}
        </select>
        <button
          onClick={runReport}
          disabled={running}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded disabled:opacity-50"
        >{running ? 'Ejecutando...' : 'Ejecutar'}</button>
        <button
          onClick={() => exportCSV(result.columns, result.rows, selectedId + '.csv')}
          disabled={!result.rows.length}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded disabled:opacity-50"
        >Exportar CSV</button>
      </div>
      {currentDef && (
        <p className="text-sm text-gray-600 mb-3">{currentDef.descripcion}</p>
      )}
      {!result.rows.length && (
        <div className="text-xs text-gray-500 mb-3">Ejecutá el reporte para ver resultados.</div>
      )}
      {result.rows.length > 0 && (
        <div className="overflow-auto max-h-80 border rounded">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                {result.columns.map(c => (
                  <th key={c.key} className={`px-2 py-1 text-left ${c.align==='right'?'text-right':''}`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, idx) => (
                <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                  {result.columns.map(col => (
                    <td key={col.key} className={`px-2 py-1 ${col.align==='right'?'text-right':''}`}>{
                      typeof row[col.key] === 'number' ? row[col.key].toLocaleString('es-AR') : row[col.key]
                    }</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {result.rows.length > 500 && (
            <div className="text-[10px] text-gray-500 p-1">Mostrando {result.rows.length} filas (considerá filtrar si es muy grande).</div>
          )}
        </div>
      )}
      <div className="mt-3 text-[11px] text-gray-500 leading-snug">
        <p>Beta: Los reportes se calculan en memoria con los movimientos ya cargados. Para grandes volúmenes puede requerir optimización (paginación o agregados).</p>
      </div>
    </div>
  );
};

export default CustomReportsPanel;
