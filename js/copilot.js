// ══════════════════════════════════════════════════════════
// 3C COPILOT — IA conversacional sobre os dados do CRM
// ══════════════════════════════════════════════════════════
// Botão flutuante + drawer de chat. Visível para qualquer usuário logado.
// Envia um snapshot compacto do CRM (contatos, pipeline, tarefas, tags)
// e dos resultados dos afiliados (public.reports) para /api/ai.
// Conversations persist in localStorage with Gemini-style history sidebar.
// ══════════════════════════════════════════════════════════

const COPILOT_CONVS_KEY = '3cos_copilot_convs';
const COPILOT_ACTIVE_KEY = '3cos_copilot_active';
const COPILOT_LEGACY_KEY = '3cos_copilot_msgs';  // old format

let _copilotConvs = [];       // [{ id, title, messages, createdAt, updatedAt }]
let _copilotActiveId = null;  // id of active conversation
let _copilotOpen = false;
let _copilotSending = false;
let _copilotHistoryOpen = false;
let _copilotSelectMode = false;
const _copilotSelected = new Set();

function _loadConvs() {
  try {
    // Migrate legacy single-thread format if present
    const legacy = localStorage.getItem(COPILOT_LEGACY_KEY);
    if (legacy && !localStorage.getItem(COPILOT_CONVS_KEY)) {
      const oldMsgs = JSON.parse(legacy);
      if (Array.isArray(oldMsgs) && oldMsgs.length) {
        const conv = _makeConv(oldMsgs);
        _copilotConvs = [conv];
        _copilotActiveId = conv.id;
        _saveConvs();
      }
      localStorage.removeItem(COPILOT_LEGACY_KEY);
    }
    const raw = localStorage.getItem(COPILOT_CONVS_KEY);
    _copilotConvs = raw ? JSON.parse(raw) : [];
    _copilotActiveId = localStorage.getItem(COPILOT_ACTIVE_KEY) || null;
    // Validate active id still exists
    if (_copilotActiveId && !_copilotConvs.find(c => c.id === _copilotActiveId)) {
      _copilotActiveId = _copilotConvs[0]?.id || null;
    }
  } catch (e) {
    _copilotConvs = [];
    _copilotActiveId = null;
  }
}

function _saveConvs() {
  try {
    localStorage.setItem(COPILOT_CONVS_KEY, JSON.stringify(_copilotConvs));
    if (_copilotActiveId) localStorage.setItem(COPILOT_ACTIVE_KEY, _copilotActiveId);
    else localStorage.removeItem(COPILOT_ACTIVE_KEY);
  } catch (e) {}
}

function _makeConv(messages = []) {
  const now = Date.now();
  return {
    id: `cv_${now}_${Math.random().toString(36).slice(2, 8)}`,
    title: messages[0]?.content ? _titleFromText(messages[0].content) : 'Nova conversa',
    messages,
    createdAt: now,
    updatedAt: now,
  };
}

function _titleFromText(text) {
  const clean = String(text || '').trim().replace(/\s+/g, ' ');
  return clean.length > 40 ? clean.substring(0, 40) + '…' : (clean || 'Nova conversa');
}

function _getActiveConv() {
  if (!_copilotActiveId) return null;
  return _copilotConvs.find(c => c.id === _copilotActiveId) || null;
}

function _activeMessages() {
  return _getActiveConv()?.messages || [];
}

_loadConvs();

// ── OPEN / CLOSE ──
window.openCopilot = () => {
  _copilotOpen = true;
  const drawer = document.getElementById('copilot-drawer');
  const overlay = document.getElementById('copilot-overlay');
  if (!drawer) return;
  _loadConvs();
  // Always start fresh when opening the Copilot. Old conversations stay in
  // the history sidebar, accessible via the hamburger icon in the header.
  // This prevents the clutter of dozens of half-finished tabs.
  const active = _getActiveConv();
  if (!active || active.messages.length > 0) {
    // Last conv had content — start a new empty one
    const conv = _makeConv([]);
    _copilotConvs.unshift(conv);
    _copilotActiveId = conv.id;
    _saveConvs();
  }
  renderCopilot();
  drawer.classList.add('open');
  overlay?.classList.add('open');
  setTimeout(() => document.getElementById('copilot-input')?.focus(), 250);
};

