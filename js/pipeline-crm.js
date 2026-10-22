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
  let _scope = sessionStorage.getItem('pcrm_scope') || 'rips';
  if (!['b2b', 'b2c', 'rips'].includes(_scope)) _scope = 'rips';

  // Filtros independentes por scope
  const F = {
    b2b: { search: '', owner: 'all' },
    b2c: { search: '', owner: 'all' },
    rips: { search: '', owner: 'all' },
  };

  const SCOPE_META = {
    b2b: { label: 'B2B', title: 'B2B — Marcas', sub: 'Negociações com marcas e empresas', icon: 'briefcase', color: 'var(--blue)' },
    b2c: { label: 'B2C', title: 'B2C — Influencers', sub: 'Negociações com influencers e afiliados', icon: 'megaphone', color: 'var(--theme)' },
    rips: { label: 'Rips', title: 'Rips — Influencers & Afiliados', sub: 'Aquisição do Rips', icon: 'rocket', color: '#3d3fbd', product: 'Rips' },
  };
  const SCOPE_ORDER = ['rips', 'b2c', 'b2b'];
  // Pipeline exclusiva de produto (ex.: Rips) → id do produto fixo.
  const _scopeProductId = (scope) => {
    const name = SCOPE_META[scope]?.product;
    if (!name) return null;
    return (STATE.crm?.products || []).find(p => (p.name || '').toLowerCase() === name.toLowerCase())?.id || null;
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

    el.innerHTML = modHdr('Pipeline') + `<div class="mod-body">
      ${heroHTML('pipeline-crm', 'CRM Comercial', 'Pipeline', 'Funil de negociações por produto e canal')}
      <div class="mod-main">
        <!-- Abas de scope -->
        <div class="pcrm-tabs">
          ${SCOPE_ORDER.map(sc => `<button class="pcrm-tab ${_scope === sc ? 'on' : ''}" data-scope="${sc}" onclick="window._pcrmSwitchTab('${sc}')">
            <i data-lucide="${SCOPE_META[sc].icon}"></i>
            <span>${SCOPE_META[sc].title}</span>
            <span class="pcrm-tab-count" id="pcrm-count-${sc}"></span>
          </button>`).join('')}
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

    // Sempre recarrega ao abrir: leads chegam pela API sem passar pelo app
    if (window.CRM?.loadAll) {
      if (!STATE.crm.loaded) {
        document.getElementById('pcrm-board').innerHTML =
          '<div class="empty" style="grid-column:1/-1"><i data-lucide="loader"></i><p>Carregando...</p></div>';
        lucide.createIcons();
      } else {
        _renderBoard(_scope); _renderTabCounts(); // mostra o que já temos enquanto atualiza
      }
      const ok = await CRM.loadAll();
      if (!ok && !STATE.crm.loaded) {
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
    SCOPE_ORDER.forEach(sc => {
      const el = document.getElementById('pcrm-count-' + sc);
      if (el) el.textContent = (STATE.crm.cards || []).filter(c => c.scope === sc).length;
    });
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
      const q = nameFold(f.search);
      cards = cards.filter(c => {
        const contact = CRM.contactById(c.contact_id);
        return nameFold(c.title).includes(q)
          || nameFold(contact?.name).includes(q)
          || nameFold(contact?.company).includes(q);
      });
    }

    // Métricas (sem dinheiro: a pipeline mede movimento, não valor)
    const _stageName = (id) => ((CRM.stageById(id)?.name) || '').toLowerCase();
    const meetings = cards.filter(c => _stageName(c.stage_id).includes('reuni')).length;
    const closed = cards.filter(c => _stageName(c.stage_id).includes('fechado')).length;
    const stalled = cards.filter(c => {
      const n = _stageName(c.stage_id);
      return !n.includes('fechado') && !n.includes('follow') && _daysSince(c.updated_at) >= 7;
    }).length;
    const metricsEl = document.getElementById('pcrm-metrics');
    if (metricsEl) {
      metricsEl.innerHTML = `
        <div class="pipe-metric"><span class="pipe-metric-k">Negociações</span><span class="pipe-metric-v">${cards.length}</span></div>
        <div class="pipe-metric"><span class="pipe-metric-k">Reuniões</span><span class="pipe-metric-v">${meetings}</span></div>
        <div class="pipe-metric"><span class="pipe-metric-k">Fechados</span><span class="pipe-metric-v" style="color:var(--green)">${closed}</span></div>
        <div class="pipe-metric"><span class="pipe-metric-k">Parados 7d+</span><span class="pipe-metric-v" style="color:${stalled ? 'var(--amber)' : 'var(--text)'}">${stalled}</span></div>
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
      return `<div class="kan-col" data-stage="${stage.id}"
          ondragover="event.preventDefault();this.classList.add('kan-col-drop')"
          ondragleave="this.classList.remove('kan-col-drop')"
          ondrop="window._pcrmDrop(event, '${stage.id}', '${scope}')">
        <div class="kan-col-hdr">
          <span class="kan-stage-dot" style="background:${stage.color || '#94a3b8'}"></span>
          <span class="kan-stage-name">${_esc(stage.name)}</span>
          <span class="kan-stage-count">${stageCards.length}</span>
        </div>
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
    const stage = CRM.stageById(card.stage_id);
    const isLost = !!(stage && stage.is_lost);
    const days = _daysSince(card.updated_at);
    const stageName = (stage?.name || '').toLowerCase();
    const settled = stageName.includes('fechado') || stageName.includes('follow');
    // Lost cards já têm visual próprio — não aplicamos warning amber/red em cima.
    const ageClass = (settled || isLost) ? '' : days >= 14 ? ' is-late' : days >= 7 ? ' is-warn' : '';

    // Avatar do contato: avatar_url manual > iniciais em gradiente
    let avatarHTML = '';
    if (contact) {
      let h = 0; for (let i = 0; i < (contact.name || '').length; i++) h = (h * 31 + contact.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const initials = nameInitials(contact.name);
      const fallback = `hsl(${hue},30%,46%)`;
      if (contact.avatar_url) {
        avatarHTML = `<img class="kan-card-av" src="${contact.avatar_url}" alt=""
          onerror="const d=document.createElement('div');d.className='kan-card-av';d.textContent='${initials}';d.style.background='${fallback}';this.replaceWith(d)">`;
      } else {
        avatarHTML = `<div class="kan-card-av" style="background:${fallback}">${initials}</div>`;
      }
    }

    const lostOverlay = '';

    const AFF_LABEL = { master: 'Master', direto: 'Direto', sub: 'Sub' };
    const AFF_COLOR = { master: '#a855f7', direto: '#3b82f6', sub: '#14b8a6' };
    const AFF_TITLE = { master: 'Master — indica outros', direto: 'Afiliado Direto', sub: 'Subafiliado' };
    const affChip = card.affiliate_role ? `<div class="kan-card-tag" style="background:${AFF_COLOR[card.affiliate_role]}22;color:${AFF_COLOR[card.affiliate_role]};border:1px solid ${AFF_COLOR[card.affiliate_role]}44" title="${AFF_TITLE[card.affiliate_role]}">
      <i data-lucide="network" style="width:9px;height:9px"></i> ${AFF_LABEL[card.affiliate_role]}
    </div>` : '';

    return `<div class="kan-card${isLost ? ' is-lost' : ''}"
        draggable="true"
        ondragstart="event.dataTransfer.setData('text/plain', '${card.id}'); this.classList.add('kan-card-drag')"
        ondragend="this.classList.remove('kan-card-drag')"
        onclick="window._pcrmOpenCard('${card.id}')">
      ${lostOverlay}
      ${(product || affChip) ? `<div class="kan-card-tag-row">
        ${product ? `<div class="kan-card-tag" style="background:${product.color || '#94a3b8'}22;color:${product.color || '#94a3b8'};border:1px solid ${product.color || '#94a3b8'}44">
          <i data-lucide="package" style="width:9px;height:9px"></i> ${_esc(product.name)}
        </div>` : ''}
        ${affChip}
      </div>` : ''}
      <div class="kan-card-title">${_esc(card.title)}</div>
      ${contact && CRM.tagsForContact ? CRM.tagsForContact(contact.id).map(t => CRM.tagChip(t, 'kan-card-tagchip')).join('') : ''}
      ${contact ? `<div class="kan-card-contact"
          onmouseenter="window._ctcShowHoverCard && _ctcShowHoverCard('${contact.id}', this)"
          onmouseleave="window._ctcHideHoverCard && _ctcHideHoverCard()">
        ${avatarHTML}
        <span class="kan-card-contact-name" title="Ver perfil de ${_esc(contact.name)}"
          onclick="event.stopPropagation();window._ctcHideHoverCard && _ctcHideHoverCard(0);window._ctcOpenDetail && _ctcOpenDetail('${contact.id}')">${nameFold(contact.name).trim() === nameFold(card.title).trim()
            ? (window._ctcProfileById?.(contact.profile)?.label || 'Ver perfil')
            : _esc(contact.name)}</span>
      </div>` : ''}
      <div class="kan-card-foot">
        <span class="kan-card-age${ageClass}"><i data-lucide="clock" style="width:11px;height:11px"></i>${_ageLabel(days)}</span>
        ${(() => { const r = contact && window._ctcTotalReach ? _ctcTotalReach(contact) : null;
          return r != null ? `<span class="kan-card-reach" title="Seguidores somando todas as redes"><i data-lucide="users" style="width:11px;height:11px"></i>${_ctcFmtFollowers(r)}</span>` : ''; })()}
        ${(() => { const o = (STATE.users || []).find(u => u.id === card.owner);
          if (!o) return `<span class="kan-card-owner is-empty" title="Sem responsável">—</span>`;
          const ini = nameInitials(o.name);
          return `<span class="kan-card-owner" title="Responsável: ${_esc(o.name)}">${ini}</span>`; })()}
      </div>
    </div>`;
  }

  // ── DRAG & DROP ────────────────────────────────────────────
  window._pcrmDrop = async (ev, stageId, scope) => {
    ev.preventDefault();
    ev.currentTarget.classList.remove('kan-col-drop');
    const cardId = ev.dataTransfer.getData('text/plain');
    if (!cardId) return;
    _pcrmMoveWithLostGate(cardId, stageId, scope);
  };

  // Centralised move helper: if the destination stage is flagged is_lost
  // we open the justification modal before writing. If it's a won stage
  // (Negócio Fechado) we open the deal-terms modal instead. On cancel,
  // nothing is persisted. On confirm, the update includes the required
  // fields so the DB trigger lets it through.
  function _pcrmMoveWithLostGate(cardId, stageId, scope) {
    const dest = CRM.stageById(stageId);
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    if (dest && dest.is_lost) {
      _pcrmOpenLostReasonModal(card, dest, async (reason) => {
        try {
          await CRM.cards.update(cardId, { stage_id: stageId, lost_reason: reason });
          _renderBoard(scope);
          toast('Negociação marcada como perdida', 's');
        } catch (e) {
          toast('Erro ao mover: ' + (e.message || 'desconhecido'), 'e');
        }
      });
      return;
    }
    if (dest && dest.is_won) {
      _pcrmOpenWonDealModal(card, dest, async (terms) => {
        try {
          await CRM.cards.update(cardId, { stage_id: stageId, ...terms });
          _renderBoard(scope);
          toast('Negócio fechado! 🎉', 's');
        } catch (e) {
          toast('Erro ao fechar: ' + (e.message || 'desconhecido'), 'e');
        }
      });
      return;
    }
    (async () => {
      try {
        await CRM.cards.moveToStage(cardId, stageId);
        _renderBoard(scope);
      } catch (e) {
        toast('Erro ao mover: ' + (e.message || 'desconhecido'), 'e');
      }
    })();
  }

  // Modal pedindo os termos do negócio ao fechar. Dois tipos:
  // Revenue Share (percentual, com cálculo automático do master quando sub)
  // ou Fixo (valor mensal + duração + metas / entregas opcionais).
  function _pcrmOpenWonDealModal(card, destStage, onConfirm) {
    const isSub = card.affiliate_role === 'sub';
    const existing = {
      deal_type: card.deal_type || '',
      rev_share_pct: card.rev_share_pct ?? '',
      fixed_monthly_value: card.fixed_monthly_value ?? '',
      fixed_contract_months: card.fixed_contract_months ?? '',
      fixed_goals: card.fixed_goals || '',
      fixed_deliverables: card.fixed_deliverables || '',
    };
    const body = `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="padding:12px 14px;background:color-mix(in srgb, var(--green) 10%, transparent);border:1px solid color-mix(in srgb, var(--green) 30%, transparent);border-radius:8px;font-size:12.5px;color:var(--text2);line-height:1.5">
          Fechando <strong style="color:var(--text)">${_esc(card.title)}</strong> em
          <strong style="color:var(--text)">${_esc(destStage.name)}</strong>. Registre as condições
          — vai pro histórico do card e pro relatório financeiro.
        </div>

        <div class="ff">
          <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
            Tipo de negócio <span style="color:var(--red)">*</span>
          </label>
          <div style="display:flex;gap:8px">
            <label class="pcrm-deal-type-opt">
              <input type="radio" name="won-deal-type" value="revenue_share"
                ${existing.deal_type === 'revenue_share' ? 'checked' : ''}
                onchange="window._pcrmWonDealTypeChanged('revenue_share')">
              <span><i data-lucide="percent" style="width:14px;height:14px"></i> Revenue Share</span>
            </label>
            <label class="pcrm-deal-type-opt">
              <input type="radio" name="won-deal-type" value="fixo"
                ${existing.deal_type === 'fixo' ? 'checked' : ''}
                onchange="window._pcrmWonDealTypeChanged('fixo')">
              <span><i data-lucide="banknote" style="width:14px;height:14px"></i> Fixo</span>
            </label>
          </div>
        </div>

        <!-- Revenue Share block -->
        <div id="won-rs-block" style="display:${existing.deal_type === 'revenue_share' ? 'block' : 'none'}">
          <div class="ff">
            <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
              Percentual do ${isSub ? 'sub' : 'parceiro'} <span style="color:var(--red)">*</span>
            </label>
            <div style="display:flex;align-items:center;gap:8px">
              <input id="won-rs-pct" type="number" min="0" max="100" step="0.1"
                value="${existing.rev_share_pct}"
                class="fi" style="width:120px;text-align:right"
                oninput="window._pcrmWonRsPctChanged(this.value)"
                placeholder="40">
              <span style="font-size:16px;color:var(--text2);font-weight:600">%</span>
            </div>
            ${isSub ? `
              <div id="won-rs-split" style="margin-top:10px;padding:10px 12px;background:var(--bg3);border:1px solid var(--gb);border-radius:6px;font-size:12px;line-height:1.6">
                <div style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:0.06em;font-weight:600;margin-bottom:4px">Divisão automática (50% total)</div>
                <div><strong style="color:var(--text)">Sub:</strong> <span id="won-rs-sub-pct" style="color:var(--text)">—</span></div>
                <div><strong style="color:var(--text)">Master:</strong> <span id="won-rs-master-pct" style="color:var(--text)">—</span></div>
                <div id="won-rs-warning" style="color:var(--red);font-size:11px;margin-top:4px;display:none">
                  <i data-lucide="alert-triangle" style="width:11px;height:11px;vertical-align:-2px"></i>
                  Sub não pode ter mais que 50% — o pool total do time é 50%.
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Fixo block -->
        <div id="won-fixo-block" style="display:${existing.deal_type === 'fixo' ? 'block' : 'none'}">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="ff">
              <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
                Valor mensal (R$) <span style="color:var(--red)">*</span>
              </label>
              <input id="won-fixo-value" type="number" min="0" step="0.01"
                value="${existing.fixed_monthly_value}"
                class="fi" placeholder="5000.00">
            </div>
            <div class="ff">
              <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
                Tempo de contrato (meses)
              </label>
              <input id="won-fixo-months" type="number" min="1" step="1"
                value="${existing.fixed_contract_months}"
                class="fi" placeholder="12">
            </div>
          </div>
          <div class="ff" style="margin-top:12px">
            <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
              Metas <span style="font-weight:400;color:var(--text3);font-size:11px">(opcional)</span>
            </label>
            <textarea id="won-fixo-goals" class="fi" rows="3"
              placeholder="Ex.: 20 posts/mês · atingir 100k impressões · engajamento 3%+">${_esc(existing.fixed_goals)}</textarea>
          </div>
          <div class="ff" style="margin-top:12px">
            <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
              Entregas <span style="font-weight:400;color:var(--text3);font-size:11px">(opcional)</span>
            </label>
            <textarea id="won-fixo-deliverables" class="fi" rows="3"
              placeholder="Ex.: 1 vídeo/semana no YouTube · 3 stories semanais · 1 live mensal">${_esc(existing.fixed_deliverables)}</textarea>
          </div>
        </div>
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" id="won-confirm" onclick="window._pcrmConfirmWon()">
        <i data-lucide="check-circle"></i> Fechar negócio
      </button>
    `;
    window.__pcrmPendingWonConfirm = (terms) => {
      closeModal();
      onConfirm(terms);
      window.__pcrmPendingWonConfirm = null;
    };
    window.__pcrmWonCtx = { isSub };
    openModal('Fechar negócio', body, footer);
    lucide.createIcons();
    // Pre-fill the split display if already in revenue_share with pct
    if (existing.deal_type === 'revenue_share' && existing.rev_share_pct !== '') {
      window._pcrmWonRsPctChanged(existing.rev_share_pct);
    }
  }

  window._pcrmWonDealTypeChanged = (val) => {
    document.getElementById('won-rs-block').style.display = val === 'revenue_share' ? 'block' : 'none';
    document.getElementById('won-fixo-block').style.display = val === 'fixo' ? 'block' : 'none';
  };

  window._pcrmWonRsPctChanged = (val) => {
    const pct = parseFloat(val);
    if (!window.__pcrmWonCtx?.isSub) return;
    const subEl = document.getElementById('won-rs-sub-pct');
    const masEl = document.getElementById('won-rs-master-pct');
    const warn = document.getElementById('won-rs-warning');
    if (!subEl || !masEl) return;
    if (isNaN(pct) || pct < 0) {
      subEl.textContent = '—'; masEl.textContent = '—';
      if (warn) warn.style.display = 'none';
      return;
    }
    const masterPct = Math.max(0, 50 - pct);
    subEl.textContent = pct.toFixed(2).replace(/\.00$/, '') + '%';
    masEl.textContent = masterPct.toFixed(2).replace(/\.00$/, '') + '%';
    if (warn) warn.style.display = pct > 50 ? 'block' : 'none';
  };

  window._pcrmConfirmWon = () => {
    const typeRadio = document.querySelector('input[name="won-deal-type"]:checked');
    const dealType = typeRadio?.value;
    if (!dealType) { toast('Escolha o tipo de negócio', 'w'); return; }
    const terms = { deal_type: dealType };
    if (dealType === 'revenue_share') {
      const pct = parseFloat(document.getElementById('won-rs-pct')?.value);
      if (isNaN(pct) || pct <= 0 || pct > 100) { toast('Informe um percentual válido (0 a 100)', 'w'); return; }
      if (window.__pcrmWonCtx?.isSub && pct > 50) { toast('Sub não pode ter mais que 50% (pool total do time)', 'e'); return; }
      terms.rev_share_pct = pct;
      // Clear fixed fields so UPDATE doesn't carry stale values
      terms.fixed_monthly_value = null;
      terms.fixed_contract_months = null;
      terms.fixed_goals = null;
      terms.fixed_deliverables = null;
    } else {
      const value = parseFloat(document.getElementById('won-fixo-value')?.value);
      if (isNaN(value) || value <= 0) { toast('Informe o valor mensal', 'w'); return; }
      terms.fixed_monthly_value = value;
      const months = parseInt(document.getElementById('won-fixo-months')?.value, 10);
      terms.fixed_contract_months = isNaN(months) ? null : months;
      terms.fixed_goals = (document.getElementById('won-fixo-goals')?.value || '').trim() || null;
      terms.fixed_deliverables = (document.getElementById('won-fixo-deliverables')?.value || '').trim() || null;
      terms.rev_share_pct = null;
    }
    if (typeof window.__pcrmPendingWonConfirm === 'function') {
      window.__pcrmPendingWonConfirm(terms);
    }
  };

  function _pcrmOpenLostReasonModal(card, destStage, onConfirm) {
    const body = `
      <div style="display:flex;flex-direction:column;gap:14px">
        <div style="padding:12px 14px;background:color-mix(in srgb, var(--red) 10%, transparent);border:1px solid color-mix(in srgb, var(--red) 30%, transparent);border-radius:8px;font-size:12.5px;color:var(--text2);line-height:1.5">
          Você está movendo <strong style="color:var(--text)">${_esc(card.title)}</strong> para
          <strong style="color:var(--text)">${_esc(destStage.name)}</strong>. Registre o motivo —
          vai pro histórico do card e aparece no relatório de perdas.
        </div>
        <div class="ff">
          <label style="display:block;margin-bottom:6px;font-size:12px;color:var(--text2);font-weight:500">
            Justificativa <span style="color:var(--red)">*</span>
          </label>
          <textarea id="pcrm-lost-reason" class="fi" rows="5"
            placeholder="Ex.: Cliente escolheu concorrente por preço · Deal congelado por 6 meses · Sem budget em 2026…"
            style="resize:vertical;min-height:110px;font-size:13px;line-height:1.5"
            oninput="document.getElementById('pcrm-lost-confirm').disabled = !this.value.trim()"></textarea>
          <div style="font-size:11px;color:var(--text3);margin-top:6px">Mínimo 3 caracteres.</div>
        </div>
      </div>
    `;
    const footer = `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-danger" id="pcrm-lost-confirm" disabled
        onclick="window._pcrmConfirmLost()">
        <i data-lucide="x-circle"></i> Marcar como perdido
      </button>
    `;
    // Stash the callback globally so the footer button can reach it.
    window.__pcrmPendingLostConfirm = (reason) => {
      closeModal();
      onConfirm(reason);
      window.__pcrmPendingLostConfirm = null;
    };
    openModal('Marcar como Perdido', body, footer);
    lucide.createIcons();
    setTimeout(() => document.getElementById('pcrm-lost-reason')?.focus(), 100);
  }

  window._pcrmConfirmLost = () => {
    const reason = (document.getElementById('pcrm-lost-reason')?.value || '').trim();
    if (reason.length < 3) { toast('Justificativa precisa ter pelo menos 3 caracteres', 'w'); return; }
    if (typeof window.__pcrmPendingLostConfirm === 'function') {
      window.__pcrmPendingLostConfirm(reason);
    }
  };

  // ── FILTROS ────────────────────────────────────────────────
  window._pcrmSearch = (scope, v) => { F[scope].search = v.trim().toLowerCase(); _renderBoard(scope); };
  window._pcrmOwner = (scope, v) => { F[scope].owner = v; _renderBoard(scope); };

  // ── NOVO CARD ──────────────────────────────────────────────
  let _newCardScope = 'b2c';
  // `draft` restaura o que já estava preenchido (usado ao voltar da criação
  // inline de contato).
  window._pcrmOpenNewCard = (scope, draft = null) => {
    const meta = SCOPE_META[scope];
    const stages = CRM.stagesForScope(scope);
    const products = STATE.crm.products || [];
    _newCardScope = scope;

    if (!stages.length) { toast('Crie as etapas primeiro', 'w'); return; }

    const body = `
      <div class="form-grid">
        <div class="ff"><label>Contato *</label>
          <div class="pcrm-contact-picker">
            <input id="pcrm-f-contact-search" class="fi" type="text" autocomplete="off"
              placeholder="Digite o nome, empresa ou @ de alguma rede..."
              oninput="window._pcrmContactSearch(this.value)"
              onfocus="window._pcrmContactSearch(this.value)"
              onblur="setTimeout(()=>{const r=document.getElementById('pcrm-contact-results');if(r)r.style.display='none'},200)">
            <input id="pcrm-f-contact" type="hidden" value="">
            <div id="pcrm-f-contact-selected" class="pcrm-contact-selected" style="display:none"></div>
            <div id="pcrm-contact-results" class="pcrm-contact-results" style="display:none"></div>
          </div>
          <div id="pcrm-dup-warning" class="pcrm-dup-warning" style="display:none"></div>
        </div>
        <div class="ff"><label>Título da negociação *</label>
          <input id="pcrm-f-title" class="fi" type="text" placeholder="Ex: Parceria Q1 2027">
        </div>
        <div class="form-row">
          <div class="ff"><label>Produto</label>
            <select id="pcrm-f-product" class="fi" ${_scopeProductId(scope) ? 'disabled title="Pipeline exclusiva deste produto"' : ''}>
              <option value="">—</option>
              ${products.map(p => `<option value="${p.id}" ${p.id === _scopeProductId(scope) ? 'selected' : ''}>${_esc(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Etapa inicial</label>
            <select id="pcrm-f-stage" class="fi">
              ${stages.filter(s => !s.is_lost).map(s => `<option value="${s.id}">${_esc(s.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="ff"><label>Categoria de parceria</label>
            <select id="pcrm-f-affiliate-role" class="fi" onchange="window._pcrmAffRoleChanged(this.value)">
              <option value="">— Não classificado</option>
              <option value="master">Master — indica outros parceiros</option>
              <option value="direto">Afiliado Direto</option>
              <option value="sub">Subafiliado — veio de um master</option>
            </select>
          </div>
          <div class="ff" id="pcrm-f-master-wrap" style="display:none">
            <label>Master responsável *</label>
            ${_masterPickerHTML('pcrm-f-master', null)}
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

    if (draft) {
      const set = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
      set('pcrm-f-title', draft.title); set('pcrm-f-product', draft.product_id);
      set('pcrm-f-stage', draft.stage_id); set('pcrm-f-notes', draft.notes);
      if (draft.contact_id) window._pcrmPickContact(draft.contact_id);
      else if (draft.search) { const si = document.getElementById('pcrm-f-contact-search'); if (si) { si.value = draft.search; si.focus(); } }
      // Restaurar categoria de parceria e master (quando voltar da criação
      // inline de um contato que vai virar master do sub).
      if (draft.affiliate_role) {
        const roleSel = document.getElementById('pcrm-f-affiliate-role');
        if (roleSel) { roleSel.value = draft.affiliate_role; window._pcrmAffRoleChanged(draft.affiliate_role); }
      }
      if (draft.master_contact_id) {
        setTimeout(() => window._pcrmPickMaster('pcrm-f-master', draft.master_contact_id), 50);
      } else if (draft.master_search) {
        setTimeout(() => {
          const si = document.getElementById('pcrm-f-master-search');
          if (si) { si.value = draft.master_search; si.focus(); }
        }, 50);
      }
    }
  };

  function _pcrmReadDraft() {
    const get = (id) => document.getElementById(id)?.value || '';
    return {
      title: get('pcrm-f-title'),
      product_id: get('pcrm-f-product'),
      stage_id: get('pcrm-f-stage'),
      notes: get('pcrm-f-notes'),
      search: get('pcrm-f-contact-search'),
      contact_id: get('pcrm-f-contact'),
      affiliate_role: get('pcrm-f-affiliate-role'),
      master_contact_id: get('pcrm-f-master'),
      master_search: get('pcrm-f-master-search'),
    };
  }

  // Busca sem resultado → cria o contato sem sair do fluxo e volta para a
  // negociação com tudo que já estava preenchido.
  window._pcrmCreateContactInline = () => {
    if (!window._ctcOpenNewInline) { closeModal(); openMod('contacts'); return; }
    const scope = _newCardScope;
    const draft = _pcrmReadDraft();
    const name = (draft.search || '').trim().replace(/^@/, '');
    window._ctcOpenNewInline({
      name,
      type: scope === 'b2b' ? 'b2b' : 'b2c',
      title: 'Novo contato para a negociação',
      onCreated: (c) => { window._pcrmOpenNewCard(scope, { ...draft, contact_id: c.id }); },
      onCancel: () => { window._pcrmOpenNewCard(scope, draft); },
    });
  };

  // Autocomplete do contato no form de nova negociação
  window._pcrmContactSearch = (q) => {
    const results = document.getElementById('pcrm-contact-results');
    if (!results) return;
    const term = nameFold(q.trim());
    let list = STATE.crm?.contacts || [];
    if (term) {
      list = list.filter(c =>
        nameFold(c.name).includes(term)
        || nameFold(c.company).includes(term)
        || (c.email || '').toLowerCase().includes(term)
        || Object.values(c.social_links || {}).some(h => String(h).toLowerCase().includes(term.replace(/^@/, '')))
      );
    }
    list = list.slice(0, 8);
    const createRow = `<button type="button" class="pcrm-contact-create" onmousedown="event.preventDefault()" onclick="window._pcrmCreateContactInline()">
        <i data-lucide="user-plus"></i>
        <span>${term ? `Criar contato <strong>${_esc(q.trim())}</strong>` : 'Criar novo contato'}</span>
      </button>`;
    if (!list.length) {
      results.innerHTML = `<div class="pcrm-contact-empty">Nenhum contato encontrado${term ? ` para "${_esc(q.trim())}"` : ''}.</div>${createRow}`;
      results.style.display = 'block';
      if (window.lucide) lucide.createIcons();
      return;
    }
    results.innerHTML = list.map(c => {
      const initials = nameInitials(c.name);
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
    }).join('') + createRow;
    results.style.display = 'block';
    if (window.lucide) lucide.createIcons();
  };

  // Negociação já existente com este contato no mesmo pipeline (anti-duplicidade).
  function _existingCard(scope, contactId) {
    return (STATE.crm?.cards || []).find(x => x.scope === scope && x.contact_id === contactId) || null;
  }
  function _ownerName(uid) {
    const u = (STATE.users || []).find(x => x.id === uid);
    return u ? u.name : 'sem responsável';
  }
  function _renderDupWarning(contactId) {
    const box = document.getElementById('pcrm-dup-warning');
    if (!box) return null;
    const ex = contactId ? _existingCard(_newCardScope, contactId) : null;
    if (!ex) { box.style.display = 'none'; box.innerHTML = ''; return null; }
    const st = CRM.stageById(ex.stage_id);
    box.innerHTML = `<i data-lucide="alert-triangle"></i>
      <span>Já existe negociação com este contato neste pipeline — <strong>${_esc(_ownerName(ex.owner))}</strong> · ${_esc(st?.name || '—')}.
      <a class="ctc-pop-link" onclick="closeModal();setTimeout(()=>window._pcrmOpenCard('${ex.id}'),150)">Abrir negociação</a></span>`;
    box.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
    return ex;
  }

  window._pcrmPickContact = (id) => {
    const c = (STATE.crm?.contacts || []).find(x => x.id === id);
    if (!c) return;
    document.getElementById('pcrm-f-contact').value = id;
    document.getElementById('pcrm-f-contact-search').style.display = 'none';
    document.getElementById('pcrm-contact-results').style.display = 'none';

    const selected = document.getElementById('pcrm-f-contact-selected');
    const initials = nameInitials(c.name);
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

    _renderDupWarning(id);
    // Auto-sugere o título com nome do contato (user pode editar)
    const titleInput = document.getElementById('pcrm-f-title');
    if (titleInput && !titleInput.value) {
      titleInput.value = c.name + (c.company ? ' · ' + c.company : '');
    }
    if (window.lucide) lucide.createIcons();
  };

  window._pcrmClearContact = () => {
    document.getElementById('pcrm-f-contact').value = '';
    _renderDupWarning(null);
    document.getElementById('pcrm-f-contact-selected').style.display = 'none';
    const search = document.getElementById('pcrm-f-contact-search');
    search.value = '';
    search.style.display = '';
    search.focus();
  };

  // ── MASTER PICKER (searchable) ──────────────────────────
  // Reused in the new-deal modal and in the edit-affiliate modal. Takes
  // the hidden input id (e.g. 'pcrm-f-master' or 'pcrm-aff-master') so
  // both modals can live in isolation. State lives on data-* attributes
  // of a wrapper so the handlers can look things up.
  function _masterPickerHTML(hiddenId, currentId, excludeContactId) {
    const current = currentId ? CRM.contactById(currentId) : null;
    const exclude = excludeContactId || '';
    return `<div class="pcrm-contact-picker" data-master-picker="${hiddenId}" data-exclude="${exclude}">
      <input id="${hiddenId}-search" class="fi" type="text" autocomplete="off"
        placeholder="Digite nome, empresa ou @instagram do master..."
        oninput="window._pcrmMasterSearch('${hiddenId}', this.value)"
        onfocus="window._pcrmMasterSearch('${hiddenId}', this.value)"
        onblur="setTimeout(()=>{const r=document.getElementById('${hiddenId}-results');if(r)r.style.display='none'},200)"
        style="display:${current ? 'none' : 'block'}">
      <input id="${hiddenId}" type="hidden" value="${current ? current.id : ''}">
      <div id="${hiddenId}-selected" class="pcrm-contact-selected" style="display:${current ? 'flex' : 'none'}">
        ${current ? _masterSelectedInner(current) : ''}
      </div>
      <div id="${hiddenId}-results" class="pcrm-contact-results" style="display:none"></div>
    </div>`;
  }
  function _masterSelectedInner(c) {
    const initials = nameInitials(c.name);
    let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
    const hue = Math.abs(h) % 360;
    const sub = c.company ? _esc(c.company) : c.social_links?.instagram ? '@' + _esc(c.social_links.instagram) : c.email ? _esc(c.email) : '—';
    return `
      <span class="pcrm-contact-opt-av" style="background:hsl(${hue},30%,46%)">${initials}</span>
      <div class="pcrm-contact-opt-info">
        <div class="pcrm-contact-opt-name">${_esc(c.name)}</div>
        <div class="pcrm-contact-opt-sub">${sub}</div>
      </div>
      <button type="button" class="pcrm-contact-clear" onclick="window._pcrmClearMaster('${c.id ? '' : ''}'); event.stopPropagation();" data-hidden-id="" title="Trocar">
        <i data-lucide="x" style="width:14px;height:14px"></i>
      </button>
    `;
  }

  window._pcrmMasterSearch = (hiddenId, q) => {
    const results = document.getElementById(hiddenId + '-results');
    if (!results) return;
    const term = nameFold((q || '').trim());
    const wrap = results.closest('[data-master-picker]');
    const excludeId = wrap?.dataset.exclude || '';
    let list = (STATE.crm?.contacts || []).filter(c => c.id !== excludeId);
    if (term) {
      list = list.filter(c =>
        nameFold(c.name).includes(term)
        || nameFold(c.company).includes(term)
        || (c.email || '').toLowerCase().includes(term)
        || Object.values(c.social_links || {}).some(h => String(h).toLowerCase().includes(term.replace(/^@/, '')))
      );
    }
    list = list.slice(0, 8);
    const createRow = `<button type="button" class="pcrm-contact-create" onmousedown="event.preventDefault()" onclick="window._pcrmCreateMasterInline('${hiddenId}')">
      <i data-lucide="user-plus"></i>
      <span>${term ? `Criar contato <strong>${_esc(q.trim())}</strong>` : 'Criar novo contato'}</span>
    </button>`;
    if (!list.length) {
      results.innerHTML = `<div class="pcrm-contact-empty">Nenhum contato encontrado${term ? ` para "${_esc(q.trim())}"` : ''}.</div>${createRow}`;
      results.style.display = 'block';
      if (window.lucide) lucide.createIcons();
      return;
    }
    results.innerHTML = list.map(c => {
      const initials = nameInitials(c.name);
      let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const ig = c.social_links?.instagram;
      return `<div class="pcrm-contact-opt" onmousedown="event.preventDefault()" onclick="window._pcrmPickMaster('${hiddenId}', '${c.id}')">
        <span class="pcrm-contact-opt-av" style="background:hsl(${hue},30%,46%)">${initials}</span>
        <div class="pcrm-contact-opt-info">
          <div class="pcrm-contact-opt-name">${_esc(c.name)}</div>
          <div class="pcrm-contact-opt-sub">${c.company ? _esc(c.company) : ig ? '@' + _esc(ig) : c.email ? _esc(c.email) : '—'}</div>
        </div>
      </div>`;
    }).join('') + createRow;
    results.style.display = 'block';
    if (window.lucide) lucide.createIcons();
  };

  // "Não encontrei o master" → cria o contato na hora e volta pra onde
  // estava, com o novo contato já selecionado como master.
  window._pcrmCreateMasterInline = (hiddenId) => {
    if (!window._ctcOpenNewInline) { toast('Função de criação não carregada', 'e'); return; }
    const search = document.getElementById(hiddenId + '-search');
    const name = (search?.value || '').trim().replace(/^@/, '');

    if (hiddenId === 'pcrm-f-master') {
      // Contexto: modal de NOVA negociação. Preserva o rascunho inteiro
      // e marca o novo contato como master quando reabrir.
      const scope = _newCardScope;
      const draft = _pcrmReadDraft();
      window._ctcOpenNewInline({
        name,
        type: 'b2c',
        title: 'Novo master para a negociação',
        onCreated: (c) => { window._pcrmOpenNewCard(scope, { ...draft, master_contact_id: c.id, affiliate_role: 'sub' }); },
        onCancel: () => { window._pcrmOpenNewCard(scope, draft); },
      });
    } else if (hiddenId === 'pcrm-aff-master') {
      // Contexto: modal de edição de classificação. Reabre no final.
      const roleSel = document.getElementById('pcrm-aff-role');
      const roleNow = roleSel?.value || 'sub';
      // O cardId é lido pelo botão Salvar — mas aqui precisamos achá-lo.
      // Olhamos o botão com onclick que contém _pcrmSaveAffiliate.
      const saveBtn = document.querySelector('button[onclick^="window._pcrmSaveAffiliate"]');
      const match = saveBtn?.getAttribute('onclick')?.match(/_pcrmSaveAffiliate\('([^']+)'\)/);
      const cardId = match?.[1];
      if (!cardId) { toast('Não consegui identificar a negociação', 'e'); return; }
      window._ctcOpenNewInline({
        name,
        type: 'b2c',
        title: 'Novo master',
        onCreated: (c) => {
          window._pcrmEditAffiliate(cardId);
          setTimeout(() => {
            const rs = document.getElementById('pcrm-aff-role');
            if (rs) { rs.value = roleNow; (document.getElementById('pcrm-aff-master-wrap') || {}).style = (roleNow === 'sub' ? 'display:block' : 'display:none'); }
            window._pcrmPickMaster('pcrm-aff-master', c.id);
          }, 150);
        },
        onCancel: () => { window._pcrmEditAffiliate(cardId); },
      });
    }
  };

  window._pcrmPickMaster = (hiddenId, contactId) => {
    const c = CRM.contactById(contactId);
    if (!c) return;
    document.getElementById(hiddenId).value = contactId;
    document.getElementById(hiddenId + '-search').style.display = 'none';
    document.getElementById(hiddenId + '-results').style.display = 'none';
    const sel = document.getElementById(hiddenId + '-selected');
    sel.innerHTML = _masterSelectedInner(c)
      // Patch the clear button to know its hidden id
      .replace("_pcrmClearMaster('')", `_pcrmClearMaster('${hiddenId}')`);
    sel.style.display = 'flex';
    if (window.lucide) lucide.createIcons();
  };

  window._pcrmClearMaster = (hiddenId) => {
    if (!hiddenId) return;
    document.getElementById(hiddenId).value = '';
    const sel = document.getElementById(hiddenId + '-selected');
    const search = document.getElementById(hiddenId + '-search');
    sel.innerHTML = '';
    sel.style.display = 'none';
    search.style.display = 'block';
    search.value = '';
    search.focus();
  };

  // ── MASTER PICKER END ────────────────────────────────────

  window._pcrmAffRoleChanged = (val) => {
    const wrap = document.getElementById('pcrm-f-master-wrap');
    if (wrap) wrap.style.display = (val === 'sub') ? 'block' : 'none';
  };

  window._pcrmSaveNewCard = async (scope) => {
    const get = (id) => document.getElementById(id)?.value || '';
    const role = get('pcrm-f-affiliate-role') || null;
    const payload = {
      scope,
      contact_id: get('pcrm-f-contact'),
      title: get('pcrm-f-title').trim(),
      product_id: get('pcrm-f-product') || null,
      stage_id: get('pcrm-f-stage'),
      notes: get('pcrm-f-notes').trim() || null,
      owner: STATE.user?.id || null,
      affiliate_role: role,
      // trigger limpa master_contact_id em roles != 'sub', mas enviamos
      // null explícito pra manter o payload coerente.
      master_contact_id: role === 'sub' ? (get('pcrm-f-master') || null) : null,
    };
    if (!payload.contact_id || !payload.title) { toast('Contato e título são obrigatórios', 'e'); return; }
    if (role === 'sub' && !payload.master_contact_id) { toast('Selecione o master responsável', 'e'); return; }
    if (_scopeProductId(scope)) payload.product_id = _scopeProductId(scope);
    const dup = _existingCard(scope, payload.contact_id);
    if (dup) { toast(`Já existe negociação com este contato neste pipeline (responsável: ${_ownerName(dup.owner)})`, 'e'); _renderDupWarning(payload.contact_id); return; }
    try {
      await CRM.cards.create(payload);
      // marca o contato como in_pipeline
      await CRM.contacts.update(payload.contact_id, { status: 'in_pipeline' });
      closeModal();
      _renderBoard(scope);
      _renderTabCounts();
      toast('Negociação criada', 's');
      if (window._ctcAfterDealCreated) window._ctcAfterDealCreated(payload.contact_id);
    } catch (e) {
      toast('Erro ao criar: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  window._pcrmFromContact = (scope) => {
    const contacts = (STATE.crm.contacts || []).filter(c => c.status === 'wishlist' && !_existingCard(scope, c.id));
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
    const isLost = !!(stage && stage.is_lost);

    const lostBlock = isLost ? `
      <div style="padding:12px 14px;background:color-mix(in srgb, var(--red) 8%, transparent);border:1px solid color-mix(in srgb, var(--red) 25%, transparent);border-radius:8px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <span style="font-size:11px;color:var(--red);font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
            <i data-lucide="x-circle" style="width:12px;height:12px;vertical-align:-2px"></i> Motivo da perda
          </span>
          <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px" onclick="window._pcrmEditLostReason('${card.id}')">
            <i data-lucide="pencil" style="width:11px;height:11px"></i> Editar
          </button>
        </div>
        <div style="font-size:13px;color:var(--text);white-space:pre-wrap;line-height:1.5">${_esc(card.lost_reason || '—')}</div>
        ${card.lost_at ? `<div style="font-size:11px;color:var(--text3);margin-top:6px">Registrado em ${new Date(card.lost_at).toLocaleString('pt-BR')}</div>` : ''}
      </div>
    ` : '';

    // Won deal block — shown when the stage is a won stage.
    const isWon = !!(stage && stage.is_won);
    let wonBlock = '';
    if (isWon) {
      const dealType = card.deal_type;
      const _fmtBRL = (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) || 0);
      let dealBody = '';
      if (dealType === 'revenue_share') {
        const pct = Number(card.rev_share_pct) || 0;
        const isSub = card.affiliate_role === 'sub';
        const masterPct = isSub ? Math.max(0, 50 - pct) : null;
        dealBody = `
          <div style="font-size:13px;color:var(--text);line-height:1.6">
            <div><strong>Tipo:</strong> Revenue Share</div>
            <div><strong>${isSub ? 'Sub' : 'Parceiro'}:</strong> ${pct}%</div>
            ${isSub ? `<div><strong>Master (automático):</strong> ${masterPct}% <span style="font-size:11px;color:var(--text3)">— pool total 50%</span></div>` : ''}
          </div>
        `;
      } else if (dealType === 'fixo') {
        dealBody = `
          <div style="font-size:13px;color:var(--text);line-height:1.6">
            <div><strong>Tipo:</strong> Fixo</div>
            <div><strong>Mensal:</strong> ${_fmtBRL(card.fixed_monthly_value)}</div>
            ${card.fixed_contract_months ? `<div><strong>Contrato:</strong> ${card.fixed_contract_months} mês${card.fixed_contract_months > 1 ? 'es' : ''}</div>` : ''}
            ${card.fixed_goals ? `<div style="margin-top:6px"><strong>Metas:</strong><div style="white-space:pre-wrap;color:var(--text2);font-size:12.5px;margin-top:2px">${_esc(card.fixed_goals)}</div></div>` : ''}
            ${card.fixed_deliverables ? `<div style="margin-top:6px"><strong>Entregas:</strong><div style="white-space:pre-wrap;color:var(--text2);font-size:12.5px;margin-top:2px">${_esc(card.fixed_deliverables)}</div></div>` : ''}
          </div>
        `;
      } else {
        dealBody = `<div style="font-size:12.5px;color:var(--text3);font-style:italic">Termos não registrados.</div>`;
      }
      wonBlock = `
        <div style="padding:12px 14px;background:color-mix(in srgb, var(--green) 8%, transparent);border:1px solid color-mix(in srgb, var(--green) 25%, transparent);border-radius:8px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:11px;color:var(--green);font-weight:700;letter-spacing:0.08em;text-transform:uppercase">
              <i data-lucide="check-circle" style="width:12px;height:12px;vertical-align:-2px"></i> Negócio fechado
            </span>
            <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px" onclick="window._pcrmEditWonDeal('${card.id}')">
              <i data-lucide="pencil" style="width:11px;height:11px"></i> Editar
            </button>
          </div>
          ${dealBody}
          ${card.closed_at ? `<div style="font-size:11px;color:var(--text3);margin-top:8px">Fechado em ${new Date(card.closed_at).toLocaleString('pt-BR')}</div>` : ''}
        </div>
      `;
    }

    // Affiliate hierarchy block
    const ROLE_LABEL = { master: 'Master', direto: 'Afiliado Direto', sub: 'Subafiliado' };
    const ROLE_COLOR = { master: '#a855f7', direto: '#3b82f6', sub: '#14b8a6' };
    let hierarchyBlock = '';
    if (card.affiliate_role) {
      const role = card.affiliate_role;
      const label = ROLE_LABEL[role];
      const color = ROLE_COLOR[role];
      let masterLine = '';
      if (role === 'sub' && card.master_contact_id) {
        const m = CRM.contactById(card.master_contact_id);
        if (m) {
          masterLine = `<div style="font-size:12px;color:var(--text2);margin-top:6px">
            Indicado por <a href="#" onclick="event.preventDefault();window._ctcOpenDetail('${m.id}')" style="color:var(--text);font-weight:600;text-decoration:underline">${_esc(m.name)}</a>
          </div>`;
        }
      }
      let subsList = '';
      if (role === 'master' && contact) {
        const subs = (STATE.crm.cards || [])
          .filter(c => c.affiliate_role === 'sub' && c.master_contact_id === contact.id && c.id !== card.id)
          .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'pt-BR'));
        subsList = `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--gb)">
          <div style="font-size:10.5px;color:var(--text2);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px">
            Subafiliados vinculados (${subs.length})
          </div>
          ${subs.length === 0
            ? `<div style="font-size:12px;color:var(--text3);font-style:italic">Nenhum sub vinculado ainda. Pra atribuir, abra o card do sub e aponte este contato como master.</div>`
            : `<div style="display:flex;flex-direction:column;gap:6px">
              ${subs.map(s => {
                const st = CRM.stageById(s.stage_id);
                return `<a href="#" onclick="event.preventDefault();closeModal();setTimeout(()=>window._pcrmOpenCard('${s.id}'),200)"
                  style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;background:var(--bg);border:1px solid var(--gb);border-radius:6px;color:var(--text);text-decoration:none;font-size:13px">
                  <span><strong>${_esc(s.title)}</strong> <span style="color:var(--text3);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin-left:6px">${s.scope}</span></span>
                  <span style="font-size:11px;color:var(--text3)">${st ? _esc(st.name) : '—'}</span>
                </a>`;
              }).join('')}
            </div>`
          }
        </div>`;
      }
      hierarchyBlock = `
        <div style="padding:2px 0 4px">
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="display:inline-flex;align-items:center;gap:6px;padding:3px 9px;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:4px;font-size:11px;font-weight:600">
              <i data-lucide="network" style="width:11px;height:11px"></i> ${label}
            </span>
            <button class="btn btn-ghost" style="padding:3px 8px;font-size:11px" onclick="window._pcrmEditAffiliate('${card.id}')">
              <i data-lucide="pencil" style="width:11px;height:11px"></i> Editar
            </button>
          </div>
          ${masterLine}
          ${subsList}
        </div>
      `;
    } else {
      hierarchyBlock = `
        <div style="padding:2px 0 4px">
          <button class="btn btn-outline" style="width:100%;padding:8px;font-size:12px" onclick="window._pcrmEditAffiliate('${card.id}')">
            <i data-lucide="network" style="width:12px;height:12px"></i> Master / Direto / Sub
          </button>
        </div>
      `;
    }

    const SCOPE_LABEL = { rips: 'Rips', b2c: 'B2C', b2b: 'B2B' };
    const prof = contact && window._ctcProfileById ? _ctcProfileById(contact.profile) : null;
    const company = contact && window._ctcCompanyOf ? _ctcCompanyOf(contact) : '';
    const phoneDigits = String(contact?.phone || '').replace(/\D/g, '');
    const wa = phoneDigits ? `https://wa.me/${phoneDigits.length <= 11 ? '55' + phoneDigits : phoneDigits}` : '';
    const sameName = contact && nameFold(contact.name).trim() === nameFold(card.title).trim();
    const canEditOwner = STATE.user?.role === 'admin' || STATE.user?.id === card.owner || !card.owner;
    const ownerField = canEditOwner
      ? `<select class="fi pcrm-owner-select" onchange="window._pcrmSetOwner('${card.id}', this.value)">
          ${!card.owner ? '<option value="">— sem responsável</option>' : ''}
          ${(STATE.users || []).filter(u => u.status !== 'inativo').map(u => `<option value="${u.id}" ${u.id === card.owner ? 'selected' : ''}>${_esc(u.name)}</option>`).join('')}
        </select>`
      : _esc(_ownerName(card.owner));
    const detail = (k, v) => v ? `<div class="cd-row"><span class="cd-k">${k}</span><span class="cd-v">${v}</span></div>` : '';
    const avatar = contact && window._ctcAvatar
      ? _ctcAvatar(contact, 'cd-av')
      : `<div class="ctc-tile-av cd-av" style="background:var(--bg3);color:var(--text2)">${nameInitials(card.title)}</div>`;

    const body = `
      <div class="cd pcrm-detail">
        <div class="cd-head">
          ${avatar}
          <div class="cd-id">
            <div class="cd-name">${_esc(card.title)}</div>
            <div class="cd-badges">
              <span class="ctc-tile-badge">${SCOPE_LABEL[scope] || scope}</span>
              ${stage ? `<span class="ctc-tile-badge" style="color:${stage.color};border-color:${stage.color}55;background:${stage.color}1a">${_esc(stage.name)}</span>` : ''}
              ${product && nameFold(product.name) !== scope ? `<span class="ctc-tile-badge" style="color:${product.color || 'var(--text2)'};border-color:${product.color || 'var(--gb2)'}55"><i data-lucide="package" style="width:10px;height:10px"></i>${_esc(product.name)}</span>` : ''}
              ${prof ? `<span class="ctc-tile-badge profile-badge" style="--prof-c:${prof.color}"><i data-lucide="${prof.icon}" style="width:10px;height:10px"></i>${prof.label}</span>` : ''}
            </div>
            <div class="cd-company"><i data-lucide="clock"></i>${_ageLabel(_daysSince(card.updated_at))}${contact && !sameName ? ` · <a href="#" class="ctc-pop-link" onclick="event.preventDefault();window._ctcOpenDetail('${contact.id}')">${_esc(contact.name)}</a>` : ''}${company ? ` · ${_esc(company)}` : ''}</div>
          </div>
        </div>

        <div class="cd-actions">
          <div class="cd-stage">
            <i data-lucide="git-branch"></i>
            <select id="pcrm-move-stage" class="fi" onchange="window._pcrmQuickMove('${card.id}', this.value)">
              ${stages.map(s => `<option value="${s.id}" ${s.id === card.stage_id ? 'selected' : ''}>${_esc(s.name)}${s.is_lost ? ' (perdido)' : ''}</option>`).join('')}
            </select>
          </div>
          ${contact ? `<button class="btn btn-outline" onclick="window._ctcOpenDetail('${contact.id}')"><i data-lucide="user"></i> Ver perfil</button>` : ''}
          ${wa ? `<a class="btn btn-outline" href="${wa}" target="_blank" rel="noopener"><i data-lucide="message-circle"></i> WhatsApp</a>` : ''}
          ${contact?.email ? `<a class="btn btn-outline" href="mailto:${_esc(contact.email)}"><i data-lucide="mail"></i> Email</a>` : ''}
        </div>

        ${lostBlock || wonBlock ? `<div class="cd-status">${lostBlock}${wonBlock}</div>` : ''}

        <div class="cd-grid">
          <div class="cd-col">
            ${contact && window._ctcSocialBlockHTML ? _ctcSocialBlockHTML(contact) : ''}
            ${card.notes ? `<div class="soc-block"><div class="soc-head"><span class="soc-title">Notas da negociação</span></div><p class="cd-p" style="white-space:pre-wrap;margin-top:2px">${_esc(card.notes)}</p></div>` : ''}
          </div>
          <div class="cd-col">
            <div class="soc-block">
              <div class="soc-head"><span class="soc-title">Detalhes</span></div>
              ${detail('Responsável', ownerField)}
              ${detail('Produto', product ? _esc(product.name) : '')}
              ${detail('Contato', contact && !sameName ? _esc(contact.name) : '')}
              ${detail('Email', contact?.email ? `<a class="ctc-pop-link" href="mailto:${_esc(contact.email)}">${_esc(contact.email)}</a>` : '')}
              ${detail('Telefone', contact?.phone ? _esc(contact.phone) : '')}
              ${detail('Criado em', new Date(card.created_at).toLocaleDateString('pt-BR'))}
              ${detail('Atualizado', new Date(card.updated_at).toLocaleDateString('pt-BR'))}
            </div>
            <div class="soc-block">
              <div class="soc-head"><span class="soc-title">Classificação</span></div>
              ${hierarchyBlock}
            </div>
          </div>
        </div>
      </div>
    `;

    const footer = `
      <button class="btn btn-danger" onclick="window._pcrmDeleteCard('${card.id}')"><i data-lucide="trash"></i> Excluir</button>
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
    `;

    openModal('Negociação', body, footer, { wide: true });
    lucide.createIcons();
    if (contact && window._ctcMaybeAutoRefreshSocial) _ctcMaybeAutoRefreshSocial(contact.id);
  };

  // Troca o responsável (admin, dono atual, ou card sem dono).
  window._pcrmSetOwner = async (cardId, uid) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card || !uid) return;
    try {
      await CRM.cards.update(cardId, { owner: uid });
      _renderBoard(card.scope);
      toast(`Responsável: ${_ownerName(uid)}`, 's');
    } catch (e) {
      toast('Erro ao trocar responsável: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // Open a quick modal to classify/edit the deal's affiliate role.
  // Separate from the main edit so it stays visible in the detail block.
  window._pcrmEditAffiliate = (cardId) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    const body = `
      <div class="form-grid">
        <div class="ff"><label>Categoria de parceria</label>
          <select id="pcrm-aff-role" class="fi" onchange="(function(v){document.getElementById('pcrm-aff-master-wrap').style.display=v==='sub'?'block':'none'})(this.value)">
            <option value="" ${!card.affiliate_role ? 'selected' : ''}>— Não classificado</option>
            <option value="master" ${card.affiliate_role === 'master' ? 'selected' : ''}>Master — indica outros parceiros</option>
            <option value="direto" ${card.affiliate_role === 'direto' ? 'selected' : ''}>Afiliado Direto</option>
            <option value="sub" ${card.affiliate_role === 'sub' ? 'selected' : ''}>Subafiliado — veio de um master</option>
          </select>
        </div>
        <div class="ff" id="pcrm-aff-master-wrap" style="display:${card.affiliate_role === 'sub' ? 'block' : 'none'}">
          <label>Master responsável *</label>
          ${_masterPickerHTML('pcrm-aff-master', card.master_contact_id, card.contact_id)}
        </div>
      </div>
    `;
    openModal('Classificação de parceria', body, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="window._pcrmSaveAffiliate('${cardId}')"><i data-lucide="check"></i> Salvar</button>
    `);
    lucide.createIcons();
  };

  window._pcrmSaveAffiliate = async (cardId) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    const role = document.getElementById('pcrm-aff-role')?.value || null;
    const masterId = role === 'sub' ? (document.getElementById('pcrm-aff-master')?.value || null) : null;
    if (role === 'sub' && !masterId) { toast('Selecione o master responsável', 'e'); return; }
    try {
      await CRM.cards.update(cardId, { affiliate_role: role, master_contact_id: masterId });
      closeModal();
      _renderBoard(card.scope || 'b2b');
      toast('Classificação atualizada', 's');
      // Reabre o detalhe pra mostrar o estado atualizado
      setTimeout(() => window._pcrmOpenCard(cardId), 150);
    } catch (e) {
      toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // Edit the won-deal terms on an already-won card. Reopens the same
  // modal we use at close-time, pre-filled with the current values.
  window._pcrmEditWonDeal = (cardId) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    const stage = CRM.stageById(card.stage_id);
    if (!stage || !stage.is_won) return;
    closeModal();
    _pcrmOpenWonDealModal(card, stage, async (terms) => {
      try {
        await CRM.cards.update(cardId, { stage_id: card.stage_id, ...terms });
        _renderBoard(card.scope || 'b2b');
        toast('Termos atualizados', 's');
      } catch (e) {
        toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'e');
      }
    });
  };

  // Edit the lost reason on an already-lost card (opens the same modal
  // we use at move-time, pre-filled, but keeps the card where it is).
  window._pcrmEditLostReason = (cardId) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    const stage = CRM.stageById(card.stage_id);
    if (!stage || !stage.is_lost) return;
    closeModal();
    _pcrmOpenLostReasonModal(card, stage, async (reason) => {
      try {
        await CRM.cards.update(cardId, { stage_id: card.stage_id, lost_reason: reason });
        _renderBoard(card.scope || 'b2b');
        toast('Justificativa atualizada', 's');
      } catch (e) {
        toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'e');
      }
    });
    // Pre-fill the textarea once the modal is in the DOM
    setTimeout(() => {
      const ta = document.getElementById('pcrm-lost-reason');
      if (ta) {
        ta.value = card.lost_reason || '';
        document.getElementById('pcrm-lost-confirm').disabled = !ta.value.trim();
      }
    }, 50);
  };

  window._pcrmQuickMove = async (cardId, stageId) => {
    const card = STATE.crm.cards.find(c => c.id === cardId);
    if (!card) return;
    const dest = CRM.stageById(stageId);
    if (dest && dest.is_lost) {
      closeModal();
      _pcrmOpenLostReasonModal(card, dest, async (reason) => {
        try {
          await CRM.cards.update(cardId, { stage_id: stageId, lost_reason: reason });
          _renderBoard(card.scope || 'b2b');
          toast('Negociação marcada como perdida', 's');
        } catch (e) {
          toast('Erro ao mover: ' + (e.message || 'desconhecido'), 'e');
        }
      });
      return;
    }
    if (dest && dest.is_won) {
      closeModal();
      _pcrmOpenWonDealModal(card, dest, async (terms) => {
        try {
          await CRM.cards.update(cardId, { stage_id: stageId, ...terms });
          _renderBoard(card.scope || 'b2b');
          toast('Negócio fechado! 🎉', 's');
        } catch (e) {
          toast('Erro ao fechar: ' + (e.message || 'desconhecido'), 'e');
        }
      });
      return;
    }
    try {
      await CRM.cards.moveToStage(cardId, stageId);
      _renderBoard(card.scope || 'b2b');
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
  function _daysSince(ts) {
    if (!ts) return 0;
    return Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000));
  }
  function _ageLabel(days) {
    if (days <= 0) return 'hoje';
    if (days === 1) return 'há 1 dia';
    return `há ${days} dias`;
  }
})();
