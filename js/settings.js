// ══════════════════════════════════════════════════════════
// SETTINGS — User Preferences & Account
// ══════════════════════════════════════════════════════════
// Sections: Appearance · Experience · Account · Notifications ·
// Data & Privacy · Shortcuts · Labs (beta opt-in)
// ══════════════════════════════════════════════════════════

function bSettings(el){
  const s = STATE.settings || {};
  const notif = s.notifications || {};
  const user = STATE.user || {};
  const themeName = s.theme || 'default';
  const dark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';

  el.innerHTML = modHdr('Configurações')+`<div class="mod-body">
    ${heroHTML('settings','','Configurações','Preferências e personalização')}
    <div class="mod-main">

      <!-- APARÊNCIA -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="palette"></i></div>
          <div>
            <div class="st-section-title">Aparência</div>
            <div class="st-section-sub">Tema visual e modo de contraste</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row st-row-col">
            <div class="st-label">Tema</div>
            <div class="st-theme-grid st-theme-grid-3">
              <div class="st-theme-card ${themeName==='default-dark'?'on':''}" onclick="setAppTheme('default-dark')">
                <div class="st-theme-preview st-theme-default-dark"></div>
                <div class="st-theme-name">Default Dark</div>
                <div class="st-theme-desc">Cores vibrantes da 3C sobre preto</div>
              </div>
              <div class="st-theme-card ${themeName==='default-light'?'on':''}" onclick="setAppTheme('default-light')">
                <div class="st-theme-preview st-theme-default-light"></div>
                <div class="st-theme-name">Default Light</div>
                <div class="st-theme-desc">Versão clara do tema padrão</div>
              </div>
              <div class="st-theme-card ${themeName==='mono-dark'?'on':''}" onclick="setAppTheme('mono-dark')">
                <div class="st-theme-preview st-theme-mono-dark"></div>
                <div class="st-theme-name">Mono Dark</div>
                <div class="st-theme-desc">Monocromático — foco máximo</div>
              </div>
              <div class="st-theme-card ${themeName==='mono-light'?'on':''}" onclick="setAppTheme('mono-light')">
                <div class="st-theme-preview st-theme-mono-light"></div>
                <div class="st-theme-name">Mono Light</div>
                <div class="st-theme-desc">Monocromático em base clara</div>
              </div>
              <div class="st-theme-card ${themeName==='bento-light'?'on':''}" onclick="setAppTheme('bento-light')">
                <div class="st-theme-preview st-theme-bento-light"></div>
                <div class="st-theme-name">Bento Light</div>
                <div class="st-theme-desc">Neo-brutalismo suave, pastéis vívidos</div>
              </div>
              <div class="st-theme-card ${themeName==='bento-dark'?'on':''}" onclick="setAppTheme('bento-dark')">
                <div class="st-theme-preview st-theme-bento-dark"></div>
                <div class="st-theme-name">Bento Dark</div>
                <div class="st-theme-desc">Bento em charcoal profundo</div>
              </div>
              <div class="st-theme-card ${themeName==='meridian-light'?'on':''}" onclick="setAppTheme('meridian-light')">
                <div class="st-theme-preview st-theme-meridian-light"></div>
                <div class="st-theme-name">Meridian Light</div>
                <div class="st-theme-desc">Editorial, serifa, vermelho de revista</div>
              </div>
              <div class="st-theme-card ${themeName==='meridian-dark'?'on':''}" onclick="setAppTheme('meridian-dark')">
                <div class="st-theme-preview st-theme-meridian-dark"></div>
                <div class="st-theme-name">Meridian Dark</div>
                <div class="st-theme-desc">Meridian em tinta escura</div>
              </div>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Densidade</div>
              <div class="st-hint">Compacto reduz espaçamento para mais dados na tela</div>
            </div>
            <div class="st-segmented">
              <button class="st-seg ${s.density==='comfortable'?'on':''}" onclick="setDensity('comfortable')">Confortável</button>
              <button class="st-seg ${s.density==='compact'?'on':''}" onclick="setDensity('compact')">Compacto</button>
            </div>
          </div>
        </div>
      </div>

      <!-- EXPERIÊNCIA -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="sparkles"></i></div>
          <div>
            <div class="st-section-title">Experiência</div>
            <div class="st-section-sub">Comportamento da interface</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row">
            <div>
              <div class="st-label">Vídeo de introdução</div>
              <div class="st-hint">Exibir a animação de boas-vindas ao fazer login</div>
            </div>
            ${switchHTML('setting-intro', s.showIntroVideo, "toggleSetting('showIntroVideo')")}
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Reduzir animações</div>
              <div class="st-hint">Remove transições para um sistema mais direto</div>
            </div>
            ${switchHTML('setting-motion', s.reducedMotion, "toggleSetting('reducedMotion')")}
          </div>
        </div>
      </div>

      <!-- CONTA -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="user"></i></div>
          <div>
            <div class="st-section-title">Conta</div>
            <div class="st-section-sub">Perfil e autenticação</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row" style="gap:16px;align-items:center">
            <div class="st-avatar-wrap" onclick="document.getElementById('st-avatar-input').click()" title="Clique para alterar foto">
              ${window.userAvatar?userAvatar(user,52):`<div style="width:52px;height:52px;border-radius:50%;background:var(--theme);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:20px">${(user.name||'?')[0]}</div>`}
              <div class="st-avatar-overlay"><i data-lucide="camera"></i></div>
              <input type="file" id="st-avatar-input" accept="image/*" style="display:none" onchange="uploadAvatar(event)">
            </div>
            <div style="flex:1">
              <div class="st-label">Nome de exibição</div>
              <div style="display:flex;gap:8px;width:100%;margin-top:4px">
                <input type="text" class="fi" id="st-name" value="${escapeHTML(user.name||'')}" style="flex:1">
                <button class="btn btn-theme" onclick="saveDisplayName()"><i data-lucide="check"></i> Salvar</button>
              </div>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Email</div>
              <div class="st-hint">${escapeHTML(user.email||'—')}</div>
            </div>
            <span class="st-badge-mute">Identidade Supabase</span>
          </div>
          <div class="st-divider"></div>
          <div class="st-row st-row-col">
            <div class="st-label">Alterar senha</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%">
              <input type="password" class="fi" id="st-pw-new" placeholder="Nova senha (min. 8 caracteres)">
              <input type="password" class="fi" id="st-pw-confirm" placeholder="Confirmar nova senha">
            </div>
            <div style="display:flex;justify-content:flex-end;width:100%;margin-top:8px">
              <button class="btn btn-theme" onclick="changePassword()"><i data-lucide="key"></i> Atualizar senha</button>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Encerrar outras sessões</div>
              <div class="st-hint">Sair de todos os dispositivos exceto este</div>
            </div>
            <button class="btn btn-outline" onclick="logoutOtherSessions()"><i data-lucide="log-out"></i> Sair de tudo</button>
          </div>
        </div>
      </div>

      <!-- NOTIFICAÇÕES -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="bell"></i></div>
          <div>
            <div class="st-section-title">Notificações</div>
            <div class="st-section-sub">O que você quer ser avisado</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row">
            <div>
              <div class="st-label">Pagamentos vencidos e atrasados</div>
              <div class="st-hint">Alertas do watchdog financeiro</div>
            </div>
            ${switchHTML('notif-pay', notif.paymentAlerts, "toggleNotif('paymentAlerts')")}
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Lembretes de tarefas</div>
              <div class="st-hint">Tarefas próximas do prazo</div>
            </div>
            ${switchHTML('notif-task', notif.taskReminders, "toggleNotif('taskReminders')")}
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Avisos de sincronização</div>
              <div class="st-hint">Quando outro usuário altera algum dado</div>
            </div>
            ${switchHTML('notif-rt', notif.realtimeUpdates, "toggleNotif('realtimeUpdates')")}
          </div>
        </div>
      </div>

      <!-- DADOS & PRIVACIDADE -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="database"></i></div>
          <div>
            <div class="st-section-title">Dados & Privacidade</div>
            <div class="st-section-sub">Sincronização, exportação e cache</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row">
            <div>
              <div class="st-label">Status da sincronização</div>
              <div class="st-hint">Supabase ${window.SUPABASE_CONFIGURED?'conectado — realtime ativo':'desconectado'}</div>
            </div>
            <span class="st-badge-${window.SUPABASE_CONFIGURED?'ok':'err'}">${window.SUPABASE_CONFIGURED?'Conectado':'Off-line'}</span>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Importar do 3C Dash</div>
              <div class="st-hint">Carrega um JSON do dashboard antigo (substitui os dados atuais)</div>
            </div>
            <button class="btn btn-outline" onclick="openImport3CDash()"><i data-lucide="file-up"></i> Importar JSON</button>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Exportar meus dados</div>
              <div class="st-hint">Download de todo o estado local em JSON</div>
            </div>
            <button class="btn btn-outline" onclick="exportMyData()"><i data-lucide="download"></i> Exportar</button>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Limpar cache local</div>
              <div class="st-hint">Remove o snapshot offline; nova sincronização será feita ao recarregar</div>
            </div>
            <button class="btn btn-outline" onclick="clearLocalCache()"><i data-lucide="trash-2"></i> Limpar</button>
          </div>
        </div>
      </div>

      <!-- LABS -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="flask-conical"></i></div>
          <div>
            <div class="st-section-title">Labs</div>
            <div class="st-section-sub">Recursos experimentais em desenvolvimento</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row">
            <div>
              <div class="st-label">Modo Beta</div>
              <div class="st-hint">Ativa funcionalidades em teste antes do lançamento oficial</div>
            </div>
            ${switchHTML('setting-beta', STATE.betaMode, "toggleBetaMode()")}
          </div>
          <div class="st-divider"></div>
          <div class="st-lab-roadmap">
            <div class="st-lab-roadmap-title">Recursos em teste (Beta)</div>
            <div class="st-lab-item"><i data-lucide="brain-circuit"></i><div><strong>3C Copilot <span class="st-badge-live">Ativo</span></strong><span>Chat com IA Claude conectado aos dados da sua operação. Botão flutuante aparece no canto inferior direito quando Beta está ativo.</span></div></div>
            <div class="st-lab-item"><i data-lucide="workflow"></i><div><strong>Pipeline Automations <span class="st-badge-soon">Em breve</span></strong><span>Regras automáticas entre estágios do kanban</span></div></div>
            <div class="st-lab-item"><i data-lucide="line-chart"></i><div><strong>Forecast de comissão <span class="st-badge-soon">Em breve</span></strong><span>Projeção financeira com base histórica</span></div></div>
            <div class="st-lab-item"><i data-lucide="alert-triangle"></i><div><strong>Detecção de anomalias <span class="st-badge-soon">Em breve</span></strong><span>Alertas automáticos em padrões suspeitos de QFTD</span></div></div>
          </div>
        </div>
      </div>

      <!-- ATALHOS -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="command"></i></div>
          <div>
            <div class="st-section-title">Atalhos do teclado</div>
            <div class="st-section-sub">Navegação rápida pelo sistema</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-kbd-grid">
            <div class="st-kbd-row"><span class="st-kbd-lbl">Busca global</span><kbd>Ctrl</kbd><kbd>K</kbd></div>
            <div class="st-kbd-row"><span class="st-kbd-lbl">Fechar modal</span><kbd>Esc</kbd></div>
            <div class="st-kbd-row"><span class="st-kbd-lbl">Confirmar formulário</span><kbd>Enter</kbd></div>
            <div class="st-kbd-row"><span class="st-kbd-lbl">Voltar ao Hub</span><kbd>Esc</kbd><span style="font-size:9px;color:var(--text3)">(no módulo)</span></div>
          </div>
        </div>
      </div>

    </div></div>`;
  lucide.createIcons();
}

