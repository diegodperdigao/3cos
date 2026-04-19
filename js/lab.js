// ══════════════════════════════════════════════════════════
// LAB — Beta Features Registry
// ══════════════════════════════════════════════════════════
// Previously gated: Tags, Smart Lists, Last Contact, Mono theme.
// These are now STANDARD. This file powers the next wave of
// experiments with per-feature toggles so admins can opt-in.
// ══════════════════════════════════════════════════════════

// Registry of current beta features. Each entry:
//   id: stable key, used in STATE.settings.betaFlags
//   name: short display name
//   desc: one-sentence summary of what it does
//   status: 'ready' (usable now) | 'preview' (partial) | 'planned' (stub)
//   icon: lucide icon
//   where: short hint of where the feature shows up in the UI
const BETA_FEATURES = [
  { id: 'activity_timeline', name: 'Timeline de atividades', desc: 'Registre ligações, reuniões, emails e notas estruturadas por afiliado — separado do log de auditoria.', status: 'ready', icon: 'activity', where: 'Afiliados → clique em um card → aba Timeline' },
  { id: 'followups', name: 'Follow-ups agendados', desc: 'Próxima ação vinculada ao afiliado, com data e lembrete automático na Central de Ações.', status: 'planned', icon: 'calendar-clock', where: 'Em desenvolvimento' },
  { id: 'reports_custom', name: 'Relatórios customizados', desc: 'Comparação de períodos, cohort de afiliados, drill-down por marca e tipo de deal.', status: 'planned', icon: 'bar-chart-3', where: 'Em desenvolvimento' },
  { id: 'attachments', name: 'Anexos em afiliado/contrato', desc: 'Upload de contratos, NFs e prints diretamente no cadastro (substitui o campo nfName).', status: 'planned', icon: 'paperclip', where: 'Em desenvolvimento' },
  { id: 'custom_fields', name: 'Campos customizados', desc: 'Adicionar propriedades sob medida em afiliados e marcas sem alterar o schema.', status: 'planned', icon: 'settings-2', where: 'Em desenvolvimento' },
  { id: 'bulk_actions', name: 'Ações em lote', desc: 'Selecionar múltiplos afiliados e aplicar tag, exportar ou mover no pipeline de uma vez.', status: 'planned', icon: 'check-square', where: 'Em desenvolvimento' },
  { id: 'multi_pipeline', name: 'Múltiplos pipelines', desc: 'Criar pipelines paralelos (negociação, renegociação, onboarding) com etapas próprias.', status: 'planned', icon: 'git-branch', where: 'Em desenvolvimento' },
];
window.BETA_FEATURES = BETA_FEATURES;

// Reads the per-feature flag. Returns false if betaMode global is off or
// the flag wasn't explicitly set. Features must opt-in.
window.isBetaEnabled = (featureId) => {
  if (!STATE.betaMode) return false;
  const flags = STATE.settings?.betaFlags || {};
  return !!flags[featureId];
};

// Back-compat alias used by older code paths that existed when everything
// was "lab" instead of "beta". Current consumers treat it as "is any lab
// feature available" which we map to the global betaMode.
window.isLab = () => !!STATE.betaMode;

// No per-feature header badge anymore — the module-level Beta tag (in the
// header bar) is enough indication when experimental features are active.
window.labBadge = () => '';

// Toggle a specific beta feature. Persists to STATE.settings.betaFlags
// and refreshes the active module so the feature appears/disappears.
window.toggleBetaFeature = (featureId) => {
  if (!STATE.settings) STATE.settings = {};
  if (!STATE.settings.betaFlags) STATE.settings.betaFlags = {};
  const was = !!STATE.settings.betaFlags[featureId];
  STATE.settings.betaFlags[featureId] = !was;
  const feature = BETA_FEATURES.find(f => f.id === featureId);
  logAction(`Beta: ${feature?.name || featureId} ${!was ? 'ativado' : 'desativado'}`, '');
  saveToLocal();
  if (window.refreshActiveModule) refreshActiveModule();
  if (typeof rerenderSettings === 'function') rerenderSettings();
  // Richer toast explains where the feature appears
  if (!was && feature?.where) {
    toast(`${feature.name} ativada — ${feature.where}`, 's');
  } else {
    toast(`${feature?.name || 'Feature'} ${!was ? 'ativada' : 'desativada'}`, 's');
  }
};

