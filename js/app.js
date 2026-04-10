// ══════════════════════════════════════════════════════════
// FIREBASE INITIALIZATION
// ══════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyDuiup15ELAcm78GFJ0w7pdeYu2DHy-6Zk",
  authDomain: "hub-3c.firebaseapp.com",
  projectId: "hub-3c",
  storageBucket: "hub-3c.firebasestorage.app",
  messagingSenderId: "340842089459",
  appId: "1:340842089459:web:c2072752324c52f998a086"
};
firebase.initializeApp(firebaseConfig);
const fbAuth = firebase.auth();
const fbDb = firebase.firestore();
const FB_DOC = fbDb.collection('3cos').doc('appState');

const LOGO='https://i.ibb.co/TDvNpKbv/285535120-111261434935979-5560566145880188190-n.jpg';
const CONTRACT_TYPES={
  cpa:{label:'CPA + Rev Share',css:'cpa'},
  tiered:{label:'CPA Escalonado',css:'tiered'},
  pct_deposit:{label:'% de Depósitos',css:'deposit'},
};
const ALL_MODS=['dashboard','affiliates','brands','payments','tasks','pipeline','audit','backup','users'];
const ROLES={
  admin:{label:'Admin',color:'#ef4444',desc:'Acesso total'},
  financeiro:{label:'Financeiro',color:'#f59e0b',desc:'Pagamentos e relatórios'},
  operacao:{label:'Operação',color:'#3b82f6',desc:'Dashboard e afiliados'},
  viewer:{label:'Viewer',color:'#a855f7',desc:'Somente visualização'},
};

