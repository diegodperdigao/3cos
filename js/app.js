// ══════════════════════════════════════════════════════════
// 3C OS — Core Application (Supabase backend)
// ══════════════════════════════════════════════════════════
// Firebase has been fully removed. Supabase handles:
// - Auth (supabase-client.js → sb.auth)
// - Data (data.js → Data.loadAll/syncAll)
// - Realtime (data.js → Data.subscribeAll)
// ══════════════════════════════════════════════════════════

// Legacy stubs so existing code doesn't throw reference errors
// while we clean up all call sites over time
const fbAuth = { signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase removed')), signOut: () => Promise.resolve(), onAuthStateChanged: () => {}, currentUser: null };
const fbDb = null;
const FB_DOC = { get: () => Promise.resolve({ exists: false }), set: () => Promise.resolve() };

const LOGO='https://i.ibb.co/1G2wKkkY/favicon-3cgg.jpg';
const CONTRACT_TYPES={
  cpa:{label:'CPA + Rev Share',css:'cpa'},
  tiered:{label:'CPA Escalonado',css:'tiered'},
  pct_deposit:{label:'% de Depósitos',css:'deposit'},
};
const ALL_MODS=['dashboard','affiliates','brands','payments','tasks','pipeline','audit','backup','users','settings'];
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
    {id:'u1',name:'Diego Perdigão',email:'diego@3c.gg',role:'admin',status:'ativo',modules:ALL_MODS,createdAt:'2026-01-01',title:'CEO & Head of BizDev',avatar:''},
    {id:'u2',name:'Financeiro 3C',email:'fin@3c.gg',role:'financeiro',status:'ativo',modules:['dashboard','payments','audit'],createdAt:'2026-01-15',title:'Financeiro',avatar:''},
    {id:'u3',name:'Operações 3C',email:'op@3c.gg',role:'operacao',status:'ativo',modules:['dashboard','affiliates','brands','tasks'],createdAt:'2026-02-01',title:'Operações',avatar:''},
    {id:'u4',name:'Viewer Externo',email:'view@3c.gg',role:'viewer',status:'ativo',modules:['dashboard'],createdAt:'2026-03-01',title:'Consultor',avatar:''},
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
    {id:'py1',contractId:'ct1',affiliateId:'a1',affiliate:'Agência FMG',brand:'Vupi',contract:'Deal Vupi — FMG Q1 2026',amount:90000,nfReceivedDate:'2026-02-05',dueDate:'2026-02-15',status:'pago',type:'Parcela 1/2',nfName:'NF_3001.pdf'},
    {id:'py2',contractId:'ct1',affiliateId:'a1',affiliate:'Agência FMG',brand:'Vupi',contract:'Deal Vupi — FMG Q1 2026',amount:90000,nfReceivedDate:'2026-03-25',dueDate:'2026-04-01',status:'pendente',type:'Parcela 2/2',nfName:''},
    {id:'py3',contractId:'ct5',affiliateId:'a1',affiliate:'Agência FMG',brand:'Novibet',contract:'Deal Novibet — FMG',amount:60000,nfReceivedDate:'2026-03-20',dueDate:'2026-03-31',status:'aprovado',type:'Parcela 1/2',nfName:'NF_3045.pdf'},
    {id:'py4',contractId:'ct5',affiliateId:'a1',affiliate:'Agência FMG',brand:'Novibet',contract:'Deal Novibet — FMG',amount:100000,nfReceivedDate:'',dueDate:'2026-05-31',status:'pendente',type:'Parcela 2/2',nfName:''},
    {id:'py5',contractId:'ct4',affiliateId:'a5',affiliate:'Igor Lima',brand:'Superbet',contract:'RS Superbet — Igor',amount:30000,nfReceivedDate:'2026-03-19',dueDate:'2026-03-29',status:'aprovado',type:'Jan-Fev',nfName:'NF_3067.pdf'},
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
    // Prazo padrão da empresa (dias úteis) após o recebimento da NF
    // Se passar deste prazo sem ser pago, status computado = "atrasado"
    standardPaymentDays:5,
    // Mês de referência atual (para controle)
    lastGenerated:''
  },
  // ── LAB (Beta Mode) — reserved for future experimental features ──
  betaMode:false,
  // ── USER SETTINGS (persisted in localStorage + Supabase user_settings) ──
  settings:{
    theme:'default-dark',      // 'default-dark' | 'default-light' | 'mono-dark' | 'mono-light' | 'bento-dark' | 'bento-light'
    density:'comfortable',     // 'comfortable' | 'compact'
    showIntroVideo:true,
    reducedMotion:false,
    notifications:{
      paymentAlerts:true,
      taskReminders:true,
      realtimeUpdates:true,
    },
  },
  availableTags:[
    {id:'tg1',name:'VIP',color:'#f59e0b'},
    {id:'tg2',name:'Em Risco',color:'#ef4444'},
    {id:'tg3',name:'Novo',color:'#3b82f6'},
    {id:'tg4',name:'Top Performer',color:'#10b981'},
    {id:'tg5',name:'Escala',color:'#a855f7'},
  ],
};