window.closeCopilot = () => {
  _copilotOpen = false;
  _copilotHistoryOpen = false;
  const drawer = document.getElementById('copilot-drawer');
  const overlay = document.getElementById('copilot-overlay');
  drawer?.classList.remove('open');
  drawer?.classList.remove('history-open');
  overlay?.classList.remove('open');
};

window.toggleCopilot = () => {
  if (_copilotOpen) closeCopilot();
  else openCopilot();
};

// ── HISTORY SIDEBAR ──
window.toggleCopilotHistory = () => {
  _copilotHistoryOpen = !_copilotHistoryOpen;
  const drawer = document.getElementById('copilot-drawer');
  drawer?.classList.toggle('history-open', _copilotHistoryOpen);
  renderCopilotHistory();
};

window.newCopilotChat = () => {
  // If current active is already empty, reuse it
  const active = _getActiveConv();
  if (active && active.messages.length === 0) {
    _copilotHistoryOpen = false;
    document.getElementById('copilot-drawer')?.classList.remove('history-open');
    renderCopilot();
    setTimeout(() => document.getElementById('copilot-input')?.focus(), 100);
    return;
  }
  const conv = _makeConv([]);
  _copilotConvs.unshift(conv);
  _copilotActiveId = conv.id;
  _saveConvs();
  _copilotHistoryOpen = false;
  document.getElementById('copilot-drawer')?.classList.remove('history-open');
  renderCopilot();
  setTimeout(() => document.getElementById('copilot-input')?.focus(), 100);
};

window.switchCopilotConv = (id) => {
  _copilotActiveId = id;
  _saveConvs();
  _copilotHistoryOpen = false;
  document.getElementById('copilot-drawer')?.classList.remove('history-open');
  renderCopilot();
};

window.deleteCopilotConv = (id, ev) => {
  if (ev) ev.stopPropagation();
  const conv = _copilotConvs.find(c => c.id === id);
  if (!conv) return;
  if (!confirm(`Apagar a conversa "${conv.title}"?`)) return;
  _copilotConvs = _copilotConvs.filter(c => c.id !== id);
  if (_copilotActiveId === id) {
    _copilotActiveId = _copilotConvs[0]?.id || null;
  }
  _saveConvs();
  renderCopilot();
  renderCopilotHistory();
};