window.toggleBetaMode = () => {
  // If Beta is already ON and the user clicks again, open the features panel
  // instead of turning it off. This prevents accidentally losing the state
  // and makes the active features discoverable.
  if (STATE.betaMode) {
    return window.openBetaMenu();
  }
  STATE.betaMode = true;
  logAction('Modo Beta ativado', '');
  saveToLocal();
  updateLabButton();
  if (window.updateCopilotVisibility) updateCopilotVisibility();
  if (window.refreshActiveModule) refreshActiveModule();
  if (typeof rerenderSettings === 'function') rerenderSettings();
  // Open the menu right after activation so the user sees what's available
  setTimeout(() => window.openBetaMenu(), 100);
};

// Renders a small anchored panel listing all beta features with quick toggles
// and a hint of where each one shows up. Replaces the old "just turn off"
// behavior of clicking the flask icon again.
window.openBetaMenu = () => {
  // Remove any existing menu
  document.getElementById('beta-menu-popover')?.remove();

  const anchor = document.querySelector('#hub-beta-btn, .hdr-icon-btn[onclick*="toggleBetaMode"]');
  if (!anchor) return;
  const rect = anchor.getBoundingClientRect();

  const items = (window.BETA_FEATURES || []).map(f => {
    const on = !!STATE.settings?.betaFlags?.[f.id];
    const ready = f.status === 'ready' || f.status === 'preview';
    return `<div class="beta-menu-item ${ready ? '' : 'is-planned'}">
      <div class="beta-menu-icon"><i data-lucide="${f.icon}"></i></div>
      <div class="beta-menu-body">
        <div class="beta-menu-name">${f.name}
          ${f.status === 'ready' ? '<span class="beta-menu-tag beta-menu-ready">Disponível</span>' :
            f.status === 'preview' ? '<span class="beta-menu-tag beta-menu-preview">Prévia</span>' :
            '<span class="beta-menu-tag beta-menu-planned">Em breve</span>'}
        </div>
        <div class="beta-menu-where">${f.where}</div>
      </div>
      ${ready
        ? `<button class="beta-menu-switch ${on ? 'on' : ''}" onclick="toggleBetaFeature('${f.id}');openBetaMenu()" title="${on ? 'Desativar' : 'Ativar'}">
            ${on ? '<i data-lucide="check"></i>' : ''}
          </button>`
        : ''}
    </div>`;
  }).join('');

  const popover = document.createElement('div');
  popover.id = 'beta-menu-popover';
  popover.className = 'beta-menu-popover';
  popover.innerHTML = `
    <div class="beta-menu-hdr">
      <div>
        <div class="beta-menu-title">Laboratório</div>
        <div class="beta-menu-sub">Features experimentais</div>
      </div>
      <button class="ibt" onclick="document.getElementById('beta-menu-popover')?.remove()" title="Fechar"><i data-lucide="x" style="width:12px;height:12px"></i></button>
    </div>
    <div class="beta-menu-list">${items}</div>
    <div class="beta-menu-ftr">
      <button class="btn btn-outline" onclick="document.getElementById('beta-menu-popover')?.remove();openMod('settings')" style="flex:1"><i data-lucide="settings-2"></i> Gerenciar em Configurações</button>
      <button class="btn btn-ghost" onclick="_deactivateBetaMode()" title="Desativar modo Beta"><i data-lucide="power"></i></button>
    </div>
  `;
  popover.style.position = 'fixed';
  popover.style.top = `${rect.bottom + 8}px`;
  popover.style.right = `${Math.max(12, window.innerWidth - rect.right)}px`;
  popover.style.zIndex = '300';
  document.body.appendChild(popover);
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Click-outside to close
  setTimeout(() => {
    document.addEventListener('click', function closer(e) {
      if (!popover.contains(e.target) && !e.target.closest('#hub-beta-btn, [onclick*="toggleBetaMode"]')) {
        popover.remove();
      } else {
        document.addEventListener('click', closer, { once: true });
      }
    }, { once: true });
  }, 0);
};

window._deactivateBetaMode = () => {
  STATE.betaMode = false;
  logAction('Modo Beta desativado', '');
  saveToLocal();
  updateLabButton();
  if (window.updateCopilotVisibility) updateCopilotVisibility();
  if (window.refreshActiveModule) refreshActiveModule();
  if (typeof rerenderSettings === 'function') rerenderSettings();
  document.getElementById('beta-menu-popover')?.remove();
  toast('Modo Beta desativado', 'i');
};

