// ══════════════════════════════════════════════════════════
// DASHBOARD — Resultados dos afiliados + funil comercial
// ══════════════════════════════════════════════════════════
// Dinheiro aqui vem SÓ dos resultados dos afiliados (public.reports →
// STATE.reports): depósitos, cadastros, FTDs e lucro (NGR).
// A pipeline (schema `crm`) entra apenas como funil: contagens de
// negociações, reuniões, fechamentos e conversão — nunca valor.
// ══════════════════════════════════════════════════════════

(function () {
  // Filtros do dashboard
  const F = { period: '30d', scope: 'all' };

  // Etapas: "Negócio Fechado" = ganho; "Follow Up" = pós-fechamento
  function _stageName(stageId) {
    const s = (STATE.crm?.stages || []).find(x => x.id === stageId);
    return (s?.name || '').toLowerCase();
  }
  function _isWonStage(stageId) {
    const name = _stageName(stageId);
    return name.includes('ganho') || name === 'ativo' || (name.includes('fechado') && !name.includes('perd'));
  }
  function _isLostStage(stageId) {
    const name = _stageName(stageId);
    return name.includes('perd') || name.includes('descart');
  }
  function _isFollowUpStage(stageId) { return _stageName(stageId).includes('follow'); }
  function _isMeetingStage(stageId) { return _stageName(stageId).includes('reuni'); }
  function _isFinalStage(stageId) {
    const name = _stageName(stageId);
    return name.includes('contrato') || name.includes('negocia');
  }
  function _isOpen(c) { return !_isWonStage(c.stage_id) && !_isLostStage(c.stage_id) && !_isFollowUpStage(c.stage_id); }
  function _daysSince(ts) { return ts ? Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)) : 0; }

  // ── MOUNT ─────────────────────────────────────────────────
  async function bDash(el) {
    el.innerHTML = `
    <div class="mod-wrap">
      ${modHdr('Dashboard — Comercial')}
      ${heroHTML('dashboard', 'CRM Comercial', 'Dashboard', 'Resultados dos afiliados e saúde do funil comercial')}
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
            <label>Funil</label>
            <select class="fi pipe-filter-select" onchange="window._dashSetScope(this.value)">
              <option value="all">B2C + B2B</option>
              <option value="b2c">Apenas B2C</option>
              <option value="b2b">Apenas B2B</option>
            </select>
          </div>
        </div>

        <!-- RESULTADOS DOS AFILIADOS -->
        <div class="dash-section-hdr">
          <h2>Resultados dos afiliados</h2>
          <span id="dash-aff-sub">—</span>
        </div>
        <div class="dash-kpi-row" id="dash-aff-kpis"></div>

        <div class="dash-charts-grid">
          <div class="dash-chart-card">
            <div class="dash-chart-hdr">
              <h3>NGR por mês</h3>
              <span class="dash-chart-sub" id="dash-ngr-sub">—</span>
            </div>
            <canvas id="dash-chart-ngr" height="180"></canvas>
          </div>
          <div class="dash-chart-card">
            <div class="dash-chart-hdr">
              <h3>FTDs por marca</h3>
              <span class="dash-chart-sub" id="dash-ftd-sub">—</span>
            </div>
            <canvas id="dash-chart-ftd" height="180"></canvas>
          </div>
        </div>

        <!-- FUNIL COMERCIAL -->
        <div class="dash-section-hdr">
          <h2>Funil comercial</h2>
          <span id="dash-funnel-sub">—</span>
        </div>
        <div class="dash-kpi-row" id="dash-kpis"></div>

        <div class="dash-lists-grid">
          <div class="dash-list-card">
            <div class="dash-list-hdr">
              <h3>Em fase final</h3>
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
  function _periodLabel() {
    return { '7d': 'últimos 7 dias', '30d': 'últimos 30 dias', '90d': 'últimos 90 dias', ytd: 'este ano', all: 'todo histórico' }[F.period] || '';
  }
  function _delta(cur, prev) {
    if (prev > 0) return Math.round((cur - prev) / prev * 100);
    return cur > 0 ? 100 : 0;
  }

  // Resultados dos afiliados no período (e no período anterior, p/ delta)
  function _computeAffiliate() {
    const { start, end } = _periodWindow();
    const periodDays = Math.max(1, Math.round((end - start) / 86400000));
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - periodDays);
    const prevEnd = new Date(start); prevEnd.setDate(prevEnd.getDate() - 1);
    const all = F.period === 'all';
    const cur = AFF.sum(AFF.rows(all ? null : AFF.dateKey(start), AFF.dateKey(end)));
    const prev = all ? AFF.sum([]) : AFF.sum(AFF.rows(AFF.dateKey(prevStart), AFF.dateKey(prevEnd)));
    return { cur, prev, hasData: (STATE.reports || []).length > 0 };
  }

  function _computeFunnel() {
    const cards = _cardsFiltered();
    const { start, end } = _periodWindow();
    const inPeriod = (d) => { const t = new Date(d).getTime(); return t >= start.getTime() && t <= end.getTime(); };
    const periodDays = (end - start) / 86400000;
    const prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - periodDays);
    const prevInPeriod = (d) => { const t = new Date(d).getTime(); return t >= prevStart.getTime() && t < start.getTime(); };

    const wonInPeriod = cards.filter(c => _isWonStage(c.stage_id) && inPeriod(c.updated_at));
    const prevWon = cards.filter(c => _isWonStage(c.stage_id) && prevInPeriod(c.updated_at));
    const openCards = cards.filter(_isOpen);
    const stalled = openCards.filter(c => _daysSince(c.updated_at) >= 7).length;
    const meetings = cards.filter(c => _isMeetingStage(c.stage_id)).length;
    const followUp = cards.filter(c => _isFollowUpStage(c.stage_id)).length;
    const createdInPeriod = cards.filter(c => inPeriod(c.created_at)).length;

    // Conversão: contatos status = customer vs total não-churned
    const contacts = STATE.crm?.contacts || [];
    const customers = contacts.filter(c => c.status === 'customer').length;
    const nonChurned = contacts.filter(c => c.status !== 'churned').length;
    const conversionRate = nonChurned > 0 ? Math.round(customers / nonChurned * 100) : 0;

    return {
      wonCount: wonInPeriod.length, wonDelta: _delta(wonInPeriod.length, prevWon.length),
      openCount: openCards.length, stalled, meetings, followUp, createdInPeriod,
      conversionRate, customers, total: cards.length,
    };
  }

  // ── RENDER ────────────────────────────────────────────────
  function _renderAll() {
    _renderAffiliateKPIs();
    _renderNgrChart();
    _renderFtdChart();
    _renderFunnelKPIs();
    _renderFinalStage();
    _renderSources();
  }

  function _renderAffiliateKPIs() {
    const { cur, prev, hasData } = _computeAffiliate();
    const el = document.getElementById('dash-aff-kpis');
    const sub = document.getElementById('dash-aff-sub');
    if (sub) sub.textContent = hasData
      ? `${_periodLabel()} · ${cur.affiliates.size} afiliado${cur.affiliates.size === 1 ? '' : 's'} · ${cur.brands.size} marca${cur.brands.size === 1 ? '' : 's'}`
      : 'nenhum resultado lançado ainda';
    if (!el) return;
    const deltaHTML = (d) => F.period === 'all' ? `<div class="dash-kpi-delta">todo histórico</div>` : `
        <div class="dash-kpi-delta ${d >= 0 ? 'pos' : 'neg'}">
          <i data-lucide="${d >= 0 ? 'arrow-up-right' : 'arrow-down-right'}"></i>
          ${d >= 0 ? '+' : ''}${d}% vs anterior
        </div>`;
    el.innerHTML = `
      <div class="dash-kpi" style="--kpi-accent:#3b82f6">
        <div class="dash-kpi-hdr"><i data-lucide="wallet"></i><span>Depósitos</span></div>
        <div class="dash-kpi-val">${_fmt(cur.deposits)}</div>
        ${deltaHTML(_delta(cur.deposits, prev.deposits))}
        <div class="dash-kpi-sub">volume depositado pelos jogadores</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#a855f7">
        <div class="dash-kpi-hdr"><i data-lucide="user-plus"></i><span>Cadastros</span></div>
        <div class="dash-kpi-val">${_fmtInt(cur.registrations)}</div>
        ${deltaHTML(_delta(cur.registrations, prev.registrations))}
        <div class="dash-kpi-sub">contas criadas via afiliados</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#f59e0b">
        <div class="dash-kpi-hdr"><i data-lucide="badge-check"></i><span>FTDs</span></div>
        <div class="dash-kpi-val">${_fmtInt(cur.ftd)}</div>
        ${deltaHTML(_delta(cur.ftd, prev.ftd))}
        <div class="dash-kpi-sub">${_fmtInt(cur.qftd)} qualificados (QFTD)</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#10b981">
        <div class="dash-kpi-hdr"><i data-lucide="banknote"></i><span>Lucro (NGR)</span></div>
        <div class="dash-kpi-val" style="${cur.ngr < 0 ? 'color:var(--red)' : ''}">${_fmt(cur.ngr)}</div>
        ${deltaHTML(_delta(cur.ngr, prev.ngr))}
        <div class="dash-kpi-sub">net gaming revenue no período</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function _renderFunnelKPIs() {
    const k = _computeFunnel();
    const el = document.getElementById('dash-kpis');
    const sub = document.getElementById('dash-funnel-sub');
    if (sub) sub.textContent = `${k.total} negociaç${k.total === 1 ? 'ão' : 'ões'} · ${F.scope === 'all' ? 'B2C + B2B' : F.scope.toUpperCase()}`;
    if (!el) return;
    el.innerHTML = `
      <div class="dash-kpi" style="--kpi-accent:#10b981">
        <div class="dash-kpi-hdr"><i data-lucide="handshake"></i><span>Negócios fechados</span></div>
        <div class="dash-kpi-val">${k.wonCount}</div>
        <div class="dash-kpi-delta ${k.wonDelta >= 0 ? 'pos' : 'neg'}">
          <i data-lucide="${k.wonDelta >= 0 ? 'arrow-up-right' : 'arrow-down-right'}"></i>
          ${k.wonDelta >= 0 ? '+' : ''}${k.wonDelta}% vs anterior
        </div>
        <div class="dash-kpi-sub">${k.followUp} em follow up</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#3b82f6">
        <div class="dash-kpi-hdr"><i data-lucide="calendar-check"></i><span>Reuniões agendadas</span></div>
        <div class="dash-kpi-val">${k.meetings}</div>
        <div class="dash-kpi-delta">na etapa agora</div>
        <div class="dash-kpi-sub">${k.createdInPeriod} negociações novas no período</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#f59e0b">
        <div class="dash-kpi-hdr"><i data-lucide="git-branch"></i><span>Em andamento</span></div>
        <div class="dash-kpi-val">${k.openCount}</div>
        <div class="dash-kpi-delta ${k.stalled ? 'neg' : ''}">${k.stalled ? `<i data-lucide="hourglass"></i>${k.stalled} parada${k.stalled === 1 ? '' : 's'} há 7+ dias` : 'nenhuma parada'}</div>
        <div class="dash-kpi-sub">wishlist → contrato</div>
      </div>
      <div class="dash-kpi" style="--kpi-accent:#e4407f">
        <div class="dash-kpi-hdr"><i data-lucide="percent"></i><span>Taxa de conversão</span></div>
        <div class="dash-kpi-val">${k.conversionRate}%</div>
        <div class="dash-kpi-delta">contatos → clientes</div>
        <div class="dash-kpi-sub">${k.customers} clientes ativos</div>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  }

  function _monthKeys(n) {
    const now = new Date();
    const keys = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
    }
    return keys;
  }

  function _renderNgrChart() {
    const canvas = document.getElementById('dash-chart-ngr');
    if (!canvas || typeof Chart === 'undefined') return;
    const months = _monthKeys(12);
    const map = {}; months.forEach(m => map[m.key] = 0);
    (STATE.reports || []).forEach(r => {
      const k = String(r.date || '').substring(0, 7);
      if (map[k] !== undefined) map[k] += Number(r.netRev) || 0;
    });
    const data = months.map(m => map[m.key]);
    const total = data.reduce((s, v) => s + v, 0);
    document.getElementById('dash-ngr-sub').textContent = (STATE.reports || []).length ? `Total 12m: ${_fmt(total)}` : 'Sem dados';

    if (window._dashNgrChart) window._dashNgrChart.destroy();
    const pos = cssVar('--theme'), neg = cssVar('--red', '#ef4444');
    window._dashNgrChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: [{ data, backgroundColor: data.map(v => v < 0 ? neg : pos), borderRadius: 4 }]
      },
      options: _chartOpts(false, (v) => _fmt(v))
    });
  }

  function _renderFtdChart() {
    const canvas = document.getElementById('dash-chart-ftd');
    if (!canvas || typeof Chart === 'undefined') return;
    const months = _monthKeys(6);
    const byBrand = {};
    (STATE.reports || []).forEach(r => {
      const k = String(r.date || '').substring(0, 7);
      if (!months.some(m => m.key === k)) return;
      const b = r.brand || 'Outros';
      if (!byBrand[b]) { byBrand[b] = {}; months.forEach(m => byBrand[b][m.key] = 0); }
      byBrand[b][k] += Number(r.ftd) || 0;
    });
    const palette = [cssVar('--theme'), cssVar('--blue', '#3b82f6'), cssVar('--amber', '#f59e0b'), cssVar('--purple', '#a855f7'), cssVar('--green', '#10b981'), cssVar('--text3', '#8a919e')];
    const brands = Object.keys(byBrand).sort((a, b) => {
      const sa = Object.values(byBrand[a]).reduce((s, v) => s + v, 0), sb = Object.values(byBrand[b]).reduce((s, v) => s + v, 0);
      return sb - sa;
    });
    const total = brands.reduce((s, b) => s + Object.values(byBrand[b]).reduce((x, v) => x + v, 0), 0);
    document.getElementById('dash-ftd-sub').textContent = total ? `${_fmtInt(total)} FTDs · últimos 6m` : 'Sem dados';

    if (window._dashFtdChart) window._dashFtdChart.destroy();
    window._dashFtdChart = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: months.map(m => m.label),
        datasets: brands.map((b, i) => ({ label: b, data: months.map(m => byBrand[b][m.key]), backgroundColor: palette[i % palette.length], borderRadius: 4 }))
      },
      options: _chartOpts(true)
    });
  }

  function _renderFinalStage() {
    const cards = _cardsFiltered()
      .filter(c => _isFinalStage(c.stage_id))
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .slice(0, 5);
    const el = document.getElementById('dash-closing-list');
    const sub = document.getElementById('dash-closing-sub');
    if (sub) sub.textContent = `${cards.length} em negociação ou contrato`;
    if (!el) return;
    if (!cards.length) {
      el.innerHTML = `<div class="dash-empty">Nenhuma negociação em fase final.</div>`;
      return;
    }
    el.innerHTML = cards.map(c => {
      const contact = (STATE.crm.contacts || []).find(x => x.id === c.contact_id);
      const stage = (STATE.crm.stages || []).find(x => x.id === c.stage_id);
      const scopeCol = c.scope === 'b2b' ? 'var(--blue)' : 'var(--theme)';
      const days = _daysSince(c.updated_at);
      return `<div class="dash-list-item" onclick="openMod('pipeline')">
        <span class="dash-list-dot" style="background:${scopeCol}"></span>
        <div class="dash-list-main">
          <div class="dash-list-title">${_esc(c.title)}</div>
          <div class="dash-list-meta">${_esc(contact?.name || '—')} · ${days === 0 ? 'atualizado hoje' : `há ${days} dia${days === 1 ? '' : 's'}`}</div>
        </div>
        <div class="dash-list-prob" style="color:${stage?.color || 'var(--text)'}">${_esc(stage?.name || '—')}</div>
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
    const colors = { inbound: 'var(--green)', outbound: 'var(--blue)', referral: 'var(--amber)', event: 'var(--purple)', social: 'var(--theme)', other: 'var(--text3)' };
    el.innerHTML = Object.entries(sources).sort((a, b) => b[1] - a[1]).map(([k, n]) => {
      const pct = Math.round(n / total * 100);
      return `<div class="dash-source-row">
        <span class="dash-source-dot" style="background:${colors[k] || 'var(--text3)'}"></span>
        <span class="dash-source-label">${labels[k] || k}</span>
        <span class="dash-source-bar"><span class="dash-source-fill" style="width:${pct}%;background:${colors[k] || 'var(--text3)'}"></span></span>
        <span class="dash-source-count">${n} <span style="color:var(--text3);font-weight:400">(${pct}%)</span></span>
      </div>`;
    }).join('');
  }

  function _chartOpts(stacked = false, tickFmt = null) {
    const gridColor = cssVar('--gb', 'rgba(128,128,128,0.15)');
    const textColor = cssVar('--text3', '#8a919e');
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: stacked, position: 'bottom', labels: { color: textColor, font: { size: 11 }, usePointStyle: true, boxWidth: 6 } },
        tooltip: { backgroundColor: cssVar('--text'), titleColor: cssVar('--bg'), bodyColor: cssVar('--bg'), padding: 10, cornerRadius: 6, displayColors: stacked },
      },
      scales: {
        x: { stacked, grid: { color: gridColor, display: false }, ticks: { color: textColor, font: { size: 10 } } },
        y: { stacked, beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 }, ...(tickFmt ? { callback: tickFmt } : {}) } },
      }
    };
  }

  function _esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function _fmtInt(v) { return new Intl.NumberFormat('pt-BR').format(Math.round(Number(v) || 0)); }
  function _fmt(v) {
    if (!v) return 'R$ 0';
    if (v < 0) return '-' + _fmt(-v);
    if (v >= 1000000) return 'R$ ' + (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v);
  }
})();
