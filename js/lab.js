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
  if (on) toast('Modo Beta ativado — aguardando novos recursos', 'i');
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

// ══════════════════════════════════════════════════════════
// Smart Lists (promoted from beta to standard)
// ══════════════════════════════════════════════════════════
window.SMART_LISTS = [
  { key: 'topComm', name: 'Top 10 Comissão', icon: 'trophy', color: '#f59e0b',
    desc: 'Os 10 maiores em comissão acumulada',
    compute: (list) => [...list].sort((a, b) => (b.commission || 0) - (a.commission || 0)).slice(0, 10) },

  { key: 'atRisk', name: 'Em Risco', icon: 'alert-triangle', color: '#ef4444',
    desc: 'Sem atividade há 14+ dias ou Net Rev negativo',
    compute: (list) => list.filter(a => {
      const days = daysSinceContact(a);
      return (days !== null && days >= 14) || (a.netRev || 0) < 0;
    }) },

  { key: 'newNoClose', name: 'Novos sem Fechamento', icon: 'user-plus', color: '#3b82f6',
    desc: 'Criados recentemente e ainda sem fechamento',
    compute: (list) => list.filter(a => {
      const hasClose = (STATE.closings || []).some(c => c.affiliateId === a.id);
      return !hasClose;
    }) },

  { key: 'staleContact', name: 'Sem Contato 30+d', icon: 'clock', color: '#94a3b8',
    desc: 'Nenhuma atividade há mais de 30 dias',
    compute: (list) => list.filter(a => {
      const days = daysSinceContact(a);
      return days !== null && days >= 30;
    }) },

  { key: 'topProfit', name: 'Top Lucro 3C', icon: 'trending-up', color: '#10b981',
    desc: 'Os 10 maiores em lucro pra 3C',
    compute: (list) => [...list].sort((a, b) => (b.profit || 0) - (a.profit || 0)).slice(0, 10) },
];

window.applySmartList = (key) => {
  const list = STATE.affiliates || [];
  const sl = SMART_LISTS.find(x => x.key === key);
  return sl ? sl.compute(list) : list;
};
