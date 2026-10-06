// ══════════════════════════════════════════════════════════
// HUB WIDGETS — Nova geração (CRM Comercial)
// ══════════════════════════════════════════════════════════
// Widgets reimaginados para o contexto comercial do CRM:
//   - focus_today: tarefas + contatos quentes + cards parados em 1 card
//   - aff_funnel: cadastros e FTDs do mês (public.reports)
//   - aff_money: depósitos e NGR do mês (public.reports)
//   - pipeline_forecast: negociações em Reunião / Em negociação / Contrato (contagens, sem dinheiro)
//   - momentum: sparkline de deals criados por semana + delta
//   - health_check: distribuição visual do pipeline (barras empilhadas B2B+B2C)
//   - wishlist_pulse: contagem de contatos por temperatura com dots
//   - recent_activity: últimas 5 atividades do CRM
//   - notifications: alertas do sistema (mantido do anterior)
//
// A pipeline não carrega dinheiro: valores financeiros vêm só dos
// resultados dos afiliados (STATE.reports).
//
// Cada widget expõe uma visualização ou lista acionável, não apenas um
// número solto. Clique abre o módulo correspondente com contexto.
// ══════════════════════════════════════════════════════════

const HUB_WIDGETS = [
  { id: 'aff_funnel',      name: 'Cadastros e FTDs',  icon: 'user-plus',   desc: 'Cadastros e FTDs trazidos pelos afiliados no mês, com conversão' },
  { id: 'aff_money',       name: 'Depósitos e NGR',   icon: 'banknote',    desc: 'Depósitos e lucro (NGR) dos afiliados no mês, vs mês anterior' },
  { id: 'stalled_leads',   name: 'Leads parados',     icon: 'hourglass',   desc: 'Negociações sem movimento há 7+ dias e contatos quentes esquecidos' },
  { id: 'pipeline_forecast', name: 'Forecast',        icon: 'crosshair',   desc: 'Quantas negociações estão em Reunião agendada, Em negociação e Contrato' },
  { id: 'focus_today',     name: 'Foco de hoje',      icon: 'target',      desc: 'Tarefas urgentes + contatos quentes + cards parados' },
  { id: 'health_check',    name: 'Saúde do pipeline', icon: 'activity',    desc: 'Distribuição de cards por etapa (B2B + B2C)' },
  { id: 'conversion',      name: 'Taxa de conversão', icon: 'percent',     desc: 'Prospects → clientes (90 dias)' },
  { id: 'new_prospects',   name: 'Novos prospects',   icon: 'user-plus',   desc: 'Contatos adicionados nos últimos 7 dias por origem' },
  { id: 'momentum',        name: 'Momentum',          icon: 'trending-up', desc: 'Velocidade de criação de deals por semana' },
  { id: 'recent_activity', name: 'Atividade recente', icon: 'history',     desc: 'Últimas ações no CRM' },
  { id: 'notifications',   name: 'Notificações',      icon: 'bell',        desc: 'Alertas do sistema' },
];
window.HUB_WIDGETS = HUB_WIDGETS;

const DEFAULT_HUB_WIDGETS = ['aff_funnel', 'aff_money', 'stalled_leads', 'pipeline_forecast'];
const LEGACY_DEFAULT_SETS = [
  ['revenue', 'focus_today', 'hot_pipeline', 'health_check'],
  ['revenue', 'forecast', 'stalled_leads', 'focus_today'],
  ['affiliate_results', 'ngr', 'stalled_leads', 'focus_today'],
  ['aff_funnel', 'aff_money', 'stalled_leads', 'focus_today'],
];
// Widgets aposentados (dependiam de valor/probabilidade dos cards) → substituto
const WIDGET_ALIASES = { revenue: 'aff_money', forecast: 'aff_funnel', hot_pipeline: 'stalled_leads', affiliate_results: 'aff_funnel', ngr: 'aff_money' };