// ── PERSISTENCE ──
const STATE = JSON.parse(JSON.stringify(DEFAULT_STATE));
let _saveTimeout = null;

const saveToLocal = () => {
  localStorage.setItem('3C_OS_DATA', JSON.stringify(STATE));
  clearTimeout(_saveTimeout);
  _saveTimeout = setTimeout(saveToCloud, 2000);
};

const saveToCloud = async () => {
  // Clean stale data
  if (STATE.auditLog && STATE.auditLog.length > 200) STATE.auditLog = STATE.auditLog.slice(0, 200);
  if (STATE.notifications && STATE.notifications.length > 50) STATE.notifications = STATE.notifications.slice(0, 50);

  // Supabase is the ONLY cloud target now (Firebase removed in Phase 4)
  if (window.SUPABASE_CONFIGURED && window.Data?.syncAll) {
    Data.syncAll().catch(err => console.warn('[saveToCloud] Supabase sync failed:', err));
  }
};

const loadFromCloud = async () => {
  // Supabase is the ONLY cloud source (Firebase removed)
  if (window.SUPABASE_CONFIGURED && window.sb && window.Data) {
    try {
      const ok = await Data.loadAll();
      if (ok) {
        if (typeof Data.subscribeAll === 'function') Data.subscribeAll();
        localStorage.setItem('3C_OS_DATA', JSON.stringify(STATE));
        console.log('[loadFromCloud] Supabase load successful');
        return;
      }
    } catch (e) {
      console.warn('[loadFromCloud] Supabase failed, using local cache:', e);
    }
  }
  // If Supabase is not configured or failed, local cache is used (already loaded by loadFromLocal)
  console.log('[loadFromCloud] Using local cache');
};