// ── STATE BASE ORIGINAL (COMPLETO) ──
const DEFAULT_STATE={
  user:null,
  brands: {
    Vupi:{color:'#6901c7',rgb:'105,1,199',cpa:50,rs:20,type:'standard', logo: 'https://iili.io/Bq3Hck7.png'},
    Novibet:{color:'#3a5fd9',rgb:'58,95,217',rs:30,type:'tiered',levels:[{key:'l1',name:'L1',cpa:180,baseline:30},{key:'l2',name:'L2',cpa:100,baseline:300},{key:'l3',name:'L3',cpa:100,baseline:1200}], logo: 'https://i.ibb.co/1fCKT0kq/logonovibet.png'},
    Superbet:{color:'#e80104',rgb:'232,1,4',cpa:60,rs:25,type:'standard', logo: 'https://i.ibb.co/qL0KMg8k/logosuperbet.webp'},
  },
  users:[
    {id:'u1',name:'Diego Perdigão',email:'diego@3c.gg',role:'admin',status:'ativo',modules:ALL_MODS,createdAt:'2026-01-01'},
    {id:'u2',name:'Financeiro 3C',email:'fin@3c.gg',role:'financeiro',status:'ativo',modules:['dashboard','payments','audit'],createdAt:'2026-01-15'},
    {id:'u3',name:'Operações 3C',email:'op@3c.gg',role:'operacao',status:'ativo',modules:['dashboard','affiliates','brands','tasks'],createdAt:'2026-02-01'},
    {id:'u4',name:'Viewer Externo',email:'view@3c.gg',role:'viewer',status:'ativo',modules:['dashboard'],createdAt:'2026-03-01'},
  ],
  affiliates:[
    {id:'a1',name:'Agência FMG',type:'afiliado',status:'ativo',contactName:'Felipe Mendes',contactEmail:'fmg@3c.gg',contractType:'tiered',
     deals:{Vupi:{cpa:50,rs:20},Novibet:{levels:[{key:'l1',cpa:180,baseline:30},{key:'l2',cpa:100,baseline:300}],rs:30}},
     ftds:240,qftds:189,deposits:29701,netRev:288,commission:20847,profit:3794,notes:'Top afiliado. Foco em Free Fire.'},
    {id:'a2',name:'Yuri Medeiros',type:'afiliado',status:'ativo',contactName:'Yuri Medeiros',contactEmail:'yuri@3c.gg',contractType:'cpa',
     deals:{Vupi:{cpa:50,rs:20},Novibet:{levels:[{key:'l1',cpa:180,baseline:30}],rs:30}},
     ftds:68,qftds:25,deposits:5688,netRev:1300,commission:2612,profit:1218,notes:'Crescimento acelerado em março.'},
    {id:'a3',name:'Augusto Clauss',type:'afiliado',status:'ativo',contactName:'Augusto Clauss',contactEmail:'clauss@3c.gg',contractType:'deposit',
     deals:{Vupi:{cpa:0,rs:0,depositTarget:50000}},
     ftds:58,qftds:7,deposits:7289,netRev:3961,commission:1192,profit:1796,notes:'Meta depósitos R$50k/mês.'},
    {id:'a4',name:'Roberio Santos',type:'afiliado',status:'ativo',contactName:'Roberio Santos',contactEmail:'rob@3c.gg',contractType:'cpa',
     deals:{Vupi:{cpa:50,rs:20},Novibet:{levels:[{key:'l1',cpa:180,baseline:30}],rs:30}},
     ftds:24,qftds:13,deposits:12689,netRev:2500,commission:1580,profit:915,notes:''},
    {id:'a5',name:'Igor Lima',type:'afiliado',status:'ativo',contactName:'Igor Lima',contactEmail:'igor@3c.gg',contractType:'rs',
     deals:{Superbet:{cpa:0,rs:30}},
     ftds:9,qftds:12,deposits:5632,netRev:-1578,commission:1124,profit:483,notes:'Revenue Share puro Superbet.'},
    {id:'a6',name:'WeeDu',type:'afiliado',status:'ativo',contactName:'WeeDu',contactEmail:'weedu@3c.gg',contractType:'cpa',
     deals:{Vupi:{cpa:50,rs:20}},
     ftds:7,qftds:6,deposits:11956,netRev:1817,commission:1445,profit:270,notes:''},
  ],
  contracts:[
    {id:'ct1',affiliateId:'a1',affiliate:'Agência FMG',brand:'Vupi',name:'Deal Vupi — FMG Q1 2026',type:'tiered',value:180000,status:'ativo',startDate:'2026-01-01',endDate:'2026-03-31',description:'CPA escalonado L1/L2/L3.',paymentStatus:'parcial',paid:90000},
    {id:'ct2',affiliateId:'a2',affiliate:'Yuri Medeiros',brand:'Vupi',name:'Deal Vupi — Yuri Q1',type:'cpa',value:120000,status:'ativo',startDate:'2026-01-01',endDate:'2026-03-31',description:'CPA R$50 + RS 20%.',paymentStatus:'pendente',paid:0},
    {id:'ct3',affiliateId:'a3',affiliate:'Augusto Clauss',brand:'Vupi',name:'Meta Dep Vupi — Clauss',type:'deposit',value:95000,status:'ativo',startDate:'2026-02-01',endDate:'2026-04-30',description:'Meta R$50k/mês.',paymentStatus:'pendente',paid:0},
    {id:'ct4',affiliateId:'a5',affiliate:'Igor Lima',brand:'Superbet',name:'RS Superbet — Igor',type:'rs',value:60000,status:'ativo',startDate:'2026-01-01',endDate:'2026-06-30',description:'RS puro 30% Superbet.',paymentStatus:'aprovado',paid:0},
    {id:'ct5',affiliateId:'a1',affiliate:'Agência FMG',brand:'Novibet',name:'Deal Novibet — FMG',type:'tiered',value:320000,status:'ativo',startDate:'2026-01-15',endDate:'2026-03-31',description:'CPA escalonado Novibet.',paymentStatus:'parcial',paid:160000},
  ],
  payments:[
    {id:'py1',contractId:'ct1',affiliateId:'a1',affiliate:'Agência FMG',brand:'Vupi',contract:'Deal Vupi — FMG Q1 2026',amount:90000,dueDate:'2026-02-15',status:'pago',type:'Parcela 1/2',nfName:'NF_3001.pdf'},
    {id:'py2',contractId:'ct1',affiliateId:'a1',affiliate:'Agência FMG',brand:'Vupi',contract:'Deal Vupi — FMG Q1 2026',amount:90000,dueDate:'2026-04-01',status:'pendente',type:'Parcela 2/2',nfName:''},
    {id:'py3',contractId:'ct5',affiliateId:'a1',affiliate:'Agência FMG',brand:'Novibet',contract:'Deal Novibet — FMG',amount:60000,dueDate:'2026-03-31',status:'aprovado',type:'Parcela 1/2',nfName:'NF_3045.pdf'},
    {id:'py4',contractId:'ct5',affiliateId:'a1',affiliate:'Agência FMG',brand:'Novibet',contract:'Deal Novibet — FMG',amount:100000,dueDate:'2026-05-31',status:'pendente',type:'Parcela 2/2',nfName:''},
    {id:'py5',contractId:'ct4',affiliateId:'a5',affiliate:'Igor Lima',brand:'Superbet',contract:'RS Superbet — Igor',amount:30000,dueDate:'2026-03-29',status:'aprovado',type:'Jan-Fev',nfName:'NF_3067.pdf'},
  ],
  reports:[
    {brand:'Vupi',affiliateId:'a1',date:'2026-03-01',ftd:18,qftd:14,deposits:2200,netRev:22},
    {brand:'Vupi',affiliateId:'a1',date:'2026-03-15',ftd:22,qftd:17,deposits:2800,netRev:35},
    {brand:'Vupi',affiliateId:'a1',date:'2026-03-25',ftd:15,qftd:12,deposits:1900,netRev:18},
    {brand:'Vupi',affiliateId:'a2',date:'2026-03-10',ftd:8,qftd:3,deposits:680,netRev:120},
    {brand:'Vupi',affiliateId:'a2',date:'2026-03-20',ftd:12,qftd:5,deposits:920,netRev:180},
    {brand:'Vupi',affiliateId:'a3',date:'2026-03-05',ftd:12,qftd:1,deposits:1800,netRev:400},
    {brand:'Vupi',affiliateId:'a3',date:'2026-03-18',ftd:15,qftd:2,deposits:2100,netRev:510},
    {brand:'Vupi',affiliateId:'a4',date:'2026-03-12',ftd:10,qftd:6,deposits:2800,netRev:280},
    {brand:'Vupi',affiliateId:'a6',date:'2026-03-08',ftd:7,qftd:6,deposits:4000,netRev:380},
    {brand:'Novibet',affiliateId:'a1',date:'2026-03-01',ftd:55,qftd:42,deposits:8800,netRev:55},
    {brand:'Novibet',affiliateId:'a1',date:'2026-03-15',ftd:62,qftd:50,deposits:9200,netRev:68},
    {brand:'Novibet',affiliateId:'a1',date:'2026-03-25',ftd:48,qftd:38,deposits:7800,netRev:42},
    {brand:'Novibet',affiliateId:'a4',date:'2026-03-10',ftd:14,qftd:7,deposits:9200,netRev:220},
    {brand:'Superbet',affiliateId:'a5',date:'2026-03-01',ftd:4,qftd:5,deposits:2400,netRev:-450},
    {brand:'Superbet',affiliateId:'a5',date:'2026-03-15',ftd:5,qftd:7,deposits:3200,netRev:-1128},
  ],
  tasks:[
    {id:'tk1',title:'Enviar fechamento FMG — Parcela 2/2 Vupi',description:'Checar se o afiliado já enviou os dados bancários novos pelo WhatsApp.',linkedModule:'payments',affiliateId:'a1',contractId:'ct1',priority:'alta',status:'pendente',assignee:'Diego Perdigão',dueDate:'2026-04-01'},
    {id:'tk2',title:'Verificar NF Clauss — Meta depósitos fevereiro',description:'Cobrar a emissão da NF contra a base nova.',linkedModule:'payments',affiliateId:'a3',contractId:'ct3',priority:'alta',status:'em andamento',assignee:'Financeiro 3C',dueDate:'2026-03-31'},
    {id:'tk3',title:'Renovar deal Yuri — Q2 2026',description:'Discutir com ele um possível aumento de CPA condicionado a atingimento de metas e escalonamento.',linkedModule:'affiliates',affiliateId:'a2',contractId:'ct2',priority:'média',status:'pendente',assignee:'Diego Perdigão',dueDate:'2026-04-10'},
    {id:'tk4',title:'Ajustar RS Igor — renegociar taxa',description:'',linkedModule:'affiliates',affiliateId:'a5',contractId:'ct4',priority:'média',status:'pendente',assignee:'Operações 3C',dueDate:'2026-04-15'},
    {id:'tk5',title:'Relatório conversão Novibet FMG — março',description:'Subir relatório na pasta compartilhada do Drive.',linkedModule:'dashboard',affiliateId:'a1',contractId:'ct5',priority:'baixa',status:'concluída',assignee:'Operações 3C',dueDate:'2026-04-05'},
  ],
  auditLog:[],
  notifications:[
    {id:'n1',type:'red',text:'Pagamento "Deal Vupi FMG" vence em 2 dias — R$ 90.000',time:'há 1h',read:false},
    {id:'n2',type:'amber',text:'NF Parcela 2/2 Novibet FMG ainda não anexada',time:'há 3h',read:false},
    {id:'n3',type:'red',text:'Pagamento Igor Lima (Superbet) vence amanhã — R$ 30.000',time:'há 5h',read:false},
    {id:'n4',type:'green',text:'Parcela 1/2 Vupi FMG confirmada: R$ 90.000',time:'há 2d',read:true},
  ],
  pipeline:{
    stages:[
      {id:'s1',name:'Lead',color:'#94a3b8'},
      {id:'s2',name:'Negociação',color:'#f59e0b'},
      {id:'s3',name:'Deal Fechado',color:'#3b82f6'},
      {id:'s4',name:'Ativo',color:'#10b981'},
      {id:'s5',name:'Inativo',color:'#ef4444'}
    ],
    cards:[{id:'pk1',affiliateId:'a1',affiliateName:'Agência FMG',stageId:'s4',value:25000,note:'Top performer, foco em Free Fire',createdAt:'01/04/2026',updatedAt:'03/04/2026'}]
  },
  deadlines:{
    // Dia do mês que cada marca repassa o valor de apuração para a 3C
    brandPayDays:{Vupi:15,Novibet:20,Superbet:25},
    // Dias após recebimento da marca para pagar o afiliado
    affiliatePayDays:10,
    // Dias antes do vencimento para gerar tarefa de envio de NF
    nfReminderDays:5,
    // Mês de referência atual (para controle)
    lastGenerated:''
  },
};

