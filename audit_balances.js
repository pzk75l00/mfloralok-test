// Auditoría de saldos: Disponible total vs Mes actual (MP y Efectivo)
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
function getAmount(m, method){
  if(m.paymentMethods && typeof m.paymentMethods==='object'){ return Number(m.paymentMethods[method])||0; }
  if(m.paymentMethod===method){ return Number(m.total)||0; }
  return 0;
}
function signed(m, method){ const a=getAmount(m, method); if(!a) return 0; const t=m.type; if(t==='venta'||t==='ingreso') return a; if(t==='compra'||t==='egreso'||t==='gasto') return -a; return 0; }
function balanceUntil(movs, date, method){ return movs.filter(m=>{ const d=toDate(m.date); return d && d<=date; }).reduce((s,m)=>s+signed(m,method),0); }
function monthNet(movs, y, m, method){ return movs.filter(mm=>{ const d=toDate(mm.date); return d && d.getFullYear()===y && d.getMonth()===m; }).reduce((s,x)=>s+signed(x,method),0); }

async function main(){
  const snap = await getDocs(collection(db,'movements'));
  const movs=[]; snap.forEach(doc=>movs.push({id:doc.id, ...doc.data()}));
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const endPrev = new Date(y,m,0,23,59,59,999); const endToday = new Date(y,m,now.getDate(),23,59,59,999);
  const methods=['mercadoPago','efectivo'];
  const res={};
  for(const method of methods){
    const inicial = balanceUntil(movs, endPrev, method);
    const disponible = balanceUntil(movs, endToday, method);
    const netoMes = monthNet(movs, y, m, method);
    res[method]={ inicial, netoMes, disponible };
  }
  console.log('===== AUDITORÍA DE SALDOS =====');
  for(const method of methods){
    const r=res[method];
    console.log(`\nMétodo: ${method}`);
    console.log('  Saldo inicial del mes:', r.inicial.toLocaleString('es-AR',{minimumFractionDigits:2}));
    console.log('  Neto del mes:        ', r.netoMes.toLocaleString('es-AR',{minimumFractionDigits:2}));
    console.log('  Disponible hoy:      ', r.disponible.toLocaleString('es-AR',{minimumFractionDigits:2}));
    const calc=(r.inicial + r.netoMes).toFixed(2);
    const disp=r.disponible.toFixed(2);
    console.log('  Chequeo inicial + neto == disponible ? ', calc===disp?'OK':'MISMATCH', `(calc=${calc}, disp=${disp})`);
    console.log('  Regla "Disponible no negativo" =>', r.disponible>=0?'OK':'FALLA');
  }
}

main().catch(e=>{ console.error(e); process.exit(1); });
