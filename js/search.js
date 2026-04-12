// ══════════════════════════════════════════════════════════
// GLOBAL SEARCH — Inline pill with anchored dropdown panel
// ══════════════════════════════════════════════════════════
// UX: click the pill → input is focused → type → results
// appear in a panel anchored directly below the pill.
// No modal, no overlay — the pill IS the search.
//
// Ctrl+K / Cmd+K focuses the visible pill's input from anywhere.
// Escape blurs and closes. Click outside the pill closes.
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
        action: `closeSearchPanel();openMod('affiliates');setTimeout(()=>openAffDetail('${a.id}'),320)`,
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
        action: `closeSearchPanel();openMod('brands')`,
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
        action: `closeSearchPanel();openMod('affiliates');setTimeout(()=>openAffDetail('${c.affiliateId}'),320)`,
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
        action: `closeSearchPanel();openMod('payments')`,
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
        action: `closeSearchPanel();openMod('payments')`,
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
        action: `closeSearchPanel();openMod('tasks')`,
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
        action: `closeSearchPanel();openMod('dashboard')`,
      });
    }
  });

  // USERS
  (STATE.users || []).forEach(u => {
    if (matches(u.name, u.email, u.role, u.status)) {
      results.users.push({
        title: u.name,
        subtitle: `${u.email} · ${u.role}${u.status ? ' · ' + u.status : ''}`,
        action: `closeSearchPanel();openMod('users')`,
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
    out = out.replace(re, '<mark class="search-hl">$1</mark>');
  });
  return out;
}

// ── Render results HTML ──
function renderSearchResults(query) {
  const footer = `
    <div class="search-footer">
      <div class="search-footer-hint"><kbd>↵</kbd> abrir</div>
      <div class="search-footer-hint"><kbd>esc</kbd> fechar</div>
      <div class="search-footer-brand">Busca · 3C OS</div>
    </div>`;

  if (!query.trim()) {
    return `
      <div class="search-panel-body">
        <div class="search-hint">
          <div class="search-hint-title">Comece a digitar</div>
          <div class="search-hint-desc">Busca em afiliados, marcas, pagamentos, fechamentos, contratos, tarefas e lançamentos.</div>
          <div class="search-hint-examples">
            <span>fmg</span>
            <span>fechamento vupi</span>
            <span>pendente</span>
            <span>março</span>
          </div>
        </div>
      </div>${footer}`;
  }

  const { results, total } = performGlobalSearch(query);

  if (!total) {
    return `
      <div class="search-panel-body">
        <div class="search-empty">
          <i data-lucide="search-x"></i>
          <div class="search-empty-title">Nenhum resultado</div>
          <div class="search-empty-sub">Nada encontrado para <strong>"${query}"</strong></div>
        </div>
      </div>${footer}`;
  }

  let body = `<div class="search-total">${total} resultado${total > 1 ? 's' : ''} encontrado${total > 1 ? 's' : ''}</div>`;

  GS_GROUPS.forEach(g => {
    const items = results[g.key];
    if (!items || !items.length) return;
    body += `
      <div class="search-group">
        <div class="search-group-hdr">
          <span class="search-group-accent" style="background:${g.color};color:${g.color}"></span>
          <span class="search-group-name">${g.name}</span>
          <span class="search-group-count">${items.length}</span>
        </div>
        <div class="search-group-items">
          ${items.slice(0, 5).map(item => `
            <div class="search-item" onmousedown="event.preventDefault();${item.action}">
              <div class="search-icon" style="background:${item.color || g.color}1a;color:${item.color || g.color}">
                <i data-lucide="${g.icon}"></i>
              </div>
              <div class="search-info">
                <div class="search-title">${gsHighlight(item.title, query)}</div>
                <div class="search-sub">${gsHighlight(item.subtitle || '', query)}</div>
              </div>
              ${item.meta ? `<div class="search-meta">${item.meta}</div>` : ''}
              ${item.status ? `<span class="pb pb-${item.status}" style="margin-left:8px">${typeof pl==='function'?pl(item.status):item.status}</span>` : ''}
            </div>
          `).join('')}
          ${items.length > 5 ? `<div class="search-more">+${items.length - 5} mais em ${g.name}</div>` : ''}
        </div>
      </div>`;
  });

  return `<div class="search-panel-body">${body}</div>${footer}`;
}

// ── Find the active/visible search pill ──
function getVisibleSearchPill() {
  // Prefer the pill inside the currently active module header
  const activeMod = document.querySelector('.mod.active .search-pill');
  if (activeMod) return activeMod;
  // Fall back to the hub pill
  const hub = document.getElementById('hub');
  if (hub && hub.style.display === 'flex') {
    return hub.querySelector('.search-pill');
  }
  return document.querySelector('.search-pill');
}

// ── Focus the input inside a pill ──
window.focusSearchInput = (pillEl) => {
  const input = pillEl?.querySelector('.search-pill-input');
  if (input) input.focus();
};

// ── Show panel for a given pill, render with current query ──
function showSearchPanel(pillEl, query) {
  if (!pillEl) return;
  pillEl.classList.add('active');
  const panel = pillEl.querySelector('.search-panel');
  if (!panel) return;
  panel.innerHTML = renderSearchResults(query || '');
  panel.classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ── Close all open panels ──
window.closeSearchPanel = () => {
  document.querySelectorAll('.search-pill').forEach(pill => {
    pill.classList.remove('active');
    const panel = pill.querySelector('.search-panel');
    if (panel) panel.classList.remove('open');
    const input = pill.querySelector('.search-pill-input');
    if (input) input.value = '';
  });
};

// ── Event handlers wired to the input ──
let _searchTimer = null;
window.onSearchInput = (event) => {
  const input = event.target;
  const pill = input.closest('.search-pill');
  if (!pill) return;
  clearTimeout(_searchTimer);
  _searchTimer = setTimeout(() => {
    showSearchPanel(pill, input.value);
  }, 80);
};

window.onSearchFocus = (event) => {
  const input = event.target;
  const pill = input.closest('.search-pill');
  if (!pill) return;
  showSearchPanel(pill, input.value);
};

window.onSearchKeydown = (event) => {
  const input = event.target;
  const pill = input.closest('.search-pill');
  if (!pill) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    input.value = '';
    input.blur();
    closeSearchPanel();
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    const firstItem = pill.querySelector('.search-panel .search-item');
    if (firstItem) firstItem.dispatchEvent(new MouseEvent('mousedown'));
  }
};

// ── Click outside closes any open panel ──
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-pill')) {
    closeSearchPanel();
  }
});

// ── Ctrl+K / Cmd+K focuses the visible pill ──
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    const pill = getVisibleSearchPill();
    if (pill) focusSearchInput(pill);
  }
});
