// Estado global del prototipo (persistido en localStorage)
const S = {
  cfg: { tenantId: 'floral-sa', ownerEmail: 'responsable@cliente.com', rubro: 'floreria', seatsPurchased: 5 },
  allowlist: false,
  hasTenant: false,
  ownerBypass: false,
  demoRubro: 'floreria',
  signup: null,
  payment: null,
  license: { salesEnabled: false, seatsUsed: 0, versionDeployed: 'v1.0.0' },
  seats: [],
  prov: {}
};

const $ = (s)=>document.querySelector(s);
const $$ = (s)=>document.querySelectorAll(s);

function save(){ localStorage.setItem('e2eProto', JSON.stringify(S)); }
function load(){ try{ Object.assign(S, JSON.parse(localStorage.getItem('e2eProto'))||{});}catch(_){} }

// Tabs
function bindTabs(){
  $$('.tabs button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $$('.tabs button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      $$('.tab').forEach(t=>t.classList.remove('active'));
      $('#tab-'+btn.dataset.tab).classList.add('active');
    });
  });
}

// Flow tab
function bindFlow(){
  $('#chkAllowed').checked = S.allowlist;
  $('#chkHasTenant').checked = S.hasTenant;
  $('#chkOwner').checked = S.ownerBypass;
  $('#demoRubro').value = S.demoRubro;
  updateDemoBox();

  $('#chkAllowed').addEventListener('change', (e)=>{ S.allowlist = e.target.checked; save(); });
  $('#chkHasTenant').addEventListener('change', (e)=>{ S.hasTenant = e.target.checked; save(); });
  $('#chkOwner').addEventListener('change', (e)=>{ S.ownerBypass = e.target.checked; save(); });
  $('#demoRubro').addEventListener('change', (e)=>{ S.demoRubro = e.target.value; updateDemoBox(); save(); });

  $('#btnSimulateLogin').addEventListener('click', ()=>{
    const res = decideLogin();
    $('#loginResult').textContent = 'Resultado: ' + res.message;
  });
  $('#btnSubmitSignup').addEventListener('click', ()=>{
    const doc = {
      comercio: $('#fComercio').value || 'Floral SA',
      email: $('#fEmail').value || S.cfg.ownerEmail,
      tel: $('#fTel').value || '+54...',
      rubroId: $('#fRubro').value || 'floreria',
      status: 'pending', createdAt: new Date().toISOString()
    };
    S.signup = doc; save();
    $('#signupResult').textContent = 'Estado: recibido (pending). Será aprobado por dueños.';
  });
  $('#btnPay').addEventListener('click', ()=>{
    S.payment = { status: 'paid', at: new Date().toISOString() };
    S.hasTenant = true; // post-provisioning
    S.license.salesEnabled = true;
    save();
    $('#payResult').textContent = 'Pago: aprobado. Se habilitan ventas en el tenant.';
  });
  $('#btnDecline').addEventListener('click', ()=>{
    S.payment = { status: 'declined', at: new Date().toISOString() };
    save();
    $('#payResult').textContent = 'Pago: NO realizado. Acceso a vistas protegidas se bloquea.';
  });
}

function decideLogin(){
  if (S.ownerBypass) return { to: 'app', message: 'Dueño: bypass activo, entra a la app.' };
  if (S.hasTenant) return { to: 'app', message: 'Tenant existente: acceso normal.' };
  if (S.allowlist) return { to: 'signup', message: 'Allowlist OK pero sin tenant: completar alta/pago.' };
  return { to: 'demo', message: 'No allowlist: ver DEMO solo lectura o solicitar alta.' };
}

function updateDemoBox(){
  const map = { floreria: 'florería · 12 productos, 3 reportes', vivero: 'vivero · 18 productos, 4 reportes', jardineria: 'jardinería · 9 servicios, 2 reportes' };
  $('#demoBox').textContent = 'Dataset: ' + (map[S.demoRubro]||S.demoRubro);
}