// ── PERSISTENCE (LOCALSTORAGE) ──
const STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
// ── PERSISTENCE: localStorage (cache) + Firestore (cloud) ──
// ── PERSISTENCE: localStorage (cache) + Firestore (cloud) ──
let _saveTimeout = null;
let _dailyWrites = parseInt(localStorage.getItem('3cos_writes_today')||'0');
let _writesDate = localStorage.getItem('3cos_writes_date')||'';
const WRITE_LIMIT_WARNING = 15000; // avisa com 75% do limite
const WRITE_LIMIT_BLOCK = 19000;   // bloqueia com 95%

const resetWriteCounter = () => {
  const today = new Date().toISOString().split('T')[0];
  if (_writesDate !== today) { _dailyWrites = 0; _writesDate = today; }
};

const saveToLocal = () => {
  localStorage.setItem('3C_OS_DATA', JSON.stringify(STATE));
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveToCloud, 2000);
};

const saveToCloud = async () => {
  if (!fbAuth.currentUser) return;
  resetWriteCounter();

  if (_dailyWrites >= WRITE_LIMIT_BLOCK) {
    console.warn('Cloud save blocked: daily write limit reached');
    return;
  }
  if (_dailyWrites === WRITE_LIMIT_WARNING) {
    toast('Atenção: 75% do limite diário de escritas na nuvem','w');
  }

  try {
    // Limpar dados antigos para economizar espaço
    if (STATE.auditLog.length > 200) STATE.auditLog = STATE.auditLog.slice(0, 200);
    if (STATE.notifications.length > 50) STATE.notifications = STATE.notifications.slice(0, 50);

    const data = {
      brands: STATE.brands,
      users: STATE.users,
      affiliates: STATE.affiliates,
      contracts: STATE.contracts,
      payments: STATE.payments,
      reports: STATE.reports,
      tasks: STATE.tasks,
      auditLog: STATE.auditLog,
      notifications: STATE.notifications,
      deadlines: STATE.deadlines || {},
      closings: STATE.closings || [],
      pipeline: STATE.pipeline || {stages:[],cards:[]},
      reminders: STATE.reminders || [],
      emailjs: STATE.emailjs || {},
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: STATE.user?.email || 'unknown'
    };
    await FB_DOC.set(data, { merge: true });
    _dailyWrites++;
    localStorage.setItem('3cos_writes_today', String(_dailyWrites));
    localStorage.setItem('3cos_writes_date', _writesDate);
  } catch (e) {
    console.warn('Cloud save failed:', e.message);
    if (e.code === 'resource-exhausted') {
      toast('Limite do Firebase atingido. Dados salvos localmente.', 'w');
    }
  }
};

