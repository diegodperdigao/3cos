// ══════════════════════════════════════════════════════════
// CALENDÁRIO GERAL — entregas de todos os parceiros, dia a dia
// ══════════════════════════════════════════════════════════
// Lê as mesmas tabelas do módulo Parceiros (STATE.crm.partners /
// partnerDeliveries). Mostra quem postou, quanto e o volume de ativações
// por dia, com filtro por produto (cada produto tem sua cor).
// A data de uma entrega é a data dela no calendário (due_date).
// ══════════════════════════════════════════════════════════

(function () {
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const PALETTE = ['#6366f1', '#10b981', '#f59e0b', '#e4407f', '#3b82f6', '#a855f7', '#14b8a6'];

  let _month = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let _product = sessionStorage.getItem('cal_product') || 'all';
  let _showPlanned = sessionStorage.getItem('cal_planned') !== '0';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parse = (s) => { const [y, m, d] = String(s).slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); };
  const monthEnd = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const fmtDay = (s) => { const d = parse(s); return `${d.getDate()} de ${MONTHS[d.getMonth()]}`; };
  const int = (n) => Math.round(Number(n) || 0).toLocaleString('pt-BR');
  const P = () => window.PTN;
  const products = () => (P()?.products?.() || STATE.crm.products || []);
  // Cor de cada produto; se duas cores cadastradas forem parecidas demais
  // (ex.: dois roxos), a segunda vira uma cor livre da paleta.
  const _hue = (hex) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return null;
    const n = parseInt(m[1], 16), r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    if (!d) return null;
    const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return (h * 60 + 360) % 360;
  };
  const _near = (a, b) => { const x = _hue(a), y = _hue(b); return x != null && y != null && Math.min(Math.abs(x - y), 360 - Math.abs(x - y)) < 28; };
  let _colorKey = '', _colors = {};
  const productColor = (id) => {
    const list = products();
    const key = list.map(x => x.id + x.color).join('|');
    if (key !== _colorKey) {
      _colorKey = key; _colors = {};
      const used = [];
      list.forEach(pr => {
        let c = pr.color || null;
        if (!c) c = PALETTE.find(x => !used.some(u => u === x || _near(u, x))) || PALETTE[used.length % PALETTE.length];
        used.push(c); _colors[pr.id] = c;
      });
    }
    return _colors[id] || PALETTE[0];
  };

  // Entregas do mês já com parceiro/produto resolvidos
  function _monthItems() {
    const partners = new Map((STATE.crm.partners || []).map(p => [p.id, p]));
    const a = iso(_month), b = iso(monthEnd(_month));
    return (STATE.crm.partnerDeliveries || [])
      .filter(d => d.due_date && d.due_date >= a && d.due_date <= b)
      .map(d => ({ d, p: partners.get(d.partner_id) }))
      .filter(x => x.p && (_product === 'all' || x.p.product_id === _product))
      .filter(x => _showPlanned || P().isDone(x.d))
      .sort((x, y) => x.d.due_date.localeCompare(y.d.due_date) || x.p.name.localeCompare(y.p.name));
  }

  async function bCalendar(el) {
    el.innerHTML = modHdr('Calendário') + `<div class="mod-body">
      ${heroHTML('calendar', 'Operação', 'Calendário', 'Todas as entregas dos parceiros, dia a dia: quem postou, quanto e quando')}
      <div class="mod-main">
        <div class="ptn-bar-top">
          <div class="pcrm-tabs" id="cal-products" aria-label="Produto"></div>
        </div>
        <div class="ptn-toolbar">
          <label class="cal-switch"><input type="checkbox" ${_showPlanned ? 'checked' : ''} onchange="window._calPlanned(this.checked)"><span class="cal-switch-ui"></span> Mostrar previstas</label>
          <div class="ptn-month">
            <button class="hdr-icon-btn" onclick="window._calMonth(-1)" title="Mês anterior" aria-label="Mês anterior"><i data-lucide="chevron-left"></i></button>
            <span id="cal-month-label"></span>
            <button class="hdr-icon-btn" onclick="window._calMonth(1)" title="Próximo mês" aria-label="Próximo mês"><i data-lucide="chevron-right"></i></button>
            <button class="ptn-today" id="cal-today" onclick="window._calMonth(0)">Hoje</button>
          </div>
        </div>
        <div class="kpi-row" id="cal-kpis"></div>
        <div id="cal-content"><div class="empty"><i data-lucide="loader"></i><p>Carregando...</p></div></div>
      </div></div>`;
    lucide.createIcons();
    if (STATE.crm.ptnLoaded) _render();
    if (!STATE.crm.loaded && window.CRM?.loadAll) await CRM.loadAll();
    const ok = await CRM.loadPartners();
    if (!ok && !STATE.crm.ptnLoaded) {
      document.getElementById('cal-content').innerHTML = `<div class="empty"><i data-lucide="cloud-off" style="color:var(--amber)"></i>
        <p><strong>Não foi possível carregar as entregas.</strong> ${esc(STATE.crm.ptnError || '')}</p>
        <button class="btn btn-theme" onclick="openMod('calendar')"><i data-lucide="refresh-cw"></i> Tentar de novo</button></div>`;
      lucide.createIcons();
      return;
    }
    _render();
  }
  window.bCalendar = bCalendar;
  window._calRefresh = () => { if (document.querySelector('#mod-calendar.active #cal-content')) _render(); };
  window._calMonth = (n) => { const t = new Date(); _month = n === 0 ? new Date(t.getFullYear(), t.getMonth(), 1) : new Date(_month.getFullYear(), _month.getMonth() + n, 1); _render(); };
  window._calProduct = (id) => { _product = id; sessionStorage.setItem('cal_product', id); _render(); };
  window._calPlanned = (on) => { _showPlanned = on; sessionStorage.setItem('cal_planned', on ? '1' : '0'); _render(); };

  function _render() {
    if (!P()) return;
    const list = products();
    if (_product !== 'all' && !list.some(x => x.id === _product)) _product = 'all';
    const tabs = document.getElementById('cal-products');
    if (tabs) tabs.innerHTML = [`<button class="pcrm-tab ${_product === 'all' ? 'on' : ''}" onclick="window._calProduct('all')"><span>Todos os produtos</span></button>`]
      .concat(list.map(pr => `<button class="pcrm-tab prod-tab ${_product === pr.id ? 'on' : ''}" style="--pc:${productColor(pr.id)}" onclick="window._calProduct('${pr.id}')">
        ${prodMark(pr, 16)}<span>${esc(pr.name)}</span></button>`)).join('');
    const ml = document.getElementById('cal-month-label');
    if (ml) ml.textContent = `${MONTHS[_month.getMonth()]} ${_month.getFullYear()}`;
    const tb = document.getElementById('cal-today');
    if (tb) { const t = new Date(); tb.classList.toggle('on', _month.getFullYear() === t.getFullYear() && _month.getMonth() === t.getMonth()); }

    const items = _monthItems();
    const done = items.filter(x => P().isDone(x.d));
    const byDay = {};
    items.forEach(x => (byDay[x.d.due_date] = byDay[x.d.due_date] || []).push(x));
    const doneByDay = {};
    done.forEach(x => { doneByDay[x.d.due_date] = (doneByDay[x.d.due_date] || 0) + 1; });
    const peak = Object.entries(doneByDay).sort((a, b) => b[1] - a[1])[0];
    const daysWith = Object.keys(doneByDay).length;
    const views = done.reduce((n, x) => n + (Number(x.d.views) || 0), 0);
    const posters = new Set(done.map(x => x.p.id));

    const kpi = (icon, lbl, val, sub) => `<div class="kpi"><div class="kpi-icon-row"><i data-lucide="${icon}"></i><span class="kpi-lbl">${lbl}</span></div>
      <div class="kpi-val sm">${val}</div><div class="kpi-sub">${sub}</div></div>`;
    const k = document.getElementById('cal-kpis');
    if (k) k.hidden = !items.length && !views;
    if (k) k.innerHTML =
      kpi('zap', 'Ativações no mês', done.length, `${items.length - done.length} ainda previstas`) +
      kpi('users', 'Parceiros que postaram', posters.size, `${daysWith} dia${daysWith === 1 ? '' : 's'} com ativação`) +
      kpi('flame', 'Dia mais forte', peak ? `${parse(peak[0]).getDate()}/${_month.getMonth() + 1}` : '—', peak ? `${peak[1]} ativaç${peak[1] === 1 ? 'ão' : 'ões'}` : 'nenhuma ativação ainda') +
      kpi('eye', 'Views', views ? int(views) : '—', 'somadas nas entregas feitas');

    const c = document.getElementById('cal-content');
    if (!c) return;
    c.innerHTML = _gridHTML(byDay, doneByDay, peak ? peak[1] : 0) + _rankingHTML(done);
    lucide.createIcons();
  }

  function _gridHTML(byDay, doneByDay, max) {
    const lead = (_month.getDay() + 6) % 7;
    const last = monthEnd(_month).getDate();
    const today = iso(new Date());
    const cells = [];
    for (let i = 0; i < lead; i++) cells.push('<div class="ptn-cal-cell empty-cell"></div>');
    for (let day = 1; day <= last; day++) {
      const key = iso(new Date(_month.getFullYear(), _month.getMonth(), day));
      const its = byDay[key] || [];
      const n = doneByDay[key] || 0;
      const heat = max ? Math.round(5 + (n / max) * 17) : 0;
      const chips = its.slice(0, 3).map(x => {
        const k = P().kindOf(x.d.kind);
        return `<div class="cal-chip ${P().isDone(x.d) ? '' : 'planned'}" style="--c:${productColor(x.p.product_id)}" title="${esc(x.p.name)} · ${esc(k.label)}">
          <b>${esc(x.p.name.split(' ')[0])}</b> ${esc(k.label)}</div>`;
      }).join('');
      cells.push(`<div class="ptn-cal-cell cal-cell ${key === today ? 'today' : ''}" ${n ? `style="--heat:${heat}%"` : ''}
        ${its.length ? `onclick="window._calDay('${key}')"` : ''} title="${its.length ? 'Ver o dia' : ''}">
        <div class="cal-cell-top"><span class="ptn-cal-day">${day}</span>${n ? `<span class="cal-count">${n}</span>` : ''}</div>
        ${chips}${its.length > 3 ? `<div class="ptn-cal-more">+${its.length - 3}</div>` : ''}
      </div>`);
    }
    while (cells.length % 7) cells.push('<div class="ptn-cal-cell empty-cell"></div>');
    const legend = products().filter(pr => _product === 'all' || pr.id === _product)
      .map(pr => `<span><i style="background:${productColor(pr.id)}"></i>${esc(pr.name)}</span>`).join('');
    return `<div class="ptn-cal cal-general">
        <div class="ptn-cal-head">${WEEKDAYS.map(w => `<div>${w}</div>`).join('')}</div>
        <div class="ptn-cal-grid">${cells.join('')}</div>
      </div>
      <div class="ptn-legend">${legend}<span><i class="cal-legend-planned"></i>Prevista (ainda não feita)</span><span class="cal-legend-heat">Quanto mais forte o fundo, mais ativações no dia</span></div>`;
  }

  function _rankingHTML(done) {
    const by = {};
    done.forEach(x => {
      const r = by[x.p.id] = by[x.p.id] || { p: x.p, n: 0, views: 0, kinds: {} };
      r.n++; r.views += Number(x.d.views) || 0;
      const kl = P().kindOf(x.d.kind).label; r.kinds[kl] = (r.kinds[kl] || 0) + 1;
    });
    const rows = Object.values(by).sort((a, b) => b.n - a.n || b.views - a.views);
    const prodName = (id) => products().find(x => x.id === id)?.name || '';
    return `<div class="sec-hdr" style="margin-top:24px"><div class="sec-lbl">Quem mais postou em ${MONTHS[_month.getMonth()]}</div></div>
      ${rows.length ? `<div class="ptn-rows">${rows.map((r, i) => `
        <div class="ptn-row cal-rank" onclick="window._calPartner('${r.p.id}')">
          <span class="ptn-row-date">${i + 1}º</span>
          <span class="ptn-row-kind"><i class="cal-dot" style="background:${productColor(r.p.product_id)}"></i><b>${esc(r.p.name)}</b></span>
          <span class="ptn-row-title">${esc(prodName(r.p.product_id))} · ${Object.entries(r.kinds).map(([k, v]) => `${v} ${esc(k)}`).join(', ')}</span>
          <span class="cal-rank-views">${r.views ? int(r.views) + ' views' : ''}</span>
          <span class="cal-rank-n">${r.n}</span>
        </div>`).join('')}</div>`
        : `<div class="empty" style="padding:28px"><i data-lucide="calendar-x"></i><p>Nenhuma entrega marcada como feita neste mês.</p></div>`}`;
  }

  // Detalhe do dia: todas as entregas, com link e números
  window._calDay = (key) => {
    const its = _monthItems().filter(x => x.d.due_date === key);
    const prodName = (id) => products().find(x => x.id === id)?.name || '';
    const nDone = its.filter(x => P().isDone(x.d)).length;
    openModal(`${fmtDay(key)} · ${nDone} ativaç${nDone === 1 ? 'ão' : 'ões'} ${its.length - nDone ? ` · ${its.length - nDone} prevista${its.length - nDone === 1 ? '' : 's'}` : ''}`, `
      <div class="ptn-rows">${its.map(x => {
        const s = P().dStatus(x.d); const st = P().D_STATUS[s]; const k = P().kindOf(x.d.kind);
        return `<div class="ptn-row cal-day-row" onclick="closeModal();setTimeout(()=>window._ptnOpenDelivery('${x.d.id}'),220)">
          <span class="ptn-row-kind"><i class="cal-dot" style="background:${productColor(x.p.product_id)}"></i><b>${esc(x.p.name)}</b></span>
          <span class="ptn-row-title">${esc(prodName(x.p.product_id))} · ${esc(k.label)}${x.d.platform ? ' · ' + esc(x.d.platform) : ''}${x.d.title ? ' · ' + esc(x.d.title) : ''}</span>
          <span class="cal-rank-views">${x.d.views ? int(x.d.views) + ' views' : ''}</span>
          ${x.d.link ? `<a class="ptn-row-link" href="${esc(x.d.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Abrir post"><i data-lucide="external-link"></i></a>` : '<span class="ptn-row-link"></span>'}
          <span class="ptn-chip" style="--c:${st.color}">${st.label}</span>
        </div>`;
      }).join('')}</div>`, `<button class="btn btn-theme" onclick="closeModal()">Fechar</button>`);
    lucide.createIcons();
  };
  // Abre o parceiro no módulo Parceiros, já na aba do produto dele
  window._calPartner = (id) => {
    const p = (STATE.crm.partners || []).find(x => x.id === id);
    if (!p) return;
    sessionStorage.setItem('ptn_product', p.product_id || '');
    openMod('partners');
    setTimeout(() => { window._ptnProduct && window._ptnProduct(p.product_id); window._ptnOpen && window._ptnOpen(id); }, 500);
  };
})();
