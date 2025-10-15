/**
 * Script de corrección fina de distribuciones de métodos de pago por movimiento.
 * Detecta movimientos (venta/compra) cuyo total > suma(paymentMethods) y completa la diferencia
 * en el método preferido (default mercadoPago). No fusiona movimientos; corrige cada registro.
 *
 * Uso:
 *   node scripts/fix_payment_distributions.js --since=2025-10-01 --apply
 * Flags:
 *   --since=YYYY-MM-DD   Fecha mínima (inclusive) (default=ayer)
 *   --apply              Ejecuta cambios (sin flag = dry-run)
 *   --method=mercadoPago Método preferido para absorber delta
 *   --types=venta,compra Tipos incluidos
 */
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const config = { apiKey: 'AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs', authDomain: 'mruh2-398d6.firebaseapp.com', projectId: 'mruh2-398d6' };
initializeApp(config);
const db = getFirestore();

function parseArgs(){
  const args=process.argv.slice(2); const opts={apply:false,method:'mercadoPago',types:['venta','compra']};
  args.forEach(a=>{ if(a==='--apply') opts.apply=true; else if(a.startsWith('--since=')) opts.since=a.split('=')[1]; else if(a.startsWith('--method=')) opts.method=a.split('=')[1]; else if(a.startsWith('--types=')) opts.types=a.split('=')[1].split(','); });
  if(!opts.since){ const d=new Date(); d.setDate(d.getDate()-1); opts.since=d.toISOString().slice(0,10);} return opts; }
function toDate(v){ if(!v) return null; if(typeof v.toDate==='function') return v.toDate(); const d=new Date(v); return isNaN(d.getTime())?null:d; }
const r2 = n => +((n||0).toFixed(2));

(async()=>{
  const opts=parseArgs();
  console.log('=== FIX PAYMENT DISTRIBUTIONS v2 (dry-run=' + (!opts.apply) + ') ===');
  console.log('Parametros:', opts);
  const snap=await getDocs(collection(db,'movements'));
  const movs=[]; snap.forEach(d=>movs.push({id:d.id,...d.data()}));
  const since=new Date(opts.since+'T00:00:00');
  const candidates=movs.filter(m=>{
    const d=toDate(m.date); if(!d) return false; return d>=since && opts.types.includes(m.type);
  });
  const fixes=[];
  for(const m of candidates){
    const total = r2(parseFloat(m.total)||0); if(total<=0) continue;
    const pm = { efectivo:0, mercadoPago:0, transferencia:0, tarjeta:0, ...(m.paymentMethods||{}) };
    const sumPM = r2(Object.values(pm).reduce((s,v)=>s+(parseFloat(v)||0),0));
    const diff = r2(total - sumPM);
    if(diff > 0.009){
      // Elegir método para ajuste
      let method = pm[opts.method] >=0 ? opts.method : 'mercadoPago';
      if(pm[method] === 0){
        // si preferido cero, tomar el mayor existente; si todos 0, usar preferido igualmente
        const max = Object.entries(pm).sort((a,b)=>b[1]-a[1])[0];
        if(max && max[1]>0) method = max[0];
      }
      fixes.push({ id:m.id, method, add:diff, before:pm[method]||0, total, sumPM });
      if(opts.apply){
        pm[method] = r2((pm[method]||0) + diff);
        await updateDoc(doc(db,'movements',m.id), { paymentMethods: pm, paymentSummary: `${method}:${pm[method]}` });
      }
    }
  }
  if(!fixes.length){ console.log('Sin diferencias a corregir.'); return; }
  console.log(`Movimientos con delta: ${fixes.length}`);
  fixes.forEach(f=>{
    console.log(`- ${f.id}  total=${f.total} sumPM=${f.sumPM} diff=${f.add} -> ${f.method} pasa ${f.before} => ${(f.before+f.add).toFixed(2)}`);
  });
  if(!opts.apply){ console.log('\nDry-run finalizado. Ejecuta con --apply para aplicar.'); }
  else { console.log('\nCorrecciones aplicadas.'); }
})();