// ── RENDERING ──
const COPILOT_ICON_SVG = `<svg viewBox="0 0 24 24" class="cp-gemini-icon"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;

function renderCopilot() {
  const body = document.getElementById('copilot-body');
  if (!body) return;
  const msgs = _activeMessages();
  if (!msgs.length) {
    body.innerHTML = `
      <div class="cp-welcome">
        <div class="cp-welcome-icon">${COPILOT_ICON_SVG}</div>
        <div class="cp-welcome-title">Olá! Sou o Copilot 3C</div>
        <div class="cp-welcome-sub">Pergunte sobre contatos, pipeline, leads da LP, tarefas ou os resultados dos afiliados.</div>
        <div class="cp-suggestions">
          <button class="cp-sug" onclick="copilotAsk('Quais negociações estão paradas há mais de 7 dias e com quem?')">Leads parados</button>
          <button class="cp-sug" onclick="copilotAsk('Quantos leads da landing page chegaram nos últimos 7 dias? Liste nome e perfil.')">Leads da LP esta semana</button>
          <button class="cp-sug" onclick="copilotAsk('Resuma os resultados dos afiliados deste mês: depósitos, cadastros, FTDs e NGR, comparando com o mês anterior.')">Resultados do mês</button>
          <button class="cp-sug" onclick="copilotAsk('Quem está em Contrato ou Em negociação agora? O que falta para fechar?')">Em fase final</button>
        </div>
      </div>`;
  } else {
    body.innerHTML = msgs.map(m => renderCopilotMessage(m)).join('');
    if (_copilotSending) body.innerHTML += `<div class="cp-msg cp-msg-assist"><div class="cp-msg-avatar">${COPILOT_ICON_SVG}</div><div class="cp-bubble cp-typing"><span></span><span></span><span></span></div></div>`;
  }
  if (window.lucide?.createIcons) lucide.createIcons();
  body.scrollTop = body.scrollHeight;
  renderCopilotHistory();
}

function renderCopilotHistory() {
  const panel = document.getElementById('copilot-history');
  if (!panel) return;

  // Toolbar (only visible when there are conversations)
  const toolbar = _copilotConvs.length ? `
    <div class="cp-hist-toolbar">
      ${_copilotSelectMode ? `
        <button class="cp-hist-btn" onclick="cpSelectAll()"><i data-lucide="check-square"></i> ${_copilotSelected.size === _copilotConvs.length ? 'Nenhum' : 'Todos'}</button>
        <div class="cp-hist-toolbar-count">${_copilotSelected.size} selecionada(s)</div>
        <button class="cp-hist-btn danger" onclick="cpBulkDelete()" ${_copilotSelected.size === 0 ? 'disabled' : ''}><i data-lucide="trash"></i> Apagar</button>
        <button class="cp-hist-btn" onclick="cpExitSelectMode()"><i data-lucide="x"></i></button>
      ` : `
        <button class="cp-hist-btn" onclick="cpEnterSelectMode()"><i data-lucide="check-square"></i> Selecionar</button>
      `}
    </div>` : '';

  if (!_copilotConvs.length) {
    panel.innerHTML = `${toolbar}<div class="cp-hist-empty">
      <i data-lucide="message-square"></i>
      <div>Sem conversas ainda</div>
      <div class="cp-hist-empty-sub">Comece uma nova conversa</div>
    </div>`;
    if (window.lucide?.createIcons) lucide.createIcons();
    return;
  }

  // Sort by updatedAt descending
  const sorted = [..._copilotConvs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  const items = sorted.map(c => {
    const isActive = c.id === _copilotActiveId;
    const selected = _copilotSelected.has(c.id);
    const timeAgo = formatRelativeTime(c.updatedAt);
    const msgCount = c.messages.length;
    if (_copilotSelectMode) {
      return `<div class="cp-hist-item select-mode ${selected ? 'selected' : ''}" onclick="cpToggleSelect('${c.id}')">
        <div class="cp-hist-check">${selected ? '<i data-lucide="check"></i>' : ''}</div>
        <div style="flex:1;min-width:0">
          <div class="cp-hist-item-title">${escapeHTML(c.title)}</div>
          <div class="cp-hist-item-meta">${timeAgo}${msgCount ? ` · ${msgCount} msg` : ''}</div>
        </div>
      </div>`;
    }
    return `<div class="cp-hist-item ${isActive ? 'on' : ''}" onclick="switchCopilotConv('${c.id}')">
      <div class="cp-hist-item-title">${escapeHTML(c.title)}</div>
      <div class="cp-hist-item-meta">${timeAgo}${msgCount ? ` · ${msgCount} msg` : ''}</div>
      <button class="cp-hist-del" onclick="deleteCopilotConv('${c.id}', event)" title="Apagar conversa">
        <i data-lucide="trash"></i>
      </button>
    </div>`;
  }).join('');

  panel.innerHTML = toolbar + items;
  if (window.lucide?.createIcons) lucide.createIcons();
}

window.cpEnterSelectMode = () => {
  _copilotSelectMode = true;
  _copilotSelected.clear();
  renderCopilotHistory();
};
window.cpExitSelectMode = () => {
  _copilotSelectMode = false;
  _copilotSelected.clear();
  renderCopilotHistory();
};
window.cpToggleSelect = (id) => {
  if (_copilotSelected.has(id)) _copilotSelected.delete(id);
  else _copilotSelected.add(id);
  renderCopilotHistory();
};
window.cpSelectAll = () => {
  if (_copilotSelected.size === _copilotConvs.length) _copilotSelected.clear();
  else _copilotConvs.forEach(c => _copilotSelected.add(c.id));
  renderCopilotHistory();
};
window.cpBulkDelete = () => {
  if (_copilotSelected.size === 0) return;
  const n = _copilotSelected.size;
  if (!confirm(`Apagar ${n} conversa(s) selecionada(s)?`)) return;
  _copilotConvs = _copilotConvs.filter(c => !_copilotSelected.has(c.id));
  if (_copilotActiveId && !_copilotConvs.find(c => c.id === _copilotActiveId)) {
    _copilotActiveId = _copilotConvs[0]?.id || null;
  }
  _copilotSelected.clear();
  _copilotSelectMode = false;
  _saveConvs();
  renderCopilot();
};

function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}m`;
  if (hours < 24) return `há ${hours}h`;
  if (days < 7) return `há ${days}d`;
  return new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function escapeHTML(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderCopilotMessage(m) {
  const isUser = m.role === 'user';
  const who = isUser ? 'cp-msg-user' : 'cp-msg-assist';
  const icon = !isUser ? `<div class="cp-msg-avatar">${COPILOT_ICON_SVG}</div>` : '';
  // Last-line defense: strip raw Gemini/API error patterns from assistant
  // messages before rendering. Protects against historical messages saved
  // in localStorage before the friendly-error mapping was introduced.
  const text = !isUser ? _sanitizeCopilotMessage(m.content) : m.content;
  const content = formatMarkdown(text);
  return `<div class="cp-msg ${who}">${icon}<div class="cp-bubble">${content}</div></div>`;
}

// Detects raw API / provider error text in an assistant message and swaps it
// for a friendly Portuguese message. Runs at render time so stale messages
// in the conversation history don't keep leaking infrastructure details.
function _sanitizeCopilotMessage(content) {
  if (!content) return content;
  const s = String(content);
  const lower = s.toLowerCase();

  const rawErrorPatterns = [
    /quota exceeded/i,
    /generativelanguage\.googleapis\.com/i,
    /generate_content_free_tier/i,
    /please retry in [\d.]+s/i,
    /gemini[- ]\d/i,
    /rate[\s-]?limit/i,
    /rpc error/i,
    /resource_exhausted/i,
    /falha na conexão.*:/i,  // old "**Falha na conexão**: ..." prefix
  ];

  const hitsRawError = rawErrorPatterns.some(re => re.test(s));
  if (!hitsRawError) return s;

  const retryMatch = /retry in (\d+)(?:\.\d+)?s/i.exec(s);
  const wait = retryMatch ? ` (tente novamente em ~${retryMatch[1]}s)` : '';

  if (lower.includes('quota') || lower.includes('limit') || lower.includes('rate') || lower.includes('retry')) {
    return `O 3C Copilot está com muitas solicitações e atingiu o limite temporário${wait}. Aguarde um instante e tente de novo.`;
  }
  return 'O 3C Copilot está temporariamente indisponível. Tente novamente em alguns segundos.';
}

function formatMarkdown(text) {
  if (!text) return '';
  let s = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  s = s.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  s = s.replace(/\n/g, '<br>');
  return s;
}

window.onCopilotKeydown = (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendCopilotMessage();
  }
};