window.updateLabButton = () => {
  const on = STATE.betaMode === true;
  // New Apple-clean icon buttons in the hub + module headers
  document.querySelectorAll('#hub-beta-btn, [onclick*="toggleBetaMode"]').forEach(btn => {
    btn.classList.toggle('on', on);
    btn.setAttribute('title', on ? 'Modo Beta ativo — clique para desativar' : 'Alternar modo Beta');
  });
  // Legacy .beta-btn class (still rendered in some places)
  document.querySelectorAll('.beta-btn').forEach(btn => {
    btn.classList.toggle('active', on);
    const txt = btn.querySelector('.beta-btn-txt');
    if (txt) txt.textContent = on ? 'BETA · ON' : 'BETA';
  });
};
window.updateLabDot = window.updateLabButton;

// ══════════════════════════════════════════════════════════
// Last Contact tracker (promoted from beta to standard)
// ══════════════════════════════════════════════════════════
window.daysSinceContact = (affiliate) => {
  if (!affiliate || !STATE.auditLog) return null;
  const entries = STATE.auditLog.filter(log =>
    (log.detail && log.detail.includes(affiliate.name)) ||
    (log.action && log.action.includes(affiliate.name))
  );
  if (!entries.length) return null;
  const parseLogTime = (t) => {
    if (!t) return null;
    const [date, time] = t.split(' ');
    const [d, m, y] = date.split('/');
    return new Date(`${y}-${m}-${d}T${time || '00:00:00'}`);
  };
  const dates = entries.map(e => parseLogTime(e.time)).filter(d => d && !isNaN(d));
  if (!dates.length) return null;
  const latest = new Date(Math.max(...dates.map(d => d.getTime())));
  const diff = Math.floor((new Date() - latest) / (1000 * 60 * 60 * 24));
  return diff;
};

window.lastContactHTML = (affiliate) => {
  const days = daysSinceContact(affiliate);
  if (days === null) {
    return `<div class="last-contact lc-never" title="Nenhuma atividade registrada no log"><i data-lucide="clock"></i> Sem interações</div>`;
  }
  const cls = days <= 7 ? 'lc-ok' : days <= 14 ? 'lc-warn' : 'lc-danger';
  const label = days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
  return `<div class="last-contact ${cls}" title="Última interação registrada"><i data-lucide="clock"></i> Última interação ${label}</div>`;
};

// ══════════════════════════════════════════════════════════
// ACTIVITY TIMELINE (beta feature: activity_timeline)
// ══════════════════════════════════════════════════════════
// Structured log of interactions per affiliate. Stored in
// STATE.activities[] — independent of audit log so it can be edited
// or deleted without violating the immutable audit chain.
// Each entry: { id, affiliateId, type, subject, body, createdAt, createdBy }
// Types: call | email | meeting | note | whatsapp

const ACTIVITY_TYPES = {
  call:     { label: 'Ligação',  icon: 'phone',            color: 'var(--blue)' },
  meeting:  { label: 'Reunião',  icon: 'users',            color: 'var(--purple)' },
  email:    { label: 'Email',    icon: 'mail',             color: 'var(--amber)' },
  whatsapp: { label: 'WhatsApp', icon: 'message-circle',   color: 'var(--green)' },
  note:     { label: 'Nota',     icon: 'sticky-note',      color: 'var(--text2)' },
};
window.ACTIVITY_TYPES = ACTIVITY_TYPES;

window.openAddActivity = (affiliateId, presetType = 'note') => {
  if (!isBetaEnabled('activity_timeline')) return toast('Ative Timeline de atividades em Configurações > Beta', 'w');
  const aff = STATE.affiliates.find(a => a.id === affiliateId);
  if (!aff) return;
  const typeOpts = Object.entries(ACTIVITY_TYPES).map(([k, v]) =>
    `<button type="button" class="act-type-btn ${k === presetType ? 'on' : ''}" data-type="${k}" onclick="_selectActivityType('${k}',this)">
      <i data-lucide="${v.icon}"></i> ${v.label}
    </button>`).join('');
  openModal(`Nova atividade · ${aff.name}`, `
    <div class="fg">
      <div class="fgp"><label>Tipo</label>
        <div class="act-type-row" id="act-type-row">${typeOpts}</div>
        <input type="hidden" id="act-type" value="${presetType}">
      </div>
      <div class="fgp"><label>Assunto</label>
        <input class="fi" id="act-subject" placeholder="Ex.: Negociação CPA Q2" autofocus>
      </div>
      <div class="fgp"><label>Descrição</label>
        <textarea class="fi" id="act-body" rows="4" placeholder="O que foi discutido, próximos passos, decisões..."></textarea>
      </div>
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-theme" onclick="saveActivity('${affiliateId}')"><i data-lucide="check"></i> Registrar</button>`);
  lucide.createIcons();
};