function _activeWidgets() {
  const saved = STATE.settings?.hubWidgets;
  if (Array.isArray(saved) && saved.length > 0) {
    // Users who never customized kept the old default set — move them to the new one.
    if (LEGACY_DEFAULT_SETS.some(set => saved.length === set.length && saved.every((id, i) => id === set[i]))) return DEFAULT_HUB_WIDGETS;
    const filtered = saved.map(id => WIDGET_ALIASES[id] || id)
      .filter((id, i, arr) => arr.indexOf(id) === i)
      .filter(id => HUB_WIDGETS.some(w => w.id === id));
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
        <span class="hw2-item-dot" style="background:var(--red)"></span>
        <span class="hw2-item-text"><strong>${_esc(c.name)}</strong> está pronto para o pipeline</span>
      </div>`).join('');
  }
  if (tasks.length) {
    items += tasks.map(t => {
      const col = t.priority === 'alta' ? 'var(--red)' : t.priority === 'média' ? 'var(--amber)' : 'var(--text3)';
      return `<div class="hw2-item" onclick="openMod('tasks')">
        <span class="hw2-item-dot" style="background:${col}"></span>
        <span class="hw2-item-text">${_esc(t.title)}</span>
      </div>`;
    }).join('');
  }
  if (stuckCards.length) {
    items += stuckCards.map(c => `
      <div class="hw2-item" onclick="openMod('pipeline')">
        <span class="hw2-item-dot" style="background:var(--text3)"></span>
        <span class="hw2-item-text"><strong>${_esc(c.title)}</strong> parado há mais de 7 dias</span>
      </div>`).join('');
  }

  const total = tasks.length + hotContacts.length + stuckCards.length;
  return _shell('focus_today', 'Foco de hoje', 'target',
    `<div class="hw2-count">${total} ${total === 1 ? 'ação' : 'ações'}</div>
     <div class="hw2-list">${items}</div>`,
    null, 'default', 'var(--amber)');
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
    { key: 'b2c', label: 'B2C', color: 'var(--theme)' },
    { key: 'b2b', label: 'B2B', color: 'var(--blue)' },
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
    { k: 'ready', label: 'Pronto',  color: 'var(--green)' },
    { k: 'hot',   label: 'Quente',  color: 'var(--red)' },
    { k: 'warm',  label: 'Morno',   color: 'var(--amber)' },
    { k: 'cold',  label: 'Frio',    color: 'var(--blue)' },
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


// ── 11. STALLED LEADS (leads parados) ─────────────────────
// Negociações abertas sem movimento há 7+ dias e contatos quentes/prontos
// sem nenhuma atualização há 14+ dias. Ordenado do mais antigo ao mais novo.
function _wStalledLeads() {
  const DAY = 86400000;
  const now = Date.now();
  const stages = STATE.crm?.stages || [];
  const stageName = (id) => ((stages.find(x => x.id === id) || {}).name || '').toLowerCase();
  const isClosed = (c) => { const n = stageName(c.stage_id); return n.includes('ganho') || n.includes('perd') || n === 'ativo' || n.includes('descart') || n.includes('follow') || (n.includes('fechado') && !n.includes('perd')); };
  const contacts = STATE.crm?.contacts || [];
  const byId = (id) => contacts.find(c => c.id === id);

  const stalledCards = (STATE.crm?.cards || [])
    .filter(c => !isClosed(c))
    .map(c => ({ kind: 'card', id: c.id, scope: c.scope, title: c.title,
      who: byId(c.contact_id)?.name || '', days: Math.floor((now - new Date(c.updated_at || c.created_at).getTime()) / DAY) }))
    .filter(x => x.days >= 7);

  const cardContactIds = new Set((STATE.crm?.cards || []).map(c => c.contact_id));
  const stalledContacts = contacts
    .filter(c => (c.temperature === 'hot' || c.temperature === 'ready') && c.status !== 'customer' && c.status !== 'churned' && !cardContactIds.has(c.id))
    .map(c => ({ kind: 'contact', id: c.id, title: c.name, who: c.temperature === 'ready' ? 'pronto, sem negociação' : 'quente, sem negociação',
      days: Math.floor((now - new Date(c.updated_at || c.created_at).getTime()) / DAY) }))
    .filter(x => x.days >= 14);

  const all = [...stalledCards, ...stalledContacts].sort((a, b) => b.days - a.days);

  if (!all.length) {
    return _shell('stalled_leads', 'Leads parados', 'hourglass',
      `<div class="hw2-empty"><p>Nada parado. Todas as negociações se moveram nos últimos 7 dias.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--amber)');
  }

  const b1 = all.filter(x => x.days < 15).length;
  const b2 = all.filter(x => x.days >= 15 && x.days < 30).length;
  const b3 = all.filter(x => x.days >= 30).length;
  const seg = (n, color) => n ? `<span class="hw2-seg" style="flex:${n};background:${color}" title="${n}"></span>` : '';

  const items = all.slice(0, 4).map(x => `
    <div class="hw2-item" onclick="openMod('${x.kind === 'card' ? 'pipeline' : 'contacts'}')">
      <span class="hw2-stall-days ${x.days >= 30 ? 'is-red' : x.days >= 15 ? 'is-amber' : ''}">${x.days}d</span>
      <span class="hw2-item-text"><strong>${_esc(x.title)}</strong>${x.who ? ` · ${_esc(x.who)}` : ''}</span>
      <span class="hw2-item-time">${x.kind === 'card' ? (x.scope || '').toUpperCase() : 'contato'}</span>
    </div>`).join('');

  return _shell('stalled_leads', 'Leads parados', 'hourglass',
    `<div class="hw2-big-row">
      <div class="hw2-big-val">${all.length}</div>
      <div class="hw2-big-sub-inline">${stalledCards.length} negociaç${stalledCards.length === 1 ? 'ão' : 'ões'} · ${stalledContacts.length} contato${stalledContacts.length === 1 ? '' : 's'}</div>
    </div>
    <div class="hw2-stack" aria-label="7 a 14 dias, 15 a 29 dias, 30 dias ou mais">${seg(b1, 'var(--text3)')}${seg(b2, 'var(--amber)')}${seg(b3, 'var(--red)')}</div>
    <div class="hw2-stall-legend"><span><i style="background:var(--text3)"></i>7–14d ${b1}</span><span><i style="background:var(--amber)"></i>15–29d ${b2}</span><span><i style="background:var(--red)"></i>30d+ ${b3}</span></div>
    <div class="hw2-list">${items}</div>`,
    all.length > 4 ? `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Ver todos os ${all.length} →</button>` : null,
    'default', 'var(--amber)');
}

