// ══════════════════════════════════════════════════════════
// GLOBAL SEARCH — Command Palette (Cmd+K / Ctrl+K)
// ══════════════════════════════════════════════════════════
// UX pattern: Linear / Raycast / GitHub / Notion command palette.
// - Pill-shaped trigger button in every header
// - Click or Ctrl+K opens a centered overlay
// - Live search with grouped, highlighted results
// - Click result navigates, Escape closes
//
// Indexes 8 entity types across the whole app state.
// ══════════════════════════════════════════════════════════

const GS_GROUPS = [
  { key: 'affiliates', name: 'Afiliados',   icon: 'users',       color: '#ec4899' },
  { key: 'brands',     name: 'Marcas',      icon: 'tag',         color: '#a855f7' },
  { key: 'contracts',  name: 'Contratos',   icon: 'file-text',   color: '#10b981' },
  { key: 'payments',   name: 'Pagamentos',  icon: 'banknote',    color: '#f59e0b' },
  { key: 'closings',   name: 'Fechamentos', icon: 'file-check',  color: '#3b82f6' },
  { key: 'tasks',      name: 'Tarefas',     icon: 'check-square',color: '#06b6d4' },
  { key: 'reports',    name: 'Lançamentos', icon: 'activity',    color: '#6366f1' },
  { key: 'users',      name: 'Usuários',    icon: 'shield',      color: '#ef4444' },
];

