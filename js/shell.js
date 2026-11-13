// ══════════════════════════════════════════════════════════
// SHELL 3C — sidebar fixa + universos por marca
// ══════════════════════════════════════════════════════════
// A sidebar fica sempre à esquerda (no celular vira gaveta):
//   · Início (hub)
//   · Marcas: cada produto (Chute, Rips, Sortudão...) é um "universo", escolhido
//     pelos cartões do Início (a sidebar mostra o bloco da marca só dentro dela).
//     Entrar numa marca troca a identidade da tela inteira (cores
//     e logo oficiais, via html[data-brand]) e prende os módulos daquela
//     marca nela: Dashboard, Pipeline, Parceiros e Calendário.
//   · 3C: módulos gerais, sempre com a identidade neutra da 3C
//     (Dashboard, Contatos, Pipeline B2B/B2C, Calendário geral, Tarefas,
//     Configurações).
// A marca ativa fica em sessionStorage ('3c_brand') e é lida pelos módulos
// via window.brandId() / window.brandProduct() / window.brandScope().
// Os temas (tokens CSS) moram no fim de css/styles.css ("Universos").
// ══════════════════════════════════════════════════════════
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // Marcas com tema oficial. Chave = nome do produto sem acento.
  // Produto novo sem entrada aqui ganha o tema "custom" (cor do cadastro).
  // accent = cor de acento oficial (conferida no site da marca), usada em fios,
  // marcadores e no "Entrar". logoDark = versão para fundo claro, quando o logo é branco.
  const BRANDS = {
    chute: { slug: 'chute', logo: 'assets/brands/chute/logo.webp', accent: '#F2FC40' },
    rips: { slug: 'rips', logo: 'assets/brands/rips/logo.svg', logoDark: 'assets/brands/rips/logo-tinta.svg', accent: '#5FF3E4' },
    sortudao: { slug: 'sortudao', logo: 'assets/brands/sortudao/logo.webp', accent: '#4FD554' },
  };
  const brandMeta = (p) => BRANDS[fold(p?.name)] || { slug: 'custom', logo: p?.logo_url || '', accent: window.prodColor ? prodColor(p) : (p?.color || '#888') };
  window.brandAccent = (p) => brandMeta(p).accent;

  // Módulos de cada lado. Permissão por usuário continua valendo (users.js).
  const BRAND_MODS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-column' },
    { id: 'pipeline', label: 'Pipeline', icon: 'git-branch', needsScope: true },
    { id: 'partners', label: 'Parceiros', icon: 'handshake' },
    { id: 'calendar', label: 'Calendário', icon: 'calendar-days' },
  ];
  const GENERAL_MODS = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart-column', sub: 'Todas as marcas' },
    { id: 'contacts', label: 'Contatos', icon: 'contact-round' },
    { id: 'pipeline', label: 'Pipeline', icon: 'git-branch', sub: 'B2B · B2C' },
    { id: 'calendar', label: 'Calendário', icon: 'calendar-days', sub: 'Todas as marcas' },
    { id: 'tasks', label: 'Tarefas', icon: 'check-square' },
    { id: 'settings', label: 'Configurações', icon: 'settings' },
  ];
  // Módulos que só existem no 3C: abrir um deles sai do universo.
  const GENERAL_ONLY = new Set(['contacts', 'tasks', 'settings', 'audit', 'users', 'backup']);

  const products = () => (STATE.crm?.products || []).filter(p => p.status !== 'inactive');
  const canSee = (id) => {
    const u = STATE.user; if (!u) return false;
    return u.role === 'admin' || (u.modules || []).includes(id);
  };

  // ── Estado da marca ───────────────────────────────────────
  let _brand = sessionStorage.getItem('3c_brand') || '';
  window.brandId = () => _brand || '';
  window.brandProduct = () => (_brand ? (STATE.crm?.products || []).find(p => p.id === _brand) || null : null);
  window.brandMeta = (p) => brandMeta(p || window.brandProduct());
  // Pipeline da marca: existe quando há etapas com o slug do produto (migration 005)
  const scopeOf = (p) => { const sc = fold(p?.name).replace(/[^a-z0-9]+/g, '_'); return sc && (STATE.crm?.stages || []).some(s => s.scope === sc) ? sc : null; };
  window.brandScope = () => { const p = window.brandProduct(); return p ? scopeOf(p) : null; };

  function _setBrand(id) {
    _brand = id || '';
    if (_brand) sessionStorage.setItem('3c_brand', _brand); else sessionStorage.removeItem('3c_brand');
    applyBrand();
  }

  function applyBrand() {
    const root = document.documentElement;
    const p = window.brandProduct();
    if (_brand && !p && STATE.crm?.loaded) { _brand = ''; sessionStorage.removeItem('3c_brand'); }
    if (p) {
      root.setAttribute('data-brand', brandMeta(p).slug);
      root.style.setProperty('--brand-c', brandMeta(p).accent);
    } else {
      root.removeAttribute('data-brand');
      root.style.removeProperty('--brand-c');
    }
    renderSide();
  }
  window.applyBrand = applyBrand;

  // ── Navegação ─────────────────────────────────────────────
  const _openMod = window.openMod;
  const _goBack = window.goBack;
  let _active = sessionStorage.getItem('3cos_activeMod') || 'hub';

  window.openMod = (id) => {
    if (GENERAL_ONLY.has(id) && _brand) _setBrand('');
    // Marca sem pipeline própria: a Pipeline aberta é a geral (B2B/B2C)
    if (id === 'pipeline' && _brand && STATE.crm?.loaded && !window.brandScope()) _setBrand('');
    _active = id;
    _openMod(id);
    renderSide();
    closeMobSidebar();
  };
  window.goBack = () => {
    _active = 'hub';
    if (_brand) _setBrand('');
    _goBack();
    renderSide();
    closeMobSidebar();
  };
  // Entra no universo da marca (abre Parceiros por padrão)
  window.enterBrand = (id, mod) => {
    _setBrand(id);
    const first = mod || BRAND_MODS.find(m => canSee(m.id) && (!m.needsScope || window.brandScope()))?.id || 'partners';
    window.openMod(first);
  };
  // Nome do funil: B2B/B2C ou o nome do produto
  window.scopeLabel = (sc) => {
    if (sc === 'b2b' || sc === 'b2c') return sc.toUpperCase();
    const p = (STATE.crm?.products || []).find(x => fold(x.name).replace(/[^a-z0-9]+/g, '_') === sc);
    return p ? p.name : sc;
  };
  // Abre a pipeline certa: a do produto (dentro do universo) ou a geral (B2B/B2C)
  window.openPipeline = (scope, then) => {
    const p = (STATE.crm?.products || []).find(x => fold(x.name).replace(/[^a-z0-9]+/g, '_') === scope);
    if (p) window.enterBrand(p.id, 'pipeline'); else window.go3C('pipeline');
    setTimeout(() => { if (!p && window._pcrmSwitchTab) _pcrmSwitchTab(scope); if (then) then(); }, 450);
  };
  // Módulo geral do 3C (sai de qualquer universo)
  window.go3C = (id) => { if (_brand) _setBrand(''); window.openMod(id); };

  // ── Sidebar ───────────────────────────────────────────────
  function renderSide() {
    const nav = document.getElementById('side-nav');
    if (!nav || !STATE.user) return;
    const item = (on, onclick, icon, label, sub, extra = '') =>
      `<button class="side-item${on ? ' on' : ''}" onclick="${onclick}" title="${label}"${on ? ' aria-current="page"' : ''}>
        <i data-lucide="${icon}"></i><span class="side-item-t">${label}${sub ? `<small>${sub}</small>` : ''}</span>${extra}</button>`;

    // A sidebar é só da 3C. As marcas são escolhidas no Início (cartões); dentro de
    // uma marca, o bloco dela aparece no topo com os módulos do universo.
    let h = '';
    const bp = window.brandProduct();
    if (bp) {
      const meta = brandMeta(bp);
      const logo = meta.logo || bp.logo_url;
      h += `<div class="side-universe" style="--pc:${meta.accent}">
        <div class="side-universe-head">
          <span class="side-universe-logo">${logo ? `<img src="${esc(logo)}" alt="${esc(bp.name)}">` : `<b>${esc(bp.name)}</b>`}</span>
          <button class="side-universe-x" onclick="goBack()" title="Sair do universo ${esc(bp.name)} e voltar ao Início"><i data-lucide="x"></i></button>
        </div>
        ${BRAND_MODS.filter(m => canSee(m.id) && (!m.needsScope || scopeOf(bp)))
          .map(m => `<button class="side-subitem${_active === m.id ? ' on' : ''}" title="${m.label}" onclick="enterBrand('${bp.id}','${m.id}')"${_active === m.id ? ' aria-current="page"' : ''}><i data-lucide="${m.icon}"></i>${m.label}</button>`).join('')}
      </div>`;
    }

    h += item(_active === 'hub', 'goBack()', 'house', 'Início', products().length ? 'Marcas' : '');
    const gen = GENERAL_MODS.filter(m => canSee(m.id));
    if (gen.length) {
      h += '<div class="side-lbl">3C</div>';
      h += gen.map(m => item(!_brand && _active === m.id, `go3C('${m.id}')`, m.icon, m.label, m.sub)).join('');
    }
    nav.innerHTML = h;

    const foot = document.getElementById('side-foot');
    if (foot) {
      const u = STATE.user;
      foot.innerHTML = `<div class="side-user">
          <span class="side-av">${window.userAvatar ? userAvatar(u, 30) : esc((u.name || '?')[0])}</span>
          <span class="side-user-t"><b>${esc(u.name || '')}</b><small>${esc(u.title || (window.ROLES?.[u.role]?.label) || u.role || '')}</small></span>
        </div>
        <div class="side-foot-btns">
          <button onclick="toggleTheme();renderSide()" title="Alternar tema claro/escuro"><i data-lucide="${document.documentElement.getAttribute('data-theme') === 'light' ? 'moon' : 'sun'}"></i></button>
          <button onclick="toggleActionCenter()" title="Alertas"><i data-lucide="bell"></i></button>
          <button onclick="doLogout()" title="Sair"><i data-lucide="log-out"></i></button>
        </div>`;
    }
    _bottomNav();
    if (window.lucide) lucide.createIcons();
  }
  window.renderSide = renderSide;

  // Barra inferior do celular
  function _bottomNav() {
    const k = _brand ? 'menu' : _active;
    document.querySelectorAll('#mob-bottom-nav .mob-bnav-item').forEach(b => b.classList.toggle('active', b.dataset.k === k));
  }
  window.updateBottomNav = () => _bottomNav();

  // Gaveta no celular (substitui a sidebar móvel antiga)
  window.openMobSidebar = () => {
    renderSide();
    document.documentElement.classList.add('side-open');
  };
  window.closeMobSidebar = () => document.documentElement.classList.remove('side-open');

  // ── Sidebar minimizada (só ícones), lembrada neste navegador ──
  const _miniKey = '3c_side_mini';
  function _applyMini(on) {
    document.documentElement.classList.toggle('side-mini', on);
    const b = document.getElementById('side-collapse');
    if (b) {
      b.title = on ? 'Expandir menu' : 'Minimizar menu';
      b.setAttribute('aria-label', b.title);
      b.innerHTML = `<i data-lucide="${on ? 'panel-left-open' : 'panel-left-close'}"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }
  window.toggleSideMini = () => {
    const on = !document.documentElement.classList.contains('side-mini');
    try { localStorage.setItem(_miniKey, on ? '1' : '0'); } catch (_) {}
    _applyMini(on);
    // gráficos e kanban recalculam a largura
    setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
  };
  try { _applyMini(localStorage.getItem(_miniKey) === '1'); } catch (_) {}

  // ── Logado? (mostra a sidebar só fora do login) ───────────
  function _syncSignedIn() {
    const hidden = (id) => { const el = document.getElementById(id); return !el || getComputedStyle(el).display === 'none'; };
    const on = !!STATE.user && hidden('lock') && hidden('reset-screen');
    const was = document.documentElement.classList.contains('signed-in');
    document.documentElement.classList.toggle('signed-in', on);
    if (on && !was) applyBrand();
    if (!on) { document.documentElement.removeAttribute('data-brand'); closeMobSidebar(); }
  }
  function _boot() {
    const mo = new MutationObserver(_syncSignedIn);
    ['lock', 'reset-screen', 'hub'].forEach(id => { const el = document.getElementById(id); if (el) mo.observe(el, { attributes: true, attributeFilter: ['style'] }); });
    _syncSignedIn();
    try { _applyMini(localStorage.getItem(_miniKey) === '1'); } catch (_) {}
    // Produtos chegam depois do login: redesenha a sidebar quando o CRM carregar
    // F5 dentro de uma marca: o módulo abre antes de os produtos/etapas chegarem
    // (sem logo e com a pipeline geral). Quando os dados chegam, reabre uma vez.
    let tries = 0, reopened = false;
    const wait = setInterval(() => {
      tries++;
      if (STATE.crm?.loaded) {
        applyBrand();
        if (!reopened && _brand && window.brandProduct() && _active !== 'hub' && BRAND_MODS.some(m => m.id === _active)) {
          reopened = true;
          const hdr = document.querySelector('.mod.active .mod-hdr');
          if (hdr && !hdr.querySelector('.mod-hdr-brand')) window.openMod(_active);
        }
      }
      if ((STATE.crm?.loaded && STATE.crm?.ptnLoaded) || tries > 40) clearInterval(wait);
    }, 500);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobSidebar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot); else _boot();
})();