// ── RESULTADOS DOS AFILIADOS (fonte: STATE.reports) ───────
// Agregador compartilhado com o dashboard. Datas em 'YYYY-MM-DD'.
window.AFF = {
  rows(startKey, endKey) {
    return (STATE.reports || []).filter(r => {
      const d = String(r.date || '').substring(0, 10);
      return d && (!startKey || d >= startKey) && (!endKey || d <= endKey);
    });
  },
  sum(rows) {
    const t = { deposits: 0, registrations: 0, ftd: 0, qftd: 0, ngr: 0, affiliates: new Set(), brands: new Set() };
    rows.forEach(r => {
      t.deposits += Number(r.deposits) || 0;
      t.registrations += Number(r.registrations) || 0;
      t.ftd += Number(r.ftd) || 0;
      t.qftd += Number(r.qftd) || 0;
      t.ngr += Number(r.netRev) || 0;
      if (r.affiliateId) t.affiliates.add(r.affiliateId);
      if (r.brand) t.brands.add(r.brand);
    });
    return t;
  },
  dateKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; },
};

// Mês atual até hoje vs. mesmo trecho do mês anterior (comparação justa no início do mês)
function _monthRange(offset = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate();
  const end = new Date(now.getFullYear(), now.getMonth() + offset, Math.min(now.getDate(), lastDay));
  return [AFF.dateKey(start), AFF.dateKey(end)];
}
function _delta(cur, prev) {
  if (prev > 0) return Math.round((cur - prev) / prev * 100);
  return cur > 0 ? 100 : 0;
}