// Helper for realtime subscriptions to trigger UI re-render
window.refreshActiveModule = () => {
  const active = document.querySelector('.mod.active');
  if (!active) return;
  const id = active.id?.replace('mod-', '');
  if (id && typeof buildMod === 'function') {
    // Preserve scroll position before rebuild
    const scrollEl = active.querySelector('.mod-body') || active;
    const scrollTop = scrollEl.scrollTop;
    try { buildMod(id, active); } catch (e) { console.error('[refreshActiveModule]', e); return; }
    // Restore scroll position after rebuild
    const newScrollEl = active.querySelector('.mod-body') || active;
    if (scrollTop > 0) newScrollEl.scrollTop = scrollTop;
    if (typeof initMosaics === 'function') initMosaics();
    if (window.lucide?.createIcons) lucide.createIcons();
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
  // Ensure Lab defaults exist for existing users (backwards compat)
  if (typeof STATE.betaMode !== 'boolean') STATE.betaMode = false;
  if (!STATE.availableTags || !STATE.availableTags.length) STATE.availableTags = [...DEFAULT_STATE.availableTags];
  // Ensure deadlines.standardPaymentDays exists (added in payment status feature)
  if (!STATE.deadlines) STATE.deadlines = {...DEFAULT_STATE.deadlines};
  if (typeof STATE.deadlines.standardPaymentDays !== 'number') STATE.deadlines.standardPaymentDays = 5;
  // Ensure settings object exists with all fields (backwards compat)
  if (!STATE.settings || typeof STATE.settings !== 'object') STATE.settings = {...DEFAULT_STATE.settings};
  Object.keys(DEFAULT_STATE.settings).forEach(k=>{
    if (STATE.settings[k]===undefined) STATE.settings[k] = DEFAULT_STATE.settings[k];
  });
  if (!STATE.settings.notifications) STATE.settings.notifications = {...DEFAULT_STATE.settings.notifications};
  // Migrate: if betaMode was previously the mono trigger, translate to theme
  if (STATE.betaMode && STATE.settings.theme === 'default') {
    STATE.settings.theme = 'mono';
    STATE.betaMode = false;
  }
  // Clean up legacy labFlags shape if present
  if (STATE.labFlags) delete STATE.labFlags;
};
loadFromLocal();

// ── HELPERS ──
const fc=v=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0}).format(v||0);
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const cvC=p=>p>=60?'#10b981':p>=30?'#f59e0b':'#ef4444';
const medal=i=>{
  const tier=i<3?['gold','silver','bronze'][i]:'';
  const n=String(i+1).padStart(2,'0');
  return `<span class="rank-badge${tier?' rank-'+tier:''}">${n}</span>`;
};

// User avatar helper: returns img if URL, else colored initials circle
window.userAvatar=(nameOrUser,size=28)=>{
  const u=typeof nameOrUser==='object'?nameOrUser:(STATE.users||[]).find(x=>x.name===nameOrUser||x.id===nameOrUser);
  const name=(u?.name)||(typeof nameOrUser==='string'?nameOrUser:'?');
  const avatar=u?.avatar||'';
  const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  // deterministic color from name
  let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))|0;
  const hue=Math.abs(h)%360;
  const bg=`hsl(${hue},60%,45%)`;
  const s=size;
  if(avatar){
    return `<img class="u-avatar" src="${avatar}" alt="${name}" title="${name}${u?.title?' · '+u.title:''}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;flex-shrink:0">`;
  }
  return `<span class="u-avatar u-avatar-init" title="${name}${u?.title?' · '+u.title:''}" style="width:${s}px;height:${s}px;background:${bg};color:#fff;font-size:${Math.round(s*0.38)}px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;border-radius:50%;flex-shrink:0;font-family:var(--fd)">${initials}</span>`;
};
const od=(d,s)=>d&&s!=='pago'&&new Date(d)<new Date();
const sl=s=>({ativo:'Ativo',negociação:'Negociação',encerrado:'Encerrado'}[s]||s||'Ativo');
const pl=s=>({pendente:'Pendente',aprovado:'Aprovado',pago:'Pago',parcial:'Parcial',recusado:'Recusado',ajuste:'Ajuste Necessário',atrasado:'Atrasado',vencido:'Vencido'}[s]||s);

