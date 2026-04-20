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
  if (Array.isArray(saved)) return saved.filter(id => HUB_WIDGETS.some(w => w.id === id));
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

// ── MOUNTING ──────────────────────────────────────────────

window.buildHubWidgets = () => {
  const wrap = document.getElementById('hub-widgets');
  if (!wrap) return;
  const active = _activeWidgets();
  if (!active.length) { wrap.innerHTML = ''; return; }
  const renderMap = {
    notifications: _widgetNotifications,
    payments_queue: _widgetPaymentsQueue,
    tasks: _widgetTasks,
    results: _widgetResults,
    top_affiliates: _widgetTopAffiliates,
    pipeline_status: _widgetPipelineStatus,
    recent_activity: _widgetRecentActivity,
  };
  wrap.innerHTML = active.map(id => {
    const fn = renderMap[id];
    return fn ? fn() : '';
  }).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

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
