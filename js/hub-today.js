// ══════════════════════════════════════════════════════════
// HUB — "Para hoje" + projetos
// ══════════════════════════════════════════════════════════
// A tela inicial é curta de propósito (o resto mora nos módulos):
//   1. Saudação com data e atalhos (nova negociação, contato, tarefa)
//   2. Projetos: logo + nome de cada produto (bolinha se houver entrega atrasada)
//   3. Para hoje: os 5 itens mais urgentes (tarefas, entregas, negócios parados
//      há 14+ dias), com links para ver o resto de cada tipo
// Os widgets antigos ficam fora do Hub (o Dashboard tem os indicadores).
// Reconstrói sempre que os widgets são reconstruídos (dados chegaram/mudaram).
// ══════════════════════════════════════════════════════════
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const daysBetween = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 86400000);
  const daysSince = (ts) => ts ? Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)) : 0;
  const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const WEEK = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const LIMIT = 5;
  let _ptnRequested = false, _crmTry = 0, _crmTimer = null;

  const me = () => STATE.user || {};
  const products = () => (STATE.crm?.products || []).filter(p => p.status !== 'inactive');
  const stageOf = (id) => (window.CRM?.stageById ? CRM.stageById(id) : null);
  const openStage = (c) => {
    const st = stageOf(c.stage_id);
    if (!st || st.is_lost || st.is_won) return false;
    const n = (st.name || '').toLowerCase();
    return !n.includes('fechado') && !n.includes('follow');
  };

  // ── Itens "Para hoje" ─────────────────────────────────────
  function _tasks(today) {
    const all = (STATE.tasks || []).filter(t => t.status !== 'concluída' && t.dueDate && t.dueDate.slice(0, 10) <= today);
    const mine = all.filter(t => t.assignee && t.assignee === me().name);
    const list = (mine.length ? mine : all).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return list.map(t => {
      const late = daysBetween(t.dueDate.slice(0, 10), today);
      return {
        icon: 'check-square', title: t.title || 'Tarefa', meta: t.assignee || 'Sem responsável',
        badge: late > 0 ? `${late}d atrasada` : 'hoje', tone: late > 0 ? 'late' : 'today',
        click: `openMod('tasks')`,
      };
    });
  }
  const _dLabel = (d) => d.title || [window.PTN?.kindOf ? PTN.kindOf(d.kind).label : d.kind, d.platform].filter(Boolean).join(' · ') || 'Entrega';
  function _deliveries(today) {
    const D = STATE.crm?.partnerDeliveries || [], P = STATE.crm?.partners || [];
    const pById = (id) => P.find(p => p.id === id);
    const rows = [];
    D.forEach(d => {
      const p = pById(d.partner_id); if (!p || p.status === 'ended') return;
      const prod = (STATE.crm.products || []).find(x => x.id === p.product_id);
      const base = { mark: prod ? prodMark(prod, 18) : '', title: p.name, click: `window._hubOpenPartner('${p.id}')` };
      if (d.status === 'planned' && d.due_date && d.due_date <= today) {
        const late = daysBetween(d.due_date, today);
        rows.push({ ...base, meta: _dLabel(d), badge: late > 0 ? `${late}d atrasada` : 'hoje', tone: late > 0 ? 'late' : 'today', sort: -late });
      } else if (d.status === 'delivered') {
        rows.push({ ...base, meta: _dLabel(d), badge: 'aprovar', tone: 'review', sort: 1 });
      }
    });
    return rows.sort((a, b) => a.sort - b.sort);
  }
  // 1ª etapa de cada funil (abordagem) é backlog: parado ali é normal, igual ao Pipeline.
  const _backlog = () => {
    const ids = new Set(['rips', 'b2c', 'b2b'].map(sc => window.CRM?.stagesForScope?.(sc)?.[0]?.id).filter(Boolean));
    (STATE.crm?.stages || []).forEach(st => { if (/abordagem|wishlist|prospec/i.test(st.name || '')) ids.add(st.id); });
    return ids;
  };
  function _stalled() {
    const bl = _backlog();
    const all = (STATE.crm?.cards || []).filter(c => openStage(c) && !bl.has(c.stage_id) && daysSince(c.updated_at) >= 14);
    const mine = all.filter(c => c.owner && c.owner === me().id);
    return (mine.length ? mine : all)
      .sort((a, b) => daysSince(b.updated_at) - daysSince(a.updated_at))
      .map(c => {
        const prod = (STATE.crm.products || []).find(x => x.id === c.product_id);
        const st = stageOf(c.stage_id);
        return {
          mark: prod ? prodMark(prod, 18) : '', icon: prod ? '' : 'git-branch',
          title: c.title, meta: st ? st.name : '', badge: `${daysSince(c.updated_at)}d parado`, tone: 'stuck',
          click: `window._hubOpenCard('${c.id}','${c.scope}')`,
        };
      });
  }

  // ── Projetos: só logo + nome (alerta discreto se houver entrega atrasada) ──
  function _projects(today) {
    const list = products();
    if (!list.length) return '';
    const P = STATE.crm?.partners || [], D = STATE.crm?.partnerDeliveries || [];
    return `<section class="hubt-projects">
      <div class="hubt-proj-grid">${list.map(pr => {
        const ids = new Set(P.filter(p => p.product_id === pr.id && p.status !== 'ended').map(p => p.id));
        const late = D.some(d => ids.has(d.partner_id) && d.status === 'planned' && d.due_date && d.due_date < today);
        return `<button class="hubt-proj" style="--pc:${prodColor(pr)}" onclick="window._hubOpenProduct('${pr.id}')" title="Abrir ${esc(pr.name)}">
          ${prodMark(pr, 28)}<b>${esc(pr.name)}</b>${late ? '<i class="hubt-dot" title="Entrega atrasada"></i>' : ''}</button>`;
      }).join('')}</div>
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
    // Entregas vêm dos parceiros: carrega uma vez em segundo plano.
    if (!STATE.crm?.ptnLoaded && !_ptnRequested && window.CRM?.loadPartners) {
      _ptnRequested = true;
      CRM.loadPartners().then(ok => { if (ok) window.buildHubToday(); }).catch(() => {});
    }
    const now = new Date(), today = iso(now);
    const tasks = _tasks(today), delivs = _deliveries(today), stalled = _stalled();

    // Saudação: data em sobretítulo + resumo + atalhos
    const sub = document.getElementById('hub-hero-sub');
    if (sub) sub.innerHTML = `<span class="hubt-date">${WEEK[now.getDay()]}, ${now.getDate()} de ${MONTHS[now.getMonth()]}</span>`;
    const cta = document.getElementById('hub-hero-cta');
    if (cta) cta.innerHTML = `
      <button class="btn btn-theme" onclick="window._hubNew('deal')"><i data-lucide="plus"></i> Nova negociação</button>
      <button class="btn btn-outline" onclick="window._hubNew('contact')"><i data-lucide="user-plus"></i> Novo contato</button>
      <button class="btn btn-outline" onclick="window._hubNew('task')"><i data-lucide="check-square"></i> Nova tarefa</button>`;

    let el = document.getElementById('hub-today');
    if (!el) {
      el = document.createElement('div');
      el.id = 'hub-today';
      stage.insertBefore(el, strip);
    }
    // Uma lista só, com o que é mais urgente primeiro, no máximo 5 itens.
    const top = [...tasks.filter(r => r.tone === 'late'), ...delivs.filter(r => r.tone === 'late'),
      ...tasks.filter(r => r.tone !== 'late'), ...delivs.filter(r => r.tone !== 'late'), ...stalled].slice(0, LIMIT);
    const links = [
      tasks.length ? `<button onclick="openMod('tasks')">${tasks.length} tarefa${tasks.length === 1 ? '' : 's'}</button>` : '',
      delivs.length ? `<button onclick="openMod('calendar')">${delivs.length} entrega${delivs.length === 1 ? '' : 's'}</button>` : '',
      stalled.length ? `<button onclick="openMod('pipeline')">${stalled.length} negócio${stalled.length === 1 ? '' : 's'} parado${stalled.length === 1 ? '' : 's'}</button>` : '',
    ].filter(Boolean).join('');
    el.innerHTML = `${_projects(today)}
      <section class="hubt-today">
        <div class="hubt-sec-hdr"><span>Para hoje</span>${links ? `<span class="hubt-links">${links}</span>` : ''}</div>
        <div class="hubt-group">
          ${top.length ? top.map(r => `<button class="hubt-row" onclick="${r.click}">
              <span class="hubt-row-ic">${r.mark || `<i data-lucide="${r.icon || 'circle'}"></i>`}</span>
              <span class="hubt-row-txt"><b>${esc(r.title)}</b>${r.meta ? `<small>${esc(r.meta)}</small>` : ''}</span>
              <span class="hubt-badge ${r.tone}">${r.badge}</span>
            </button>`).join('') : '<div class="hubt-empty">Nada pendente para hoje. Bora puxar uma call?</div>'}
        </div>
      </section>`;
    if (window.lucide) lucide.createIcons();
  };

  // ── Ações ─────────────────────────────────────────────────
  window._hubNew = (kind) => {
    if (kind === 'task') { window.openNewTask && openNewTask(); return; }
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
  window._hubOpenCard = (id, scope) => {
    openMod('pipeline');
    setTimeout(() => { if (scope && window._pcrmSwitchTab) _pcrmSwitchTab(scope); window._pcrmOpenCard && _pcrmOpenCard(id); }, 450);
  };
})();
