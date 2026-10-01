// ══════════════════════════════════════════════════════════
// HUB WIDGETS — Nova geração (CRM Comercial)
// ══════════════════════════════════════════════════════════
// Widgets reimaginados para o contexto comercial do CRM:
//   - focus_today: tarefas + contatos quentes + cards parados em 1 card
//   - hot_pipeline: top 3 deals por probabilidade × valor com mini barras
//   - momentum: sparkline de deals criados por semana + delta
//   - health_check: distribuição visual do pipeline (barras empilhadas B2B+B2C)
//   - wishlist_pulse: contagem de contatos por temperatura com dots
//   - recent_activity: últimas 5 atividades do CRM
//   - notifications: alertas do sistema (mantido do anterior)
//
// Cada widget expõe uma visualização ou lista acionável, não apenas um
// número solto. Clique abre o módulo correspondente com contexto.
// ══════════════════════════════════════════════════════════

const HUB_WIDGETS = [
  { id: 'revenue',         name: 'Receita',           icon: 'banknote',    desc: 'Receita do mês + delta vs anterior com sparkline 8 semanas' },
  { id: 'forecast',        name: 'Forecast mensal',   icon: 'line-chart',  desc: 'Projeção de receita dos próximos 3 meses (valor × probabilidade)' },
  { id: 'focus_today',     name: 'Foco de hoje',      icon: 'target',      desc: 'Tarefas urgentes + contatos quentes + cards parados' },
  { id: 'hot_pipeline',    name: 'Pipeline quente',   icon: 'flame',       desc: 'Top negociações por probabilidade × valor' },
  { id: 'health_check',    name: 'Saúde do pipeline', icon: 'activity',    desc: 'Distribuição de cards por etapa (B2B + B2C)' },
  { id: 'conversion',      name: 'Taxa de conversão', icon: 'percent',     desc: 'Prospects → clientes (90 dias)' },
  { id: 'new_prospects',   name: 'Novos prospects',   icon: 'user-plus',   desc: 'Contatos adicionados nos últimos 7 dias por origem' },
  { id: 'momentum',        name: 'Momentum',          icon: 'trending-up', desc: 'Velocidade de criação de deals por semana' },
  { id: 'wishlist_pulse',  name: 'Pulso da wishlist', icon: 'users',       desc: 'Contatos agrupados por temperatura' },
  { id: 'recent_activity', name: 'Atividade recente', icon: 'history',     desc: 'Últimas ações no CRM' },
  { id: 'notifications',   name: 'Notificações',      icon: 'bell',        desc: 'Alertas do sistema' },
];
window.HUB_WIDGETS = HUB_WIDGETS;

const DEFAULT_HUB_WIDGETS = ['revenue', 'focus_today', 'hot_pipeline', 'health_check'];

function _activeWidgets() {
  const saved = STATE.settings?.hubWidgets;
  if (Array.isArray(saved) && saved.length > 0) {
    const filtered = saved.filter(id => HUB_WIDGETS.some(w => w.id === id));
    // Se o filtered perdeu quase tudo (preferências antigas de widgets que
    // não existem mais), caímos nos defaults em vez de mostrar só 1 widget.
    if (filtered.length >= 2) return filtered;
  }
  return DEFAULT_HUB_WIDGETS;
}

// Shell compartilhado: header + body + optional footer
function _shell(id, title, icon, bodyHTML, footerHTML, size = 'default', accent = '') {
  const sizeClass = size === 'wide' ? 'hw2-wide' : size === 'tall' ? 'hw2-tall' : '';
  const style = accent ? `style="--hw2-accent:${accent}"` : '';
  return `<article class="hw2 ${sizeClass}" data-wid="${id}" ${style}>
    <header class="hw2-hdr">
      <span class="hw2-icon"><i data-lucide="${icon}"></i></span>
      <span class="hw2-title">${title}</span>
    </header>
    <div class="hw2-body">${bodyHTML}</div>
    ${footerHTML ? `<footer class="hw2-ftr">${footerHTML}</footer>` : ''}
  </article>`;
}

