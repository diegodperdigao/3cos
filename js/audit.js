// ══════════════════════════════════════════════════════════
// 7. AUDITORIA
// ══════════════════════════════════════════════════════════
let _auditFilter = '';
let _auditCategory = 'all';
let _auditPage = 1;
const _auditPageSize = 40;

// Classifies an audit entry into a category + lucide icon so the
// list shows visual variety instead of a generic shield for everything.
function _auditIconFor(action) {
  const a = (action || '').toLowerCase();
  if (a.includes('login') || a.includes('senha') || a.includes('sessão') || a.includes('logout')) return { icon: 'log-in', cat: 'auth', color: 'var(--blue)' };
  if (a.includes('afiliado')) return { icon: 'user', cat: 'affiliate', color: 'var(--pink)' };
  if (a.includes('marca') || a.includes('brand')) return { icon: 'tag', cat: 'brand', color: 'var(--purple)' };
  if (a.includes('pagamento') || a.includes('fechamento')) return { icon: 'banknote', cat: 'payment', color: 'var(--amber)' };
  if (a.includes('contrato')) return { icon: 'file-text', cat: 'contract', color: 'var(--green)' };
  if (a.includes('tarefa')) return { icon: 'check-square', cat: 'task', color: 'var(--blue)' };
  if (a.includes('pipeline')) return { icon: 'git-branch', cat: 'pipeline', color: 'var(--purple)' };
  if (a.includes('tag')) return { icon: 'hash', cat: 'tag', color: 'var(--pink)' };
  if (a.includes('usuário')) return { icon: 'users', cat: 'user', color: 'var(--blue)' };
  if (a.includes('export')) return { icon: 'download', cat: 'export', color: 'var(--text2)' };
  if (a.includes('import')) return { icon: 'upload', cat: 'import', color: 'var(--amber)' };
  if (a.includes('tema') || a.includes('theme')) return { icon: 'palette', cat: 'theme', color: 'var(--text2)' };
  if (a.includes('nota') || a.includes('comentário')) return { icon: 'message-square', cat: 'note', color: 'var(--text2)' };
  if (a.includes('watchdog') || a.includes('email')) return { icon: 'bell', cat: 'system', color: 'var(--text2)' };
  return { icon: 'activity', cat: 'other', color: 'var(--text3)' };
}

const AUDIT_CATEGORIES = [
  { id: 'all', label: 'Tudo' },
  { id: 'auth', label: 'Acesso' },
  { id: 'affiliate', label: 'Afiliados' },
  { id: 'brand', label: 'Marcas' },
  { id: 'payment', label: 'Financeiro' },
  { id: 'task', label: 'Tarefas' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'export', label: 'Export' },
  { id: 'import', label: 'Import' },
];

function _auditStats() {
  const logs = STATE.auditLog || [];
  const parseT = (s) => {
    if (!s) return null;
    // Format: "dd/mm/aaaa hh:mm:ss" from toLocaleString('pt-BR')
    const [d, t] = s.split(' ');
    if (!d) return null;
    const [day, month, year] = d.split('/');
    return new Date(`${year}-${month}-${day}T${t || '00:00:00'}`);
  };
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week7 = new Date(now.getTime() - 7 * 86400000);
  let todayN = 0, weekN = 0, lastLogin = null;
  logs.forEach(l => {
    const t = parseT(l.time);
    if (!t) return;
    if (t >= today0) todayN++;
    if (t >= week7) weekN++;
    if ((l.action || '').toLowerCase().includes('login')) {
      if (!lastLogin || t > lastLogin.t) lastLogin = { t, user: l.user };
    }
  });
  return { total: logs.length, today: todayN, week: weekN, lastLogin };
}

