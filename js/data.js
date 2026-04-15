// ══════════════════════════════════════════════════════════
// DATA ACCESS LAYER — Supabase ↔ STATE
// ══════════════════════════════════════════════════════════
// Thin wrapper around the Supabase client that loads the entire
// database into the in-memory STATE (preserving the existing
// vanilla JS architecture) and provides upsert/delete helpers
// so write operations can be simple one-liners.
//
// Architecture pattern: STATE is a CACHE. On boot we load
// everything via Data.loadAll(). Mutations call Data.upsert()
// which writes to Supabase AND updates STATE in place.
// Realtime subscriptions push remote changes into STATE.
//
// This lets the existing UI code keep reading STATE.X directly
// (no async refactor) while gaining real database backing.
// ══════════════════════════════════════════════════════════

window.Data = (function () {
  const sb = () => window.sb;

  // ── Field name converters (snake_case ↔ camelCase) ──────
  // Supabase uses snake_case. The app uses camelCase.
  // Converters keep both worlds happy.
  const TABLE_FIELD_MAP = {
    affiliates: {
      id: 'id', name: 'name', type: 'type', status: 'status',
      contact_name: 'contactName', contact_email: 'contactEmail',
      contract_type: 'contractType', deals: 'deals',
      ftds: 'ftds', qftds: 'qftds', deposits: 'deposits',
      net_rev: 'netRev', commission: 'commission', profit: 'profit',
      notes: 'notes', external_ids: 'externalIds', social: 'social',
      tags: 'tags',
    },
    contracts: {
      id: 'id', affiliate_id: 'affiliateId', affiliate: 'affiliate',
      brand: 'brand', name: 'name', type: 'type', value: 'value',
      status: 'status', start_date: 'startDate', end_date: 'endDate',
      description: 'description', payment_status: 'paymentStatus', paid: 'paid',
    },
    payments: {
      id: 'id', contract_id: 'contractId', affiliate_id: 'affiliateId',
      affiliate: 'affiliate', brand: 'brand', contract: 'contract',
      amount: 'amount', nf_received_date: 'nfReceivedDate', due_date: 'dueDate',
      status: 'status', type: 'type', nf_name: 'nfName', nf_link: 'nfLink',
      nf_storage_path: 'nfStoragePath',
    },
    closings: {
      id: 'id', affiliate_id: 'affiliateId', affiliate_name: 'affiliateName',
      brand: 'brand', month_label: 'monthLabel', contract_type: 'contractType',
      commission: 'commission', ftds: 'ftds', qftds: 'qftds',
      deposits: 'deposits', net_rev: 'netRev', profit: 'profit',
      payment_status: 'paymentStatus', created_by: 'createdBy', created_at: 'createdAt',
    },
    tasks: {
      id: 'id', title: 'title', description: 'description',
      linked_module: 'linkedModule', affiliate_id: 'affiliateId',
      contract_id: 'contractId', priority: 'priority', status: 'status',
      assignee: 'assignee', due_date: 'dueDate',
    },
    reports: {
      id: 'id', brand: 'brand', affiliate_id: 'affiliateId',
      date: 'date', ftd: 'ftd', qftd: 'qftd', deposits: 'deposits', net_rev: 'netRev',
    },
    audit_log: {
      id: 'id', action: 'action', detail: 'detail', user_name: 'user',
      created_at: 'time',
    },
    notifications: {
      id: 'id', type: 'type', text: 'text', action: 'action', read: 'read',
      created_at: 'time',
    },
    available_tags: { id: 'id', name: 'name', color: 'color' },
    pipeline_stages: { id: 'id', name: 'name', color: 'color', position: 'position' },
    pipeline_cards: {
      id: 'id', affiliate_id: 'affiliateId', affiliate_name: 'affiliateName',
      stage_id: 'stageId', value: 'value', note: 'note',
      created_at: 'createdAt', updated_at: 'updatedAt',
    },
    reminders: {
      id: 'id', title: 'title', note: 'note', date: 'date', created_by: 'createdBy',
    },
  };

  // Convert a row from snake_case → camelCase using the map
  function toCamel(table, row) {
    const map = TABLE_FIELD_MAP[table];
    if (!map || !row) return row;
    const out = {};
    for (const k in map) {
      if (row[k] !== undefined) out[map[k]] = row[k];
    }
    return out;
  }

  // Convert from camelCase → snake_case for upsert payload
  function toSnake(table, obj) {
    const map = TABLE_FIELD_MAP[table];
    if (!map || !obj) return obj;
    const out = {};
    const reverse = {};
    for (const k in map) reverse[map[k]] = k;
    for (const k in obj) {
      if (reverse[k]) out[reverse[k]] = obj[k];
    }
    return out;
  }

  // ── LOAD ALL TABLES INTO STATE ──────────────────────────
  async function loadAll() {
    if (!sb()) {
      console.warn('[Data.loadAll] Supabase not configured — skipping');
      return false;
    }

    try {
      // Brands → keyed object {Vupi:{...}, Novibet:{...}}
      const { data: brands } = await sb().from('brands').select('*');
      STATE.brands = {};
      (brands || []).forEach(b => {
        STATE.brands[b.name] = {
          color: b.color, rgb: b.rgb, type: b.type,
          cpa: b.cpa || 0, rs: b.rs || 0,
          levels: b.levels || undefined,
          logo: b.logo || '',
        };
      });

      // Affiliates
      const { data: affs } = await sb().from('affiliates').select('*');
      STATE.affiliates = (affs || []).map(r => toCamel('affiliates', r));

      // Contracts
      const { data: cts } = await sb().from('contracts').select('*');
      STATE.contracts = (cts || []).map(r => toCamel('contracts', r));

      // Payments
      const { data: pys } = await sb().from('payments').select('*');
      STATE.payments = (pys || []).map(r => toCamel('payments', r));

      // Closings
      const { data: cls } = await sb().from('closings').select('*').order('created_at', { ascending: false });
      STATE.closings = (cls || []).map(r => toCamel('closings', r));

      // Tasks
      const { data: tks } = await sb().from('tasks').select('*');
      STATE.tasks = (tks || []).map(r => toCamel('tasks', r));

      // Reports
      const { data: rps } = await sb().from('reports').select('*').order('date', { ascending: false });
      STATE.reports = (rps || []).map(r => toCamel('reports', r));

      // Audit log (keep last 100)
      const { data: log } = await sb().from('audit_log').select('*').order('created_at', { ascending: false }).limit(100);
      STATE.auditLog = (log || []).map(r => ({
        id: 'a' + r.id,
        action: r.action,
        detail: r.detail,
        user: r.user_name,
        time: new Date(r.created_at).toLocaleString('pt-BR'),
      }));

      // Notifications
      const { data: notifs } = await sb().from('notifications').select('*').order('created_at', { ascending: false }).limit(50);
      STATE.notifications = (notifs || []).map(r => ({
        id: r.id, type: r.type, text: r.text, action: r.action, read: r.read,
        time: new Date(r.created_at).toLocaleString('pt-BR'),
      }));

      // Deadlines (singleton)
      const { data: dls } = await sb().from('deadlines').select('*').eq('id', 1).single();
      if (dls) {
        STATE.deadlines = {
          brandPayDays: dls.brand_pay_days || {},
          affiliatePayDays: dls.affiliate_pay_days || 10,
          nfReminderDays: dls.nf_reminder_days || 5,
          standardPaymentDays: dls.standard_payment_days || 5,
          lastGenerated: dls.last_generated || '',
        };
      }

      // EmailJS config (singleton)
      const { data: ejs } = await sb().from('emailjs_config').select('*').eq('id', 1).single();
      if (ejs) {
        STATE.emailjs = {
          publicKey: ejs.public_key || '',
          serviceId: ejs.service_id || '',
          templateId: ejs.template_id || '',
          financeEmail: ejs.finance_email || '',
        };
      }

      // Available tags
      const { data: tags } = await sb().from('available_tags').select('*');
      STATE.availableTags = (tags || []).map(r => toCamel('available_tags', r));

      // Pipeline
      const { data: stages } = await sb().from('pipeline_stages').select('*').order('position');
      const { data: cards } = await sb().from('pipeline_cards').select('*');
      STATE.pipeline = {
        stages: (stages || []).map(r => toCamel('pipeline_stages', r)),
        cards: (cards || []).map(r => toCamel('pipeline_cards', r)),
      };

      // Reminders
      const { data: rems } = await sb().from('reminders').select('*').order('date');
      STATE.reminders = (rems || []).map(r => toCamel('reminders', r));

      // User settings (current user)
      if (sb().auth.getUser) {
        const { data: { user } } = await sb().auth.getUser();
        if (user) {
          const { data: settings } = await sb().from('user_settings').select('*').eq('user_id', user.id).single();
          if (settings) {
            STATE.betaMode = !!settings.beta_mode;
          }
        }
      }

      // Profiles → app's STATE.users
      const { data: profiles } = await sb().from('profiles').select('*');
      STATE.users = (profiles || []).map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        role: p.role,
        status: p.status,
        modules: p.modules || [],
        createdAt: p.created_at?.split('T')[0] || '',
      }));

      console.log('[Data] loaded:',
        `${STATE.affiliates.length} affiliates,`,
        `${STATE.payments.length} payments,`,
        `${STATE.closings.length} closings,`,
        `${STATE.tasks.length} tasks`);

      return true;
    } catch (err) {
      console.error('[Data.loadAll] failed:', err);
      return false;
    }
  }

  // ── UPSERT (insert or update) ───────────────────────────
  async function upsert(table, obj) {
    if (!sb()) return false;
    const payload = toSnake(table, obj);
    const { error } = await sb().from(table).upsert(payload);
    if (error) {
      console.error(`[Data.upsert ${table}]`, error);
      return false;
    }
    return true;
  }

  // ── DELETE ──────────────────────────────────────────────
  async function remove(table, id) {
    if (!sb()) return false;
    const { error } = await sb().from(table).delete().eq('id', id);
    if (error) {
      console.error(`[Data.remove ${table}]`, error);
      return false;
    }
    return true;
  }

  // ── SINGLETON UPDATERS (deadlines, emailjs_config) ──────
  async function saveDeadlines() {
    if (!sb()) return false;
    const dl = STATE.deadlines || {};
    const { error } = await sb().from('deadlines').upsert({
      id: 1,
      brand_pay_days: dl.brandPayDays || {},
      affiliate_pay_days: dl.affiliatePayDays || 10,
      nf_reminder_days: dl.nfReminderDays || 5,
      standard_payment_days: dl.standardPaymentDays || 5,
      last_generated: dl.lastGenerated || '',
    });
    if (error) console.error('[Data.saveDeadlines]', error);
    return !error;
  }

  async function saveEmailJS() {
    if (!sb()) return false;
    const ej = STATE.emailjs || {};
    const { error } = await sb().from('emailjs_config').upsert({
      id: 1,
      public_key: ej.publicKey || '',
      service_id: ej.serviceId || '',
      template_id: ej.templateId || '',
      finance_email: ej.financeEmail || '',
    });
    if (error) console.error('[Data.saveEmailJS]', error);
    return !error;
  }

  // ── AUDIT LOG ───────────────────────────────────────────
  async function logAction(action, detail) {
    if (!sb()) return false;
    const userName = STATE.user?.name || 'Sistema';
    const { data, error } = await sb().from('audit_log').insert({
      action, detail, user_name: userName,
    }).select().single();
    if (error) { console.error('[Data.logAction]', error); return false; }
    // Add to local STATE so UI updates immediately
    if (!STATE.auditLog) STATE.auditLog = [];
    STATE.auditLog.unshift({
      id: 'a' + data.id, action, detail, user: userName,
      time: new Date(data.created_at).toLocaleString('pt-BR'),
    });
    if (STATE.auditLog.length > 100) STATE.auditLog.pop();
    return true;
  }

  // ── REALTIME SUBSCRIPTIONS ──────────────────────────────
  let _channels = [];
  function subscribeAll() {
    if (!sb()) return;
    unsubscribeAll();

    const tables = ['affiliates','payments','contracts','closings','tasks','reports','notifications','pipeline_cards','reminders'];

    tables.forEach(table => {
      const ch = sb().channel(`rt_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
          handleRealtimeChange(table, payload);
        })
        .subscribe();
      _channels.push(ch);
    });
  }

  function unsubscribeAll() {
    _channels.forEach(ch => sb().removeChannel(ch));
    _channels = [];
  }

  function handleRealtimeChange(table, payload) {
    // Map table → STATE key
    const stateKey = {
      affiliates: 'affiliates', payments: 'payments', contracts: 'contracts',
      closings: 'closings', tasks: 'tasks', reports: 'reports',
      notifications: 'notifications', reminders: 'reminders',
    }[table];
    if (!stateKey || !STATE[stateKey]) return;

    const arr = STATE[stateKey];
    const row = payload.new || payload.old;
    const id = row?.id;
    if (!id) return;

    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
      const camel = toCamel(table, payload.new);
      const idx = arr.findIndex(x => x.id === id);
      if (idx >= 0) arr[idx] = camel;
      else arr.unshift(camel);
    } else if (payload.eventType === 'DELETE') {
      const idx = arr.findIndex(x => x.id === id);
      if (idx >= 0) arr.splice(idx, 1);
    }

    // Special case: pipeline_cards lives inside STATE.pipeline.cards
    if (table === 'pipeline_cards' && STATE.pipeline?.cards) {
      const pc = STATE.pipeline.cards;
      if (payload.eventType === 'DELETE') {
        const i = pc.findIndex(x => x.id === id);
        if (i >= 0) pc.splice(i, 1);
      } else {
        const camel = toCamel('pipeline_cards', payload.new);
        const i = pc.findIndex(x => x.id === id);
        if (i >= 0) pc[i] = camel;
        else pc.push(camel);
      }
    }

    // Trigger UI re-render of the active module if helper exists
    if (typeof window.refreshActiveModule === 'function') {
      window.refreshActiveModule();
    }
  }

  // ── PUBLIC API ──────────────────────────────────────────
  return {
    loadAll,
    upsert,
    remove,
    saveDeadlines,
    saveEmailJS,
    logAction,
    subscribeAll,
    unsubscribeAll,
    toCamel,
    toSnake,
  };
})();