// Factory tab (Mis Apps)
function ensureFactoryRegistry(){
  // Persist a pequeño registro simulado en localStorage para múltiples apps
  const key = 'e2eProtoFactoryRegistry';
  let reg = [];
  try { reg = JSON.parse(localStorage.getItem(key)||'[]'); } catch(_) { reg = []; }
  // Si no hay nada, inicializa con un par de tenants de ejemplo, incluyendo el actual
  if (!reg.length) {
    reg = [
      {
        tenantId: S.cfg.tenantId,
        ownerEmail: S.cfg.ownerEmail,
        rubro: S.cfg.rubro,
        appUrl: `https://apps.mundofloral.com/${S.cfg.tenantId}`,
        version: S.license.versionDeployed
      },
      {
        tenantId: 'demo-vivero',
        ownerEmail: S.cfg.ownerEmail,
        rubro: 'vivero',
        appUrl: 'https://apps.mundofloral.com/demo-vivero',
        version: 'v1.0.0'
      },
      {
        tenantId: 'otra-tienda',
        ownerEmail: 'otra.persona@cliente.com',
        rubro: 'jardineria',
        appUrl: 'https://apps.mundofloral.com/otra-tienda',
        version: 'v1.2.3'
      }
    ];
    localStorage.setItem(key, JSON.stringify(reg));
  }
  return reg;
}

