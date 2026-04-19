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
      // Helper: fetch + overwrite STATE only on success. Preserves existing
      // data if Supabase errors (RLS, network, etc) — prevents the bug where
      // a failed read would wipe STATE to an empty array.
      async function loadInto(field, table, mapper, options) {
        const q = sb().from(table).select('*');
        if (options?.order) q.order(options.order.col, { ascending: options.order.asc });
        if (options?.limit) q.limit(options.limit);
        const { data, error } = await q;
        if (error) {
          console.warn(`[Data.loadAll] ${table} FAILED — mantendo STATE.${field} existente:`, error.message);
          return false;
        }
        if (!Array.isArray(data)) {
          console.warn(`[Data.loadAll] ${table} retornou não-array — mantendo STATE.${field}`);
          return false;
        }
        STATE[field] = data.map(mapper);
        console.log(`[Data.loadAll] ${table} ← ${data.length} registros`);
        return true;
      }

      // Brands → keyed object {Vupi:{...}, Novibet:{...}}
      const { data: brands, error: brandsErr } = await sb().from('brands').select('*');
      if (brandsErr) {
        console.warn('[Data.loadAll] brands FAILED — mantendo STATE.brands existente:', brandsErr.message);
      } else if (Array.isArray(brands) && brands.length > 0) {
        STATE.brands = {};
        brands.forEach(b => {
          STATE.brands[b.name] = {
            color: b.color, rgb: b.rgb, type: b.type,
            cpa: b.cpa || 0, rs: b.rs || 0,
            levels: b.levels || undefined,
            logo: b.logo || '',
          };
        });
        console.log(`[Data.loadAll] brands ← ${brands.length} marcas`);
      }

      await loadInto('affiliates', 'affiliates', r => toCamel('affiliates', r));
      await loadInto('contracts', 'contracts', r => toCamel('contracts', r));
      await loadInto('payments', 'payments', r => toCamel('payments', r));
      await loadInto('closings', 'closings', r => toCamel('closings', r), { order: { col: 'created_at', asc: false } });
      await loadInto('tasks', 'tasks', r => toCamel('tasks', r));
      await loadInto('reports', 'reports', r => toCamel('reports', r), { order: { col: 'date', asc: false } });

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
      // PHASE 2: until auth migration (Phase 3), we keep the seed users
      // hardcoded so the lock screen has someone to validate against.
      // Once Phase 3 lands, profiles will be populated via Supabase Auth signup.
      const { data: profiles } = await sb().from('profiles').select('*');
      if (profiles && profiles.length > 0) {
        STATE.users = profiles.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          role: p.role,
          status: p.status,
          modules: p.modules || [],
          createdAt: p.created_at?.split('T')[0] || '',
        }));
      } else if (!STATE.users || STATE.users.length === 0) {
        // No profiles in Supabase yet (pre-auth-migration) → keep the seed users
        // from DEFAULT_STATE so the user can still login during transition
        STATE.users = (typeof DEFAULT_STATE !== 'undefined' && DEFAULT_STATE.users) ? [...DEFAULT_STATE.users] : [];
      }

      // Migration: recompute affiliate profit using the corrected formula
      // (brandComm - affComm). Older imports stored profit = netRev - affComm
      // which is wrong because netRev is player revenue, not brand→3C payout.
      try { _recomputeAffiliateProfits(); } catch(e) { console.warn('[Data] profit recompute failed:', e); }

      console.log('[Data] loaded:',
        `${STATE.affiliates.length} affiliates,`,
        `${STATE.payments.length} payments,`,
        `${STATE.closings.length} closings,`,
        `${STATE.tasks.length} tasks,`,
        `${STATE.users.length} users`);

      return true;
    } catch (err) {
      console.error('[Data.loadAll] failed:', err);
      return false;
    }
  }

  // One-shot migration: walks STATE.affiliates and recomputes profit using
  // the correct formula (brandComm - affComm) from their reports. Only
  // rewrites values — doesn't touch commission, netRev, etc. Safe to run
  // repeatedly; idempotent when profit is already correct.
  function _recomputeAffiliateProfits() {
    if (!STATE.affiliates?.length || !STATE.reports?.length) return;
    const comm = (deal, qf, nr) => {
      if (!deal) return 0;
      let cpa = 0;
      if (deal.levels?.length) {
        const sorted = [...deal.levels].sort((a, b) => (a.baseline || 0) - (b.baseline || 0));
        let rem = qf;
        for (let i = 0; i < sorted.length && rem > 0; i++) {
          const nextBase = sorted[i + 1]?.baseline || Infinity;
          const cap = nextBase - (sorted[i].baseline || 0);
          const inT = Math.min(rem, cap);
          cpa += inT * (sorted[i].cpa || 0);
          rem -= inT;
        }
      } else {
        cpa = (deal.cpa || 0) * qf;
      }
      return cpa + Math.max(0, (deal.rs || 0) / 100 * (nr || 0));
    };
    STATE.affiliates.forEach(a => {
      const rows = STATE.reports.filter(r => r.affiliateId === a.id);
      if (!rows.length) return;
      let brandRev = 0, affComm = 0;
      rows.forEach(r => {
        const qf = typeof r.qftd === 'object' ? Object.values(r.qftd).reduce((s, v) => s + (v || 0), 0) : (r.qftd || 0);
        const nr = r.netRev || 0;
        brandRev += comm(STATE.brands?.[r.brand], qf, nr);
        affComm += comm(a.deals?.[r.brand], qf, nr);
      });
      a.commission = Math.round(affComm * 100) / 100;
      a.profit = Math.round((brandRev - affComm) * 100) / 100;
    });
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

  // ── SYNC ALL — bulk push entire STATE to Supabase ───────
  // This is the Phase 3 write strategy: instead of refactoring
  // every mutation site to call upsert individually, we just
  // hook this into saveToCloud(). When the user changes anything,
  // saveToCloud fires (debounced) and syncs the affected entities.
  //
  // Trade-off: more network bandwidth than per-row upserts, but
  // ZERO code changes outside of saveToCloud. At our scale
  // (6 affiliates, 5 payments) the entire sync is < 50KB.
  let _syncing = false;
  async function syncAll() {
    if (!sb() || _syncing) return false;
    _syncing = true;
    try {
      const ops = [];

      // Singletons (deadlines, emailjs config)
      ops.push(saveDeadlines());
      ops.push(saveEmailJS());

      // Brands — keyed object, convert to array
      if (STATE.brands) {
        const brandRows = Object.entries(STATE.brands).map(([name, b]) => ({
          name,
          color: b.color,
          rgb: b.rgb,
          type: b.type || 'standard',
          cpa: b.cpa || 0,
          rs: b.rs || 0,
          levels: b.levels || null,
          logo: b.logo || null,
        }));
        if (brandRows.length) ops.push(sb().from('brands').upsert(brandRows));
      }

      // Array tables — bulk upsert (use primary key by default)
      const arrayTables = [
        ['affiliates', STATE.affiliates],
        ['contracts', STATE.contracts],
        ['payments', STATE.payments],
        ['closings', STATE.closings],
        ['tasks', STATE.tasks],
        ['available_tags', STATE.availableTags],
        ['reminders', STATE.reminders],
      ];
      arrayTables.forEach(([table, arr]) => {
        if (arr && arr.length) {
          const rows = arr.map(item => toSnake(table, item));
          ops.push(sb().from(table).upsert(rows));
        }
      });

      // Reports — natural key upsert (no JS-side id)
      // Requires unique index on (brand, affiliate_id, date)
      // → see supabase/migrations/001_phase3_followup.sql
      if (STATE.reports?.length) {
        const reportRows = STATE.reports
          .filter(r => r.brand && r.affiliateId && r.date)
          .map(r => ({
            brand: r.brand,
            affiliate_id: r.affiliateId,
            date: r.date,
            ftd: r.ftd || 0,
            qftd: r.qftd || 0,
            deposits: r.deposits || 0,
            net_rev: r.netRev || 0,
          }));
        if (reportRows.length) {
          ops.push(sb().from('reports').upsert(reportRows, { onConflict: 'brand,affiliate_id,date' }));
        }
      }

      // Notifications — text id, drop "time" field (Postgres handles created_at)
      if (STATE.notifications?.length) {
        const notifRows = STATE.notifications.map(n => ({
          id: n.id,
          type: n.type,
          text: n.text,
          action: n.action || null,
          read: !!n.read,
        }));
        ops.push(sb().from('notifications').upsert(notifRows));
      }

      // Pipeline (stages + cards)
      if (STATE.pipeline?.stages?.length) {
        const stages = STATE.pipeline.stages.map(s => toSnake('pipeline_stages', s));
        ops.push(sb().from('pipeline_stages').upsert(stages));
      }
      if (STATE.pipeline?.cards?.length) {
        const cards = STATE.pipeline.cards.map(c => toSnake('pipeline_cards', c));
        ops.push(sb().from('pipeline_cards').upsert(cards));
      }

      const results = await Promise.allSettled(ops);
      const failed = results.filter(r => r.status === 'rejected' || r.value?.error);
      if (failed.length) {
        console.warn('[Data.syncAll] some operations failed:', failed.length);
      }
      return failed.length === 0;
    } catch (err) {
      console.error('[Data.syncAll] crashed:', err);
      return false;
    } finally {
      _syncing = false;
    }
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
    syncAll,
    saveDeadlines,
    saveEmailJS,
    logAction,
    subscribeAll,
    unsubscribeAll,
    toCamel,
    toSnake,
  };
})();