window.copilotAsk = (q) => {
  const input = document.getElementById('copilot-input');
  if (input) input.value = q;
  sendCopilotMessage();
};

// Maps backend/API errors to a user-facing message. Hides provider names,
// quotas, model IDs — just tells the user what's wrong and when to retry.
function _friendlyCopilotError(err) {
  const raw = (err.rawError || err.message || '').toLowerCase();
  const status = err.status;

  // Rate limit / quota exceeded — extract retry hint if present
  if (status === 429 || raw.includes('quota') || raw.includes('limit') || raw.includes('rate')) {
    const retryMatch = /retry in (\d+)(?:\.\d+)?s/i.exec(err.rawError || err.message || '');
    const wait = retryMatch ? ` (tente novamente em ~${retryMatch[1]}s)` : '';
    return `O 3C Copilot está com muitas solicitações simultâneas e atingiu o limite temporário${wait}. Aguarde um instante e tente de novo.`;
  }

  // Missing API key (first-time setup)
  if (raw.includes('api_key') || raw.includes('apikey') || raw.includes('não configurada')) {
    return 'O 3C Copilot ainda não foi configurado por um administrador. Contate o responsável técnico.';
  }

  // Network / timeout
  if (status === 0 || raw.includes('failed to fetch') || raw.includes('networkerror') || raw.includes('timeout')) {
    return 'Não consegui me conectar ao serviço do Copilot. Verifique sua conexão e tente novamente.';
  }

  // Server errors
  if (status >= 500) {
    return 'O 3C Copilot está temporariamente indisponível. Tente novamente em alguns segundos.';
  }

  // Bad request / unknown
  return 'Tive um problema para processar sua pergunta. Tente reformular ou aguarde um instante.';
}