// ── 1. FOCUS TODAY ────────────────────────────────────────
function _wFocusToday() {
  const tasks = (STATE.tasks || []).filter(t => t.status !== 'concluída').slice(0, 2);
  const hotContacts = (STATE.crm?.contacts || [])
    .filter(c => c.temperature === 'hot' || c.temperature === 'ready')
    .slice(0, 2);
  // Cards parados: criados há mais de 7 dias sem movimentação (updated_at)
  const now = Date.now();
  const stuckCards = (STATE.crm?.cards || [])
    .filter(c => now - new Date(c.updated_at).getTime() > 7 * 86400000)
    .slice(0, 2);

  const hasAnything = tasks.length || hotContacts.length || stuckCards.length;
  if (!hasAnything) {
    return _shell('focus_today', 'Foco de hoje', 'target',
      `<div class="hw2-empty">
        <span class="hw2-empty-emoji">✨</span>
        <p>Tudo em dia. Hora de prospectar?</p>
      </div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('contacts')">Abrir contatos →</button>`,
      'default', 'var(--amber)');
  }

  let items = '';
  if (hotContacts.length) {
    items += hotContacts.map(c => `
      <div class="hw2-item" onclick="openMod('contacts')">
        <span class="hw2-item-dot" style="background:#ef4444"></span>
        <span class="hw2-item-text"><strong>${_esc(c.name)}</strong> está pronto para o pipeline</span>
      </div>`).join('');
  }
  if (tasks.length) {
    items += tasks.map(t => {
      const col = t.priority === 'alta' ? '#ef4444' : t.priority === 'média' ? '#f59e0b' : '#10b981';
      return `<div class="hw2-item" onclick="openMod('tasks')">
        <span class="hw2-item-dot" style="background:${col}"></span>
        <span class="hw2-item-text">${_esc(t.title)}</span>
      </div>`;
    }).join('');
  }
  if (stuckCards.length) {
    items += stuckCards.map(c => `
      <div class="hw2-item" onclick="openMod('pipeline')">
        <span class="hw2-item-dot" style="background:#94a3b8"></span>
        <span class="hw2-item-text"><strong>${_esc(c.title)}</strong> parado há mais de 7 dias</span>
      </div>`).join('');
  }

  const total = tasks.length + hotContacts.length + stuckCards.length;
  return _shell('focus_today', 'Foco de hoje', 'target',
    `<div class="hw2-count">${total} ${total === 1 ? 'ação' : 'ações'}</div>
     <div class="hw2-list">${items}</div>`,
    null, 'default', 'var(--amber)');
}

