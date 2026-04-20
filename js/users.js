// ══════════════════════════════════════════════════════════
// 7. USUÁRIOS
// ══════════════════════════════════════════════════════════
function _renderUserGrid(filter){
  const q=(filter||'').toLowerCase();
  return STATE.users.filter(u=>!q||(u.name||'').toLowerCase().includes(q)||(u.email||'').toLowerCase().includes(q)).map(u=>`<div class="user-card" style="border:1px solid var(--gb)">
    ${userAvatar(u,44)}
    <div class="user-info">
      <div class="user-name">${u.name} <span class="role-badge role-${u.role}" style="margin-left:8px">${ROLES[u.role]?.label}</span></div>
      <div class="user-email">${u.title?u.title+' · ':''}${u.email} · Criado em ${new Date(u.createdAt).toLocaleDateString('pt-BR')}</div>
      <div class="user-mods">${u.modules.map(m=>`<span class="mod-chip">${MODS.find(x=>x.id===m)?.label||m}</span>`).join('')}</div>
    </div>
    <div style="display:flex;gap:4px">
      <button class="ibt" onclick="openEditUser('${u.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
      <button class="ibt ${u.status==='ativo'?'danger':'green'}" onclick="toggleUserStatus('${u.id}')" title="${u.status==='ativo'?'Bloquear':'Desbloquear'}">
        <i data-lucide="${u.status==='ativo'?'lock':'unlock'}"></i>
      </button>
      ${u.id!==STATE.user?.id?`<button class="ibt danger" onclick="confirmDeleteUser('${u.id}')" title="Remover"><i data-lucide="trash-2"></i></button>`:''}
    </div>
  </div>`).join('')||'<div class="empty" style="padding:20px;text-align:center;color:var(--text3);font-size:12px">Nenhum usuário encontrado.</div>';
}
function bUsers(el){
  el.innerHTML=modHdr('Usuários — Controle de Acesso')+`<div class="mod-body">
    ${heroHTML('users','Admin','Usuários','Permissões e acessos')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Usuários ativos</div>
        <div class="sec-actions">
          <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar usuário..." oninput="filterUsers(this.value)"></div>
          <button class="btn btn-theme" onclick="openNewUser()"><i data-lucide="user-plus"></i>Novo Usuário</button>
        </div>
      </div>
      <div class="user-grid" id="user-grid">${_renderUserGrid()}</div>
    </div></div>`;
  lucide.createIcons();
}
let _userSearchTimer=null;
window.filterUsers=q=>{clearTimeout(_userSearchTimer);_userSearchTimer=setTimeout(()=>{const g=document.getElementById('user-grid');if(g){g.innerHTML=_renderUserGrid(q);lucide.createIcons();}},150);};
window.confirmDeleteUser=(id)=>{
  const u=STATE.users.find(x=>x.id===id);if(!u)return;
  if(u.id===STATE.user?.id)return toast('Não é possível excluir o próprio usuário','e');
  openModal('Excluir usuário',`<p style="color:var(--text2);font-size:13px">Remover <strong>${u.name}</strong> (${u.email})? O acesso será revogado.</p>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-danger" onclick="deleteUser('${id}')">Excluir</button>`);
};
window.deleteUser=(id)=>{
  const idx=STATE.users.findIndex(x=>x.id===id);
  if(idx<0)return;
  const name=STATE.users[idx].name;
  STATE.users.splice(idx,1);
  logAction('Usuário excluído',name);
  saveToLocal();closeModal();
  const el=document.getElementById('mod-users');if(el)bUsers(el);
  toast('Usuário removido');
};

