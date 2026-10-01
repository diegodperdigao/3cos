// ══════════════════════════════════════════════════════════
// DASHBOARD — Commercial CRM
// ══════════════════════════════════════════════════════════
// Reformulado para a frente comercial: receita, deals fechados,
// taxa de conversão, ticket médio, charts de evolução, próximos a fechar.
// Lê dados do schema `crm` (STATE.crm.*).
// ══════════════════════════════════════════════════════════

(function () {
  // Filtros do dashboard
  const F = { period: '30d', scope: 'all' };

  // Stages considerados "ganhos" (deals fechados = cliente)
  function _isWonStage(stageId) {
    const s = (STATE.crm?.stages || []).find(x => x.id === stageId);
    if (!s) return false;
    const name = (s.name || '').toLowerCase();
    return name.includes('ganho') || name === 'ativo' || name.includes('fechado') && !name.includes('perd');
  }
  function _isLostStage(stageId) {
    const s = (STATE.crm?.stages || []).find(x => x.id === stageId);
    if (!s) return false;
    const name = (s.name || '').toLowerCase();
    return name.includes('perd') || name.includes('descart');
  }

  // ── MOUNT ─────────────────────────────────────────────────
  async function bDash(el) {
    el.innerHTML = modHdr('Dashboard — Comercial') + `<div class="mod-body">
      ${heroHTML('dashboard', 'CRM Comercial', 'Dashboard', 'Receita, deals fechados e saúde do funil')}
      <div class="mod-main">

        <!-- FILTROS -->
        <div class="dash-filters">
          <div class="pipe-filter-group">
            <label>Período</label>
            <select class="fi pipe-filter-select" onchange="window._dashSetPeriod(this.value)">
              <option value="7d">Últimos 7 dias</option>
              <option value="30d" selected>Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="ytd">Este ano</option>
              <option value="all">Todo histórico</option>
            </select>
          </div>
          <div class="pipe-filter-group">
            <label>Scope</label>
            <select class="fi pipe-filter-select" onchange="window._dashSetScope(this.value)">
              <option value="all">B2B + B2C</option>
              <option value="b2b">Apenas B2B</option>
              <option value="b2c">Apenas B2C</option>
            </select>
          </div>
        </div>

        <!-- KPIs HERO (linha de 4) -->
        <div class="dash-kpi-row" id="dash-kpis"></div>

        <!-- CHARTS -->
        <div class="dash-charts-grid">
          <div class="dash-chart-card">
            <div class="dash-chart-hdr">
              <h3>Receita acumulada</h3>
              <span class="dash-chart-sub" id="dash-rev-sub">—</span>
            </div>
            <canvas id="dash-chart-revenue" height="180"></canvas>
          </div>
          <div class="dash-chart-card">
            <div class="dash-chart-hdr">
              <h3>Deals fechados por mês</h3>
              <span class="dash-chart-sub" id="dash-deals-sub">—</span>
            </div>
            <canvas id="dash-chart-deals" height="180"></canvas>
          </div>
        </div>

        <!-- LISTAS LADO A LADO -->
        <div class="dash-lists-grid">
          <div class="dash-list-card">
            <div class="dash-list-hdr">
              <h3>Próximos a fechar</h3>
              <span class="dash-list-sub" id="dash-closing-sub">—</span>
            </div>
            <div class="dash-list" id="dash-closing-list"></div>
          </div>
          <div class="dash-list-card">
            <div class="dash-list-hdr">
              <h3>Fontes dos clientes</h3>
              <span class="dash-list-sub">Origem dos contatos que viraram cliente</span>
            </div>
            <div class="dash-list" id="dash-sources-list"></div>
          </div>
        </div>

      </div>
    </div>`;

    // Load CRM se necessário
    if (!STATE.crm?.loaded && window.CRM?.loadAll) {
      await CRM.loadAll();
    }
    _renderAll();
    lucide.createIcons();
  }
  window.bDash = bDash;

  // ── FILTROS ────────────────────────────────────────────────
  window._dashSetPeriod = (v) => { F.period = v; _renderAll(); };
  window._dashSetScope = (v) => { F.scope = v; _renderAll(); };

  // ── CÁLCULOS ───────────────────────────────────────────────
  function _cardsFiltered() {
    let cards = STATE.crm?.cards || [];
    if (F.scope !== 'all') cards = cards.filter(c => c.scope === F.scope);
    return cards;
  }

  function _periodWindow() {
    const now = new Date();
    const start = new Date();
    if (F.period === '7d') start.setDate(start.getDate() - 7);
    else if (F.period === '30d') start.setDate(start.getDate() - 30);
    else if (F.period === '90d') start.setDate(start.getDate() - 90);
    else if (F.period === 'ytd') { start.setMonth(0); start.setDate(1); start.setHours(0, 0, 0, 0); }
    else return { start: new Date(0), end: now };
    return { start, end: now };
  }

  function _computeKPIs() {
    const cards = _cardsFiltered();
    const { start, end } = _periodWindow();
    const inPeriod = (d) => { const t = new Date(d).getTime(); return t >= start.getTime() && t <= end.getTime(); };

    // Won deals in period
    const wonInPeriod = cards.filter(c => _isWonStage(c.stage_id) && inPeriod(c.updated_at));
    const revenue = wonInPeriod.reduce((s, c) => s + (Number(c.value) || 0), 0);

    // Previous period for delta
    const periodDays = (end - start) / 86400000;
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - periodDays);
    const prevInPeriod = (d) => { const t = new Date(d).getTime(); return t >= prevStart.getTime() && t < start.getTime(); };
    const prevWon = cards.filter(c => _isWonStage(c.stage_id) && prevInPeriod(c.updated_at));
    const prevRev = prevWon.reduce((s, c) => s + (Number(c.value) || 0), 0);
    const revDelta = prevRev > 0 ? Math.round((revenue - prevRev) / prevRev * 100) : (revenue > 0 ? 100 : 0);

    // Open pipeline value (expected = sum of value × probability)
    const openCards = cards.filter(c => !_isWonStage(c.stage_id) && !_isLostStage(c.stage_id));
    const pipelineValue = openCards.reduce((s, c) => s + (Number(c.value) || 0) * (Number(c.probability) || 0) / 100, 0);

    // Conversion rate: contacts status = customer vs total non-churned contacts
    const contacts = STATE.crm?.contacts || [];
    const customers = contacts.filter(c => c.status === 'customer').length;
    const nonChurned = contacts.filter(c => c.status !== 'churned').length;
    const conversionRate = nonChurned > 0 ? Math.round(customers / nonChurned * 100) : 0;

    // Average deal size
    const avgTicket = wonInPeriod.length > 0 ? revenue / wonInPeriod.length : 0;

    return { revenue, revDelta, pipelineValue, conversionRate, avgTicket, wonCount: wonInPeriod.length, openCount: openCards.length, customers };
  }

  // ── RENDER ────────────────────────────────────────────────
  function _renderAll() {
    _renderKPIs();
    _renderRevenueChart();
    _renderDealsChart();
    _renderClosingSoon();
    _renderSources();
  }

  function _renderKPIs() {
    const k = _computeKPIs();
    const el = document.getElementById('dash-kpis');
    if (!el) return;
    el.innerHTML = `
      <div class="dash-kpi" style="--kpi-accent:#10b981">
        <div class="dash-kpi-hdr"><i data-lucide="banknote"></i><span>Receita no período</span></div>
        <div class="dash-kpi-val">${_fmt(k.revenue)}</div>
        <div class="dash-kpi-delta ${k.revDelta >= 0 ? 'pos' : 'neg'}">
          <i data-lucide="${k.revDelta >= 0 ? 'arrow-up-right' : 'arrow-down-right'}"></i>
          ${k.revDelta >= 0 ? '+' : ''}${k.revDelta}% vs anterior
        </div>
        <div class="dash-kpi-sub">${k.wonCount} deals fechados</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#6366f1">
        <div class="dash-kpi-hdr"><i data-lucide="git-branch"></i><span>Pipeline esperado</span></div>
        <div class="dash-kpi-val">${_fmt(k.pipelineValue)}</div>
        <div class="dash-kpi-delta">valor × probabilidade</div>
        <div class="dash-kpi-sub">${k.openCount} negociações abertas</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#f59e0b">
        <div class="dash-kpi-hdr"><i data-lucide="percent"></i><span>Taxa de conversão</span></div>
        <div class="dash-kpi-val">${k.conversionRate}%</div>
        <div class="dash-kpi-delta">contatos → clientes</div>
        <div class="dash-kpi-sub">${k.customers} clientes ativos</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#ec4899">
        <div class="dash-kpi-hdr"><i data-lucide="trending-up"></i><span>Ticket médio</span></div>
        <div class="dash-kpi-val">${_fmt(k.avgTicket)}</div>
        <div class="dash-kpi-delta">por deal fechado</div>
        <div class="dash-kpi-sub">base: ${k.wonCount} deals</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function _renderRevenueChart() {
    const canvas = document.getElementById('dash-chart-revenue');
    if (!canvas || typeof Chart === 'undefined') return;
    // Agrega receita por mês nos últimos 12 meses
    const now = new Date();
    const monthKeys = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
    }
    const cards = _cardsFiltered().filter(c => _isWonStage(c.stage_id));
    const monthMap = {}; monthKeys.forEach(m => monthMap[m.key] = 0);
    cards.forEach(c => {
      const k = (c.updated_at || '').substring(0, 7);
      if (monthMap[k] !== undefined) monthMap[k] += Number(c.value) || 0;
    });
    let cumulative = 0;
    const data = monthKeys.map(m => (cumulative += monthMap[m.key], cumulative));

    const total = data[data.length - 1] || 0;
    document.getElementById('dash-rev-sub').textContent = `Total 12m: ${_fmt(total)}`;

    if (window._dashRevChart) window._dashRevChart.destroy();
    const ctx = canvas.getContext('2d');
    window._dashRevChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthKeys.map(m => m.label),
        datasets: [{
          data,
          borderColor: '#10b981',
          backgroundColor: (ctx) => {
            const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 180);
            g.addColorStop(0, 'rgba(16,185,129,0.3)');
            g.addColorStop(1, 'rgba(16,185,129,0)');
            return g;
          },
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#10b981',
        }]
      },
      options: _chartOpts()
    });
  }

  function _renderDealsChart() {
    const canvas = document.getElementById('dash-chart-deals');
    if (!canvas || typeof Chart === 'undefined') return;
    const now = new Date();
    const monthKeys = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
    }
    const cards = STATE.crm?.cards || [];
    const b2b = {}; const b2c = {}; monthKeys.forEach(m => { b2b[m.key] = 0; b2c[m.key] = 0; });
    cards.filter(c => _isWonStage(c.stage_id)).forEach(c => {
      const k = (c.updated_at || '').substring(0, 7);
      if (c.scope === 'b2b' && b2b[k] !== undefined) b2b[k]++;
      if (c.scope === 'b2c' && b2c[k] !== undefined) b2c[k]++;
    });
    const b2bData = monthKeys.map(m => b2b[m.key]);
    const b2cData = monthKeys.map(m => b2c[m.key]);
    const total = b2bData.reduce((s, v) => s + v, 0) + b2cData.reduce((s, v) => s + v, 0);
    document.getElementById('dash-deals-sub').textContent = `${total} deals · últimos 6m`;

    if (window._dashDealsChart) window._dashDealsChart.destroy();
    const ctx = canvas.getContext('2d');
    window._dashDealsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthKeys.map(m => m.label),
        datasets: [
          { label: 'B2B', data: b2bData, backgroundColor: '#6366f1', borderRadius: 6 },
          { label: 'B2C', data: b2cData, backgroundColor: '#d946ef', borderRadius: 6 },
        ]
      },
      options: _chartOpts(true)
    });
  }

  function _renderClosingSoon() {
    const cards = _cardsFiltered()
      .filter(c => !_isWonStage(c.stage_id) && !_isLostStage(c.stage_id))
      .filter(c => (c.probability || 0) >= 60)
      .sort((a, b) => (b.probability || 0) - (a.probability || 0))
      .slice(0, 5);
    const el = document.getElementById('dash-closing-list');
    const sub = document.getElementById('dash-closing-sub');
    if (sub) sub.textContent = `${cards.length} com probabilidade ≥60%`;
    if (!el) return;
    if (!cards.length) {
      el.innerHTML = `<div class="dash-empty">Nenhuma negociação próxima a fechar.</div>`;
      return;
    }
    el.innerHTML = cards.map(c => {
      const contact = (STATE.crm.contacts || []).find(x => x.id === c.contact_id);
      const scopeCol = c.scope === 'b2b' ? '#6366f1' : '#d946ef';
      return `<div class="dash-list-item" onclick="openMod('pipeline')">
        <span class="dash-list-dot" style="background:${scopeCol}"></span>
        <div class="dash-list-main">
          <div class="dash-list-title">${_esc(c.title)}</div>
          <div class="dash-list-meta">${contact?.name || '—'} · ${_fmt(c.value)}</div>
        </div>
        <div class="dash-list-prob">${c.probability}%</div>
      </div>`;
    }).join('');
  }

  function _renderSources() {
    const customers = (STATE.crm?.contacts || []).filter(c => c.status === 'customer');
    const sources = {};
    customers.forEach(c => { const s = c.source || 'other'; sources[s] = (sources[s] || 0) + 1; });
    const total = customers.length;
    const el = document.getElementById('dash-sources-list');
    if (!el) return;
    if (!total) {
      el.innerHTML = `<div class="dash-empty">Nenhum cliente convertido ainda.</div>`;
      return;
    }
    const labels = { inbound: 'Inbound', outbound: 'Outbound', referral: 'Indicação', event: 'Evento', social: 'Redes sociais', other: 'Outro' };
    const colors = { inbound: '#10b981', outbound: '#6366f1', referral: '#f59e0b', event: '#ec4899', social: '#06b6d4', other: '#94a3b8' };
    el.innerHTML = Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([k, n]) => {
      const pct = Math.round(n / total * 100);
      return `<div class="dash-source-row">
        <span class="dash-source-dot" style="background:${colors[k] || '#94a3b8'}"></span>
        <span class="dash-source-label">${labels[k] || k}</span>
        <span class="dash-source-bar"><span class="dash-source-fill" style="width:${pct}%;background:${colors[k] || '#94a3b8'}"></span></span>
        <span class="dash-source-count">${n} <span style="color:var(--text3);font-weight:400">(${pct}%)</span></span>
      </div>`;
    }).join('');
  }

  function _chartOpts(stacked = false) {
    const isLight = (document.documentElement.getAttribute('data-theme') || 'dark') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
    const textColor = isLight ? '#475569' : '#94a3b8';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: stacked, position: 'bottom', labels: { color: textColor, font: { size: 11 }, usePointStyle: true, boxWidth: 6 } },
        tooltip: { backgroundColor: '#0f121c', borderColor: '#2a3142', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#94a3b8' },
      },
      scales: {
        x: { grid: { color: gridColor, display: false }, ticks: { color: textColor, font: { size: 10 } } },
        y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
      }
    };
  }

  function _esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function _fmt(v) {
    if (!v) return 'R$ 0';
    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
  }
})();