// ── 2. HOT PIPELINE ───────────────────────────────────────
function _wHotPipeline() {
  const cards = (STATE.crm?.cards || [])
    .map(c => ({ ...c, score: (c.value || 0) * (c.probability || 0) / 100 }))
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (!cards.length) {
    return _shell('hot_pipeline', 'Pipeline quente', 'flame',
      `<div class="hw2-empty">
        <p>Nenhuma negociação ativa ainda.</p>
      </div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--red)');
  }

  const maxScore = Math.max(...cards.map(c => c.score));
  const items = cards.map((c, i) => {
    const contact = (STATE.crm?.contacts || []).find(x => x.id === c.contact_id);
    const widthPct = (c.score / maxScore) * 100;
    const scopeColor = c.scope === 'b2b' ? '#6366f1' : '#d946ef';
    return `<div class="hw2-bar-item" onclick="openMod('pipeline')">
      <div class="hw2-bar-row">
        <span class="hw2-bar-rank">${i + 1}</span>
        <span class="hw2-bar-label">${_esc(c.title)}</span>
        <span class="hw2-bar-value">${_fmt(c.score)}</span>
      </div>
      <div class="hw2-bar-track">
        <div class="hw2-bar-fill" style="width:${widthPct}%;background:linear-gradient(90deg, ${scopeColor}, color-mix(in srgb, ${scopeColor} 50%, var(--amber)))"></div>
      </div>
      <div class="hw2-bar-meta">
        <span>${contact?.name || '—'}</span>
        <span>${c.probability}% × ${_fmt(c.value)}</span>
      </div>
    </div>`;
  }).join('');

  return _shell('hot_pipeline', 'Pipeline quente', 'flame',
    `<div class="hw2-bar-list">${items}</div>`,
    null, 'default', 'var(--red)');
}

// ── 3. MOMENTUM (sparkline) ───────────────────────────────
function _wMomentum() {
  // Agrega cards criados por semana nas últimas 8 semanas
  const now = Date.now();
  const week = 7 * 86400000;
  const buckets = Array(8).fill(0);
  (STATE.crm?.cards || []).forEach(c => {
    const diff = now - new Date(c.created_at).getTime();
    const idx = 7 - Math.floor(diff / week);
    if (idx >= 0 && idx < 8) buckets[idx]++;
  });

  const total = buckets.reduce((s, v) => s + v, 0);
  if (total === 0) {
    return _shell('momentum', 'Momentum', 'trending-up',
      `<div class="hw2-empty">
        <p>Sem dados de velocidade ainda. Crie negociações para começar.</p>
      </div>`,
      null, 'default', 'var(--green)');
  }

  const lastWeek = buckets[7] || 0;
  const prevWeek = buckets[6] || 0;
  const delta = prevWeek > 0 ? Math.round((lastWeek - prevWeek) / prevWeek * 100) : (lastWeek > 0 ? 100 : 0);
  const positive = delta >= 0;

  // SVG sparkline
  const max = Math.max(...buckets, 1);
  const w = 240, h = 50;
  const stepX = w / (buckets.length - 1);
  const points = buckets.map((v, i) => {
    const x = i * stepX;
    const y = h - (v / max) * h * 0.9 - 4;
    return `${x},${y}`;
  }).join(' ');
  const areaPts = `0,${h} ${points} ${w},${h}`;

  return _shell('momentum', 'Momentum', 'trending-up',
    `<div class="hw2-big-row">
      <div class="hw2-big-val">${lastWeek}</div>
      <div class="hw2-big-delta ${positive ? 'pos' : 'neg'}">
        <i data-lucide="${positive ? 'arrow-up-right' : 'arrow-down-right'}"></i>
        ${positive ? '+' : ''}${delta}%
      </div>
    </div>
    <div class="hw2-big-sub">deals esta semana · vs ${prevWeek} na anterior</div>
    <svg class="hw2-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="var(--green)" stop-opacity="0.4"/>
          <stop offset="1" stop-color="var(--green)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${areaPts}" fill="url(#spark-grad)"/>
      <polyline points="${points}" fill="none" stroke="var(--green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    null, 'default', 'var(--green)');
}

// ── 4. HEALTH CHECK (stacked bars) ────────────────────────
function _wHealthCheck() {
  const cards = STATE.crm?.cards || [];
  if (!cards.length) {
    return _shell('health_check', 'Saúde do pipeline', 'activity',
      `<div class="hw2-empty">
        <p>Pipeline vazio.</p>
      </div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--purple)');
  }

  const scopes = [
    { key: 'b2b', label: 'B2B', color: '#6366f1' },
    { key: 'b2c', label: 'B2C', color: '#d946ef' },
  ];

  const rows = scopes.map(scope => {
    const scopeCards = cards.filter(c => c.scope === scope.key);
    if (!scopeCards.length) return '';
    const stages = (STATE.crm?.stages || []).filter(s => s.scope === scope.key).sort((a, b) => a.position - b.position);
    const segments = stages.map(s => {
      const count = scopeCards.filter(c => c.stage_id === s.id).length;
      const pct = (count / scopeCards.length) * 100;
      return pct > 0
        ? `<span class="hw2-seg" style="width:${pct}%;background:${s.color}" title="${_esc(s.name)}: ${count}"></span>`
        : '';
    }).join('');
    return `<div class="hw2-health-row">
      <div class="hw2-health-head">
        <span class="hw2-health-scope"><span class="hw2-health-dot" style="background:${scope.color}"></span>${scope.label}</span>
        <span class="hw2-health-count">${scopeCards.length}</span>
      </div>
      <div class="hw2-stack">${segments}</div>
    </div>`;
  }).filter(Boolean).join('');

  return _shell('health_check', 'Saúde do pipeline', 'activity',
    `<div class="hw2-health">${rows}</div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Ver em detalhe →</button>`,
    'default', 'var(--purple)');
}

// ── 5. WISHLIST PULSE ─────────────────────────────────────
function _wWishlistPulse() {
  const contacts = STATE.crm?.contacts || [];
  const buckets = { cold: 0, warm: 0, hot: 0, ready: 0 };
  contacts.forEach(c => { if (buckets[c.temperature] !== undefined) buckets[c.temperature]++; });
  const total = contacts.length;

  if (!total) {
    return _shell('wishlist_pulse', 'Pulso da wishlist', 'users',
      `<div class="hw2-empty"><p>Sem contatos ainda.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('contacts')">Adicionar contato →</button>`,
      'default', 'var(--blue)');
  }

  const temps = [
    { k: 'ready', label: 'Pronto',  color: '#10b981' },
    { k: 'hot',   label: 'Quente',  color: '#ef4444' },
    { k: 'warm',  label: 'Morno',   color: '#f59e0b' },
    { k: 'cold',  label: 'Frio',    color: '#3b82f6' },
  ];

  const dots = temps.map(t => {
    const n = buckets[t.k] || 0;
    const pct = total > 0 ? Math.round(n / total * 100) : 0;
    return `<div class="hw2-pulse-row" onclick="openMod('contacts')">
      <span class="hw2-pulse-dot" style="background:${t.color}"></span>
      <span class="hw2-pulse-label">${t.label}</span>
      <span class="hw2-pulse-bar"><span class="hw2-pulse-fill" style="width:${pct}%;background:${t.color}"></span></span>
      <span class="hw2-pulse-count">${n}</span>
    </div>`;
  }).join('');

  return _shell('wishlist_pulse', 'Pulso da wishlist', 'users',
    `<div class="hw2-big-row"><div class="hw2-big-val">${total}</div><div class="hw2-big-sub-inline">contatos</div></div>
     <div class="hw2-pulse">${dots}</div>`,
    null, 'default', 'var(--blue)');
}

// ── 6. RECENT ACTIVITY ────────────────────────────────────
function _wRecentActivity() {
  // Junta últimas atividades: criações recentes de contact + cards + tasks
  const items = [];
  (STATE.crm?.contacts || []).forEach(c => items.push({ type: 'contact', ts: new Date(c.created_at).getTime(), text: `Contato adicionado: ${c.name}`, icon: 'user-plus' }));
  (STATE.crm?.cards || []).forEach(c => items.push({ type: 'card', ts: new Date(c.created_at).getTime(), text: `Negociação criada: ${c.title}`, icon: 'git-branch' }));

  if (!items.length) {
    return _shell('recent_activity', 'Atividade recente', 'history',
      `<div class="hw2-empty"><p>Sem atividade recente.</p></div>`,
      null, 'default', 'var(--text2)');
  }

  const recent = items.sort((a, b) => b.ts - a.ts).slice(0, 5);
  const rows = recent.map(it => `
    <div class="hw2-item">
      <span class="hw2-item-ico"><i data-lucide="${it.icon}"></i></span>
      <span class="hw2-item-text">${_esc(it.text)}</span>
      <span class="hw2-item-time">${_relTime(it.ts)}</span>
    </div>`).join('');

  return _shell('recent_activity', 'Atividade recente', 'history',
    `<div class="hw2-list">${rows}</div>`,
    null, 'default', 'var(--text2)');
}

// ── 7. NOTIFICATIONS (mantida simples) ────────────────────
function _wNotifications() {
  const notifs = (STATE.notifications || []).slice(0, 4);
  if (!notifs.length) {
    return _shell('notifications', 'Notificações', 'bell',
      `<div class="hw2-empty"><p>Tudo em paz. ✨</p></div>`,
      null, 'default', 'var(--amber)');
  }
  const items = notifs.map(n => `
    <div class="hw2-item" onclick="toggleActionCenter()">
      <span class="hw2-item-dot" style="background:var(--${n.type || 'theme'})"></span>
      <span class="hw2-item-text">${_esc(n.text || '')}</span>
      <span class="hw2-item-time">${_esc(n.time || '')}</span>
    </div>`).join('');
  return _shell('notifications', 'Notificações', 'bell',
    `<div class="hw2-list">${items}</div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();toggleActionCenter()">Ver todas →</button>`,
    'default', 'var(--amber)');
}

// ── 8. REVENUE (big number + delta + sparkline semanal) ──
function _wRevenue() {
  const cards = STATE.crm?.cards || [];
  const wonCards = cards.filter(c => {
    const s = (STATE.crm?.stages || []).find(x => x.id === c.stage_id);
    const name = (s?.name || '').toLowerCase();
    return name.includes('ganho') || name === 'ativo' || (name.includes('fechado') && !name.includes('perd'));
  });

  // Receita do mês vs mês anterior
  const now = new Date();
  const curMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  const curRev = wonCards.filter(c => (c.updated_at || '').startsWith(curMonthKey)).reduce((s, c) => s + (Number(c.value) || 0), 0);
  const prevRev = wonCards.filter(c => (c.updated_at || '').startsWith(prevMonthKey)).reduce((s, c) => s + (Number(c.value) || 0), 0);
  const delta = prevRev > 0 ? Math.round((curRev - prevRev) / prevRev * 100) : (curRev > 0 ? 100 : 0);
  const positive = delta >= 0;

  if (!wonCards.length) {
    return _shell('revenue', 'Receita', 'banknote',
      `<div class="hw2-empty"><p>Sem deals fechados ainda.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--green)');
  }

  // Sparkline das últimas 8 semanas (receita por semana)
  const week = 7 * 86400000;
  const buckets = Array(8).fill(0);
  wonCards.forEach(c => {
    const diff = Date.now() - new Date(c.updated_at).getTime();
    const idx = 7 - Math.floor(diff / week);
    if (idx >= 0 && idx < 8) buckets[idx] += (Number(c.value) || 0);
  });
  const max = Math.max(...buckets, 1);
  const w = 240, h = 42;
  const stepX = w / (buckets.length - 1);
  const points = buckets.map((v, i) => `${i * stepX},${h - (v / max) * h * 0.9 - 3}`).join(' ');
  const area = `0,${h} ${points} ${w},${h}`;

  return _shell('revenue', 'Receita', 'banknote',
    `<div class="hw2-big-row">
      <div class="hw2-big-val">${_fmt(curRev)}</div>
      <div class="hw2-big-delta ${positive ? 'pos' : 'neg'}">
        <i data-lucide="${positive ? 'arrow-up-right' : 'arrow-down-right'}"></i>
        ${positive ? '+' : ''}${delta}%
      </div>
    </div>
    <div class="hw2-big-sub">neste mês · vs ${_fmt(prevRev)} anterior</div>
    <svg class="hw2-spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="rev-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stop-color="#10b981" stop-opacity="0.4"/>
          <stop offset="1" stop-color="#10b981" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <polygon points="${area}" fill="url(#rev-grad)"/>
      <polyline points="${points}" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('dashboard')">Ver dashboard →</button>`,
    'default', 'var(--green)');
}

// ── 9. CONVERSION RATE ────────────────────────────────────
function _wConversion() {
  const contacts = STATE.crm?.contacts || [];
  const total = contacts.filter(c => c.status !== 'churned').length;
  const customers = contacts.filter(c => c.status === 'customer').length;
  const pct = total > 0 ? Math.round(customers / total * 100) : 0;

  if (!total) {
    return _shell('conversion', 'Taxa de conversão', 'percent',
      `<div class="hw2-empty"><p>Sem contatos ainda.</p></div>`,
      null, 'default', 'var(--amber)');
  }

  const circumference = 2 * Math.PI * 36;
  const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;

  return _shell('conversion', 'Taxa de conversão', 'percent',
    `<div style="display:flex;align-items:center;gap:14px">
      <svg viewBox="0 0 96 96" style="width:84px;height:84px;flex-shrink:0;transform:rotate(-90deg)">
        <circle cx="48" cy="48" r="36" fill="none" stroke="var(--bg3)" stroke-width="8"/>
        <circle cx="48" cy="48" r="36" fill="none" stroke="var(--amber)" stroke-width="8"
                stroke-dasharray="${strokeDasharray}" stroke-linecap="round"/>
      </svg>
      <div style="flex:1">
        <div class="hw2-big-val">${pct}%</div>
        <div class="hw2-big-sub">${customers} de ${total} contatos</div>
      </div>
    </div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('contacts')">Abrir contatos →</button>`,
    'default', 'var(--amber)');
}

// ── 10. NEW PROSPECTS (últimos 7 dias por fonte) ─────────
function _wNewProspects() {
  const contacts = STATE.crm?.contacts || [];
  const now = Date.now();
  const recent = contacts.filter(c => (now - new Date(c.created_at).getTime()) < 7 * 86400000);

  if (!recent.length) {
    return _shell('new_prospects', 'Novos prospects', 'user-plus',
      `<div class="hw2-empty"><p>Nenhum contato novo esta semana.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('contacts')">Adicionar →</button>`,
      'default', 'var(--blue)');
  }

  const sources = {};
  recent.forEach(c => { const s = c.source || 'other'; sources[s] = (sources[s] || 0) + 1; });
  const labels = { inbound: 'Inbound', outbound: 'Outbound', referral: 'Indicação', event: 'Evento', social: 'Redes', other: 'Outro' };
  const sorted = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = Math.max(...sorted.map(([, v]) => v), 1);

  const items = sorted.map(([k, n]) => {
    const pct = (n / max) * 100;
    return `<div class="hw2-pulse-row">
      <span class="hw2-pulse-label">${labels[k] || k}</span>
      <span class="hw2-pulse-bar"><span class="hw2-pulse-fill" style="width:${pct}%;background:var(--blue)"></span></span>
      <span class="hw2-pulse-count">${n}</span>
    </div>`;
  }).join('');

  return _shell('new_prospects', 'Novos prospects', 'user-plus',
    `<div class="hw2-big-row"><div class="hw2-big-val">${recent.length}</div><div class="hw2-big-sub-inline">últimos 7 dias</div></div>
     <div class="hw2-pulse">${items}</div>`,
    null, 'default', 'var(--blue)');
}

// ── 11. FORECAST MENSAL (projeção próximos 3 meses) ──────
function _wForecast() {
  const cards = STATE.crm?.cards || [];
  const stages = STATE.crm?.stages || [];
  const isOpen = (c) => {
    const s = stages.find(x => x.id === c.stage_id);
    const name = (s?.name || '').toLowerCase();
    return !name.includes('ganho') && !name.includes('perd') && !name.includes('ativo') && !name.includes('descart');
  };
  const openCards = cards.filter(isOpen);

  if (!openCards.length) {
    return _shell('forecast', 'Forecast mensal', 'line-chart',
      `<div class="hw2-empty"><p>Sem deals abertos para projetar.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--purple)');
  }

  // Agrupa expected por mês com base em expected_close_date (ou mês atual se não informado)
  const now = new Date();
  const months = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
      expected: 0,
      count: 0,
    });
  }
  const firstMonthKey = months[0].key;
  openCards.forEach(c => {
    const exp = (Number(c.value) || 0) * (Number(c.probability) || 0) / 100;
    const closeKey = c.expected_close_date ? c.expected_close_date.substring(0, 7) : firstMonthKey;
    const m = months.find(x => x.key === closeKey);
    if (m) { m.expected += exp; m.count++; }
    // Fora dos 3 meses → joga no mês mais próximo (geralmente passado = ignora)
  });

  const total = months.reduce((s, m) => s + m.expected, 0);
  const max = Math.max(...months.map(m => m.expected), 1);

  const rows = months.map(m => {
    const pct = (m.expected / max) * 100;
    return `<div class="hw2-forecast-row">
      <span class="hw2-forecast-month">${m.label}</span>
      <span class="hw2-forecast-bar"><span class="hw2-forecast-fill" style="width:${pct}%"></span></span>
      <span class="hw2-forecast-val">${_fmt(m.expected)}</span>
    </div>`;
  }).join('');

  return _shell('forecast', 'Forecast mensal', 'line-chart',
    `<div class="hw2-big-row">
      <div class="hw2-big-val">${_fmt(total)}</div>
      <div class="hw2-big-sub-inline">projetado 3m</div>
    </div>
    <div class="hw2-forecast">${rows}</div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('dashboard')">Ver dashboard →</button>`,
    'default', 'var(--purple)');
}

// ── MOUNT ──────────────────────────────────────────────────
window.buildHubWidgets = () => {
  const wrap = document.getElementById('hub-widget-strip');
  if (!wrap) return;
  const active = _activeWidgets().slice(0, 4);
  const renderMap = {
    revenue: _wRevenue,
    forecast: _wForecast,
    focus_today: _wFocusToday,
    hot_pipeline: _wHotPipeline,
    health_check: _wHealthCheck,
    conversion: _wConversion,
    new_prospects: _wNewProspects,
    momentum: _wMomentum,
    wishlist_pulse: _wWishlistPulse,
    recent_activity: _wRecentActivity,
    notifications: _wNotifications,
  };
  wrap.innerHTML = active.map(id => (renderMap[id] || (() => ''))()).join('');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

// ── PICKER MODAL ──────────────────────────────────────────
window.openHubWidgetPicker = () => {
  const active = new Set(_activeWidgets());
  const rows = HUB_WIDGETS.map(w => `
    <label class="hwp-row">
      <input type="checkbox" class="hwp-check" value="${w.id}" ${active.has(w.id) ? 'checked' : ''}>
      <div class="hwp-icon"><i data-lucide="${w.icon}"></i></div>
      <div class="hwp-body">
        <div class="hwp-name">${w.name}</div>
        <div class="hwp-desc">${w.desc}</div>
      </div>
    </label>`).join('');

  openModal('Personalizar widgets do hub', `
    <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.5">
      Escolha até 4 widgets. A ordem segue a ordem marcada abaixo.
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

// ── Helpers ────────────────────────────────────────────────
function _esc(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function _fmt(v) {
  if (!v) return 'R$ 0';
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
}
function _relTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'agora';
  if (diff < 3600000) return `há ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `há ${Math.floor(diff / 3600000)}h`;
  if (diff < 7 * 86400000) return `há ${Math.floor(diff / 86400000)}d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}
