// ══════════════════════════════════════════════════════════
// LAB — Beta Mode (reserved for future experimental features)
// ══════════════════════════════════════════════════════════
// Previously gated: Tags, Smart Lists, Last Contact, Mono theme.
// These are now STANDARD features. Mono became a theme option
// under Settings. This file keeps the framework alive for the
// next wave of experiments (AI Copilot, Automations, Forecast...).
// ══════════════════════════════════════════════════════════

// Features that used to be beta are now always on.
const isLab = (_feature) => true;
window.isLab = isLab;

// No badge next to feature headers anymore (features are stable).
const labBadge = () => '';
window.labBadge = labBadge;

window.toggleBetaMode = () => {
  STATE.betaMode = !STATE.betaMode;
  const on = STATE.betaMode;
  logAction(`[BETA] Modo Beta ${on ? 'ATIVADO' : 'DESATIVADO'}`, '');
  saveToLocal();
  updateLabButton();
  if (window.updateCopilotVisibility) updateCopilotVisibility();
  // Refresh active module so the beta banner shows/hides
  if (window.refreshActiveModule) refreshActiveModule();
  if (on) toast('Modo Beta ativado — 3C Copilot disponível no canto inferior direito', 's');
  else toast('Modo Beta desativado', 'i');
};

window.updateLabButton = () => {
  const on = STATE.betaMode === true;
  document.querySelectorAll('.beta-btn').forEach(btn => {
    if (on) btn.classList.add('active');
    else btn.classList.remove('active');
    btn.setAttribute('title', on
      ? 'Modo Beta ATIVO — clique para desativar'
      : 'Modo Beta — recursos experimentais. Clique para ativar.');
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
    return `<div class="last-contact lc-never" title="Nenhuma atividade registrada"><i data-lucide="clock"></i> Sem contato</div>`;
  }
  const cls = days <= 7 ? 'lc-ok' : days <= 14 ? 'lc-warn' : 'lc-danger';
  const label = days === 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`;
  return `<div class="last-contact ${cls}" title="Último registro no audit log"><i data-lucide="clock"></i> ${label}</div>`;
};