// ── THEME + COPILOT VISIBILITY (defined here so users.js can call them at boot) ──
// Full implementations live in settings.js and copilot.js, but these stubs
// MUST exist early because users.js session-restore calls them before
// settings.js and copilot.js have loaded.
window.applyAppTheme = () => {
  const root = document.documentElement;
  // Decoding table for "name-mode" theme keys (copy kept here in sync with settings.js)
  const MAP = {
    'default-dark':   { edition: '',         theme: 'dark'  },
    'default-light':  { edition: '',         theme: 'light' },
    'mono-dark':      { edition: 'mono',     theme: 'dark'  },
    'mono-light':     { edition: 'mono',     theme: 'light' },
    'bento-light':    { edition: 'bento',    theme: 'light' },
    'bento-dark':     { edition: 'bento',    theme: 'dark'  },
    'meridian-light': { edition: 'meridian', theme: 'light' },
    'meridian-dark':  { edition: 'meridian', theme: 'dark'  },
    'default':        { edition: '',         theme: 'dark'  },
    'mono':           { edition: 'mono',     theme: 'dark'  },
    'glass':          { edition: '',         theme: 'dark'  },
    'neonflow':       { edition: '',         theme: 'dark'  },
    'bento':          { edition: 'bento',    theme: 'light' },
  };
  const themeKey = STATE.settings?.theme || 'default-dark';
  const pair = MAP[themeKey] || MAP['default-dark'];
  root.setAttribute('data-theme', pair.theme);
  if (pair.edition && STATE.user) root.setAttribute('data-edition', pair.edition);
  else root.removeAttribute('data-edition');
  if (STATE.settings?.reducedMotion) root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');
  root.setAttribute('data-density', STATE.settings?.density || 'comfortable');
};
window.applyBetaEdition = window.applyAppTheme;

window.updateCopilotVisibility = () => {
  const btn = document.getElementById('copilot-fab');
  if (!btn) return;
  btn.style.display = (STATE?.betaMode === true && !!STATE?.user) ? 'flex' : 'none';
};

// ══════════════════════════════════════════════════════════
// PAYMENT STATUS COMPUTATION
// ══════════════════════════════════════════════════════════
// The raw STATE.payments[i].status is the WORKFLOW state
// (pendente/aprovado/ajuste/pago/recusado). The DISPLAY status
// adds time-based states (atrasado/vencido) computed on render.
//
// Rules:
//  - pago / recusado → terminal, never recomputed
//  - vencido → past the explicit dueDate (highest severity)
//  - atrasado → past company deadline (NF received + N business days)
//  - otherwise → keep stored status
//
// This function is the single source of truth for payment status
// across the UI, watchdog, notifications, and AI agents reading
// from Firestore.
// ══════════════════════════════════════════════════════════
function addBusinessDays(date, days) {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return result;
}
window.addBusinessDays = addBusinessDays;

window.computePaymentStatus = (p) => {
  if (!p) return 'pendente';
  // Terminal states — never recomputed
  if (p.status === 'pago') return 'pago';
  if (p.status === 'recusado') return 'recusado';
  if (p.status === 'ajuste') return 'ajuste';

  const now = new Date();

  // 1) Vencido — past the explicit dueDate (highest severity)
  if (p.dueDate) {
    const due = new Date(p.dueDate);
    if (due < now) return 'vencido';
  }

  // 2) Atrasado — past the company standard deadline (NF received + N business days)
  if (p.nfReceivedDate) {
    const std = STATE.deadlines?.standardPaymentDays || 5;
    const deadline = addBusinessDays(new Date(p.nfReceivedDate), std);
    if (deadline < now) return 'atrasado';
  }

  // Otherwise keep stored status (pendente / aprovado)
  return p.status || 'pendente';
};

// Returns metadata about why a payment is late + when its deadline is
window.getPaymentDeadlineInfo = (p) => {
  if (!p) return null;
  const now = new Date();
  const std = STATE.deadlines?.standardPaymentDays || 5;
  const info = { standardDays: std };

  if (p.nfReceivedDate) {
    const nfDate = new Date(p.nfReceivedDate);
    const deadline = addBusinessDays(nfDate, std);
    info.nfReceivedDate = nfDate;
    info.companyDeadline = deadline;
    info.daysUntilDeadline = Math.ceil((deadline - now) / 86400000);
  }
  if (p.dueDate) {
    const due = new Date(p.dueDate);
    info.dueDate = due;
    info.daysUntilDue = Math.ceil((due - now) / 86400000);
  }
  info.computedStatus = computePaymentStatus(p);
  return info;
};

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

