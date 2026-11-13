// ══════════════════════════════════════════════════════════
// SHELL 3C — sidebar fixa + universos por marca
// ══════════════════════════════════════════════════════════
// A sidebar fica sempre à esquerda (no celular vira gaveta):
//   · Início (hub)
//   · Marcas: cada produto (Chute, Rips, Sortudão...) é um "universo", escolhido
//     pelos cartões do Início ou na sidebar (discretas; a marca aberta mostra os módulos).
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
    sortudao: { slug: 'sortudao', logo: 'assets/brands/sortudao/logo.webp', accent: '#0BA334' },
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
    { id: 'calendar', label: 'Calendário', icon: 'calendar-days', sub: 'Todas as marcas' },
    { id: 'tasks', label: 'Tarefas', icon: 'check-square' },
    { id: 'settings', label: 'Configurações', icon: 'settings' },
  ];
  // Módulos que só existem no 3C: abrir um deles sai do universo.
  const GENERAL_ONLY = new Set(['contacts', 'tasks', 'settings', 'audit', 'users', 'backup']);

  // Marcas e etapas ficam guardadas no navegador: no F5 a sidebar e o Início já
  // mostram as marcas antes de o CRM inteiro carregar (atualiza quando chega).
  const _cacheKey = '3c_cache_brands';
  const _cached = () => { try { return JSON.parse(localStorage.getItem(_cacheKey) || 'null'); } catch (_) { return null; } };
  window.crmProducts = () => (STATE.crm?.products?.length ? STATE.crm.products : (_cached()?.products || []));
  window.crmStages = () => (STATE.crm?.stages?.length ? STATE.crm.stages : (_cached()?.stages || []));
  function _saveCache() {
    if (!STATE.crm?.loaded || !STATE.crm.products?.length) return;
    try { localStorage.setItem(_cacheKey, JSON.stringify({ products: STATE.crm.products, stages: STATE.crm.stages || [] })); } catch (_) {}
  }
  // Ordem das marcas: Rips, Chute, Sortudão; as outras depois, em ordem alfabética
  const ORDER = ['rips', 'chute', 'sortudao'];
  window.sortProducts = (list) => [...list].sort((a, b) => {
    const ra = ORDER.indexOf(fold(a.name)), rb = ORDER.indexOf(fold(b.name));
    return ((ra < 0 ? 99 : ra) - (rb < 0 ? 99 : rb)) || String(a.name).localeCompare(String(b.name), 'pt-BR');
  });
  const products = () => sortProducts(crmProducts().filter(p => p.status !== 'inactive'));
  const canSee = (id) => {
    const u = STATE.user; if (!u) return false;
    return u.role === 'admin' || (u.modules || []).includes(id);
  };

  // ── Estado da marca ───────────────────────────────────────
  let _brand = sessionStorage.getItem('3c_brand') || '';
  window.brandId = () => _brand || '';
  window.brandProduct = () => (_brand ? crmProducts().find(p => p.id === _brand) || null : null);
  window.brandMeta = (p) => brandMeta(p || window.brandProduct());
  // Pipeline da marca: existe quando há etapas com o slug do produto (migration 005)
  const scopeOf = (p) => { const sc = fold(p?.name).replace(/[^a-z0-9]+/g, '_'); return sc && crmStages().some(s => s.scope === sc) ? sc : null; };
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

  window.openMod = (id, opts) => {
    if (GENERAL_ONLY.has(id) && _brand) _setBrand('');
    // Marca sem pipeline própria: a Pipeline aberta é a geral (B2B/B2C)
    if (id === 'pipeline' && _brand && STATE.crm?.loaded && !window.brandScope()) _setBrand('');
    _active = id;
    _openMod(id, opts);
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

    // Início, depois as marcas (discretas: ícone pequeno + nome; a marca em que
    // você está abre os módulos dela logo abaixo), depois os módulos gerais da 3C.
    let h = item(_active === 'hub', 'goBack()', 'house', 'Início');
    const list = products();
    if (list.length) {
      h += '<div class="side-lbl">Marcas</div>';
      h += list.map(p => {
        const on = _brand === p.id;
        const meta = brandMeta(p);
        const mark = p.logo_url ? `<img src="${esc(p.logo_url)}" alt="">` : `<span class="side-dot"></span>`;
        const subs = on ? `<div class="side-sub">${BRAND_MODS.filter(m => canSee(m.id) && (!m.needsScope || scopeOf(p)))
          .map(m => `<button class="side-subitem${_active === m.id ? ' on' : ''}" title="${m.label}" onclick="enterBrand('${p.id}','${m.id}')"${_active === m.id ? ' aria-current="page"' : ''}><i data-lucide="${m.icon}"></i>${m.label}</button>`).join('')}</div>` : '';
        return `<div class="side-brand${on ? ' open' : ''}" style="--pc:${meta.accent}">
          <button class="side-item side-brand-btn${on ? ' on' : ''}" onclick="enterBrand('${p.id}')" title="${esc(p.name)}">
            <span class="side-mark">${mark}</span><span class="side-item-t">${esc(p.name)}</span></button>${subs}</div>`;
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
          <button onclick="toggleTheme()" title="Alternar tema claro/escuro"><i data-lucide="${document.documentElement.getAttribute('data-theme') === 'light' ? 'moon' : 'sun'}"></i></button>
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

  // ── Tema: só claro e escuro. O botão da sidebar grava a escolha (Configurações) ──
  const _baseToggle = window.toggleTheme;
  window.toggleTheme = () => {
    if (_baseToggle) _baseToggle();
    const light = document.documentElement.getAttribute('data-theme') === 'light';
    if (window.STATE?.settings) { STATE.settings.theme = light ? 'default-light' : 'default-dark'; try { if (typeof saveToLocal === 'function') saveToLocal(); } catch (_) {} }
    renderSide();
  };

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
        _saveCache();
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
