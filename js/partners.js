// ══════════════════════════════════════════════════════════
// CRM — PARCEIROS ATIVOS (escopo · entregas · calendário)
// ══════════════════════════════════════════════════════════
// Tabelas (schema crm): partners, partner_scope, partner_deliveries.
// Só parcerias de VALOR FIXO (RevShare/permuta/variável têm escopo livre).
// Parceiro nasce sozinho quando um card Fixo do Pipeline vai para uma etapa
// "ganho" (trigger no banco) ou é cadastrado na mão aqui.
// Escopo: o que foi combinado (ex.: 4 reels/mês). Entregas: cada peça
// prevista com data, status e link. Escopo mensal conta por mês; pacote
// conta no total.
// ══════════════════════════════════════════════════════════

(function () {
  const KINDS = [
    { id: 'reel', label: 'Reel', icon: 'clapperboard' },
    { id: 'story', label: 'Stories', icon: 'circle-dashed' },
    { id: 'post', label: 'Post no feed', icon: 'image' },
    { id: 'short', label: 'TikTok / Shorts', icon: 'smartphone' },
    { id: 'video', label: 'Vídeo longo', icon: 'play' },
    { id: 'live', label: 'Live', icon: 'radio' },
    { id: 'other', label: 'Outro', icon: 'sparkles' },
  ];
  const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitch', 'Kick', 'X', 'Discord', 'Outro'];
  const P_STATUS = {
    onboarding: { label: 'Onboarding', color: 'var(--amber)' },
    active: { label: 'Ativo', color: 'var(--green)' },
    paused: { label: 'Pausado', color: 'var(--text3)' },
    ended: { label: 'Encerrado', color: 'var(--text3)' },
  };
  const D_STATUS = {
    planned: { label: 'Prevista', color: 'var(--blue)' },
    late: { label: 'Atrasada', color: 'var(--red)' },
    delivered: { label: 'Entregue', color: 'var(--amber)' },
    approved: { label: 'Aprovada', color: 'var(--green)' },
    rejected: { label: 'Refazer', color: 'var(--red)' },
  };
  const TABLE_KEY = { partners: 'partners', partner_scope: 'partnerScope', partner_deliveries: 'partnerDeliveries', partner_results: 'partnerResults' };
  // Métricas de negócio por mês (somam no Dashboard, mesmos nomes dos relatórios)
  const RESULT_FIELDS = [
    { id: 'registrations', label: 'Cadastros', money: false },
    { id: 'ftd', label: 'FTDs', money: false },
    { id: 'deposits', label: 'Depósitos', money: true },
    { id: 'net_rev', label: 'Receita', money: true },
  ];
  // Desempenho do conteúdo (por entrega)
  const CONTENT_FIELDS = [
    { id: 'views', label: 'Views' }, { id: 'likes', label: 'Curtidas' }, { id: 'comments', label: 'Comentários' },
    { id: 'shares', label: 'Compart.' }, { id: 'clicks', label: 'Cliques' },
  ];
  const PRODUCT_ORDER = ['rips', 'chute', 'cap', 'fortuna'];
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  // ── Estado da tela ──
  let _view = sessionStorage.getItem('ptn_view') || 'list';
  let _product = sessionStorage.getItem('ptn_product') || '';
  let _status = 'live';
  let _search = '';
  let _month = _monthStart(new Date());
  let _detailId = null;      // parceiro aberto no modal
  let _detailMonth = null;   // mês mostrado dentro do modal
  let _contractOpen = false; // seção "Contrato e dados" aberta no modal

  // ── Utilidades ──
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  function _iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
  function _parse(s) { if (!s) return null; const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
  function _monthStart(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function _monthEnd(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function _addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function _addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function _fmt(s) { const d = _parse(s); return d ? `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}` : '—'; }
  function _monthLabel(d) { return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  const _today = () => _iso(new Date());
  const kindOf = (id) => KINDS.find(k => k.id === id) || KINDS[KINDS.length - 1];
  const sb = () => window.sb.schema('crm');
  const L = (key) => (STATE.crm[key] = STATE.crm[key] || []);
  const partnerById = (id) => L('partners').find(p => p.id === id);
  const productById = (id) => (STATE.crm.products || []).find(p => p.id === id);
  const userById = (id) => (STATE.users || []).find(u => u.id === id);
  const scopeOf = (pid) => L('partnerScope').filter(s => s.partner_id === pid).sort((a, b) => (a.position - b.position) || String(a.created_at).localeCompare(String(b.created_at)));
  const delivsOf = (pid) => L('partnerDeliveries').filter(d => d.partner_id === pid);
  const isDone = (d) => d.status === 'delivered' || d.status === 'approved';
  const dStatus = (d) => (d.status === 'planned' && d.due_date && d.due_date < _today()) ? 'late' : d.status;
  const inMonth = (s, m) => !!s && s >= _iso(m) && s <= _iso(_monthEnd(m));

  // Entregas que contam para o período: mensal → mês; pacote → tudo.
  function _periodDelivs(p, month) {
    const all = delivsOf(p.id);
    if (p.scope_mode === 'package') return all;
    return all.filter(d => inMonth(d.due_date, month));
  }
  function _progress(p, month) {
    const scope = scopeOf(p.id);
    const delivs = _periodDelivs(p, month);
    const target = scope.reduce((n, s) => n + s.qty, 0);
    const done = delivs.filter(isDone).length;
    const rows = scope.map(s => {
      const mine = delivs.filter(d => d.scope_id ? d.scope_id === s.id : (d.kind === s.kind && (d.platform || '') === (s.platform || '')));
      return { s, done: mine.filter(isDone).length, planned: mine.length };
    });
    return { target, done, planned: delivs.length, rows };
  }

  // ── Dados ──
  // CRM.loadAll já traz as tabelas de parceiros (crm-data.js); aqui só
  // garante que estão frescas ao abrir o módulo.
  async function _load() {
    if (!STATE.crm.loaded && window.CRM?.loadAll) await CRM.loadAll();
    return CRM.loadPartners ? CRM.loadPartners() : false;
  }
  async function _ins(table, payload) {
    const { data, error } = await sb().from(table).insert(payload).select();
    if (error) throw error;
    const list = L(TABLE_KEY[table]);
    (data || []).forEach(r => { if (!list.some(x => x.id === r.id)) list.push(r); });
    return data || [];
  }
  async function _upd(table, id, patch) {
    const { data, error } = await sb().from(table).update(patch).eq('id', id).select().single();
    if (error) throw error;
    const list = L(TABLE_KEY[table]);
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) list[i] = data; else list.push(data);
    return data;
  }
  async function _del(table, id) {
    const { error } = await sb().from(table).delete().eq('id', id);
    if (error) throw error;
    const list = L(TABLE_KEY[table]);
    const i = list.findIndex(x => x.id === id);
    if (i >= 0) list.splice(i, 1);
    if (table === 'partners') {
      STATE.crm.partnerScope = L('partnerScope').filter(x => x.partner_id !== id);
      STATE.crm.partnerDeliveries = L('partnerDeliveries').filter(x => x.partner_id !== id);
    }
  }
  const _err = (e) => toast('Erro: ' + (e?.message || 'desconhecido'), 'e');

  // ── MÓDULO ──
  async function bPartners(el) {
    el.innerHTML = modHdr('Parceiros') + `<div class="mod-body">
      ${heroHTML('partners', 'Operação', 'Parceiros Ativos', 'Escopo, entregas e calendário das parcerias de valor fixo')}
      <div class="mod-main">
        <div class="ptn-bar-top">
          <div class="pcrm-tabs ptn-products" id="ptn-products" role="tablist" aria-label="Produto"></div>
          <div class="ptn-toolbar-r">
            <button class="btn btn-outline" id="ptn-import-btn" onclick="window._ptnImportOpen()" style="display:${_view === 'results' ? '' : 'none'}"><i data-lucide="upload"></i> Importar CSV</button>
            <button class="btn btn-theme" onclick="window._ptnNewPartner()"><i data-lucide="plus"></i> Parceiro</button>
          </div>
        </div>
        <div class="ptn-toolbar">
          <div class="ptn-seg" role="tablist" aria-label="Visão">
            <button data-v="list" class="${_view === 'list' ? 'on' : ''}" onclick="window._ptnView('list')"><i data-lucide="layout-grid"></i> Parceiros</button>
            <button data-v="calendar" class="${_view === 'calendar' ? 'on' : ''}" onclick="window._ptnView('calendar')"><i data-lucide="calendar-days"></i> Calendário</button>
            <button data-v="results" class="${_view === 'results' ? 'on' : ''}" onclick="window._ptnView('results')"><i data-lucide="chart-no-axes-combined"></i> Resultados</button>
          </div>
          <label class="ptn-search"><i data-lucide="search"></i>
            <input placeholder="Buscar parceiro" value="${esc(_search)}" oninput="window._ptnSearch(this.value)" aria-label="Buscar parceiro"></label>
          <select class="ptn-ctl" onchange="window._ptnStatus(this.value)" aria-label="Situação">
            <option value="live" ${_status === 'live' ? 'selected' : ''}>Em operação</option>
            ${Object.entries(P_STATUS).map(([k, v]) => `<option value="${k}" ${_status === k ? 'selected' : ''}>${v.label}</option>`).join('')}
            <option value="all" ${_status === 'all' ? 'selected' : ''}>Todas as situações</option>
          </select>
          <div class="ptn-month">
            <button class="hdr-icon-btn" onclick="window._ptnMonth(-1)" title="Mês anterior" aria-label="Mês anterior"><i data-lucide="chevron-left"></i></button>
            <span id="ptn-month-label"></span>
            <button class="hdr-icon-btn" onclick="window._ptnMonth(1)" title="Próximo mês" aria-label="Próximo mês"><i data-lucide="chevron-right"></i></button>
            <button class="ptn-today" id="ptn-today" onclick="window._ptnMonth(0)">Hoje</button>
          </div>
        </div>
        <div class="kpi-row" id="ptn-kpis"></div>
        <div id="ptn-content"><div class="empty"><i data-lucide="loader"></i><p>Carregando...</p></div></div>
      </div></div>`;
    lucide.createIcons();
    if (STATE.crm.ptnLoaded) _render();
    const ok = await _load();
    if (!ok && !STATE.crm.ptnLoaded) {
      document.getElementById('ptn-content').innerHTML = `<div class="empty crm-load-err">
        <i data-lucide="cloud-off" style="color:var(--amber)"></i>
        <p><strong>Não foi possível carregar os parceiros.</strong> ${esc(STATE.crm.ptnError)}</p>
        <button class="btn btn-theme" onclick="openMod('partners')"><i data-lucide="refresh-cw"></i> Tentar de novo</button></div>`;
      lucide.createIcons();
      return;
    }
    _render();
  }
  window.bPartners = bPartners;
  // Tempo real (crm-data.js) → redesenha a lista; o modal aberto não é tocado.
  window._ptnRefresh = () => { if (document.querySelector('#mod-partners.active #ptn-content')) _render(); };

  window._ptnView = (v) => {
    _view = v; sessionStorage.setItem('ptn_view', v);
    document.querySelectorAll('.ptn-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
    const ib = document.getElementById('ptn-import-btn'); if (ib) ib.style.display = v === 'results' ? '' : 'none';
    _render();
  };
  window._ptnProduct = (id) => { _product = id; sessionStorage.setItem('ptn_product', id); _render(); };
  window._ptnStatus = (v) => { _status = v; _render(); };
  window._ptnSearch = (v) => { _search = v; _render(); };
  window._ptnMonth = (n) => { _month = n === 0 ? _monthStart(new Date()) : _addMonths(_month, n); _render(); };

  // Cada produto é um mundo à parte: abas fixas, nunca "todos".
  function _products() {
    const rank = (n) => { const i = PRODUCT_ORDER.indexOf((n || '').toLowerCase()); return i < 0 ? 99 : i; };
    return (STATE.crm.products || [])
      .filter(pr => pr.status !== 'inactive' || L('partners').some(p => p.product_id === pr.id))
      .sort((a, b) => (rank(a.name) - rank(b.name)) || a.name.localeCompare(b.name));
  }
  // Parceiros do produto da aba (sem filtros de busca/situação)
  const _inProduct = () => L('partners').filter(p => p.product_id === _product);

  function _filtered() {
    const q = _search.trim().toLowerCase();
    return _inProduct().filter(p =>
      (_status === 'all' || (_status === 'live' ? (p.status === 'active' || p.status === 'onboarding') : p.status === _status)) &&
      (!q || (p.name || '').toLowerCase().includes(q))
    );
  }

  function _render() {
    if (window._calRefresh) window._calRefresh();
    const products = _products();
    if (!products.some(pr => pr.id === _product)) _product = products[0]?.id || '';
    const pEl = document.getElementById('ptn-products');
    if (pEl) pEl.innerHTML = products.map(pr => {
      const n = L('partners').filter(p => p.product_id === pr.id && p.status !== 'ended').length;
      return `<button class="pcrm-tab prod-tab ${_product === pr.id ? 'on' : ''}" style="--pc:${prodColor(pr)}" onclick="window._ptnProduct('${pr.id}')">
        ${prodMark(pr, 16)}<span>${esc(pr.name)}</span><span class="pcrm-tab-count">${n}</span></button>`;
    }).join('');
    const ml = document.getElementById('ptn-month-label');
    if (ml) ml.textContent = _monthLabel(_month);
    const tb = document.getElementById('ptn-today');
    if (tb) tb.classList.toggle('on', _iso(_month) === _iso(_monthStart(new Date())));

    const list = _filtered();
    _renderKpis(list);
    const c = document.getElementById('ptn-content');
    if (!c) return;
    c.innerHTML = _view === 'calendar' ? _calendarHTML(list) : _view === 'results' ? _resultsHTML(list) : _listHTML(list);
    lucide.createIcons();
  }

  function _renderKpis(list) {
    const ids = new Set(list.map(p => p.id));
    const delivs = L('partnerDeliveries').filter(d => ids.has(d.partner_id));
    const monthD = delivs.filter(d => inMonth(d.due_date, _month));
    const today = _today(), in7 = _iso(_addDays(new Date(), 7));
    const late = delivs.filter(d => dStatus(d) === 'late').length;
    const next7 = delivs.filter(d => d.status === 'planned' && d.due_date >= today && d.due_date <= in7).length;
    const toReview = delivs.filter(d => d.status === 'delivered').length;
    const live = list.filter(p => p.status === 'active' || p.status === 'onboarding').length;
    const kpi = (icon, lbl, val, sub, color) => `<div class="kpi"><div class="kpi-icon-row"><i data-lucide="${icon}"></i><span class="kpi-lbl">${lbl}</span></div>
      <div class="kpi-val sm" ${color ? `style="color:${color}"` : ''}>${val}</div><div class="kpi-sub">${sub}</div></div>`;
    const el = document.getElementById('ptn-kpis');
    if (el && _view === 'results') {
      const t = _resultTotals(list, _month);
      const cpa = t.registrations ? t.invest / t.registrations : null;
      el.hidden = !t.invest && !t.registrations && !t.deposits && !t.views;
      el.innerHTML =
        kpi('wallet', 'Investimento', _brl(t.invest), `valor fixo de ${t.paid} parceiro${t.paid === 1 ? '' : 's'} em ${MONTHS[_month.getMonth()]}`) +
        kpi('user-plus', 'Cadastros', _int(t.registrations), `${_int(t.ftd)} FTDs no mês`) +
        kpi('banknote', 'Depósitos', _brl(t.deposits), `receita ${_brl(t.net_rev)}`) +
        kpi('target', 'Custo por cadastro', cpa == null ? '—' : _brl(cpa), t.views ? `${_int(t.views)} views nas entregas` : 'investimento ÷ cadastros');
      return;
    }
    if (el) el.hidden = !live && !monthD.length && !late && !next7 && !toReview;
    if (el) el.innerHTML =
      kpi('handshake', 'Em operação', live, `${list.filter(p => p.status === 'onboarding').length} em onboarding`) +
      kpi('list-checks', 'Entregas do mês', `${monthD.filter(isDone).length}/${monthD.length}`, `feitas / previstas em ${MONTHS[_month.getMonth()]}`) +
      kpi('alarm-clock', 'Atrasadas', late, late ? 'previstas com data vencida' : 'nada atrasado', late ? 'var(--red)' : '') +
      kpi('calendar-clock', 'Próximos 7 dias', next7, toReview ? `${toReview} aguardando aprovação` : 'entregas previstas');
  }

  // ── RESULTADOS ──
  const _int = (n) => Math.round(Number(n) || 0).toLocaleString('pt-BR');
  const _brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Math.abs(Number(n) || 0) >= 1000 ? 0 : 2 });
  const resultOf = (pid, month) => L('partnerResults').find(r => r.partner_id === pid && String(r.period).slice(0, 10) === _iso(month));
  // Parceiro conta investimento no mês se o contrato estava valendo nele.
  function _activeIn(p, month) {
    const s = p.start_date || '0000-01-01', e = p.end_date || '9999-12-31';
    return s <= _iso(_monthEnd(month)) && e >= _iso(month) && p.status !== 'paused';
  }
  function _contentOf(pid, month) {
    const t = { views: 0, likes: 0, comments: 0, shares: 0, clicks: 0, done: 0 };
    delivsOf(pid).filter(d => isDone(d) && inMonth(d.due_date, month)).forEach(d => {
      t.done++; CONTENT_FIELDS.forEach(f => { t[f.id] += Number(d[f.id]) || 0; });
    });
    return t;
  }
  function _resultTotals(list, month) {
    const t = { invest: 0, paid: 0, registrations: 0, ftd: 0, deposits: 0, net_rev: 0, views: 0 };
    list.forEach(p => {
      if (_activeIn(p, month) && Number(p.monthly_value) > 0) { t.invest += Number(p.monthly_value); t.paid++; }
      const r = resultOf(p.id, month);
      RESULT_FIELDS.forEach(f => { t[f.id] += Number(r?.[f.id]) || 0; });
      t.views += _contentOf(p.id, month).views;
    });
    return t;
  }

  function _resultsHTML(list) {
    if (!list.length) return _listHTML(list);
    const rows = [...list].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
      const r = resultOf(p.id, _month);
      const c = _contentOf(p.id, _month);
      const pr = _progress(p, _month);
      const inv = _activeIn(p, _month) ? Number(p.monthly_value) || 0 : 0;
      const cpa = inv && r?.registrations ? _brl(inv / r.registrations) : '—';
      const eng = c.likes + c.comments + c.shares;
      return `<tr>
        <td><button class="ptn-link" onclick="window._ptnOpen('${p.id}')">${esc(p.name)}</button>
          <div class="ptn-td-sub">${inv ? _brl(inv) + '/mês' : 'sem valor no mês'}${r?.source === 'import' ? ' · importado' : ''}</div></td>
        <td class="num">${pr.target ? `${pr.done}/${pr.target}` : c.done}</td>
        <td class="num">${c.views ? _int(c.views) : '—'}</td>
        <td class="num">${eng ? _int(eng) : '—'}</td>
        ${RESULT_FIELDS.map(f => `<td class="num"><input class="ptn-cell" type="number" min="0" step="${f.money ? '0.01' : '1'}"
          value="${r && Number(r[f.id]) ? r[f.id] : ''}" placeholder="0"
          onchange="window._ptnResultSet('${p.id}', '${f.id}', this.value)" aria-label="${f.label} de ${esc(p.name)}"></td>`).join('')}
        <td class="num">${cpa}</td>
      </tr>`;
    }).join('');
    const t = _resultTotals(list, _month);
    return `<div class="ptn-hint" style="margin-bottom:10px">Resultados de ${_monthLabel(_month)}. Digite direto na tabela ou importe um CSV. Os números entram nos totais do Dashboard.</div>
      <div class="tbl-wrap"><table class="ptn-table">
        <thead><tr><th>Parceiro</th><th class="num">Entregas</th><th class="num">Views</th><th class="num">Engaj.</th>
          ${RESULT_FIELDS.map(f => `<th class="num">${f.label}${f.money ? ' (R$)' : ''}</th>`).join('')}<th class="num">Custo/cad.</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr><td>Total</td><td></td><td class="num">${t.views ? _int(t.views) : '—'}</td><td></td>
          ${RESULT_FIELDS.map(f => `<td class="num">${f.money ? _brl(t[f.id]) : _int(t[f.id])}</td>`).join('')}
          <td class="num">${t.registrations && t.invest ? _brl(t.invest / t.registrations) : '—'}</td></tr></tfoot>
      </table></div>`;
  }

  // Grava um número de resultado (cria a linha do mês se não existir)
  window._ptnResultSet = async (pid, field, value) => {
    const v = value === '' ? 0 : Number(value);
    if (!(v >= 0)) { toast('Valor inválido', 'w'); return; }
    const cur = resultOf(pid, _month);
    try {
      if (cur) await _upd('partner_results', cur.id, { [field]: v, source: 'manual' });
      else await _ins('partner_results', { partner_id: pid, period: _iso(_month), [field]: v, source: 'manual' });
      _renderKpis(_filtered());
      const tf = document.querySelector('.ptn-table tfoot');
      if (tf) { const c = document.getElementById('ptn-content'); const y = window.scrollY; c.innerHTML = _resultsHTML(_filtered()); lucide.createIcons(); window.scrollTo(0, y); }
    } catch (e) { _err(e); }
  };

  // ── IMPORTAÇÃO CSV ──
  // Colunas aceitas (qualquer ordem, nomes flexíveis): parceiro, mês/data,
  // cadastros, ftd, depositos, receita/ngr. Linhas diárias são somadas por mês.
  // Importação substitui os números daquele parceiro naquele mês.
  window._ptnImportOpen = () => {
    const prod = productById(_product);
    openModal(`Importar resultados · ${prod?.name || ''}`, `
      <div class="ptn-hint" style="margin-bottom:12px">
        Arquivo CSV com uma linha por parceiro e mês (ou por dia, que eu somo por mês). Colunas reconhecidas:
        <b>parceiro</b>, <b>mês</b> ou <b>data</b>, <b>cadastros</b>, <b>ftd</b>, <b>depósitos</b>, <b>receita</b> (ou ngr).
        Só entram parceiros de ${esc(prod?.name || 'este produto')}; os números importados substituem os do mês.
      </div>
      <input type="file" accept=".csv,text/csv" class="fi" id="ptn-imp-file" onchange="window._ptnImportRead(this.files[0])">
      <div id="ptn-imp-preview" style="margin-top:14px"></div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
       <button class="btn btn-theme" id="ptn-imp-go" disabled onclick="window._ptnImportGo()"><i data-lucide="upload"></i> Importar</button>`);
    lucide.createIcons();
  };
  const _norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  function _csvParse(text) {
    const first = text.split(/\r?\n/)[0] || '';
    const sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') q = false; else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim()));
  }
  function _num(s) {
    let t = String(s || '').replace(/[^\d,.-]/g, '');
    if (!t) return 0;
    if (t.includes(',') && t.includes('.')) t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
    else if (t.includes(',')) t = /,\d{3}$/.test(t) && !/,\d{1,2}$/.test(t) ? t.replace(/,/g, '') : t.replace(',', '.');
    return Number(t) || 0;
  }
  function _month0(s) {
    const t = String(s || '').trim();
    let m;
    if ((m = t.match(/^(\d{4})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2, '0')}-01`;
    if ((m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-01`; }
    if ((m = t.match(/^(\d{1,2})\/(\d{4})/))) return `${m[2]}-${m[1].padStart(2, '0')}-01`;
    const mi = MONTHS.findIndex(x => _norm(t).startsWith(_norm(x).slice(0, 3)));
    if (mi >= 0) { const y = (t.match(/\d{4}/) || [String(_month.getFullYear())])[0]; return `${y}-${String(mi + 1).padStart(2, '0')}-01`; }
    return null;
  }
  window._ptnImportRead = async (file) => {
    const box = document.getElementById('ptn-imp-preview');
    if (!file) return;
    const rows = _csvParse(await file.text());
    if (rows.length < 2) { box.innerHTML = '<div class="ptn-hint">Arquivo vazio.</div>'; return; }
    const head = rows[0].map(_norm);
    const col = (...keys) => head.findIndex(h => keys.some(k => h.includes(k)));
    const ci = {
      name: col('parceiro', 'creator', 'criador', 'afiliado', 'nome', 'influenc'),
      month: col('mes', 'periodo', 'data', 'date', 'month'),
      registrations: col('cadastro', 'registr', 'signup'),
      ftd: col('ftd', 'primeira', 'first'),
      deposits: col('deposit'),
      net_rev: col('receita', 'ngr', 'net', 'revenue', 'faturamento', 'lucro'),
    };
    if (ci.name < 0) { box.innerHTML = '<div class="ptn-hint" style="color:var(--red)">Não achei a coluna do parceiro (parceiro, nome, criador ou afiliado).</div>'; return; }
    const partners = _inProduct();
    const find = (n) => {
      const k = _norm(n).replace(/^@/, '');
      return partners.find(p => _norm(p.name) === k) || partners.find(p => {
        const c = (STATE.crm.contacts || []).find(x => x.id === p.contact_id);
        return c && (_norm(c.name) === k || Object.values(c.social_links || {}).some(v => _norm(v).replace(/^@/, '').endsWith(k)));
      });
    };
    const agg = {}; const missing = new Set(); let noMonth = 0;
    rows.slice(1).forEach(r => {
      const p = find(r[ci.name]);
      if (!p) { if (String(r[ci.name] || '').trim()) missing.add(String(r[ci.name]).trim()); return; }
      const period = ci.month >= 0 ? _month0(r[ci.month]) : _iso(_month);
      if (!period) { noMonth++; return; }
      const key = p.id + '|' + period;
      const a = agg[key] = agg[key] || { partner_id: p.id, period, registrations: 0, ftd: 0, deposits: 0, net_rev: 0, source: 'import' };
      RESULT_FIELDS.forEach(f => { if (ci[f.id] >= 0) a[f.id] += _num(r[ci[f.id]]); });
    });
    window.__ptnImport = Object.values(agg).map(a => ({ ...a, registrations: Math.round(a.registrations), ftd: Math.round(a.ftd) }));
    const found = RESULT_FIELDS.filter(f => ci[f.id] >= 0).map(f => f.label);
    box.innerHTML = `
      <div class="ptn-deal"><i data-lucide="file-check"></i> ${window.__ptnImport.length} linha${window.__ptnImport.length === 1 ? '' : 's'} (parceiro × mês) prontas · colunas: ${found.join(', ') || 'nenhuma métrica reconhecida'}${ci.month < 0 ? ` · sem coluna de mês, vai para ${_monthLabel(_month)}` : ''}</div>
      ${window.__ptnImport.length ? `<div class="tbl-wrap"><table class="ptn-table"><thead><tr><th>Parceiro</th><th>Mês</th>${RESULT_FIELDS.map(f => `<th class="num">${f.label}</th>`).join('')}</tr></thead><tbody>
        ${window.__ptnImport.slice(0, 12).map(a => `<tr><td>${esc(partnerById(a.partner_id)?.name)}</td><td>${_monthLabel(_parse(a.period))}</td>${RESULT_FIELDS.map(f => `<td class="num">${f.money ? _brl(a[f.id]) : _int(a[f.id])}</td>`).join('')}</tr>`).join('')}
      </tbody></table></div>${window.__ptnImport.length > 12 ? `<div class="ptn-hint">+ ${window.__ptnImport.length - 12} linhas</div>` : ''}` : ''}
      ${missing.size ? `<div class="ptn-hint" style="color:var(--amber);margin-top:8px">Não encontrados em ${esc(productById(_product)?.name)} (ignorados): ${[...missing].slice(0, 15).map(esc).join(', ')}${missing.size > 15 ? '…' : ''}</div>` : ''}
      ${noMonth ? `<div class="ptn-hint" style="color:var(--amber)">${noMonth} linha(s) sem mês reconhecível foram ignoradas.</div>` : ''}`;
    document.getElementById('ptn-imp-go').disabled = !window.__ptnImport.length;
    lucide.createIcons();
  };
  window._ptnImportGo = async () => {
    const rows = window.__ptnImport || [];
    if (!rows.length) return;
    try {
      const { data, error } = await sb().from('partner_results').upsert(rows, { onConflict: 'partner_id,period' }).select();
      if (error) throw error;
      const list = L('partnerResults');
      (data || []).forEach(r => { const i = list.findIndex(x => x.id === r.id || (x.partner_id === r.partner_id && String(x.period).slice(0, 10) === String(r.period).slice(0, 10))); if (i >= 0) list[i] = r; else list.push(r); });
      closeModal(); _render();
      toast(`${rows.length} resultado${rows.length === 1 ? '' : 's'} importado${rows.length === 1 ? '' : 's'}`, 's');
      if (window._dashRefresh) window._dashRefresh();
    } catch (e) { _err(e); }
  };

  // ── LISTA DE PARCEIROS ──
  function _listHTML(list) {
    if (!list.length) {
      return `<div class="empty"><i data-lucide="handshake"></i>
        <p>${_inProduct().length ? 'Nenhum parceiro com esses filtros.' : `Nenhum parceiro fixo em ${esc(productById(_product)?.name || 'este produto')} ainda. Quando um negócio é fechado como Fixo no Pipeline, ele aparece aqui sozinho. RevShare, permuta e variável ficam de fora (escopo livre).`}</p>
        <button class="btn btn-theme" onclick="window._ptnNewPartner()"><i data-lucide="plus"></i> Cadastrar parceiro</button></div>`;
    }
    const order = { onboarding: 0, active: 1, paused: 2, ended: 3 };
    const sorted = [...list].sort((a, b) => (order[a.status] - order[b.status]) || a.name.localeCompare(b.name));
    return `<div class="ptn-grid">${sorted.map(_cardHTML).join('')}</div>`;
  }

  function _cardHTML(p) {
    const st = P_STATUS[p.status] || P_STATUS.active;
    const pr = _progress(p, _month);
    const pct = pr.target ? Math.min(100, Math.round(pr.done / pr.target * 100)) : 0;
    const all = delivsOf(p.id);
    const late = all.filter(d => dStatus(d) === 'late').length;
    const next = all.filter(d => d.status === 'planned' && d.due_date >= _today()).sort((a, b) => a.due_date.localeCompare(b.due_date))[0];
    const owner = userById(p.owner);
    const periodLbl = p.scope_mode === 'package' ? 'no pacote' : `em ${MONTHS[_month.getMonth()]}`;
    const money = Number(p.monthly_value) > 0 ? `${_brl(p.monthly_value)}/mês` : '';
    const meta = [p.scope_mode === 'package' ? 'Pacote fechado' : 'Escopo mensal', money, p.end_date ? `até ${_fmt(p.end_date)}` : '']
      .filter(Boolean).map(esc).join(' · ');
    const initials = owner ? owner.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() : '';
    const tone = late ? 'late' : pr.target && pr.done >= pr.target ? 'done' : '';
    return `<button class="ptn-card ${tone}" style="--st:${st.color}" onclick="window._ptnOpen('${p.id}')">
      <div class="ptn-card-top">
        <div class="ptn-card-id">
          <div class="ptn-card-name">${esc(p.name)}</div>
          <div class="ptn-card-meta">${meta}</div>
        </div>
        <span class="ptn-chip" style="--c:${st.color}">${st.label}</span>
      </div>
      ${pr.target ? `
        <div>
          <div class="ptn-prog-lbl"><span>${pr.done} de ${pr.target} entregas ${periodLbl}</span><strong>${pct}%</strong></div>
          <div class="ptn-bar ${pct >= 100 ? 'full' : ''}"><i style="width:${pct}%"></i></div>
        </div>
        <div class="ptn-scope-mini">${pr.rows.map(r => `<span class="${r.done >= r.s.qty ? 'ok' : ''}"><i data-lucide="${kindOf(r.s.kind).icon}"></i>${esc(kindOf(r.s.kind).label)}${r.s.platform ? ' · ' + esc(r.s.platform) : ''} <b>${r.done}/${r.s.qty}</b></span>`).join('')}</div>`
        : `<div class="ptn-noscope"><i data-lucide="list-plus"></i><span><b>Definir escopo</b>O que esse parceiro precisa entregar</span><i data-lucide="arrow-right"></i></div>`}
      <div class="ptn-card-foot">
        ${late ? `<span class="ptn-late"><i data-lucide="alarm-clock"></i> ${late} atrasada${late > 1 ? 's' : ''}</span>` : ''}
        <span class="ptn-next"><i data-lucide="calendar-clock"></i>${next ? `Próxima ${_fmt(next.due_date)} · ${esc(kindOf(next.kind).label)}` : 'Nada marcado'}</span>
        ${owner ? `<span class="ptn-owner" title="Responsável: ${esc(owner.name)}">${esc(initials)}</span>` : ''}
      </div>
    </button>`;
  }

  // ── CALENDÁRIO ──
  function _calendarHTML(list) {
    const ids = new Set(list.map(p => p.id));
    const delivs = L('partnerDeliveries').filter(d => ids.has(d.partner_id) && inMonth(d.due_date, _month))
      .sort((a, b) => a.due_date.localeCompare(b.due_date));
    const byDay = {};
    delivs.forEach(d => (byDay[d.due_date] = byDay[d.due_date] || []).push(d));
    const first = _month, last = _monthEnd(_month);
    const lead = (first.getDay() + 6) % 7; // segunda = 0
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(first.getFullYear(), first.getMonth(), d));
    while (cells.length % 7) cells.push(null);
    const today = _today();
    const chip = (d) => {
      const p = partnerById(d.partner_id); const s = dStatus(d);
      return `<button class="ptn-cal-chip" style="--c:${D_STATUS[s].color}" title="${esc(p?.name)} · ${esc(kindOf(d.kind).label)} · ${D_STATUS[s].label}"
        onclick="event.stopPropagation();window._ptnOpenDelivery('${d.id}')"><b>${esc((p?.name || '?').split(' ')[0])}</b> ${esc(kindOf(d.kind).label)}</button>`;
    };
    const grid = cells.map(day => {
      if (!day) return '<div class="ptn-cal-cell empty-cell"></div>';
      const key = _iso(day); const items = byDay[key] || [];
      return `<div class="ptn-cal-cell ${key === today ? 'today' : ''} ${key < today ? 'past' : ''}" onclick="window._ptnNewDelivery({due_date:'${key}'})" title="Adicionar entrega em ${_fmt(key)}">
        <div class="cal-cell-top"><span class="ptn-cal-day">${day.getDate()}</span><span class="ptn-cal-add" aria-hidden="true"><i data-lucide="plus"></i></span></div>
        ${items.slice(0, 4).map(chip).join('')}
        ${items.length > 4 ? `<div class="ptn-cal-more">+${items.length - 4}</div>` : ''}
      </div>`;
    }).join('');
    const legend = ['planned', 'late', 'delivered', 'approved', 'rejected'].map(k => `<span><i style="background:${D_STATUS[k].color}"></i>${D_STATUS[k].label}</span>`).join('');
    const agenda = delivs.length ? delivs.map(_rowHTML.bind(null, true)).join('')
      : `<div class="empty" style="padding:28px"><i data-lucide="calendar-x"></i><p>Nenhuma entrega prevista em ${_monthLabel(_month)}. Abra um parceiro e use "Gerar pauta do mês".</p></div>`;
    return `<div class="ptn-cal">
        <div class="ptn-cal-head">${WEEKDAYS.map(w => `<div>${w}</div>`).join('')}</div>
        <div class="ptn-cal-grid">${grid}</div>
      </div>
      <div class="ptn-legend">${legend}<span class="cal-legend-heat">Clique em um dia para marcar uma entrega</span></div>
      <div class="sec-hdr" style="margin-top:22px"><div class="sec-lbl">Entregas de ${_monthLabel(_month)}</div></div>
      <div class="ptn-rows">${agenda}</div>`;
  }

  // Linha de entrega (usada no calendário e no modal do parceiro)
  function _rowHTML(showPartner, d) {
    const s = dStatus(d); const p = partnerById(d.partner_id); const k = kindOf(d.kind);
    return `<div class="ptn-row" onclick="window._ptnOpenDelivery('${d.id}')">
      <span class="ptn-row-date ${s === 'late' ? 'late' : ''}">${_fmt(d.due_date)}</span>
      <span class="ptn-row-kind"><i data-lucide="${k.icon}"></i>${esc(k.label)}${d.platform ? ` <em>${esc(d.platform)}</em>` : ''}</span>
      <span class="ptn-row-title">${showPartner ? `<b>${esc(p?.name)}</b>${d.title ? ' · ' : ''}` : ''}${esc(d.title || '')}</span>
      ${d.link ? `<a class="ptn-row-link" href="${esc(d.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir link"><i data-lucide="external-link"></i></a>` : '<span class="ptn-row-link"></span>'}
      <select class="ptn-status-sel" style="--c:${D_STATUS[s].color}" onclick="event.stopPropagation()" onchange="window._ptnSetDeliveryStatus('${d.id}', this.value)">
        ${['planned', 'delivered', 'approved', 'rejected'].map(k2 => `<option value="${k2}" ${d.status === k2 ? 'selected' : ''}>${k2 === 'planned' && s === 'late' ? 'Atrasada' : D_STATUS[k2].label}</option>`).join('')}
      </select>
    </div>`;
  }

  window._ptnSetDeliveryStatus = async (id, status) => {
    const patch = { status };
    if (status === 'delivered' || status === 'approved') {
      const cur = L('partnerDeliveries').find(x => x.id === id);
      if (!cur?.delivered_at) patch.delivered_at = new Date().toISOString();
    } else if (status === 'planned') patch.delivered_at = null;
    try { await _upd('partner_deliveries', id, patch); _afterChange(); }
    catch (e) { _err(e); }
  };

  function _afterChange() {
    _render();
    if (_detailId && document.getElementById('ptn-detail')) _renderDetail();
  }

  // ── DETALHE DO PARCEIRO ──
  window._ptnOpen = (id) => {
    _detailId = id;
    _contractOpen = false;
    _detailMonth = _month;
    const p = partnerById(id);
    if (!p) return;
    openModal(p.name, '<div id="ptn-detail"></div>',
      `<button class="btn btn-ghost ptn-danger" onclick="window._ptnDeletePartner('${id}')"><i data-lucide="trash-2"></i> Excluir parceiro</button>
       <span class="ptn-autosave"><i data-lucide="cloud-check"></i> Alterações salvas automaticamente</span>
       <button class="btn btn-theme" onclick="closeModal()">Concluir</button>`, { wide: true });
    _renderDetail();
  };

  function _renderDetail() {
    const box = document.getElementById('ptn-detail');
    const p = partnerById(_detailId);
    if (!box || !p) return;
    const ttl = document.getElementById('mttl'); if (ttl) ttl.textContent = p.name;
    const isPkg = p.scope_mode === 'package';
    const scope = scopeOf(p.id);
    const pr = _progress(p, _detailMonth);
    const delivs = _periodDelivs(p, _detailMonth).sort((a, b) => String(a.due_date || '9').localeCompare(String(b.due_date || '9')));
    const card = p.card_id ? (STATE.crm.cards || []).find(c => c.id === p.card_id) : null;
    const opt = (list, cur) => list.map(([v, l]) => `<option value="${v}" ${String(cur ?? '') === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const users = [['', '—']].concat((STATE.users || []).map(u => [u.id, u.name]));
    const upd = (f) => `onchange="window._ptnField('${f}', this.value)"`;
    const st = P_STATUS[p.status] || P_STATUS.active;
    const pct = pr.target ? Math.min(100, Math.round(pr.done / pr.target * 100)) : 0;
    const owner = userById(p.owner);
    const contractLine = [isPkg ? 'Pacote fechado' : 'Escopo mensal',
      Number(p.monthly_value) > 0 ? `${_brl(p.monthly_value)}/mês` : 'sem valor',
      p.start_date ? `desde ${_fmt(p.start_date)}` : '', p.end_date ? `até ${_fmt(p.end_date)}` : '',
      owner ? owner.name.split(' ')[0] : ''].filter(Boolean).map(esc).join(' · ');
    const PRESETS = [['reel', 'Instagram', 4, 'Reels'], ['story', 'Instagram', 8, 'Stories'], ['short', 'TikTok', 4, 'TikToks'], ['live', 'Twitch', 2, 'Lives'], ['video', 'YouTube', 1, 'vídeo longo']];
    box.innerHTML = `
      <div class="ptn-d-head">
        <select class="ptn-status-sel lg" style="--c:${st.color}" ${upd('status')} aria-label="Situação">${opt(Object.entries(P_STATUS).map(([k, v]) => [k, v.label]), p.status)}</select>
        <div class="ptn-d-head-txt">${contractLine}${card ? ` · <a href="#" onclick="event.preventDefault();closeModal();openMod('pipeline')">ver no Pipeline</a>` : ''}</div>
        ${pr.target ? `<div class="ptn-d-head-prog"><strong>${pr.done}/${pr.target}</strong><span>${isPkg ? 'no pacote' : MONTHS[_detailMonth.getMonth()]}</span>
          <div class="ptn-bar ${pct >= 100 ? 'full' : ''}"><i style="width:${pct}%"></i></div></div>` : ''}
      </div>

      <div class="ptn-d-sec first">
        <div class="ptn-d-sec-hdr"><span>Escopo ${isPkg ? 'do pacote' : 'por mês'}</span></div>
        ${scope.length ? `<div class="ptn-scope-list">${scope.map(s => `
          <div class="ptn-scope-item">
            <i data-lucide="${kindOf(s.kind).icon}"></i>
            <span class="ptn-scope-name">${esc(kindOf(s.kind).label)}${s.platform ? ` <em>${esc(s.platform)}</em>` : ''}</span>
            <input type="number" min="1" class="fi ptn-qty" value="${s.qty}" onchange="window._ptnScopeQty('${s.id}', this.value)" aria-label="Quantidade">
            <span class="ptn-scope-unit">${isPkg ? 'no total' : 'por mês'}</span>
            <button class="hdr-icon-btn" title="Remover" aria-label="Remover item" onclick="window._ptnScopeDel('${s.id}')"><i data-lucide="x"></i></button>
          </div>`).join('')}</div>` : `<div class="ptn-hint">Defina o que esse parceiro precisa entregar. Comece por um atalho ou monte abaixo.</div>
          <div class="ptn-presets">${PRESETS.map(([k, pl, q, lbl]) => `<button class="ptn-preset" onclick="window._ptnScopeAdd('${k}','${pl}',${q})"><i data-lucide="${kindOf(k).icon}"></i>${q} ${lbl} · ${pl}</button>`).join('')}</div>`}
        <div class="ptn-scope-add">
          <select class="fi" id="ptn-sa-kind" aria-label="Formato">${KINDS.map(k => `<option value="${k.id}">${k.label}</option>`).join('')}</select>
          <select class="fi" id="ptn-sa-plat" aria-label="Plataforma">${PLATFORMS.map(x => `<option>${x}</option>`).join('')}</select>
          <input type="number" min="1" value="1" class="fi ptn-qty" id="ptn-sa-qty" aria-label="Quantidade">
          <button class="btn btn-outline" onclick="window._ptnScopeAdd()"><i data-lucide="plus"></i> Adicionar</button>
        </div>
      </div>

      <div class="ptn-d-sec">
        <div class="ptn-d-sec-hdr">
          <span>Entregas ${isPkg ? 'do pacote' : ''}</span>
          ${isPkg ? '' : `<div class="ptn-month sm">
            <button class="hdr-icon-btn" onclick="window._ptnDetailMonth(-1)" aria-label="Mês anterior"><i data-lucide="chevron-left"></i></button>
            <span>${_monthLabel(_detailMonth)}</span>
            <button class="hdr-icon-btn" onclick="window._ptnDetailMonth(1)" aria-label="Próximo mês"><i data-lucide="chevron-right"></i></button></div>`}
        </div>
        ${pr.target ? `<div class="ptn-scope-mini" style="margin-bottom:12px">${pr.rows.map(r => `<span class="${r.done >= r.s.qty ? 'ok' : ''}"><i data-lucide="${kindOf(r.s.kind).icon}"></i>${esc(kindOf(r.s.kind).label)}${r.s.platform ? ' · ' + esc(r.s.platform) : ''} <b>${r.done}/${r.s.qty}</b></span>`).join('')}<span class="ptn-mini-note">${pr.planned} na pauta</span></div>` : ''}
        <div class="ptn-d-actions">
          ${scope.length ? `<button class="btn ${delivs.length ? 'btn-outline' : 'btn-theme'}" onclick="window._ptnGenerate()"><i data-lucide="wand-sparkles"></i> Gerar pauta ${isPkg ? 'do pacote' : 'do mês'}</button>` : ''}
          <button class="btn btn-outline" onclick="window._ptnNewDelivery({partner_id:'${p.id}'})"><i data-lucide="plus"></i> Entrega avulsa</button>
        </div>
        <div class="ptn-rows">${delivs.length ? delivs.map(_rowHTML.bind(null, false)).join('')
          : `<div class="ptn-hint">${scope.length ? '"Gerar pauta" cria as entregas do escopo com datas espalhadas no período. Depois é só ajustar.' : 'Defina o escopo acima para gerar a pauta.'}</div>`}</div>
      </div>

      <details class="ptn-d-sec ptn-contract" ${_contractOpen ? "open" : ""} ontoggle="window._ptnContract(this.open)">
        <summary><span>Contrato e dados</span><i data-lucide="chevron-down"></i></summary>
      <div class="ptn-d-grid">
        <div class="ff"><label>Tipo de escopo</label><select class="fi" ${upd('scope_mode')}>${opt([['monthly', 'Mensal (repete todo mês)'], ['package', 'Pacote fechado']], p.scope_mode)}</select></div>
        <div class="ff"><label>Valor mensal (R$)</label><input type="number" min="0" step="0.01" class="fi" value="${p.monthly_value ?? ''}" ${upd('monthly_value')}></div>
        <div class="ff"><label>Responsável</label><select class="fi" ${upd('owner')}>${opt(users, p.owner)}</select></div>
        <div class="ff"><label>Início</label><input type="date" class="fi" value="${esc(p.start_date || '')}" ${upd('start_date')}></div>
        <div class="ff"><label>${isPkg ? 'Prazo final' : 'Fim do contrato'}</label><input type="date" class="fi" value="${esc(p.end_date || '')}" ${upd('end_date')}></div>
      </div>
      </details>
      <div class="ff ptn-notes"><label>Observações</label><textarea class="fi" rows="${p.notes && p.notes.length > 120 ? 4 : 2}" placeholder="Combinados, contatos, briefing..." ${upd('notes')}>${esc(p.notes || '')}</textarea></div>`;
    lucide.createIcons();
  }

  function _flashSaved() {
    const el = document.querySelector('.ptn-autosave');
    if (!el) return;
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  }
  window._ptnContract = (open) => { _contractOpen = open; };
  window._ptnDetailMonth = (n) => { _detailMonth = _addMonths(_detailMonth, n); _renderDetail(); };
  window._ptnField = async (field, value) => {
    const patch = { [field]: value === '' ? null : value };
    if (field === 'monthly_value') {
      const v = Number(value);
      const months = (partnerById(_detailId)?.deal_summary || '').match(/ · \d+ meses/)?.[0] || '';
      patch.deal_summary = v > 0 ? `Fixo R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês${months}` : null;
    }
    try { await _upd('partners', _detailId, patch); _afterChange(); _flashSaved(); }
    catch (e) { _err(e); _renderDetail(); }
  };
  // Sem argumentos lê o formulário; com argumentos vem de um atalho
  window._ptnScopeAdd = async (k, pl, q) => {
    const kind = k || document.getElementById('ptn-sa-kind').value;
    const platform = pl || document.getElementById('ptn-sa-plat').value;
    const qty = Math.max(1, parseInt(q || document.getElementById('ptn-sa-qty').value, 10) || 1);
    const existing = scopeOf(_detailId).find(s => s.kind === kind && (s.platform || '') === platform);
    try {
      if (existing) await _upd('partner_scope', existing.id, { qty: existing.qty + qty });
      else await _ins('partner_scope', { partner_id: _detailId, kind, platform, qty, position: scopeOf(_detailId).length });
      _afterChange();
    } catch (e) { _err(e); }
  };
  window._ptnScopeQty = async (id, v) => {
    const qty = parseInt(v, 10);
    if (!qty || qty < 1) { toast('Quantidade mínima é 1', 'w'); _renderDetail(); return; }
    try { await _upd('partner_scope', id, { qty }); _afterChange(); } catch (e) { _err(e); }
  };
  window._ptnScopeDel = async (id) => {
    if (!confirm('Remover este item do escopo? As entregas já criadas continuam na pauta.')) return;
    try { await _del('partner_scope', id); _afterChange(); } catch (e) { _err(e); }
  };

  // Cria as entregas que faltam para bater o escopo, com datas espalhadas
  // no período (mês ou prazo do pacote). Não duplica o que já existe.
  window._ptnGenerate = async () => {
    const p = partnerById(_detailId);
    if (!p) return;
    const isPkg = p.scope_mode === 'package';
    let from, to;
    if (isPkg) {
      from = _parse(p.start_date) || new Date();
      to = _parse(p.end_date) || _addDays(from, 30);
    } else {
      from = _detailMonth; to = _monthEnd(_detailMonth);
      const st = _parse(p.start_date); if (st && st > from) from = st;
      const en = _parse(p.end_date); if (en && en < to) to = en;
    }
    if (from > to) { toast('O período fica fora do contrato deste parceiro', 'w'); return; }
    const span = Math.round((to - from) / 86400000) + 1;
    const delivs = _periodDelivs(p, _detailMonth);
    const rows = [];
    scopeOf(p.id).forEach(s => {
      const have = delivs.filter(d => d.scope_id ? d.scope_id === s.id : (d.kind === s.kind && (d.platform || '') === (s.platform || ''))).length;
      const missing = s.qty - have;
      for (let i = 0; i < missing; i++) {
        const idx = have + i;
        const due = _addDays(from, Math.min(span - 1, Math.floor((idx + 0.5) * span / s.qty)));
        rows.push({
          partner_id: p.id, scope_id: s.id, kind: s.kind, platform: s.platform, status: 'planned',
          due_date: _iso(due), period: isPkg ? null : _iso(_detailMonth), created_by: STATE.user?.id || null,
        });
      }
    });
    if (!rows.length) { toast('A pauta já cobre todo o escopo deste período', 'i'); return; }
    try { await _ins('partner_deliveries', rows); _afterChange(); toast(`${rows.length} entrega${rows.length > 1 ? 's' : ''} na pauta`, 's'); }
    catch (e) { _err(e); }
  };

  window._ptnDeletePartner = async (id) => {
    const p = partnerById(id);
    if (!confirm(`Excluir ${p?.name} do módulo de parceiros? O escopo e as entregas dele também serão apagados. O negócio no Pipeline não muda.`)) return;
    try { await _del('partners', id); _detailId = null; closeModal(); _render(); toast('Parceiro excluído', 's'); }
    catch (e) { _err(e); }
  };

  // ── NOVO PARCEIRO (manual) ──
  window._ptnNewPartner = () => {
    if (!_product) { toast('Cadastre um produto antes', 'w'); return; }
    const contacts = (STATE.crm.contacts || []).filter(c => !L('partners').some(p => p.contact_id === c.id));
    const users = (STATE.users || []).map(u => `<option value="${u.id}" ${u.id === STATE.user?.id ? 'selected' : ''}>${esc(u.name)}</option>`).join('');
    openModal(`Novo parceiro · ${productById(_product)?.name || ''}`, `
      <div class="ptn-d-grid">
        <div class="ff" style="grid-column:1/-1"><label>Nome (ou escolha um contato)</label>
          <input class="fi" id="ptn-n-name" list="ptn-n-contacts" placeholder="Nome do parceiro" autocomplete="off">
          <datalist id="ptn-n-contacts">${contacts.slice(0, 500).map(c => `<option value="${esc(c.name)}">`).join('')}</datalist></div>
        <div class="ff"><label>Tipo de escopo</label><select class="fi" id="ptn-n-mode"><option value="monthly">Mensal (repete todo mês)</option><option value="package">Pacote fechado</option></select></div>
        <div class="ff"><label>Início</label><input type="date" class="fi" id="ptn-n-start" value="${_today()}"></div>
        <div class="ff"><label>Responsável</label><select class="fi" id="ptn-n-owner"><option value="">—</option>${users}</select></div>
        <div class="ff"><label>Valor mensal (R$)</label><input type="number" min="0" step="0.01" class="fi" id="ptn-n-value" placeholder="Ex.: 5000"></div>
        <div class="ff"><label>Duração (meses)</label><input type="number" min="1" step="1" class="fi" id="ptn-n-months" placeholder="Opcional"></div>
      </div>
      <div class="ptn-hint" style="margin-top:4px">Este módulo é para parcerias de valor fixo. Negócios fechados como Fixo no Pipeline entram aqui sozinhos; use este cadastro para quem fechou por fora.</div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
       <button class="btn btn-theme" onclick="window._ptnCreatePartner()"><i data-lucide="check"></i> Criar e definir escopo</button>`);
    lucide.createIcons();
    setTimeout(() => document.getElementById('ptn-n-name')?.focus(), 80);
  };
  window._ptnCreatePartner = async () => {
    const name = document.getElementById('ptn-n-name').value.trim();
    if (!name) { toast('Informe o nome', 'w'); return; }
    const contact = (STATE.crm.contacts || []).find(c => (c.name || '').trim().toLowerCase() === name.toLowerCase());
    const value = parseFloat(document.getElementById('ptn-n-value').value);
    const months = parseInt(document.getElementById('ptn-n-months').value, 10);
    const start = document.getElementById('ptn-n-start').value || _today();
    const brl = (v) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const payload = {
      name, contact_id: contact?.id || null,
      product_id: _product || null,
      monthly_value: value > 0 ? value : null,
      scope_mode: document.getElementById('ptn-n-mode').value,
      start_date: start,
      end_date: months > 0 ? _iso(new Date(_parse(start).getFullYear(), _parse(start).getMonth() + months, _parse(start).getDate())) : null,
      deal_summary: value > 0 ? `Fixo R$ ${brl(value)}/mês${months > 0 ? ` · ${months} meses` : ''}` : null,
      owner: document.getElementById('ptn-n-owner').value || null,
      status: 'onboarding',
    };
    try {
      const [row] = await _ins('partners', payload);
      closeModal(); _render();
      setTimeout(() => window._ptnOpen(row.id), 250);
    } catch (e) { _err(e); }
  };

  // ── ENTREGA (criar / editar) ──
  window._ptnNewDelivery = (preset = {}) => _deliveryModal({ status: 'planned', ...preset }, true);
  window._ptnOpenDelivery = (id) => {
    const d = L('partnerDeliveries').find(x => x.id === id);
    if (d) _deliveryModal(d, false);
  };
  function _deliveryModal(d, isNew) {
    const backTo = document.getElementById('ptn-detail') ? _detailId : null;
    const prodId = d.partner_id ? partnerById(d.partner_id)?.product_id : _product;
    const live = L('partners').filter(p => p.product_id === prodId && (p.status !== 'ended' || p.id === d.partner_id)).sort((a, b) => a.name.localeCompare(b.name));
    if (isNew && !live.length) { toast(`Nenhum parceiro em ${productById(prodId)?.name || 'este produto'} ainda`, 'w'); return; }
    const pid = d.partner_id || (backTo || (_filtered()[0] || live[0]).id);
    const scopeOpts = (id) => scopeOf(id).map(s => `<option value="${s.id}" ${d.scope_id === s.id ? 'selected' : ''}>${esc(kindOf(s.kind).label)}${s.platform ? ' · ' + esc(s.platform) : ''}</option>`).join('');
    const statusOpts = ['planned', 'delivered', 'approved', 'rejected'].map(k => `<option value="${k}" ${d.status === k ? 'selected' : ''}>${D_STATUS[k].label}</option>`).join('');
    window.__ptnDeliveryCtx = { id: d.id || null, backTo };
    openModal(isNew ? 'Nova entrega' : 'Entrega', `
      <div class="ptn-d-grid">
        <div class="ff" style="grid-column:1/-1"><label>Parceiro</label>
          <select class="fi" id="ptn-e-partner" ${isNew ? '' : 'disabled'} onchange="window._ptnDeliveryPartner(this.value)">
            ${live.map(p => `<option value="${p.id}" ${p.id === pid ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>
        <div class="ff"><label>Item do escopo</label><select class="fi" id="ptn-e-scope" onchange="window._ptnDeliveryScope(this.value)"><option value="">Avulsa (fora do escopo)</option>${scopeOpts(pid)}</select></div>
        <div class="ff"><label>Data prevista</label><input type="date" class="fi" id="ptn-e-due" value="${esc(d.due_date || '')}"></div>
        <div class="ff"><label>Formato</label><select class="fi" id="ptn-e-kind">${KINDS.map(k => `<option value="${k.id}" ${d.kind === k.id ? 'selected' : ''}>${k.label}</option>`).join('')}</select></div>
        <div class="ff"><label>Plataforma</label><select class="fi" id="ptn-e-plat"><option value="">—</option>${PLATFORMS.map(x => `<option ${d.platform === x ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        <div class="ff" style="grid-column:1/-1"><label>Título / pauta</label><input class="fi" id="ptn-e-title" value="${esc(d.title || '')}" placeholder="Ex.: Abrindo 3 packs Holo ao vivo"></div>
        <div class="ff"><label>Status</label><select class="fi" id="ptn-e-status">${statusOpts}</select></div>
        <div class="ff"><label>Link da entrega</label><input class="fi" id="ptn-e-link" value="${esc(d.link || '')}" placeholder="https://instagram.com/reel/..."></div>
        <div class="ff" style="grid-column:1/-1"><label>Observações</label><textarea class="fi" id="ptn-e-notes" rows="2">${esc(d.notes || '')}</textarea></div>
      </div>
      <div class="ptn-d-sec" style="margin-top:6px">
        <div class="ptn-d-sec-hdr"><span>Desempenho do conteúdo</span></div>
        <div class="ptn-metrics">${CONTENT_FIELDS.map(f => `<div class="ff"><label>${f.label}</label>
          <input type="number" min="0" step="1" class="fi" id="ptn-e-${f.id}" value="${d[f.id] ?? ''}" placeholder="—"></div>`).join('')}</div>
      </div>`,
      `${isNew ? '' : `<button class="btn btn-ghost ptn-danger" onclick="window._ptnDeliveryDelete()"><i data-lucide="trash-2"></i> Excluir</button>`}
       <button class="btn btn-ghost" onclick="window._ptnDeliveryClose()">Cancelar</button>
       <button class="btn btn-theme" onclick="window._ptnDeliverySave()"><i data-lucide="check"></i> Salvar</button>`);
    lucide.createIcons();
    if (isNew && !d.kind) window._ptnDeliveryScope(document.getElementById('ptn-e-scope').value);
  }
  window._ptnDeliveryPartner = (pid) => {
    const sel = document.getElementById('ptn-e-scope');
    sel.innerHTML = '<option value="">Avulsa (fora do escopo)</option>' + scopeOf(pid).map(s => `<option value="${s.id}">${esc(kindOf(s.kind).label)}${s.platform ? ' · ' + esc(s.platform) : ''}</option>`).join('');
  };
  window._ptnDeliveryScope = (sid) => {
    const s = L('partnerScope').find(x => x.id === sid);
    if (!s) return;
    document.getElementById('ptn-e-kind').value = s.kind;
    document.getElementById('ptn-e-plat').value = s.platform || '';
  };
  window._ptnDeliveryClose = () => {
    const back = window.__ptnDeliveryCtx?.backTo;
    closeModal();
    if (back) setTimeout(() => { window._ptnOpen(back); }, 220);
  };
  window._ptnDeliverySave = async () => {
    const ctx = window.__ptnDeliveryCtx || {};
    const g = (id) => document.getElementById(id).value;
    const pid = g('ptn-e-partner');
    const p = partnerById(pid);
    const due = g('ptn-e-due') || null;
    const status = g('ptn-e-status');
    const payload = {
      scope_id: g('ptn-e-scope') || null, kind: g('ptn-e-kind'), platform: g('ptn-e-plat') || null,
      title: g('ptn-e-title').trim() || null, due_date: due, status, link: g('ptn-e-link').trim() || null,
      notes: g('ptn-e-notes').trim() || null,
      ...Object.fromEntries(CONTENT_FIELDS.map(f => { const v = g('ptn-e-' + f.id); return [f.id, v === '' ? null : Math.max(0, Math.round(Number(v)) || 0)]; })),
      period: p?.scope_mode === 'monthly' && due ? _iso(_monthStart(_parse(due))) : null,
    };
    if (payload.link && !/^https?:\/\//i.test(payload.link)) payload.link = 'https://' + payload.link;
    const cur = ctx.id ? L('partnerDeliveries').find(x => x.id === ctx.id) : null;
    if ((status === 'delivered' || status === 'approved') && !cur?.delivered_at) payload.delivered_at = new Date().toISOString();
    if (status === 'planned') payload.delivered_at = null;
    try {
      if (ctx.id) await _upd('partner_deliveries', ctx.id, payload);
      else await _ins('partner_deliveries', { ...payload, partner_id: pid, created_by: STATE.user?.id || null });
      toast('Entrega salva', 's');
      _render();
      window._ptnDeliveryClose();
    } catch (e) { _err(e); }
  };
  window._ptnDeliveryDelete = async () => {
    const ctx = window.__ptnDeliveryCtx || {};
    if (!ctx.id || !confirm('Excluir esta entrega?')) return;
    try { await _del('partner_deliveries', ctx.id); _render(); window._ptnDeliveryClose(); toast('Entrega excluída', 's'); }
    catch (e) { _err(e); }
  };

  // Compartilhado com o módulo Calendário (js/calendar.js)
  window.PTN = { KINDS, D_STATUS, CONTENT_FIELDS, kindOf, dStatus, isDone, products: _products, load: _load };
})();