const loadFromCloud = async () => {
  try {
    const snap = await FB_DOC.get();
    if (snap.exists) {
      const cloud = snap.data();
      if (cloud.brands) STATE.brands = cloud.brands;
      if (cloud.users) STATE.users = cloud.users;
      if (cloud.affiliates) STATE.affiliates = cloud.affiliates;
      if (cloud.contracts) STATE.contracts = cloud.contracts;
      if (cloud.payments) STATE.payments = cloud.payments;
      if (cloud.reports) STATE.reports = cloud.reports;
      if (cloud.tasks) STATE.tasks = cloud.tasks;
      if (cloud.auditLog) STATE.auditLog = cloud.auditLog;
      if (cloud.notifications) STATE.notifications = cloud.notifications;
      if (cloud.deadlines) STATE.deadlines = cloud.deadlines;
      if (cloud.closings) STATE.closings = cloud.closings;
      if (cloud.pipeline) STATE.pipeline = cloud.pipeline;
      if (cloud.reminders) STATE.reminders = cloud.reminders;
      if (cloud.emailjs) STATE.emailjs = cloud.emailjs;
      localStorage.setItem('3C_OS_DATA', JSON.stringify(STATE));
    } else {
      // Primeiro acesso: salva dados iniciais na nuvem
      await saveToCloud();
    }
  } catch (e) {
    console.warn('Cloud load failed, using local cache:', e.message);
  }
};

const fixBrandLogos = () => {
  // Força logos corretas (sobrescreve cache antigo)
  const correctLogos = {
    'Vupi': 'https://iili.io/Bq3Hck7.png',
    'Novibet': 'https://i.ibb.co/1fCKT0kq/logonovibet.png',
    'Superbet': 'https://i.ibb.co/qL0KMg8k/logosuperbet.webp'
  };
  Object.keys(STATE.brands).forEach(b => {
    if (correctLogos[b]) STATE.brands[b].logo = correctLogos[b];
    else if (!STATE.brands[b].logo) STATE.brands[b].logo = LOGO;
  });
};

const loadFromLocal = () => {
  const data = localStorage.getItem('3C_OS_DATA');
  if (data) {
    const parsed = JSON.parse(data);
    Object.assign(STATE, parsed);
    fixBrandLogos();
  }
};
loadFromLocal(); 

// ── HELPERS ──
const fc=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0}).format(v||0);
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const cvC=p=>p>=60?'#10b981':p>=30?'#f59e0b':'#ef4444';
const medal=i=>['🥇','🥈','🥉'][i]||'#'+(i+1);
const od=(d,s)=>d&&s!=='pago'&&new Date(d)<new Date();
const sl=s=>({ativo:'Ativo',negociação:'Negociação',encerrado:'Encerrado'}[s]||s||'Ativo');
const pl=s=>({pendente:'Pendente',aprovado:'Aprovado',pago:'Pago',parcial:'Parcial',recusado:'Recusado',ajuste:'Ajuste Necessário'}[s]||s);

function toast(msg,t='s'){
  const el=document.createElement('div');el.className=`toast t${t}`;el.textContent=msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(()=>el.classList.add('show'),10);
  setTimeout(()=>{el.classList.remove('show');setTimeout(()=>el.remove(),300);},3200);
}
window.toast=toast;