function renderFactoryList(entries){
  const ul = $('#factoryList');
  ul.innerHTML = '';
  if (!entries || !entries.length) return;
  entries.forEach(t => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${t.tenantId}</strong> · ${t.rubro}
      <span class="meta">URL: <a href="${t.appUrl}" target="_blank" rel="noopener">${t.appUrl}</a> · versión ${t.version||'—'}</span>
      <div class="actions">
        <a href="${t.appUrl}" target="_blank" rel="noopener"><button>Ir a mi app</button></a>
      </div>
    `;
    ul.appendChild(li);
  });
}

function bindFactory(){
  // Prefill con el ownerEmail actual para agilizar la prueba
  $('#factoryEmail').value = S.cfg.ownerEmail || '';
  ensureFactoryRegistry();
  $('#btnFactoryLookup').addEventListener('click', ()=>{
    const email = ($('#factoryEmail').value||'').trim().toLowerCase();
    if(!email){ $('#factoryMsg').textContent = 'Ingresá un email para buscar.'; renderFactoryList([]); return; }
    const reg = ensureFactoryRegistry();
    const found = reg.filter(t => (t.ownerEmail||'').toLowerCase() === email);
    if (!found.length) {
      $('#factoryMsg').textContent = 'No hay apps vinculadas a este email en el registro.';
      renderFactoryList([]);
    } else {
      $('#factoryMsg').textContent = `Encontradas ${found.length} app(s) para ${email}.`;
      renderFactoryList(found);
    }
  });
  $('#btnFactoryClear').addEventListener('click', ()=>{
    $('#factoryEmail').value = '';
    $('#factoryMsg').textContent = '—';
    renderFactoryList([]);
  });
}

// Provisioning tab
const provSteps = [
  ['createProject', 'Crear proyecto Firebase'],
  ['authSetup', 'Configurar Auth y dominios'],
  ['rules', 'Subir reglas e índices'],
  ['seeds', 'Seeds: admins/auth/license/rubro'],
  ['build', 'Construir binario con config del tenant'],
  ['repo', 'Crear repo cliente y subir binario'],
  ['hosting', 'Configurar hosting'],
  ['deploy', 'Deploy inicial'],
  ['verify', 'Verificación de acceso']
];

function renderProvisioning(){
  const list = $('#provSteps');
  list.innerHTML = '';
  provSteps.forEach(([key,title], idx)=>{
    const li = document.createElement('li');
    li.className = S.prov[key] ? 'done' : '';
    li.innerHTML = `
      <span>${idx+1}. ${title}</span>
      <span>
        <button data-k="${key}" class="small ${S.prov[key]?'ghost':''}">${S.prov[key]?'Desmarcar':'Marcar hecho'}</button>
      </span>`;
    list.appendChild(li);
  });
}

function bindProvisioning(){
  $('#provSteps').addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-k]');
    if(!b) return;
    const k = b.dataset.k; S.prov[k] = !S.prov[k]; save(); renderProvisioning();
  });
  $('#btnProvAll').addEventListener('click', ()=>{ provSteps.forEach(([k])=> S.prov[k]=true); save(); renderProvisioning(); });
  $('#btnProvClear').addEventListener('click', ()=>{ S.prov = {}; save(); renderProvisioning(); });
}

// Seats tab
function renderLicenseSummary(){
  const div = $('#licSummary');
  div.innerHTML = `
    <div class="summary">
      <div class="row"><strong>Modelo:</strong> per-app</div>
      <div class="row"><strong>Tenant:</strong> ${S.cfg.tenantId}</div>
      <div class="row"><strong>Sales enabled:</strong> ${S.license.salesEnabled ? 'sí' : 'no'}</div>
      <div class="row"><strong>Seats comprados:</strong> ${S.cfg.seatsPurchased}</div>
      <div class="row"><strong>Seats usados:</strong> ${S.license.seatsUsed}</div>
      <div class="row"><strong>Owner:</strong> ${S.cfg.ownerEmail}</div>
      <div class="row"><strong>Versión desplegada:</strong> ${S.license.versionDeployed}</div>
    </div>`;
}

function renderSeatList(){
  const ul = $('#seatList');
  ul.innerHTML='';
  S.seats.forEach(email=>{
    const li=document.createElement('li');
    li.textContent = email;
    ul.appendChild(li);
  });
}

function bindSeats(){
  $('#btnAssign').addEventListener('click', ()=>{
    const email = ($('#seatEmail').value||'').trim().toLowerCase();
    if(!email) return;
    if(S.seats.includes(email)) { $('#seatMsg').textContent='Ya asignado.'; return; }
    if(S.license.seatsUsed >= S.cfg.seatsPurchased) { $('#seatMsg').textContent='Sin seats disponibles.'; return; }
    S.seats.push(email); S.license.seatsUsed++; save();
    $('#seatMsg').textContent='Asignado.'; renderSeatList(); renderLicenseSummary();
  });
  $('#btnRevoke').addEventListener('click', ()=>{
    const email = ($('#seatEmail').value||'').trim().toLowerCase();
    const i = S.seats.indexOf(email);
    if(i<0){ $('#seatMsg').textContent='No existe este asiento.'; return; }
    S.seats.splice(i,1); S.license.seatsUsed = Math.max(0, S.license.seatsUsed-1); save();
    $('#seatMsg').textContent='Revocado.'; renderSeatList(); renderLicenseSummary();
  });
}

// Upgrades tab
function bindUpgrades(){
  $('#btnPublish').addEventListener('click', ()=>{
    const v = ($('#newVersion').value||'').trim() || 'v1.0.1';
    S.license.versionDeployed = v; save();
    $('#upgradeMsg').textContent = 'Upgrade publicado: ' + v + ' (simulado)';
    renderLicenseSummary();
  });
}

// Config tab
function bindConfig(){
  $('#tenantId').value = S.cfg.tenantId;
  $('#ownerEmail').value = S.cfg.ownerEmail;
  $('#tenantRubro').value = S.cfg.rubro;
  $('#tenantSeats').value = S.cfg.seatsPurchased;
  $('#btnSaveConfig').addEventListener('click', ()=>{
    S.cfg.tenantId = $('#tenantId').value || 'floral-sa';
    S.cfg.ownerEmail = $('#ownerEmail').value || 'responsable@cliente.com';
    S.cfg.rubro = $('#tenantRubro').value || 'floreria';
    S.cfg.seatsPurchased = parseInt($('#tenantSeats').value,10)||5;
    save();
    $('#cfgMsg').textContent = 'Guardado.';
    renderLicenseSummary();
  });
  $('#btnResetConfig').addEventListener('click', ()=>{
    S.cfg = { tenantId:'floral-sa', ownerEmail:'responsable@cliente.com', rubro:'floreria', seatsPurchased:5 };
    save(); location.reload();
  });
}

(function init(){
  load();
  bindTabs();
  bindFactory();
  bindFlow();
  renderProvisioning(); bindProvisioning();
  renderLicenseSummary(); renderSeatList(); bindSeats();
  bindUpgrades();
  bindConfig();
})();
