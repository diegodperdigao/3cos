// ══════════════════════════════════════════════════════════
// CRM — PIPELINE (B2B + B2C em 1 módulo com abas)
// ══════════════════════════════════════════════════════════
// Renderiza um Kanban que lê de crm.pipeline_cards + crm.pipeline_stages.
// Duas abas no topo (B2B / B2C) alternam o scope ativo. Filtros, métricas
// e stages são independentes por scope. Persistência de scope ativo em
// sessionStorage para manter contexto ao navegar.
// ══════════════════════════════════════════════════════════

(function () {
  // Scope ativo (persistido na sessão)
  let _scope = sessionStorage.getItem('pcrm_scope') || 'b2b';

  // Filtros independentes por scope
  const F = {
    b2b: { search: '', owner: 'all' },
    b2c: { search: '', owner: 'all' },
  };

  const SCOPE_META = {
    b2b: { label: 'B2B', title: 'B2B — Marcas', sub: 'Negociações com marcas e empresas', icon: 'briefcase', color: 'var(--blue)' },
    b2c: { label: 'B2C', title: 'B2C — Influencers', sub: 'Negociações com influencers e afiliados', icon: 'megaphone', color: 'var(--theme)' },
  };

  function _setScope(scope) {
    _scope = scope;
    sessionStorage.setItem('pcrm_scope', scope);
  }

  // ── MOUNT ─────────────────────────────────────────────────
  async function bPipelineCRM(el) {
    const ownerOpts = (STATE.users || []).map(u =>
      `<option value="${u.id}">${_esc(u.name)}</option>`
    ).join('');

    el.innerHTML = modHdr('Pipeline — B2B & B2C') + `<div class="mod-body">
      ${heroHTML('pipeline-crm', 'CRM Comercial', 'Pipeline', 'Funil de negociações B2B e B2C')}
      <div class="mod-main">
        <!-- Abas de scope -->
        <div class="pcrm-tabs">
          <button class="pcrm-tab ${_scope === 'b2b' ? 'on' : ''}" data-scope="b2b" onclick="window._pcrmSwitchTab('b2b')">
            <i data-lucide="briefcase"></i>
            <span>B2B — Marcas</span>
            <span class="pcrm-tab-count" id="pcrm-count-b2b"></span>
          </button>
          <button class="pcrm-tab ${_scope === 'b2c' ? 'on' : ''}" data-scope="b2c" onclick="window._pcrmSwitchTab('b2c')">
            <i data-lucide="megaphone"></i>
            <span>B2C — Influencers</span>
            <span class="pcrm-tab-count" id="pcrm-count-b2c"></span>
          </button>
        </div>

        <div class="sec-hdr" style="margin-top:16px">
          <div class="sec-lbl" id="pcrm-sec-label">Kanban ${SCOPE_META[_scope].label}</div>
          <div class="sec-actions">
            <button class="btn btn-outline" onclick="window._pcrmManageStages(window._pcrmGetScope())"><i data-lucide="list"></i> Etapas</button>
            <button class="btn btn-theme" onclick="window._pcrmOpenNewCard(window._pcrmGetScope())"><i data-lucide="plus"></i> Nova negociação</button>
          </div>
        </div>

        <div class="pipe-filters">
          <div class="pipe-filter-group">
            <label>Busca</label>
            <input class="fi pipe-filter-select" id="pcrm-search" placeholder="Título, empresa, contato..." oninput="window._pcrmSearch(window._pcrmGetScope(), this.value)">
          </div>
          <div class="pipe-filter-group">
            <label>Responsável</label>
            <select class="fi pipe-filter-select" id="pcrm-owner" onchange="window._pcrmOwner(window._pcrmGetScope(), this.value)">
              <option value="all">Todos</option>
              <option value="mine">Meus negócios</option>
              ${ownerOpts}
            </select>
          </div>
          <div class="pipe-filter-group pipe-metrics" id="pcrm-metrics"></div>
        </div>

        <div class="kanban" id="pcrm-board"></div>
      </div></div>`;

    // Carrega CRM se necessário
    if (!STATE.crm.loaded && window.CRM?.loadAll) {
      document.getElementById('pcrm-board').innerHTML =
        '<div class="empty" style="grid-column:1/-1"><i data-lucide="loader"></i><p>Carregando...</p></div>';
      lucide.createIcons();
      const ok = await CRM.loadAll();
      if (!ok) {
        document.getElementById('pcrm-board').innerHTML =
          '<div class="empty" style="grid-column:1/-1"><i data-lucide="alert-triangle" style="color:var(--amber)"></i><p>Erro ao carregar. Verifique se o schema `crm` está exposto na API do Supabase.</p></div>';
        lucide.createIcons();
        return;
      }
    }
    _renderBoard(_scope);
    _renderTabCounts();
    lucide.createIcons();
  }
  window.bPipelineCRM = bPipelineCRM;
  window._pcrmGetScope = () => _scope;

  // Troca de aba B2B ⇄ B2C
  window._pcrmSwitchTab = (scope) => {
    _setScope(scope);
    // Atualiza aba visual
    document.querySelectorAll('.pcrm-tab').forEach(t => {
      t.classList.toggle('on', t.dataset.scope === scope);
    });
    // Atualiza label e inputs ao filtro ativo do scope
    const sec = document.getElementById('pcrm-sec-label');
    if (sec) sec.textContent = `Kanban ${SCOPE_META[scope].label}`;
    const srch = document.getElementById('pcrm-search');
    if (srch) srch.value = F[scope].search;
    const ow = document.getElementById('pcrm-owner');
    if (ow) ow.value = F[scope].owner;
    _renderBoard(scope);
  };

  function _renderTabCounts() {
    const b2b = (STATE.crm.cards || []).filter(c => c.scope === 'b2b').length;
    const b2c = (STATE.crm.cards || []).filter(c => c.scope === 'b2c').length;
    const el1 = document.getElementById('pcrm-count-b2b');
    const el2 = document.getElementById('pcrm-count-b2c');
    if (el1) el1.textContent = b2b;
    if (el2) el2.textContent = b2c;
  }

  // ── RENDER ────────────────────────────────────────────────
  function _renderBoard(scope) {
    const board = document.getElementById('pcrm-board');
    if (!board) return;
    const stages = CRM.stagesForScope(scope);
    let cards = CRM.cardsForScope(scope);
    const f = F[scope];

    // Filtros
    if (f.owner === 'mine' && STATE.user?.id) cards = cards.filter(c => c.owner === STATE.user.id);
    else if (f.owner && f.owner !== 'all') cards = cards.filter(c => c.owner === f.owner);
    if (f.search) {
      const q = f.search.toLowerCase();
      cards = cards.filter(c => {
        const contact = CRM.contactById(c.contact_id);
        return (c.title || '').toLowerCase().includes(q)
          || (contact?.name || '').toLowerCase().includes(q)
          || (contact?.company || '').toLowerCase().includes(q);
      });
    }

    // Métricas
    const totalValue = cards.reduce((s, c) => s + (Number(c.value) || 0), 0);
    const weighted = cards.reduce((s, c) => s + (Number(c.value) || 0) * (Number(c.probability) || 0) / 100, 0);
    const metricsEl = document.getElementById('pcrm-metrics');
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div class="pipe-metric"><span class="pipe-metric-k">Negociações</span><span class="pipe-metric-v">${cards.length}</span></div>
        <div class="pipe-metric"><span class="pipe-metric-k">Pipeline</span><span class="pipe-metric-v">${_fmt(totalValue)}</span></div>
        <div class="pipe-metric"><span class="pipe-metric-k">Esperado</span><span class="pipe-metric-v" style="color:var(--green)">${_fmt(weighted)}</span></div>
      `;
    }

    if (!stages.length) {
      board.innerHTML = `<div class="empty" style="grid-column:1/-1">
        <i data-lucide="layers"></i>
        <p>Nenhuma etapa configurada</p>
        <button class="btn btn-theme" onclick="window._pcrmManageStages('${scope}')" style="margin-top:12px"><i data-lucide="plus"></i> Criar etapas</button>
      </div>`;
      lucide.createIcons();
      return;
    }

    _renderTabCounts();
    board.style.gridTemplateColumns = `repeat(${stages.length}, minmax(240px, 1fr))`;
    board.innerHTML = stages.map(stage => {
      const stageCards = cards.filter(c => c.stage_id === stage.id);
      const stageTotal = stageCards.reduce((s, c) => s + (Number(c.value) || 0), 0);
      return `<div class="kan-col" data-stage="${stage.id}"
          ondragover="event.preventDefault();this.classList.add('kan-col-drop')"
          ondragleave="this.classList.remove('kan-col-drop')"
          ondrop="window._pcrmDrop(event, '${stage.id}', '${scope}')">
        <div class="kan-col-hdr">
          <span class="kan-stage-dot" style="background:${stage.color || '#94a3b8'}"></span>
          <span class="kan-stage-name">${_esc(stage.name)}</span>
          <span class="kan-stage-count">${stageCards.length}</span>
        </div>
        <div class="kan-col-total">${_fmt(stageTotal)}</div>
        <div class="kan-cards">
          ${stageCards.map(card => _cardHTML(card)).join('')}
        </div>
      </div>`;
    }).join('');
    lucide.createIcons();
  }

  function _cardHTML(card) {
    const contact = CRM.contactById(card.contact_id);
    const product = CRM.productById(card.product_id);
    const prob = Number(card.probability) || 0;
    const probColor = prob >= 70 ? 'var(--green)' : prob >= 40 ? 'var(--amber)' : 'var(--text3)';

    // Avatar do contato: avatar_url manual > iniciais em gradiente
    let avatarHTML = '';
    if (contact) {
      let h = 0; for (let i = 0; i < (contact.name || '').length; i++) h = (h * 31 + contact.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const initials = (contact.name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
      const fallback = `hsl(${hue},30%,46%)`;
      if (contact.avatar_url) {
        avatarHTML = `<img class="kan-card-av" src="${contact.avatar_url}" alt=""
          onerror="const d=document.createElement('div');d.className='kan-card-av';d.textContent='${initials}';d.style.background='${fallback}';this.replaceWith(d)">`;
      } else {
        avatarHTML = `<div class="kan-card-av" style="background:${fallback}">${initials}</div>`;
      }
    }

    return `<div class="kan-card"
        draggable="true"
        ondragstart="event.dataTransfer.setData('text/plain', '${card.id}'); this.classList.add('kan-card-drag')"
        ondragend="this.classList.remove('kan-card-drag')"
        onclick="window._pcrmOpenCard('${card.id}')">
      ${product ? `<div class="kan-card-tag" style="background:${product.color || '#94a3b8'}22;color:${product.color || '#94a3b8'};border:1px solid ${product.color || '#94a3b8'}44">
        <i data-lucide="package" style="width:9px;height:9px"></i> ${_esc(product.name)}
      </div>` : ''}
      <div class="kan-card-title">${_esc(card.title)}</div>
      ${contact ? `<div class="kan-card-contact">
        ${avatarHTML}
        <span class="kan-card-contact-name">${_esc(contact.name)}</span>
      </div>` : ''}
      <div class="kan-card-value-row">
        <div class="kan-card-value">${_fmt(card.value)}</div>
        <div class="kan-card-prob" style="color:${probColor}">
          <svg viewBox="0 0 36 36" style="width:28px;height:28px">
            <circle cx="18" cy="18" r="14" fill="none" stroke="var(--bg)" stroke-width="3"/>
            <circle cx="18" cy="18" r="14" fill="none" stroke="${probColor}" stroke-width="3"
              stroke-dasharray="${(prob/100)*87.96} 87.96" stroke-linecap="round"
              transform="rotate(-90 18 18)"/>
            <text x="18" y="22" text-anchor="middle" fill="${probColor}" font-size="9" font-weight="700">${prob}</text>
          </svg>
        </div>
      </div>
    </div>`;
  }

  // ── DRAG & DROP ────────────────────────────────────────────
  window._pcrmDrop = async (ev, stageId, scope) => {
    ev.preventDefault();
    ev.currentTarget.classList.remove('kan-col-drop');
    const cardId = ev.dataTransfer.getData('text/plain');
    if (!cardId) return;
    try {
      await CRM.cards.moveToStage(cardId, stageId);
      _renderBoard(scope);
    } catch (e) {
      toast('Erro ao mover: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── FILTROS ────────────────────────────────────────────────
  window._pcrmSearch = (scope, v) => { F[scope].search = v.trim().toLowerCase(); _renderBoard(scope); };
  window._pcrmOwner = (scope, v) => { F[scope].owner = v; _renderBoard(scope); };

  // ── NOVO CARD ──────────────────────────────────────────────
  window._pcrmOpenNewCard = (scope) => {
    const meta = SCOPE_META[scope];
    const stages = CRM.stagesForScope(scope);
    const contacts = STATE.crm.contacts || [];
    const products = STATE.crm.products || [];

    if (!stages.length) { toast('Crie as etapas primeiro', 'w'); return; }
    if (!contacts.length) { toast('Adicione pelo menos um contato antes', 'w'); return; }

    const body = `
      <div class="form-grid">
        <div class="ff"><label>Contato *</label>
          <div class="pcrm-contact-picker">
            <input id="pcrm-f-contact-search" class="fi" type="text" autocomplete="off"
              placeholder="Digite o nome, empresa ou @instagram..."
              oninput="window._pcrmContactSearch(this.value)"
              onfocus="window._pcrmContactSearch(this.value)"
              onblur="setTimeout(()=>{const r=document.getElementById('pcrm-contact-results');if(r)r.style.display='none'},200)">
            <input id="pcrm-f-contact" type="hidden" value="">
            <div id="pcrm-f-contact-selected" class="pcrm-contact-selected" style="display:none"></div>
            <div id="pcrm-contact-results" class="pcrm-contact-results" style="display:none"></div>
          </div>
        </div>
        <div class="ff"><label>Título da negociação *</label>
          <input id="pcrm-f-title" class="fi" type="text" placeholder="Ex: Parceria Q1 2027">
        </div>
        <div class="form-row">
          <div class="ff"><label>Produto</label>
            <select id="pcrm-f-product" class="fi">
              <option value="">—</option>
              ${products.map(p => `<option value="${p.id}">${_esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Etapa inicial</label>
            <select id="pcrm-f-stage" class="fi">
              ${stages.map(s => `<option value="${s.id}">${_esc(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="ff"><label>Valor (R$)</label>
            <input id="pcrm-f-value" class="fi" type="number" step="0.01" value="0">
          </div>
          <div class="ff"><label>Probabilidade (%)</label>
            <input id="pcrm-f-prob" class="fi" type="number" min="0" max="100" value="25">
          </div>
        </div>
        <div class="ff"><label>Notas</label>
          <textarea id="pcrm-f-notes" rows="3" placeholder="Contexto, próximos passos..."></textarea>
        </div>
      </div>`;

    openModal(`Nova negociação ${meta.label}`, body, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="window._pcrmSaveNewCard('${scope}')"><i data-lucide="check"></i> Criar</button>
    `);
    lucide.createIcons();
  };

  // Autocomplete do contato no form de nova negociação
  window._pcrmContactSearch = (q) => {
    const results = document.getElementById('pcrm-contact-results');
    if (!results) return;
    const term = q.trim().toLowerCase();
    let list = STATE.crm?.contacts || [];
    if (term) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(term)
        || (c.company || '').toLowerCase().includes(term)
        || (c.email || '').toLowerCase().includes(term)
        || (c.social_links?.instagram || '').toLowerCase().includes(term)
      );
    }
    list = list.slice(0, 8);
    if (!list.length) {
      results.innerHTML = `<div class="pcrm-contact-empty">Nenhum contato encontrado.
        <br><a onclick="closeModal();openMod('contacts')" style="color:var(--theme);cursor:pointer;font-size:11px">Ir para Contatos →</a></div>`;
      results.style.display = 'block';
      return;
    }
    results.innerHTML = list.map(c => {
      const initials = (c.name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
      let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const ig = c.social_links?.instagram;
      return `<div class="pcrm-contact-opt" onclick="window._pcrmPickContact('${c.id}')">
        <span class="pcrm-contact-opt-av" style="background:hsl(${hue},30%,46%)">${initials}</span>
        <div class="pcrm-contact-opt-info">
          <div class="pcrm-contact-opt-name">${_esc(c.name)}</div>
          <div class="pcrm-contact-opt-sub">${c.company ? _esc(c.company) : ig ? '@' + _esc(ig) : c.email ? _esc(c.email) : '—'}</div>
        </div>
      </div>`;
    }).join('');
    results.style.display = 'block';
  };

  window._pcrmPickContact = (id) => {
    const c = (STATE.crm?.contacts || []).find(x => x.id === id);
    if (!c) return;
    document.getElementById('pcrm-f-contact').value = id;
    document.getElementById('pcrm-f-contact-search').style.display = 'none';
    document.getElementById('pcrm-contact-results').style.display = 'none';

    const selected = document.getElementById('pcrm-f-contact-selected');
    const initials = (c.name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
    let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    selected.innerHTML = `
      <span class="pcrm-contact-opt-av" style="background:hsl(${hue},30%,46%)">${initials}</span>
      <div class="pcrm-contact-opt-info">
        <div class="pcrm-contact-opt-name">${_esc(c.name)}</div>
        <div class="pcrm-contact-opt-sub">${c.company ? _esc(c.company) : (c.email || '—')}</div>
      </div>
      <button class="pcrm-contact-clear" onclick="window._pcrmClearContact()" type="button">
        <i data-lucide="x" style="width:14px;height:14px"></i>
      </button>
    `;
    selected.style.display = 'flex';

    // Auto-sugere o título com nome do contato (user pode editar)
    const titleInput = document.getElementById('pcrm-f-title');
    if (titleInput && !titleInput.value) {
      titleInput.value = c.name + (c.company ? ' · ' + c.company : '');
    }
    if (window.lucide) lucide.createIcons();
  };

  window._pcrmClearContact = () => {
    document.getElementById('pcrm-f-contact').value = '';
    document.getElementById('pcrm-f-contact-selected').style.display = 'none';
    const search = document.getElementById('pcrm-f-contact-search');
    search.value = '';
    search.style.display = '';
    search.focus();
  };

  window._pcrmSaveNewCard = async (scope) => {
    const get = (id) => document.getElementById(id)?.value || '';
    const payload = {
      scope,
      contact_id: get('pcrm-f-contact'),
      title: get('pcrm-f-title').trim(),
      product_id: get('pcrm-f-product') || null,
      stage_id: get('pcrm-f-stage'),
      value: Number(get('pcrm-f-value')) || 0,
      probability: Number(get('pcrm-f-prob')) || 25,
      notes: get('pcrm-f-notes').trim() || null,
      owner: STATE.user?.id || null,
    };
    if (!payload.contact_id || !payload.title) { toast('Contato e título são obrigatórios', 'e'); return; }
    try {
      await CRM.cards.create(payload);
      // marca o contato como in_pipeline
      await CRM.contacts.update(payload.contact_id, { status: 'in_pipeline' });
      closeModal();
      _renderBoard(scope);
      toast('Negociação criada', 's');
    } catch (e) {
      toast('Erro ao criar: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  window._pcrmFromContact = (scope) => {
    const contacts = (STATE.crm.contacts || []).filter(c => c.status === 'wishlist');
    if (!contacts.length) { toast('Nenhum contato na wishlist. Vá em Contatos primeiro.', 'w'); return; }
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Escolha um contato da wishlist para promover ao pipeline ${scope.toUpperCase()}.</div>
      <div class="form-grid">
        <div class="ff"><label>Contato</label>
          <select id="pcrm-pf-contact" class="fi">
            ${contacts.map(c => `<option value="${c.id}">${_esc(c.name)}${c.company ? ' · ' + _esc(c.company) : ''}</option>`).join('')}
          </select>
        </div>
      </div>`;
    openModal(`Promover da wishlist → ${scope.toUpperCase()}`, body, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="window._pcrmDoFromContact('${scope}')"><i data-lucide="arrow-right"></i> Promover</button>
    `);
    lucide.createIcons();
  };

  window._pcrmDoFromContact = async (scope) => {
    const id = document.getElementById('pcrm-pf-contact').value;
    if (!id) return;
    try {
      await CRM.cards.promoteContact(id, scope);
      closeModal();
      _renderBoard(scope);
      const c = CRM.contactById(id);
      toast(`${c?.name || 'Contato'} promovido para ${scope.toUpperCase()}`, 's');
    } catch (e) {
      toast('Erro ao promover: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── DETALHE DO CARD ──────────────────────────────────────
  window._pcrmOpenCard = (id) => {
    const card = STATE.crm.cards.find(c => c.id === id);
    if (!card) return;
    const contact = CRM.contactById(card.contact_id);
    const product = CRM.productById(card.product_id);
    const stage = CRM.stageById(card.stage_id);
    const scope = card.scope;
    const stages = CRM.stagesForScope(scope);

    const body = `
      <div class="pcrm-detail">
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px">${_esc(card.title)}</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">
          ${stage ? `<span style="background:${stage.color}2a;color:${stage.color};padding:2px 8px;border-radius:4px;font-weight:600">${_esc(stage.name)}</span>` : ''}
          · ${card.probability}% probabilidade · ${_fmt(card.value)}
        </div>
        ${contact ? `<div class="ctc-detail-grid">
          <div><span class="ctc-dt-k">Contato</span><span>${_esc(contact.name)}</span></div>
          ${contact.company ? `<div><span class="ctc-dt-k">Empresa</span><span>${_esc(contact.company)}</span></div>` : ''}
          ${contact.email ? `<div><span class="ctc-dt-k">Email</span><span>${_esc(contact.email)}</span></div>` : ''}
          ${product ? `<div><span class="ctc-dt-k">Produto</span><span>${_esc(product.name)}</span></div>` : ''}
        </div>` : ''}
        <div style="margin-top:14px">
          <label class="ctc-dt-k" style="display:block;margin-bottom:6px">Mover para etapa</label>
          <select id="pcrm-move-stage" class="fi" onchange="window._pcrmQuickMove('${card.id}', this.value)">
            ${stages.map(s => `<option value="${s.id}" ${s.id === card.stage_id ? 'selected' : ''}>${_esc(s.name)}</option>`).join('')}
          </select>
        </div>
        ${card.notes ? `<div style="margin-top:14px">
          <label class="ctc-dt-k" style="display:block;margin-bottom:6px">Notas</label>
          <div style="font-size:13px;color:var(--text);white-space:pre-wrap">${_esc(card.notes)}</div>
        </div>` : ''}
      </div>
    `;

    const footer = `
      <button class="btn btn-danger" onclick="window._pcrmDeleteCard('${card.id}')"><i data-lucide="trash"></i> Excluir</button>
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      ${contact ? `<button class="btn btn-outline" onclick="closeModal();openMod('contacts');setTimeout(()=>window._ctcOpenDetail('${contact.id}'),300)"><i data-lucide="user"></i> Ver contato</button>` : ''}
    `;

    openModal(card.title, body, footer);
    lucide.createIcons();
  };

  window._pcrmQuickMove = async (cardId, stageId) => {
    try {
      await CRM.cards.moveToStage(cardId, stageId);
      const card = STATE.crm.cards.find(c => c.id === cardId);
      _renderBoard(card?.scope || 'b2b');
      toast('Negociação movida', 's');
    } catch (e) {
      toast('Erro ao mover: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  window._pcrmDeleteCard = async (id) => {
    const card = STATE.crm.cards.find(c => c.id === id);
    if (!card) return;
    if (!confirm(`Excluir negociação "${card.title}"?`)) return;
    try {
      await CRM.cards.remove(id);
      closeModal();
      _renderBoard(card.scope);
      toast('Negociação excluída', 's');
    } catch (e) {
      toast('Erro: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  window._pcrmManageStages = (scope) => {
    const stages = CRM.stagesForScope(scope);
    const meta = SCOPE_META[scope];
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px">Etapas do pipeline ${meta.label}. Reordene arrastando. Para editar: clique no nome.</div>
      <div class="pcrm-stage-list">
        ${stages.map(s => `
          <div class="pcrm-stage-row">
            <span style="width:14px;height:14px;background:${s.color};border-radius:50%;flex-shrink:0"></span>
            <span style="flex:1">${_esc(s.name)}</span>
            <span style="font-size:11px;color:var(--text3)">#${s.position}</span>
          </div>
        `).join('')}
      </div>
      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--gb);display:flex;gap:8px">
        <input id="pcrm-new-stage-name" class="fi" type="text" placeholder="Nova etapa" style="flex:1">
        <input id="pcrm-new-stage-color" class="fi" type="color" value="#94a3b8" style="width:60px;padding:4px">
        <button class="btn btn-theme" onclick="window._pcrmAddStage('${scope}')"><i data-lucide="plus"></i></button>
      </div>
    `;
    openModal(`Etapas — ${meta.label}`, body, `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);
    lucide.createIcons();
  };

  window._pcrmAddStage = async (scope) => {
    const name = document.getElementById('pcrm-new-stage-name').value.trim();
    const color = document.getElementById('pcrm-new-stage-color').value;
    if (!name) { toast('Nome é obrigatório', 'e'); return; }
    try {
      const stages = CRM.stagesForScope(scope);
      const newPos = stages.length ? Math.max(...stages.map(s => s.position)) + 1 : 1;
      const sb = window.sb.schema('crm');
      const { data, error } = await sb.from('pipeline_stages').insert({ scope, name, color, position: newPos }).select().single();
      if (error) throw error;
      STATE.crm.stages.push(data);
      _pcrmManageStages(scope);
      _renderBoard(scope);
      toast('Etapa criada', 's');
    } catch (e) {
      toast('Erro: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── HELPERS ────────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function _fmt(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v || 0);
  }
})();
