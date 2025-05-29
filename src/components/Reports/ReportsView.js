import React, { useEffect, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
// Si usas Chart.js, instala: npm install chart.js react-chartjs-2
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Reportes y estadísticas
// Aquí irá la lógica y UI para mostrar gráficos y resúmenes

const ReportsView = () => {
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [plants, setPlants] = useState([]);

  useEffect(() => {
    const unsubSales = onSnapshot(collection(db, 'sales'), snap => {
      setSales(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPurchases = onSnapshot(collection(db, 'purchases'), snap => {
      setPurchases(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubPlants = onSnapshot(collection(db, 'plants'), snap => {
      setPlants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => { unsubSales(); unsubPurchases(); unsubPlants(); };
  }, []);

  // Ventas y compras por mes (ejemplo simple)
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const salesByMonth = Array(12).fill(0);
  const purchasesByMonth = Array(12).fill(0);
  sales.forEach(sale => {
    if (!sale.date) return;
    const d = new Date(sale.date);
    salesByMonth[d.getMonth()] += sale.total || 0;
  });
  purchases.forEach(purchase => {
    if (!purchase.date) return;
    const d = new Date(purchase.date);
    purchasesByMonth[d.getMonth()] += purchase.total || 0;
  });

  const data = {
    labels: months,
    datasets: [
      {
        label: 'Ventas',
        data: salesByMonth,
        backgroundColor: 'rgba(34,197,94,0.7)'
      },
      {
        label: 'Compras',
        data: purchasesByMonth,
        backgroundColor: 'rgba(239,68,68,0.7)'
      }
    ]
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Reportes y Estadísticas</h2>
      <div className="mb-8">
        <Bar data={data} options={{ responsive: true, plugins: { legend: { position: 'top' } } }} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-green-100 rounded p-4">
          <div className="font-bold">Total Ventas</div>
          <div className="text-2xl text-green-700">${sales.reduce((sum,s)=>sum+(s.total||0),0).toFixed(2)}</div>
        </div>
        <div className="bg-red-100 rounded p-4">
          <div className="font-bold">Total Compras</div>
          <div className="text-2xl text-red-700">${purchases.reduce((sum,p)=>sum+(p.total||0),0).toFixed(2)}</div>
        </div>
        <div className="bg-blue-100 rounded p-4">
          <div className="font-bold">Stock Total</div>
          <div className="text-2xl text-blue-700">{plants.reduce((sum,p)=>sum+(p.stock||0),0)}</div>
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
