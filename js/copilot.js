// ══════════════════════════════════════════════════════════
// 3C COPILOT — Claude integration (Beta)
// ══════════════════════════════════════════════════════════
// Floating button + chat drawer. Visible only when STATE.betaMode = true.
// Talks to /api/claude (Vercel serverless function) which proxies to
// Anthropic's API with a server-side key.
// ══════════════════════════════════════════════════════════

let _copilotMessages = [];  // conversation history
let _copilotOpen = false;
let _copilotSending = false;

window.toggleCopilot = () => {
  _copilotOpen = !_copilotOpen;
  const drawer = document.getElementById('copilot-drawer');
  const overlay = document.getElementById('copilot-overlay');
  if (!drawer) return;
  if (_copilotOpen) {
    renderCopilot();
    drawer.classList.add('open');
    overlay?.classList.add('open');
    setTimeout(() => document.getElementById('copilot-input')?.focus(), 250);
  } else {
    drawer.classList.remove('open');
    overlay?.classList.remove('open');
  }
};

window.closeCopilot = () => { _copilotOpen = false; toggleCopilot(); };

window.clearCopilotChat = () => {
  if (!confirm('Limpar toda a conversa?')) return;
  _copilotMessages = [];
  renderCopilot();
};

function renderCopilot() {
  const body = document.getElementById('copilot-body');
  if (!body) return;
  if (!_copilotMessages.length) {
    body.innerHTML = `
      <div class="cp-welcome">
        <div class="cp-welcome-icon"><i data-lucide="sparkles"></i></div>
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
  // Auto-scroll to bottom
  body.scrollTop = body.scrollHeight;
}

function renderCopilotMessage(m) {
  const isUser = m.role === 'user';
  const who = isUser ? 'cp-msg-user' : 'cp-msg-assist';
  // Basic markdown: **bold**, *italic*, line breaks, lists
  const content = formatMarkdown(m.content);
  return `<div class="cp-msg ${who}"><div class="cp-bubble">${content}</div></div>`;
}

function formatMarkdown(text) {
  if (!text) return '';
  // Escape HTML first
  let s = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Bold **text**
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // Italic *text*
  s = s.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  // Code `text`
  s = s.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  // Bullets - or * at line start
  s = s.replace(/^[\s]*[-*] (.+)$/gm, '<li>$1</li>');
  s = s.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Line breaks
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
  renderCopilot();

  try {
    const context = buildCopilotContext();
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: _copilotMessages, context }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    _copilotMessages.push({ role: 'assistant', content: data.reply || '(sem resposta)' });
  } catch (err) {
    console.error('[copilot]', err);
    const msg = err.message || 'Erro desconhecido';
    const hint = msg.includes('GEMINI_API_KEY')
      ? '\n\n*Pegue uma chave grátis em aistudio.google.com/apikey e configure no Vercel: Settings → Environment Variables → GEMINI_API_KEY*'
      : '';
    _copilotMessages.push({ role: 'assistant', content: `❌ **Falha na conexão**: ${msg}${hint}` });
  } finally {
    _copilotSending = false;
    renderCopilot();
  }
};

// Build a compact snapshot of STATE for Claude's context.
// Keep it under ~10K tokens — trim long arrays and drop heavy fields.
function buildCopilotContext() {
  const s = window.STATE || {};
  const today = new Date().toISOString().split('T')[0];

  // Summarize payments by computed status
  const paymentsByStatus = {};
  (s.payments || []).forEach(p => {
    const cs = (typeof computePaymentStatus === 'function') ? computePaymentStatus(p) : p.status;
    if (!paymentsByStatus[cs]) paymentsByStatus[cs] = { count: 0, total: 0, items: [] };
    paymentsByStatus[cs].count++;
    paymentsByStatus[cs].total += (p.amount || 0);
    if (paymentsByStatus[cs].items.length < 10) {
      paymentsByStatus[cs].items.push({
        affiliate: p.affiliate, brand: p.brand, amount: p.amount,
        dueDate: p.dueDate, nfReceivedDate: p.nfReceivedDate, type: p.type,
      });
    }
  });

  // Top affiliates by profit (limit 20)
  const topAffiliates = [...(s.affiliates || [])]
    .sort((a, b) => (b.profit || 0) - (a.profit || 0))
    .slice(0, 20)
    .map(a => ({
      name: a.name, status: a.status, contractType: a.contractType,
      ftds: a.ftds, qftds: a.qftds, deposits: a.deposits,
      netRev: a.netRev, commission: a.commission, profit: a.profit,
      tags: a.tags || [], notes: a.notes,
    }));

  // Open tasks
  const openTasks = (s.tasks || [])
    .filter(t => t.status !== 'concluída')
    .slice(0, 15)
    .map(t => ({
      title: t.title, priority: t.priority, status: t.status,
      dueDate: t.dueDate, assignee: t.assignee, linkedModule: t.linkedModule,
    }));

  return {
    today,
    user: { name: s.user?.name, role: s.user?.role },
    brands: s.brands,
    affiliates_count: (s.affiliates || []).length,
    top_affiliates_by_profit: topAffiliates,
    payments_by_status: paymentsByStatus,
    open_tasks: openTasks,
    pipeline_summary: (s.pipeline?.stages || []).map(st => ({
      stage: st.name,
      cards: (s.pipeline?.cards || []).filter(c => c.stageId === st.id).length,
    })),
    recent_reports: (s.reports || []).slice(-20).map(r => ({
      date: r.date, brand: r.brand,
      affiliate: (s.affiliates || []).find(a => a.id === r.affiliateId)?.name || r.affiliateId,
      ftd: r.ftd, qftd: (typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((x, v) => x + v, 0) : r.qftd),
      deposits: r.deposits, netRev: r.netRev,
    })),
  };
}

// Show/hide the floating button based on beta mode + auth state
window.updateCopilotVisibility = () => {
  const btn = document.getElementById('copilot-fab');
  if (!btn) return;
  const show = STATE?.betaMode === true && STATE?.user;
  btn.style.display = show ? 'flex' : 'none';
};

// Hook into auth + beta toggle
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updateCopilotVisibility, 500);
});
