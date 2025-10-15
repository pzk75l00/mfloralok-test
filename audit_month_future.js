// Auditoría adicional: ¿El neto del mes incluye movimientos a futuro?
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

async function main(){
  const snap = await getDocs(collection(db,'movements'));
  const movs=[]; snap.forEach(doc=>movs.push({id:doc.id, ...doc.data()}));
  const now=new Date(); const y=now.getFullYear(); const m=now.getMonth();
  const metodo='mercadoPago';

  // Neto del mes (todos los días del mes)
  const netMonthAll = movs.filter(mm=>{ const d=toDate(mm.date); return d && d.getFullYear()===y && d.getMonth()===m; }).reduce((s,x)=>s+signed(x,metodo),0);
  // Neto del mes hasta HOY
  const netMonthToToday = movs.filter(mm=>{ const d=toDate(mm.date); return d && d.getFullYear()===y && d.getMonth()===m && d<=now; }).reduce((s,x)=>s+signed(x,metodo),0);
  // Movimientos futuros en el mes
  const futureInMonth = movs.filter(mm=>{ const d=toDate(mm.date); return d && d.getFullYear()===y && d.getMonth()===m && d>now; });
  const futureSigned = futureInMonth.reduce((s,x)=>s+signed(x,metodo),0);

  console.log('===== AUDITORÍA FUTURO EN EL MES (MP) =====');
  console.log('Neto del mes (todos los días del mes):', netMonthAll.toLocaleString('es-AR',{minimumFractionDigits:2}));
  console.log('Neto del mes HASTA HOY:               ', netMonthToToday.toLocaleString('es-AR',{minimumFractionDigits:2}));
  console.log('Aporte de días futuros del mes:       ', futureSigned.toLocaleString('es-AR',{minimumFractionDigits:2}), `(movs=${futureInMonth.length})`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
