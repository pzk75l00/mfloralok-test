/**
 * Corrige campos dateLocal* (legacy) y agrega campos business/user cuando faltan,
 * recalculando la fecha de negocio (America/Argentina/Buenos_Aires) desde 'date' (UTC ISO).
 *
 * Uso:
 *   node scripts/fix_business_dates.js               (dry-run)
 *   node scripts/fix_business_dates.js --apply       (aplica cambios)
 *   node scripts/fix_business_dates.js --since=2025-10-01 --apply
 *   node scripts/fix_business_dates.js --id=abc123 --apply
 *
 * Lógica de corrección:
 *   - Toma cada movimiento con campo 'date'.
 *   - Deriva fecha/hora de negocio usando timezone fija.
 *   - Si dateLocalDate (legacy) difiere EXACTAMENTE +1 día o -1 día, o no existen los nuevos campos business,
 *     se marca para corrección.
 *   - Nunca corrige si la diferencia es >1 día (seguridad) salvo que se pase --force.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const config = { apiKey: 'AIzaSyCK8Rmtti1TrKRCR_sUzhncm4ebk7OoUXs', authDomain: 'mruh2-398d6.firebaseapp.com', projectId: 'mruh2-398d6' };
initializeApp(config);
const db = getFirestore();

function parseArgs(){
  const args = process.argv.slice(2);
  const opts = { apply:false, since:null, id:null, force:false };
  args.forEach(a=>{
    if(a==='--apply') opts.apply=true;
    else if(a.startsWith('--since=')) opts.since=a.split('=')[1];
    else if(a.startsWith('--id=')) opts.id=a.split('=')[1];
    else if(a==='--force') opts.force=true;
  });
  return opts;
}

function extractBusinessParts(date, tz='America/Argentina/Buenos_Aires'){
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
  const parts = Object.fromEntries(fmt.formatToParts(date).map(p=>[p.type,p.value]));
  return { Y:parts.year, M:parts.month, D:parts.day, H:parts.hour, m:parts.minute };
}

function diffDays(a,b){
  // a,b strings YYYY-MM-DD
  const [ay,am,ad]=a.split('-').map(Number);
  const [by,bm,bd]=b.split('-').map(Number);
  const da = new Date(Date.UTC(ay,am-1,ad));
  const db = new Date(Date.UTC(by,bm-1,bd));
  return Math.round((da-db)/86400000);
}

(async()=>{
  const opts=parseArgs();
  console.log('=== FIX BUSINESS DATES (dry-run=' + (!opts.apply) + ') ===');
  console.log('Opciones:', opts);
  const snap = await getDocs(collection(db,'movements'));
  const all=[]; snap.forEach(d=>all.push({id:d.id,...d.data()}));

  const filtered = all.filter(m=>{
    if(!m.date) return false;
    if(opts.id) return m.id===opts.id;
    if(opts.since){
      const limit = new Date(opts.since+'T00:00:00Z');
      const d = new Date(m.date);
      return d>=limit;
    }
    return true;
  });

  const toFix=[];
  for(const m of filtered){
    let d; try{ d=new Date(m.date); if(isNaN(d.getTime())) continue; }catch{ continue; }
    const biz = extractBusinessParts(d);
    const businessDate = `${biz.Y}-${biz.M}-${biz.D}`;
    const businessTime = `${biz.H}:${biz.m}`;
    const businessComposite = `${businessDate}T${businessTime}`;

    const legacy = m.dateLocalDate; // puede estar adelantada
    const needsBusinessFields = !m.dateBusinessDate || !m.businessTimeZone;
    let needsFix=false;
    let reason=[];

    if(legacy){
      if(legacy!==businessDate){
        const dd = diffDays(legacy,businessDate);
        if(Math.abs(dd)===1){ needsFix=true; reason.push('legacy off by '+dd+' day'); }
        else if(opts.force){ needsFix=true; reason.push('force mismatch ('+dd+' days)'); }
      }
    } else {
      needsFix=true; reason.push('no legacy dateLocalDate');
    }

    if(needsBusinessFields){ needsFix=true; reason.push('missing business fields'); }

    if(!needsFix) continue;

    // Preparar nuevo set
    const patch = {
      dateLocalDate: businessDate,
      dateLocalTime: businessTime,
      dateLocal: businessComposite,
      // nuevos (si faltan / overwrite)
      dateBusinessDate: businessDate,
      dateBusinessTime: businessTime,
      dateBusiness: businessComposite,
      businessTimeZone: 'America/Argentina/Buenos_Aires'
    };
    // Si no existen campos user y queremos retro-llenar con suposiciones: usamos mismos valores (no causará daño)
    if(!m.dateUserDate){
      patch.dateUserDate = m.dateUserDate || businessDate;
      patch.dateUserTime = m.dateUserTime || businessTime;
      patch.dateUser = m.dateUser || businessComposite;
      patch.userTimeZone = m.userTimeZone || 'America/Argentina/Buenos_Aires';
    }

    toFix.push({ id:m.id, reason: reason.join('; '), patch });
  }

  console.log('Movimientos evaluados:', filtered.length);
  console.log('Movimientos a corregir:', toFix.length);
  toFix.slice(0,50).forEach(r=> console.log(`- ${r.id} => ${r.reason} :: ${JSON.stringify(r.patch)}`));
  if(toFix.length>50) console.log('...(solo primeros 50 mostrados)');

  if(opts.apply){
    let count=0;
    for(const row of toFix){
      try {
        await updateDoc(doc(db,'movements',row.id), row.patch);
        count++;
      } catch(e){ console.error('Error actualizando', row.id, e.message); }
    }
    console.log('Correcciones aplicadas:', count);
  } else {
    console.log('\nDry-run finalizado. Ejecuta con --apply para aplicar.');
  }
})();
