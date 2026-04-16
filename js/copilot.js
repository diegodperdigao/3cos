// ══════════════════════════════════════════════════════════
// 3C COPILOT — Gemini AI integration (Beta)
// ══════════════════════════════════════════════════════════
// Floating button + chat drawer. Visible only when STATE.betaMode = true.
// Talks to /api/ai (Vercel serverless → Google Gemini, free tier).
// Conversation persists in localStorage across page reloads.
// ══════════════════════════════════════════════════════════

const COPILOT_STORAGE_KEY = '3cos_copilot_msgs';
let _copilotMessages = [];
let _copilotOpen = false;
let _copilotSending = false;

function _loadCopilotMessages() {
  try {
    const raw = localStorage.getItem(COPILOT_STORAGE_KEY);
    _copilotMessages = raw ? JSON.parse(raw) : [];
  } catch(e) { _copilotMessages = []; }
}
function _saveCopilotMessages() {
  try {
    localStorage.setItem(COPILOT_STORAGE_KEY, JSON.stringify(_copilotMessages));
  } catch(e) {}
}

_loadCopilotMessages();

// ── Open / Close (direct, NOT toggle) ──
window.openCopilot = () => {
  _copilotOpen = true;
  const drawer = document.getElementById('copilot-drawer');
  const overlay = document.getElementById('copilot-overlay');
  if (!drawer) return;
  _loadCopilotMessages();
  renderCopilot();
  drawer.classList.add('open');
  overlay?.classList.add('open');
  setTimeout(() => document.getElementById('copilot-input')?.focus(), 250);
};

window.closeCopilot = () => {
  _copilotOpen = false;
  const drawer = document.getElementById('copilot-drawer');
  const overlay = document.getElementById('copilot-overlay');
  drawer?.classList.remove('open');
  overlay?.classList.remove('open');
};

window.toggleCopilot = () => {
  if (_copilotOpen) closeCopilot();
  else openCopilot();
};

window.newCopilotChat = () => {
  _copilotMessages = [];
  _saveCopilotMessages();
  renderCopilot();
  setTimeout(() => document.getElementById('copilot-input')?.focus(), 100);
};

// Custom Gemini-style sparkle SVG (4-pointed star)
const COPILOT_ICON_SVG = `<svg viewBox="0 0 24 24" class="cp-gemini-icon"><path d="M12 2C12 8.627 15.373 12 22 12C15.373 12 12 15.373 12 22C12 15.373 8.627 12 2 12C8.627 12 12 8.627 12 2Z" fill="currentColor"/></svg>`;

function renderCopilot() {
  const body = document.getElementById('copilot-body');
  if (!body) return;
  if (!_copilotMessages.length) {
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
    body.innerHTML = _copilotMessages.map(m => renderCopilotMessage(m)).join('');
    if (_copilotSending) body.innerHTML += `<div class="cp-msg cp-msg-assist"><div class="cp-bubble cp-typing"><span></span><span></span><span></span></div></div>`;
  }
  if (window.lucide?.createIcons) lucide.createIcons();
  body.scrollTop = body.scrollHeight;
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

  _copilotMessages.push({ role: 'user', content: text });
  input.value = '';
  _copilotSending = true;
  _saveCopilotMessages();
  renderCopilot();

  try {
    const context = buildCopilotContext();
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: _copilotMessages, context }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    _copilotMessages.push({ role: 'assistant', content: data.reply || '(sem resposta)' });
  } catch (err) {
    console.error('[copilot]', err);
    const msg = err.message || 'Erro desconhecido';
    const hint = msg.includes('GEMINI_API_KEY')
      ? '\n\n*Pegue uma chave grátis em aistudio.google.com/apikey e configure no Vercel: Settings → Environment Variables → GEMINI_API_KEY*'
      : '';
    _copilotMessages.push({ role: 'assistant', content: `**Falha na conexão**: ${msg}${hint}` });
  } finally {
    _copilotSending = false;
    _saveCopilotMessages();
    renderCopilot();
  }
};

// ── DATA CONTEXT ──
// Sends a compact snapshot of the entire STATE to the AI.
// Includes ALL affiliates (not just top 20), all payments, all contracts.
function buildCopilotContext() {
  const s = window.STATE || {};
  const today = new Date().toISOString().split('T')[0];

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
  };
}

// ── VISIBILITY ──
window.updateCopilotVisibility = () => {
  const btn = document.getElementById('copilot-fab');
  if (!btn) return;
  const show = STATE?.betaMode === true && STATE?.user;
  btn.style.display = show ? 'flex' : 'none';
};

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateCopilotVisibility, 500);
});