// Infer action target from notification text when not explicitly set
function inferNotifAction(n){
  if(n.action)return n.action;
  const txt=(n.text||'').toLowerCase();
  // Watchdog overdue/due soon → Financeiro > Pagamentos > Pendentes
  if(/vencid|vence\s|próxim|sem comprovante/.test(txt)){
    return {module:'payments',tab:'queue',filter:'pendente'};
  }
  // Closing / fechamento → Financeiro > Fechamento
  if(/fechamento|remessa/.test(txt)){
    return {module:'payments',tab:'closing'};
  }
  // Payment adjustments/rejections → Financeiro > Pagamentos
  if(/pagamento|parcela|ajuste|recus/.test(txt)){
    return {module:'payments',tab:'queue'};
  }
  // Tasks → Tarefas
  if(/tarefa/.test(txt)){
    return {module:'tasks'};
  }
  // Affiliate → Afiliados
  if(/afiliado|crm/.test(txt)){
    return {module:'affiliates'};
  }
  return null;
}

window.navigateFromNotification=(notifId)=>{
  const n=STATE.notifications.find(x=>x.id===notifId);
  if(!n)return;
  const action=inferNotifAction(n);
  // Mark as read
  n.read=true;updateNotifBadge();
  if(!action){toggleActionCenter();return;}

  toggleActionCenter();
  // Pre-set payments tab so module builds with correct tab from the start (no flash)
  if(action.tab&&action.module==='payments'){try{_pyTab=action.tab;}catch(e){}}
  setTimeout(()=>{
    if(typeof openMod==='function')openMod(action.module);
    // Payment status filter (applied after table renders)
    if(action.filter&&action.module==='payments'){
      setTimeout(()=>{
        const filterBtn=document.querySelector(`[onclick*="pilPy('${action.filter}'"]`);
        if(filterBtn&&typeof pilPy==='function')pilPy(action.filter,filterBtn);
      },360);
    }
  },300);
  saveToLocal();
};

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
        ${STATE.notifications.map(n => {
          const hasAction = !!inferNotifAction(n);
          const unread = !n.read;
          return `
          <div class="ac-card ac-notif ${hasAction?'ac-notif-clickable':''} ${unread?'ac-notif-unread':''}" ${hasAction?`onclick="navigateFromNotification('${n.id}')"`:''}>
            <div class="ac-notif-row">
              <div class="ac-notif-dot" style="background:var(--${n.type})"></div>
              <div class="ac-notif-body">
                <div class="ac-notif-text">${n.text}</div>
                <div class="ac-notif-meta">${n.time}</div>
              </div>
              ${hasAction?`<i data-lucide="chevron-right" class="ac-notif-arrow"></i>`:''}
            </div>
          </div>`;
        }).join('')}
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

  // ── PROACTIVE ALERTS (distinct from Audit: actionable, not historical) ──
  const alerts = _computeActionAlerts();
  if (alerts.length) {
    html += `
      <div>
        <div class="ac-section-title"><i data-lucide="alert-triangle"></i> Alertas Acionáveis</div>
        ${alerts.map(al => `
          <div class="ac-card ac-notif-clickable" onclick="${al.action}" style="border-left:3px solid var(--${al.color})">
            <div class="ac-card-top">
              <span class="ac-card-title"><i data-lucide="${al.icon}" style="width:11px;height:11px;vertical-align:-1px"></i> ${al.title}</span>
              ${al.badge?`<span class="ac-badge" style="background:var(--${al.color}-dim,var(--bg));color:var(--${al.color})">${al.badge}</span>`:''}
            </div>
            <div class="ac-card-sub"><span>${al.detail}</span></div>
          </div>`).join('')}
      </div>`;
  } else if (!html) {
    html = '<div style="font-size:10px;color:var(--text3);padding:20px;text-align:center">Tudo em dia. Nenhum alerta pendente.</div>';
  }

  container.innerHTML = html;
  lucide.createIcons();
}

