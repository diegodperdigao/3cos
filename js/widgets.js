// ══════════════════════════════════════════════════════════
// HUB WIDGETS
// ══════════════════════════════════════════════════════════
// Customizable dashboard tiles on the Hub. Each widget reads a slice of
// STATE and renders a compact card. User picks which ones to show via
// "Personalizar widgets" modal.
// ══════════════════════════════════════════════════════════

const HUB_WIDGETS = [
  { id: 'notifications', name: 'Notificações', icon: 'bell', desc: 'Últimas notificações do sistema' },
  { id: 'payments_queue', name: 'Fila de pagamentos', icon: 'banknote', desc: 'Vencidos, atrasados e a processar' },
  { id: 'tasks', name: 'Minhas tarefas', icon: 'check-square', desc: 'Pendentes e em andamento' },
  { id: 'results', name: 'Resultado do mês', icon: 'trending-up', desc: 'QFTDs, receita e lucro 3C no período' },
  { id: 'top_affiliates', name: 'Top afiliados', icon: 'award', desc: '5 melhores por lucro 3C' },
  { id: 'pipeline_status', name: 'Pipeline', icon: 'git-branch', desc: 'Kanban compacto de negociações' },
  { id: 'recent_activity', name: 'Atividade recente', icon: 'activity', desc: 'Últimas ações no sistema' },
];
window.HUB_WIDGETS = HUB_WIDGETS;

const DEFAULT_HUB_WIDGETS = ['results', 'payments_queue', 'tasks', 'notifications'];

function _activeWidgets() {
  const saved = STATE.settings?.hubWidgets;
  // Empty saved list means "user never customised" — show defaults, not blank.
  // Only treat as intentional hide if user saved with 0 selected AND we flagged it.
  if (Array.isArray(saved) && saved.length > 0) {
    return saved.filter(id => HUB_WIDGETS.some(w => w.id === id));
  }
  return DEFAULT_HUB_WIDGETS;
}

// ── WIDGET RENDERERS ──────────────────────────────────────

function _widgetNotifications() {
  const notifs = (STATE.notifications || []).slice(0, 4);
  if (!notifs.length) {
    return _widgetShell('notifications', 'Notificações', 'bell',
      '<div class="hw-empty">Nada novo por aqui.</div>');
  }
  const items = notifs.map(n => `
    <div class="hw-notif-item">
      <div class="hw-notif-dot" style="background:var(--${n.type || 'theme'})"></div>
      <div class="hw-notif-body">
        <div class="hw-notif-text">${n.text || ''}</div>
        <div class="hw-notif-time">${n.time || ''}</div>
      </div>
    </div>`).join('');
  return _widgetShell('notifications', 'Notificações', 'bell', items,
    `<button class="hw-cta" onclick="event.stopPropagation();toggleActionCenter()">Ver todas</button>`);
}