// Helper: switch HTML
function switchHTML(id, checked, onchange){
  return `<label class="st-switch"><input type="checkbox" id="${id}" ${checked?'checked':''} onchange="${onchange}"><span class="st-switch-track"><span class="st-switch-thumb"></span></span></label>`;
}

function escapeHTML(s){
  return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ══════════════════════════════════════════════════════════
// ACTIONS
// ══════════════════════════════════════════════════════════

function rerenderSettings(){
  const el = document.getElementById('mod-settings');
  if (!el || !el.classList.contains('active')) return;
  const scrollEl = el.querySelector('.mod-body') || el;
  const top = scrollEl.scrollTop;
  bSettings(el);
  const newScrollEl = el.querySelector('.mod-body') || el;
  newScrollEl.scrollTop = top;
  initMosaics();
}

window.setAppTheme = (name) => {
  const prev = STATE.settings.theme;
  STATE.settings.theme = name;
  applyAppTheme();
  saveToLocal();
  const labels={'default-dark':'Default Dark','default-light':'Default Light','mono-dark':'Mono Dark','mono-light':'Mono Light','bento-dark':'Bento Dark','bento-light':'Bento Light','meridian-light':'Meridian Light','meridian-dark':'Meridian Dark'};
  if (prev !== name) logAction('Tema alterado', `${labels[prev]||prev} → ${labels[name]||name}`);
  toast(`Tema ${labels[name]||name} aplicado`, 's');
  // Re-render settings to update selection UI
  rerenderSettings();
};

// Theme name encodes edition + mode, e.g. "bento-dark", "mono-light".
// Decodes into data-edition + data-theme pair.
window.THEME_MAP = {
  'default-dark':   { edition: '',         theme: 'dark'  },
  'default-light':  { edition: '',         theme: 'light' },
  'mono-dark':      { edition: 'mono',     theme: 'dark'  },
  'mono-light':     { edition: 'mono',     theme: 'light' },
  'bento-light':    { edition: 'bento',    theme: 'light' },
  'bento-dark':     { edition: 'bento',    theme: 'dark'  },
  'meridian-light': { edition: 'meridian', theme: 'light' },
  'meridian-dark':  { edition: 'meridian', theme: 'dark'  },
  // Legacy keys (migrated on first load)
  'default':        { edition: '',         theme: 'dark'  },
  'mono':           { edition: 'mono',     theme: 'dark'  },
  'glass':          { edition: '',         theme: 'dark'  },
  'neonflow':       { edition: '',         theme: 'dark'  },
  'bento':          { edition: 'bento',    theme: 'light' },
};

window.applyAppTheme = () => {
  const root = document.documentElement;
  const themeKey = STATE.settings?.theme || 'default-dark';
  const pair = THEME_MAP[themeKey] || THEME_MAP['default-dark'];

  // Set data-theme (dark/light)
  root.setAttribute('data-theme', pair.theme);

  // Set data-edition (only when user is logged in — lock screen stays default)
  if (pair.edition && STATE.user) root.setAttribute('data-edition', pair.edition);
  else root.removeAttribute('data-edition');

  // Reduced motion
  if (STATE.settings?.reducedMotion) root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');

  // Density
  root.setAttribute('data-density', STATE.settings?.density || 'comfortable');
};

// Legacy alias so old callers (users.js) still work
window.applyBetaEdition = window.applyAppTheme;

window.setColorMode = (mode) => {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('3cos_theme', mode);
  // Update theme icon in header
  const icons = document.querySelectorAll('#theme-icon, #mob-theme-icon');
  icons.forEach(i => i.setAttribute('data-lucide', mode === 'dark' ? 'sun' : 'moon'));
  lucide.createIcons();
  // Re-render settings
  rerenderSettings();
};

window.setDensity = (d) => {
  STATE.settings.density = d;
  applyAppTheme();
  saveToLocal();
  flashSettingsSaved();
  rerenderSettings();
};

window.toggleSetting = (key) => {
  STATE.settings[key] = !STATE.settings[key];
  applyAppTheme();
  saveToLocal();
  if (key === 'showIntroVideo') {
    localStorage.setItem('3cos_show_intro', STATE.settings[key] ? '1' : '0');
  }
  flashSettingsSaved();
};

window.toggleNotif = (key) => {
  if (!STATE.settings.notifications) STATE.settings.notifications = {};
  STATE.settings.notifications[key] = !STATE.settings.notifications[key];
  saveToLocal();
  flashSettingsSaved();
};

// Briefly flash a "✓ Salvo automaticamente" badge at the top of the settings
// module so the user has visible confirmation that their change was persisted.
// Called by every toggle/setter in the settings module.
function flashSettingsSaved() {
  const mod = document.getElementById('mod-settings');
  if (!mod || !mod.classList.contains('active')) return;
  let badge = mod.querySelector('.st-saved-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'st-saved-badge';
    badge.innerHTML = '<i data-lucide="check-circle"></i> Salvo automaticamente';
    mod.appendChild(badge);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
  badge.classList.remove('flash');
  // Reflow then re-add to restart the animation
  void badge.offsetWidth;
  badge.classList.add('flash');
}

window.saveDisplayName = () => {
  const input = document.getElementById('st-name');
  if (!input) return;
  const name = input.value.trim();
  if (!name) { toast('Nome não pode ficar vazio', 'e'); return; }
  STATE.user.name = name;
  // Update visible places
  document.getElementById('hub-uname').textContent = name;
  // Sync to Supabase profile if configured
  if (window.sb && window.Data?.upsert) {
    Data.upsert('profiles', { id: STATE.user.id, name, email: STATE.user.email, role: STATE.user.role, status: STATE.user.status })
      .catch(e => console.warn('[saveDisplayName] profile sync failed:', e));
  }
  saveToLocal();
  logAction('Nome atualizado', `Novo nome: ${name}`);
  toast('Nome atualizado', 's');
};

// Avatar upload: reads as Data URL and stores in STATE.user.avatar.
// Also syncs STATE.users[] so the avatar appears in other places (audit,
// mentions, etc) and pushes the change to Supabase profiles.
window.uploadAvatar = (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;
  // No hard size limit — we always crop to 256x256 JPEG so the stored
  // avatar stays small regardless of input. We only guard against very
  // large files (>30MB) to avoid freezing the browser while reading.
  if (file.size > 30 * 1024 * 1024) { toast('Arquivo acima de 30MB não suportado', 'e'); return; }
  if (!file.type.startsWith('image/')) { toast('Selecione um arquivo de imagem', 'e'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const imgUrl = e.target.result;
    _openAvatarCropper(imgUrl, (croppedUrl) => {
      STATE.user.avatar = croppedUrl;
      const match = (STATE.users || []).find(u => u.id === STATE.user.id || u.email === STATE.user.email);
      if (match) match.avatar = croppedUrl;
      saveToLocal();
      // Also refresh the session blob so the avatar survives F5
      try {
        const sess = JSON.parse(localStorage.getItem('3cos_sess') || '{}');
        sess.user = STATE.user;
        if (!sess.exp) sess.exp = Date.now() + 7 * 86400000;
        localStorage.setItem('3cos_sess', JSON.stringify(sess));
      } catch(e) { console.warn('[uploadAvatar] session refresh failed:', e); }
      if (window.sb && window.Data?.upsert) {
        Data.upsert('profiles', { id: STATE.user.id, name: STATE.user.name, email: STATE.user.email, role: STATE.user.role, status: STATE.user.status, avatar: croppedUrl })
          .catch(err => console.warn('[uploadAvatar] profile sync failed:', err));
      }
      const hubAv = document.getElementById('hub-user-avatar');
      if (hubAv && window.userAvatar) hubAv.innerHTML = window.userAvatar(STATE.user, 32);
      rerenderSettings();
      logAction('Avatar atualizado', '');
      toast('Avatar atualizado', 's');
    });
  };
  reader.readAsDataURL(file);
};

function _openAvatarCropper(imgUrl, onDone) {
  const SIZE = 256;
  openModal('Recortar avatar', `
    <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
      <div style="position:relative;width:${SIZE}px;height:${SIZE}px;overflow:hidden;border-radius:50%;border:2px solid var(--gb2);background:var(--bg3)">
        <img id="crop-img" src="${imgUrl}" style="position:absolute;cursor:grab;user-select:none;-webkit-user-drag:none" draggable="false">
        <div style="position:absolute;inset:0;pointer-events:none;z-index:2">
          <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.25)"></div>
          <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(255,255,255,0.25)"></div>
          <div style="position:absolute;left:33.33%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="position:absolute;left:66.66%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="position:absolute;top:33.33%;left:0;right:0;height:1px;background:rgba(255,255,255,0.1)"></div>
          <div style="position:absolute;top:66.66%;left:0;right:0;height:1px;background:rgba(255,255,255,0.1)"></div>
        </div>
      </div>
      <input type="range" id="crop-zoom" min="100" max="300" value="100" style="width:200px;accent-color:var(--theme)">
      <div style="font-size:11px;color:var(--text3)">Arraste a imagem e ajuste o zoom</div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-theme" onclick="_applyCrop()">Salvar</button>`);
  lucide.createIcons();

  const img = document.getElementById('crop-img');
  const zoom = document.getElementById('crop-zoom');
  let ox = 0, oy = 0, dragging = false, startX, startY, imgW, imgH;

  img.onload = () => {
    const ratio = img.naturalWidth / img.naturalHeight;
    if (ratio >= 1) { imgH = SIZE; imgW = SIZE * ratio; }
    else { imgW = SIZE; imgH = SIZE / ratio; }
    img.style.width = imgW + 'px';
    img.style.height = imgH + 'px';
    ox = -(imgW - SIZE) / 2;
    oy = -(imgH - SIZE) / 2;
    _updatePos();
  };
  if (img.complete) img.onload();

  function _updatePos() {
    img.style.left = ox + 'px';
    img.style.top = oy + 'px';
  }

  img.addEventListener('pointerdown', (e) => {
    dragging = true; startX = e.clientX - ox; startY = e.clientY - oy;
    img.style.cursor = 'grabbing';
    img.setPointerCapture(e.pointerId);
  });
  img.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    ox = e.clientX - startX; oy = e.clientY - startY;
    _updatePos();
  });
  img.addEventListener('pointerup', () => { dragging = false; img.style.cursor = 'grab'; });

  zoom.addEventListener('input', () => {
    const scale = zoom.value / 100;
    const ratio = img.naturalWidth / img.naturalHeight;
    const baseW = ratio >= 1 ? SIZE * ratio : SIZE;
    const baseH = ratio >= 1 ? SIZE : SIZE / ratio;
    imgW = baseW * scale; imgH = baseH * scale;
    img.style.width = imgW + 'px';
    img.style.height = imgH + 'px';
    ox = Math.min(0, Math.max(-(imgW - SIZE), ox));
    oy = Math.min(0, Math.max(-(imgH - SIZE), oy));
    _updatePos();
  });

  window._applyCrop = () => {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE; canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const scaleX = img.naturalWidth / imgW;
    const scaleY = img.naturalHeight / imgH;
    ctx.drawImage(img, -ox * scaleX, -oy * scaleY, SIZE * scaleX, SIZE * scaleY, 0, 0, SIZE, SIZE);
    const result = canvas.toDataURL('image/jpeg', 0.85);
    closeModal();
    onDone(result);
  };
}

window.changePassword = async () => {
  const np = document.getElementById('st-pw-new')?.value;
  const cf = document.getElementById('st-pw-confirm')?.value;
  if (!np || np.length < 8) { toast('A senha precisa ter pelo menos 8 caracteres', 'e'); return; }
  if (np !== cf) { toast('As senhas não coincidem', 'e'); return; }
  if (!window.sb) { toast('Supabase não configurado', 'e'); return; }
  try {
    const { error } = await sb.auth.updateUser({ password: np });
    if (error) throw error;
    document.getElementById('st-pw-new').value = '';
    document.getElementById('st-pw-confirm').value = '';
    logAction('Senha alterada', '');
    toast('Senha atualizada', 's');
  } catch (e) {
    toast(`Erro ao alterar senha: ${e.message}`, 'e');
  }
};

window.logoutOtherSessions = async () => {
  if (!window.sb) { toast('Supabase não configurado', 'e'); return; }
  if (!confirm('Sair de todos os outros dispositivos? Esta sessão permanecerá ativa.')) return;
  try {
    const { error } = await sb.auth.signOut({ scope: 'others' });
    if (error) throw error;
    logAction('Outras sessões encerradas', '');
    toast('Outras sessões encerradas', 's');
  } catch (e) {
    toast(`Erro: ${e.message}`, 'e');
  }
};

window.exportMyData = () => {
  const snapshot = {
    exportedAt: new Date().toISOString(),
    user: STATE.user,
    settings: STATE.settings,
    affiliates: STATE.affiliates,
    brands: STATE.brands,
    contracts: STATE.contracts,
    payments: STATE.payments,
    tasks: STATE.tasks,
    reports: STATE.reports,
    closings: STATE.closings,
    pipeline: STATE.pipeline,
  };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `3cos-export-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Export concluído', 's');
};

window.clearLocalCache = () => {
  if (!confirm('Limpar o cache local? A próxima entrada fará uma nova sincronização do Supabase.')) return;
  localStorage.removeItem('3C_OS_DATA');
  toast('Cache local limpo — recarregando...', 's');
  setTimeout(() => location.reload(), 600);
};

// ── IMPORT FROM 3C DASH (legacy JSON format) ──
window.openImport3CDash = () => {
  openModal('Importar dados do 3C Dash (JSON)', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:10px;line-height:1.5">
      Cole abaixo o JSON exportado do 3C Dash. Vou converter automaticamente brands, afiliados (com totais agregados dos reports), reports diários e audit log. Isso SUBSTITUI os dados atuais de demo.
    </div>
    <textarea id="imp-json" class="fi" rows="10" style="font-family:monospace;font-size:11px;resize:vertical" placeholder='{"brands":{...},"affiliates":[...],"dailyReports":[...]}'></textarea>
  `, `
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="run3CDashImport()"><i data-lucide="upload"></i> Importar</button>
  `);
};