// Série semanal (últimas n semanas, mais antiga → atual) de um campo dos reports
function _affWeekly(field, n = 8) {
  const week = 7 * 86400000;
  const b = Array(n).fill(0);
  (STATE.reports || []).forEach(r => {
    const diff = Date.now() - new Date(r.date).getTime();
    const idx = n - 1 - Math.floor(diff / week);
    if (idx >= 0 && idx < n) b[idx] += Number(r[field]) || 0;
  });
  return b;
}
function _affSpark(series, accent) {
  const w = 84, h = 30, gap = 3;
  const bw = (w - gap * (series.length - 1)) / series.length;
  const min = Math.min(0, ...series), max = Math.max(...series, 1);
  const span = max - min || 1;
  const zeroY = h - ((0 - min) / span) * h;
  const bars = series.map((v, i) => {
    const y = h - ((v - min) / span) * h;
    const top = Math.min(y, zeroY), hh = Math.max(2, Math.abs(zeroY - y));
    const last = i === series.length - 1;
    return `<rect x="${(i * (bw + gap)).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${hh.toFixed(1)}" rx="1.5" fill="${last ? accent : 'color-mix(in srgb, var(--text) 16%, transparent)'}"/>`;
  }).join('');
  return `<svg class="hw2-aff-spark" viewBox="0 0 ${w} ${h}" aria-hidden="true">${bars}</svg>`;
}
function _lastReportDate() {
  const d = (STATE.reports || []).map(r => String(r.date || '').substring(0, 10)).filter(Boolean).sort().pop();
  return d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '') : null;
}

// Widget com uma linha por métrica: rótulo, valor grande, delta e sparkline 8 semanas
function _affRows(id, title, icon, accent, rows, footLine, emptyMsg) {
  if (!(STATE.reports || []).length) {
    return _shell(id, title, icon,
      `<div class="hw2-empty"><p>${emptyMsg}</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('dashboard')">Ver dashboard →</button>`,
      'default', accent);
  }
  const html = rows.map(r => `
    <div class="hw2-aff-row">
      <div class="hw2-aff-main">
        <span class="hw2-aff-top">
          <span class="hw2-kpi-k">${r.label}</span>
          <span class="hw2-big-delta ${r.delta >= 0 ? 'pos' : 'neg'}"><i data-lucide="${r.delta >= 0 ? 'arrow-up-right' : 'arrow-down-right'}"></i>${r.delta >= 0 ? '+' : ''}${r.delta}%</span>
        </span>
        <span class="hw2-aff-num${r.negative ? ' is-neg' : ''}">${r.value}</span>
      </div>
      ${_affSpark(r.series, accent)}
    </div>`).join('');
  return _shell(id, title, icon,
    `<div class="hw2-aff-rows">${html}</div>
    <div class="hw2-big-sub">${footLine}</div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('dashboard')">Ver dashboard →</button>`,
    'default', accent);
}
function _affFoot(cur, detail) {
  const any = cur.deposits || cur.registrations || cur.ftd || cur.ngr;
  if (!any) { const d = _lastReportDate(); return `sem lançamentos neste mês${d ? ` · último em ${d}` : ''}`; }
  return `mês até hoje vs mês anterior · ${detail}`;
}

function _wAffFunnel() {
  const [s0, e0] = _monthRange(0);
  const [s1, e1] = _monthRange(-1);
  const cur = AFF.sum(AFF.rows(s0, e0));
  const prev = AFF.sum(AFF.rows(s1, e1));
  const conv = cur.registrations > 0 ? Math.round(cur.ftd / cur.registrations * 100) : 0;
  return _affRows('aff_funnel', 'Cadastros e FTDs', 'user-plus', 'var(--blue)', [
    { label: 'Cadastros', value: _fmtInt(cur.registrations), delta: _delta(cur.registrations, prev.registrations), series: _affWeekly('registrations') },
    { label: 'FTDs', value: _fmtInt(cur.ftd), delta: _delta(cur.ftd, prev.ftd), series: _affWeekly('ftd') },
  ], _affFoot(cur, `${conv}% dos cadastros viraram FTD · ${_fmtInt(cur.qftd)} QFTD`),
  'Nenhum resultado de afiliado lançado ainda.');
}

function _wAffMoney() {
  const [s0, e0] = _monthRange(0);
  const [s1, e1] = _monthRange(-1);
  const cur = AFF.sum(AFF.rows(s0, e0));
  const prev = AFF.sum(AFF.rows(s1, e1));
  const margin = cur.deposits > 0 ? Math.round(cur.ngr / cur.deposits * 100) : 0;
  return _affRows('aff_money', 'Depósitos e NGR', 'banknote', 'var(--green)', [
    { label: 'Depósitos', value: _fmt(cur.deposits), delta: _delta(cur.deposits, prev.deposits), series: _affWeekly('deposits') },
    { label: 'Lucro (NGR)', value: _fmt(cur.ngr), delta: _delta(cur.ngr, prev.ngr), negative: cur.ngr < 0, series: _affWeekly('netRev') },
  ], _affFoot(cur, `NGR = ${margin}% dos depósitos · ${cur.affiliates.size} afiliado${cur.affiliates.size === 1 ? '' : 's'}`),
  'Nenhum resultado de afiliado lançado ainda.');
}