function bAudit(el){
  const stats = _auditStats();
  const lastLoginTxt = stats.lastLogin
    ? `${stats.lastLogin.user || 'Sistema'} · ${stats.lastLogin.t.toLocaleDateString('pt-BR')}`
    : '—';

  el.innerHTML=modHdr('Auditoria — Log de Atividades')+`<div class="mod-body">
    ${heroHTML('audit','Segurança','Auditoria','Registro imutável de ações')}
    <div class="mod-main">

      <!-- STATS -->
      <div class="kpi-row" style="grid-template-columns:repeat(4,1fr);margin-bottom:18px">
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="activity"></i><span class="kpi-lbl">Total</span></div>
          <div class="kpi-val">${stats.total}</div><div class="kpi-sub">Eventos registrados</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="clock"></i><span class="kpi-lbl">Hoje</span></div>
          <div class="kpi-val">${stats.today}</div><div class="kpi-sub">Ações nas últimas 24h</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="calendar"></i><span class="kpi-lbl">7 dias</span></div>
          <div class="kpi-val">${stats.week}</div><div class="kpi-sub">Ações nesta semana</div></div>
        <div class="kpi"><div class="kpi-icon-row"><i data-lucide="log-in"></i><span class="kpi-lbl">Último login</span></div>
          <div class="kpi-val sm" style="font-size:14px">${lastLoginTxt}</div></div>
      </div>

      <div class="sec-hdr">
        <div class="sec-lbl">Atividade recente</div>
        <div class="sec-actions">
          <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar ação ou detalhe..." value="${_auditFilter}" oninput="setAuditFilter(this.value)"></div>
          <button class="btn btn-outline" onclick="exportCSV('audit')"><i data-lucide="download"></i>Exportar CSV</button>
        </div>
      </div>
      <div class="pills" style="margin-bottom:10px">
        ${AUDIT_CATEGORIES.map(c => `<button class="pill ${_auditCategory === c.id ? 'on' : ''}" onclick="setAuditCategory('${c.id}',this)">${c.label}</button>`).join('')}
      </div>
      <div id="audit-list-wrap" style="background:var(--bg2);border:1px solid var(--gb);border-radius:var(--radius);padding:4px 20px">
        ${_renderAuditList()}
      </div>
    </div></div>`;
  lucide.createIcons();
}

function _renderAuditList() {
  const logs = STATE.auditLog || [];
  const q = _auditFilter.trim().toLowerCase();
  const filtered = logs.filter(a => {
    const meta = _auditIconFor(a.action);
    if (_auditCategory !== 'all' && meta.cat !== _auditCategory) return false;
    if (!q) return true;
    return (a.action || '').toLowerCase().includes(q)
      || (a.detail || '').toLowerCase().includes(q)
      || (a.user || '').toLowerCase().includes(q);
  });
  if (!filtered.length) {
    return '<div class="empty" style="padding:30px 0;text-align:center;color:var(--text3);font-size:12px">Nenhum registro para os filtros atuais.</div>';
  }
  const visible = filtered.slice(0, _auditPage * _auditPageSize);
  const more = filtered.length - visible.length;
  return visible.map(a => {
    const m = _auditIconFor(a.action);
    return `<div class="audit-item">
      <div class="audit-icon" style="background:color-mix(in srgb, ${m.color} 12%, transparent);border-color:color-mix(in srgb, ${m.color} 30%, transparent)">
        <i data-lucide="${m.icon}" style="stroke:${m.color}"></i>
      </div>
      <div class="audit-info" style="flex:1">
        <div class="audit-action">${a.action || ''}</div>
        ${a.detail ? `<div class="audit-detail" style="font-size:11px;color:var(--text2);margin-top:2px">${a.detail}</div>` : ''}
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;font-weight:500;color:var(--text)">${a.user || 'Sistema'}</div>
        <div class="audit-time">${a.time || ''}</div>
      </div>
    </div>`;
  }).join('') + (more > 0 ? `
    <div style="padding:14px 0;text-align:center">
      <button class="btn btn-outline" onclick="loadMoreAudit()"><i data-lucide="chevron-down"></i> Mostrar mais (${more} restantes)</button>
    </div>` : '');
}

window.setAuditFilter = (q) => {
  _auditFilter = q || '';
  _auditPage = 1;
  const wrap = document.getElementById('audit-list-wrap');
  if (wrap) { wrap.innerHTML = _renderAuditList(); lucide.createIcons(); }
};
window.setAuditCategory = (cat, btn) => {
  _auditCategory = cat;
  _auditPage = 1;
  btn?.closest('.pills')?.querySelectorAll('.pill').forEach(p => p.classList.remove('on'));
  btn?.classList.add('on');
  const wrap = document.getElementById('audit-list-wrap');
  if (wrap) { wrap.innerHTML = _renderAuditList(); lucide.createIcons(); }
};
window.loadMoreAudit = () => {
  _auditPage++;
  const wrap = document.getElementById('audit-list-wrap');
  if (wrap) { wrap.innerHTML = _renderAuditList(); lucide.createIcons(); }
};