function openModal(title,body,ftr=''){
  document.getElementById('mttl').textContent=title;
  document.getElementById('mbd').innerHTML=body;
  document.getElementById('mft').innerHTML=ftr;
  document.getElementById('modal-ov').classList.add('open');
  lucide.createIcons();
}
function closeModal(){document.getElementById('modal-ov').classList.remove('open');}
window.closeModal=closeModal;

function logAction(action,detail){
  STATE.auditLog.unshift({id:'a'+Date.now(),action,detail,user:STATE.user?.name||'Sistema',time:new Date().toLocaleString('pt-BR')});
  if(STATE.auditLog.length>100)STATE.auditLog.pop();
  saveToLocal(); 
  updateActionCenter(); 
}

// ── ACTION CENTER LÓGICA ──
function updateNotifBadge(){
  const n=STATE.notifications.filter(x=>!x.read).length;
  const el=document.getElementById('hub-notif-count');
  if(el){el.textContent=n>9?'9+':n;el.style.display=n>0?'flex':'none';}
}

window.toggleActionCenter=()=>{
  const panel = document.getElementById('action-center');
  const overlay = document.getElementById('ac-overlay');
  const isOpen = panel.classList.contains('open');
  
  if (isOpen) {
    panel.classList.remove('open');
    overlay.classList.remove('open');
    STATE.notifications.forEach(n=>n.read=true);
    updateNotifBadge();
    saveToLocal();
  } else {
    updateActionCenter();
    panel.classList.add('open');
    overlay.classList.add('open');
  }
};

window.clearNotifs=()=>{
  STATE.notifications=[]; 
  updateActionCenter(); 
  updateNotifBadge(); 
  saveToLocal();
};

