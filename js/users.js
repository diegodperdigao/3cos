// ══════════════════════════════════════════════════════════
// 7. USUÁRIOS
// ══════════════════════════════════════════════════════════
function bUsers(el){
  el.innerHTML=modHdr('Usuários — Controle de Acesso')+`<div class="mod-body">
    ${heroHTML('users','Admin','Gestão de Usuários','Controle de permissões e acessos')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Usuários ativos</div>
        <button class="btn btn-theme" onclick="openNewUser()"><i data-lucide="user-plus"></i>Novo Usuário</button>
      </div>
      <div class="user-grid">
        ${STATE.users.map(u=>`<div class="user-card" style="border:1px solid var(--gb)">
          <div class="user-av" style="color:${ROLES[u.role]?.color};background:${ROLES[u.role]?.color}22;border-color:${ROLES[u.role]?.color}44">${u.name[0]}</div>
          <div class="user-info">
            <div class="user-name">${u.name} <span class="role-badge role-${u.role}" style="margin-left:8px">${ROLES[u.role]?.label}</span></div>
            <div class="user-email">${u.email} · Criado em ${new Date(u.createdAt).toLocaleDateString('pt-BR')}</div>
            <div class="user-mods">${u.modules.map(m=>`<span class="mod-chip">${MODS.find(x=>x.id===m)?.label||m}</span>`).join('')}</div>
          </div>
          <div style="display:flex;gap:4px">
            <button class="ibt" onclick="openEditUser('${u.id}')" data-tooltip="Editar usuário"><i data-lucide="edit-3"></i></button>
            <button class="ibt ${u.status==='ativo'?'danger':'green'}" onclick="toggleUserStatus('${u.id}')" data-tooltip="${u.status==='ativo'?'Bloquear acesso':'Desbloquear acesso'}">
              <i data-lucide="${u.status==='ativo'?'lock':'unlock'}"></i>
            </button>
          </div>
        </div>`).join('')}
      </div>
    </div></div>`;
  lucide.createIcons();
}

