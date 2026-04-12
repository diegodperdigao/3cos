// ══════════════════════════════════════════════════════════
// GLOBAL SEARCH — Unified search engine across all entities
// ══════════════════════════════════════════════════════════
// Indexes: affiliates, brands, contracts, payments, closings,
// tasks, reports, users, notifications.
//
// Query semantics:
// - Multi-word: all terms must match (AND)
// - Partial word matching, case-insensitive
// - Searches names, emails, IDs, amounts, notes, statuses, dates
//
// Entry points:
// - hubSearchInput(q)  — inline search on Hub
// - openGlobalSearch() — modal search (Ctrl+K / Cmd+K)
// - performGlobalSearch(q) — core engine, returns grouped results
// ══════════════════════════════════════════════════════════

const GS_GROUPS = [
  { key: 'affiliates', name: 'Afiliados', icon: 'users', color: '#ec4899' },
  { key: 'brands',     name: 'Marcas',    icon: 'tag',         color: '#a855f7' },
  { key: 'contracts',  name: 'Contratos', icon: 'file-text',   color: '#10b981' },
  { key: 'payments',   name: 'Pagamentos', icon: 'banknote',   color: '#f59e0b' },
  { key: 'closings',   name: 'Fechamentos', icon: 'file-check', color: '#3b82f6' },
  { key: 'tasks',      name: 'Tarefas',   icon: 'check-square', color: '#06b6d4' },
  { key: 'reports',    name: 'Lançamentos', icon: 'activity',  color: '#6366f1' },
  { key: 'users',      name: 'Usuários',  icon: 'shield',      color: '#ef4444' },
];

