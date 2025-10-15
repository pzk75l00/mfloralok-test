import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from '../../../firebase/firebaseConfig';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const MOVEMENT_TYPES = [
  { value: '', label: 'Todos' },
  { value: 'venta', label: 'Venta' },
  { value: 'compra', label: 'Compra' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'egreso', label: 'Egreso' },
  { value: 'gasto', label: 'Gasto' }
];

const MovementsReportTable = () => {
  const [movements, setMovements] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'movements'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMovements(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
    // Cargar plantas para mostrar nombre en vez de ID
    const unsubPlants = onSnapshot(collection(db, 'plants'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlants(data);
    });
    return () => { unsub(); unsubPlants(); };
  }, []);

  const filtered = movements.filter(mov => {
    if (typeFilter && mov.type !== typeFilter) return false;
    if (dateFrom && new Date(mov.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(mov.date) > new Date(dateTo)) return false;
    return true;
  });

  // Exportar a Excel
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'movimientos.xlsx');
  };

  // Exportar a CSV
  const exportCSV = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'movimientos.csv');
  };

  // Exportar a PDF
  const exportPDF = () => {
    const doc = new jsPDF();
    const columns = [
      'Fecha', 'Tipo', 'Producto / Detalle', 'Cantidad', 'Precio', 'Total', 'Método de Pago', 'Lugar', 'Notas'
    ];
    const rows = filtered.map(mov => [
      mov.date ? new Date(mov.date).toLocaleString('es-AR') : '',
      mov.type,
      getProductoDetalle(mov),
      mov.quantity || '',
      mov.price ? `$${mov.price}` : '',
      mov.total ? `$${mov.total}` : '',
      mov.paymentMethod,
      mov.location,
      mov.notes
    ]);
    autoTable(doc, { head: [columns], body: rows });
    doc.save('movimientos.pdf');
  };

  // Backup de la colección movements
  const backupMovements = async () => {
    const snapshot = await getDocs(collection(db, 'movements'));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    saveAs(blob, `movements_backup_${new Date().toISOString().slice(0,10)}.json`);
  };

  // Importar movimientos desde CSV/Excel
  const handleImportMovements = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      let data = evt.target.result;
      let rows = [];
      if (file.name.endsWith('.csv')) {
        // Parsear CSV
        const lines = data.split(/\r?\n/).filter(Boolean);
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        rows = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.replace(/"/g, '').trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = values[i]; });
          return obj;
        });
      } else {
        // Parsear Excel
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet);
      }
      let added = 0, updated = 0, errors = 0;
      for (const mov of rows) {
        try {
          if (!mov.id) {
            // Nuevo movimiento
            await setDoc(doc(collection(db, 'movements')), mov);
            added++;
          } else {
            // Actualizar si existe, si no, crear
            await setDoc(doc(db, 'movements', mov.id), mov, { merge: true });
            updated++;
          }
        } catch (err) {
          errors++;
        }
      }
      alert(`Importación finalizada. Agregados: ${added}, Actualizados: ${updated}, Errores: ${errors}`);
      e.target.value = '';
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Utilidad para mostrar producto/detalle correctamente
  function getProductoDetalle(mov) {
    if (mov.detail) return mov.detail;
    if (mov.plantName) return mov.plantName;
    if ((mov.type === 'compra' || mov.type === 'venta') && mov.plantId && plants.length > 0) {
      const plant = plants.find(p => String(p.id) === String(mov.plantId));
      if (plant) return plant.name;
    }
    return '-';
  }

  return (
    <div>
      <div className="flex gap-4 mb-4 items-end flex-wrap">
        <div>
          <label className="block text-xs font-semibold mb-1">Tipo</label>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded px-2 py-1">
            {MOVEMENT_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Desde</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-xs font-semibold mb-1">Hasta</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border rounded px-2 py-1" />
        </div>
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={exportExcel} className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700">Exportar Excel</button>
        <button onClick={exportCSV} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Exportar CSV</button>
        <button onClick={exportPDF} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Exportar PDF</button>
        <button onClick={backupMovements} className="bg-gray-700 text-white px-3 py-1 rounded hover:bg-gray-900">Backup BBDD</button>
        <label className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700 cursor-pointer">
          Importar Movimientos
          <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleImportMovements} style={{ display: 'none' }} />
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200 text-xs whitespace-nowrap bg-white rounded shadow">
          <thead>
            <tr>
              <th className="border border-gray-200 px-2 py-1">Fecha</th>
              <th className="border border-gray-200 px-2 py-1">Tipo</th>
              <th className="border border-gray-200 px-2 py-1">Producto / Detalle</th>
              <th className="border border-gray-200 px-2 py-1">Cantidad</th>
              <th className="border border-gray-200 px-2 py-1">Precio</th>
              <th className="border border-gray-200 px-2 py-1">Total</th>
              <th className="border border-gray-200 px-2 py-1">Método de Pago</th>
              <th className="border border-gray-200 px-2 py-1">Lugar</th>
              <th className="border border-gray-200 px-2 py-1">Notas</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} className="text-center text-gray-400 py-4">No hay movimientos para los filtros seleccionados.</td></tr>
            ) : filtered.map(mov => (
              <tr key={mov.id}>
                <td className="border border-gray-200 px-2 py-1">{mov.date ? new Date(mov.date).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</td>
                <td className="border border-gray-200 px-2 py-1">{mov.type}</td>
                <td className="border border-gray-200 px-2 py-1">{getProductoDetalle(mov)}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{mov.quantity || ''}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{mov.price ? `$${mov.price}` : ''}</td>
                <td className="border border-gray-200 px-2 py-1 text-right">{mov.total ? `$${mov.total}` : ''}</td>
                <td className="border border-gray-200 px-2 py-1">{mov.paymentMethod}</td>
                <td className="border border-gray-200 px-2 py-1">{mov.location}</td>
                <td className="border border-gray-200 px-2 py-1">{mov.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MovementsReportTable;