// ══════════════════════════════════════════════════════════
// BACKUP & NUVEM (módulo separado)
// ══════════════════════════════════════════════════════════
function bBackup(el){
  const lastSync=STATE.lastSync||'Nunca';
  const dataSize=JSON.stringify(STATE).length;
  const dataSizeKB=Math.round(dataSize/1024);
  el.innerHTML=modHdr('Backup & Nuvem')+`<div class="mod-body">
    ${heroHTML('backup','Backup','Backup & Nuvem','Exportar, importar e sincronizar seus dados')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Status da Sincronização</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:24px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Supabase</div>
          <div style="font-size:14px;font-weight:700;color:${window.SUPABASE_CONFIGURED?'var(--green)':'var(--red)'};margin-top:4px">${window.SUPABASE_CONFIGURED?'Conectado':'Desconectado'}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Tamanho dos Dados</div>
          <div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--text);margin-top:4px">${dataSizeKB} KB</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Afiliados</div>
          <div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--blue);margin-top:4px">${STATE.affiliates.length}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:16px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Lançamentos</div>
          <div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--pink);margin-top:4px">${STATE.reports.length}</div>
        </div>
      </div>

      <div class="sec-hdr"><div class="sec-lbl">Ações</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <i data-lucide="cloud" style="width:20px;height:20px;stroke:var(--green)"></i>
            <div><div style="font-size:13px;font-weight:700;color:var(--text)">Sincronizar Nuvem</div>
            <div style="font-size:10px;color:var(--text3)">Sincronizar dados com o Supabase</div></div>
          </div>
          <button class="btn btn-theme" onclick="forceSyncCloud()" style="width:100%"><i data-lucide="cloud"></i> Forçar Sync</button>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <i data-lucide="download" style="width:20px;height:20px;stroke:var(--blue)"></i>
            <div><div style="font-size:13px;font-weight:700;color:var(--text)">Exportar Backup</div>
            <div style="font-size:10px;color:var(--text3)">Baixar arquivo JSON com todos os dados</div></div>
          </div>
          <button class="btn btn-outline" onclick="exportBackup()" style="width:100%"><i data-lucide="download"></i> Exportar JSON</button>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:20px">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
            <i data-lucide="upload" style="width:20px;height:20px;stroke:var(--amber)"></i>
            <div><div style="font-size:13px;font-weight:700;color:var(--text)">Importar Backup</div>
            <div style="font-size:10px;color:var(--text3)">Restaurar dados de um arquivo JSON</div></div>
          </div>
          <button class="btn btn-outline" onclick="document.getElementById('import-backup-bk').click()" style="width:100%"><i data-lucide="upload"></i> Importar JSON</button>
          <input type="file" id="import-backup-bk" accept=".json" style="display:none" onchange="importBackup(event)">
        </div>
      </div>
      <!-- EMAILJS CONFIG -->
      <div class="sec-hdr" style="margin-top:28px"><div class="sec-lbl">Integração EmailJS</div></div>
      <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);margin-bottom:14px;font-size:11px;color:var(--text2);line-height:1.6">
        Configure suas credenciais do <strong style="color:var(--text)">EmailJS</strong> para enviar emails de fechamento para o financeiro.
        Crie uma conta em <strong>emailjs.com</strong>, configure um Service e um Template, e cole os IDs abaixo.
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-bottom:14px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Public Key</label>
          <input class="fi" id="ejs-pubkey" value="${STATE.emailjs?.publicKey||''}" placeholder="Seu Public Key" style="padding:8px;font-size:12px">
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Service ID</label>
          <input class="fi" id="ejs-service" value="${STATE.emailjs?.serviceId||''}" placeholder="service_xxxxxxx" style="padding:8px;font-size:12px">
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Template ID (Fechamento)</label>
          <input class="fi" id="ejs-template" value="${STATE.emailjs?.templateId||''}" placeholder="template_xxxxxxx" style="padding:8px;font-size:12px">
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Email do Financeiro</label>
          <input class="fi" id="ejs-finance-email" value="${STATE.emailjs?.financeEmail||''}" placeholder="financeiro@3c.gg" style="padding:8px;font-size:12px">
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-theme" onclick="saveEmailJSConfig()"><i data-lucide="save"></i> Salvar Configuração</button>
        <button class="btn btn-outline" onclick="testEmailJS()"><i data-lucide="send"></i> Enviar Email Teste</button>
      </div>
    </div></div>`;
  lucide.createIcons();
}

window.saveEmailJSConfig=()=>{
  if(!STATE.emailjs)STATE.emailjs={};
  STATE.emailjs.publicKey=document.getElementById('ejs-pubkey')?.value.trim()||'';
  STATE.emailjs.serviceId=document.getElementById('ejs-service')?.value.trim()||'';
  STATE.emailjs.templateId=document.getElementById('ejs-template')?.value.trim()||'';
  STATE.emailjs.financeEmail=document.getElementById('ejs-finance-email')?.value.trim()||'';
  logAction('EmailJS configurado','Credenciais atualizadas');
  saveToLocal();toast('Configuração EmailJS salva!');
};

window.testEmailJS=()=>{
  const cfg=STATE.emailjs;
  if(!cfg?.publicKey||!cfg?.serviceId||!cfg?.templateId||!cfg?.financeEmail)
    return toast('Preencha todas as credenciais primeiro','e');
  if(typeof emailjs==='undefined')return toast('SDK EmailJS não carregado','e');

  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId,cfg.templateId,{
    to_email:cfg.financeEmail,
    subject:'3COS — Teste de Integração',
    affiliate_name:'Teste',
    brand:'Teste',
    month_ref:'Teste',
    commission:'R$ 0,00',
    ftds:'0',qftds:'0',deposits:'R$ 0,00',
    message:'Este é um email de teste da integração EmailJS com o 3COS. Se você recebeu, a configuração está correta!'
  }).then(()=>toast('Email de teste enviado com sucesso!'),
    (err)=>toast('Erro ao enviar: '+err.text,'e'));
};

