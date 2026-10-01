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
                <div class="st-theme-desc">Editorial revista em preto</div>
              </div>
              <div class="st-theme-card ${themeName==='glass-dark'?'on':''}" onclick="setAppTheme('glass-dark')">
                <div class="st-theme-preview st-theme-glass-dark"></div>
                <div class="st-theme-name">Liquid Glass</div>
                <div class="st-theme-desc">Superfícies de vidro translúcido</div>
              </div>
              <div class="st-theme-card ${themeName==='glass-light'?'on':''}" onclick="setAppTheme('glass-light')">
                <div class="st-theme-preview st-theme-glass-light"></div>
                <div class="st-theme-name">Liquid Glass Light</div>
                <div class="st-theme-desc">Vidro sobre lavanda suave</div>
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

      <!-- LABORATÓRIO · BETA FEATURES -->
      <div class="st-section">
        <div class="st-section-hdr">
          <div class="st-section-icon"><i data-lucide="flask-conical"></i></div>
          <div>
            <div class="st-section-title">Laboratório · Features em beta</div>
            <div class="st-section-sub">Recursos experimentais que podem ser ativados individualmente</div>
          </div>
        </div>
        <div class="st-card">
          <div class="st-row">
            <div>
              <div class="st-label">Modo Beta</div>
              <div class="st-hint">Libera o acesso ao laboratório abaixo e ao 3C Copilot</div>
            </div>
            ${switchHTML('st-beta-master', !!STATE.betaMode, 'toggleBetaMode()')}
          </div>
          ${STATE.betaMode ? `
          <div class="st-divider"></div>
          <div class="st-beta-grid">
            ${(window.BETA_FEATURES||[]).map(f => {
              const on = !!STATE.settings?.betaFlags?.[f.id];
              const badge = f.status === 'ready'
                ? '<span class="st-beta-badge st-beta-ready">Disponível</span>'
                : f.status === 'preview'
                  ? '<span class="st-beta-badge st-beta-preview">Prévia</span>'
                  : '<span class="st-beta-badge st-beta-planned">Em desenvolvimento</span>';
              const canToggle = f.status === 'ready' || f.status === 'preview';
              return `<div class="st-beta-item ${!canToggle?'st-beta-disabled':''}">
                <div class="st-beta-icon"><i data-lucide="${f.icon}"></i></div>
                <div class="st-beta-info">
                  <div class="st-beta-title">${f.name} ${badge}</div>
                  <div class="st-beta-desc">${f.desc}</div>
                </div>
                ${canToggle
                  ? switchHTML(`st-beta-${f.id}`, on, `toggleBetaFeature('${f.id}')`)
                  : '<div style="opacity:0.4;font-size:10px;color:var(--text3);padding-right:4px">Em breve</div>'}
              </div>`;
            }).join('')}
          </div>` : ''}
        </div>
      </div>

      <!-- AUTOMATIONS + WEEKLY DIGEST (render only if Lab features are enabled) -->
      ${typeof renderAutomationsSection === 'function' && STATE.betaMode ? `<div class="st-section"><div class="st-card">${renderAutomationsSection()}</div></div>` : ''}

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
  const labels={'default-dark':'Default Dark','default-light':'Default Light','mono-dark':'Mono Dark','mono-light':'Mono Light','bento-dark':'Bento Dark','bento-light':'Bento Light','meridian-light':'Meridian Light','meridian-dark':'Meridian Dark','glass-dark':'Liquid Glass','glass-light':'Liquid Glass Light'};
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
  'glass-dark':     { edition: 'glass',    theme: 'dark'  },
  'glass-light':    { edition: 'glass',    theme: 'light' },
  // Legacy keys (migrated on first load)
  'default':        { edition: '',         theme: 'dark'  },
  'mono':           { edition: 'mono',     theme: 'dark'  },
  'glass':          { edition: 'glass',    theme: 'dark'  },
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
// Deletes all rows from each table. Supabase requires an explicit filter on
// DELETE — using created_at (present on every table in this schema) with a
// date far in the past guarantees every row matches. Order matters: child
// tables (reports, contracts) must be cleared BEFORE parents (affiliates,
// brands) due to FK ON DELETE RESTRICT on some relations.
async function _clearSupabaseForImport() {
  if (!window.sb) return;
  const tables = [
    // Child tables first (reference brands/affiliates)
    'reports', 'payments', 'contracts', 'closings',
    // Then peer tables without FK dependencies
    'tasks', 'pipeline_cards', 'pipeline_stages', 'available_tags',
    'audit_log', 'notifications',
    // Parents last
    'affiliates', 'brands',
  ];
  for (const t of tables) {
    try {
      // created_at exists on every table and a 1900 filter matches every row.
      // Some tables use ts DEFAULT NOW() — this catches all.
      const { error } = await sb.from(t).delete().gte('created_at', '1900-01-01');
      if (error) console.warn(`[clear] ${t}:`, error.message);
      else console.log(`[clear] ${t} cleared`);
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
  // Accepts the Hub 3C schema (qftd as tier object {l1,l2,l3}, insertedAt,
  // affiliateName echo, etc.) plus legacy variants.
  const rawReports = data.dailyReports || data.reports || data.daily_reports || data.dailyData || [];
  console.log('[import] Raw reports array length:', rawReports.length);
  if (rawReports.length > 0) {
    console.log('[import] First report sample:', rawReports[0]);
  }
  const reportsByAff = {};
  const reports = rawReports.map(r => {
    const affId = r.affiliateId || r.affiliate_id || r.affId;
    const brand = r.brand || r.brandName || r.brand_name;
    const date = r.date || r.day || r.createdAt || r.created_at;
    if (!affId) { console.warn('[import] Report missing affiliateId:', r); }
    if (!date) { console.warn('[import] Report missing date:', r); }
    if (!reportsByAff[affId]) reportsByAff[affId] = [];
    // qftd can be a number OR a tier object like {l1:6,l2:0,l3:0}
    // Flatten to a number here: Supabase's reports.qftd is int, and the
    // tier breakdown isn't used downstream anyway (brand-level tiers handle
    // the marginal CPA calc via the affiliate's deal structure).
    const rawQftd = (r.qftd !== undefined && r.qftd !== null) ? r.qftd
      : (r.qftds !== undefined ? r.qftds : 0);
    const qftd = typeof rawQftd === 'object' && rawQftd
      ? Object.values(rawQftd).reduce((s, v) => s + (Number(v) || 0), 0)
      : (Number(rawQftd) || 0);
    const row = {
      id: r.id || undefined,
      brand, affiliateId: affId, date,
      ftd: Number(r.ftd ?? r.ftds ?? 0) || 0,
      qftd,
      deposits: Number(r.deposits ?? r.deposit ?? 0) || 0,
      netRev: Number(r.netRev ?? r.net_rev ?? r.netRevenue ?? r.net_revenue ?? 0) || 0,
    };
    reportsByAff[affId].push(row);
    return row;
  }).filter(r => r.affiliateId && r.date);
  console.log('[import] Reports parsed:', reports.length, 'daily rows across', Object.keys(reportsByAff).length, 'affiliates');
  if (reports.length > 0) {
    const dates = reports.map(r => r.date).sort();
    console.log('[import] Date range:', dates[0], '→', dates[dates.length-1]);
  }

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

    // Compute affiliate commission (what 3C pays the affiliate) AND
    // brand commission (what the brand pays 3C). Profit = brandComm - affComm.
    // Handles tiered structures via marginal-rate calculation.
    const _computeComm = (deal, qf, nr) => {
      if (!deal) return 0;
      let cpaPart = 0;
      if (deal.levels?.length) {
        const sorted = [...deal.levels].sort((a, b) => (a.baseline || 0) - (b.baseline || 0));
        let rem = qf;
        for (let i = 0; i < sorted.length && rem > 0; i++) {
          const nextBase = sorted[i + 1]?.baseline || Infinity;
          const tierCap = nextBase - (sorted[i].baseline || 0);
          const inTier = Math.min(rem, tierCap);
          cpaPart += inTier * (sorted[i].cpa || 0);
          rem -= inTier;
        }
      } else {
        cpaPart = (deal.cpa || 0) * qf;
      }
      const rsPart = (deal.rs || 0) / 100 * (nr || 0);
      return cpaPart + Math.max(0, rsPart);
    };

    let commission = 0;  // what 3C pays affiliate
    let brandRevenue = 0;  // what brand pays 3C
    rows.forEach(r => {
      const affDeal = deals[r.brand];
      const brandConf = brands[r.brand];
      if (!affDeal && !brandConf) return;
      const qf = typeof r.qftd === 'number' ? r.qftd : (typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((x, v) => x + (v || 0), 0) : 0);
      commission += _computeComm(affDeal, qf, r.netRev || 0);
      brandRevenue += _computeComm(brandConf, qf, r.netRev || 0);
    });
    const profit = brandRevenue - commission;

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

  // Sync to Supabase if configured — clear old data first, then upsert new.
  // We explicitly re-insert reports here (after syncAll) because the upsert
  // path inside syncAll depends on a unique index that may not be present.
  // Since we just cleared, a plain insert is safe and unambiguous.
  if (window.SUPABASE_CONFIGURED && window.Data?.syncAll) {
    toast('Limpando dados antigos do Supabase...', 'i');
    await _clearSupabaseForImport();
    toast('Enviando novos dados...', 'i');
    try {
      await Data.syncAll();
      // Verify reports landed — if the upsert silently lost the batch, reinsert.
      try {
        const { count } = await sb.from('reports').select('*', { count: 'exact', head: true });
        console.log('[import] Supabase reports count after sync:', count);
        if ((count || 0) === 0 && reports.length > 0) {
          console.warn('[import] reports missing in Supabase — forcing plain insert');
          const flattenQftd = (q) => {
            if (typeof q === 'number') return q;
            if (typeof q === 'object' && q) return Object.values(q).reduce((s, v) => s + (Number(v) || 0), 0);
            return 0;
          };
          const rows = reports
            .filter(r => r.brand && r.affiliateId && r.date)
            .map(r => ({
              brand: r.brand,
              affiliate_id: r.affiliateId,
              date: r.date,
              ftd: Number(r.ftd) || 0,
              qftd: flattenQftd(r.qftd),
              deposits: Number(r.deposits) || 0,
              net_rev: Number(r.netRev) || 0,
            }));
          const { error: insErr } = await sb.from('reports').insert(rows);
          if (insErr) console.error('[import] fallback insert failed:', insErr.message);
          else console.log('[import] fallback insert succeeded:', rows.length);
        }
      } catch (verr) {
        console.warn('[import] report-count verification failed:', verr.message);
      }
      toast(`Importado: ${affiliates.length} afiliados, ${reports.length} lançamentos diários, ${Object.keys(brands).length} marcas`, 's');
    } catch (e) {
      console.error('[import] sync failed:', e);
      toast(`Importado local, mas sync falhou: ${e.message}`, 'e');
    }
  } else {
    toast(`Importado: ${affiliates.length} afiliados, ${reports.length} lançamentos diários`, 's');
  }

  closeModal();
  setTimeout(() => location.reload(), 1500);
};

// ══════════════════════════════════════════════════════════
// AUTOMATIONS — External AI agent integration
// ══════════════════════════════════════════════════════════
// Stored in STATE.automations = [{ id, name, trigger, webhookUrl, active, createdAt }]
// Triggers: stale_contact | payment_overdue | new_affiliate | closing_done | manual

const AUTOMATION_TRIGGERS = {
  stale_contact: { label: 'Afiliado sem contato (14+ dias)', icon: 'clock' },
  payment_overdue: { label: 'Pagamento vencido', icon: 'alert-circle' },
  new_affiliate: { label: 'Novo afiliado cadastrado', icon: 'user-plus' },
  closing_done: { label: 'Fechamento concluído', icon: 'check-circle' },
  manual: { label: 'Disparo manual', icon: 'play' },
};

window.renderAutomationsSection = () => {
  if (typeof isBetaEnabled !== 'function' || !isBetaEnabled('automations')) return '';
  const autos = STATE.automations || [];
  const rows = autos.length ? autos.map(a => {
    const t = AUTOMATION_TRIGGERS[a.trigger] || AUTOMATION_TRIGGERS.manual;
    return `<div class="auto-row ${a.active ? '' : 'inactive'}">
      <div class="auto-row-icon"><i data-lucide="${t.icon}"></i></div>
      <div class="auto-row-body">
        <div class="auto-row-name">${a.name}</div>
        <div class="auto-row-trigger">${t.label}</div>
        <div class="auto-row-url">${a.webhookUrl}</div>
      </div>
      <div class="auto-row-actions">
        <button class="ibt" onclick="toggleAutomation('${a.id}')" title="${a.active?'Desativar':'Ativar'}">
          <i data-lucide="${a.active?'pause':'play'}" style="width:13px;height:13px"></i>
        </button>
        <button class="ibt" onclick="testAutomation('${a.id}')" title="Testar"><i data-lucide="zap" style="width:13px;height:13px"></i></button>
        <button class="ibt danger" onclick="deleteAutomation('${a.id}')" title="Excluir"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
      </div>
    </div>`;
  }).join('') : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:12px">Nenhuma automação configurada.</div>';

  return `<div class="sec-hdr" style="margin-top:20px"><div class="sec-lbl"><i data-lucide="bot" style="width:14px;height:14px;margin-right:6px"></i>Automações</div>
    <button class="btn btn-outline" onclick="openAddAutomation()" style="font-size:11px;padding:6px 12px"><i data-lucide="plus" style="width:12px;height:12px"></i> Nova Automação</button>
  </div>
  <div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.5">
    Configure webhooks para integrar agentes de IA externos. Quando o trigger é disparado, o 3COS envia um POST com os dados do evento para a URL configurada.
  </div>
  <div class="auto-list">${rows}</div>
  ${_renderWeeklyDigestSection()}`;
};

window.openAddAutomation = () => {
  const trigOpts = Object.entries(AUTOMATION_TRIGGERS).map(([k, v]) =>
    `<option value="${k}">${v.label}</option>`).join('');
  openModal('Nova Automação', `<div class="fg">
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="aut-name" placeholder="Ex: Notificar agente de follow-up"></div>
    <div class="fgp"><label>Trigger</label><select class="fi" id="aut-trigger">${trigOpts}</select></div>
    <div class="fgp ff"><label>Webhook URL *</label><input class="fi" id="aut-url" placeholder="https://hook.integromat.com/..."></div>
  </div>`, `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveAutomation()"><i data-lucide="check"></i> Criar</button>`);
};

window.saveAutomation = () => {
  const name = document.getElementById('aut-name')?.value?.trim();
  const url = document.getElementById('aut-url')?.value?.trim();
  if (!name || !url) return toast('Nome e URL obrigatórios', 'e');
  if (!STATE.automations) STATE.automations = [];
  STATE.automations.push({
    id: 'aut' + Date.now(),
    name,
    trigger: document.getElementById('aut-trigger')?.value || 'manual',
    webhookUrl: url,
    active: true,
    createdAt: new Date().toISOString(),
  });
  logAction('Automação criada', name);
  saveToLocal(); closeModal();
  toast('Automação criada!');
  if (typeof rerenderSettings === 'function') rerenderSettings();
};

window.toggleAutomation = (id) => {
  const a = (STATE.automations || []).find(x => x.id === id);
  if (!a) return;
  a.active = !a.active;
  saveToLocal();
  toast(a.active ? 'Automação ativada' : 'Automação desativada');
  if (typeof rerenderSettings === 'function') rerenderSettings();
};

window.testAutomation = async (id) => {
  const a = (STATE.automations || []).find(x => x.id === id);
  if (!a) return;
  toast('Enviando teste...', 'i');
  try {
    await fetch(a.webhookUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'test', trigger: a.trigger, source: '3COS', timestamp: new Date().toISOString(), data: { message: 'Teste de automação do 3COS' } }),
    });
    toast('Webhook disparado com sucesso!', 's');
    logAction('Automação testada', a.name);
  } catch (e) {
    toast('Falha no webhook: ' + e.message, 'e');
  }
};

