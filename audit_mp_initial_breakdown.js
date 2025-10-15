// Desglose de Saldo Inicial del Mes (Mercado Pago) con normalización
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
function getTotal(m){ if(m.paymentMethods && typeof m.paymentMethods==='object'){ return Object.values(m.paymentMethods).reduce((s,a)=>s+(Number(a)||0),0);} return Number(m.total)||0; }
function distributionKey(m){ if(m.paymentMethods && typeof m.paymentMethods==='object'){ return Object.entries(m.paymentMethods).filter(([,a])=>(Number(a)||0)>0).map(([k,a])=>`${k}:${Number(a)||0}`).sort().join('|'); } return m.paymentMethod||'single'; }
function getAmountForMethod(m, method){
  const rowTotal = Number(m.total) || 0;
  if (m.paymentMethods && typeof m.paymentMethods === 'object') {
    const raw = Number(m.paymentMethods[method]) || 0;
    const sumPM = Object.values(m.paymentMethods).reduce((t, a) => t + (Number(a) || 0), 0);
    if (sumPM > 0 && rowTotal > 0 && Math.abs(sumPM - rowTotal) > 0.01) {
      const factor = rowTotal / sumPM; return +(raw * factor).toFixed(2);
    }
    return raw;
  }
  if (m.paymentMethod === method) return rowTotal;
  return 0;
}
function signedByType(m, method){ const a=getAmountForMethod(m,method); if(!a) return 0; const t=m.type; if(t==='venta'||t==='ingreso') return a; if(t==='compra'||t==='egreso'||t==='gasto') return -a; return 0; }
function normalize(movs){
  const seen=new Set(); const uniques=[];
  for(const m of movs){ if(m.id){ if(seen.has(m.id)) continue; seen.add(m.id);} uniques.push(m);} 
  const byDate=[...uniques].sort((a,b)=>toDate(a.date)-toDate(b.date));
  const toleranceSec=60; const filtered=[];
  for(const curr of byDate){ const d=toDate(curr.date); if(!d) continue; const tot=getTotal(curr); const dist=distributionKey(curr);
    const isDup=filtered.some(prev=>{ if(prev.type!==curr.type) return false; const secs=Math.abs((toDate(prev.date)-d)/1000); if(secs>toleranceSec) return false; const prevTot=getTotal(prev); if(Math.abs(prevTot-tot)>0.01) return false; return distributionKey(prev)===dist; });
    if(!isDup) filtered.push(curr);
  }
  return filtered;
}

async function main(){
  const snap=await getDocs(collection(db,'movements'));
  const all=[]; snap.forEach(doc=>all.push({id:doc.id, ...doc.data()}));
  const movs=normalize(all);
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const endPrev = new Date(y,m,0,23,59,59,999);
  const mpMovsPrev = movs.filter(mm=>{ const d=toDate(mm.date); return d && d<=endPrev; });
  const B0 = mpMovsPrev.reduce((s,mm)=>s+signedByType(mm,'mercadoPago'),0);

  console.log('===== SALDO INICIAL DEL MES (MP) =====');
  console.log('B0 (hasta fin del mes anterior):', B0.toLocaleString('es-AR',{minimumFractionDigits:2}));

  // Desglose por mes previo
  const buckets = new Map();
  for(const mm of mpMovsPrev){ const d=toDate(mm.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; if(!buckets.has(key)) buckets.set(key,{in:0,out:0,net:0}); const b=buckets.get(key); const a=getAmountForMethod(mm,'mercadoPago'); if(!a) continue; if(mm.type==='venta'||mm.type==='ingreso') b.in+=a; else if(mm.type==='compra'||mm.type==='egreso'||mm.type==='gasto') b.out+=a; }
  const ordered=[...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  let running=0; console.log('\nMes | Inicio | Ingresos | Egresos | Neto | Cierre');
  for(const [key,row] of ordered){ row.net=row.in-row.out; const start=running; const end=start+row.net; console.log(`${key} | ${start.toFixed(2)} | ${row.in.toFixed(2)} | ${row.out.toFixed(2)} | ${row.net.toFixed(2)} | ${end.toFixed(2)}`); running=end; }

  // Top movimientos que explican el último mes previo
  const prevMonthKey = ordered.length? ordered[ordered.length-1][0]:null;
  if(prevMonthKey){
    const top = mpMovsPrev.filter(mm=>{ const d=toDate(mm.date); const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; return key===prevMonthKey; })
      .map(mm=>({ id:mm.id, date:toDate(mm.date), type:mm.type, signed:signedByType(mm,'mercadoPago'), summary:mm.paymentMethods||mm.paymentMethod }))
      .sort((a,b)=>Math.abs(b.signed)-Math.abs(a.signed))
      .slice(0,20);
    console.log(`\nTop movimientos del mes ${prevMonthKey} (impacto MP):`);
    top.forEach(t=> console.log(`${t.date.toISOString().slice(0,10)} | ${t.type} | ${t.signed.toFixed(2)} | ${JSON.stringify(t.summary)}`));
  }
}

main().catch(e=>{ console.error('Error:', e); process.exit(1); });
