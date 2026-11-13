// ══════════════════════════════════════════════════════════
// HUB — projetos, conteúdos do dia e resultados dos afiliados
// ══════════════════════════════════════════════════════════
// A tela inicial é curta de propósito (o resto mora nos módulos):
//   1. Saudação com data e atalhos (nova negociação, novo contato)
//   2. Projetos: logo + nome de cada produto (bolinha se houver entrega atrasada)
//   3. Conteúdos do dia: o que os parceiros publicam hoje (do Calendário);
//      sem nada hoje, mostra o próximo dia com conteúdo
//   4. Resultados dos afiliados no mês (mesmos números do Dashboard, via AFF)
// Tarefas e negócios parados ficam fora de propósito (não são prioridade aqui).
// Reconstrói sempre que os widgets são reconstruídos (dados chegaram/mudaram).
// ══════════════════════════════════════════════════════════
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const LIMIT = 6;
  let _ptnRequested = false, _crmTry = 0, _crmTimer = null;

  const products = () => (STATE.crm?.products || []).filter(p => p.status !== 'inactive');
  const dayLabel = (key) => { const d = new Date(key + 'T12:00:00'); return `${WEEK[d.getDay()]}, ${d.getDate()}/${d.getMonth() + 1}`; };
  const fmtInt = (v) => Math.round(Number(v) || 0).toLocaleString('pt-BR');
  const fmtBRL = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: Math.abs(Number(v) || 0) >= 1000 ? 0 : 2 });

  // ── Projetos: só logo + nome ──────────────────────────────
  function _projects(today) {
    const list = products();
    if (!list.length) return '';
    const P = STATE.crm?.partners || [], D = STATE.crm?.partnerDeliveries || [];
    return `<nav class="hubt-projs">${list.map(pr => {
      const ids = new Set(P.filter(p => p.product_id === pr.id && p.status !== 'ended').map(p => p.id));
      const late = D.some(d => ids.has(d.partner_id) && d.status === 'planned' && d.due_date && d.due_date < today);
      const mark = pr.logo_url ? `<img src="${esc(pr.logo_url)}" alt="">` : '<i></i>';
      return `<button class="hubt-pj${late ? ' late' : ''}" style="--pc:${prodColor(pr)}" onclick="window._hubOpenProduct('${pr.id}')" title="Abrir ${esc(pr.name)}">${mark}<b>${esc(pr.name)}</b>${late ? '<em>atrasado</em>' : ''}</button>`;
    }).join('')}</nav>`;
  }

  // ── Conteúdos do dia (Calendário) ─────────────────────────
  const _kind = (d) => window.PTN?.kindOf ? PTN.kindOf(d.kind) : { label: d.kind || 'Conteúdo', icon: 'clapperboard' };
  function _contents(today) {
    const D = STATE.crm?.partnerDeliveries || [], P = STATE.crm?.partners || [];
    const live = new Map(P.filter(p => p.status !== 'ended').map(p => [p.id, p]));
    const valid = D.filter(d => d.due_date && live.has(d.partner_id) && d.status !== 'rejected');
    let day = today, items = valid.filter(d => d.due_date === today);
    if (!items.length) {
      // Nada hoje: mostra o próximo dia que tem conteúdo previsto
      const next = valid.filter(d => d.due_date > today).map(d => d.due_date).sort()[0];
      if (next) { day = next; items = valid.filter(d => d.due_date === next); }
    }
    const done = (d) => d.status === 'delivered' || d.status === 'approved';
    const rows = items.sort((a, b) => Number(done(a)) - Number(done(b))).map(d => {
      const p = live.get(d.partner_id);
      const prod = (STATE.crm.products || []).find(x => x.id === p.product_id);
      const k = _kind(d);
      return `<button class="hubt-row" style="--pc:${prod ? prodColor(prod) : 'var(--text3)'}" onclick="window._hubOpenPartner('${p.id}')">
        <span class="hubt-row-k">${esc(k.label)}</span>
        <span class="hubt-row-txt"><b>${esc(d.title || [k.label, d.platform].filter(Boolean).join(' · '))}</b><small>${prod ? `<span>${esc(prod.name)}</span> · ` : ''}${esc(p.name)}${d.platform && d.title ? ' · ' + esc(d.platform) : ''}</small></span>
        <span class="hubt-st ${done(d) ? 'on' : ''}">${done(d) ? 'no ar' : 'previsto'}</span>
      </button>`;
    });
    const title = day === today ? 'Conteúdos de hoje' : `Próximos conteúdos · ${dayLabel(day)}`;
    const loading = !STATE.crm?.ptnLoaded;
    return `<section class="hubt-col">
      <div class="hubt-sec-hdr"><span>${title}</span>${items.length ? `<i>${items.length} ${items.length === 1 ? 'conteúdo' : 'conteúdos'}</i>` : ''}
        <button class="hubt-more" onclick="openMod('calendar')">Calendário</button></div>
      <div class="hubt-list">${rows.length ? rows.slice(0, LIMIT).join('') + (rows.length > LIMIT ? `<button class="hubt-row hubt-row-more" onclick="openMod('calendar')">+ ${rows.length - LIMIT} no calendário</button>` : '')
        : `<div class="hubt-empty">${loading ? 'Carregando o calendário...' : 'Nenhum conteúdo previsto. Marque entregas no Calendário dos parceiros.'}</div>`}</div>
    </section>`;
  }

  // ── Resultados dos afiliados (mesma fonte do Dashboard) ───
  function _results(now) {
    if (!window.AFF) return '';
    const range = (off) => {
      const s = new Date(now.getFullYear(), now.getMonth() + off, 1);
      const last = new Date(now.getFullYear(), now.getMonth() + off + 1, 0).getDate();
      return [AFF.dateKey(s), AFF.dateKey(new Date(now.getFullYear(), now.getMonth() + off, Math.min(now.getDate(), last)))];
    };
    let label = `${MONTHS[now.getMonth()]} até hoje`;
    let cur = AFF.sum(AFF.rows(...range(0))), prev = AFF.sum(AFF.rows(...range(-1)));
    const empty = (t) => !t.deposits && !t.registrations && !t.ftd && !t.ngr;
    if (empty(cur)) {
      // Mês sem lançamento ainda: mostra o último mês com dados
      const lastKey = AFF.all().map(r => String(r.date || '').slice(0, 10)).filter(Boolean).sort().pop();
      if (lastKey) {
        const d = new Date(lastKey + 'T12:00:00');
        const s = AFF.dateKey(new Date(d.getFullYear(), d.getMonth(), 1)), e = AFF.dateKey(new Date(d.getFullYear(), d.getMonth() + 1, 0));
        const ps = AFF.dateKey(new Date(d.getFullYear(), d.getMonth() - 1, 1)), pe = AFF.dateKey(new Date(d.getFullYear(), d.getMonth(), 0));
        cur = AFF.sum(AFF.rows(s, e)); prev = AFF.sum(AFF.rows(ps, pe));
        label = `${MONTHS[d.getMonth()]}, último com dados`;
      }
    }
    const delta = (c, p) => p > 0 ? Math.round((c - p) / p * 100) : (c > 0 ? 100 : 0);
    const dl = (c, p) => { const v = delta(c, p); return v ? `<em class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v}%</em>` : ''; };
    const brl = (v) => fmtBRL(v).replace(/^R\$\s?/, '');
    const n = cur.affiliates.size;
    return `<section class="hubt-col">
      <div class="hubt-sec-hdr"><span>Afiliados</span><i>${label}${n ? ` · ${n} afiliado${n === 1 ? '' : 's'}` : ''}</i>
        <button class="hubt-more" onclick="openMod('dashboard')">Dashboard</button></div>
      <div class="hubt-big"><small>Depósitos ${dl(cur.deposits, prev.deposits)}</small><strong><sup>R$</sup>${brl(cur.deposits)}</strong></div>
      <div class="hubt-trio">
        <div><small>FTDs ${dl(cur.ftd, prev.ftd)}</small><strong>${fmtInt(cur.ftd)}</strong></div>
        <div><small>NGR ${dl(cur.ngr, prev.ngr)}</small><strong class="${cur.ngr < 0 ? 'neg' : ''}">${fmtBRL(cur.ngr)}</strong></div>
        <div><small>Cadastros ${dl(cur.registrations, prev.registrations)}</small><strong>${fmtInt(cur.registrations)}</strong></div>
      </div>
    </section>`;
  }

  // ── Render ────────────────────────────────────────────────
  window.buildHubToday = () => {
    const stage = document.querySelector('#hub .hub-stage');
    const strip = document.getElementById('hub-widget-strip');
    if (!stage || !strip || !STATE.user) return;
    // Sessão restaurada (F5) não passa pelo login, que é quem carrega o CRM, e o
    // boot ainda restaura o STATE depois. Por isso a checagem é a cada render
    // (com intervalo mínimo), e não uma vez só.
    if (!STATE.crm?.loaded && window.CRM?.loadAll && window.sb && Date.now() - _crmTry > 3000) {
      _crmTry = Date.now();
      CRM.loadAll().then(() => {
        if (!STATE.crm?.loaded) return;
        window.buildHubWidgets ? buildHubWidgets() : window.buildHubToday();
        if (window.updateHubHero) updateHubHero();
      }).catch(() => {});
    } else if (!STATE.crm?.loaded && !_crmTimer) {
      _crmTimer = setTimeout(() => { _crmTimer = null; window.buildHubToday(); }, 3100);
    }
    // Conteúdos e resultados de parceiros vêm do módulo Parceiros: carrega uma vez.
    if (!STATE.crm?.ptnLoaded && !_ptnRequested && window.CRM?.loadPartners) {
      _ptnRequested = true;
      CRM.loadPartners().then(ok => { if (ok) window.buildHubToday(); }).catch(() => {});
    }
    const now = new Date(), today = iso(now);

    const sub = document.getElementById('hub-hero-sub');
    if (sub) sub.innerHTML = `<span class="hubt-date">${WEEK[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}</span>`;
    const cta = document.getElementById('hub-hero-cta');
    if (cta) cta.innerHTML = '';

    let el = document.getElementById('hub-today');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hub-today';
      stage.insertBefore(el, strip);
    }
    el.innerHTML = `<div class="hubt-bar">${_projects(today)}<div class="hubt-cta">
        <button class="hubt-btn" onclick="window._hubNew('contact')">Novo contato</button>
        <button class="hubt-btn p" onclick="window._hubNew('deal')">Nova negociação</button></div></div>
      <div class="hubt-cols">${_contents(today)}${_results(now)}</div>`;
    if (window.lucide) lucide.createIcons();
  };

  // ── Ações ─────────────────────────────────────────────────
  window._hubNew = (kind) => {
    if (kind === 'contact') { openMod('contacts'); setTimeout(() => window._ctcOpenNew && _ctcOpenNew(), 450); return; }
    openMod('pipeline');
    setTimeout(() => window._pcrmOpenNewCard && _pcrmOpenNewCard(window._pcrmGetScope ? _pcrmGetScope() : 'rips'), 450);
  };
  window._hubOpenProduct = (id) => { openMod('partners'); setTimeout(() => window._ptnProduct && _ptnProduct(id), 350); };
  window._hubOpenPartner = (id) => {
    const p = (STATE.crm?.partners || []).find(x => x.id === id);
    openMod('partners');
    setTimeout(() => { if (p && window._ptnProduct) _ptnProduct(p.product_id); window._ptnOpen && _ptnOpen(id); }, 450);
  };
})();
