// ══════════════════════════════════════════════════════════
// CRM DATA LAYER (schema crm)
// ══════════════════════════════════════════════════════════
// Camada de acesso aos dados da frente comercial (B2B/B2C + Wishlist).
// Usa window.sb_crm (configurado em supabase-client.js) para falar com
// o schema `crm` do Supabase. Mantém cache em STATE.crm.
//
// IMPORTANTE: para funcionar em runtime, o schema `crm` precisa estar
// exposto na API — ir em Dashboard → Settings → API → Exposed schemas
// e adicionar `crm` ao lado de `public` (uma vez só).
// ══════════════════════════════════════════════════════════

// Namespace central do estado CRM
if (!window.STATE) window.STATE = {};
STATE.crm = STATE.crm || {
  contacts: [],
  products: [],
  tags: [],
  stages: [],
  cards: [],
  tasks: [],
  loaded: false,
  loading: false,
};

// Retorna um cliente escopado ao schema `crm` que SEMPRE herda a sessão de
// auth do cliente principal `sb` (o usuário logado). Essencial para que
// RLS policies "to authenticated" sejam satisfeitas em writes.
function _crmClient() {
  if (!window.sb) {
    console.warn('[CRM Data] sb não inicializado — Supabase não configurado');
    return null;
  }
  return window.sb.schema('crm');
}

// ── LOADERS ────────────────────────────────────────────────

window.CRM = window.CRM || {};

// Chamadas simultâneas (hub + módulo abertos ao mesmo tempo) compartilham
// o mesmo carregamento em vez de a segunda falhar.
let _crmLoadPromise = null;
// Aviso de falha de carregamento com "Tentar de novo" (usado por Contatos e Pipeline).
CRM.loadErrorHTML = (retry) => `<div class="empty crm-load-err" style="grid-column:1/-1">
  <i data-lucide="cloud-off" style="color:var(--amber)"></i>
  <p><strong>Não foi possível carregar os dados.</strong> ${_crmEsc(STATE.crm.loadError || '')}<br>
  <span style="color:var(--text3)">Seus dados continuam salvos — isso é só a tela.</span></p>
  <button class="btn btn-theme" onclick="${retry}"><i data-lucide="refresh-cw"></i> Tentar de novo</button>
</div>`;
function _crmEsc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
CRM.loadAll = () => {
  if (!window.sb) {
    console.warn('[CRM Data] sb não inicializado');
    return Promise.resolve(false);
  }
  if (_crmLoadPromise) return _crmLoadPromise;
  _crmLoadPromise = _crmLoadAll().finally(() => { _crmLoadPromise = null; });
  return _crmLoadPromise;
};

async function _crmLoadAll() {
  STATE.crm.loading = true;

  STATE.crm.loadError = null;
  // Sem sessão o RLS devolve tudo vazio: não carrega nada (não é base zerada).
  try {
    const { data: { session } } = await window.sb.auth.getSession();
    if (!session) {
      console.warn('[CRM Data] sem sessão — não carrega');
      STATE.crm.loadError = 'Sua sessão expirou.';
      STATE.crm.loading = false;
      if (typeof window._forceRelogin === 'function' && STATE.user) window._forceRelogin('Sua sessão expirou. Entre de novo para ver os dados.');
      return false;
    }
  } catch (e) {
    console.warn('[CRM Data] getSession falhou:', e);
  }

  const sb = window.sb.schema('crm');
  // O Supabase devolve no máximo 1000 linhas por request: pagina até acabar.
  const all = async (build) => {
    const size = 1000; let from = 0; const out = [];
    for (;;) {
      const { data, error } = await build().range(from, from + size - 1);
      if (error) return { data: out.length ? out : null, error };
      out.push(...(data || []));
      if (!data || data.length < size) return { data: out, error: null };
      from += size;
    }
  };
  try {
    const [contacts, products, tags, stages, cards, tasks, contactTags] = await Promise.all([
      all(() => sb.from('contacts').select('*').order('created_at', { ascending: false }).order('id')),
      sb.from('products').select('*').order('name'),
      sb.from('tags').select('*').order('name'),
      sb.from('pipeline_stages').select('*').order('position'),
      all(() => sb.from('pipeline_cards').select('*').order('position').order('id')),
      sb.from('tasks').select('*').order('due_date', { nullsFirst: false }),
      all(() => sb.from('contact_tags').select('contact_id, tag_id').order('contact_id').order('tag_id')),
    ]);
    const errors = [contacts, products, tags, stages, cards, tasks, contactTags].filter(r => r.error);
    if (errors.length) {
      console.error('[CRM Data] erros ao carregar:', errors.map(e => e.error));
      // Falhou alguma parte: mantém o que já estava na tela em vez de zerar.
      STATE.crm.loadError = 'O banco não respondeu direito.';
      return false;
    }
    // Base que já teve centenas de contatos não volta vazia do nada: trata
    // como falha de carregamento e avisa, em vez de mostrar a lista zerada.
    let lastCount = 0;
    try { lastCount = Number(localStorage.getItem('3cos_crm_last_contacts')) || 0; } catch (_) {}
    if (!(contacts.data || []).length && lastCount >= 50) {
      console.error('[CRM Data] contatos vieram vazios; última carga tinha', lastCount);
      STATE.crm.loadError = `A base veio vazia (da última vez eram ${lastCount} contatos).`;
      return false;
    }
    try { localStorage.setItem('3cos_crm_last_contacts', String((contacts.data || []).length)); } catch (_) {}
    STATE.crm.contacts = contacts.data || [];
    STATE.crm.products = products.data || [];
    STATE.crm.tags = tags.data || [];
    STATE.crm.stages = stages.data || [];
    STATE.crm.cards = cards.data || [];
    STATE.crm.tasks = tasks.data || [];
    STATE.crm.contactTags = contactTags.data || [];
    STATE.crm.loaded = true;
    console.log('[CRM Data] loaded:',
      `${STATE.crm.contacts.length} contatos, ${STATE.crm.products.length} produtos, ${STATE.crm.cards.length} cards, ${STATE.crm.stages.length} stages`);
    return true;
  } catch (e) {
    console.error('[CRM Data] loadAll falhou:', e);
    STATE.crm.loadError = 'Sem conexão com o banco.';
    return false;
  } finally {
    STATE.crm.loading = false;
  }
}