window.sendCopilotMessage = async () => {
  const input = document.getElementById('copilot-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text || _copilotSending) return;

  // If no active conv, create one
  let conv = _getActiveConv();
  if (!conv) {
    conv = _makeConv([]);
    _copilotConvs.unshift(conv);
    _copilotActiveId = conv.id;
  }

  // Garante o CRM carregado e fresco antes de montar o snapshot: leads da LP
  // e movimentos da pipeline chegam pela API sem passar por este app.
  if (window.CRM?.loadAll) {
    try { await CRM.loadAll(); } catch (e) { console.warn('[Copilot] CRM.loadAll falhou:', e); }
  }
  if (!(STATE.reports || []).length && window.Data?.loadAll) {
    try { await Data.loadAll(); } catch (e) { console.warn('[Copilot] Data.loadAll falhou:', e); }
  }

  conv.messages.push({ role: 'user', content: text });
  if (conv.messages.length === 1) conv.title = _titleFromText(text);
  conv.updatedAt = Date.now();
  input.value = '';
  _copilotSending = true;
  _saveConvs();
  renderCopilot();

  try {
    const context = buildCopilotContext();
    console.log('[Copilot] Contexto enviado — empty?', context._empty_state, 'bytes:', JSON.stringify(context).length);

    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conv.messages, context }),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || `HTTP ${res.status}`);
      err.status = res.status;
      err.rawError = data.error || '';
      throw err;
    }
    conv.messages.push({ role: 'assistant', content: data.reply || '(sem resposta)' });
  } catch (err) {
    console.error('[copilot]', err);
    conv.messages.push({ role: 'assistant', content: _friendlyCopilotError(err) });
  } finally {
    _copilotSending = false;
    conv.updatedAt = Date.now();
    _saveConvs();
    renderCopilot();
  }
};