// Build the list of proactive, actionable alerts shown in the Action Center.
// Ordered by urgency: overdue items → items due soon → stale affiliates →
// missing monthly closing. Each alert carries an onclick navigation target
// so the user can jump straight to the relevant module.
function _computeActionAlerts() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const in7days = new Date(today.getTime() + 7 * 86400000);
  const alerts = [];

  // Overdue payments (status computed — includes vencido + atrasado)
  const overdue = (STATE.payments || []).filter(p => {
    const cs = typeof computePaymentStatus === 'function' ? computePaymentStatus(p) : p.status;
    return cs === 'vencido' || cs === 'atrasado';
  });
  if (overdue.length) {
    const total = overdue.reduce((s, p) => s + (p.amount || 0), 0);
    alerts.push({
      icon: 'alert-octagon',
      color: 'red',
      title: `${overdue.length} pagamento(s) em atraso`,
      detail: `Total: ${fc(total)} — revise no módulo Financeiro`,
      badge: overdue.length,
      action: `toggleActionCenter();openMod('payments')`,
    });
  }

  // Payments due in the next 7 days
  const dueSoon = (STATE.payments || []).filter(p => {
    if (!p.dueDate || p.status === 'pago') return false;
    const d = new Date(p.dueDate);
    return d >= today && d <= in7days;
  });
  if (dueSoon.length) {
    alerts.push({
      icon: 'calendar-clock',
      color: 'amber',
      title: `${dueSoon.length} pagamento(s) vencendo em 7 dias`,
      detail: `${dueSoon.slice(0, 2).map(p => p.affiliate || p.contract).join(', ')}${dueSoon.length > 2 ? '…' : ''}`,
      badge: dueSoon.length,
      action: `toggleActionCenter();openMod('payments')`,
    });
  }

  // Overdue tasks
  const overdueTasks = (STATE.tasks || []).filter(t => {
    if (t.status === 'concluída' || !t.dueDate) return false;
    return new Date(t.dueDate) < today;
  });
  if (overdueTasks.length) {
    alerts.push({
      icon: 'check-square',
      color: 'red',
      title: `${overdueTasks.length} tarefa(s) atrasada(s)`,
      detail: overdueTasks.slice(0, 2).map(t => t.title).join(', ') + (overdueTasks.length > 2 ? '…' : ''),
      badge: overdueTasks.length,
      action: `toggleActionCenter();openMod('tasks')`,
    });
  }

  // Affiliates with no FTD activity in 30+ days (only if reports exist)
  const stale = _computeStaleAffiliates(30);
  if (stale.length) {
    alerts.push({
      icon: 'user-x',
      color: 'amber',
      title: `${stale.length} afiliado(s) sem atividade há 30+ dias`,
      detail: stale.slice(0, 2).map(a => a.name).join(', ') + (stale.length > 2 ? '…' : ''),
      badge: stale.length,
      action: `toggleActionCenter();openMod('affiliates')`,
    });
  }

  // Monthly closing missing
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const hasClosing = (STATE.closings || []).some(c => (c.month || '').startsWith(thisMonth));
  if (!hasClosing && (STATE.affiliates || []).length > 0 && now.getDate() >= 5) {
    alerts.push({
      icon: 'calendar-check',
      color: 'blue',
      title: 'Fechamento do mês não executado',
      detail: 'Rode o fechamento em Financeiro para gerar pagamentos',
      action: `toggleActionCenter();openMod('payments')`,
    });
  }

  return alerts;
}