// ── CONTACTS CRUD ──────────────────────────────────────────

CRM.contacts = {
  async create(payload) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('contacts').insert(payload).select().single();
    if (error) { console.error('[contacts.create]', error); throw error; }
    STATE.crm.contacts.unshift(data);
    return data;
  },
  async update(id, patch) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('contacts').update(patch).eq('id', id).select().single();
    if (error) { console.error('[contacts.update]', error); throw error; }
    const i = STATE.crm.contacts.findIndex(c => c.id === id);
    if (i >= 0) STATE.crm.contacts[i] = data;
    return data;
  },
  async remove(id) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('contacts').delete().eq('id', id);
    if (error) { console.error('[contacts.remove]', error); throw error; }
    STATE.crm.contacts = STATE.crm.contacts.filter(c => c.id !== id);
    return true;
  },
};

// ── PRODUCTS CRUD ──────────────────────────────────────────

CRM.products = {
  async create(payload) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('products').insert(payload).select().single();
    if (error) { console.error('[products.create]', error); throw error; }
    STATE.crm.products.push(data);
    return data;
  },
  async update(id, patch) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('products').update(patch).eq('id', id).select().single();
    if (error) { console.error('[products.update]', error); throw error; }
    const i = STATE.crm.products.findIndex(p => p.id === id);
    if (i >= 0) STATE.crm.products[i] = data;
    return data;
  },
  async remove(id) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) { console.error('[products.remove]', error); throw error; }
    STATE.crm.products = STATE.crm.products.filter(p => p.id !== id);
    return true;
  },
};

// ── PIPELINE CARDS CRUD ────────────────────────────────────

CRM.cards = {
  async create(payload) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('pipeline_cards').insert(payload).select().single();
    if (error) { console.error('[cards.create]', error); throw error; }
    STATE.crm.cards.push(data);
    return data;
  },
  async update(id, patch) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('pipeline_cards').update(patch).eq('id', id).select().single();
    if (error) { console.error('[cards.update]', error); throw error; }
    const i = STATE.crm.cards.findIndex(c => c.id === id);
    if (i >= 0) STATE.crm.cards[i] = data;
    return data;
  },
  async remove(id) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('pipeline_cards').delete().eq('id', id);
    if (error) { console.error('[cards.remove]', error); throw error; }
    STATE.crm.cards = STATE.crm.cards.filter(c => c.id !== id);
    return true;
  },
  // Move card para outro stage (atualiza stage_id)
  async moveToStage(cardId, stageId) {
    return CRM.cards.update(cardId, { stage_id: stageId });
  },
  // Promove um contato para o pipeline — cria um card B2B ou B2C
  async promoteContact(contactId, scope, extraFields = {}) {
    const sb = _crmClient(); if (!sb) return null;
    const firstStage = STATE.crm.stages
      .filter(s => s.scope === scope)
      .sort((a, b) => a.position - b.position)[0];
    const contact = STATE.crm.contacts.find(c => c.id === contactId);
    if (!contact) throw new Error('Contato não encontrado');
    const payload = {
      scope,
      stage_id: firstStage?.id || null,
      contact_id: contactId,
      title: extraFields.title || `${contact.name}${contact.company ? ' · ' + contact.company : ''}`,
      notes: extraFields.notes || '',
      owner: STATE.user?.id || null,
    };
    // Pipeline exclusiva de produto: o card já nasce com o produto.
    if (scope === 'rips') {
      const rips = (STATE.crm.products || []).find(p => (p.name || '').toLowerCase() === 'rips');
      if (rips) payload.product_id = rips.id;
    }
    const card = await CRM.cards.create(payload);
    // Atualiza status do contato pra in_pipeline
    await CRM.contacts.update(contactId, { status: 'in_pipeline' });
    return card;
  },
};