// ── DATA CONTEXT ──
function buildCopilotContext() {
  const s = STATE || {};
  const crm = s.crm || {};
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();
  const DAY = 86400000;
  const days = (ts) => ts ? Math.max(0, Math.floor((now - new Date(ts).getTime()) / DAY)) : null;
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const count = (arr, key) => arr.reduce((m, x) => { const k = x[key] || '—'; m[k] = (m[k] || 0) + 1; return m; }, {});

  const contacts = crm.contacts || [];
  const stages = crm.stages || [];
  const cards = crm.cards || [];
  const tags = crm.tags || [];
  const contactTags = crm.contactTags || [];
  const products = crm.products || [];
  const stageName = (id) => stages.find(x => x.id === id)?.name || '—';
  const contactName = (id) => contacts.find(x => x.id === id)?.name || '—';
  const tagsOf = (cid) => contactTags.filter(x => x.contact_id === cid).map(x => tags.find(t => t.id === x.tag_id)?.name).filter(Boolean);
  const STATUS = { wishlist: 'wishlist', in_pipeline: 'no pipeline', customer: 'cliente', churned: 'perdido' };

  // ── CONTATOS (compactos) ──
  const contatos = contacts.slice(0, 400).map(c => {
    const o = { nome: c.name, status: STATUS[c.status] || c.status, tipo: c.type };
    if (c.profile) o.perfil = c.profile;
    if (c.temperature) o.temperatura = c.temperature;
    if (c.company) o.empresa = c.company;
    if (c.tier) o.tier = c.tier;
    const t = tagsOf(c.id); if (t.length) o.tags = t;
    if (c.lead_meta?.channel) o.origem = 'landing page · ' + c.lead_meta.channel;
    else if (c.source) o.origem = c.source;
    if (c.social_links?.instagram) o.instagram = '@' + String(c.social_links.instagram).replace(/^@/, '');
    o.criado_em = String(c.created_at || '').substring(0, 10);
    o.dias_sem_atualizar = days(c.updated_at || c.created_at);
    if (c.notes) o.notas = String(c.notes).substring(0, 120);
    return o;
  });
  const leadsLP = contacts.filter(c => c.lead_meta?.received_at);
  const leadsLP30 = leadsLP.filter(c => days(c.lead_meta.received_at) <= 30);

  // ── PIPELINE (sem dinheiro: etapas, contagens, dias parado) ──
  const etapas = {};
  stages.forEach(st => { (etapas[st.scope] = etapas[st.scope] || []).push(st.name); });
  const isSettled = (n) => /fechado|follow/i.test(n);
  const negociacoes = cards.map(c => {
    const st = stageName(c.stage_id);
    const o = { titulo: c.title, contato: contactName(c.contact_id), funil: (c.scope || '').toUpperCase(), etapa: st, dias_parado: days(c.updated_at || c.created_at), criado_em: String(c.created_at || '').substring(0, 10) };
    const prod = products.find(p => p.id === c.product_id); if (prod) o.produto = prod.name;
    if (c.notes) o.notas = String(c.notes).substring(0, 120);
    return o;
  });
  const porEtapa = {};
  cards.forEach(c => { const k = `${(c.scope || '').toUpperCase()} · ${stageName(c.stage_id)}`; porEtapa[k] = (porEtapa[k] || 0) + 1; });
  const paradas7 = negociacoes.filter(n => !isSettled(n.etapa) && n.dias_parado >= 7);

  // ── TAREFAS do CRM (abertas) ──
  const tarefas = (crm.tasks || []).filter(t => t.status !== 'done' && t.status !== 'concluída').map(t => {
    const o = { titulo: t.title, prioridade: t.priority, status: t.status };
    if (t.due_date) o.prazo = String(t.due_date).substring(0, 10);
    if (t.related_contact_id) o.contato = contactName(t.related_contact_id);
    return o;
  });

  // ── RESULTADOS DOS AFILIADOS (public.reports → STATE.reports) ──
  const reports = s.reports || [];
  const affName = (id) => (s.affiliates || []).find(a => a.id === id)?.name || id;
  const sumRows = (rows) => rows.reduce((t, r) => {
    t.depositos += Number(r.deposits) || 0; t.cadastros += Number(r.registrations) || 0;
    t.ftd += Number(r.ftd) || 0; t.qftd += Number(r.qftd) || 0; t.ngr += Number(r.netRev) || 0; return t;
  }, { depositos: 0, cadastros: 0, ftd: 0, qftd: 0, ngr: 0 });
  const round = (t) => ({ depositos: r2(t.depositos), cadastros: t.cadastros, ftd: t.ftd, qftd: t.qftd, ngr: r2(t.ngr) });
  const ym = (d) => String(d || '').substring(0, 7);
  const d0 = new Date(); const curKey = `${d0.getFullYear()}-${String(d0.getMonth() + 1).padStart(2, '0')}`;
  const d1 = new Date(d0.getFullYear(), d0.getMonth() - 1, 1); const prevKey = `${d1.getFullYear()}-${String(d1.getMonth() + 1).padStart(2, '0')}`;
  const porMes = {};
  reports.forEach(r => { const k = ym(r.date); if (!porMes[k]) porMes[k] = []; porMes[k].push(r); });
  const resultadosPorMes = Object.keys(porMes).sort().slice(-12).map(k => ({ mes: k, ...round(sumRows(porMes[k])) }));
  const porMarcaMes = {};
  (porMes[curKey] || []).forEach(r => { const b = r.brand || 'Outros'; (porMarcaMes[b] = porMarcaMes[b] || []).push(r); });
  const porAfiliadoMes = {};
  (porMes[curKey] || []).forEach(r => { const a = affName(r.affiliateId); (porAfiliadoMes[a] = porAfiliadoMes[a] || []).push(r); });
  const ultimos30 = reports.filter(r => days(r.date) <= 30).map(r => ({
    data: String(r.date || '').substring(0, 10), marca: r.brand, afiliado: affName(r.affiliateId),
    depositos: r2(r.deposits), cadastros: Number(r.registrations) || 0, ftd: Number(r.ftd) || 0, qftd: Number(r.qftd) || 0, ngr: r2(r.netRev),
  })).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 400);

  const isEmpty = !contacts.length && !cards.length && !reports.length;

  return {
    hoje: today,
    usuario: { nome: s.user?.name, papel: s.user?.role },
    crm: {
      resumo: {
        contatos: contacts.length,
        por_status: count(contatos, 'status'),
        por_perfil: count(contatos, 'perfil'),
        por_temperatura: count(contatos, 'temperatura'),
        leads_lp_total: leadsLP.length,
        leads_lp_ultimos_30_dias: leadsLP30.length,
        negociacoes: cards.length,
        negociacoes_por_etapa: porEtapa,
        negociacoes_paradas_7d: paradas7.length,
        tarefas_abertas: tarefas.length,
      },
      etapas_da_pipeline: etapas,
      produtos: products.map(p => p.name),
      tags: tags.map(t => t.name),
      contatos,
      negociacoes,
      tarefas_abertas: tarefas,
    },
    resultados_afiliados: {
      mes_atual: { mes: curKey, ...round(sumRows(porMes[curKey] || [])) },
      mes_anterior: { mes: prevKey, ...round(sumRows(porMes[prevKey] || [])) },
      por_mes: resultadosPorMes,
      por_marca_mes_atual: Object.entries(porMarcaMes).map(([marca, rows]) => ({ marca, ...round(sumRows(rows)) })),
      por_afiliado_mes_atual: Object.entries(porAfiliadoMes).map(([afiliado, rows]) => ({ afiliado, ...round(sumRows(rows)) })).sort((a, b) => b.ngr - a.ngr),
      ultimos_30_dias: ultimos30,
      _nota: reports.length ? null : 'Nenhum resultado lançado ainda em public.reports.',
    },
    _empty_state: isEmpty,
    _empty_note: isEmpty ? 'A plataforma ainda não tem contatos, negociações nem resultados lançados. Oriente o usuário a cadastrar contatos, mover negociações na pipeline e lançar resultados dos afiliados. NÃO diga que não tem acesso — o sistema está vazio.' : null,
  };
}

// ── VISIBILITY ──
window.updateCopilotVisibility = () => {
  const btn = document.getElementById('copilot-fab');
  if (!btn) return;
  btn.style.display = STATE?.user ? 'flex' : 'none';
};

// Safety net: keep checking every 2s for the first 20s after boot,
// in case STATE loads asynchronously and the initial call ran too early.
document.addEventListener('DOMContentLoaded', () => {
  let ticks = 0;
  const interval = setInterval(() => {
    updateCopilotVisibility();
    ticks++;
    if (ticks >= 10) clearInterval(interval);
  }, 2000);
  // Also run immediately
  setTimeout(updateCopilotVisibility, 500);
});
