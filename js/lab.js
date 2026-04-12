// ══════════════════════════════════════════════════════════
// LAB — Beta Features (Feature Flag System)
// ══════════════════════════════════════════════════════════
// Purpose: opt-in experimental features. Ship risky/new work
// behind flags so users can test without breaking stable flow.
//
// Usage:
//   if (isLab('tags')) { renderTagsSection(); }
//
// Adding a new feature:
//   1. Add key to DEFAULT_STATE.labFlags in app.js
//   2. Add entry to LAB_FEATURES below
//   3. Guard its UI/logic with isLab('key')
//
// Persistence: flags live in STATE.labFlags, synced to Firestore
// via saveToCloud/loadFromCloud in app.js.
// ══════════════════════════════════════════════════════════

const isLab = (flag) => STATE.labFlags?.[flag] === true;
window.isLab = isLab;

const labBadge = () => `<span style="font-size:8px;font-weight:800;letter-spacing:0.1em;padding:2px 6px;border-radius:4px;background:linear-gradient(135deg,#ec4899,#a855f7);color:#fff;margin-left:6px">BETA</span>`;
window.labBadge = labBadge;

const LAB_FEATURES = [
  {key:'tags',icon:'tag',name:'Tags Coloridas',desc:'Labels customizáveis em afiliados (VIP, Em Risco, Top Performer, etc). Ajuda a segmentar e identificar rapidamente.',status:'stable'},
  {key:'lastContact',icon:'clock',name:'Último Contato',desc:'Mostra "há X dias sem contato" em cada card de afiliado — inspiração Pipedrive.',status:'preview'},
  {key:'globalSearch',icon:'search',name:'Busca Global (Cmd+K)',desc:'Busca unificada em afiliados, marcas, pagamentos e tarefas — inspiração Linear/HubSpot.',status:'preview'},
  {key:'smartLists',icon:'list',name:'Smart Lists Dinâmicas',desc:'Filtros vivos: Top 10 por comissão, Em risco, Novos sem fechamento, etc. Atualização automática.',status:'experimental'},
  {key:'nextAction',icon:'check-circle',name:'Activity-Based Selling',desc:'Próxima ação obrigatória em afiliados ativos + dashboard de parados. Coração do Pipedrive.',status:'experimental'},
  {key:'workflows',icon:'zap',name:'Workflow Builder',desc:'Automações IF-THEN: quando X acontecer, faça Y. Inspiração HubSpot/Monday.',status:'experimental'},
];

function renderLabPanel(){
  if(!STATE.labFlags)STATE.labFlags={};
  return `
  <div class="lab-wrap">
    <div class="lab-hdr">
      <div class="lab-hdr-icon"><i data-lucide="zap"></i></div>
      <div>
        <div class="lab-title">Lab — Recursos Experimentais ${labBadge()}</div>
        <div class="lab-sub">Ative recursos novos antes do lançamento oficial. Feedback é bem-vindo!</div>
      </div>
    </div>
    <div class="lab-list">
      ${LAB_FEATURES.map(f=>{
        const active=STATE.labFlags[f.key]===true;
        const statusColor={stable:'#10b981',preview:'#3b82f6',experimental:'#f59e0b'}[f.status];
        const statusLabel={stable:'Estável',preview:'Preview',experimental:'Experimental'}[f.status];
        return `
        <div class="lab-item">
          <div class="lab-item-icon"><i data-lucide="${f.icon}" style="width:16px;height:16px;stroke:var(--text2)"></i></div>
          <div class="lab-item-info">
            <div class="lab-item-name">${f.name}
              <span style="font-size:8px;font-weight:700;letter-spacing:0.09em;text-transform:uppercase;padding:2px 6px;border-radius:4px;background:${statusColor}22;color:${statusColor};border:1px solid ${statusColor}44">${statusLabel}</span>
            </div>
            <div class="lab-item-desc">${f.desc}</div>
          </div>
          <label class="lab-toggle">
            <input type="checkbox" ${active?'checked':''} onchange="toggleLabFlag('${f.key}',this.checked)">
            <span class="lab-toggle-slider"></span>
          </label>
        </div>`;
      }).join('')}
    </div>
    <div class="lab-warn">
      <i data-lucide="alert-triangle" style="width:12px;height:12px;stroke:var(--amber)"></i>
      Recursos em Beta podem conter bugs. Desative se algo quebrar e nos avise.
    </div>
  </div>`;
}
window.renderLabPanel = renderLabPanel;

window.openLabModal = () => {
  openModal('Lab — Recursos Experimentais', renderLabPanel(),
    `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);
  lucide.createIcons();
};

window.toggleLabFlag = (key, value) => {
  if (!STATE.labFlags) STATE.labFlags = {};
  STATE.labFlags[key] = value;
  logAction('[BETA] Lab flag alterada', `${key} = ${value ? 'ON' : 'OFF'}`);
  saveToLocal();
  toast(`${LAB_FEATURES.find(f => f.key === key)?.name}: ${value ? 'ativado' : 'desativado'}`);
  updateLabDot();

  // Re-render current module if affected by this flag
  const currentMod = document.querySelector('.mod.active')?.id?.replace('mod-', '');
  if (currentMod && ['affiliates', 'dashboard', 'pipeline', 'users'].includes(currentMod)) {
    openMod(currentMod);
  }

  // Re-render the Lab modal if it's open (reflect new state)
  const modalOv = document.getElementById('modal-ov');
  const title = document.getElementById('mttl')?.textContent || '';
  if (modalOv?.classList.contains('open') && title.includes('Lab')) {
    document.getElementById('mbd').innerHTML = renderLabPanel();
    lucide.createIcons();
  }
};

window.updateLabDot = () => {
  const anyActive = Object.values(STATE.labFlags || {}).some(v => v === true);
  document.querySelectorAll('.hub-lab-dot,.hdr-lab-dot').forEach(dot => {
    dot.style.display = anyActive ? 'block' : 'none';
  });
};
