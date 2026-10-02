// ══════════════════════════════════════════════════════════
// CRM — CONTATOS (Wishlist + Prospects + Clientes)
// ══════════════════════════════════════════════════════════
// Módulo central da frente comercial. Lista todos os contatos do schema
// `crm.contacts` com filtros múltiplos (status, tipo, temperatura, tag,
// produto). Permite CRUD + promover contato para Pipeline B2B/B2C.
// ══════════════════════════════════════════════════════════

(function () {
  // Filtros ativos (compartilhados pelo módulo)
  let F = { search: '', status: null, type: null, profile: null, tier: null, tag: null, product: null };

  // Modo seleção múltipla (pra excluir em lote)
  let _selectMode = false;
  const _selected = new Set();

  const STATUS_LABEL = { wishlist: 'Wishlist', in_pipeline: 'No pipeline', customer: 'Cliente', churned: 'Perdido' };

  // Perfis padrão (user pode expandir no futuro)
  const PROFILES = [
    { id: 'influencer', label: 'Influencer', icon: 'star',        color: '#ec4899' },
    { id: 'tipster',    label: 'Tipster',    icon: 'trending-up', color: '#10b981' },
    { id: 'streamer',   label: 'Streamer',   icon: 'video',       color: '#a855f7' },
    { id: 'agencia',    label: 'Agência',    icon: 'building-2',  color: '#6366f1' },
  ];
  const PROFILE_BY_ID = Object.fromEntries(PROFILES.map(p => [p.id, p]));

  // Tiers de prioridade (1 = top, 3 = base)
  const TIERS = [
    { id: 1, label: 'Tier 1', color: '#ec4899', desc: 'Top prioridade' },
    { id: 2, label: 'Tier 2', color: '#f59e0b', desc: 'Média prioridade' },
    { id: 3, label: 'Tier 3', color: '#64748b', desc: 'Base' },
  ];
  const TIER_BY_ID = Object.fromEntries(TIERS.map(t => [t.id, t]));
  const TYPE_LABEL = { b2b: 'B2B', b2c: 'B2C', both: 'B2B+B2C' };
  const SOURCE_LABEL = { inbound: 'Inbound', outbound: 'Outbound', referral: 'Indicação', event: 'Evento', social: 'Redes sociais', other: 'Outro' };

  // ── MOUNT ─────────────────────────────────────────────────
  async function bContacts(el) {
    el.innerHTML = modHdr('Contatos — Wishlist & CRM') + `<div class="mod-body">
      ${heroHTML('contacts', 'CRM Comercial', 'Contatos', 'Wishlist, prospects e clientes do portfolio')}
      <div class="mod-main">
        <div class="sec-hdr">
          <div class="sec-lbl" id="ctc-sec-lbl">Todos os contatos</div>
          <div class="sec-actions" id="ctc-sec-actions">
            <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar nome, email, empresa..." oninput="window._ctcSearch(this.value)"></div>
            <button class="btn btn-outline" onclick="window._ctcToggleSelect()"><i data-lucide="check-square"></i> Selecionar</button>
            <button class="btn btn-outline" onclick="window._ctcOpenImports()"><i data-lucide="list"></i> Lançamentos</button>
            <button class="btn btn-outline" onclick="window._ctcManageTags()"><i data-lucide="tags"></i> Tags</button>
            <button class="btn btn-outline" onclick="window._ctcOpenImport()"><i data-lucide="upload"></i> Importar</button>
            <button class="btn btn-outline" onclick="window._ctcExportPDF()" title="Exporta a lista atual (respeita filtros ativos) em um PDF interativo"><i data-lucide="file-text"></i> PDF</button>
            <button class="btn btn-theme" onclick="window._ctcOpenNew()"><i data-lucide="plus"></i> Novo contato</button>
          </div>
        </div>

        <div class="ctc-filterbar">
          <div class="ctc-fb-chip ctc-fb-count" id="ctc-counts">0 contatos</div>

          <div class="ctc-fb-seg" data-f="profile">
            <button class="ctc-fb-chip on" data-v="" onclick="window._ctcFilter(this)">
              <i data-lucide="layers" style="width:11px;height:11px"></i> Perfil: todos
            </button>
            ${PROFILES.map(p => `<button class="ctc-fb-chip" data-v="${p.id}" onclick="window._ctcFilter(this)" style="--chip-c:${p.color}">
              <i data-lucide="${p.icon}" style="width:11px;height:11px"></i>${p.label}
            </button>`).join('')}
          </div>

          <div class="ctc-fb-divider"></div>

          <div class="ctc-fb-seg" data-f="tier">
            <button class="ctc-fb-chip on" data-v="" onclick="window._ctcFilter(this)">
              <i data-lucide="award" style="width:11px;height:11px"></i> Tier: todos
            </button>
            ${TIERS.map(t => `<button class="ctc-fb-chip" data-v="${t.id}" onclick="window._ctcFilter(this)" style="--chip-c:${t.color}">
              T${t.id}
            </button>`).join('')}
          </div>

          <div class="ctc-fb-divider"></div>

          <div class="ctc-fb-seg" data-f="status">
            <button class="ctc-fb-chip on" data-v="" onclick="window._ctcFilter(this)">
              <i data-lucide="circle" style="width:9px;height:9px"></i>Status: todos
            </button>
            <button class="ctc-fb-chip" data-v="wishlist" onclick="window._ctcFilter(this)" style="--chip-c:#94a3b8">
              <span class="ctc-fb-dot" style="background:#94a3b8"></span>Wishlist
            </button>
            <button class="ctc-fb-chip" data-v="in_pipeline" onclick="window._ctcFilter(this)" style="--chip-c:#f59e0b">
              <span class="ctc-fb-dot" style="background:#f59e0b"></span>No pipeline
            </button>
            <button class="ctc-fb-chip" data-v="customer" onclick="window._ctcFilter(this)" style="--chip-c:#10b981">
              <span class="ctc-fb-dot" style="background:#10b981"></span>Clientes
            </button>
            <button class="ctc-fb-chip" data-v="churned" onclick="window._ctcFilter(this)" style="--chip-c:#ef4444">
              <span class="ctc-fb-dot" style="background:#ef4444"></span>Perdidos
            </button>
          </div>

          <div class="ctc-fb-divider"></div>

          <div class="ctc-fb-seg" data-f="type">
            <button class="ctc-fb-chip on" data-v="" onclick="window._ctcFilter(this)">
              <i data-lucide="users" style="width:11px;height:11px"></i>Tipo: todos
            </button>
            <button class="ctc-fb-chip" data-v="b2b" onclick="window._ctcFilter(this)" style="--chip-c:#6366f1">B2B</button>
            <button class="ctc-fb-chip" data-v="b2c" onclick="window._ctcFilter(this)" style="--chip-c:#d946ef">B2C</button>
            <button class="ctc-fb-chip" data-v="both" onclick="window._ctcFilter(this)" style="--chip-c:#14b8a6">Ambos</button>
          </div>

          <button class="ctc-fb-clear" id="ctc-fb-clear" onclick="window._ctcClearFilters()" style="display:none">
            <i data-lucide="x" style="width:11px;height:11px"></i> Limpar
          </button>
        </div>

        <div class="ctc-list" id="ctc-list"></div>
      </div></div>`;

    // Sempre tenta recarregar — garante dados fresh e corrige estados
    // onde loaded=true mas contacts ficou vazio por sessão não autenticada
    if (window.CRM?.loadAll) {
      if (!STATE.crm.loaded || !STATE.crm.contacts?.length) _renderLoading();
      const ok = await CRM.loadAll();
      if (!ok) {
        _renderError('Não foi possível carregar os contatos. Faça logout e login novamente, ou verifique se o schema `crm` está exposto na API do Supabase.');
        return;
      }
    }
    _renderTagFilter();
    _renderProductFilter();
    _renderList();
    lucide.createIcons();
  }
  window.bContacts = bContacts;

  // ── RENDER PRINCIPAL ──────────────────────────────────────
  function _renderList() {
    const list = _computeList();
    const el = document.getElementById('ctc-list');
    const countsEl = document.getElementById('ctc-counts');
    if (!el) return;
    if (countsEl) {
      const total = STATE.crm.contacts.length;
      const filtered = list.length !== total;
      countsEl.innerHTML = filtered
        ? `<strong>${list.length}</strong> <span style="opacity:0.6">de ${total}</span>`
        : `<strong>${total}</strong> ${total === 1 ? 'contato' : 'contatos'}`;
    }

    if (!list.length) {
      el.innerHTML = `<div class="empty"><i data-lucide="user-plus"></i><p>Nenhum contato com esses filtros</p>
        <button class="btn btn-theme" onclick="window._ctcOpenNew()" style="margin-top:12px"><i data-lucide="plus"></i> Adicionar primeiro contato</button></div>`;
      lucide.createIcons();
      return;
    }

    el.className = 'ctc-grid' + (_selectMode ? ' select-mode' : '');
    el.innerHTML = list.map(c => {
      const initials = (c.name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
      let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const avatarBg = `hsl(${hue},65%,50%)`;
      const ig = _normalizeIgHandle(c.social_links?.instagram);
      // Avatar: prioridade = avatar_url manual > iniciais
      const avatar = _avatarHTML(c, hue, initials);
      const prof = PROFILE_BY_ID[c.profile];
      const tier = TIER_BY_ID[c.tier];
      const subLine = c.company || c.email || c.phone || '';
      const checked = _selected.has(c.id);
      const onclickAttr = _selectMode
        ? `onclick="window._ctcToggleSel('${c.id}', event)"`
        : `onclick="window._ctcOpenDetail('${c.id}')"`;

      return `<article class="ctc-tile ${checked ? 'is-selected' : ''}" ${onclickAttr} style="--ctc-c:${avatarBg}">
        ${_selectMode ? `<div class="ctc-tile-check ${checked ? 'on' : ''}">
          ${checked ? '<i data-lucide="check"></i>' : ''}
        </div>` : ''}
        ${tier ? `<span class="ctc-tile-tier" style="--tier-c:${tier.color}" title="${tier.label} — ${tier.desc}">T${tier.id}</span>` : ''}
        <div class="ctc-tile-head">
          ${avatar}
          <span class="ctc-tile-status status-${c.status}" title="${STATUS_LABEL[c.status] || c.status}"></span>
        </div>
        <div class="ctc-tile-body">
          <div class="ctc-tile-name">${_esc(c.name)}</div>
          ${ig ? `<a class="ctc-tile-ig" href="https://instagram.com/${_esc(ig)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
            <i data-lucide="instagram"></i>@${_esc(ig)}
          </a>` : ''}
          ${subLine ? `<div class="ctc-tile-sub">${_esc(subLine)}</div>` : '<div class="ctc-tile-sub" style="opacity:0.4">—</div>'}
        </div>
        <div class="ctc-tile-foot">
          ${prof ? `<span class="ctc-tile-badge profile-badge" style="--prof-c:${prof.color}">
            <i data-lucide="${prof.icon}" style="width:9px;height:9px"></i>${prof.label}
          </span>` : ''}
          <span class="ctc-tile-badge status-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
        </div>
      </article>`;
    }).join('');
    lucide.createIcons();
  }

  function _renderTagFilter() {
    const g = document.getElementById('ctc-tag-filter-group');
    if (!g) return;
    const tags = STATE.crm.tags || [];
    if (!tags.length) { g.style.display = 'none'; return; }
    g.style.display = '';
    g.innerHTML = `<span class="ctc-filter-lbl">Tag</span>
      <button class="pill on" data-f="tag" data-v="" onclick="window._ctcFilter(this)">Todas</button>
      ${tags.map(t => `<button class="pill" data-f="tag" data-v="${t.id}" onclick="window._ctcFilter(this)" style="--tag-c:${t.color}"><span style="width:7px;height:7px;background:${t.color};border-radius:50%;display:inline-block;margin-right:4px"></span>${_esc(t.name)}</button>`).join('')}`;
  }

  function _renderProductFilter() {
    const g = document.getElementById('ctc-product-filter-group');
    if (!g) return;
    const products = STATE.crm.products || [];
    if (!products.length) { g.style.display = 'none'; return; }
    g.style.display = '';
    g.innerHTML = `<span class="ctc-filter-lbl">Produto</span>
      <button class="pill on" data-f="product" data-v="" onclick="window._ctcFilter(this)">Todos</button>
      ${products.map(p => `<button class="pill" data-f="product" data-v="${p.id}" onclick="window._ctcFilter(this)">${_esc(p.name)}</button>`).join('')}`;
  }

  function _renderLoading() {
    const el = document.getElementById('ctc-list');
    if (el) el.innerHTML = '<div class="empty"><i data-lucide="loader"></i><p>Carregando contatos...</p></div>';
    lucide.createIcons();
  }

  function _renderError(msg) {
    const el = document.getElementById('ctc-list');
    if (el) el.innerHTML = `<div class="empty"><i data-lucide="alert-triangle" style="color:var(--amber)"></i><p>${_esc(msg)}</p></div>`;
    lucide.createIcons();
  }

  // ── FILTROS ────────────────────────────────────────────────
  window._ctcSearch = (v) => {
    F.search = v.trim().toLowerCase();
    _renderList();
  };

  window._ctcFilter = (btn) => {
    const seg = btn.closest('.ctc-fb-seg');
    const key = seg?.dataset.f;
    const val = btn.dataset.v || null;
    F[key] = val;
    seg.querySelectorAll('.ctc-fb-chip').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    _renderList();
    _updateClearBtn();
  };

  window._ctcClearFilters = () => {
    F.status = null; F.type = null; F.profile = null; F.tier = null; F.tag = null; F.product = null;
    document.querySelectorAll('.ctc-fb-seg').forEach(seg => {
      const chips = seg.querySelectorAll('.ctc-fb-chip');
      chips.forEach(c => c.classList.remove('on'));
      chips[0]?.classList.add('on');
    });
    _renderList();
    _updateClearBtn();
  };

  function _updateClearBtn() {
    const btn = document.getElementById('ctc-fb-clear');
    if (!btn) return;
    const anyActive = F.status || F.type || F.profile || F.tier || F.tag || F.product;
    btn.style.display = anyActive ? 'inline-flex' : 'none';
  }

  function _computeList() {
    const term = F.search;
    let list = STATE.crm.contacts || [];
    if (F.status) list = list.filter(c => c.status === F.status);
    if (F.type) list = list.filter(c => c.type === F.type);
    if (F.profile === '__none__') list = list.filter(c => !c.profile);
    else if (F.profile) list = list.filter(c => c.profile === F.profile);
    if (F.tier) list = list.filter(c => c.tier === Number(F.tier));
    if (F.tag) {
      // TODO: filtrar por tag via contact_tags (precisa query extra ou join)
      // Por ora, mostra todos — tag filter é visual até implementar o join
    }
    if (F.product) {
      // TODO: filtrar por produto via contact_product_fit
    }
    if (term) {
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(term) ||
        (c.email || '').toLowerCase().includes(term) ||
        (c.company || '').toLowerCase().includes(term) ||
        (c.phone || '').toLowerCase().includes(term)
      );
    }
    return list;
  }

  // ── NOVO CONTATO ──────────────────────────────────────────
  window._ctcOpenNew = () => {
    openModal('Novo contato', _formHTML(), `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="window._ctcSaveNew()"><i data-lucide="check"></i> Criar contato</button>
    `);
    lucide.createIcons();
  };

  let _savingNew = false;
  window._ctcSaveNew = async () => {
    if (_savingNew) return;  // guarda contra double-click
    const payload = _formRead();
    if (!payload.name) { toast('Nome é obrigatório', 'e'); return; }
    _savingNew = true;
    const btn = document.querySelector('.modal-ft .btn-theme');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Criando...'; lucide.createIcons(); }
    try {
      const created = await CRM.contacts.create(payload);
      closeModal();
      _renderList();
      toast(`"${created.name}" adicionado à wishlist`, 's');
    } catch (e) {
      toast('Erro ao criar: ' + (e.message || 'desconhecido'), 'e');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check"></i> Criar contato'; lucide.createIcons(); }
    } finally {
      _savingNew = false;
    }
  };

  function _formHTML(c = {}) {
    return `
      <div class="form-grid">
        <div class="ff"><label>Nome *</label><input id="ctc-f-name" type="text" value="${_esc(c.name || '')}" placeholder="Nome completo"></div>
        <div class="form-row">
          <div class="ff"><label>Email</label><input id="ctc-f-email" type="email" value="${_esc(c.email || '')}" placeholder="email@exemplo.com"></div>
          <div class="ff"><label>Telefone</label><input id="ctc-f-phone" type="text" value="${_esc(c.phone || '')}" placeholder="+55 11 99999-9999"></div>
        </div>
        <div class="form-row">
          <div class="ff"><label>Empresa</label><input id="ctc-f-company" type="text" value="${_esc(c.company || '')}" placeholder="Nome da empresa"></div>
          <div class="ff"><label>Instagram</label>
            <div class="ctc-ig-input">
              <input id="ctc-f-instagram" type="text" value="${_esc(c.social_links?.instagram || '')}"
                placeholder="@handle ou link"
                oninput="window._ctcIgInputChanged(this)">
              <button type="button" class="ctc-ig-open" id="ctc-ig-open-btn"
                onclick="window._ctcOpenIgFromInput()"
                ${!c.social_links?.instagram ? 'disabled' : ''}
                title="Abrir perfil no Instagram">
                <i data-lucide="external-link"></i>
              </button>
            </div>
          </div>
        </div>
        <div class="ff"><label>Foto do perfil (opcional)
          <span style="font-weight:400;font-size:10px;color:var(--text3);text-transform:none;letter-spacing:0;margin-left:6px">
            cola URL da imagem — se vazio, tentamos puxar do Instagram automaticamente
          </span>
        </label>
          <input id="ctc-f-avatar" type="url" value="${_esc(c.avatar_url || '')}" placeholder="https://..."
            oninput="window._ctcAvatarPreview(this.value)">
          <div class="ctc-avatar-preview" id="ctc-avatar-preview" style="display:${c.avatar_url ? 'flex' : 'none'}">
            <img src="${_esc(c.avatar_url || '')}" alt="" onerror="this.style.display='none'">
          </div>
        </div>
        <div class="form-row">
          <div class="ff"><label>Perfil</label>
            <select id="ctc-f-profile" class="fi">
              <option value="">—</option>
              ${PROFILES.map(p => `<option value="${p.id}" ${c.profile === p.id ? 'selected' : ''}>${p.label}</option>`).join('')}
            </select>
          </div>
          <div class="ff"><label>Tier</label>
            <select id="ctc-f-tier" class="fi">
              <option value="">—</option>
              ${TIERS.map(t => `<option value="${t.id}" ${Number(c.tier) === t.id ? 'selected' : ''}>${t.label} — ${t.desc}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="ff"><label>Tipo</label>
          <select id="ctc-f-type" class="fi">
            <option value="b2c" ${c.type === 'b2c' ? 'selected' : ''}>B2C (Pessoa física/Influencer)</option>
            <option value="b2b" ${c.type === 'b2b' ? 'selected' : ''}>B2B (Empresa)</option>
            <option value="both" ${c.type === 'both' ? 'selected' : ''}>Ambos</option>
          </select>
        </div>
        <div class="ff"><label>Status</label>
          <select id="ctc-f-status" class="fi">
            <option value="wishlist" ${(!c.status || c.status === 'wishlist') ? 'selected' : ''}>Wishlist</option>
            <option value="in_pipeline" ${c.status === 'in_pipeline' ? 'selected' : ''}>No pipeline</option>
            <option value="customer" ${c.status === 'customer' ? 'selected' : ''}>Cliente</option>
            <option value="churned" ${c.status === 'churned' ? 'selected' : ''}>Perdido</option>
          </select>
        </div>
        <div class="ff"><label>Origem</label>
          <select id="ctc-f-source" class="fi">
            <option value="">—</option>
            <option value="inbound" ${c.source === 'inbound' ? 'selected' : ''}>Inbound</option>
            <option value="outbound" ${c.source === 'outbound' ? 'selected' : ''}>Outbound</option>
            <option value="referral" ${c.source === 'referral' ? 'selected' : ''}>Indicação</option>
            <option value="event" ${c.source === 'event' ? 'selected' : ''}>Evento</option>
            <option value="social" ${c.source === 'social' ? 'selected' : ''}>Redes sociais</option>
            <option value="other" ${c.source === 'other' ? 'selected' : ''}>Outro</option>
          </select>
        </div>
        <div class="ff"><label>Notas</label><textarea id="ctc-f-notes" rows="3" placeholder="Contexto, histórico, observações...">${_esc(c.notes || '')}</textarea></div>
      </div>`;
  }

  // Normaliza qualquer formato (@user, user, instagram.com/user, https://...)
  // para o handle puro ("user").
  function _normalizeIgHandle(raw) {
    if (!raw) return '';
    let s = String(raw).trim();
    if (!s) return '';
    // Tira protocol
    s = s.replace(/^https?:\/\//i, '');
    // Tira www.
    s = s.replace(/^www\./i, '');
    // Se tem instagram.com/, pega o que vem depois
    const m = s.match(/(?:instagram\.com|instagr\.am)\/([a-zA-Z0-9._]+)/i);
    if (m) return m[1];
    // Senão, trata como handle direto — tira @ e trailing slash
    return s.replace(/^@/, '').replace(/\/.*$/, '');
  }

  function _formRead() {
    const get = (id) => document.getElementById(id)?.value || '';
    const ig = _normalizeIgHandle(get('ctc-f-instagram'));
    return {
      name: get('ctc-f-name').trim(),
      email: get('ctc-f-email').trim() || null,
      phone: get('ctc-f-phone').trim() || null,
      company: get('ctc-f-company').trim() || null,
      avatar_url: get('ctc-f-avatar').trim() || null,
      social_links: ig ? { instagram: ig } : {},
      type: get('ctc-f-type'),
      profile: get('ctc-f-profile') || null,
      tier: get('ctc-f-tier') ? Number(get('ctc-f-tier')) : null,
      status: get('ctc-f-status'),
      source: get('ctc-f-source') || null,
      notes: get('ctc-f-notes').trim() || null,
    };
  }

  // Preview da imagem conforme o user digita URL
  window._ctcAvatarPreview = (url) => {
    const prev = document.getElementById('ctc-avatar-preview');
    if (!prev) return;
    const img = prev.querySelector('img');
    if (!url || !url.trim()) {
      prev.style.display = 'none';
      return;
    }
    prev.style.display = 'flex';
    img.src = url;
    img.style.display = '';
  };

  // Handlers do campo Instagram no formulário
  window._ctcIgInputChanged = (input) => {
    const btn = document.getElementById('ctc-ig-open-btn');
    if (!btn) return;
    const handle = _normalizeIgHandle(input.value);
    btn.disabled = !handle;
  };

  window._ctcOpenIgFromInput = () => {
    const input = document.getElementById('ctc-f-instagram');
    if (!input) return;
    const handle = _normalizeIgHandle(input.value);
    if (!handle) return;
    window.open(`https://instagram.com/${handle}`, '_blank', 'noopener');
  };

  // ── DETALHES DO CONTATO ──────────────────────────────────
  window._ctcOpenDetail = (id) => {
    const c = CRM.contactById(id);
    if (!c) return;
    const ig = _normalizeIgHandle(c.social_links?.instagram);
    const prof = PROFILE_BY_ID[c.profile];

    const body = `
      <div class="ctc-detail-head">
        <div style="display:flex;align-items:center;gap:10px">
          <strong style="font-size:18px">${_esc(c.name)}</strong>
          ${prof ? `<span class="ctc-tile-badge profile-badge" style="--prof-c:${prof.color}">
            <i data-lucide="${prof.icon}" style="width:10px;height:10px"></i>${prof.label}
          </span>` : ''}
        </div>
        <div style="color:var(--text2);font-size:12px;margin-top:4px">
          ${c.company || '—'} · ${TYPE_LABEL[c.type] || c.type} · ${STATUS_LABEL[c.status] || c.status}
        </div>
      </div>
      ${ig ? `<a class="ctc-ig-cta" href="https://instagram.com/${_esc(ig)}" target="_blank" rel="noopener">
        <span class="ctc-ig-cta-ico"><i data-lucide="instagram"></i></span>
        <span class="ctc-ig-cta-info">
          <span class="ctc-ig-cta-k">Instagram</span>
          <span class="ctc-ig-cta-handle">@${_esc(ig)}</span>
        </span>
        <span class="ctc-ig-cta-arrow"><i data-lucide="external-link"></i></span>
      </a>` : ''}
      <div class="ctc-detail-grid">
        ${c.email ? `<div><span class="ctc-dt-k">Email</span><span>${_esc(c.email)}</span></div>` : ''}
        ${c.phone ? `<div><span class="ctc-dt-k">Telefone</span><span>${_esc(c.phone)}</span></div>` : ''}
        ${c.source ? `<div><span class="ctc-dt-k">Origem</span><span>${SOURCE_LABEL[c.source] || c.source}</span></div>` : ''}
        <div><span class="ctc-dt-k">Criado em</span><span>${new Date(c.created_at).toLocaleDateString('pt-BR')}</span></div>
      </div>
      ${c.notes ? `<div style="margin-top:14px"><div class="ctc-dt-k" style="margin-bottom:6px">Notas</div><div style="font-size:13px;color:var(--text);white-space:pre-wrap">${_esc(c.notes)}</div></div>` : ''}
    `;

    const footer = `
      <button class="btn btn-danger" onclick="window._ctcDelete('${c.id}')"><i data-lucide="trash-2"></i> Excluir</button>
      <button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
      <button class="btn btn-theme" onclick="window._ctcOpenEdit('${c.id}')"><i data-lucide="edit-2"></i> Editar</button>
    `;

    openModal(c.name, body, footer);
    lucide.createIcons();
  };

  window._ctcOpenEdit = (id) => {
    const c = CRM.contactById(id);
    if (!c) return;
    openModal('Editar ' + c.name, _formHTML(c), `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="window._ctcSaveEdit('${id}')"><i data-lucide="check"></i> Salvar</button>
    `);
    lucide.createIcons();
  };

  let _savingEdit = false;
  window._ctcSaveEdit = async (id) => {
    if (_savingEdit) return;
    const payload = _formRead();
    if (!payload.name) { toast('Nome é obrigatório', 'e'); return; }
    _savingEdit = true;
    const btn = document.querySelector('.modal-ft .btn-theme');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader"></i> Salvando...'; lucide.createIcons(); }
    try {
      await CRM.contacts.update(id, payload);
      closeModal();
      _renderList();
      toast('Contato atualizado', 's');
    } catch (e) {
      toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'e');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="check"></i> Salvar'; lucide.createIcons(); }
    } finally {
      _savingEdit = false;
    }
  };

  window._ctcDelete = async (id) => {
    const c = CRM.contactById(id);
    if (!c) return;
    if (!confirm(`Excluir "${c.name}"? Essa ação não pode ser desfeita.`)) return;
    try {
      await CRM.contacts.remove(id);
      closeModal();
      _renderList();
      toast('Contato excluído', 's');
    } catch (e) {
      toast('Erro ao excluir: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── TAG MANAGEMENT ────────────────────────────────────────
  window._ctcManageTags = () => {
    const tags = STATE.crm.tags || [];
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px">Tags centralizadas que você pode associar a contatos para segmentar.</div>
      <div style="display:flex;gap:8px;margin-bottom:14px">
        <input id="ctc-tag-name" class="fi" type="text" placeholder="Nome da tag" style="flex:1">
        <input id="ctc-tag-color" class="fi" type="color" value="#14b8a6" style="width:60px;padding:4px">
        <button class="btn btn-theme" onclick="window._ctcTagAdd()"><i data-lucide="plus"></i></button>
      </div>
      <div class="ctc-tag-list">
        ${tags.length ? tags.map(t => `
          <div class="ctc-tag-row">
            <span style="display:inline-flex;align-items:center;gap:8px">
              <span style="width:12px;height:12px;background:${t.color};border-radius:50%;display:inline-block"></span>
              ${_esc(t.name)}
            </span>
            <button class="btn btn-ghost" onclick="window._ctcTagRemove('${t.id}')"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
          </div>
        `).join('') : '<div style="color:var(--text3);text-align:center;padding:14px">Nenhuma tag criada ainda.</div>'}
      </div>
    `;
    openModal('Gerenciar tags', body, `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);
    lucide.createIcons();
  };

  window._ctcTagAdd = async () => {
    const name = document.getElementById('ctc-tag-name').value.trim();
    const color = document.getElementById('ctc-tag-color').value;
    if (!name) { toast('Nome da tag é obrigatório', 'e'); return; }
    try {
      await CRM.tags.create({ name, color });
      _ctcManageTags();  // reabre pra atualizar
      _renderTagFilter();
      toast('Tag criada', 's');
    } catch (e) {
      if (e.code === '23505') toast('Essa tag já existe', 'w');
      else toast('Erro: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  window._ctcTagRemove = async (id) => {
    if (!confirm('Remover essa tag? Ela será desvinculada de todos os contatos.')) return;
    try {
      await CRM.tags.remove(id);
      _ctcManageTags();
      _renderTagFilter();
      toast('Tag removida', 's');
    } catch (e) {
      toast('Erro ao remover: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── BULK SELECT & DELETE ──────────────────────────────────
  window._ctcToggleSelect = () => {
    _selectMode = !_selectMode;
    _selected.clear();
    _renderActionsBar();
    _renderList();
  };

  window._ctcToggleSel = (id, ev) => {
    if (ev) ev.stopPropagation();
    if (_selected.has(id)) _selected.delete(id);
    else _selected.add(id);
    _renderActionsBar();
    _renderList();
  };

  window._ctcSelectAll = () => {
    const list = _computeList();
    if (_selected.size === list.length) _selected.clear();
    else list.forEach(c => _selected.add(c.id));
    _renderActionsBar();
    _renderList();
  };

  window._ctcDeleteSelected = async () => {
    const ids = [...(_selected)];
    if (!ids.length) return;
    if (!confirm(`Excluir ${ids.length} contato${ids.length === 1 ? '' : 's'}? Essa ação não pode ser desfeita.`)) return;
    try {
      const client = window.sb.schema('crm');
      const { error } = await client.from('contacts').delete().in('id', ids);
      if (error) throw error;
      // Atualiza o STATE
      const idSet = new Set(ids);
      STATE.crm.contacts = (STATE.crm.contacts || []).filter(c => !idSet.has(c.id));
      _selected.clear();
      _selectMode = false;
      _renderActionsBar();
      _renderList();
      toast(`${ids.length} contato${ids.length === 1 ? '' : 's'} excluído${ids.length === 1 ? '' : 's'}`, 's');
    } catch (e) {
      toast('Erro ao excluir: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  function _renderActionsBar() {
    const lbl = document.getElementById('ctc-sec-lbl');
    const actions = document.getElementById('ctc-sec-actions');
    if (!lbl || !actions) return;
    if (_selectMode) {
      const total = _computeList().length;
      lbl.innerHTML = `<span style="color:var(--theme)">${_selected.size}</span> selecionado${_selected.size === 1 ? '' : 's'} <span style="color:var(--text3);font-weight:400">de ${total}</span>`;
      actions.innerHTML = `
        <button class="btn btn-outline" onclick="window._ctcSelectAll()">
          <i data-lucide="check-square"></i> ${_selected.size === total ? 'Nenhum' : 'Selecionar todos'}
        </button>
        <button class="btn btn-danger" onclick="window._ctcDeleteSelected()" ${_selected.size === 0 ? 'disabled' : ''}>
          <i data-lucide="trash-2"></i> Excluir ${_selected.size > 0 ? '(' + _selected.size + ')' : ''}
        </button>
        <button class="btn btn-ghost" onclick="window._ctcToggleSelect()">
          <i data-lucide="x"></i> Cancelar
        </button>
      `;
    } else {
      lbl.textContent = 'Todos os contatos';
      actions.innerHTML = `
        <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar nome, email, empresa..." oninput="window._ctcSearch(this.value)"></div>
        <button class="btn btn-outline" onclick="window._ctcToggleSelect()"><i data-lucide="check-square"></i> Selecionar</button>
        <button class="btn btn-outline" onclick="window._ctcOpenImports()"><i data-lucide="list"></i> Lançamentos</button>
        <button class="btn btn-outline" onclick="window._ctcManageTags()"><i data-lucide="tags"></i> Tags</button>
        <button class="btn btn-outline" onclick="window._ctcOpenImport()"><i data-lucide="upload"></i> Importar</button>
        <button class="btn btn-theme" onclick="window._ctcOpenNew()"><i data-lucide="plus"></i> Novo contato</button>
      `;
    }
    if (window.lucide) lucide.createIcons();
  }

  // ── LANÇAMENTOS (histórico de imports em batch) ──────────
  // Agrupa contatos pelo created_at exato (precisão de microssegundo).
  // Inserts em lote dão todos o mesmo timestamp — adições manuais não.
  // Threshold: grupos com >= 2 contatos no mesmo instante = import.
  function _detectImports() {
    const contacts = STATE.crm?.contacts || [];
    const groups = {};
    contacts.forEach(c => {
      const key = c.created_at;
      if (!groups[key]) groups[key] = [];
      groups[key].push(c);
    });
    return Object.entries(groups)
      .filter(([, arr]) => arr.length >= 2)
      .map(([createdAt, arr]) => ({
        createdAt,
        count: arr.length,
        contacts: arr,
        sampleNames: arr.slice(0, 4).map(c => c.name),
      }))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  window._ctcOpenImports = () => {
    const imports = _detectImports();
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6">
        Cada linha abaixo é um lançamento em lote (contatos adicionados juntos na mesma importação).
        Contatos cadastrados individualmente não aparecem aqui.
      </div>
      ${imports.length === 0 ? `
        <div style="text-align:center;padding:40px 20px;color:var(--text3)">
          <i data-lucide="inbox" style="width:36px;height:36px;opacity:0.3;margin-bottom:8px"></i>
          <div style="font-size:13px">Nenhum lançamento em lote detectado.</div>
          <div style="font-size:11px;margin-top:6px;opacity:0.7">Os contatos atuais foram adicionados individualmente.</div>
        </div>
      ` : `
        <div class="ctc-imports-list">
          ${imports.map((imp, idx) => {
            const date = new Date(imp.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            return `<div class="ctc-import-batch">
              <div class="ctc-import-batch-info">
                <div class="ctc-import-batch-head">
                  <strong>Lançamento ${imports.length - idx}</strong>
                  <span class="ctc-import-batch-count">${imp.count} contato${imp.count === 1 ? '' : 's'}</span>
                </div>
                <div class="ctc-import-batch-meta">
                  <i data-lucide="clock" style="width:11px;height:11px"></i> ${dateStr} às ${timeStr}
                </div>
                <div class="ctc-import-batch-names">
                  ${imp.sampleNames.map(n => _esc(n)).join(' · ')}${imp.count > 4 ? ` · +${imp.count - 4}` : ''}
                </div>
              </div>
              <button class="btn btn-danger" onclick="window._ctcDeleteImport('${imp.createdAt}')">
                <i data-lucide="trash-2"></i> Excluir
              </button>
            </div>`;
          }).join('')}
        </div>
      `}
    `;
    openModal('Lançamentos de contatos', body, `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);
    lucide.createIcons();
  };

  window._ctcDeleteImport = async (createdAt) => {
    const imports = _detectImports();
    const batch = imports.find(i => i.createdAt === createdAt);
    if (!batch) return;
    if (!confirm(`Excluir este lançamento?\n\n${batch.count} contato${batch.count === 1 ? '' : 's'} (${batch.sampleNames.slice(0,3).join(', ')}${batch.count > 3 ? ' e mais ' + (batch.count - 3) : ''}) serão removidos. Essa ação não pode ser desfeita.`)) return;
    try {
      const client = window.sb.schema('crm');
      const { error } = await client.from('contacts').delete().eq('created_at', createdAt);
      if (error) throw error;
      // Atualiza STATE local
      STATE.crm.contacts = (STATE.crm.contacts || []).filter(c => c.created_at !== createdAt);
      closeModal();
      _renderList();
      toast(`${batch.count} contato${batch.count === 1 ? '' : 's'} excluído${batch.count === 1 ? '' : 's'} do lançamento`, 's');
    } catch (e) {
      toast('Erro ao excluir lançamento: ' + (e.message || 'desconhecido'), 'e');
    }
  };

  // ── BULK IMPORT ────────────────────────────────────────────
  window._ctcOpenImport = () => {
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:14px;line-height:1.6">
        Cola abaixo <strong>nome e Instagram</strong> (um contato por linha).
        Pode colar direto de planilha ou carregar CSV.
      </div>

      <div class="ctc-import-formats">
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">Simples (nome + insta)</div>
          <code>João Silva, @joaosilva<br>Maria Santos, @mariafit</code>
        </div>
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">Com Tier</div>
          <code>João Silva, @joaosilva, 1<br>Maria, @maria, 2<br>Pedro, @pedro, 3</code>
        </div>
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">CSV com cabeçalho</div>
          <code>Nome, Instagram, Tier<br>João, @joao, 1<br>Maria, @maria, 2</code>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text3);margin:14px 0 8px;line-height:1.5">
        Separador: <strong>vírgula</strong>, <strong>ponto-e-vírgula</strong> ou <strong>tab</strong>.
        Colunas aceitas no cabeçalho: <strong>nome, instagram, tier, email, telefone, empresa, perfil, obs</strong>.
        Tier aceita 1-5. Links <code>https://instagram.com/user?stkn=...</code> são automaticamente normalizados.
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <label style="font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.4px">Lista</label>
        <input type="file" id="ctc-import-file" accept=".csv,.txt,.tsv,text/csv,text/plain,text/tab-separated-values"
          style="display:none" onchange="window._ctcImportFile(event)">
        <button class="btn btn-outline" style="padding:5px 10px;font-size:11px"
          onclick="document.getElementById('ctc-import-file').click()">
          <i data-lucide="file-up" style="width:12px;height:12px"></i> Carregar CSV / TXT
        </button>
      </div>
      <textarea id="ctc-import-text" class="fi" rows="10"
        placeholder="João Silva, @joaosilva&#10;Maria Santos, @mariafit&#10;Pedro Costa, @pedro.oficial"
        style="width:100%;font-family:'SF Mono',Menlo,monospace;font-size:12px"
        oninput="window._ctcImportPreview()"></textarea>

      <div id="ctc-import-preview" class="ctc-import-preview">
        <div style="color:var(--text3);font-size:12px;text-align:center;padding:10px">Cola uma lista acima pra ver o preview.</div>
      </div>
    `;

    openModal('Importar contatos em lote', body, `
      <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" id="ctc-import-btn" onclick="window._ctcDoImport()" disabled>
        <i data-lucide="upload"></i> Importar
      </button>
    `);
    lucide.createIcons();
  };

  // Carrega arquivo CSV/TXT para o textarea
  window._ctcImportFile = (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      let text = String(e.target.result || '');
      // Se tiver header (primeira linha com palavras-chave como "nome","email"),
      // remove para não contar como contato
      const firstLine = text.split(/\r?\n/)[0]?.toLowerCase() || '';
      const looksLikeHeader = /^(nome|name|email|instagram|telefone|phone|empresa|company)[,;\t]/i.test(firstLine)
        || (firstLine.includes('nome') && (firstLine.includes('email') || firstLine.includes('instagram') || firstLine.includes('telefone')));
      if (looksLikeHeader) {
        text = text.split(/\r?\n/).slice(1).join('\n');
        toast('Cabeçalho detectado e removido', 's');
      } else {
        toast(`Arquivo "${file.name}" carregado`, 's');
      }
      const ta = document.getElementById('ctc-import-text');
      if (ta) {
        ta.value = text.trim();
        _ctcImportPreview();
      }
      // Reset file input para permitir recarregar o mesmo arquivo
      ev.target.value = '';
    };
    reader.onerror = () => toast('Erro ao ler o arquivo', 'e');
    reader.readAsText(file, 'UTF-8');
  };

  // Auto-detecta o tipo de cada célula (email, instagram, telefone, empresa)
  function _detectCellType(val) {
    const v = (val || '').trim();
    if (!v) return { type: 'empty' };

    // Instagram: @handle, instagram.com/handle, ig/handle
    const igMatch = v.match(/(?:^@|instagram\.com\/|ig\/)([a-zA-Z0-9._]+)/i);
    if (igMatch) return { type: 'instagram', value: igMatch[1].replace(/^@/, '') };
    if (/^@[a-zA-Z0-9._]+$/.test(v)) return { type: 'instagram', value: v.replace(/^@/, '') };

    // Email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return { type: 'email', value: v.toLowerCase() };

    // Telefone: só dígitos, espaços, parênteses, hífens, +. Pelo menos 8 dígitos.
    const digits = v.replace(/\D/g, '');
    if (/^[\d\s()+\-.]+$/.test(v) && digits.length >= 8) return { type: 'phone', value: v };

    // Qualquer outra coisa → empresa (ou extra)
    return { type: 'company', value: v };
  }

  // Detecta separador na linha
  function _detectSep(line) {
    if (line.includes('\t')) return '\t';
    if (line.includes(';')) return ';';
    if (line.includes(',')) return ',';
    return null;
  }

  // Mapeia nomes de coluna comuns → campos do nosso modelo
  function _mapHeader(header) {
    const h = header.toLowerCase().trim();
    if (/^(nome|name|tipster|contato|contact)\b/i.test(h) || h.includes(' nome')) return 'name';
    if (/instagram|insta|@|ig|handle/i.test(h)) return 'instagram';
    if (/^(e[\s-]?mail)$/i.test(h) || h === 'email') return 'email';
    if (/telefone|celular|phone|whatsapp|wpp|tel/i.test(h)) return 'phone';
    if (/empresa|company|org/i.test(h)) return 'company';
    if (/tier|nivel|level|prioridade/i.test(h)) return 'tier';
    if (/perfil|profile|categoria|category/i.test(h)) return 'profile';
    if (/rede|network/i.test(h)) return '_skip';         // ignorar
    if (/status|situa/i.test(h)) return '_skip';
    if (/deal|contrato|acordo/i.test(h)) return '_skip';
    if (/obs|observa|notes|notas/i.test(h)) return 'notes';
    return null;  // não reconhecido → fallback pra auto-detect
  }

  // Detecta se a linha é cabeçalho (contém palavras-chave e nenhum @)
  function _isHeaderLine(line) {
    const l = line.toLowerCase();
    const hasKeyword = /\b(nome|name|instagram|insta|tipster|email|tier|perfil|telefone)\b/i.test(l);
    const hasAt = l.includes('@');
    const hasHttp = l.includes('http');
    return hasKeyword && !hasAt && !hasHttp;
  }

  // Parse: detecta separador, header, e normaliza colunas
  function _parseImportText(txt) {
    const rawLines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const results = [];
    const errors = [];
    const seen = new Set();

    if (!rawLines.length) return { results, errors };

    // Detecta se tem header
    const firstLine = rawLines[0];
    const sep = _detectSep(firstLine) || ',';
    const hasHeader = _isHeaderLine(firstLine);
    let headerMap = null;

    if (hasHeader) {
      const cols = firstLine.split(sep).map(c => c.trim());
      headerMap = cols.map(_mapHeader);
    }
    const dataLines = hasHeader ? rawLines.slice(1) : rawLines;

    dataLines.forEach((line, idx) => {
      const parts = line.split(sep).map(p => p.trim());
      const row = { name: '', email: null, company: null, phone: null, instagram: null, tier: null, profile: null, notes: null };

      if (headerMap) {
        // Mapeamento por posição do header
        parts.forEach((val, i) => {
          const field = headerMap[i];
          if (!field || field === '_skip' || !val) return;
          if (field === 'instagram') row.instagram = _normalizeIgHandle(val);
          else if (field === 'tier') {
            const n = parseInt(val, 10);
            if (n >= 1 && n <= 5) row.tier = n;
          }
          else if (field === 'profile') {
            // tenta casar com perfis conhecidos
            const match = PROFILES.find(p => val.toLowerCase().includes(p.id) || val.toLowerCase().includes(p.label.toLowerCase()));
            if (match) row.profile = match.id;
          }
          else row[field] = val;
        });
        // Se name não veio mapeado, usa a 1ª célula não vazia
        if (!row.name && parts[0]) row.name = parts[0];
      } else {
        // Fallback: 1ª coluna = nome, resto auto-detectado
        row.name = (parts[0] || '').trim();
        for (let i = 1; i < parts.length; i++) {
          const val = parts[i];
          if (!val) continue;
          // Tier isolado: dígito único 1-5
          if (/^[1-5]$/.test(val) && !row.tier) { row.tier = Number(val); continue; }
          const det = _detectCellType(val);
          if (det.type === 'empty') continue;
          if (det.type === 'instagram' && !row.instagram) row.instagram = det.value;
          else if (det.type === 'email' && !row.email) row.email = det.value;
          else if (det.type === 'phone' && !row.phone) row.phone = det.value;
          else if (det.type === 'company' && !row.company) row.company = det.value;
        }
      }

      if (!row.name) { errors.push({ line: idx + 1 + (hasHeader ? 1 : 0), msg: 'nome vazio' }); return; }

      // Dedupe por nome + instagram
      const key = `${row.name.toLowerCase()}|${(row.instagram || '').toLowerCase()}`;
      if (seen.has(key)) {
        errors.push({ line: idx + 1 + (hasHeader ? 1 : 0), name: row.name, msg: 'duplicado nesta importação' });
        return;
      }
      seen.add(key);
      results.push(row);
    });

    return { results, errors, hasHeader };
  }

  window._ctcImportPreview = () => {
    const txt = document.getElementById('ctc-import-text')?.value || '';
    const previewEl = document.getElementById('ctc-import-preview');
    const btn = document.getElementById('ctc-import-btn');
    if (!previewEl || !btn) return;

    if (!txt.trim()) {
      previewEl.innerHTML = `<div style="color:var(--text3);font-size:12px;text-align:center;padding:10px">Cola uma lista acima pra ver o preview.</div>`;
      btn.disabled = true;
      return;
    }

    const { results, errors } = _parseImportText(txt);
    btn.disabled = results.length === 0;

    const existingNames = new Set((STATE.crm?.contacts || []).map(c => (c.name || '').toLowerCase()));
    const existingEmails = new Set((STATE.crm?.contacts || []).map(c => (c.email || '').toLowerCase()).filter(Boolean));
    const duplicates = results.filter(r =>
      existingNames.has(r.name.toLowerCase()) || (r.email && existingEmails.has(r.email.toLowerCase()))
    );

    previewEl.innerHTML = `
      <div class="ctc-import-stats">
        <div class="ctc-import-stat">
          <div class="ctc-import-stat-v" style="color:var(--green)">${results.length - duplicates.length}</div>
          <div class="ctc-import-stat-k">Novos</div>
        </div>
        <div class="ctc-import-stat">
          <div class="ctc-import-stat-v" style="color:var(--amber)">${duplicates.length}</div>
          <div class="ctc-import-stat-k">Já existem</div>
        </div>
        <div class="ctc-import-stat">
          <div class="ctc-import-stat-v" style="color:var(--red)">${errors.length}</div>
          <div class="ctc-import-stat-k">Erros</div>
        </div>
      </div>
      ${results.length > 0 ? `
        <div style="font-size:11px;color:var(--text3);margin:12px 0 4px">Preview dos 5 primeiros:</div>
        <div class="ctc-import-list">
          ${results.slice(0, 5).map(r => `
            <div class="ctc-import-row">
              <strong>${_esc(r.name)}</strong>
              ${r.tier ? `<span class="ctc-tile-tier" style="--tier-c:${TIER_BY_ID[r.tier]?.color || '#64748b'};position:relative;top:0;right:0;margin:0 2px 0 4px">T${r.tier}</span>` : ''}
              ${r.instagram ? `<span class="ctc-import-ig">@${_esc(r.instagram)}</span>` : ''}
              ${r.email ? `<span>· ${_esc(r.email)}</span>` : ''}
              ${r.company ? `<span>· ${_esc(r.company)}</span>` : ''}
              ${r.phone ? `<span>· ${_esc(r.phone)}</span>` : ''}
              ${existingNames.has(r.name.toLowerCase()) ? `<span class="ctc-import-dup">já existe</span>` : ''}
            </div>
          `).join('')}
          ${results.length > 5 ? `<div style="color:var(--text3);font-size:11px;text-align:center;padding:4px">+ ${results.length - 5} outros</div>` : ''}
        </div>
      ` : ''}
      ${errors.length > 0 ? `
        <div style="font-size:11px;color:var(--text3);margin:12px 0 4px">Problemas:</div>
        <div class="ctc-import-list">
          ${errors.slice(0, 4).map(e => `
            <div class="ctc-import-row" style="color:var(--red)">
              Linha ${e.line}: ${e.msg}
            </div>
          `).join('')}
          ${errors.length > 4 ? `<div style="color:var(--text3);font-size:11px;text-align:center;padding:4px">+ ${errors.length - 4} outros</div>` : ''}
        </div>
      ` : ''}
    `;
  };

  window._ctcDoImport = async () => {
    const txt = document.getElementById('ctc-import-text')?.value || '';
    const btn = document.getElementById('ctc-import-btn');

    const { results } = _parseImportText(txt);
    if (!results.length) { toast('Nada para importar', 'w'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Importando...';
    lucide.createIcons();

    const existingNames = new Set((STATE.crm?.contacts || []).map(c => (c.name || '').toLowerCase()));
    const existingIgs = new Set((STATE.crm?.contacts || []).map(c => (c.social_links?.instagram || '').toLowerCase()).filter(Boolean));
    const toInsert = results.filter(r =>
      !existingNames.has(r.name.toLowerCase()) && !(r.instagram && existingIgs.has(r.instagram.toLowerCase()))
    ).map(r => {
      const social_links = r.instagram ? { instagram: r.instagram } : {};
      const payload = {
        name: r.name,
        social_links,
        type: 'b2c',
        source: 'outbound',
        status: 'wishlist',
      };
      if (r.email) payload.email = r.email;
      if (r.phone) payload.phone = r.phone;
      if (r.company) payload.company = r.company;
      if (r.tier) payload.tier = r.tier;
      if (r.profile) payload.profile = r.profile;
      if (r.notes) payload.notes = r.notes;
      return payload;
    });

    if (!toInsert.length) {
      closeModal();
      toast('Todos já existem — nada foi importado', 'w');
      return;
    }

    try {
      // Usa o cliente principal `sb` com .schema('crm') — garante que a sessão
      // de auth do usuário logado está presente (RLS exige authenticated).
      const client = window.sb.schema('crm');
      const chunkSize = 100;
      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { data, error } = await client.from('contacts').insert(chunk).select();
        if (error) throw error;
        if (data) {
          STATE.crm.contacts.unshift(...data);
          inserted += data.length;
        }
      }
      closeModal();
      _renderList();
      toast(`${inserted} contato${inserted === 1 ? '' : 's'} importado${inserted === 1 ? '' : 's'} com sucesso`, 's');
    } catch (e) {
      console.error('[import]', e);
      btn.disabled = false;
      btn.innerHTML = '<i data-lucide="upload"></i> Importar';
      lucide.createIcons();
      toast('Erro na importação: ' + (e.message || 'desconhecido'), 'e');
    }
  };

// ── HELPERS ───────────────────────────────────────────────
  function _esc(s) {
    return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // Monta HTML do avatar: avatar_url manual > iniciais em gradiente determinístico
  // (Removemos a tentativa automática de puxar foto do Instagram — a Meta
  // bloqueia scraping cada vez mais, não valia a inconsistência visual.)
  function _avatarHTML(c, hue, initials) {
    if (c.avatar_url) {
      return `<img class="ctc-tile-av" src="${_esc(c.avatar_url)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'ctc-tile-av',innerHTML:'${initials}',style:'background:linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue+40)%360},70%,45%))'}))">`;
    }
    return `<div class="ctc-tile-av" style="background:linear-gradient(135deg, hsl(${hue},65%,55%), hsl(${(hue+40)%360},70%,45%))">${initials}</div>`;
  }

  // ── PDF EXPORT ─────────────────────────────────────────────
  // Builds an interactive, nicely-typeset PDF of the current filtered list.
  // Clickable email / tel / Instagram / website links, per-tier sections,
  // and a one-click table of contents. PDFMake is lazy-loaded on first use
  // so it doesn't bloat the initial page load.
  const PDFMAKE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/pdfmake.min.js';
  const PDFMAKE_FONTS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/vfs_fonts.js';
  let _pdfmakePromise = null;
  function _loadPdfMake() {
    if (window.pdfMake) return Promise.resolve(window.pdfMake);
    if (_pdfmakePromise) return _pdfmakePromise;
    const load = (src) => new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar ' + src));
      document.head.appendChild(s);
    });
    _pdfmakePromise = load(PDFMAKE_CDN).then(() => load(PDFMAKE_FONTS_CDN)).then(() => window.pdfMake);
    return _pdfmakePromise;
  }

  function _initialsFor(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function _hueFor(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffff;
    return Math.abs(h) % 360;
  }
  function _hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1))))).toString(16).padStart(2, '0');
    return `#${f(0)}${f(8)}${f(4)}`;
  }
  function _makeAvatarPng(initials, hue, size = 96) {
    try {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      const ctx = c.getContext('2d');
      // Linear gradient similar to the UI tile avatars
      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, _hslToHex(hue, 65, 55));
      grad.addColorStop(1, _hslToHex((hue + 40) % 360, 70, 45));
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${Math.round(size * 0.38)}px -apple-system, Helvetica, Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, size / 2, size / 2 + 2);
      return c.toDataURL('image/png');
    } catch (_) { return null; }
  }

  function _normalizeURL(u) {
    if (!u) return '';
    const s = String(u).trim();
    if (!s) return '';
    return /^https?:\/\//i.test(s) ? s : `https://${s}`;
  }

  function _plainIg(c) {
    const raw = c.social_links?.instagram || '';
    return _normalizeIgHandle(raw) || '';
  }

  function _groupByTier(list) {
    const buckets = { 1: [], 2: [], 3: [], 0: [] };
    list.forEach(c => {
      const t = Number(c.tier);
      if (t === 1 || t === 2 || t === 3) buckets[t].push(c);
      else buckets[0].push(c);
    });
    Object.values(buckets).forEach(arr => arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'pt-BR')));
    return buckets;
  }

  function _summaryCounts(list) {
    const by = (k, vals) => Object.fromEntries(vals.map(v => [v, 0]));
    const counts = {
      type: by('type', ['b2b', 'b2c', 'both']),
      status: by('status', ['wishlist', 'in_pipeline', 'customer', 'churned']),
      tier: by('tier', [1, 2, 3, 0]),
      profile: by('profile', PROFILES.map(p => p.id).concat(['none'])),
    };
    list.forEach(c => {
      if (counts.type[c.type] !== undefined) counts.type[c.type]++;
      if (counts.status[c.status] !== undefined) counts.status[c.status]++;
      const t = Number(c.tier);
      if ([1, 2, 3].includes(t)) counts.tier[t]++; else counts.tier[0]++;
      if (c.profile && counts.profile[c.profile] !== undefined) counts.profile[c.profile]++;
      else if (!c.profile) counts.profile.none++;
    });
    return counts;
  }

  // Colors tuned for both light reading and nice contrast with white bg
  const C = {
    ink:   '#0f172a', // slate-900
    muted: '#64748b', // slate-500
    soft:  '#94a3b8', // slate-400
    line:  '#e2e8f0', // slate-200
    bg:    '#f8fafc', // slate-50
    brand: '#111827',
    accent:'#ec4899',
  };
  const TIER_COLOR = { 1: '#ec4899', 2: '#f59e0b', 3: '#64748b', 0: '#94a3b8' };
  const STATUS_COLOR = { wishlist: '#64748b', in_pipeline: '#3b82f6', customer: '#10b981', churned: '#ef4444' };
  const TYPE_COLOR = { b2b: '#6366f1', b2c: '#ec4899', both: '#8b5cf6' };

  function _badge(text, fill) {
    return {
      table: { body: [[{ text, color: '#ffffff', fontSize: 8, bold: true, alignment: 'center' }]] },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingTop: () => 2, paddingBottom: () => 2,
        paddingLeft: () => 6, paddingRight: () => 6,
        fillColor: () => fill,
      },
    };
  }

  function _buildContactBlock(c, { avatarPng }) {
    const tierId = [1, 2, 3].includes(Number(c.tier)) ? Number(c.tier) : 0;
    const ig = _plainIg(c);
    const headerBadges = [];
    if (c.type && TYPE_LABEL[c.type]) headerBadges.push(_badge(TYPE_LABEL[c.type], TYPE_COLOR[c.type] || '#6b7280'));
    if (tierId > 0) headerBadges.push(_badge('T' + tierId, TIER_COLOR[tierId]));
    if (c.status && STATUS_LABEL[c.status]) headerBadges.push(_badge(STATUS_LABEL[c.status], STATUS_COLOR[c.status] || '#6b7280'));

    const infoRows = [];
    const push = (label, value) => { if (value) infoRows.push([{ text: label, color: C.muted, fontSize: 9 }, value]); };

    if (c.company) push('Empresa', { text: c.company, color: C.ink, fontSize: 10 });
    if (c.email) push('Email', { text: c.email, color: '#1d4ed8', fontSize: 10, link: `mailto:${c.email}`, decoration: 'underline' });
    if (c.phone) {
      const digits = String(c.phone).replace(/[^\d+]/g, '');
      push('Telefone', { text: c.phone, color: '#1d4ed8', fontSize: 10, link: `tel:${digits}`, decoration: 'underline' });
    }
    if (ig) push('Instagram', { text: '@' + ig, color: '#1d4ed8', fontSize: 10, link: `https://instagram.com/${ig}`, decoration: 'underline' });
    if (c.website) {
      const url = _normalizeURL(c.website);
      push('Website', { text: c.website, color: '#1d4ed8', fontSize: 10, link: url, decoration: 'underline' });
    }
    const profileLabel = c.profile ? (PROFILE_BY_ID[c.profile]?.label || c.profile) : null;
    if (profileLabel) push('Perfil', { text: profileLabel, color: C.ink, fontSize: 10 });
    if (c.source && SOURCE_LABEL[c.source]) push('Origem', { text: SOURCE_LABEL[c.source], color: C.ink, fontSize: 10 });

    const infoTable = infoRows.length ? {
      table: { widths: [55, '*'], body: infoRows },
      layout: {
        hLineWidth: () => 0, vLineWidth: () => 0,
        paddingTop: () => 2, paddingBottom: () => 2, paddingLeft: () => 0, paddingRight: () => 0,
      },
      margin: [0, 4, 0, 0],
    } : null;

    const notes = c.notes ? {
      text: c.notes, italics: true, color: C.muted, fontSize: 9,
      margin: [0, 6, 0, 0],
    } : null;

    const leftCol = avatarPng
      ? { image: avatarPng, width: 44, height: 44, margin: [0, 2, 0, 0] }
      : { text: _initialsFor(c.name), fontSize: 16, bold: true, color: C.ink, alignment: 'center', margin: [0, 10, 0, 0] };

    const rightChildren = [
      { text: c.name || '(sem nome)', fontSize: 13, bold: true, color: C.ink },
    ];
    if (headerBadges.length) {
      rightChildren.push({ columns: headerBadges.map(b => ({ width: 'auto', ...b })), columnGap: 4, margin: [0, 3, 0, 0] });
    }
    if (infoTable) rightChildren.push(infoTable);
    if (notes) rightChildren.push(notes);

    return {
      // Card: thin separator + columns [avatar | details]
      stack: [
        {
          columns: [
            { width: 48, stack: [leftCol] },
            { width: '*', stack: rightChildren, margin: [10, 0, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 2, x2: 515, y2: 2, lineWidth: 0.4, lineColor: C.line }], margin: [0, 10, 0, 10] },
      ],
      unbreakable: true,
    };
  }

  function _summaryBlock(counts, total) {
    const row = (label, items) => ({
      stack: [
        { text: label.toUpperCase(), fontSize: 9, color: C.muted, bold: true, characterSpacing: 1.2, margin: [0, 10, 0, 4] },
        {
          columns: items.map(([lbl, n, color]) => ({
            width: '*',
            stack: [
              { text: String(n), fontSize: 20, bold: true, color: color || C.ink },
              { text: lbl, fontSize: 9, color: C.muted, margin: [0, -2, 0, 0] },
            ],
          })),
          columnGap: 10,
        },
      ],
      margin: [0, 0, 0, 6],
    });

    return {
      stack: [
        row('Por tipo', [
          ['B2B', counts.type.b2b, TYPE_COLOR.b2b],
          ['B2C', counts.type.b2c, TYPE_COLOR.b2c],
          ['B2B + B2C', counts.type.both, TYPE_COLOR.both],
        ]),
        row('Por tier', [
          ['Tier 1', counts.tier[1], TIER_COLOR[1]],
          ['Tier 2', counts.tier[2], TIER_COLOR[2]],
          ['Tier 3', counts.tier[3], TIER_COLOR[3]],
          ['Sem tier', counts.tier[0], TIER_COLOR[0]],
        ]),
        row('Por status', [
          ['Wishlist', counts.status.wishlist, STATUS_COLOR.wishlist],
          ['No pipeline', counts.status.in_pipeline, STATUS_COLOR.in_pipeline],
          ['Clientes', counts.status.customer, STATUS_COLOR.customer],
          ['Perdidos', counts.status.churned, STATUS_COLOR.churned],
        ]),
        row('Por perfil', PROFILES.map(p => [p.label, counts.profile[p.id] || 0, p.color])
          .concat([['Sem perfil', counts.profile.none || 0, C.soft]])),
      ],
    };
  }

  function _coverPage(total, filtersSummary, userName) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    return {
      stack: [
        { text: ' ', margin: [0, 60, 0, 0] },
        { text: '3cos', fontSize: 32, bold: true, color: C.ink, characterSpacing: -1 },
        { text: 'CRM Comercial', fontSize: 11, color: C.muted, margin: [0, -4, 0, 40] },
        { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 80, y2: 0, lineWidth: 2, lineColor: C.accent }], margin: [0, 0, 0, 20] },
        { text: 'Lista de contatos', fontSize: 28, bold: true, color: C.ink, characterSpacing: -0.5 },
        { text: filtersSummary || 'Todos os contatos da base', fontSize: 12, color: C.muted, margin: [0, 6, 0, 30] },
        {
          columns: [
            { stack: [
              { text: 'TOTAL', fontSize: 9, color: C.muted, characterSpacing: 1.2, bold: true },
              { text: String(total), fontSize: 48, bold: true, color: C.accent, margin: [0, -4, 0, 0] },
              { text: total === 1 ? 'contato' : 'contatos', fontSize: 10, color: C.muted, margin: [0, -8, 0, 0] },
            ], width: '*' },
            { stack: [
              { text: 'GERADO EM', fontSize: 9, color: C.muted, characterSpacing: 1.2, bold: true, alignment: 'right' },
              { text: dateStr, fontSize: 14, color: C.ink, margin: [0, 4, 0, 0], alignment: 'right' },
              userName ? { text: 'por ' + userName, fontSize: 10, color: C.muted, margin: [0, 2, 0, 0], alignment: 'right' } : {},
            ], width: '*' },
          ],
        },
        { text: ' ', pageBreak: 'after' },
      ],
    };
  }

  window._ctcExportPDF = async () => {
    const list = _computeList();
    if (!list.length) { toast('Nenhum contato pra exportar com os filtros atuais', 'i'); return; }

    const btn = document.querySelector('button[onclick="window._ctcExportPDF()"]');
    const origHTML = btn?.innerHTML;
    if (btn) { btn.disabled = true; btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i> Gerando...'; if (window.lucide) lucide.createIcons(); }

    try {
      await _loadPdfMake();

      // Summary of active filters, for the cover subtitle
      const bits = [];
      if (F.type) bits.push('Tipo: ' + (TYPE_LABEL[F.type] || F.type));
      if (F.profile === '__none__') bits.push('Perfil: sem perfil');
      else if (F.profile) bits.push('Perfil: ' + (PROFILE_BY_ID[F.profile]?.label || F.profile));
      if (F.tier) bits.push('Tier: T' + F.tier);
      if (F.status) bits.push('Status: ' + (STATUS_LABEL[F.status] || F.status));
      if (F.search) bits.push(`Busca: "${F.search}"`);
      const filtersSummary = bits.length ? bits.join(' · ') : 'Todos os contatos da base';

      const counts = _summaryCounts(list);
      const grouped = _groupByTier(list);
      const userName = STATE?.user?.name || '';

      // Pre-render avatars once per contact (canvas → data URL)
      const avatarCache = new Map();
      list.forEach(c => {
        const key = c.id || c.email || c.name;
        if (avatarCache.has(key)) return;
        if (c.avatar_url) { avatarCache.set(key, null); return; } // keep it simple — remote images need async load; use initials instead
        const png = _makeAvatarPng(_initialsFor(c.name), _hueFor(c.name || ''), 96);
        avatarCache.set(key, png);
      });

      // Build content
      const content = [];
      content.push(_coverPage(list.length, filtersSummary, userName));

      // Summary page
      content.push({ text: 'Resumo da base', fontSize: 20, bold: true, color: C.ink, margin: [0, 10, 0, 0] });
      content.push({ text: 'Panorama dos contatos exportados', fontSize: 11, color: C.muted, margin: [0, 2, 0, 16] });
      content.push(_summaryBlock(counts, list.length));
      content.push({ text: ' ', pageBreak: 'after' });

      // Table of contents (groups → clickable TOC)
      content.push({ text: 'Sumário', fontSize: 20, bold: true, color: C.ink, margin: [0, 10, 0, 16] });
      content.push({
        toc: {
          numberStyle: { color: C.muted, fontSize: 10 },
          textStyle: { color: C.ink, fontSize: 11 },
        },
      });
      content.push({ text: ' ', pageBreak: 'after' });

      // Sections per tier
      const tierOrder = [1, 2, 3, 0];
      tierOrder.forEach((tid, idx) => {
        const bucket = grouped[tid];
        if (!bucket.length) return;
        const title = tid === 0 ? 'Sem tier definido' : `Tier ${tid}`;
        const sub = tid === 0 ? 'Contatos sem prioridade atribuída' : (TIERS.find(t => t.id === tid)?.desc || '');
        const color = TIER_COLOR[tid];

        content.push({
          stack: [
            { canvas: [{ type: 'rect', x: 0, y: 0, w: 4, h: 24, color }], relativePosition: { x: 0, y: 0 } },
            { text: title, fontSize: 20, bold: true, color: C.ink, margin: [12, 0, 0, 0] },
            { text: `${bucket.length} ${bucket.length === 1 ? 'contato' : 'contatos'} · ${sub}`, fontSize: 10, color: C.muted, margin: [12, 2, 0, 14] },
          ],
          tocItem: true, tocStyle: { bold: true },
          margin: [0, idx === 0 ? 0 : 6, 0, 0],
        });

        bucket.forEach(c => {
          const key = c.id || c.email || c.name;
          const avatarPng = avatarCache.get(key);
          content.push(_buildContactBlock(c, { avatarPng }));
        });

        content.push({ text: ' ', pageBreak: 'after' });
      });

      const docDefinition = {
        info: {
          title: 'Lista de contatos — 3cos',
          author: userName || '3cos',
          subject: filtersSummary,
          creator: '3cos CRM',
        },
        pageSize: 'A4',
        pageMargins: [40, 50, 40, 50],
        defaultStyle: { font: 'Roboto', color: C.ink },
        content,
        footer: (currentPage, pageCount) => currentPage > 1 ? {
          columns: [
            { text: '3cos · Lista de contatos', fontSize: 8, color: C.soft, margin: [40, 0, 0, 0] },
            { text: `${currentPage} / ${pageCount}`, fontSize: 8, color: C.soft, alignment: 'right', margin: [0, 0, 40, 0] },
          ],
        } : null,
      };

      const fname = `3cos-contatos-${new Date().toISOString().slice(0, 10)}.pdf`;
      pdfMake.createPdf(docDefinition).download(fname);
      toast(`PDF gerado (${list.length} contatos)`, 's');
    } catch (e) {
      console.error('[ctc export pdf]', e);
      toast('Erro ao gerar PDF: ' + (e.message || 'desconhecido'), 'e');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = origHTML; if (window.lucide) lucide.createIcons(); }
    }
  };
})();
