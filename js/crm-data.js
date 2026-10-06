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

CRM.loadAll = async () => {
  if (!window.sb) {
    console.warn('[CRM Data] sb não inicializado');
    return false;
  }
  if (STATE.crm.loading) return false;
  STATE.crm.loading = true;

  // Log diagnóstico: estado da sessão (RLS exige authenticated)
  try {
    const { data: { session } } = await window.sb.auth.getSession();
    console.log('[CRM Data] session?', !!session, 'user:', session?.user?.email || '(anonymous)');
    if (!session) console.warn('[CRM Data] sem sessão — SELECTs vão retornar vazio por RLS');
  } catch (e) {
    console.warn('[CRM Data] getSession falhou:', e);
  }

  const sb = window.sb.schema('crm');
  try {
    const [contacts, products, tags, stages, cards, tasks] = await Promise.all([
      sb.from('contacts').select('*').order('created_at', { ascending: false }),
      sb.from('products').select('*').order('name'),
      sb.from('tags').select('*').order('name'),
      sb.from('pipeline_stages').select('*').order('position'),
      sb.from('pipeline_cards').select('*').order('position'),
      sb.from('tasks').select('*').order('due_date', { nullsFirst: false }),
    ]);
    const errors = [contacts, products, tags, stages, cards, tasks].filter(r => r.error);
    if (errors.length) {
      console.error('[CRM Data] erros ao carregar:', errors.map(e => e.error));
    }
    STATE.crm.contacts = contacts.data || [];
    STATE.crm.products = products.data || [];
    STATE.crm.tags = tags.data || [];
    STATE.crm.stages = stages.data || [];
    STATE.crm.cards = cards.data || [];
    STATE.crm.tasks = tasks.data || [];
    STATE.crm.loaded = true;
    console.log('[CRM Data] loaded:',
      `${STATE.crm.contacts.length} contatos, ${STATE.crm.products.length} produtos, ${STATE.crm.cards.length} cards, ${STATE.crm.stages.length} stages`);
    return true;
  } catch (e) {
    console.error('[CRM Data] loadAll falhou:', e);
    return false;
  } finally {
    STATE.crm.loading = false;
  }
};

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
    };
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
    return true;
  },
  async unlinkFromContact(contactId, tagId) {
    const sb = _crmClient(); if (!sb) return false;
    const { error } = await sb.from('contact_tags').delete()
      .eq('contact_id', contactId).eq('tag_id', tagId);
    if (error) { console.error('[tags.unlink]', error); throw error; }
    return true;
  },
};

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
