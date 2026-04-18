// ══════════════════════════════════════════════════════════
// 5. TASKS
// ══════════════════════════════════════════════════════════
let _tkF=null;
function bTasks(el){
  el.innerHTML=modHdr('Tarefas — Workflow')+`<div class="mod-body">
    ${heroHTML('tasks','Workflow','Tarefas','Atividades vinculadas a afiliados e módulos')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Todas as tarefas</div>
        <button class="btn btn-theme" onclick="openNewTask()"><i data-lucide="plus"></i>Nova Tarefa</button></div>
      <div class="pills">
        <button class="pill on" onclick="pilTk(null,this)">Todas</button>
        <button class="pill" onclick="pilTk('pendente',this)">Pendentes</button>
        <button class="pill" onclick="pilTk('em andamento',this)">Em andamento</button>
        <button class="pill" onclick="pilTk('concluída',this)">Concluídas</button>
      </div>
      <div class="tk-list" id="tk-list"></div>
    </div></div>`;
  renderTasks(STATE.tasks);
}
function renderTasks(list){
  const el=document.getElementById('tk-list');if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty"><i data-lucide="check-square"></i><p>Nenhuma tarefa</p></div>';lucide.createIcons();return;}
  el.innerHTML=list.map(t=>{
    const aff=STATE.affiliates.find(a=>a.id===t.affiliateId);
    const canEdit = STATE.user.role === 'admin' || t.assignee === STATE.user.name;
    return `<div class="tk ${t.priority==='alta'?'pa':t.priority==='média'?'pm':'pb2'}">
      <div class="tk-top">
        <div class="tk-row">
          <button class="tk-chk ${t.status==='concluída'?'dn':''}" onclick="toggleTask('${t.id}')">
            ${t.status==='concluída'?'<i data-lucide="check" style="width:11px;height:11px"></i>':''}
          </button>
          <span class="tk-ttl ${t.status==='concluída'?'dn':''}">${t.title}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="pri pri-${t.priority[0]==='a'?'a':t.priority[0]==='m'?'m':'b'}">${t.priority.toUpperCase()}</span>
          ${canEdit ? `
          <div class="tk-acts">
            <button class="ibt" onclick="openEditTask('${t.id}')" data-tooltip="Editar tarefa"><i data-lucide="edit-2"></i></button>
            <button class="ibt danger" onclick="confirmRemoveTask('${t.id}')" data-tooltip="Excluir tarefa"><i data-lucide="trash-2"></i></button>
          </div>` : ''}
        </div>
      </div>
      ${t.description ? `<div class="tk-desc">${t.description}</div>` : ''}
      ${(t.subtasks&&t.subtasks.length)?`<div style="padding-left:27px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <div style="flex:1;height:4px;background:var(--bg3);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${Math.round(t.subtasks.filter(s=>s.done).length/t.subtasks.length*100)}%;background:linear-gradient(90deg,#ec4899,#a855f7);border-radius:3px;transition:width 0.3s"></div>
          </div>
          <span style="font-size:9px;font-weight:700;color:var(--text2)">${t.subtasks.filter(s=>s.done).length}/${t.subtasks.length}</span>
        </div>
        ${t.subtasks.map(s=>`<div style="display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer" onclick="toggleSubtask('${t.id}','${s.id}')">
          <div style="width:14px;height:14px;border-radius:4px;border:1.5px solid ${s.done?'var(--theme)':'var(--gb2)'};background:${s.done?'var(--theme)':'transparent'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s">
            ${s.done?'<i data-lucide="check" style="width:8px;height:8px;stroke:#fff"></i>':''}
          </div>
          <span style="font-size:11px;${s.done?'text-decoration:line-through;color:var(--text3)':'color:var(--text)'}">${s.text}</span>
        </div>`).join('')}
        <button onclick="promptAddSubtask('${t.id}')" style="margin-top:4px;background:none;border:1px dashed var(--gb2);border-radius:6px;padding:3px 10px;font-size:9px;color:var(--text3);cursor:pointer;width:100%">+ Subtarefa</button>
      </div>`:canEdit?`<div style="padding-left:27px;margin-bottom:6px"><button onclick="promptAddSubtask('${t.id}')" style="background:none;border:1px dashed var(--gb2);border-radius:6px;padding:3px 10px;font-size:9px;color:var(--text3);cursor:pointer">+ Subtarefa</button></div>`:''}
      ${aff?`<div class="tk-linked" onclick="openAffDetail('${aff.id}')"><i data-lucide="user"></i>${aff.name}</div>`:''}
      <div class="tk-ft">
        <div style="display:flex;gap:12px">
          <div class="tk-as">${t.assignee?userAvatar(t.assignee,20):'<i data-lucide="user"></i>'}<span>${t.assignee||'—'}</span></div>
          ${t.dueDate?`<div class="tk-du" style="${od(t.dueDate,t.status==='concluída'?'pago':'pendente')?'color:var(--red)':''}"><i data-lucide="calendar"></i>${new Date(t.dueDate).toLocaleDateString('pt-BR')}</div>`:''}
        </div>
        ${t.linkedModule?`<button class="btn btn-outline" style="padding:4px 10px;font-size:9px" onclick="openMod('${t.linkedModule}')">Abrir Módulo <i data-lucide="external-link" style="width:10px;height:10px;margin-left:2px"></i></button>`:''}
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}
window.promptAddSubtask=(taskId)=>{
  const text=prompt('Nome da subtarefa:');
  if(!text||!text.trim())return;
  const t=STATE.tasks.find(x=>x.id===taskId);if(!t)return;
  if(!t.subtasks)t.subtasks=[];
  t.subtasks.push({id:'st'+Date.now(),text:text.trim(),done:false});
  saveToLocal();renderTasks(_tkF?STATE.tasks.filter(x=>x.status===_tkF):STATE.tasks);
};
window.toggleSubtask=(taskId,subId)=>{
  const t=STATE.tasks.find(x=>x.id===taskId);if(!t||!t.subtasks)return;
  const s=t.subtasks.find(x=>x.id===subId);if(s)s.done=!s.done;
  saveToLocal();renderTasks(_tkF?STATE.tasks.filter(x=>x.status===_tkF):STATE.tasks);
};
window.toggleTask=id=>{const t=STATE.tasks.find(x=>x.id===id);if(!t)return;t.status=t.status==='concluída'?'pendente':'concluída';logAction('Tarefa '+(t.status==='concluída'?'concluída':'reaberta'),t.title);saveToLocal();renderTasks(_tkF?STATE.tasks.filter(x=>x.status===_tkF):STATE.tasks);toast(t.status==='concluída'?'Concluída!':'Reaberta');};
window.pilTk=(s,btn)=>{_tkF=s;btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderTasks(s?STATE.tasks.filter(t=>t.status===s):STATE.tasks);};

window.openNewTask=()=>openModal('Nova Tarefa',`<div class="fg">
  <div class="fgp ff"><label>Título *</label><input class="fi" id="nt-t" placeholder="O que precisa ser feito?"></div>
  <div class="fgp ff"><label>Descrição (Opcional)</label><textarea class="fi" id="nt-desc" rows="2" placeholder="Instruções, links ou detalhes adicionais..."></textarea></div>
  <div class="fgp"><label>Delegar para (Responsável)</label>
    <select class="fi" id="nt-r">
      ${STATE.users.map(u=>`<option value="${u.name}" ${u.id===STATE.user.id?'selected':''}>${u.name}</option>`).join('')}
    </select>
  </div>
  <div class="fgp"><label>Módulo Relacionado</label>
    <select class="fi" id="nt-mod">
      <option value="">Nenhum</option>
      <option value="payments">Financeiro (Pagamentos)</option>
      <option value="affiliates">Afiliados (CRM)</option>
      <option value="brands">Marcas Parceiras</option>
      <option value="dashboard">Dashboard</option>
    </select>
  </div>
  <div class="fgp"><label>Afiliado Vinculado</label><select class="fi" id="nt-a"><option value="">Nenhum</option>${STATE.affiliates.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}</select></div>
  <div class="fgp"><label>Prioridade</label><select class="fi" id="nt-p"><option>alta</option><option selected>média</option><option>baixa</option></select></div>
  <div class="fgp"><label>Data limite</label><input class="fi" id="nt-d" type="date"></div>
</div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
  <button class="btn btn-theme" onclick="saveTask()">Criar tarefa</button>`);

window.saveTask=()=>{
  const title=document.getElementById('nt-t')?.value.trim();
  if(!title){toast('Título obrigatório','e');return;}
  const t={
    id:'tk'+Date.now(),
    title,
    description:document.getElementById('nt-desc')?.value.trim()||'',
    linkedModule:document.getElementById('nt-mod')?.value||'',
    affiliateId:document.getElementById('nt-a')?.value||'',
    priority:document.getElementById('nt-p')?.value||'média',
    assignee:document.getElementById('nt-r')?.value||'',
    dueDate:document.getElementById('nt-d')?.value||'',
    status:'pendente'
  };
  STATE.tasks.unshift(t);logAction('Tarefa criada',title);saveToLocal();
  closeModal();renderTasks(STATE.tasks);toast('Tarefa criada!');
  updateActionCenter();
};

window.openEditTask = id => {
  const t = STATE.tasks.find(x => x.id === id);
  if(!t) return;
  openModal('Editar Tarefa', `<div class="fg">
    <div class="fgp ff"><label>Título *</label><input class="fi" id="et-t" value="${t.title}"></div>
    <div class="fgp ff"><label>Descrição</label><textarea class="fi" id="et-desc" rows="2">${t.description}</textarea></div>
    <div class="fgp"><label>Delegar para (Responsável)</label>
      <select class="fi" id="et-r">
        ${STATE.users.map(u => `<option value="${u.name}" ${u.name === t.assignee ? 'selected' : ''}>${u.name}</option>`).join('')}
      </select>
    </div>
    <div class="fgp"><label>Status</label>
      <select class="fi" id="et-s">
        <option value="pendente" ${t.status === 'pendente' ? 'selected' : ''}>Pendente</option>
        <option value="em andamento" ${t.status === 'em andamento' ? 'selected' : ''}>Em andamento</option>
        <option value="concluída" ${t.status === 'concluída' ? 'selected' : ''}>Concluída</option>
      </select>
    </div>
    <div class="fgp"><label>Prioridade</label>
      <select class="fi" id="et-p">
        <option value="alta" ${t.priority === 'alta' ? 'selected' : ''}>Alta</option>
        <option value="média" ${t.priority === 'média' ? 'selected' : ''}>Média</option>
        <option value="baixa" ${t.priority === 'baixa' ? 'selected' : ''}>Baixa</option>
      </select>
    </div>
    <div class="fgp"><label>Data limite</label><input class="fi" id="et-d" type="date" value="${t.dueDate}"></div>
  </div>`, `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveEditTask('${id}')"><i data-lucide="save"></i> Salvar Alterações</button>`);
};

window.saveEditTask = id => {
  const t = STATE.tasks.find(x => x.id === id);
  if(!t) return;
  t.title = document.getElementById('et-t').value.trim() || t.title;
  t.description = document.getElementById('et-desc').value.trim();
  t.assignee = document.getElementById('et-r').value;
  t.status = document.getElementById('et-s').value;
  t.priority = document.getElementById('et-p').value;
  t.dueDate = document.getElementById('et-d').value;
  logAction('Tarefa editada', t.title);
  closeModal();
  renderTasks(_tkF?STATE.tasks.filter(x=>x.status===_tkF):STATE.tasks);
  toast('Tarefa atualizada!');
  saveToLocal();
};

window.confirmRemoveTask = id => {
  openModal('Excluir Tarefa', '<p style="color:var(--text2);font-size:13px">Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita.</p>',
  `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-danger" onclick="removeTask('${id}')">Excluir</button>`);
};

window.removeTask = id => {
  const idx = STATE.tasks.findIndex(x => x.id === id);
  if(idx > -1) {
    logAction('Tarefa excluída', STATE.tasks[idx].title);
    STATE.tasks.splice(idx, 1);
    closeModal();
    renderTasks(_tkF?STATE.tasks.filter(x=>x.status===_tkF):STATE.tasks);
    toast('Tarefa excluída!');
    saveToLocal();
  }
};