window.sendClosingEmail=(closing)=>{
  const cfg=STATE.emailjs;
  if(!cfg?.publicKey||!cfg?.serviceId||!cfg?.templateId||!cfg?.financeEmail)
    return toast('EmailJS não configurado. Vá em Backup & Nuvem para configurar.','w');
  if(typeof emailjs==='undefined')return toast('SDK EmailJS não carregado','e');

  const a=STATE.affiliates.find(x=>x.id===closing.affiliateId)||{};
  const ct=CONTRACT_TYPES[closing.contractType]||{label:''};

  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId,cfg.templateId,{
    to_email:cfg.financeEmail,
    subject:`3COS — Fechamento ${a.name||closing.affiliateName} · ${closing.brand} · ${closing.monthLabel}`,
    affiliate_name:a.name||closing.affiliateName,
    brand:closing.brand,
    month_ref:closing.monthLabel,
    contract_type:ct.label,
    commission:fc(closing.commission),
    ftds:String(closing.ftds),
    qftds:String(closing.qftds),
    deposits:fc(closing.deposits),
    net_rev:fc(closing.netRev||0),
    profit:fc(closing.profit||0),
    analyst:closing.createdBy||STATE.user?.name||'',
    date:closing.createdAt||new Date().toLocaleDateString('pt-BR'),
    message:`Fechamento executado por ${closing.createdBy||STATE.user?.name||'—'} em ${closing.createdAt}.\n\nAfiliado: ${a.name||closing.affiliateName}\nMarca: ${closing.brand}\nReferência: ${closing.monthLabel}\nComissão: ${fc(closing.commission)}\nFTDs: ${closing.ftds} | QFTDs: ${closing.qftds}\nDepósitos: ${fc(closing.deposits)}\nNet Revenue: ${fc(closing.netRev||0)}\n\nPor favor, verificar e processar o pagamento.`
  }).then(()=>{toast('Email de fechamento enviado ao financeiro!');logAction('Email fechamento enviado',`${closing.affiliateName} · ${closing.brand}`);},
    (err)=>toast('Erro ao enviar email: '+err.text,'e'));
};