// ── Core search: returns { results: {group: []}, total: N } ──
window.performGlobalSearch = (query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) return { results: {}, total: 0 };

  const terms = q.split(/\s+/).filter(Boolean);
  const matches = (...fields) => {
    const combined = fields.filter(Boolean).map(String).join(' ').toLowerCase();
    if (!combined) return false;
    return terms.every(t => combined.includes(t));
  };

  const results = {};
  GS_GROUPS.forEach(g => { results[g.key] = []; });

  // AFFILIATES
  (STATE.affiliates || []).forEach(a => {
    const ct = (typeof CONTRACT_TYPES !== 'undefined' ? CONTRACT_TYPES[a.contractType]?.label : '') || a.contractType || '';
    const brandList = Object.keys(a.deals || {}).join(' ');
    const tagNames = (a.tags || []).map(tid => STATE.availableTags?.find(t => t.id === tid)?.name || '').join(' ');
    const extIds = a.externalIds ? Object.entries(a.externalIds).map(([b, id]) => `${b} ${id}`).join(' ') : '';
    const social = a.social ? Object.values(a.social).join(' ') : '';
    if (matches(a.name, a.contactName, a.contactEmail, a.notes, ct, brandList, tagNames, extIds, social, a.status, a.type, a.id)) {
      results.affiliates.push({
        title: a.name,
        subtitle: `${ct}${brandList ? ' · ' + brandList : ''}${a.contactEmail ? ' · ' + a.contactEmail : ''}`,
        meta: fc(a.commission || 0),
        action: `closeGlobalSearch();openMod('affiliates');setTimeout(()=>openAffDetail('${a.id}'),320)`,
      });
    }
  });

  // BRANDS
  Object.entries(STATE.brands || {}).forEach(([name, b]) => {
    const levelsStr = (b.levels || []).map(l => `${l.name} ${l.cpa} ${l.baseline}`).join(' ');
    if (matches(name, b.type, `cpa ${b.cpa || 0}`, `rs ${b.rs || 0}`, levelsStr)) {
      results.brands.push({
        title: name,
        subtitle: `${b.type || 'standard'} · CPA R$${b.cpa || 0} · RS ${b.rs || 0}%${levelsStr ? ' · escalonado' : ''}`,
        color: b.color,
        action: `closeGlobalSearch();openMod('brands')`,
      });
    }
  });

  // CONTRACTS
  (STATE.contracts || []).forEach(c => {
    if (matches(c.name, c.description, c.affiliate, c.brand, c.type, c.status, c.paymentStatus, c.value, c.id, c.startDate, c.endDate)) {
      results.contracts.push({
        title: c.name,
        subtitle: `${c.affiliate} · ${c.brand} · ${c.type}`,
        meta: fc(c.value),
        status: c.paymentStatus,
        action: `closeGlobalSearch();openMod('affiliates');setTimeout(()=>openAffDetail('${c.affiliateId}'),320)`,
      });
    }
  });

  // PAYMENTS
  (STATE.payments || []).forEach(p => {
    if (matches(p.affiliate, p.brand, p.contract, p.type, p.status, p.nfName, p.amount, p.dueDate, p.id)) {
      results.payments.push({
        title: `${p.affiliate} — ${p.contract}`,
        subtitle: `${p.brand}${p.type ? ' · ' + p.type : ''}${p.nfName ? ' · 📎 ' + p.nfName : ''}${p.dueDate ? ' · venc. ' + new Date(p.dueDate).toLocaleDateString('pt-BR') : ''}`,
        meta: fc(p.amount),
        status: p.status,
        action: `closeGlobalSearch();openMod('payments')`,
      });
    }
  });

  // CLOSINGS
  (STATE.closings || []).forEach(c => {
    const ct = (typeof CONTRACT_TYPES !== 'undefined' ? CONTRACT_TYPES[c.contractType]?.label : '') || '';
    if (matches('fechamento', c.affiliateName, c.brand, c.monthLabel, ct, c.createdBy, c.commission, c.paymentStatus, c.id, c.createdAt)) {
      results.closings.push({
        title: `${c.affiliateName} · ${c.brand}`,
        subtitle: `${c.monthLabel}${ct ? ' · ' + ct : ''} · ${c.ftds} FTDs${c.createdBy ? ' · por ' + c.createdBy : ''}`,
        meta: fc(c.commission),
        status: c.paymentStatus,
        action: `closeGlobalSearch();openMod('payments')`,
      });
    }
  });

  // TASKS
  (STATE.tasks || []).forEach(t => {
    const aff = STATE.affiliates?.find(a => a.id === t.affiliateId);
    if (matches(t.title, t.description, t.assignee, t.priority, t.status, t.linkedModule, aff?.name, t.dueDate)) {
      results.tasks.push({
        title: t.title,
        subtitle: `${t.assignee || 'sem responsável'} · ${t.priority} · ${t.status}${aff ? ' · ' + aff.name : ''}${t.dueDate ? ' · ' + new Date(t.dueDate).toLocaleDateString('pt-BR') : ''}`,
        action: `closeGlobalSearch();openMod('tasks')`,
      });
    }
  });

  // REPORTS
  (STATE.reports || []).forEach(r => {
    const aff = STATE.affiliates?.find(a => a.id === r.affiliateId);
    if (matches(r.brand, aff?.name, r.date, r.ftd, r.qftd, r.deposits, r.netRev)) {
      results.reports.push({
        title: `${r.brand} · ${aff?.name || 'Afiliado'}`,
        subtitle: `${new Date(r.date).toLocaleDateString('pt-BR')} · ${r.ftd} FTDs · ${r.qftd} QFTDs · Net R$${r.netRev}`,
        meta: fc(r.deposits),
        action: `closeGlobalSearch();openMod('dashboard')`,
      });
    }
  });

  // USERS
  (STATE.users || []).forEach(u => {
    if (matches(u.name, u.email, u.role, u.status)) {
      results.users.push({
        title: u.name,
        subtitle: `${u.email} · ${u.role}${u.status ? ' · ' + u.status : ''}`,
        action: `closeGlobalSearch();openMod('users')`,
      });
    }
  });

  const total = Object.values(results).reduce((s, arr) => s + arr.length, 0);
  return { results, total };
};

// ── Highlight matched terms ──
function gsHighlight(text, query) {
  if (!text || !query) return text || '';
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return String(text);
  let out = String(text);
  terms.forEach(t => {
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    out = out.replace(re, '<mark class="cmdk-hl">$1</mark>');
  });
  return out;
}

