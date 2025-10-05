// Reporte: Productos que tienen stock actual > 0 y nunca se vendieron
// Uso: node report_products_never_sold.js > reporte_nunca_vendidos.txt

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
  const plantsSnap = await getDocs(collection(db,'plants'));
  const plants=[]; plantsSnap.forEach(d=>plants.push({id:d.id, ...d.data()}));

  const movSnap = await getDocs(collection(db,'movements'));
  const movs=[]; movSnap.forEach(d=>movs.push({id:d.id, ...d.data()}));

  const ventas = movs.filter(m=>m.type==='venta');
  const vendidos = new Set(ventas.map(v=>v.plantId).filter(Boolean));

  const nunca = plants.filter(p=> (Number(p.stock)||0) > 0 && !vendidos.has(p.id));

  console.log('Total productos:', plants.length);
  console.log('Total con stock > 0 y nunca vendidos:', nunca.length);
  console.log('Listado (id | name | stock):');
  nunca.sort((a,b)=> (a.name||'').localeCompare(b.name||''))
       .forEach(p=> console.log(`${p.id} | ${p.name||''} | ${p.stock}`));
}

main().catch(e=>{ console.error(e); process.exit(1); });