// ══════════════════════════════════════════════════════════
// BACKUP & NUVEM (módulo separado)
// ══════════════════════════════════════════════════════════
function bBackup(el){
  const lastSync = STATE.lastSync ? new Date(STATE.lastSync).toLocaleString('pt-BR') : 'Nunca sincronizado';
  const lastExport = STATE.lastExport ? new Date(STATE.lastExport).toLocaleString('pt-BR') : '—';
  const dataSize = JSON.stringify(STATE).length;
  const dataSizeKB = Math.round(dataSize / 1024);
  const supaOK = !!window.SUPABASE_CONFIGURED;

  el.innerHTML=modHdr('Backup & Nuvem')+`<div class="mod-body">
    ${heroHTML('backup','','Backup & nuvem','Exportar, importar e sincronizar')}
    <div class="mod-main">

      <div class="sec-hdr"><div class="sec-lbl">Status</div></div>
      <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:22px">
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="${supaOK?'cloud':'cloud-off'}" style="stroke:${supaOK?'var(--green)':'var(--red)'}"></i><span class="kpi-lbl">Supabase</span></div>
          <div class="kpi-val sm" style="color:${supaOK?'var(--green)':'var(--red)'}">${supaOK?'Conectado':'Desconectado'}</div>
          <div class="kpi-sub">${supaOK?'Dados em nuvem':'Config. ausente'}</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="refresh-cw"></i><span class="kpi-lbl">Último sync</span></div>
          <div class="kpi-val sm" style="font-size:13px">${lastSync}</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="database"></i><span class="kpi-lbl">Volume</span></div>
          <div class="kpi-val sm">${dataSizeKB} KB</div>
          <div class="kpi-sub">${STATE.affiliates.length} afs · ${STATE.reports.length} reports</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="download"></i><span class="kpi-lbl">Último export</span></div>
          <div class="kpi-val sm" style="font-size:13px">${lastExport}</div></div>
      </div>

      <div class="sec-hdr"><div class="sec-lbl">Sincronização</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:22px">
        <div class="bk-card">
          <div class="bk-card-hdr"><i data-lucide="cloud-upload" style="stroke:var(--green)"></i>
            <div><div class="bk-card-t">Forçar sincronização</div>
            <div class="bk-card-s">Envia o estado local atual para o Supabase</div></div>
          </div>
          <button class="btn btn-theme" onclick="forceSyncCloud()" style="width:100%" ${supaOK?'':'disabled'}><i data-lucide="refresh-cw"></i> Sincronizar agora</button>
        </div>
        <div class="bk-card">
          <div class="bk-card-hdr"><i data-lucide="cloud-download" style="stroke:var(--blue)"></i>
            <div><div class="bk-card-t">Recarregar da nuvem</div>
            <div class="bk-card-s">Substitui os dados locais pelos do Supabase</div></div>
          </div>
          <button class="btn btn-outline" onclick="reloadFromCloud()" style="width:100%" ${supaOK?'':'disabled'}><i data-lucide="download-cloud"></i> Recarregar</button>
        </div>
      </div>

      <div class="sec-hdr"><div class="sec-lbl">Backup manual</div></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:22px">
        <div class="bk-card">
          <div class="bk-card-hdr"><i data-lucide="download" style="stroke:var(--blue)"></i>
            <div><div class="bk-card-t">Exportar backup</div>
            <div class="bk-card-s">Baixa um JSON com todo o estado</div></div>
          </div>
          <button class="btn btn-outline" onclick="exportBackup()" style="width:100%"><i data-lucide="download"></i> Exportar JSON</button>
        </div>
        <div class="bk-card">
          <div class="bk-card-hdr"><i data-lucide="upload" style="stroke:var(--amber)"></i>
            <div><div class="bk-card-t">Importar backup</div>
            <div class="bk-card-s">Restaura dados de um JSON exportado</div></div>
          </div>
          <button class="btn btn-outline" onclick="document.getElementById('import-backup-bk').click()" style="width:100%"><i data-lucide="upload"></i> Escolher arquivo</button>
          <input type="file" id="import-backup-bk" accept=".json" style="display:none" onchange="importBackup(event)">
        </div>
      </div>

      <!-- EMAILJS CONFIG -->
      <div class="sec-hdr" style="margin-top:10px"><div class="sec-lbl">Integração EmailJS</div></div>
      <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);margin-bottom:14px;font-size:11px;color:var(--text2);line-height:1.6">
        Configure suas credenciais do <strong style="color:var(--text)">EmailJS</strong> para enviar emails de fechamento para o financeiro.
        Crie uma conta em <strong>emailjs.com</strong>, configure um Service e um Template, e cole os IDs abaixo.
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;margin-bottom:14px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Public Key</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="fi" type="password" id="ejs-pubkey" value="${STATE.emailjs?.publicKey||''}" placeholder="Seu Public Key" style="padding:8px;font-size:12px;flex:1" autocomplete="off">
            <button type="button" class="ibt" onclick="toggleSecretField('ejs-pubkey',this)" title="Mostrar/ocultar" style="flex-shrink:0"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Service ID</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="fi" type="password" id="ejs-service" value="${STATE.emailjs?.serviceId||''}" placeholder="service_xxxxxxx" style="padding:8px;font-size:12px;flex:1" autocomplete="off">
            <button type="button" class="ibt" onclick="toggleSecretField('ejs-service',this)" title="Mostrar/ocultar" style="flex-shrink:0"><i data-lucide="eye"></i></button>
          </div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);padding:14px">
          <label style="font-size:9px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;display:block;margin-bottom:4px">Template ID (Fechamento)</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="fi" type="password" id="ejs-template" value="${STATE.emailjs?.templateId||''}" placeholder="template_xxxxxxx" style="padding:8px;font-size:12px;flex:1" autocomplete="off">
            <button type="button" class="ibt" onclick="toggleSecretField('ejs-template',this)" title="Mostrar/ocultar" style="flex-shrink:0"><i data-lucide="eye"></i></button>
          </div>
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
  STATE.lastExport = new Date().toISOString();
  saveToLocal();
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

// Force push the local STATE to Supabase. Confirms before overwriting cloud.
// Marks STATE.lastSync on success so the Backup UI shows when it last ran.
window.forceSyncCloud = async () => {
  if (!window.SUPABASE_CONFIGURED || !window.sb) return toast('Supabase não configurado', 'e');
  if (!STATE.user) return toast('Não autenticado', 'e');
  if (!window.Data?.syncAll) return toast('Módulo Data indisponível', 'e');
  if (!confirm('Enviar o estado local atual para o Supabase?\n\nIsso sobrescreve os dados na nuvem com o que está no seu navegador agora.')) return;
  toast('Sincronizando...', 'i');
  try {
    await Data.syncAll();
    STATE.lastSync = new Date().toISOString();
    saveToLocal();
    logAction('Sync manual', 'Dados locais enviados ao Supabase');
    toast('Sincronização concluída', 's');
    // Re-render the backup module to refresh timestamps
    const el = document.getElementById('mod-backup');
    if (el && typeof bBackup === 'function') bBackup(el);
  } catch (e) {
    console.error('[forceSyncCloud] failed:', e);
    toast('Erro no sync: ' + (e?.message || 'desconhecido'), 'e');
  }
};

// Pull from Supabase, replacing local STATE. Confirms first since it's
// destructive (any unsynced local change is lost).
window.reloadFromCloud = async () => {
  if (!window.SUPABASE_CONFIGURED || !window.sb) return toast('Supabase não configurado', 'e');
  if (!window.Data?.loadAll) return toast('Módulo Data indisponível', 'e');
  if (!confirm('Substituir dados locais pelos do Supabase?\n\nQualquer alteração local que ainda não foi sincronizada será perdida.')) return;
  toast('Recarregando da nuvem...', 'i');
  try {
    await Data.loadAll();
    STATE.lastSync = new Date().toISOString();
    saveToLocal();
    logAction('Recarregado da nuvem', 'Estado local substituído');
    toast('Dados atualizados', 's');
    const el = document.getElementById('mod-backup');
    if (el && typeof bBackup === 'function') bBackup(el);
  } catch (e) {
    console.error('[reloadFromCloud] failed:', e);
    toast('Erro: ' + (e?.message || 'desconhecido'), 'e');
  }
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
// Restore session from localStorage + return to the active module

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
        // Populate the hub avatar on session restore (showHub is not called here)
        const _avEl=document.getElementById('hub-user-avatar');
        if(_avEl && typeof window.userAvatar === 'function'){
          _avEl.innerHTML = window.userAvatar(STATE.user, 32);
        }
        // Show hub first (always stable)
        const hub=document.getElementById('hub');hub.style.display='flex';hub.style.opacity='1';
        try { buildHubCards(); buildMobileHome(); if(window.buildHubWidgets)buildHubWidgets(); } catch(e){ console.error('[boot] buildHub failed:', e); }
        updateNotifBadge();initMosaics();lucide.createIcons();
        if (typeof applyAppTheme === 'function') applyAppTheme();
        else if (typeof applyBetaEdition === 'function') applyBetaEdition();
        if (typeof updateCopilotVisibility === 'function') updateCopilotVisibility();
        // Restore active module (openMod has try/catch safety net)
        const savedMod=sessionStorage.getItem('3cos_activeMod');
        if(savedMod && typeof openMod === 'function'){
          setTimeout(()=>{ try{openMod(savedMod);}catch(e){console.error('[boot] module restore failed:',e);} },200);
        }
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
          // Preserve any fields that aren't stored in the profiles table yet
          // (avatar lives in localStorage until the schema has an avatar column).
          const preservedAvatar = STATE.user?.avatar || profile.avatar || '';
          STATE.user = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            role: profile.role,
            status: profile.status,
            modules: profile.modules || [],
            avatar: preservedAvatar,
            createdAt: profile.created_at?.split('T')[0] || '',
          };
          localStorage.setItem('3cos_sess', JSON.stringify({ user: STATE.user, exp: Date.now() + 7*86400000 }));
        }
        await loadFromCloud();
        fixBrandLogos();
        // DON'T rebuild UI here — the initial session restore already
        // rendered from cache. Fresh data will show on next navigation.
        // Rebuilding here causes flickering (double render).
        updateNotifBadge();
        if (typeof updateLabButton === 'function') updateLabButton();
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
    if(hub && hub.style.display==='flex'){buildHubCards();buildMobileHome();if(window.buildHubWidgets)buildHubWidgets();updateNotifBadge();lucide.createIcons();}
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
