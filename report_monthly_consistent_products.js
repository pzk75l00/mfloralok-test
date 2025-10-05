// Reporte: Productos que se vendieron en TODOS los meses con ventas registradas
// Uso: node report_monthly_consistent_products.js [--limit=3000] > reporte_consistentes.txt

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
require('dotenv').config();

const cfg = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
};

if (!cfg.apiKey || !cfg.projectId) {
  console.error('Faltan variables REACT_APP_FIREBASE_*');
  process.exit(1);
}

initializeApp(cfg);
const db = getFirestore();

function toDate(v){ if(!v) return null; if(typeof v.toDate==='function') return v.toDate(); const d=new Date(v); return isNaN(d.getTime())?null:d; }

async function main(){
  const limitArg = process.argv.find(a=>a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1],10):3000;

  const snap = await getDocs(collection(db,'movements'));
  const movs=[]; snap.forEach(d=>movs.push({id:d.id, ...d.data()}));

  const ventas = movs.filter(m=>m.type==='venta');
  const monthSet = new Set();
  const perMonthMap = new Map(); // key month => Set(productId)

  for(const v of ventas){
    const d = toDate(v.date); if(!d) continue;
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    monthSet.add(key);
    const pid = v.plantId || v.plantName || '??';
    if(!perMonthMap.has(key)) perMonthMap.set(key,new Set());
    perMonthMap.get(key).add(pid);
  }

  const allMonths = Array.from(monthSet).sort();
  if(allMonths.length===0){
    console.log('No hay ventas.'); return;
  }

  // Intersección de sets
  let intersection = new Set(perMonthMap.get(allMonths[0]));
  for(let i=1;i<allMonths.length;i++){
    const s = perMonthMap.get(allMonths[i]);
    intersection = new Set([...intersection].filter(x=>s.has(x)));
    if(intersection.size===0) break;
  }

  console.log('Meses considerados ('+allMonths.length+'):', allMonths.join(', '));
  console.log('Cantidad de productos con venta en TODOS los meses:', intersection.size); 
  console.log('Listado:');
  [...intersection].sort().forEach(p=>console.log(p));
}

main().catch(e=>{ console.error(e); process.exit(1); });
