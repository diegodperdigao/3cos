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
    ${heroHTML('settings','Preferências','Configurações','Personalize a experiência do 3C OS')}
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
              <div class="st-theme-card ${themeName==='default'?'on':''}" onclick="setAppTheme('default')">
                <div class="st-theme-preview st-theme-default"></div>
                <div class="st-theme-name">Default</div>
                <div class="st-theme-desc">Cores vibrantes da marca 3C</div>
              </div>
              <div class="st-theme-card ${themeName==='mono'?'on':''}" onclick="setAppTheme('mono')">
                <div class="st-theme-preview st-theme-mono"></div>
                <div class="st-theme-name">Mono</div>
                <div class="st-theme-desc">Monocromático, foco em conteúdo</div>
              </div>
              <div class="st-theme-card ${themeName==='glass'?'on':''}" onclick="setAppTheme('glass')">
                <div class="st-theme-preview st-theme-glass"></div>
                <div class="st-theme-name">Nebula</div>
                <div class="st-theme-desc">Espaço profundo com um toque de violeta</div>
              </div>
              <div class="st-theme-card ${themeName==='neonflow'?'on':''}" onclick="setAppTheme('neonflow')">
                <div class="st-theme-preview st-theme-neonflow"></div>
                <div class="st-theme-name">Neon Flow</div>
                <div class="st-theme-desc">Gaming premium — neon líquido e glassmorphism</div>
              </div>
              <div class="st-theme-card ${themeName==='bento'?'on':''}" onclick="setAppTheme('bento')">
                <div class="st-theme-preview st-theme-bento"></div>
                <div class="st-theme-name">Bento</div>
                <div class="st-theme-desc">Neo-Brutalism fintech — bordas duras, pastéis vívidos</div>
              </div>
            </div>
          </div>
          <div class="st-divider"></div>
          <div class="st-row">
            <div>
              <div class="st-label">Modo de contraste</div>
              <div class="st-hint">Dark reduz fadiga ocular; Light é mais legível em ambientes claros</div>
            </div>
            <div class="st-segmented">
              <button class="st-seg ${dark?'on':''}" onclick="setColorMode('dark')"><i data-lucide="moon"></i> Dark</button>
              <button class="st-seg ${!dark?'on':''}" onclick="setColorMode('light')"><i data-lucide="sun"></i> Light</button>
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
          <div class="st-row st-row-col">
            <div class="st-label">Nome de exibição</div>
            <div style="display:flex;gap:8px;width:100%">
              <input type="text" class="fi" id="st-name" value="${escapeHTML(user.name||'')}" style="flex:1">
              <button class="btn btn-theme" onclick="saveDisplayName()"><i data-lucide="check"></i> Salvar</button>
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
  STATE.settings.theme = name;
  applyAppTheme();
  saveToLocal();
  toast(`Tema ${({default:'Default',mono:'Mono',glass:'Nebula',neonflow:'Neon Flow',bento:'Bento'})[name]||name} aplicado`, 's');
  // Re-render settings to update selection UI
  rerenderSettings();
};

window.applyAppTheme = () => {
  const root = document.documentElement;
  const theme = STATE.settings?.theme || 'default';
  // Apply edition attribute: 'mono', 'glass', 'neonflow', 'bento', or remove for default
  if (['mono', 'glass', 'neonflow', 'bento'].includes(theme) && STATE.user) root.setAttribute('data-edition', theme);
  else root.removeAttribute('data-edition');
  // Reduced motion
  if (STATE.settings?.reducedMotion) root.setAttribute('data-motion', 'reduced');
  else root.removeAttribute('data-motion');
  // Density
  const d = STATE.settings?.density || 'comfortable';
  root.setAttribute('data-density', d);
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
  rerenderSettings();
};

window.toggleSetting = (key) => {
  STATE.settings[key] = !STATE.settings[key];
  applyAppTheme();
  saveToLocal();
  if (key === 'showIntroVideo') {
    localStorage.setItem('3cos_show_intro', STATE.settings[key] ? '1' : '0');
  }
};

window.toggleNotif = (key) => {
  if (!STATE.settings.notifications) STATE.settings.notifications = {};
  STATE.settings.notifications[key] = !STATE.settings.notifications[key];
  saveToLocal();
};

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
