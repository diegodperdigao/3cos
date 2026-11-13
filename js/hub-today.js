// ══════════════════════════════════════════════════════════
// HUB — a porta de entrada dos universos
// ══════════════════════════════════════════════════════════
// A tela inicial é só isto:
//   1. Saudação com data e atalhos (novo contato, nova negociação)
//   2. Resultados do mês em destaque (mesma fonte do Dashboard)
//   3. Um cartão por marca (Chute, Rips, Sortudão...) com os macro resultados
//      do mês. Clicar entra no universo da marca (js/shell.js).
// Números do cartão (mês corrente):
//   · Pipeline: negociações em aberto, leads novos no mês, negócios fechados no mês
//   · Parceiros: em operação, entregas feitas/previstas no mês, atrasadas
//   · Resultado: investimento fixo mensal, FTDs e depósitos dos parceiros
// Reconstrói sempre que os widgets são reconstruídos (dados chegaram/mudaram).
// ══════════════════════════════════════════════════════════
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  let _ptnRequested = false, _crmTry = 0, _crmTimer = null;

  const products = () => (STATE.crm?.products || []).filter(p => p.status !== 'inactive');
  const slug = (n) => String(n || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const fmtInt = (v) => Math.round(Number(v) || 0).toLocaleString('pt-BR');
  const fmtBRL = (v) => {
    const n = Number(v) || 0;
    if (Math.abs(n) >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
    if (Math.abs(n) >= 1e4) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  };

  // ── Números de uma marca no mês ───────────────────────────
  function _stats(pr, today) {
    const ym = today.slice(0, 7);
    const sc = slug(pr.name);
    const stages = new Map((STATE.crm?.stages || []).map(s => [s.id, s]));
    const cards = (STATE.crm?.cards || []).filter(c => c.product_id === pr.id || c.scope === sc);
    const isWon = (c) => stages.get(c.stage_id)?.is_won;
    const isLost = (c) => stages.get(c.stage_id)?.is_lost || !!c.lost_at;
    const inMonth = (ts) => String(ts || '').slice(0, 7) === ym;
    const P = (STATE.crm?.partners || []).filter(p => p.product_id === pr.id && p.status !== 'ended');
    const ids = new Set(P.map(p => p.id));
    const D = (STATE.crm?.partnerDeliveries || []).filter(d => ids.has(d.partner_id) && d.status !== 'rejected');
    const month = D.filter(d => (d.due_date || '').slice(0, 7) === ym);
    const done = (d) => d.status === 'delivered' || d.status === 'approved';
    const R = (STATE.crm?.partnerResults || []).filter(r => ids.has(r.partner_id) && String(r.period || '').slice(0, 7) === ym);
    const sum = (k) => R.reduce((t, r) => t + (Number(r[k]) || 0), 0);
    const m0 = new Date(Number(ym.slice(0, 4)), Number(ym.slice(5, 7)) - 1, 1);
    const live = P.filter(p => !window.PTN?.activeIn || PTN.activeIn(p, m0));
    return {
      open: cards.filter(c => !isWon(c) && !isLost(c)).length,
      newLeads: cards.filter(c => inMonth(c.created_at)).length,
      won: cards.filter(c => isWon(c) && inMonth(c.closed_at || c.updated_at)).length,
      partners: P.length,
      delivDone: month.filter(done).length, delivAll: month.length,
      late: D.filter(d => d.status === 'planned' && d.due_date && d.due_date < today).length,
      // a pagar no mês (Fixo = valor; Mínimo garantido = o maior entre mínimo e % da receita)
      invest: live.reduce((t, p) => t + (window.PTN?.payOf ? PTN.payOf(p, m0).value : (Number(p.monthly_value) || 0)), 0),
      registrations: sum('registrations'), ftd: sum('ftd'), deposits: sum('deposits'), hasResults: R.length > 0,
    };
  }

  // ── Cartão de uma marca ───────────────────────────────────
  function _card(pr, today) {
    const meta = window.brandMeta ? brandMeta(pr) : { slug: 'custom', logo: pr.logo_url, accent: prodColor(pr) };
    const logo = meta.logo || pr.logo_url;
    const logoDark = meta.logoDark || logo;
    const mark = logo ? `<img class="brand-h-dark" src="${esc(logo)}" alt="${esc(pr.name)}"><img class="brand-h-light" src="${esc(logoDark)}" alt="${esc(pr.name)}">` : `<b>${esc(pr.name)}</b>`;
    const ld = !STATE.crm?.ptnLoaded;
    const s = _stats(pr, today);
    const v = (x) => (ld ? '–' : x);
    const stat = (val, label, cls = '') => `<span class="${cls}"><b>${val}</b><small>${label}</small></span>`;
    return `<button class="hubt-brand" data-b="${esc(meta.slug)}" style="--pc:${esc(meta.accent || prodColor(pr))}" onclick="enterBrand('${pr.id}')" title="Entrar no universo ${esc(pr.name)}">
      <span class="hubt-brand-head"><span class="hubt-brand-logo">${mark}</span><span class="hubt-brand-go">Entrar <i data-lucide="arrow-right"></i></span></span>
      <span class="hubt-brand-sec hubt-brand-res"><span class="hubt-brand-lbl">Resultado do mês</span><span class="hubt-brand-stats s4">
        ${stat(v(s.invest ? fmtBRL(s.invest) : '—'), 'a pagar')}${stat(v(s.hasResults ? fmtInt(s.registrations) : '—'), 'cadastros')}${stat(v(s.hasResults ? fmtInt(s.ftd) : '—'), 'FTDs')}${stat(v(s.hasResults ? fmtBRL(s.deposits) : '—'), 'depósitos')}</span></span>
      <span class="hubt-brand-sec"><span class="hubt-brand-lbl">Pipeline</span><span class="hubt-brand-stats">
        ${stat(fmtInt(s.open), 'em aberto')}${stat(fmtInt(s.newLeads), 'novos no mês')}${stat(fmtInt(s.won), 'fechados no mês')}</span></span>
      <span class="hubt-brand-sec"><span class="hubt-brand-lbl">Parceiros</span><span class="hubt-brand-stats">
        ${stat(v(fmtInt(s.partners)), 'em operação')}${stat(v(`${s.delivDone}/${s.delivAll}`), 'entregas no mês')}${stat(v(fmtInt(s.late)), s.late === 1 ? 'atrasada' : 'atrasadas', s.late && !ld ? 'late' : '')}</span></span>
    </button>`;
  }

  // ── Resultados (topo do Início) ───────────────────────────
  // Mesma fonte do Dashboard (AFF: relatórios das casas + resultados dos parceiros).
  // Mês atual até hoje × mesmo trecho do mês anterior; sem lançamento no mês, mostra
  // o último mês com dados. Investimento = "a pagar" aos parceiros no mês.
  function _results(now) {
    if (!window.AFF) return '';
    const key = (d) => AFF.dateKey(d);
    const range = (y, m, uptoDay) => {
      const last = new Date(y, m + 1, 0).getDate();
      return [key(new Date(y, m, 1)), key(new Date(y, m, Math.min(uptoDay || last, last)))];
    };
    let y = now.getFullYear(), m = now.getMonth(), upto = now.getDate();
    let label = `${MONTHS[m]} até hoje`;
    let cur = AFF.sum(AFF.rows(...range(y, m, upto)));
    const empty = (t) => !t.deposits && !t.registrations && !t.ftd && !t.ngr;
    if (empty(cur)) {
      const lastKey = AFF.all().map(r => String(r.date || '').slice(0, 10)).filter(Boolean).sort().pop();
      if (lastKey) {
        const d = new Date(lastKey + 'T12:00:00');
        y = d.getFullYear(); m = d.getMonth(); upto = null;
        cur = AFF.sum(AFF.rows(...range(y, m)));
        label = `${MONTHS[m]} de ${y} · último mês com dados`;
      }
    }
    const pm = new Date(y, m - 1, 1);
    const prev = AFF.sum(AFF.rows(...range(pm.getFullYear(), pm.getMonth(), upto)));
    // Investimento é sempre o do mês corrente (o que a 3C paga agora)
    const m0 = new Date(now.getFullYear(), now.getMonth(), 1);
    const P = (STATE.crm?.partners || []).filter(p => p.status !== 'ended' && (!window.PTN?.activeIn || PTN.activeIn(p, m0)));
    const invest = P.reduce((t, p) => t + (window.PTN?.payOf ? PTN.payOf(p, m0).value : (Number(p.monthly_value) || 0)), 0);
    const delta = (c, p) => { if (!(p > 0)) return ''; const v = Math.round((c - p) / p * 100); return v ? `<em class="${v > 0 ? 'up' : 'down'}">${v > 0 ? '+' : ''}${v}% vs mês anterior</em>` : '<em>igual ao mês anterior</em>'; };
    const brl = (v) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    const kpi = (lbl, val, sub, cls = '') => `<div class="hubr-kpi ${cls}"><small>${lbl}</small><b>${val}</b>${sub || '<em>&nbsp;</em>'}</div>`;
    const n = cur.affiliates.size;
    return `<section class="hubr" aria-label="Resultados">
      <div class="hubt-sec-hdr"><span>Resultados</span><i>${label}${n ? ` · ${n} afiliado${n === 1 ? '' : 's'}` : ''}</i>
        <button class="hubt-more" onclick="go3C('dashboard')">Ver no Dashboard</button></div>
      <div class="hubr-grid">
        ${kpi('Depósitos', brl(cur.deposits), delta(cur.deposits, prev.deposits), 'big')}
        ${kpi('FTDs', fmtInt(cur.ftd), delta(cur.ftd, prev.ftd))}
        ${kpi('Cadastros', fmtInt(cur.registrations), delta(cur.registrations, prev.registrations))}
        ${kpi('NGR', brl(cur.ngr), delta(cur.ngr, prev.ngr), cur.ngr < 0 ? 'neg' : '')}
        ${kpi('Investimento em parceiros', brl(invest), `<em>a pagar em ${MONTHS[now.getMonth()]} a ${P.length} parceiro${P.length === 1 ? '' : 's'}</em>`)}
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
    // Parceiros, entregas e resultados vêm do módulo Parceiros: carrega uma vez.
    if (!STATE.crm?.ptnLoaded && !_ptnRequested && window.CRM?.loadPartners) {
      _ptnRequested = true;
      CRM.loadPartners().then(ok => { if (ok) window.buildHubToday(); }).catch(() => {});
    }
    const now = new Date(), today = iso(now);

    const sub = document.getElementById('hub-hero-sub');
    if (sub) sub.innerHTML = `<span class="hubt-date">${WEEK[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}</span>`;
    const cta = document.getElementById('hub-hero-cta');
    if (cta) cta.innerHTML = `<button class="hubt-btn" onclick="window._hubNew('contact')"><i data-lucide="user-plus"></i>Novo contato</button>
        <button class="hubt-btn p" onclick="window._hubNew('deal')"><i data-lucide="plus"></i>Nova negociação</button>`;

    let el = document.getElementById('hub-today');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hub-today';
      stage.insertBefore(el, strip);
    }
    const list = products();
    el.innerHTML = _results(now) + (list.length
      ? `<div class="hubt-sec-hdr hubt-brands-hdr"><span>Marcas</span><i>${MONTHS[now.getMonth()]} até hoje · clique para entrar</i></div>
         <section class="hubt-brands" aria-label="Marcas">${list.map(pr => _card(pr, today)).join('')}</section>`
      : `<div class="hubt-empty">Nenhuma marca cadastrada. Cadastre em Configurações › Produtos.</div>`);
    if (window.renderSide) renderSide();
    if (window.lucide) lucide.createIcons();
  };

  // ── Ações ─────────────────────────────────────────────────
  window._hubNew = (kind) => {
    if (kind === 'contact') { (window.go3C || openMod)('contacts'); setTimeout(() => window._ctcOpenNew && _ctcOpenNew(), 450); return; }
    // As pipelines moram dentro das marcas: pergunta em qual
    const brands = products().filter(pr => window.brandMeta && (STATE.crm?.stages || []).some(st => st.scope === slug(pr.name)));
    const go = (pid, sc) => `closeModal();${pid ? `enterBrand('${pid}','pipeline')` : `go3C('pipeline')`};setTimeout(()=>window._pcrmOpenNewCard&&_pcrmOpenNewCard('${sc}'),550)`;
    openModal('Nova negociação', `<div class="hubn-hint">Em qual pipeline?</div>
      <div class="hubn-grid">${brands.map(pr => { const m = brandMeta(pr); const lg = m.logo || pr.logo_url; const lgd = m.logoDark || lg;
        return `<button class="hubn-brand" style="--pc:${esc(m.accent)}" onclick="${go(pr.id, slug(pr.name))}">${lg ? `<img class="brand-h-dark" src="${esc(lg)}" alt="${esc(pr.name)}"><img class="brand-h-light" src="${esc(lgd)}" alt="${esc(pr.name)}">` : `<b>${esc(pr.name)}</b>`}</button>`; }).join('')}</div>
      <div class="hubn-other">Ou nos funis gerais da 3C: <button class="hubt-more" onclick="${go('', 'b2c')}">B2C</button> · <button class="hubt-more" onclick="${go('', 'b2b')}">B2B</button></div>`, '');
    if (window.lucide) lucide.createIcons();
  };
  window._hubOpenProduct = (id) => window.enterBrand ? enterBrand(id) : openMod('partners');
})();