// Wipes previous data from Supabase so the import starts fresh.
// Uses neq on a fake id to match all rows (Supabase requires a filter on deletes).
async function _clearSupabaseForImport() {
  if (!window.sb) return;
  const tables = [
    'reports', 'payments', 'contracts', 'tasks', 'closings',
    'pipeline_cards', 'pipeline_stages', 'available_tags',
    'affiliates', 'brands', 'audit_log', 'notifications',
  ];
  for (const t of tables) {
    try {
      const { error } = await sb.from(t).delete().neq('id', '__never__');
      if (error) console.warn(`[clear] ${t}:`, error.message);
    } catch (e) {
      console.warn(`[clear] ${t} exception:`, e.message);
    }
  }
}

window.run3CDashImport = async () => {
  const raw = document.getElementById('imp-json')?.value?.trim();
  if (!raw) { toast('Cole o JSON antes de importar', 'e'); return; }
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { toast(`JSON inválido: ${e.message}`, 'e'); return; }
  if (!confirm('Isso vai APAGAR todos os dados atuais (demo ou reais) e substituir pelos do JSON. Confirma?')) return;

  const hexToRgb = h => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h || '');
    return m ? `${parseInt(m[1],16)},${parseInt(m[2],16)},${parseInt(m[3],16)}` : '136,136,136';
  };

  // ── BRANDS ──
  const brands = {};
  Object.entries(data.brands || {}).forEach(([name, b]) => {
    brands[name] = {
      color: b.color || '#888',
      rgb: hexToRgb(b.color),
      cpa: b.cpa || 0,
      rs: b.rs || 0,
      type: b.type || 'standard',
      logo: b.logo || '',
      ...(b.levels ? { levels: b.levels } : {}),
    };
  });

  // ── REPORTS (index by affiliate for total computation) ──
  const reportsByAff = {};
  const reports = (data.dailyReports || []).map(r => {
    if (!reportsByAff[r.affiliateId]) reportsByAff[r.affiliateId] = [];
    reportsByAff[r.affiliateId].push(r);
    return {
      brand: r.brand, affiliateId: r.affiliateId, date: r.date,
      ftd: r.ftd || 0, qftd: r.qftd || 0,
      deposits: r.deposits || 0, netRev: r.netRev || 0,
    };
  });

  // ── AFFILIATES (aggregate totals from reports) ──
  const affiliates = (data.affiliates || []).map(a => {
    const rows = reportsByAff[a.id] || [];
    const ftds = rows.reduce((s, r) => s + (r.ftd || 0), 0);
    const qftds = rows.reduce((s, r) => {
      if (typeof r.qftd === 'number') return s + r.qftd;
      if (typeof r.qftd === 'object' && r.qftd) return s + Object.values(r.qftd).reduce((x, v) => x + (v || 0), 0);
      return s;
    }, 0);
    const deposits = rows.reduce((s, r) => s + (r.deposits || 0), 0);
    const netRev = rows.reduce((s, r) => s + (r.netRev || 0), 0);

    // Infer contractType from deals
    let contractType = 'cpa';
    const deals = {};
    Object.entries(a.deals || {}).forEach(([bname, d]) => {
      if (d.cpa_l1 !== undefined || d.cpa_l2 !== undefined || d.cpa_l3 !== undefined) {
        contractType = 'tiered';
        // Convert legacy tiered format to our levels array using brand's baselines
        const brandLevels = (brands[bname]?.levels) || [
          { key: 'l1', baseline: 30 }, { key: 'l2', baseline: 300 }, { key: 'l3', baseline: 1200 },
        ];
        deals[bname] = {
          rs: d.rs || 0,
          levels: brandLevels.map(bl => ({
            key: bl.key,
            name: bl.name || bl.key.toUpperCase(),
            cpa: d['cpa_' + bl.key] || d.cpa || bl.cpa || 0,
            baseline: bl.baseline,
          })),
        };
      } else {
        deals[bname] = {
          cpa: d.cpa || 0, rs: d.rs || 0,
          ...(d.baseline !== undefined ? { baseline: d.baseline } : {}),
        };
        if ((d.cpa === 0 || !d.cpa) && d.rs > 0) contractType = 'rs';
      }
    });

    // Compute a rough commission + profit (CPA*QFTDs + RS*NetRev — best effort)
    // Uses the tiered helper from dashboard if available, falls back to flat.
    const commission = rows.reduce((s, r) => {
      const dealForBrand = deals[r.brand];
      if (!dealForBrand) return s;
      const qf = typeof r.qftd === 'number' ? r.qftd : (typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((x, v) => x + (v || 0), 0) : 0);
      let cpaPart = 0;
      if (dealForBrand.levels?.length) {
        const sorted = [...dealForBrand.levels].sort((a, b) => (a.baseline || 0) - (b.baseline || 0));
        let rem = qf;
        for (let i = 0; i < sorted.length && rem > 0; i++) {
          const nextBase = sorted[i + 1]?.baseline || Infinity;
          const tierCap = nextBase - (sorted[i].baseline || 0);
          const inTier = Math.min(rem, tierCap);
          cpaPart += inTier * (sorted[i].cpa || 0);
          rem -= inTier;
        }
      } else {
        cpaPart = (dealForBrand.cpa || 0) * qf;
      }
      const rsPart = (dealForBrand.rs || 0) / 100 * (r.netRev || 0);
      return s + cpaPart + Math.max(0, rsPart);
    }, 0);
    const profit = netRev - commission;

    return {
      id: a.id, name: a.name,
      type: 'afiliado', status: 'ativo',
      contractType,
      contactName: a.contactName || a.name,
      contactEmail: a.contactEmail || a.email || a.contact?.email || '',
      contactPhone: a.contactPhone || a.phone || a.contact?.phone || '',
      social: a.social || '',
      deals, notes: a.notes || '',
      ftds, qftds, deposits: Math.round(deposits * 100) / 100,
      netRev: Math.round(netRev * 100) / 100,
      commission: Math.round(commission * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      createdAt: a.createdAt,
      tags: [],
    };
  });

  // ── AUDIT LOG (last 50) ──
  const auditLog = (data.auditLogs || []).slice(0, 100).map(l => ({
    id: l.id,
    action: l.action,
    detail: l.details || '',
    user: 'Sistema',
    time: new Date(l.timestamp || Date.now()).toLocaleString('pt-BR'),
  }));

  // ── APPLY to STATE ──
  STATE.brands = brands;
  STATE.affiliates = affiliates;
  STATE.reports = reports;
  STATE.auditLog = auditLog;
  STATE.contracts = [];
  STATE.payments = [];
  STATE.tasks = [];
  STATE.closings = [];
  STATE.pipeline = STATE.pipeline || { stages: [], cards: [] };

  logAction('Importação JSON (3C Dash)', `${affiliates.length} afiliado(s), ${reports.length} report(s), ${Object.keys(brands).length} marca(s)`);
  saveToLocal();

  // Sync to Supabase if configured — clear old data first, then upsert new
  if (window.SUPABASE_CONFIGURED && window.Data?.syncAll) {
    toast('Limpando dados antigos do Supabase...', 'i');
    await _clearSupabaseForImport();
    toast('Enviando novos dados...', 'i');
    try {
      await Data.syncAll();
      toast(`Importado com sucesso: ${affiliates.length} afiliados, ${reports.length} reports`, 's');
    } catch (e) {
      console.error('[import] sync failed:', e);
      toast(`Importado local, mas sync falhou: ${e.message}`, 'e');
    }
  } else {
    toast(`Importado: ${affiliates.length} afiliados, ${reports.length} reports`, 's');
  }

  closeModal();
  setTimeout(() => location.reload(), 1200);
};
