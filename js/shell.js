// ══════════════════════════════════════════════════════════
// SHELL 3C — sidebar fixa + universos por marca
// ══════════════════════════════════════════════════════════
// A sidebar fica sempre à esquerda (no celular vira gaveta):
//   · Início (hub)
//   · Marcas: cada produto (Chute, Rips, Sortudão...) é um "universo".
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
  const BRANDS = {
    chute: { slug: 'chute', logo: 'assets/brands/chute/logo.webp' },
    rips: { slug: 'rips', logo: 'assets/brands/rips/logo.svg' },
    sortudao: { slug: 'sortudao', logo: 'assets/brands/sortudao/logo.webp' },
  };
  const brandMeta = (p) => BRANDS[fold(p?.name)] || { slug: 'custom', logo: p?.logo_url || '' };

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
      root.style.setProperty('--brand-c', window.prodColor ? prodColor(p) : (p.color || '#888'));
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
    if (id === 'pipeline' && _brand && !window.brandScope()) _setBrand('');
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
  function _lateByProduct() {
    const today = new Date(); const t = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const P = STATE.crm?.partners || [], D = STATE.crm?.partnerDeliveries || [];
    const byPartner = new Map(P.filter(p => p.status !== 'ended').map(p => [p.id, p.product_id]));
    const late = new Set();
    D.forEach(d => { if (d.status === 'planned' && d.due_date && d.due_date < t && byPartner.has(d.partner_id)) late.add(byPartner.get(d.partner_id)); });
    return late;
  }

  function renderSide() {
    const nav = document.getElementById('side-nav');
    if (!nav || !STATE.user) return;
    const late = _lateByProduct();
    const item = (on, onclick, icon, label, sub, extra = '') =>
      `<button class="side-item${on ? ' on' : ''}" onclick="${onclick}"${on ? ' aria-current="page"' : ''}>
        <i data-lucide="${icon}"></i><span class="side-item-t">${label}${sub ? `<small>${sub}</small>` : ''}</span>${extra}</button>`;

    let h = item(_active === 'hub', 'goBack()', 'house', 'Início');

    const list = products();
    if (list.length) {
      h += '<div class="side-lbl">Marcas</div>';
      h += list.map(p => {
        const on = _brand === p.id;
        const meta = brandMeta(p);
        const mark = p.logo_url ? `<img src="${esc(p.logo_url)}" alt="">` : `<span class="side-dot"></span>`;
        let sub = '';
        if (on) {
          sub = `<div class="side-sub">${BRAND_MODS
            .filter(m => canSee(m.id) && (!m.needsScope || scopeOf(p)))
            .map(m => `<button class="side-subitem${_active === m.id ? ' on' : ''}" onclick="enterBrand('${p.id}','${m.id}')"><i data-lucide="${m.icon}"></i>${m.label}</button>`).join('')}</div>`;
        }
        return `<div class="side-brand${on ? ' open' : ''}" style="--pc:${window.prodColor ? prodColor(p) : (p.color || '#888')}">
          <button class="side-item side-brand-btn${on ? ' on' : ''}" onclick="enterBrand('${p.id}')" title="Entrar no universo ${esc(p.name)}">
            <span class="side-mark">${mark}</span><span class="side-item-t">${esc(p.name)}</span>${late.has(p.id) ? '<em class="side-late" title="Entrega atrasada">atrasado</em>' : ''}</button>${sub}</div>`;
      }).join('');
    }

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
    const k = _active === 'hub' ? 'hub' : (_brand ? 'brands' : _active);
    document.querySelectorAll('#mob-bottom-nav .mob-bnav-item').forEach(b => b.classList.toggle('active', b.dataset.k === k));
  }
  window.updateBottomNav = () => _bottomNav();

  // Gaveta no celular (substitui a sidebar móvel antiga)
  window.openMobSidebar = () => {
    renderSide();
    document.documentElement.classList.add('side-open');
  };
  window.closeMobSidebar = () => document.documentElement.classList.remove('side-open');

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
    // Produtos chegam depois do login: redesenha a sidebar quando o CRM carregar
    let tries = 0;
    const wait = setInterval(() => {
      tries++;
      if (STATE.crm?.loaded) { applyBrand(); }
      if ((STATE.crm?.loaded && STATE.crm?.ptnLoaded) || tries > 40) clearInterval(wait);
    }, 500);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMobSidebar(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _boot); else _boot();
})();
