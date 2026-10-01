// ══════════════════════════════════════════════════════════
// CRM — CONTATOS (Wishlist + Prospects + Clientes)
// ══════════════════════════════════════════════════════════
// Módulo central da frente comercial. Lista todos os contatos do schema
// `crm.contacts` com filtros múltiplos (status, tipo, temperatura, tag,
// produto). Permite CRUD + promover contato para Pipeline B2B/B2C.
// ══════════════════════════════════════════════════════════

(function () {
  // Filtros ativos (compartilhados pelo módulo)
  let F = { search: '', status: null, type: null, tag: null, product: null };

  const STATUS_LABEL = { wishlist: 'Wishlist', in_pipeline: 'No pipeline', customer: 'Cliente', churned: 'Perdido' };
  const TYPE_LABEL = { b2b: 'B2B', b2c: 'B2C', both: 'B2B+B2C' };
  const SOURCE_LABEL = { inbound: 'Inbound', outbound: 'Outbound', referral: 'Indicação', event: 'Evento', social: 'Redes sociais', other: 'Outro' };

  // ── MOUNT ─────────────────────────────────────────────────
  async function bContacts(el) {
    el.innerHTML = modHdr('Contatos — Wishlist & CRM') + `<div class="mod-body">
      ${heroHTML('contacts', 'CRM Comercial', 'Contatos', 'Wishlist, prospects e clientes do portfolio')}
      <div class="mod-main">
        <div class="sec-hdr">
          <div class="sec-lbl">Todos os contatos</div>
          <div class="sec-actions">
            <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar nome, email, empresa..." oninput="window._ctcSearch(this.value)"></div>
            <button class="btn btn-outline" onclick="window._ctcManageTags()"><i data-lucide="tags"></i> Tags</button>
            <button class="btn btn-outline" onclick="window._ctcOpenImport()"><i data-lucide="upload"></i> Importar</button>
            <button class="btn btn-theme" onclick="window._ctcOpenNew()"><i data-lucide="plus"></i> Novo contato</button>
          </div>
        </div>

        <div class="ctc-filters" id="ctc-filters-wrap">
          <div class="ctc-filter-group">
            <span class="ctc-filter-lbl">Status</span>
            <button class="pill on" data-f="status" data-v="" onclick="window._ctcFilter(this)">Todos</button>
            <button class="pill" data-f="status" data-v="wishlist" onclick="window._ctcFilter(this)">Wishlist</button>
            <button class="pill" data-f="status" data-v="in_pipeline" onclick="window._ctcFilter(this)">No pipeline</button>
            <button class="pill" data-f="status" data-v="customer" onclick="window._ctcFilter(this)">Clientes</button>
            <button class="pill" data-f="status" data-v="churned" onclick="window._ctcFilter(this)">Perdidos</button>
          </div>
          <div class="ctc-filter-group">
            <span class="ctc-filter-lbl">Tipo</span>
            <button class="pill on" data-f="type" data-v="" onclick="window._ctcFilter(this)">Todos</button>
            <button class="pill" data-f="type" data-v="b2b" onclick="window._ctcFilter(this)">B2B</button>
            <button class="pill" data-f="type" data-v="b2c" onclick="window._ctcFilter(this)">B2C</button>
            <button class="pill" data-f="type" data-v="both" onclick="window._ctcFilter(this)">Ambos</button>
          </div>
          <div class="ctc-filter-group" id="ctc-tag-filter-group" style="display:none"></div>
          <div class="ctc-filter-group" id="ctc-product-filter-group" style="display:none"></div>
        </div>

        <div class="ctc-counts" id="ctc-counts"></div>
        <div class="ctc-list" id="ctc-list"></div>
      </div></div>`;

    // Precisa carregar os dados CRM se ainda não foram
    if (!STATE.crm.loaded && window.CRM?.loadAll) {
      _renderLoading();
      const ok = await CRM.loadAll();
      if (!ok) { _renderError('Não foi possível carregar os dados. Verifique se o schema `crm` está exposto na API do Supabase.'); return; }
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
    if (countsEl) countsEl.textContent = `${list.length} de ${STATE.crm.contacts.length} contato${STATE.crm.contacts.length === 1 ? '' : 's'}`;

    if (!list.length) {
      el.innerHTML = `<div class="empty"><i data-lucide="user-plus"></i><p>Nenhum contato com esses filtros</p>
        <button class="btn btn-theme" onclick="window._ctcOpenNew()" style="margin-top:12px"><i data-lucide="plus"></i> Adicionar primeiro contato</button></div>`;
      lucide.createIcons();
      return;
    }

    el.innerHTML = list.map(c => {
      const initials = (c.name || '?').split(' ').filter(Boolean).slice(0, 2).map(s => s[0]).join('').toUpperCase();
      // Hash → cor determinística do avatar
      let h = 0; for (let i = 0; i < (c.name || '').length; i++) h = (h * 31 + c.name.charCodeAt(i)) | 0;
      const hue = Math.abs(h) % 360;
      const avatar = c.avatar_url
        ? `<img class="ctc-av" src="${c.avatar_url}" alt="">`
        : `<span class="ctc-av" style="background:hsl(${hue},60%,45%);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px">${initials}</span>`;
      const ig = c.social_links?.instagram;

      return `<div class="ctc-card" onclick="window._ctcOpenDetail('${c.id}')">
        <div class="ctc-card-left">
          ${avatar}
          <div class="ctc-card-info">
            <div class="ctc-card-name">${_esc(c.name)}</div>
            <div class="ctc-card-meta">
              ${c.company ? `<span><i data-lucide="building-2"></i>${_esc(c.company)}</span>` : ''}
              ${ig ? `<span><i data-lucide="instagram"></i>@${_esc(ig)}</span>` : ''}
              ${c.email ? `<span><i data-lucide="mail"></i>${_esc(c.email)}</span>` : ''}
              ${c.phone ? `<span><i data-lucide="phone"></i>${_esc(c.phone)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="ctc-card-right">
          <span class="ctc-badge type-${c.type}">${TYPE_LABEL[c.type] || c.type}</span>
          <span class="ctc-badge status-${c.status}">${STATUS_LABEL[c.status] || c.status}</span>
          <i data-lucide="chevron-right" style="width:14px;height:14px;opacity:0.4"></i>
        </div>
      </div>`;
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
    const key = btn.dataset.f;
    const val = btn.dataset.v || null;
    F[key] = val;
    // Toggle UI state
    btn.closest('.ctc-filter-group').querySelectorAll('.pill').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    _renderList();
  };

  function _computeList() {
    const term = F.search;
    let list = STATE.crm.contacts || [];
    if (F.status) list = list.filter(c => c.status === F.status);
    if (F.type) list = list.filter(c => c.type === F.type);
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

  window._ctcSaveNew = async () => {
    const payload = _formRead();
    if (!payload.name) { toast('Nome é obrigatório', 'e'); return; }
    try {
      const created = await CRM.contacts.create(payload);
      closeModal();
      _renderList();
      toast(`"${created.name}" adicionado à wishlist`, 's');
    } catch (e) {
      toast('Erro ao criar: ' + (e.message || 'desconhecido'), 'e');
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
          <div class="ff"><label>Instagram</label><input id="ctc-f-instagram" type="text" value="${_esc(c.social_links?.instagram || '')}" placeholder="@handle"></div>
        </div>
        <div class="form-row">
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

  function _formRead() {
    const get = (id) => document.getElementById(id)?.value || '';
    const ig = get('ctc-f-instagram').trim().replace(/^@/, '');
    return {
      name: get('ctc-f-name').trim(),
      email: get('ctc-f-email').trim() || null,
      phone: get('ctc-f-phone').trim() || null,
      company: get('ctc-f-company').trim() || null,
      social_links: ig ? { instagram: ig } : {},
      type: get('ctc-f-type'),
      status: get('ctc-f-status'),
      source: get('ctc-f-source') || null,
      notes: get('ctc-f-notes').trim() || null,
    };
  }

  // ── DETALHES DO CONTATO ──────────────────────────────────
  window._ctcOpenDetail = (id) => {
    const c = CRM.contactById(id);
    if (!c) return;
    const ig = c.social_links?.instagram;

    const body = `
      <div class="ctc-detail-head">
        <div><strong style="font-size:18px">${_esc(c.name)}</strong></div>
        <div style="color:var(--text2);font-size:12px;margin-top:4px">
          ${c.company || '—'} · ${TYPE_LABEL[c.type] || c.type} · ${STATUS_LABEL[c.status] || c.status}
        </div>
      </div>
      <div class="ctc-detail-grid">
        ${c.email ? `<div><span class="ctc-dt-k">Email</span><span>${_esc(c.email)}</span></div>` : ''}
        ${c.phone ? `<div><span class="ctc-dt-k">Telefone</span><span>${_esc(c.phone)}</span></div>` : ''}
        ${ig ? `<div><span class="ctc-dt-k">Instagram</span><a href="https://instagram.com/${_esc(ig)}" target="_blank" rel="noopener" style="color:var(--theme)">@${_esc(ig)}</a></div>` : ''}
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

  window._ctcSaveEdit = async (id) => {
    const payload = _formRead();
    if (!payload.name) { toast('Nome é obrigatório', 'e'); return; }
    try {
      await CRM.contacts.update(id, payload);
      closeModal();
      _renderList();
      toast('Contato atualizado', 's');
    } catch (e) {
      toast('Erro ao salvar: ' + (e.message || 'desconhecido'), 'e');
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

  // ── BULK IMPORT ────────────────────────────────────────────
  window._ctcOpenImport = () => {
    const body = `
      <div style="font-size:12px;color:var(--text2);margin-bottom:12px;line-height:1.6">
        Cola uma lista de contatos abaixo. Formatos aceitos:
      </div>

      <div class="ctc-import-formats">
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">Só nomes</div>
          <code>João Silva<br>Maria Santos<br>Pedro Costa</code>
        </div>
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">Nome + Instagram</div>
          <code>João Silva, @joaosilva<br>Maria Santos, @mariaproducao<br>Pedro, @pedrocosta</code>
        </div>
        <div class="ctc-import-format">
          <div class="ctc-import-format-k">Qualquer combo</div>
          <code>João, @joao, joao@email.com<br>Maria, Acme Inc, 11999999999</code>
        </div>
      </div>

      <div style="font-size:11px;color:var(--text3);margin:14px 0 8px;line-height:1.5">
        Separador: <strong>vírgula</strong>, <strong>ponto-e-vírgula</strong> ou <strong>tab</strong> (colar de planilha).
        Primeira coluna é sempre o <strong>nome</strong>. As demais são auto-detectadas:
        começa com <code>@</code> → <strong>Instagram</strong>, tem <code>@email.com</code> → <strong>email</strong>,
        só números → <strong>telefone</strong>, resto → <strong>empresa</strong>.
      </div>

      <textarea id="ctc-import-text" class="fi" rows="10"
        placeholder="João Silva, joao@email.com, Acme Inc&#10;Maria Santos, maria@xyz.com&#10;Pedro Costa"
        style="width:100%;font-family:'SF Mono',Menlo,monospace;font-size:12px"
        oninput="window._ctcImportPreview()"></textarea>

      <div class="form-row" style="margin-top:14px">
        <div class="ff"><label>Tipo padrão</label>
          <select id="ctc-import-type" class="fi" onchange="window._ctcImportPreview()">
            <option value="b2c" selected>B2C (influencer/pessoa física)</option>
            <option value="b2b">B2B (empresa)</option>
            <option value="both">Ambos</option>
          </select>
        </div>
        <div class="ff"><label>Origem padrão</label>
          <select id="ctc-import-source" class="fi" onchange="window._ctcImportPreview()">
            <option value="">—</option>
            <option value="inbound">Inbound</option>
            <option value="outbound" selected>Outbound</option>
            <option value="referral">Indicação</option>
            <option value="event">Evento</option>
            <option value="social">Redes sociais</option>
            <option value="other">Outro</option>
          </select>
        </div>
      </div>

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

  // Parse flexível: detecta separador E auto-mapeia colunas pelo conteúdo
  function _parseImportText(txt) {
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    const results = [];
    const errors = [];
    const seen = new Set();

    lines.forEach((line, idx) => {
      // Detecta separador: tab > ponto-e-vírgula > vírgula
      let parts;
      if (line.includes('\t')) parts = line.split('\t').map(p => p.trim());
      else if (line.includes(';')) parts = line.split(';').map(p => p.trim());
      else if (line.includes(',')) parts = line.split(',').map(p => p.trim());
      else parts = [line];

      const name = (parts[0] || '').trim();
      if (!name) { errors.push({ line: idx + 1, msg: 'nome vazio' }); return; }

      // Auto-detecta o tipo de cada coluna extra
      const row = { name, email: null, company: null, phone: null, instagram: null };
      for (let i = 1; i < parts.length; i++) {
        const det = _detectCellType(parts[i]);
        if (det.type === 'empty') continue;
        if (det.type === 'instagram' && !row.instagram) row.instagram = det.value;
        else if (det.type === 'email' && !row.email) row.email = det.value;
        else if (det.type === 'phone' && !row.phone) row.phone = det.value;
        else if (det.type === 'company' && !row.company) row.company = det.value;
      }

      // Dedupe por nome+email+instagram
      const key = `${name.toLowerCase()}|${(row.email || '').toLowerCase()}|${(row.instagram || '').toLowerCase()}`;
      if (seen.has(key)) {
        errors.push({ line: idx + 1, name, msg: 'duplicado nesta importação' });
        return;
      }
      seen.add(key);

      results.push(row);
    });

    return { results, errors };
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
    const type = document.getElementById('ctc-import-type')?.value || 'b2c';
    const source = document.getElementById('ctc-import-source')?.value || null;
    const btn = document.getElementById('ctc-import-btn');

    const { results } = _parseImportText(txt);
    if (!results.length) { toast('Nada para importar', 'w'); return; }

    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader"></i> Importando...';
    lucide.createIcons();

    const existingNames = new Set((STATE.crm?.contacts || []).map(c => (c.name || '').toLowerCase()));
    const existingEmails = new Set((STATE.crm?.contacts || []).map(c => (c.email || '').toLowerCase()).filter(Boolean));
    const toInsert = results.filter(r =>
      !existingNames.has(r.name.toLowerCase()) && !(r.email && existingEmails.has(r.email.toLowerCase()))
    ).map(r => {
      // Instagram vai pro jsonb social_links
      const social_links = r.instagram ? { instagram: r.instagram } : {};
      return {
        name: r.name,
        email: r.email,
        company: r.company,
        phone: r.phone,
        social_links,
        type,
        source,
        status: 'wishlist',
      };
    });

    if (!toInsert.length) {
      closeModal();
      toast('Todos já existem — nada foi importado', 'w');
      return;
    }

    try {
      const sb = window.sb_crm;
      // Insert em chunks de 100 pra não estourar limite
      const chunkSize = 100;
      let inserted = 0;
      for (let i = 0; i < toInsert.length; i += chunkSize) {
        const chunk = toInsert.slice(i, i + chunkSize);
        const { data, error } = await sb.from('contacts').insert(chunk).select();
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
})();