function updateActionCenter() {
  const container = document.getElementById('ac-body-content');
  if (!container) return;
  
  let html = '';

  if (STATE.notifications.length) {
    html += `
      <div>
        <div class="ac-section-title"><i data-lucide="bell"></i> Avisos <button onclick="clearNotifs()" style="margin-left:auto;background:none;border:none;color:var(--text3);font-size:8px;cursor:pointer">Limpar</button></div>
        ${STATE.notifications.map(n => `
          <div class="ac-card" style="display:flex; gap:10px; align-items:flex-start">
            <div style="width:6px;height:6px;border-radius:50%;background:var(--${n.type});margin-top:5px;flex-shrink:0"></div>
            <div>
              <div style="font-size:11px;font-weight:500;color:var(--text);line-height:1.4">${n.text}</div>
              <div style="font-size:9px;color:var(--text3);margin-top:3px">${n.time}</div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  if (STATE.user?.role === 'financeiro' || STATE.user?.role === 'admin') {
    const pending = STATE.payments.filter(p => p.status === 'pendente' || p.status === 'ajuste').slice(0, 3);
    if(pending.length) {
      html += `
        <div>
          <div class="ac-section-title"><i data-lucide="clock"></i> Fila Financeira</div>
          ${pending.map(p => `
            <div class="ac-card" onclick="toggleActionCenter(); openMod('payments')">
              <div class="ac-card-top">
                <span class="ac-card-title">${p.affiliate}</span>
                <span style="color:var(--${p.status==='ajuste'?'amber':'blue'});font-weight:700;font-size:11px">${fc(p.amount)}</span>
              </div>
              <div class="ac-card-sub"><span>${p.contract}</span><span class="ac-badge" style="background:var(--bg);color:var(--${p.status==='ajuste'?'amber':'text2'})">${pl(p.status)}</span></div>
            </div>`).join('')}
        </div>`;
    }
  }
  
  if (STATE.user?.role !== 'financeiro') {
    const myTasks = STATE.tasks.filter(t => t.status !== 'concluída' && (t.assignee.toLowerCase().includes(STATE.user.name.split(' ')[0].toLowerCase()) || t.assignee === 'Operação' || STATE.user.role === 'admin')).slice(0, 3);
    if(myTasks.length) {
      html += `
        <div>
          <div class="ac-section-title"><i data-lucide="check-square"></i> Suas Tarefas</div>
          ${myTasks.map(t => `
            <div class="ac-card" onclick="toggleActionCenter(); openMod('tasks')">
              <div class="ac-card-top">
                <span class="ac-card-title">${t.title}</span>
                <span class="ac-badge" style="background:var(--bg);color:${t.priority==='alta'?'var(--red)':'var(--text2)'}">${t.priority}</span>
              </div>
              <div class="ac-card-sub"><span style="color:var(--theme)">${t.dueDate?new Date(t.dueDate).toLocaleDateString('pt-BR'):'Sem prazo'}</span></div>
            </div>`).join('')}
        </div>`;
    }
  }

  const recent = STATE.auditLog.slice(0, 4);
  html += `
    <div>
      <div class="ac-section-title"><i data-lucide="radio"></i> Radar da Equipe</div>
      ${recent.length ? recent.map(a => `
        <div class="ac-card" style="cursor:default">
          <div class="ac-card-title" style="margin-bottom:4px">${a.action}</div>
          <div class="ac-card-sub"><span>${a.user}</span><span>${a.time.split(' ')[0]}</span></div>
        </div>`).join('') : '<div style="font-size:10px;color:var(--text3)">Sem atividade recente.</div>'}
    </div>`;

  container.innerHTML = html;
  lucide.createIcons();
}

// ── THEME ──
window.toggleTheme=function(){
  const isLight=document.documentElement.getAttribute('data-theme')==='light';
  document.documentElement.setAttribute('data-theme',isLight?'dark':'light');
  localStorage.setItem('3cos_theme',isLight?'dark':'light');
  document.querySelectorAll('#theme-icon').forEach(el=>el.setAttribute('data-lucide',isLight?'sun':'moon'));
  lucide.createIcons();
  
  if(window.mainChartInstance) {
      window.mainChartInstance.options.plugins.legend.labels.color = isLight ? '#0f172a' : '#fff';
      window.mainChartInstance.options.scales.x.ticks.color = isLight ? '#475569' : '#9898b8';
      window.mainChartInstance.options.scales.y.ticks.color = isLight ? '#475569' : '#9898b8';
      window.mainChartInstance.options.scales.x.grid.color = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
      window.mainChartInstance.options.scales.y.grid.color = isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)';
      window.mainChartInstance.update();
  }

  if(document.getElementById('mod-brands') && document.getElementById('mod-brands').classList.contains('active')) {
      const activeTabBtn = document.querySelector('#brand-tabs .tab.on');
      if(activeTabBtn) setBrandTab(_brandTab, activeTabBtn, document.getElementById('mod-brands'));
  }
};
(()=>{const t=localStorage.getItem('3cos_theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();

// ── AUTH ──
window.doLogin=async()=>{
  const email=document.getElementById('le').value.trim();
  const pass=document.getElementById('lp').value;
  const btn=document.getElementById('lbtn');
  const err=document.getElementById('lerr');
  err.style.display='none';
  if(!email||!pass){err.textContent='Preencha email e senha.';err.style.display='block';return;}
  btn.disabled=true;btn.textContent='VERIFICANDO...';

  try {
    await fbAuth.signInWithEmailAndPassword(email, pass);
    const found=STATE.users.find(u=>u.email===email&&u.status==='ativo');
    if(!found){
      // Usuário existe no Firebase Auth mas não no STATE — cria perfil básico
      const newUser={id:'u'+Date.now(),name:email.split('@')[0],email,role:'viewer',status:'ativo',modules:['dashboard'],createdAt:new Date().toISOString().split('T')[0]};
      STATE.users.push(newUser);
      STATE.user=newUser;
    } else {
      STATE.user=found;
    }
    await loadFromCloud();
    localStorage.setItem('3cos_sess',JSON.stringify({user:STATE.user,exp:Date.now()+7*86400000}));
    btn.disabled=false;btn.textContent='ACESSAR O SISTEMA';
    logAction('Login',email);
    showHub();
  } catch(e) {
    let msg='Credenciais inválidas.';
    if(e.code==='auth/user-not-found')msg='Usuário não encontrado no sistema.';
    else if(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential')msg='Senha incorreta.';
    else if(e.code==='auth/too-many-requests')msg='Muitas tentativas. Aguarde um momento.';
    err.textContent=msg;
    err.style.display='block';
    btn.disabled=false;btn.textContent='ACESSAR O SISTEMA';
  }
};
window.doLogout=()=>{
  fbAuth.signOut();
  STATE.user=null;localStorage.removeItem('3cos_sess');
  const hub=document.getElementById('hub');hub.style.opacity='0';
  setTimeout(()=>{hub.style.display='none';
    document.querySelectorAll('.mod').forEach(m=>{m.classList.remove('active');m.style.display='none';m.style.opacity='0';});
    const lock=document.getElementById('lock');lock.style.display='flex';setTimeout(()=>lock.style.opacity='1',50);
  },400);
};
function showHub(){
  document.getElementById('lock').style.opacity='0';
  setTimeout(()=>{
    document.getElementById('lock').style.display='none';
    const fn=STATE.user.name.split(' ')[0];
    document.getElementById('hub-uname').textContent=STATE.user.name;
    document.getElementById('hub-urole').textContent=ROLES[STATE.user.role]?.label||STATE.user.role;
    document.getElementById('hub-greeting').innerHTML=`Bem-vindo(a), <strong>${fn}</strong> — selecione o módulo de trabalho`;
    const hub=document.getElementById('hub');hub.style.display='flex';
    setTimeout(()=>hub.style.opacity='1',50);
    buildHubCards(); buildMobileHome(); updateNotifBadge();
    initMosaics();lucide.createIcons();
  },650);
}

// ── HUB CARDS ──
const MODS=[
  {id:'dashboard',label:'Dashboard',icon:'bar-chart-2',sub:'KPIs · Intel · Ranking',color:'rgba(236,72,153,0.32)',glow:'rgba(236,72,153,0.14)',bg:'rgba(236,72,153,0.1)',stroke:'#ec4899'},
  {id:'affiliates',label:'Afiliados',icon:'users',sub:'CRM · Contratos · Deals',color:'rgba(96,165,250,0.32)',glow:'rgba(96,165,250,0.14)',bg:'rgba(96,165,250,0.1)',stroke:'#3b82f6'},
  {id:'brands',label:'Marcas',icon:'tag',sub:'Casas Parceiras · Deals',color:'rgba(168,85,247,0.32)',glow:'rgba(168,85,247,0.14)',bg:'rgba(168,85,247,0.1)',stroke:'#a855f7'},
  {id:'payments',label:'Financeiro',icon:'banknote',sub:'Pagamentos · NFs',color:'rgba(245,158,11,0.32)',glow:'rgba(245,158,11,0.14)',bg:'rgba(245,158,11,0.1)',stroke:'#f59e0b'},
  {id:'tasks',label:'Tarefas',icon:'check-square',sub:'Workflow integrado',color:'rgba(16,185,129,0.32)',glow:'rgba(16,185,129,0.14)',bg:'rgba(16,185,129,0.1)',stroke:'#10b981'},
  {id:'pipeline',label:'Pipeline',icon:'git-branch',sub:'Kanban · Funil',color:'rgba(14,165,233,0.32)',glow:'rgba(14,165,233,0.14)',bg:'rgba(14,165,233,0.1)',stroke:'#0ea5e9'},
  {id:'audit',label:'Auditoria',icon:'activity',sub:'Log · Registro',color:'rgba(200,255,0,0.28)',glow:'rgba(200,255,0,0.12)',bg:'rgba(200,255,0,0.08)',stroke:'#c8ff00'},
  {id:'backup',label:'Backup',icon:'cloud',sub:'Nuvem · Exportar',color:'rgba(14,165,233,0.32)',glow:'rgba(14,165,233,0.14)',bg:'rgba(14,165,233,0.1)',stroke:'#0ea5e9'},
  {id:'users',label:'Usuários',icon:'shield',sub:'Acessos · Cargos',color:'rgba(239,68,68,0.32)',glow:'rgba(239,68,68,0.14)',bg:'rgba(239,68,68,0.1)',stroke:'#ef4444',adminOnly:true},
];
function buildHubCards(){
  const userMods=STATE.user?.modules||[];
  const isAdmin=STATE.user?.role==='admin';
  const visible=MODS.filter(m=>!m.adminOnly||isAdmin).filter(m=>isAdmin||userMods.includes(m.id));
  document.getElementById('hub-cards').innerHTML=visible.map(m=>`
    <div class="hub-app" onclick="openMod('${m.id}')"
      style="--app-border:${m.color};--app-glow:${m.glow};--app-bg:${m.bg};--app-stroke:${m.stroke}">
      <div class="hub-app-icon"><i data-lucide="${m.icon}"></i></div>
      <div class="hub-app-name">${m.label}</div>
    </div>`).join('');
  const count=visible.length;
  document.getElementById('hub-cards').style.gridTemplateColumns=`repeat(${Math.min(count,6)},1fr)`;
  lucide.createIcons();
}

// ── MOBILE HOME (tasks + notifications) ──
function buildMobileHome(){
  const el=document.getElementById('hub-mobile-home');if(!el)return;
  const myTasks=STATE.tasks.filter(t=>t.status!=='concluída').sort((a,b)=>{
    const pr={alta:0,média:1,baixa:2};return(pr[a.priority]||2)-(pr[b.priority]||2);
  }).slice(0,6);
  const notifs=STATE.notifications.filter(n=>!n.read).slice(0,4);
  const pendPay=STATE.payments.filter(p=>p.status==='pendente'||p.status==='ajuste').slice(0,3);

  el.innerHTML=`
    ${notifs.length?`<div class="mob-home-section">
      <div class="mob-home-title"><i data-lucide="bell"></i> Alertas</div>
      ${notifs.map(n=>`<div class="mob-home-card" onclick="toggleActionCenter()" style="display:flex;gap:10px;align-items:flex-start">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--${n.type});margin-top:6px;flex-shrink:0"></div>
        <div><div style="font-size:12px;font-weight:500;color:var(--text);line-height:1.4">${n.text}</div>
        <div style="font-size:9px;color:var(--text3);margin-top:3px">${n.time}</div></div>
      </div>`).join('')}
    </div>`:''}

    <div class="mob-home-section">
      <div class="mob-home-title"><i data-lucide="check-square"></i> Tarefas Pendentes (${myTasks.length})</div>
      ${myTasks.length?myTasks.map(t=>{
        const priCol=t.priority==='alta'?'var(--red)':t.priority==='média'?'var(--amber)':'var(--text3)';
        return `<div class="mob-home-card" onclick="openMod('tasks')" style="border-left:3px solid ${priCol}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
            <div style="font-size:12px;font-weight:600;color:var(--text);line-height:1.3;flex:1">${t.title}</div>
            <span class="pri pri-${t.priority[0]==='a'?'a':t.priority[0]==='m'?'m':'b'}" style="flex-shrink:0">${t.priority.toUpperCase()}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-top:6px;font-size:10px;color:var(--text2)">
            <span>${t.assignee||'Sem responsável'}</span>
            ${t.dueDate?`<span style="${new Date(t.dueDate)<new Date()?'color:var(--red)':''}">${new Date(t.dueDate).toLocaleDateString('pt-BR')}</span>`:''}
          </div>
        </div>`;
      }).join(''):`<div class="mob-home-empty">Nenhuma tarefa pendente</div>`}
    </div>

    ${pendPay.length?`<div class="mob-home-section">
      <div class="mob-home-title"><i data-lucide="banknote"></i> Pagamentos Pendentes</div>
      ${pendPay.map(p=>`<div class="mob-home-card" onclick="openMod('payments')" style="display:flex;justify-content:space-between;align-items:center">
        <div><div style="font-size:12px;font-weight:600;color:var(--text)">${p.affiliate}</div>
        <div style="font-size:10px;color:var(--text2)">${p.contract}</div></div>
        <div style="text-align:right"><div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--theme)">${fc(p.amount)}</div>
        <div style="font-size:9px;color:var(--text3)">${p.dueDate?new Date(p.dueDate).toLocaleDateString('pt-BR'):''}</div></div>
      </div>`).join('')}
    </div>`:''}

    <div class="mob-home-section" style="margin-top:8px">
      <button class="btn btn-outline" style="width:100%;justify-content:center" onclick="openMobSidebar()">
        <i data-lucide="grid"></i> Abrir Módulos
      </button>
    </div>`;
  lucide.createIcons();
}

// ── MODULE OPEN/CLOSE ──
window.openMod=id=>{
  sessionStorage.setItem('3cos_activeMod',id);
  const activeMod=document.querySelector('.mod.active');
  if(activeMod){
    activeMod.style.opacity='0';
    setTimeout(()=>{activeMod.style.display='none';activeMod.classList.remove('active');
      if(window.mainChartInstance){window.mainChartInstance.destroy();window.mainChartInstance=null;}
      const el=document.getElementById('mod-'+id);
      buildMod(id,el);el.style.display='flex';el.classList.add('active');
      setTimeout(()=>el.style.opacity='1',50);initMosaics();lucide.createIcons();
    },320);
  } else {
    const hub=document.getElementById('hub');hub.style.opacity='0';
    setTimeout(()=>{hub.style.display='none';
      const el=document.getElementById('mod-'+id);
      buildMod(id,el);el.style.display='flex';el.classList.add('active');
      setTimeout(()=>el.style.opacity='1',50);initMosaics();lucide.createIcons();
    },320);
  }
  updateBottomNav(id);
};
window.goBack=()=>{
  sessionStorage.removeItem('3cos_activeMod');
  document.querySelectorAll('.mod.active').forEach(a=>{a.style.opacity='0';setTimeout(()=>{a.style.display='none';a.classList.remove('active');},320);});
  const hub=document.getElementById('hub');hub.style.display='flex';setTimeout(()=>hub.style.opacity='1',50);
  if(window.mainChartInstance) { window.mainChartInstance.destroy(); window.mainChartInstance = null; }
  buildHubCards();buildMobileHome();updateNotifBadge();initMosaics();lucide.createIcons();
  updateBottomNav('hub');
};
function updateBottomNav(activeId){
  const nav=document.getElementById('mob-bottom-nav');if(!nav)return;
  const map={hub:0,dashboard:1,affiliates:2,pipeline:3,payments:4};
  nav.querySelectorAll('.mob-bnav-item').forEach((item,i)=>{
    item.classList.toggle('active',i===(map[activeId]??-1));
  });
}

function initMosaics(){
  document.querySelectorAll('.mosaic-pattern').forEach(el=>{
    // Only set if no background-image has been set yet
    const bg=el.style.backgroundImage;
    if(!bg || bg==='none' || bg===''){
      el.style.backgroundImage=`url('${LOGO}')`;
    }
  });
}

function modHdr(label){
  return `<div class="mod-hdr">
    <button class="mob-hamburger" onclick="openMobSidebar('${label}')"><i data-lucide="menu"></i></button>
    <div class="mod-hdr-logo" onclick="goBack()">3C<em>OS</em></div>
    <div class="mod-hdr-sep"></div>
    <div class="mod-hdr-name">${label}</div>
    <div class="mod-hdr-r">
      <div class="sync-dot"></div><span class="sync-txt">Cloud Sync</span>
      <button class="hdr-btn" onclick="toggleActionCenter()"><i data-lucide="bell"></i></button>
      <button class="hdr-btn" onclick="toggleTheme()"><i data-lucide="sun"></i></button>
      <button class="hdr-btn" onclick="goBack()"><i data-lucide="grid"></i> Hub</button>
      <button class="hdr-btn" onclick="doLogout()"><i data-lucide="log-out"></i> Sair</button>
    </div>
  </div>`;
}

function heroHTML(mosId,eyebrow,title,sub){
  return `<div class="hero" id="${mosId}-hero">
    <div class="mosaic-wrapper"><div class="mosaic-container"><div class="mosaic-pattern" id="mosaic-${mosId}"></div></div></div>
    <div class="hero-overlay"></div><div class="hero-accent"></div>
    <div class="hero-content">
      <div class="hero-eyebrow">${eyebrow}</div>
      <div class="hero-title">${title}</div>
      <div class="hero-sub">${sub}</div>
    </div>
  </div>`;
}

function buildMod(id,el){
  ({dashboard:bDash,affiliates:bAffs,brands:bBrands,payments:bPayments,tasks:bTasks,pipeline:bPipeline,audit:bAudit,backup:bBackup,users:bUsers})[id]?.(el);
}