window.deleteAutomation = (id) => {
  if (!confirm('Excluir esta automação?')) return;
  STATE.automations = (STATE.automations || []).filter(x => x.id !== id);
  saveToLocal();
  toast('Automação excluída');
  if (typeof rerenderSettings === 'function') rerenderSettings();
};

window.fireAutomationTrigger = async (triggerType, eventData) => {
  const autos = (STATE.automations || []).filter(a => a.active && a.trigger === triggerType);
  for (const a of autos) {
    try {
      await fetch(a.webhookUrl, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: triggerType, source: '3COS', timestamp: new Date().toISOString(), data: eventData }),
      });
    } catch (e) { console.warn('[automation]', a.name, 'failed:', e.message); }
  }
};

// ══════════════════════════════════════════════════════════
// WEEKLY DIGEST — Premium HTML email summary
// ══════════════════════════════════════════════════════════

function _renderWeeklyDigestSection() {
  if (typeof isBetaEnabled !== 'function' || !isBetaEnabled('weekly_digest')) return '';
  const cfg = STATE.emailjs || {};
  const hasEmail = cfg.publicKey && cfg.serviceId && cfg.financeEmail;
  return `<div class="sec-hdr" style="margin-top:22px"><div class="sec-lbl"><i data-lucide="newspaper" style="width:14px;height:14px;margin-right:6px"></i>Weekly Digest</div></div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.5">
      Resumo semanal com HTML premium enviado ao board via EmailJS. Inclui: top performers, receita vs. meta, pagamentos pendentes e alertas.
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-theme" onclick="sendWeeklyDigest()" ${hasEmail ? '' : 'disabled'}>
        <i data-lucide="send"></i> Enviar Digest Agora
      </button>
      <button class="btn btn-outline" onclick="previewWeeklyDigest()">
        <i data-lucide="eye"></i> Pré-visualizar
      </button>
      ${!hasEmail ? '<div style="font-size:10px;color:var(--amber);margin-top:6px">Configure EmailJS em Backup & Nuvem primeiro.</div>' : ''}
    </div>`;
}