window.exportBackup=()=>{
  const data=JSON.parse(JSON.stringify(STATE));
  delete data.user;
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`3cos_backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  URL.revokeObjectURL(url);logAction('Backup exportado','JSON');toast('Backup exportado!');
};

window.importBackup=(event)=>{
  const file=event.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const data=JSON.parse(e.target.result);
      if(!data.affiliates&&!data.brands)return toast('Arquivo inválido','e');
      if(!confirm('Isso irá substituir TODOS os dados atuais. Deseja continuar?'))return;
      const user=STATE.user;
      Object.assign(STATE,data);
      STATE.user=user;
      saveToLocal();
      logAction('Backup importado','JSON');
      toast('Backup importado! Recarregando...');
      setTimeout(()=>location.reload(),1000);
    }catch(err){toast('Erro ao ler arquivo','e');}
  };
  reader.readAsText(file);event.target.value='';
};

window.forceSyncCloud=async()=>{
  if(!fbAuth.currentUser)return toast('Não autenticado','e');
  try{await saveToCloud();toast('Sync completo!');
  }catch(e){toast('Erro no sync: '+e.message,'e');}
};

// ══════════════════════════════════════════════════════════
// MOBILE SIDEBAR LOGIC
// ══════════════════════════════════════════════════════════
let _currentMod = null;

window.openMobSidebar = (activeMod) => {
  _currentMod = activeMod || null;
  buildMobSidebar();
  document.getElementById('mob-sidebar').classList.add('open');
  document.getElementById('mob-sidebar-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  lucide.createIcons();
};

window.closeMobSidebar = () => {
  document.getElementById('mob-sidebar').classList.remove('open');
  document.getElementById('mob-sidebar-overlay').classList.remove('open');
  document.body.style.overflow = '';
};

function buildMobSidebar() {
  const user = STATE.user;
  if (!user) return;

  // User section
  document.getElementById('mob-sb-user').innerHTML = `
    <div class="mob-sb-user-av">${user.name[0]}</div>
    <div>
      <div class="mob-sb-user-name">${user.name}</div>
      <div class="mob-sb-user-role">${ROLES[user.role]?.label || user.role}</div>
    </div>`;

  // Navigation items
  const userMods = user.modules || [];
  const isAdmin = user.role === 'admin';
  const visible = MODS.filter(m => !m.adminOnly || isAdmin).filter(m => isAdmin || userMods.includes(m.id));

  let nav = '<div class="mob-sb-label">Navegação</div>';

  // Hub item
  const isHub = !_currentMod || _currentMod === 'hub';
  nav += `<div class="mob-sb-item ${isHub ? 'active' : ''}" onclick="closeMobSidebar(); goBack()">
    <div class="mob-sb-item-icon" style="--app-bg:rgba(236,72,153,0.1);--app-border:rgba(236,72,153,0.2)">
      <i data-lucide="grid" style="stroke:#ec4899"></i>
    </div>
    <div><div class="mob-sb-item-name">Hub</div><div class="mob-sb-item-sub">Tela inicial</div></div>
  </div>`;

  nav += '<div class="mob-sb-label" style="margin-top:8px">Módulos</div>';

  visible.forEach(m => {
    const isActive = _currentMod && m.label.toLowerCase().includes(_currentMod.toLowerCase().split(' ')[0]);
    nav += `<div class="mob-sb-item ${isActive ? 'active' : ''}" onclick="closeMobSidebar(); openMod('${m.id}')"
      style="--app-bg:${m.bg};--app-border:${m.color};--app-stroke:${m.stroke}">
      <div class="mob-sb-item-icon"><i data-lucide="${m.icon}"></i></div>
      <div><div class="mob-sb-item-name">${m.label}</div><div class="mob-sb-item-sub">${m.sub}</div></div>
    </div>`;
  });

  document.getElementById('mob-sb-nav').innerHTML = nav;

  // Update theme icon
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const mobIcon = document.getElementById('mob-theme-icon');
  if (mobIcon) mobIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun');
}

// ── SWIPE GESTURES ──
(function() {
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  const SWIPE_THRESHOLD = 60;
  const EDGE_ZONE = 30;

  document.addEventListener('touchstart', function(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }, { passive: true });

  document.addEventListener('touchend', function(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const dt = Date.now() - touchStartTime;

    if (dt > 500 || Math.abs(dy) > Math.abs(dx)) return;

    const sidebar = document.getElementById('mob-sidebar');
    const isOpen = sidebar.classList.contains('open');

    // Swipe right from left edge → open sidebar
    if (!isOpen && touchStartX < EDGE_ZONE && dx > SWIPE_THRESHOLD) {
      if (STATE.user) openMobSidebar();
    }
    // Swipe left → close sidebar
    if (isOpen && dx < -SWIPE_THRESHOLD) {
      closeMobSidebar();
    }
  }, { passive: true });
})();

// ── THEME COLOR META UPDATE ──
const origToggleTheme = window.toggleTheme;
const _wrapToggleTheme = () => {
  origToggleTheme();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#f8fafc' : '#030008');
  const mobIcon = document.getElementById('mob-theme-icon');
  if (mobIcon) { mobIcon.setAttribute('data-lucide', isLight ? 'moon' : 'sun'); lucide.createIcons(); }
};
window.toggleTheme = _wrapToggleTheme;

// ── INIT THEME COLOR ──
(function() {
  const t = localStorage.getItem('3cos_theme') || 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f8fafc' : '#030008');
})();

// ── AUTO SESSION RESTORE ──
// 1) Instantly restore from localStorage (no flash, no delay)
// PHASE 3 fix: always go to hub on boot, never restore the previously
// active module. The active-mod restore was causing a "dashboard flash"
// + silent failures in buildMod() that left the UI in a broken state.
sessionStorage.removeItem('3cos_activeMod');

(function(){
  const sess=localStorage.getItem('3cos_sess');
  if(sess){
    try{
      const d=JSON.parse(sess);
      if(d.user && d.exp > Date.now()){
        STATE.user=d.user;
        fixBrandLogos();
        // Show hub immediately
        document.getElementById('lock').style.display='none';
        const fn=STATE.user.name.split(' ')[0];
        document.getElementById('hub-uname').textContent=STATE.user.name;
        document.getElementById('hub-urole').textContent=ROLES[STATE.user.role]?.label||STATE.user.role;
        document.getElementById('hub-greeting').innerHTML=`Bem-vindo(a), <strong>${fn}</strong> — selecione o módulo de trabalho`;
        // Always show hub on boot (no active-mod restore)
        const hub=document.getElementById('hub');hub.style.display='flex';hub.style.opacity='1';
        try { buildHubCards(); buildMobileHome(); } catch(e){ console.error('[boot] buildHub failed:', e); }
        updateNotifBadge();initMosaics();lucide.createIcons();
        // Apply beta edition skin only after authentication
        if (typeof applyBetaEdition === 'function') applyBetaEdition();
        return;
      }
    }catch(e){ console.error('[boot] session restore failed:', e); }
  }
  // No valid session — show login. Force-clear beta edition on lock screen.
  document.documentElement.removeAttribute('data-edition');
  document.getElementById('lock').style.display='flex';
  document.getElementById('lock').style.opacity='1';
})();

// 2) Validate session against Supabase OR Firebase (whichever is the source)
// CRITICAL: with Phase 3, login can come from Supabase Auth. The user may
// have NO Firebase session at all. So we cannot force-logout when Firebase
// says null — we must check Supabase first.
async function _validateSession() {
  // Supabase first (Phase 3+ primary)
  if (window.SUPABASE_CONFIGURED && window.sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        // Supabase session valid — fetch profile and refresh
        const { data: profile } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
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
          localStorage.setItem('3cos_sess', JSON.stringify({ user: STATE.user, exp: Date.now() + 7*86400000 }));
        }
        await loadFromCloud();
        fixBrandLogos();
        const hub = document.getElementById('hub');
        if (hub && hub.style.display === 'flex') {
          buildHubCards(); buildMobileHome(); updateNotifBadge(); lucide.createIcons();
        }
        setTimeout(() => { if (typeof runPaymentWatchdog === 'function') runPaymentWatchdog(); }, 2000);
        return true; // Session is valid, do not fall through to Firebase
      }
    } catch (e) {
      console.warn('[validateSession] Supabase check failed:', e);
      // Fall through to Firebase
    }
  }
  return false;
}

// Run Supabase validation immediately on boot (in parallel with Firebase listener)
_validateSession();

fbAuth.onAuthStateChanged(async (firebaseUser) => {
  // PHASE 3: if Supabase has a valid session, ignore Firebase entirely
  if (window.SUPABASE_CONFIGURED && window.sb) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      if (session?.user) {
        // Supabase is authoritative — Firebase signal is irrelevant
        return;
      }
    } catch (e) { /* fall through */ }
  }

  if (firebaseUser && STATE.user) {
    // Session valid — sync cloud data silently and refresh UI
    await loadFromCloud();
    fixBrandLogos();
    const hub=document.getElementById('hub');
    if(hub && hub.style.display==='flex'){buildHubCards();buildMobileHome();updateNotifBadge();lucide.createIcons();}
    setTimeout(()=>{if(typeof runPaymentWatchdog==='function')runPaymentWatchdog();},2000);
  } else if (!firebaseUser && STATE.user) {
    // Firebase says not authenticated AND we have no Supabase session — force logout
    STATE.user=null;localStorage.removeItem('3cos_sess');
    document.getElementById('hub').style.display='none';
    document.getElementById('hub').style.opacity='0';
    document.getElementById('lock').style.display='flex';
    document.getElementById('lock').style.opacity='1';
  } else if (firebaseUser && !STATE.user) {
    // Firebase authenticated but no local session — restore
    const found=STATE.users.find(u=>u.email===firebaseUser.email&&u.status==='ativo');
    if(found){
      STATE.user=found;await loadFromCloud();fixBrandLogos();
      localStorage.setItem('3cos_sess',JSON.stringify({user:STATE.user,exp:Date.now()+7*86400000}));
      showHub();
    }
  }
});
