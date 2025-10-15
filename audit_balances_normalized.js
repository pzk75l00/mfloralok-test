// Auditoría NORMALIZADA: replica la lógica de la app (dedupe por ID y ventana 60s + pagos mixtos)
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const devConfig = {
  apiKey: "AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs",
  authDomain: "mruh2-398d6.firebaseapp.com",
  databaseURL: "https://mruh2-398d6.firebaseio.com",
  projectId: "mruh2-398d6",
  storageBucket: "mruh2-398d6.appspot.com",
  messagingSenderId: "274684476540",
  appId: "1:274684476540:web:5dc96795cee6e8c81d5df9"
};

const app = initializeApp(devConfig);
const db = getFirestore(app);

function toDate(v){ if(!v) return null; if(typeof v.toDate==='function') return v.toDate(); const d=new Date(v); return isNaN(d.getTime())?null:d; }
function getTotal(m){
  if(m.paymentMethods && typeof m.paymentMethods==='object'){
    return Object.values(m.paymentMethods).reduce((s,a)=>s+(Number(a)||0),0);
  }
  return Number(m.total)||0;
}
function distributionKey(m){
  if(m.paymentMethods && typeof m.paymentMethods==='object'){
    return Object.entries(m.paymentMethods)
      .filter(([,amount]) => (Number(amount)||0) > 0)
      .map(([k,a])=>`${k}:${Number(a)||0}`)
      .sort()
      .join('|');
  }
  return m.paymentMethod || 'single';
}
function getAmountForMethod(m, method){
  const rowTotal = Number(m.total) || 0;
  if (m.paymentMethods && typeof m.paymentMethods === 'object') {
    const raw = Number(m.paymentMethods[method]) || 0;
    const sumPM = Object.values(m.paymentMethods).reduce((t, a) => t + (Number(a) || 0), 0);
    if (sumPM > 0 && rowTotal > 0 && Math.abs(sumPM - rowTotal) > 0.01) {
      // Escalar proporcional al total de la fila (mismo criterio que la app)
      const factor = rowTotal / sumPM;
      return +(raw * factor).toFixed(2);
    }
    return raw;
  }
  if (m.paymentMethod === method) {
    return rowTotal;
  }
  return 0;
}
function signedByType(m, method){
  const a=getAmountForMethod(m,method);
  if(!a) return 0;
  const t=m.type;
  if(t==='venta'||t==='ingreso') return a;
  if(t==='compra'||t==='egreso'||t==='gasto') return -a;
  return 0;
}

function normalizeMovements(movs){
  // 1) Dedupe por ID
  const seen=new Set();
  const uniques=[];
  for(const m of movs){
    if(m.id){ if(seen.has(m.id)) continue; seen.add(m.id); }
    uniques.push(m);
  }
  // 2) Dedupe ventana 60s con misma firma (tipo + total + distribución)
  const byDate=[...uniques].sort((a,b)=>toDate(a.date)-toDate(b.date));
  const toleranceSec=60;
  const filtered=[];
  for(const curr of byDate){
    const currDate=toDate(curr.date); if(!currDate) continue;
    const currTotal=getTotal(curr);
    const currDist=distributionKey(curr);
    const isDup = filtered.some(prev => {
      if(prev.type!==curr.type) return false;
      const secs=Math.abs((toDate(prev.date)-currDate)/1000);
      if(secs>toleranceSec) return false;
      const prevTotal=getTotal(prev);
      if(Math.abs(prevTotal-currTotal)>0.01) return false;
      const prevDist=distributionKey(prev);
      return prevDist===currDist;
    });
    if(!isDup) filtered.push(curr);
  }
  return filtered;
}

async function main(){
  const snap=await getDocs(collection(db,'movements'));
  const movs=[]; snap.forEach(doc=>movs.push({id:doc.id, ...doc.data()}));
  const normalized = normalizeMovements(movs);

  const now=new Date();
  const cutoff=now; // hasta hoy

  const methods=['mercadoPago','efectivo'];
  for(const method of methods){
    const available = normalized
      .filter(m=>{ const d=toDate(m.date); return d && d<=cutoff; })
      .reduce((s,m)=>s+signedByType(m,method),0);

    const monthNet = normalized
      .filter(m=>{ const d=toDate(m.date); return d && d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth(); })
      .reduce((s,m)=>s+signedByType(m,method),0);

    console.log(`\nMétodo: ${method}`);
    console.log('  Disponible (normalizado) hasta hoy:', available.toLocaleString('es-AR',{minimumFractionDigits:2}));
    console.log('  Neto del mes (normalizado):        ', monthNet.toLocaleString('es-AR',{minimumFractionDigits:2}));
  }
}

main().catch(e=>{ console.error('Error:', e); process.exit(1); });