window.previewWeeklyDigest = () => {
  const html = _buildDigestHTML();
  const w = window.open('', '_blank', 'width=700,height=800');
  w.document.write(html);
  w.document.close();
};

window.sendWeeklyDigest = () => {
  const cfg = STATE.emailjs;
  if (!cfg?.publicKey || !cfg?.serviceId || !cfg?.financeEmail) return toast('Configure EmailJS primeiro', 'e');
  if (typeof emailjs === 'undefined') return toast('SDK EmailJS não carregado', 'e');
  const html = _buildDigestHTML();
  const templateId = cfg.templateIdDigest || cfg.templateId;
  if (!templateId) return toast('Template ID não configurado', 'e');
  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId, templateId, {
    to_email: cfg.financeEmail,
    subject: `3COS Weekly Digest — ${new Date().toLocaleDateString('pt-BR')}`,
    message: html,
  }).then(() => {
    toast('Digest enviado com sucesso!', 's');
    logAction('Weekly Digest enviado', cfg.financeEmail);
  }, (err) => toast('Erro: ' + err.text, 'e'));
};

function _buildDigestHTML() {
  const now = new Date();
  const weekLabel = `Semana de ${new Date(now - 7*86400000).toLocaleDateString('pt-BR')} a ${now.toLocaleDateString('pt-BR')}`;
  const affs = STATE.affiliates || [];
  const topAffs = [...affs].sort((a, b) => (b.profit || 0) - (a.profit || 0)).slice(0, 5);
  let totalRev = 0, totalComm = 0, totalProfit = 0, totalQFTD = 0;
  affs.forEach(a => { totalRev += a.netRev || 0; totalComm += a.commission || 0; totalProfit += a.profit || 0; totalQFTD += a.qftds || 0; });
  const overdue = (STATE.payments || []).filter(p => {
    const s = typeof computePaymentStatus === 'function' ? computePaymentStatus(p) : p.status;
    return s === 'vencido' || s === 'atrasado';
  });
  const openTasks = (STATE.tasks || []).filter(t => t.status !== 'concluída').length;
  const brands = Object.keys(STATE.brands || {});

  const affRows = topAffs.map((a, i) => `<tr>
    <td style="padding:12px 16px;border-bottom:1px solid #eee;font-weight:600;color:#1e1b4b">${i + 1}. ${a.name}</td>
    <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:#059669">${fc(a.profit || 0)}</td>
    <td style="padding:12px 16px;border-bottom:1px solid #eee;text-align:right">${a.qftds || 0}</td>
  </tr>`).join('');

  const overdueRows = overdue.slice(0, 5).map(p => `<tr>
    <td style="padding:10px 16px;border-bottom:1px solid #fecaca;color:#dc2626;font-weight:500">${p.affiliate}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #fecaca;text-align:right;font-family:monospace">${fc(p.amount || 0)}</td>
    <td style="padding:10px 16px;border-bottom:1px solid #fecaca">${p.brand || ''}</td>
  </tr>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Roboto,'Helvetica Neue',sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#1e1b4b 0%,#5b21b6 50%,#db2777 100%);border-radius:20px;padding:40px 32px;text-align:center;margin-bottom:24px">
        <div style="font-size:14px;letter-spacing:0.25em;color:rgba(255,255,255,0.6);text-transform:uppercase;margin-bottom:8px">3C OS Pro</div>
        <h1 style="font-size:32px;font-weight:800;color:#fff;margin:0 0 6px;letter-spacing:-0.02em">Weekly Digest</h1>
        <div style="font-size:14px;color:rgba(255,255,255,0.7)">${weekLabel}</div>
      </div>

      <!-- KPIs -->
      <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">
        <div style="flex:1;min-width:130px;background:#fff;border-radius:14px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-bottom:8px">Receita</div>
          <div style="font-size:26px;font-weight:800;color:#1e1b4b;font-family:monospace">${fc(totalRev)}</div>
        </div>
        <div style="flex:1;min-width:130px;background:#fff;border-radius:14px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-bottom:8px">Lucro 3C</div>
          <div style="font-size:26px;font-weight:800;color:#059669;font-family:monospace">${fc(totalProfit)}</div>
        </div>
        <div style="flex:1;min-width:130px;background:#fff;border-radius:14px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;margin-bottom:8px">QFTDs</div>
          <div style="font-size:26px;font-weight:800;color:#1e1b4b">${totalQFTD}</div>
        </div>
      </div>

      <!-- Top performers -->
      <div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
        <div style="padding:18px 20px;border-bottom:2px solid #f1f5f9">
          <div style="font-size:13px;font-weight:700;color:#1e1b4b;letter-spacing:0.02em">🏆 Top Performers</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          <tr style="background:#f8fafc"><th style="padding:10px 16px;text-align:left;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em">Afiliado</th><th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em">Lucro</th><th style="padding:10px 16px;text-align:right;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em">QFTDs</th></tr>
          ${affRows}
        </table>
      </div>

      ${overdue.length ? `<!-- Alertas -->
      <div style="background:#fff;border-radius:14px;overflow:hidden;margin-bottom:20px;border:1px solid #fecaca;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
        <div style="padding:18px 20px;border-bottom:2px solid #fecaca;background:#fff5f5">
          <div style="font-size:13px;font-weight:700;color:#dc2626">⚠️ Pagamentos em Atraso (${overdue.length})</div>
        </div>
        <table style="width:100%;border-collapse:collapse">
          ${overdueRows}
        </table>
      </div>` : ''}

      <!-- Summary bar -->
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap">
        <div style="flex:1;background:#fff;border-radius:10px;padding:14px 16px;font-size:12px;color:#6b7280;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <strong style="color:#1e1b4b">${brands.length}</strong> marcas ativas
        </div>
        <div style="flex:1;background:#fff;border-radius:10px;padding:14px 16px;font-size:12px;color:#6b7280;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <strong style="color:#1e1b4b">${affs.length}</strong> afiliados
        </div>
        <div style="flex:1;background:#fff;border-radius:10px;padding:14px 16px;font-size:12px;color:#6b7280;box-shadow:0 2px 8px rgba(0,0,0,0.04)">
          <strong style="color:#1e1b4b">${openTasks}</strong> tarefas pendentes
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align:center;padding:20px;font-size:11px;color:#9ca3af">
        <div style="margin-bottom:4px">Gerado automaticamente pelo <strong style="color:#6b7280">3C OS Pro</strong></div>
        <div>${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    </div>
  </body></html>`;
}