// ── TAGS CRUD ──────────────────────────────────────────────

CRM.tags = {
  async create(payload) {
    const sb = _crmClient(); if (!sb) return null;
    const { data, error } = await sb.from('tags').insert(payload).select().single();
    if (error) { console.error('[tags.create]', error); throw error; }
    STATE.crm.tags.push(data);
    return data;
  },
  async remove(id) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('tags').delete().eq('id', id);
    if (error) { console.error('[tags.remove]', error); throw error; }
    STATE.crm.tags = STATE.crm.tags.filter(t => t.id !== id);
    return true;
  },
  async linkToContact(contactId, tagId) {
    const sb = _crmClient(); if (!sb) return null;
    const { error } = await sb.from('contact_tags').insert({ contact_id: contactId, tag_id: tagId });
    if (error && error.code !== '23505') { console.error('[tags.link]', error); throw error; }
    STATE.crm.contactTags = STATE.crm.contactTags || [];
    if (!STATE.crm.contactTags.some(x => x.contact_id === contactId && x.tag_id === tagId)) STATE.crm.contactTags.push({ contact_id: contactId, tag_id: tagId });
    return true;
  },
  async unlinkFromContact(contactId, tagId) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('contact_tags').delete()
      .eq('contact_id', contactId).eq('tag_id', tagId);
    if (error) { console.error('[tags.unlink]', error); throw error; }
    STATE.crm.contactTags = (STATE.crm.contactTags || []).filter(x => !(x.contact_id === contactId && x.tag_id === tagId));
    return true;
  },
};

// Tags de um contato (objetos de crm.tags), via contact_tags carregado no loadAll
CRM.tagsForContact = (contactId) => {
  const ids = (STATE.crm.contactTags || []).filter(x => x.contact_id === contactId).map(x => x.tag_id);
  return (STATE.crm.tags || []).filter(t => ids.includes(t.id));
};
// Chip HTML de tag (compartilhado entre contatos e pipeline)
CRM.tagChip = (t, extraClass = '') => `<span class="crm-tag ${extraClass}" style="--tag-c:${t.color || '#94a3b8'}">${String(t.name || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))}</span>`;

// ── CONTACT-PRODUCT FIT ────────────────────────────────────

CRM.fit = {
  async set(contactId, productId, category, fitScore, notes) {
    const sb = _crmClient(); if (!sb) return null;
    const payload = { contact_id: contactId, product_id: productId, category, fit_score: fitScore, notes };
    const { data, error } = await sb.from('contact_product_fit')
      .upsert(payload, { onConflict: 'contact_id,product_id' })
      .select().single();
    if (error) { console.error('[fit.set]', error); throw error; }
    return data;
  },
  async remove(contactId, productId) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('contact_product_fit').delete()
      .eq('contact_id', contactId).eq('product_id', productId);
    if (error) { console.error('[fit.remove]', error); throw error; }
    return true;
  },
  async listForContact(contactId) {
    const sb = _crmClient(); if (!sb) return [];
    const { data } = await sb.from('contact_product_fit')
      .select('*').eq('contact_id', contactId);
    return data || [];
  },
  async listForProduct(productId) {
    const sb = _crmClient(); if (!sb) return [];
    const { data } = await sb.from('contact_product_fit')
      .select('*').eq('product_id', productId);
    return data || [];
  },
};

// ── Helpers ────────────────────────────────────────────────

CRM.stageById = (id) => STATE.crm.stages.find(s => s.id === id);
CRM.contactById = (id) => STATE.crm.contacts.find(c => c.id === id);
CRM.productById = (id) => STATE.crm.products.find(p => p.id === id);
CRM.cardsForScope = (scope) => STATE.crm.cards.filter(c => c.scope === scope);
CRM.stagesForScope = (scope) => STATE.crm.stages
  .filter(s => s.scope === scope).sort((a, b) => a.position - b.position);