function _computeStaleAffiliates(daysThreshold) {
  const cutoff = new Date(Date.now() - daysThreshold * 86400000);
  const activeAffs = (STATE.affiliates || []).filter(a => a.status === 'ativo');
  if (!activeAffs.length || !STATE.reports?.length) return [];
  const lastActivityByAff = {};
  STATE.reports.forEach(r => {
    if (!r.affiliateId || !r.date) return;
    const d = new Date(r.date);
    if (!lastActivityByAff[r.affiliateId] || d > lastActivityByAff[r.affiliateId]) {
      lastActivityByAff[r.affiliateId] = d;
    }
  });
  return activeAffs.filter(a => {
    const last = lastActivityByAff[a.id];
    return !last || last < cutoff;
  });
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

// ── AUTH (PHASE 3: Supabase Auth as primary, Firebase as fallback) ──
window.doLogin=async()=>{
  const email=document.getElementById('le').value.trim();
  const pass=document.getElementById('lp').value;
  const btn=document.getElementById('lbtn');
  const err=document.getElementById('lerr');
  err.style.display='none';
  if(!email||!pass){err.textContent='Preencha email e senha.';err.style.display='block';return;}
  btn.disabled=true;btn.textContent='VERIFICANDO...';

  // ── Try Supabase Auth first ─────────────────────────────
  if (window.SUPABASE_CONFIGURED && window.sb) {
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;

      // Fetch the profile row (created by trigger on signup)
      const { data: profile } = await sb.from('profiles').select('*').eq('id', data.user.id).single();
      if (profile) {
        STATE.user = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          status: profile.status,
          modules: profile.modules || [],
          createdAt: profile.created_at?.split('T')[0] || '',
        };
      } else {
        // Profile missing — create from auth metadata
        STATE.user = {
          id: data.user.id,
          name: email.split('@')[0],
          email,
          role: 'operacao',
          status: 'ativo',
          modules: ['dashboard','affiliates'],
          createdAt: new Date().toISOString().split('T')[0],
        };
      }

      await loadFromCloud();
      localStorage.setItem('3cos_sess', JSON.stringify({ user: STATE.user, exp: Date.now() + 7*86400000 }));
      btn.disabled = false; btn.textContent = 'ACESSAR O SISTEMA';
      logAction('Login (Supabase)', email);
      showHub();
      return;
    } catch (e) {
      let msg='Credenciais inválidas.';
      if(e.message?.includes('Invalid login'))msg='Email ou senha incorretos.';
      else if(e.message?.includes('Email not confirmed'))msg='Confirme seu email antes de logar.';
      else msg=e.message||'Erro ao autenticar.';
      err.textContent=msg;
      err.style.display='block';
      btn.disabled=false;btn.textContent='ACESSAR O SISTEMA';
      return;
    }
  }

  // Supabase not configured — show error
  err.textContent='Sistema não configurado. Contate o administrador.';
  err.style.display='block';
  btn.disabled=false;btn.textContent='ACESSAR O SISTEMA';
};
window.doLogout=async ()=>{
  if (window.sb) {
    try { await sb.auth.signOut(); } catch (e) { console.warn('signOut:', e); }
  }
  if (window.Data?.unsubscribeAll) Data.unsubscribeAll();

  STATE.user=null;localStorage.removeItem('3cos_sess');
  // Force clear theme edition on logout (lock screen should always be default)
  document.documentElement.removeAttribute('data-edition');
  if (window.updateCopilotVisibility) updateCopilotVisibility();
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
    document.getElementById('hub-urole').textContent=STATE.user.title||ROLES[STATE.user.role]?.label||STATE.user.role;
    // Avatar (foto se tiver URL, senão iniciais coloridas)
    const avEl=document.getElementById('hub-user-avatar');
    if (avEl) avEl.innerHTML=window.userAvatar?window.userAvatar(STATE.user,34):'';
    document.getElementById('hub-greeting').innerHTML=`Bem-vindo(a), <strong>${fn}</strong> — selecione o módulo de trabalho`;
    const hub=document.getElementById('hub');hub.style.display='flex';
    setTimeout(()=>hub.style.opacity='1',50);
    buildHubCards(); buildMobileHome(); updateNotifBadge();
    if(window.updateLabButton)updateLabButton();
    if(window.updateCopilotVisibility)updateCopilotVisibility();
    if(window.applyAppTheme)applyAppTheme();
    initMosaics();lucide.createIcons();
    // Run payment watchdog silently after hub is fully visible.
    // No toasts — alerts go to the notification center (bell badge).
    setTimeout(()=>{if(typeof runPaymentWatchdog==='function')runPaymentWatchdog();},3000);
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
  {id:'settings',label:'Configurações',icon:'settings',sub:'Preferências · Conta',color:'rgba(148,163,184,0.32)',glow:'rgba(148,163,184,0.14)',bg:'rgba(148,163,184,0.1)',stroke:'#94a3b8'},
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
  const _doBuild = (el) => {
    try {
      buildMod(id, el);
      el.style.display='flex';
      el.classList.add('active');
      setTimeout(()=>el.style.opacity='1',50);
      initMosaics();
      lucide.createIcons();
    } catch (err) {
      console.error('[openMod] buildMod failed for', id, err);
      // Render a fallback error UI inside the module so the user isn't stuck on a blank screen
      el.innerHTML = `<div style="padding:60px 24px;text-align:center;color:var(--text2)">
        <div style="font-size:36px;margin-bottom:16px">⚠️</div>
        <div style="font-family:var(--fd);font-size:18px;font-weight:800;color:var(--text);margin-bottom:8px">Erro ao abrir o módulo</div>
        <div style="font-size:12px;margin-bottom:18px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.6">${err?.message || String(err)}</div>
        <button class="btn btn-theme" onclick="goBack()">Voltar ao Hub</button>
      </div>`;
      el.style.display='flex';
      el.classList.add('active');
      setTimeout(()=>el.style.opacity='1',50);
      lucide.createIcons();
    }
  };
  const activeMod=document.querySelector('.mod.active');
  if(activeMod){
    activeMod.style.opacity='0';
    setTimeout(()=>{
      activeMod.style.display='none';
      activeMod.classList.remove('active');
      if(window.mainChartInstance){window.mainChartInstance.destroy();window.mainChartInstance=null;}
      _doBuild(document.getElementById('mod-'+id));
    },320);
  } else {
    const hub=document.getElementById('hub');hub.style.opacity='0';
    setTimeout(()=>{
      hub.style.display='none';
      _doBuild(document.getElementById('mod-'+id));
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
    <div class="mod-hdr-l">
      <button class="mob-hamburger" onclick="openMobSidebar('${label}')"><i data-lucide="menu"></i></button>
      <div class="mod-hdr-logo" onclick="goBack()">3C<em>OS</em></div>
      <div class="mod-hdr-sep"></div>
      <div class="mod-hdr-name">${label}</div>
      ${STATE.betaMode?'<div class="beta-pill" title="Modo Beta ativo — recursos experimentais habilitados"><div class="beta-pill-dot"></div><span class="beta-pill-txt">Beta</span></div>':''}
    </div>
    <div class="mod-hdr-c">
      <div class="search-pill search-pill-sm" onclick="focusSearchInput(this)">
        <i data-lucide="search" class="search-pill-icon"></i>
        <input type="text" class="search-pill-input" placeholder="Buscar em tudo..."
               oninput="onSearchInput(event)"
               onfocus="onSearchFocus(event)"
               onkeydown="onSearchKeydown(event)"
               autocomplete="off">
        <span class="search-pill-hint">Ctrl K</span>
        <div class="search-panel"></div>
      </div>
    </div>
    <div class="mod-hdr-r">
      <div class="sync-pill"><div class="sync-dot"></div><span class="sync-txt">Cloud Sync</span></div>
      <div class="hdr-divider"></div>
      <button class="beta-btn beta-btn-sm" onclick="toggleBetaMode()" title="Modo Beta — recursos experimentais"><span class="beta-btn-txt">BETA</span><span class="beta-btn-status" aria-hidden="true"></span></button>
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
  ({dashboard:bDash,affiliates:bAffs,brands:bBrands,payments:bPayments,tasks:bTasks,pipeline:bPipeline,audit:bAudit,backup:bBackup,users:bUsers,settings:bSettings})[id]?.(el);
}