function _widgetPaymentsQueue() {
  const byStatus = {};
  (STATE.payments || []).forEach(p => {
    const cs = typeof computePaymentStatus === 'function' ? computePaymentStatus(p) : p.status;
    if (!byStatus[cs]) byStatus[cs] = { count: 0, total: 0 };
    byStatus[cs].count++;
    byStatus[cs].total += (p.amount || 0);
  });
  const overdue = byStatus.vencido || { count: 0, total: 0 };
  const late = byStatus.atrasado || { count: 0, total: 0 };
  const pending = byStatus.pendente || { count: 0, total: 0 };
  const paid = byStatus.pago || { count: 0, total: 0 };

  const body = `
    <div class="hw-stat-row"><span class="hw-stat-lbl" style="color:var(--red)">Vencidos</span>
      <span class="hw-stat-val">${overdue.count} · ${fc(overdue.total)}</span></div>
    <div class="hw-stat-row"><span class="hw-stat-lbl" style="color:var(--amber)">Em atraso</span>
      <span class="hw-stat-val">${late.count} · ${fc(late.total)}</span></div>
    <div class="hw-stat-row"><span class="hw-stat-lbl" style="color:var(--text2)">Pendentes</span>
      <span class="hw-stat-val">${pending.count} · ${fc(pending.total)}</span></div>
    <div class="hw-stat-row"><span class="hw-stat-lbl" style="color:var(--green)">Pagos (mês)</span>
      <span class="hw-stat-val">${paid.count} · ${fc(paid.total)}</span></div>`;
  return _widgetShell('payments_queue', 'Fila de pagamentos', 'banknote', body,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('payments')">Abrir financeiro</button>`);
}

function _widgetTasks() {
  const open = (STATE.tasks || []).filter(t => t.status !== 'concluída').slice(0, 4);
  if (!open.length) {
    return _widgetShell('tasks', 'Minhas tarefas', 'check-square',
      '<div class="hw-empty">Tudo em dia. 🎯</div>',
      `<button class="hw-cta" onclick="event.stopPropagation();openMod('tasks')">Nova tarefa</button>`);
  }
  const items = open.map(t => `
    <div class="hw-task-item">
      <div class="hw-task-dot hw-pri-${(t.priority||'m')[0]}"></div>
      <div class="hw-task-body">
        <div class="hw-task-title">${t.title || ''}</div>
        <div class="hw-task-meta">${t.assignee || 'Sem responsável'}${t.dueDate ? ' · ' + new Date(t.dueDate).toLocaleDateString('pt-BR') : ''}</div>
      </div>
    </div>`).join('');
  return _widgetShell('tasks', 'Minhas tarefas', 'check-square', items,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('tasks')">Abrir todas (${open.length})</button>`);
}

function _widgetResults() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthReps = (STATE.reports || []).filter(r => (r.date || '').startsWith(monthKey));
  let ftd = 0, qftd = 0, rev = 0;
  monthReps.forEach(r => {
    ftd += r.ftd || 0;
    qftd += typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((s, v) => s + (v || 0), 0) : (r.qftd || 0);
    rev += r.netRev || 0;
  });
  // Fallback: if no reports this month, show all-time rollup
  const usingFallback = monthReps.length === 0;
  if (usingFallback) {
    STATE.affiliates.forEach(a => {
      ftd += a.ftds || 0; qftd += a.qftds || 0; rev += a.netRev || 0;
    });
  }
  const label = usingFallback ? 'Total acumulado' : now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const body = `
    <div class="hw-results-big">
      <div class="hw-big-val">${qftd}</div>
      <div class="hw-big-lbl">QFTDs · ${label}</div>
    </div>
    <div class="hw-stat-row"><span class="hw-stat-lbl">FTDs</span><span class="hw-stat-val">${ftd}</span></div>
    <div class="hw-stat-row"><span class="hw-stat-lbl">Net Revenue</span><span class="hw-stat-val">${fc(rev)}</span></div>`;
  return _widgetShell('results', usingFallback ? 'Resultado consolidado' : 'Resultado do mês', 'trending-up', body,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('dashboard')">Ver dashboard</button>`);
}

function _widgetTopAffiliates() {
  const top = [...(STATE.affiliates || [])]
    .filter(a => (a.profit || 0) > 0)
    .sort((a, b) => (b.profit || 0) - (a.profit || 0))
    .slice(0, 5);
  if (!top.length) {
    return _widgetShell('top_affiliates', 'Top afiliados', 'award',
      '<div class="hw-empty">Ainda não há dados de lucro.</div>');
  }
  const items = top.map((a, i) => `
    <div class="hw-top-item">
      <div class="hw-top-rank">${i + 1}</div>
      <div class="hw-top-name">${a.name}</div>
      <div class="hw-top-val">${fc(a.profit || 0)}</div>
    </div>`).join('');
  return _widgetShell('top_affiliates', 'Top afiliados · Lucro 3C', 'award', items,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('affiliates')">Ver todos</button>`);
}

function _widgetPipelineStatus() {
  const stages = STATE.pipeline?.stages || [];
  const cards = STATE.pipeline?.cards || [];
  if (!stages.length || !cards.length) {
    return _widgetShell('pipeline_status', 'Pipeline', 'git-branch',
      '<div class="hw-empty">Nenhuma negociação no funil.</div>',
      `<button class="hw-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline</button>`);
  }
  const items = stages.map(s => {
    const count = cards.filter(c => c.stageId === s.id).length;
    return `<div class="hw-stat-row">
      <span class="hw-stat-lbl"><span class="hw-stage-dot" style="background:${s.color || 'var(--text3)'}"></span>${s.name}</span>
      <span class="hw-stat-val">${count}</span>
    </div>`;
  }).join('');
  return _widgetShell('pipeline_status', 'Pipeline', 'git-branch', items,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline</button>`);
}

function _widgetRecentActivity() {
  const logs = (STATE.auditLog || []).slice(0, 4);
  if (!logs.length) {
    return _widgetShell('recent_activity', 'Atividade recente', 'activity',
      '<div class="hw-empty">Sem atividade recente.</div>');
  }
  const items = logs.map(l => `
    <div class="hw-activity-item">
      <div class="hw-activity-body">
        <div class="hw-activity-action">${l.action || ''}</div>
        <div class="hw-activity-meta">${l.user || 'Sistema'} · ${l.time || ''}</div>
      </div>
    </div>`).join('');
  return _widgetShell('recent_activity', 'Atividade recente', 'activity', items,
    `<button class="hw-cta" onclick="event.stopPropagation();openMod('audit')">Ver auditoria</button>`);
}

// Shared visual shell — keeps widgets consistent.
function _widgetShell(id, title, icon, bodyHTML, footerHTML = '') {
  return `<div class="hub-widget" data-wid="${id}">
    <div class="hw-hdr">
      <i data-lucide="${icon}"></i>
      <span class="hw-title">${title}</span>
    </div>
    <div class="hw-body">${bodyHTML}</div>
    ${footerHTML ? `<div class="hw-ftr">${footerHTML}</div>` : ''}
  </div>`;
}

// ── MOUNTING (compact KPI strip) ──────────────────────────
// Renders the active widgets as a row of small KPI tiles (max 3 visible)
// with an "Add widget" dashed placeholder if the user has room for more.

window.buildHubWidgets = () => {
  const wrap = document.getElementById('hub-widget-strip');
  if (!wrap) return;
  const active = _activeWidgets().slice(0, 3);
  const renderMap = {
    notifications: _kpiNotifications,
    payments_queue: _kpiPaymentsQueue,
    tasks: _kpiTasks,
    results: _kpiResults,
    top_affiliates: _kpiTopAffiliates,
    pipeline_status: _kpiPipelineStatus,
    recent_activity: _kpiRecentActivity,
  };
  const tiles = active.map(id => {
    const fn = renderMap[id];
    return fn ? fn() : '';
  }).filter(Boolean);
  // Add a dashed "add widget" tile if fewer than 3 active
  if (tiles.length < 3) {
    tiles.push(`<button class="hw-tile hw-tile-add" onclick="openHubWidgetPicker()">
      <i data-lucide="plus"></i><span>Adicionar widget</span>
    </button>`);
  }
  wrap.innerHTML = tiles.join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// Compact KPI renderers — single metric, eyebrow label, optional delta/detail rows
function _kpiTile(icon, eyebrow, value, delta, sub, onClick, detailRows, accentColor) {
  const click = onClick ? ` onclick="event.stopPropagation();${onClick}"` : '';
  const accent = accentColor ? ` style="--tile-accent:${accentColor}"` : '';
  const details = detailRows ? `<div class="hw-tile-details">${detailRows}</div>` : '';
  return `<div class="hw-tile"${click}${accent}>
    <div class="hw-tile-head">
      <span class="hw-tile-icon"><i data-lucide="${icon}"></i></span>
      <span class="hw-tile-eyebrow">${eyebrow}</span>
    </div>
    <div class="hw-tile-value">${value}</div>
    ${delta ? `<div class="hw-tile-delta ${delta.positive ? 'pos' : 'neg'}">${delta.positive ? '↑' : '↓'} ${delta.text}</div>` : ''}
    ${sub ? `<div class="hw-tile-sub">${sub}</div>` : ''}
    ${details}
  </div>`;
}

function _kpiResults() {
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastKey = now.getMonth() === 0
    ? `${now.getFullYear()-1}-12`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
  const monthReps = (STATE.reports || []).filter(r => (r.date || '').startsWith(monthKey));
  const lastReps = (STATE.reports || []).filter(r => (r.date || '').startsWith(lastKey));
  let rev = 0, lastRev = 0, qftd = 0;
  monthReps.forEach(r => { rev += r.netRev || 0; qftd += (typeof r.qftd === 'number' ? r.qftd : 0); });
  lastReps.forEach(r => { lastRev += r.netRev || 0; });
  if (!rev && !qftd) STATE.affiliates.forEach(a => { rev += a.netRev || 0; qftd += a.qftds || 0; });
  const monthLbl = now.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  const delta = lastRev > 0 ? { text: `${Math.round((rev - lastRev) / lastRev * 100)}% vs. mês anterior`, positive: rev >= lastRev } : null;
  const details = `<div class="hw-tile-detail-row"><span><i data-lucide="users" class="hw-detail-ico"></i>QFTDs</span><span>${qftd}</span></div>`;
  return _kpiTile('trending-up', `Receita · ${monthLbl}`, fc(rev), delta, null, "openMod('dashboard')", details);
}

function _kpiTasks() {
  const all = STATE.tasks || [];
  const done = all.filter(t => t.status === 'concluída').length;
  const pending = all.filter(t => t.status !== 'concluída').length;
  const urgent = all.filter(t => t.status !== 'concluída' && t.priority === 'alta').length;
  let details = '';
  const next = all.filter(t => t.status !== 'concluída').sort((a,b) => {
    const pa = {alta:0,média:1,baixa:2}; return (pa[a.priority]||2) - (pa[b.priority]||2);
  }).slice(0, 2);
  if (next.length) {
    details = next.map(t => {
      const ico = t.priority === 'alta' ? 'flame' : t.priority === 'média' ? 'clock' : 'circle';
      const color = t.priority === 'alta' ? 'var(--red)' : t.priority === 'média' ? 'var(--amber)' : 'var(--green)';
      return `<div class="hw-tile-detail-row"><span><i data-lucide="${ico}" class="hw-detail-ico" style="stroke:${color}"></i>${t.title.length > 26 ? t.title.slice(0,26)+'…' : t.title}</span></div>`;
    }).join('');
  }
  const accent = urgent > 0 ? 'var(--red)' : undefined;
  return _kpiTile('check-square', 'Tarefas', pending, null, `${done} concluídas${urgent ? ` · <strong style="color:var(--red)">${urgent} urgentes</strong>` : ''}`, "openMod('tasks')", details, accent);
}

function _kpiPaymentsQueue() {
  const payments = STATE.payments || [];
  const overdue = payments.filter(p => {
    const s = typeof computePaymentStatus === 'function' ? computePaymentStatus(p) : p.status;
    return s === 'vencido' || s === 'atrasado';
  });
  const pending = payments.filter(p => p.status === 'pendente');
  const total = payments.length;
  const overdueAmt = overdue.reduce((s, p) => s + (p.amount || 0), 0);
  let details = '';
  if (overdue.length) {
    details = overdue.slice(0, 2).map(p =>
      `<div class="hw-tile-detail-row warn"><span><i data-lucide="alert-circle" class="hw-detail-ico"></i>${(p.affiliate || '').split(' ')[0]} · ${p.brand}</span><span>${fc(p.amount || 0)}</span></div>`
    ).join('');
  } else if (pending.length) {
    details = `<div class="hw-tile-detail-row"><span><i data-lucide="clock" class="hw-detail-ico"></i>${pending.length} pendentes</span><span>${fc(pending.reduce((s,p)=>s+(p.amount||0),0))}</span></div>`;
  }
  const delta = overdue.length ? { text: `${fc(overdueAmt)} em atraso`, positive: false } : null;
  const accent = overdue.length ? 'var(--red)' : undefined;
  return _kpiTile('banknote', 'Pagamentos', total, delta, overdue.length ? null : 'Nenhum em atraso', "openMod('payments')", details, accent);
}

function _kpiNotifications() {
  const all = STATE.notifications || [];
  const unread = all.filter(n => !n.read);
  const count = unread.length;
  let details = '';
  const preview = (count > 0 ? unread : all).slice(0, 2);
  if (preview.length) {
    details = preview.map(n => {
      const ico = n.type === 'red' ? 'alert-triangle' : n.type === 'amber' ? 'alert-circle' : n.type === 'green' ? 'check-circle' : 'info';
      const color = `var(--${n.type || 'theme'})`;
      const text = n.text.length > 34 ? n.text.slice(0, 34) + '…' : n.text;
      return `<div class="hw-tile-detail-row"><span><i data-lucide="${ico}" class="hw-detail-ico" style="stroke:${color}"></i>${text}</span></div>`;
    }).join('');
  }
  const accent = count > 0 ? 'var(--amber)' : undefined;
  return _kpiTile('bell', 'Notificações', count, null, count ? `${count} não lidas` : 'Tudo em dia', 'toggleActionCenter()', details, accent);
}

function _kpiTopAffiliates() {
  const sorted = [...(STATE.affiliates || [])].sort((a, b) => (b.profit || 0) - (a.profit || 0));
  const top = sorted[0];
  let details = '';
  if (sorted.length > 1) {
    const medals = ['crown', 'medal', 'award'];
    details = sorted.slice(0, 3).map((a, i) =>
      `<div class="hw-tile-detail-row"><span><i data-lucide="${medals[i]}" class="hw-detail-ico" style="stroke:${i===0?'var(--amber)':i===1?'var(--text2)':'var(--text3)'}"></i>${a.name.split(' ')[0]}</span><span>${fc(a.profit || 0)}</span></div>`
    ).join('');
  }
  return _kpiTile('trophy', 'Top Afiliados', top ? top.name.split(' ')[0] : '—', null, top ? fc(top.profit || 0) + ' lucro' : 'Sem dados', "openMod('affiliates')", details);
}

function _kpiPipelineStatus() {
  const cards = STATE.pipeline?.cards || [];
  const stages = STATE.pipeline?.stages || [];
  const total = cards.length;
  let details = '';
  if (stages.length && cards.length) {
    details = stages.filter(s => cards.some(c => c.stageId === s.id)).slice(0, 3).map(s => {
      const n = cards.filter(c => c.stageId === s.id).length;
      return `<div class="hw-tile-detail-row"><span><i data-lucide="circle" class="hw-detail-ico" style="stroke:${s.color || 'var(--text3)'};fill:${s.color || 'var(--text3)'}"></i>${s.name}</span><span>${n}</span></div>`;
    }).join('');
  }
  return _kpiTile('git-branch', 'Pipeline', total, null, `${total} negociações`, "openMod('pipeline')", details);
}

function _kpiRecentActivity() {
  const logs = STATE.auditLog || [];
  const count = logs.length;
  let details = '';
  if (logs.length) {
    details = logs.slice(0, 2).map(l =>
      `<div class="hw-tile-detail-row"><span><i data-lucide="zap" class="hw-detail-ico"></i>${(l.action || '').length > 28 ? l.action.slice(0,28)+'…' : l.action}</span></div>`
    ).join('');
  }
  return _kpiTile('activity', 'Atividade', count, null, 'Registros recentes', "openMod('audit')", details);
}

// ── PICKER MODAL ──────────────────────────────────────────

window.openHubWidgetPicker = () => {
  const active = new Set(_activeWidgets());
  const rows = HUB_WIDGETS.map(w => {
    const checked = active.has(w.id);
    return `<label class="hwp-row">
      <input type="checkbox" class="hwp-check" value="${w.id}" ${checked ? 'checked' : ''}>
      <div class="hwp-icon"><i data-lucide="${w.icon}"></i></div>
      <div class="hwp-body">
        <div class="hwp-name">${w.name}</div>
        <div class="hwp-desc">${w.desc}</div>
      </div>
    </label>`;
  }).join('');

  openModal('Personalizar widgets do hub', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.5">
      Escolha quais widgets aparecem no seu hub principal. A ordem de exibição segue a ordem marcada abaixo.
    </div>
    <div class="hwp-list">${rows}</div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
     <button class="btn btn-theme" onclick="_saveHubWidgets()"><i data-lucide="check"></i> Salvar</button>`);
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window._saveHubWidgets = () => {
  const selected = [...document.querySelectorAll('.hwp-check:checked')].map(c => c.value);
  if (!STATE.settings) STATE.settings = {};
  STATE.settings.hubWidgets = selected;
  saveToLocal();
  closeModal();
  buildHubWidgets();
  toast('Widgets atualizados', 's');
};