// ── FORECAST (contagens por etapa avançada — a pipeline não tem dinheiro) ──
function _wPipelineForecast() {
  const cards = STATE.crm?.cards || [];
  const stages = STATE.crm?.stages || [];
  const nameOf = (id) => (stages.find(s => s.id === id)?.name || '').toLowerCase();
  const STEPS = [
    { key: 'reuni',    label: 'Reunião agendada', color: '#3b82f6' },
    { key: 'negocia',  label: 'Em negociação',    color: '#f59e0b' },
    { key: 'contrato', label: 'Contrato',         color: '#a855f7' },
  ];
  const rows = STEPS.map(st => {
    const inStage = cards.filter(c => nameOf(c.stage_id).includes(st.key));
    return { ...st, total: inStage.length, b2c: inStage.filter(c => c.scope === 'b2c').length, b2b: inStage.filter(c => c.scope === 'b2b').length };
  });
  const likely = rows.filter(r => r.key !== 'reuni').reduce((s, r) => s + r.total, 0);
  const meetings = rows[0].total;
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const closedMonth = cards.filter(c => nameOf(c.stage_id).includes('fechado') && String(c.updated_at || '').startsWith(monthKey)).length;
  const followUp = cards.filter(c => nameOf(c.stage_id).includes('follow')).length;

  if (!cards.length) {
    return _shell('pipeline_forecast', 'Forecast', 'crosshair',
      `<div class="hw2-empty"><p>Pipeline vazia. Sem negociações para projetar.</p></div>`,
      `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
      'default', 'var(--purple)');
  }

  const max = Math.max(...rows.map(r => r.total), 1);
  const list = rows.map(r => `
    <div class="hw2-fc-row" onclick="openMod('pipeline')">
      <span class="hw2-fc-dot" style="background:${r.color}"></span>
      <span class="hw2-fc-label">${r.label}</span>
      <span class="hw2-fc-bar"><span class="hw2-fc-fill" style="width:${(r.total / max) * 100}%;background:${r.color}"></span></span>
      <span class="hw2-fc-num">${r.total}</span>
      <span class="hw2-fc-split">${r.b2c} B2C · ${r.b2b} B2B</span>
    </div>`).join('');

  return _shell('pipeline_forecast', 'Forecast', 'crosshair',
    `<div class="hw2-big-row">
      <div class="hw2-big-val">${likely}</div>
      <div class="hw2-big-sub-inline">prováve${likely === 1 ? 'l' : 'is'} fechamento${likely === 1 ? '' : 's'}</div>
    </div>
    <div class="hw2-big-sub">em negociação ou contrato · ${meetings} reuni${meetings === 1 ? 'ão' : 'ões'} agendada${meetings === 1 ? '' : 's'}</div>
    <div class="hw2-fc">${list}</div>
    <div class="hw2-big-sub">${closedMonth} fechado${closedMonth === 1 ? '' : 's'} neste mês · ${followUp} em follow up</div>`,
    `<button class="hw2-cta" onclick="event.stopPropagation();openMod('pipeline')">Abrir pipeline →</button>`,
    'default', 'var(--purple)');
}

// ── MOUNT ──────────────────────────────────────────────────
window.buildHubWidgets = () => {
  const wrap = document.getElementById('hub-widget-strip');
  if (!wrap) return;
  const active = _activeWidgets().slice(0, 4);
  const renderMap = {
    aff_funnel: _wAffFunnel,
    aff_money: _wAffMoney,
    stalled_leads: _wStalledLeads,
    pipeline_forecast: _wPipelineForecast,
    focus_today: _wFocusToday,
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
function _fmtInt(v) { return new Intl.NumberFormat('pt-BR').format(Math.round(Number(v) || 0)); }
function _fmt(v) {
  if (!v) return 'R$ 0';
  if (v < 0) return '-' + _fmt(-v);
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
