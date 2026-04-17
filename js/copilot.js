// ══════════════════════════════════════════════════════════
// 3C COPILOT — Gemini AI integration (Beta)
// ══════════════════════════════════════════════════════════
// Floating button + chat drawer. Visible only when STATE.betaMode = true.
// Talks to /api/ai (Vercel serverless → Google Gemini, free tier).
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
  // If no active conv exists, start fresh (but don't persist empty conv yet)
  if (!_copilotActiveId && _copilotConvs.length) _copilotActiveId = _copilotConvs[0].id;
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
const COPILOT_ICON_SVG = `<svg viewBox="0 0 24 24" class="cp-gemini-icon"><path d="M12 2C12 8.627 15.373 12 22 12C15.373 12 12 15.373 12 22C12 15.373 8.627 12 2 12C8.627 12 12 8.627 12 2Z" fill="currentColor"/></svg>`;

function renderCopilot() {
  const body = document.getElementById('copilot-body');
  if (!body) return;
  const msgs = _activeMessages();
  if (!msgs.length) {
    body.innerHTML = `
      <div class="cp-welcome">
        <div class="cp-welcome-icon">${COPILOT_ICON_SVG}</div>
        <div class="cp-welcome-title">Olá! Sou o Copilot 3C</div>
        <div class="cp-welcome-sub">Pergunte qualquer coisa sobre afiliados, pagamentos, performance ou o estado da operação.</div>
        <div class="cp-suggestions">
          <button class="cp-sug" onclick="copilotAsk('Quais pagamentos estão vencidos no momento?')">Pagamentos vencidos?</button>
          <button class="cp-sug" onclick="copilotAsk('Quem são os 3 afiliados que mais deram lucro pra 3C?')">Top 3 afiliados por lucro</button>
          <button class="cp-sug" onclick="copilotAsk('Resuma a situação financeira do mês atual')">Resumo financeiro</button>
          <button class="cp-sug" onclick="copilotAsk('Há algum afiliado sem contato recente que mereça atenção?')">Afiliados em risco</button>
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
  if (!_copilotConvs.length) {
    panel.innerHTML = `<div class="cp-hist-empty">
      <i data-lucide="message-square"></i>
      <div>Sem conversas ainda</div>
      <div class="cp-hist-empty-sub">Comece uma nova conversa</div>
    </div>`;
    if (window.lucide?.createIcons) lucide.createIcons();
    return;
  }
  // Sort by updatedAt descending
  const sorted = [..._copilotConvs].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  panel.innerHTML = sorted.map(c => {
    const isActive = c.id === _copilotActiveId;
    const timeAgo = formatRelativeTime(c.updatedAt);
    const msgCount = c.messages.length;
    return `<div class="cp-hist-item ${isActive ? 'on' : ''}" onclick="switchCopilotConv('${c.id}')">
      <div class="cp-hist-item-title">${escapeHTML(c.title)}</div>
      <div class="cp-hist-item-meta">${timeAgo}${msgCount ? ` · ${msgCount} msg` : ''}</div>
      <button class="cp-hist-del" onclick="deleteCopilotConv('${c.id}', event)" title="Apagar conversa">
        <i data-lucide="trash-2"></i>
      </button>
    </div>`;
  }).join('');
  if (window.lucide?.createIcons) lucide.createIcons();
}

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
  const content = formatMarkdown(m.content);
  return `<div class="cp-msg ${who}">${icon}<div class="cp-bubble">${content}</div></div>`;
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

  // If STATE is empty, try to re-sync from Supabase before asking the AI.
  // Avoids the "tenho dados stale" case when user opens Copilot during/after a fresh login.
  const sBefore = STATE || {};
  const hasData = (sBefore.affiliates || []).length > 0 || (sBefore.payments || []).length > 0;
  if (!hasData && window.Data?.loadAll) {
    console.log('[Copilot] STATE parece vazio, re-sincronizando com Supabase...');
    try {
      await Data.loadAll();
      console.log('[Copilot] Re-sync done. Afiliados:', (STATE.affiliates || []).length,
        'Pagamentos:', (STATE.payments || []).length);
    } catch (e) {
      console.warn('[Copilot] Re-sync falhou:', e);
    }
  }

  const s = STATE || {};
  const stateStats = {
    hasUser: !!s.user,
    affiliates: (s.affiliates || []).length,
    payments: (s.payments || []).length,
    contracts: (s.contracts || []).length,
    tasks: (s.tasks || []).length,
    brands: Object.keys(s.brands || {}).length,
    reports: (s.reports || []).length,
  };
  console.log('[Copilot] STATE antes de enviar:', JSON.stringify(stateStats));

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
    console.log('[Copilot] build_id:', data._build_id, '| stats:', JSON.stringify(data._debug_context_stats));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    conv.messages.push({ role: 'assistant', content: data.reply || '(sem resposta)' });
  } catch (err) {
    console.error('[copilot]', err);
    const msg = err.message || 'Erro desconhecido';
    const hint = msg.includes('GEMINI_API_KEY')
      ? '\n\n*Configure a chave em aistudio.google.com/apikey e adicione como GEMINI_API_KEY no Vercel.*'
      : '';
    conv.messages.push({ role: 'assistant', content: `**Falha na conexão**: ${msg}${hint}` });
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
  const today = new Date().toISOString().split('T')[0];

  // Flag empty state so AI knows the platform has no data yet
  const isEmpty = (s.affiliates || []).length === 0 &&
                  (s.payments || []).length === 0 &&
                  (s.tasks || []).length === 0;

  const paymentsByStatus = {};
  (s.payments || []).forEach(p => {
    const cs = (typeof computePaymentStatus === 'function') ? computePaymentStatus(p) : p.status;
    if (!paymentsByStatus[cs]) paymentsByStatus[cs] = { count: 0, total: 0, items: [] };
    paymentsByStatus[cs].count++;
    paymentsByStatus[cs].total += (p.amount || 0);
    paymentsByStatus[cs].items.push({
      id: p.id, affiliate: p.affiliate, brand: p.brand, amount: p.amount,
      dueDate: p.dueDate, nfReceivedDate: p.nfReceivedDate, type: p.type,
      status: cs, contract: p.contract,
    });
  });

  const allAffiliates = (s.affiliates || []).map(a => ({
    id: a.id, name: a.name, status: a.status, contractType: a.contractType,
    ftds: a.ftds, qftds: a.qftds, deposits: a.deposits,
    netRev: a.netRev, commission: a.commission, profit: a.profit,
    tags: a.tags || [], notes: a.notes, contactName: a.contactName, contactEmail: a.contactEmail,
    deals: a.deals,
  }));

  const allContracts = (s.contracts || []).map(c => ({
    id: c.id, affiliate: c.affiliate, brand: c.brand, name: c.name,
    type: c.type, value: c.value, status: c.status,
    startDate: c.startDate, endDate: c.endDate, paid: c.paid, paymentStatus: c.paymentStatus,
  }));

  const allTasks = (s.tasks || []).map(t => ({
    id: t.id, title: t.title, priority: t.priority, status: t.status,
    dueDate: t.dueDate, assignee: t.assignee, linkedModule: t.linkedModule,
    description: t.description,
  }));

  const closings = (s.closings || []).map(c => ({
    id: c.id, affiliate: c.affiliate, brand: c.brand,
    month: c.month, totalComm: c.totalComm, status: c.status,
  }));

  return {
    today,
    user: { name: s.user?.name, role: s.user?.role },
    brands: s.brands,
    affiliates: allAffiliates,
    contracts: allContracts,
    payments_by_status: paymentsByStatus,
    tasks: allTasks,
    closings,
    pipeline: {
      stages: (s.pipeline?.stages || []).map(st => st.name),
      cards: (s.pipeline?.cards || []).map(c => ({
        affiliate: c.affiliateName, stage: (s.pipeline?.stages||[]).find(st=>st.id===c.stageId)?.name,
        value: c.value, note: c.note,
      })),
    },
    recent_reports: (s.reports || []).slice(-30).map(r => ({
      date: r.date, brand: r.brand,
      affiliate: (s.affiliates || []).find(a => a.id === r.affiliateId)?.name || r.affiliateId,
      ftd: r.ftd, qftd: (typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((x, v) => x + v, 0) : r.qftd),
      deposits: r.deposits, netRev: r.netRev,
    })),
    deadlines: s.deadlines,
    _empty_state: isEmpty,
    _empty_note: isEmpty
      ? 'IMPORTANTE: A plataforma não tem dados cadastrados ainda (zero afiliados, zero pagamentos, zero tarefas). O usuário acabou de configurar o sistema e ainda não populou com dados reais. Oriente-o a começar cadastrando marcas parceiras, afiliados e lançando dados de performance nos módulos correspondentes. NÃO diga que não tem acesso — explique que o sistema está vazio e precisa ser populado.'
      : null,
  };
}

// ── VISIBILITY ──
window.updateCopilotVisibility = () => {
  const btn = document.getElementById('copilot-fab');
  if (!btn) return;
  const show = STATE?.betaMode === true && !!STATE?.user;
  btn.style.display = show ? 'flex' : 'none';
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