// Core search: returns { results: {key: []}, total: N }
window.performGlobalSearch = (query) => {
  const q = (query || '').trim().toLowerCase();
  const empty = { results: {}, total: 0 };
  if (!q) return empty;

  const terms = q.split(/\s+/).filter(Boolean);
  // AND semantics: all terms must appear in combined text
  const matches = (...fields) => {
    const combined = fields.filter(Boolean).map(String).join(' ').toLowerCase();
    if (!combined) return false;
    return terms.every(t => combined.includes(t));
  };

  const results = {};
  GS_GROUPS.forEach(g => { results[g.key] = []; });

  // ── AFFILIATES ──
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

  // ── BRANDS ──
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

  // ── CONTRACTS ──
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

  // ── PAYMENTS ──
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

  // ── CLOSINGS ──
  (STATE.closings || []).forEach(c => {
    const ct = (typeof CONTRACT_TYPES !== 'undefined' ? CONTRACT_TYPES[c.contractType]?.label : '') || '';
    if (matches('fechamento', c.affiliateName, c.brand, c.monthLabel, ct, c.createdBy, c.commission, c.paymentStatus, c.id, c.createdAt)) {
      results.closings.push({
        title: `${c.affiliateName} · ${c.brand}`,
        subtitle: `${c.monthLabel}${ct ? ' · ' + ct : ''} · ${c.ftds} FTDs${c.createdBy ? ' · por ' + c.createdBy : ''}`,
        meta: fc(c.commission),
        status: c.paymentStatus,
        action: `closeGlobalSearch();openMod('payments');setTimeout(()=>{const tab=document.querySelector('[onclick*=\\'closing\\']');if(tab)tab.click();},320)`,
      });
    }
  });

  // ── TASKS ──
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

  // ── REPORTS (daily data) ──
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

  // ── USERS ──
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

// Highlight matched terms in a string
function gsHighlight(text, query) {
  if (!text || !query) return text || '';
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return text;
  let out = String(text);
  terms.forEach(t => {
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    out = out.replace(re, '<mark class="gs-hl">$1</mark>');
  });
  return out;
}
window.gsHighlight = gsHighlight;

// Render HTML for the results panel (used by both hub + modal)
window.renderGlobalSearchResults = (query, limit = 5) => {
  const { results, total } = performGlobalSearch(query);

  if (!query.trim()) {
    return `<div class="gs-hint">
      <div class="gs-hint-title">Buscar em tudo</div>
      <div class="gs-hint-desc">Digite nome, email, valor, status, marca, ID de contrato, responsável... qualquer coisa.</div>
      <div class="gs-hint-examples">
        <span>fechamento fmg</span>
        <span>vupi março</span>
        <span>pendente</span>
        <span>R$ 90</span>
      </div>
    </div>`;
  }

  if (!total) {
    return `<div class="gs-empty"><i data-lucide="search-x"></i><p>Nenhum resultado para "<strong>${query}</strong>"</p></div>`;
  }

  let html = `<div class="gs-total">${total} resultado${total > 1 ? 's' : ''}</div>`;

  GS_GROUPS.forEach(g => {
    const items = results[g.key];
    if (!items || !items.length) return;
    html += `<div class="gs-group">
      <div class="gs-group-hdr">
        <i data-lucide="${g.icon}" style="stroke:${g.color}"></i>
        <span class="gs-group-name">${g.name}</span>
        <span class="gs-count" style="background:${g.color}15;color:${g.color}">${items.length}</span>
      </div>
      <div class="gs-group-items">
        ${items.slice(0, limit).map(item => `
          <div class="gs-item" onclick="${item.action}">
            <div class="gs-icon" style="background:${item.color || g.color}15;color:${item.color || g.color}"><i data-lucide="${g.icon}"></i></div>
            <div class="gs-info">
              <div class="gs-label">${gsHighlight(item.title, query)}</div>
              <div class="gs-sub">${gsHighlight(item.subtitle || '', query)}</div>
            </div>
            ${item.meta ? `<div class="gs-meta">${item.meta}</div>` : ''}
            ${item.status ? `<span class="pb pb-${item.status}" style="margin-left:6px">${typeof pl==='function'?pl(item.status):item.status}</span>` : ''}
          </div>
        `).join('')}
        ${items.length > limit ? `<div class="gs-more">+${items.length - limit} mais em ${g.name}</div>` : ''}
      </div>
    </div>`;
  });

  return html;
};

// ═══════════════ HUB INLINE SEARCH ═══════════════
let _gsInputTimer = null;
window.hubSearchInput = (value) => {
  clearTimeout(_gsInputTimer);
  _gsInputTimer = setTimeout(() => {
    const el = document.getElementById('hub-search-results');
    if (!el) return;
    el.innerHTML = renderGlobalSearchResults(value, 5);
    el.classList.add('open');
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }, 120);
};

window.showHubSearchResults = () => {
  const el = document.getElementById('hub-search-results');
  const input = document.getElementById('hub-global-search');
  if (!el) return;
  el.innerHTML = renderGlobalSearchResults(input?.value || '', 5);
  el.classList.add('open');
  if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.hideHubSearchResults = () => {
  const el = document.getElementById('hub-search-results');
  if (el) el.classList.remove('open');
};

window.clearHubSearch = () => {
  const input = document.getElementById('hub-global-search');
  if (input) input.value = '';
  hideHubSearchResults();
};

// ═══════════════ MODAL SEARCH (Ctrl+K) ═══════════════
window.openGlobalSearch = () => {
  // If we're on the Hub, focus the inline search instead
  const hubVisible = document.getElementById('hub')?.style?.display === 'flex';
  if (hubVisible) {
    const input = document.getElementById('hub-global-search');
    if (input) {
      input.focus();
      input.select();
      showHubSearchResults();
      return;
    }
  }

  openModal('Busca Global', `
    <div style="margin-bottom:14px">
      <input class="fi" id="gs-input" placeholder="Digite nome, email, valor, status, marca..." style="font-size:14px;padding:12px 14px" autofocus>
    </div>
    <div id="gs-results" class="gs-modal-results">
      ${renderGlobalSearchResults('', 8)}
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Fechar (Esc)</button>`);
  if (typeof lucide !== 'undefined') lucide.createIcons();
  setTimeout(() => {
    const input = document.getElementById('gs-input');
    if (input) {
      input.focus();
      input.addEventListener('input', (e) => {
        const el = document.getElementById('gs-results');
        if (el) {
          el.innerHTML = renderGlobalSearchResults(e.target.value, 8);
          if (typeof lucide !== 'undefined') lucide.createIcons();
        }
      });
    }
  }, 50);
};

window.closeGlobalSearch = () => {
  // Called from search result click handlers. Closes either the modal
  // or the hub dropdown depending on which is open.
  const modalOv = document.getElementById('modal-ov');
  if (modalOv?.classList.contains('open')) closeModal();
  hideHubSearchResults();
  const hubInput = document.getElementById('hub-global-search');
  if (hubInput) hubInput.value = '';
};

// ═══════════════ KEYBOARD SHORTCUT (Ctrl+K / Cmd+K) ═══════════════
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K opens global search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    openGlobalSearch();
  }
  // Escape closes hub dropdown
  if (e.key === 'Escape') {
    const hubResults = document.getElementById('hub-search-results');
    if (hubResults?.classList.contains('open')) {
      hideHubSearchResults();
      document.getElementById('hub-global-search')?.blur();
    }
  }
});

// Click outside the hub search closes the dropdown
document.addEventListener('click', (e) => {
  const wrap = document.querySelector('.hub-search-wrap');
  if (!wrap) return;
  if (!wrap.contains(e.target)) hideHubSearchResults();
});