// ── Render results HTML ──
function renderCmdKResults(query) {
  if (!query.trim()) {
    return `
      <div class="cmdk-hint">
        <div class="cmdk-hint-title">Comece a digitar</div>
        <div class="cmdk-hint-desc">Busca em afiliados, marcas, pagamentos, fechamentos, contratos, tarefas, lançamentos e usuários.</div>
        <div class="cmdk-hint-examples">
          <span>fmg</span>
          <span>fechamento vupi</span>
          <span>pendente</span>
          <span>março</span>
          <span>NF_3001</span>
        </div>
      </div>`;
  }

  const { results, total } = performGlobalSearch(query);

  if (!total) {
    return `
      <div class="cmdk-empty">
        <i data-lucide="search-x"></i>
        <div class="cmdk-empty-title">Nenhum resultado</div>
        <div class="cmdk-empty-sub">Nada encontrado para <strong>"${query}"</strong></div>
      </div>`;
  }

  let html = `<div class="cmdk-total">${total} resultado${total > 1 ? 's' : ''}</div>`;

  GS_GROUPS.forEach(g => {
    const items = results[g.key];
    if (!items || !items.length) return;
    html += `
      <div class="cmdk-group">
        <div class="cmdk-group-hdr">
          <span class="cmdk-group-name">${g.name}</span>
          <span class="cmdk-group-count">${items.length}</span>
        </div>
        <div class="cmdk-group-items">
          ${items.slice(0, 6).map(item => `
            <div class="cmdk-item" onclick="${item.action}">
              <div class="cmdk-icon" style="background:${item.color || g.color}18;color:${item.color || g.color}">
                <i data-lucide="${g.icon}"></i>
              </div>
              <div class="cmdk-info">
                <div class="cmdk-title">${gsHighlight(item.title, query)}</div>
                <div class="cmdk-sub">${gsHighlight(item.subtitle || '', query)}</div>
              </div>
              ${item.meta ? `<div class="cmdk-meta">${item.meta}</div>` : ''}
              ${item.status ? `<span class="pb pb-${item.status}" style="margin-left:8px">${typeof pl==='function'?pl(item.status):item.status}</span>` : ''}
              <i data-lucide="arrow-right" class="cmdk-item-arrow"></i>
            </div>
          `).join('')}
          ${items.length > 6 ? `<div class="cmdk-more">+${items.length - 6} mais em ${g.name}</div>` : ''}
        </div>
      </div>`;
  });

  return html;
}

// ── Open/close palette ──
window.openGlobalSearch = () => {
  const overlay = document.getElementById('cmdk-overlay');
  if (!overlay) return;
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  const input = document.getElementById('cmdk-input');
  if (input) {
    input.value = '';
    // Initial render (hint state)
    const el = document.getElementById('cmdk-results');
    if (el) {
      el.innerHTML = renderCmdKResults('');
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    setTimeout(() => input.focus(), 50);
  }
};

window.closeGlobalSearch = () => {
  const overlay = document.getElementById('cmdk-overlay');
  if (!overlay) return;
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  const input = document.getElementById('cmdk-input');
  if (input) input.value = '';
};

// ── Live input handler (debounced) ──
let _cmdkTimer = null;
window.cmdkSearchInput = (value) => {
  clearTimeout(_cmdkTimer);
  _cmdkTimer = setTimeout(() => {
    const el = document.getElementById('cmdk-results');
    if (!el) return;
    el.innerHTML = renderCmdKResults(value);
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 80);
};

// ── Keyboard shortcuts ──
document.addEventListener('keydown', (e) => {
  // Ctrl+K / Cmd+K opens (or closes if already open)
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const overlay = document.getElementById('cmdk-overlay');
    if (overlay?.classList.contains('open')) closeGlobalSearch();
    else openGlobalSearch();
  }
  // Escape closes the palette
  if (e.key === 'Escape') {
    const overlay = document.getElementById('cmdk-overlay');
    if (overlay?.classList.contains('open')) {
      e.preventDefault();
      closeGlobalSearch();
    }
  }
  // Enter opens first result
  if (e.key === 'Enter') {
    const overlay = document.getElementById('cmdk-overlay');
    if (overlay?.classList.contains('open')) {
      const firstItem = document.querySelector('#cmdk-results .cmdk-item');
      if (firstItem) firstItem.click();
    }
  }
});