window._selectActivityType = (type, btn) => {
  document.getElementById('act-type').value = type;
  btn.closest('.act-type-row')?.querySelectorAll('.act-type-btn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
};

window.saveActivity = (affiliateId) => {
  const type = document.getElementById('act-type')?.value || 'note';
  const subject = document.getElementById('act-subject')?.value?.trim();
  const body = document.getElementById('act-body')?.value?.trim();
  if (!subject) return toast('Assunto obrigatório', 'e');
  if (!STATE.activities) STATE.activities = [];
  STATE.activities.unshift({
    id: 'act' + Date.now(),
    affiliateId,
    type,
    subject,
    body: body || '',
    createdAt: new Date().toISOString(),
    createdBy: STATE.user?.name || 'Sistema',
  });
  const aff = STATE.affiliates.find(a => a.id === affiliateId);
  logAction(`${ACTIVITY_TYPES[type]?.label || 'Atividade'} registrada`, aff?.name || '');
  saveToLocal();
  closeModal();
  // If the affiliate detail modal is open, re-render it so the new activity shows
  if (typeof openAffDetail === 'function' && document.getElementById('modal-ov')?.classList.contains('open') === false) {
    // modal already closed; nothing else to do
  } else if (typeof openAffDetail === 'function') {
    setTimeout(() => openAffDetail(affiliateId), 200);
  }
  toast('Atividade registrada', 's');
};

window.deleteActivity = (activityId) => {
  const idx = (STATE.activities || []).findIndex(a => a.id === activityId);
  if (idx < 0) return;
  const affId = STATE.activities[idx].affiliateId;
  if (!confirm('Remover esta atividade?')) return;
  STATE.activities.splice(idx, 1);
  saveToLocal();
  if (typeof openAffDetail === 'function') setTimeout(() => openAffDetail(affId), 100);
  toast('Atividade removida');
};

// Renders the timeline HTML for a given affiliate. Returns empty string if
// the beta feature is off, so the existing audit-based history shows instead.
window.renderActivityTimeline = (affiliateId) => {
  if (!isBetaEnabled('activity_timeline')) return '';
  const activities = (STATE.activities || []).filter(a => a.affiliateId === affiliateId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const quickAdd = Object.entries(ACTIVITY_TYPES).map(([k, v]) =>
    `<button class="btn btn-outline" onclick="openAddActivity('${affiliateId}','${k}')" style="flex:1;padding:8px 10px;font-size:11px">
      <i data-lucide="${v.icon}" style="width:12px;height:12px"></i> ${v.label}
    </button>`).join('');
  const entries = activities.length
    ? activities.map(a => {
        const meta = ACTIVITY_TYPES[a.type] || ACTIVITY_TYPES.note;
        const d = new Date(a.createdAt);
        const when = d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
        return `<div class="activity-item">
          <div class="activity-dot" style="background:color-mix(in srgb, ${meta.color} 14%, transparent);border:1px solid color-mix(in srgb, ${meta.color} 35%, transparent)">
            <i data-lucide="${meta.icon}" style="width:14px;height:14px;stroke:${meta.color}"></i>
          </div>
          <div class="activity-body">
            <div class="activity-hdr">
              <span class="activity-type" style="color:${meta.color}">${meta.label}</span>
              <span class="activity-subject">${escapeActHtml(a.subject)}</span>
              <button class="ibt" onclick="deleteActivity('${a.id}')" title="Remover"><i data-lucide="trash-2" style="width:11px;height:11px"></i></button>
            </div>
            ${a.body ? `<div class="activity-text">${escapeActHtml(a.body).replace(/\n/g,'<br>')}</div>` : ''}
            <div class="activity-meta">${a.createdBy || 'Sistema'} · ${when}</div>
          </div>
        </div>`;
      }).join('')
    : '<div style="font-size:11px;color:var(--text3);padding:12px 0;text-align:center">Nenhuma atividade registrada ainda.</div>';

  return `<div class="activity-timeline-wrap">
    <div class="activity-quick-add">${quickAdd}</div>
    <div class="activity-list">${entries}</div>
  </div>`;
};

function escapeActHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

