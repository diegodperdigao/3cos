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
            <button class="ibt" onclick="openEditUser('${u.id}')" title="Editar"><i data-lucide="edit-3"></i></button>
            <button class="ibt ${u.status==='ativo'?'danger':'green'}" onclick="toggleUserStatus('${u.id}')" title="${u.status==='ativo'?'Bloquear':'Desbloquear'}">
              <i data-lucide="${u.status==='ativo'?'lock':'unlock'}"></i>
            </button>
          </div>
        </div>`).join('')}
      </div>
      <div style="margin-top:28px">
        <div class="sec-hdr"><div class="sec-lbl">Backup & Restauração</div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="exportBackup()"><i data-lucide="download"></i> Exportar Backup JSON</button>
          <button class="btn btn-outline" onclick="document.getElementById('import-backup').click()"><i data-lucide="upload"></i> Importar Backup</button>
          <input type="file" id="import-backup" accept=".json" style="display:none" onchange="importBackup(event)">
          <button class="btn btn-outline" onclick="forceSyncCloud()"><i data-lucide="cloud"></i> Forçar Sync Nuvem</button>
        </div>
      </div>
    </div></div>`;
  lucide.createIcons();
}

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
        // Restaurar módulo ativo ou mostrar hub
        const savedMod=sessionStorage.getItem('3cos_activeMod');
        if(savedMod){
          const modEl=document.getElementById('mod-'+savedMod);
          if(modEl){buildMod(savedMod,modEl);modEl.style.display='flex';modEl.classList.add('active');modEl.style.opacity='1';initMosaics();lucide.createIcons();}
          else{const hub=document.getElementById('hub');hub.style.display='flex';hub.style.opacity='1';buildHubCards();buildMobileHome();}
        }else{
          const hub=document.getElementById('hub');hub.style.display='flex';hub.style.opacity='1';
          buildHubCards();buildMobileHome();
        }
        updateNotifBadge();initMosaics();lucide.createIcons();
        return;
      }
    }catch(e){}
  }
  // No valid session — show login
  document.getElementById('lock').style.display='flex';
  document.getElementById('lock').style.opacity='1';
})();

// 2) Firebase validates in background and syncs cloud data
fbAuth.onAuthStateChanged(async (firebaseUser) => {
  if (firebaseUser && STATE.user) {
    // Session valid — sync cloud data silently and refresh UI
    await loadFromCloud();
    fixBrandLogos();
    const hub=document.getElementById('hub');
    if(hub && hub.style.display==='flex'){buildHubCards();buildMobileHome();updateNotifBadge();lucide.createIcons();}
  } else if (!firebaseUser && STATE.user) {
    // Firebase says not authenticated but we have local session — force logout
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
