/**
 * Diagnóstico de movimientos del día (impacto Mercado Pago)
 * NO escribe nada, solo lee y calcula.
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
// Función mínima local para obtener monto MP sin depender del bundle ESM
function getMovementAmountForPaymentMethod(movement, paymentMethod){
  if(!movement) return 0;
  const total = parseFloat(movement.total)||0; if(total<=0) return 0;
  if(movement.paymentMethods && typeof movement.paymentMethods==='object'){
    const sumPM = Object.values(movement.paymentMethods).reduce((s,v)=>s+(parseFloat(v)||0),0);
    const raw = parseFloat(movement.paymentMethods[paymentMethod])||0;
    if(sumPM===0 && movement.paymentMethod===paymentMethod) return total;
    if(sumPM>0 && Math.abs(sumPM-total)>0.01){ const factor = total/sumPM; return +(raw*factor).toFixed(2); }
    return raw;
  }
  if(movement.paymentMethod===paymentMethod) return total;
  return 0;
}

const config = { apiKey: 'AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs', authDomain: 'mruh2-398d6.firebaseapp.com', projectId: 'mruh2-398d6' };
initializeApp(config);
const db = getFirestore();

(async () => {
  const todayLocal = new Date();
  const Y = todayLocal.getFullYear();
  const M = todayLocal.getMonth();
  const D = todayLocal.getDate();

  const snap = await getDocs(collection(db,'movements'));
  const rows = [];
  snap.forEach(d=>rows.push({ id:d.id, ...d.data() }));

  const isSameDay = (dObj) => dObj.getFullYear()===Y && dObj.getMonth()===M && dObj.getDate()===D;

  const todayRows = rows.filter(r => {
    if (!r.date) return false;
    const d = new Date(r.date);
    if (isNaN(d.getTime())) return false;
    return isSameDay(d);
  }).sort((a,b)=> new Date(a.date)-new Date(b.date));

  console.log('=== DIAGNOSTICO MP DIA ===');
  console.log('Total movimientos hoy:', todayRows.length);

  let mpSigned = 0;
  let mpInflows = 0;
  let mpOutflows = 0;
  const lines = todayRows.map(r => {
    const mp = getMovementAmountForPaymentMethod(r, 'mercadoPago');
    let sign = 0;
    if (['venta','ingreso'].includes(r.type)) { mpSigned += mp; mpInflows += mp; sign = +mp; }
    else if (['compra','egreso','gasto'].includes(r.type)) { mpSigned -= mp; mpOutflows += mp; sign = -mp; }
    return { id: r.id, type: r.type, total: r.total, mp, signed: sign, date: r.date, dateLocalDate: r.dateLocalDate };
  });

  console.table(lines);
  console.log('MP Ingresos(+):', mpInflows.toFixed(2));
  console.log('MP Egresos(-):', mpOutflows.toFixed(2));
  console.log('MP Neto Día:', mpSigned.toFixed(2));

  // Mostrar si hay movimientos con paymentMethods todo 0
  const zeroPM = todayRows.filter(r => r.paymentMethods && Object.values(r.paymentMethods).every(v => !v || v===0));
  if (zeroPM.length) {
    console.log('\n⚠️ Movimientos con paymentMethods en 0 (usando fallback paymentMethod simple):', zeroPM.map(r=>r.id));
  }
})();
