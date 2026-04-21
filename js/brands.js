// ══════════════════════════════════════════════════════════
// NOVO: ADICIONAR MARCA PARCEIRA
// ══════════════════════════════════════════════════════════
window.openNewBrandModal = () => {
  openModal('Nova Marca Parceira', `
    <div class="fg">
      <div class="fgp ff"><label>Nome da Marca *</label>
        <input type="text" class="fi" id="nb-name" placeholder="Ex: Betano">
      </div>
      <div class="fgp ff"><label>URL da Logo (Opcional)</label>
        <input type="text" class="fi" id="nb-logo" placeholder="https://exemplo.com/logo.png">
      </div>
      <div class="fgp"><label>Cor (Hexadecimal) *</label>
        <input type="text" class="fi" id="nb-color" value="#3b82f6" placeholder="#3b82f6">
      </div>
      <div class="fgp"><label>Tipo de Contrato Padrão</label>
        <select class="fi" id="nb-type">
          <option value="standard">CPA + RS Padrão</option>
          <option value="tiered">CPA Escalonado</option>
        </select>
      </div>
      <div class="fgp"><label>CPA Padrão (R$)</label>
        <input type="number" class="fi" id="nb-cpa" placeholder="0">
      </div>
      <div class="fgp"><label>RevShare Padrão (%)</label>
        <input type="number" class="fi" id="nb-rs" placeholder="0">
      </div>
    </div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="saveNewBrand()"><i data-lucide="plus"></i> Adicionar Marca</button>`);
};

window.saveNewBrand = () => {
  const name = document.getElementById('nb-name').value.trim();
  const color = document.getElementById('nb-color').value;
  const type = document.getElementById('nb-type').value;
  const cpa = parseFloat(document.getElementById('nb-cpa').value)||0;
  const rs = parseFloat(document.getElementById('nb-rs').value)||0;
  const logoUrl = document.getElementById('nb-logo').value.trim();

  if(!name) return toast("Nome da marca é obrigatório", "e");
  if(STATE.brands[name]) return toast("Marca já existe", "e");

  const hexToRgb = hex => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}` : '255,255,255';
  };

  const defaultLogo = LOGO;

  STATE.brands[name] = {
    color: color,
    rgb: hexToRgb(color),
    cpa: cpa,
    rs: rs,
    type: type,
    logo: logoUrl || defaultLogo,
    levels: type === 'tiered' ? [{key:'l1',name:'L1',cpa:cpa,baseline:10}] : undefined
  };

  logAction('Marca Adicionada', name);
  saveToLocal();
  closeModal();
  toast('Marca adicionada com sucesso!');
  
  if(document.getElementById('mod-brands').classList.contains('active')) {
     bBrands(document.getElementById('mod-brands'));
  }
};

window.openEditBrand=(name)=>{
  const br=STATE.brands[name];if(!br)return;
  openModal('Editar Marca: '+name,`<div class="fg">
    <div class="fgp ff"><label>Nome (não editável)</label><input class="fi" value="${name}" disabled></div>
    <div class="fgp ff"><label>URL da Logo</label><input type="text" class="fi" id="eb-logo" value="${br.logo||''}"></div>
    <div class="fgp"><label>Cor (Hex)</label><input type="text" class="fi" id="eb-color" value="${br.color}"></div>
    <div class="fgp"><label>CPA Padrão (R$)</label><input type="number" class="fi" id="eb-cpa" value="${br.cpa||0}"></div>
    <div class="fgp"><label>RevShare Padrão (%)</label><input type="number" class="fi" id="eb-rs" value="${br.rs||0}"></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmDeleteBrand('${name}')"><i data-lucide="trash-2"></i> Excluir</button>
    <button class="btn btn-theme" onclick="saveEditBrand('${name}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditBrand=name=>{
  const br=STATE.brands[name];if(!br)return;
  const hexToRgb=hex=>{const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:'255,255,255';};
  br.color=document.getElementById('eb-color')?.value||br.color;
  br.rgb=hexToRgb(br.color);
  br.cpa=parseFloat(document.getElementById('eb-cpa')?.value)||0;
  br.rs=parseFloat(document.getElementById('eb-rs')?.value)||0;
  br.logo=document.getElementById('eb-logo')?.value.trim()||br.logo;
  logAction('Marca editada',name);saveToLocal();closeModal();
  if(document.getElementById('mod-brands').classList.contains('active'))bBrands(document.getElementById('mod-brands'));
  toast('Marca atualizada!');
};

window.confirmDeleteBrand=name=>{
  const affCount=STATE.affiliates.filter(a=>a.deals&&a.deals[name]).length;
  const contractCount=STATE.contracts.filter(c=>c.brand===name).length;
  const warn=affCount||contractCount?`<p style="color:var(--red);font-size:11px;margin-top:8px"><strong>Atenção:</strong> ${affCount} afiliado(s) e ${contractCount} contrato(s) estão vinculados a esta marca.</p>`:'';
  openModal('Excluir Marca',`<p style="color:var(--text2);font-size:13px">Excluir <strong>${name}</strong>? Dados de relatórios e contratos vinculados serão mantidos.</p>${warn}`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-danger" onclick="deleteBrand('${name}')">Excluir</button>`);
};

window.deleteBrand=name=>{
  delete STATE.brands[name];logAction('Marca excluída',name);saveToLocal();closeModal();
  if(document.getElementById('mod-brands').classList.contains('active'))bBrands(document.getElementById('mod-brands'));
  toast('Marca excluída!');
};

// ══════════════════════════════════════════════════════════
// CONTRACTS CRUD
// ══════════════════════════════════════════════════════════
window.openNewContract=(affId)=>{
  const affOptions=STATE.affiliates.map(a=>`<option value="${a.id}" ${a.id===affId?'selected':''}>${a.name}</option>`).join('');
  const brandOptions=Object.keys(STATE.brands).map(b=>`<option value="${b}">${b}</option>`).join('');
  openModal('Novo Contrato',`<div class="fg">
    <div class="fgp"><label>Afiliado *</label><select class="fi" id="nc-aff">${affOptions}</select></div>
    <div class="fgp"><label>Marca *</label><select class="fi" id="nc-brand">${brandOptions}</select></div>
    <div class="fgp ff"><label>Nome do Contrato *</label><input class="fi" id="nc-name" placeholder="Ex: Deal Vupi Q2 2026"></div>
    <div class="fgp"><label>Tipo</label><select class="fi" id="nc-type">
      <option value="cpa">CPA + Rev Share</option>
      <option value="tiered">CPA Escalonado</option>
      <option value="pct_deposit">% de Depósitos</option>
    </select></div>
    <div class="fgp"><label>Valor Total (R$)</label><input type="number" class="fi" id="nc-value" placeholder="0"></div>
    <div class="fgp"><label>Status</label><select class="fi" id="nc-status">
      <option value="ativo">Ativo</option><option value="negociação">Negociação</option><option value="encerrado">Encerrado</option>
    </select></div>
    <div class="fgp"><label>Início</label><input type="date" class="fi" id="nc-start"></div>
    <div class="fgp"><label>Fim</label><input type="date" class="fi" id="nc-end"></div>
    <div class="fgp ff"><label>Descrição</label><textarea class="fi" id="nc-desc" rows="2"></textarea></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveNewContract()"><i data-lucide="save"></i> Criar Contrato</button>`);
};

window.saveNewContract=()=>{
  const name=document.getElementById('nc-name')?.value.trim();
  if(!name)return toast('Nome do contrato é obrigatório','e');
  const affId=document.getElementById('nc-aff')?.value;
  const aff=STATE.affiliates.find(a=>a.id===affId);
  const ct={id:'ct'+Date.now(),affiliateId:affId,affiliate:aff?.name||'',brand:document.getElementById('nc-brand')?.value,
    name,type:document.getElementById('nc-type')?.value||'cpa',
    value:parseFloat(document.getElementById('nc-value')?.value)||0,
    status:document.getElementById('nc-status')?.value||'ativo',
    startDate:document.getElementById('nc-start')?.value||'',
    endDate:document.getElementById('nc-end')?.value||'',
    description:document.getElementById('nc-desc')?.value.trim()||'',
    paymentStatus:'pendente',paid:0};
  STATE.contracts.push(ct);logAction('Contrato criado',name);saveToLocal();closeModal();
  toast('Contrato criado!');
};

window.openEditContract=id=>{
  const c=STATE.contracts.find(x=>x.id===id);if(!c)return;
  openModal('Editar Contrato',`<div class="fg">
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="ec-name" value="${c.name}"></div>
    <div class="fgp"><label>Valor (R$)</label><input type="number" class="fi" id="ec-value" value="${c.value}"></div>
    <div class="fgp"><label>Status Contrato</label><select class="fi" id="ec-status">
      <option value="ativo" ${c.status==='ativo'?'selected':''}>Ativo</option>
      <option value="negociação" ${c.status==='negociação'?'selected':''}>Negociação</option>
      <option value="encerrado" ${c.status==='encerrado'?'selected':''}>Encerrado</option>
    </select></div>
    <div class="fgp"><label>Status Pagamento</label><select class="fi" id="ec-pstatus">
      <option value="pendente" ${c.paymentStatus==='pendente'?'selected':''}>Pendente</option>
      <option value="parcial" ${c.paymentStatus==='parcial'?'selected':''}>Parcial</option>
      <option value="pago" ${c.paymentStatus==='pago'?'selected':''}>Pago</option>
    </select></div>
    <div class="fgp"><label>Início</label><input type="date" class="fi" id="ec-start" value="${c.startDate||''}"></div>
    <div class="fgp"><label>Fim</label><input type="date" class="fi" id="ec-end" value="${c.endDate||''}"></div>
    <div class="fgp ff"><label>Descrição</label><textarea class="fi" id="ec-desc" rows="2">${c.description||''}</textarea></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="deleteContract('${id}')"><i data-lucide="trash-2"></i> Excluir</button>
    <button class="btn btn-theme" onclick="saveEditContract('${id}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditContract=id=>{
  const c=STATE.contracts.find(x=>x.id===id);if(!c)return;
  c.name=document.getElementById('ec-name')?.value.trim()||c.name;
  c.value=parseFloat(document.getElementById('ec-value')?.value)||c.value;
  c.status=document.getElementById('ec-status')?.value||c.status;
  c.paymentStatus=document.getElementById('ec-pstatus')?.value||c.paymentStatus;
  c.startDate=document.getElementById('ec-start')?.value||c.startDate;
  c.endDate=document.getElementById('ec-end')?.value||c.endDate;
  c.description=document.getElementById('ec-desc')?.value.trim()||'';
  logAction('Contrato editado',c.name);saveToLocal();closeModal();toast('Contrato atualizado!');
};

window.deleteContract=id=>{
  const idx=STATE.contracts.findIndex(x=>x.id===id);
  if(idx>-1){logAction('Contrato excluído',STATE.contracts[idx].name);STATE.contracts.splice(idx,1);saveToLocal();closeModal();toast('Contrato excluído!');}
};

// ══════════════════════════════════════════════════════════
// USERS CRUD — Supabase Auth + profiles table integration
// ══════════════════════════════════════════════════════════
window.openNewUser=()=>{
  openModal('Novo Usuário',`<div class="fg">
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="nu-name" placeholder="Nome completo"></div>
    <div class="fgp"><label>Email *</label><input class="fi" id="nu-email" placeholder="user@3c.gg"></div>
    <div class="fgp ff"><label>Senha temporária *</label><input type="password" class="fi" id="nu-pass" placeholder="mínimo 6 caracteres">
      <div style="font-size:9px;color:var(--text3);margin-top:4px">O usuário pode mudar depois pela tela de login</div>
    </div>
    <div class="fgp"><label>Cargo</label><select class="fi" id="nu-role">
      <option value="admin">Admin</option><option value="financeiro">Financeiro</option>
      <option value="operacao">Operação</option><option value="viewer">Viewer</option>
    </select></div>
    <div class="fgp ff"><label>Módulos de Acesso</label>
      <div class="mod-checks">${ALL_MODS.map(m=>`<label class="mod-check"><input type="checkbox" value="${m}" checked><span>${m}</span></label>`).join('')}</div>
    </div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveNewUser()"><i data-lucide="save"></i> Criar Usuário</button>`);
};

window.saveNewUser=async ()=>{
  const name=document.getElementById('nu-name')?.value.trim();
  const email=document.getElementById('nu-email')?.value.trim();
  const password=document.getElementById('nu-pass')?.value;
  if(!name||!email||!password)return toast('Nome, email e senha são obrigatórios','e');
  if(password.length<6)return toast('Senha precisa ter pelo menos 6 caracteres','e');
  if(STATE.users.find(u=>u.email===email))return toast('Email já existe','e');
  const role=document.getElementById('nu-role')?.value||'viewer';
  const modules=[...document.querySelectorAll('#mbd .mod-check input:checked')].map(c=>c.value);

  // Create user in Supabase Auth + update profile via direct upsert
  if(window.SUPABASE_CONFIGURED && window.sb){
    try {
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { name } }
      });
      if (error) throw error;
      if (!data.user) throw new Error('Usuário não criado');

      // Update profile (created by handle_new_user trigger) with role + modules
      const { error: upErr } = await sb.from('profiles').upsert({
        id: data.user.id,
        name, email, role, status: 'ativo', modules
      });
      if (upErr) throw upErr;

      // Add to STATE
      STATE.users.push({
        id: data.user.id, name, email, role, status: 'ativo', modules,
        createdAt: new Date().toISOString().split('T')[0]
      });
      logAction('Usuário criado (Supabase)', name);
      closeModal();
      bUsers(document.getElementById('mod-users'));
      toast(`Usuário ${name} criado! ${data.user.email_confirmed_at ? 'Já pode logar.' : 'Confirme o email se necessário.'}`);
      return;
    } catch (e) {
      console.error('[saveNewUser] Supabase failed:', e);
      toast('Erro ao criar no Supabase: ' + (e.message||e), 'e');
      return;
    }
  }

  // Fallback: only local state (legacy)
  STATE.users.push({id:'u'+Date.now(),name,email,role,status:'ativo',modules,createdAt:new Date().toISOString().split('T')[0]});
  logAction('Usuário criado (local)',name);saveToLocal();closeModal();
  bUsers(document.getElementById('mod-users'));toast('Usuário criado localmente!');
};

window.openEditUser=id=>{
  const u=STATE.users.find(x=>x.id===id);if(!u)return;
  const isSelf = u.id === STATE.user?.id;
  openModal('Editar Usuário',`<div class="fg">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:8px">${userAvatar(u,56)}<div><div style="font-weight:700;font-size:14px">${u.name}</div><div style="font-size:11px;color:var(--text3)">${u.email}</div></div></div>
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="eu-name" value="${u.name}"></div>
    <div class="fgp"><label>Cargo / Título</label><input class="fi" id="eu-title" value="${u.title||''}" placeholder="Ex: Head de BizDev, Analista Financeiro..."></div>
    <div class="fgp ff"><label>Avatar (URL da foto)</label><input class="fi" id="eu-avatar" value="${u.avatar||''}" placeholder="https://..."></div>
    <div class="fgp"><label>Email</label><input class="fi" id="eu-email" value="${u.email}" disabled></div>
    <div class="fgp"><label>Permissão</label><select class="fi" id="eu-role" ${isSelf?'disabled':''}>
      <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
      <option value="financeiro" ${u.role==='financeiro'?'selected':''}>Financeiro</option>
      <option value="operacao" ${u.role==='operacao'?'selected':''}>Operação</option>
      <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
    </select></div>
    <div class="fgp"><label>Status</label><select class="fi" id="eu-status" ${isSelf?'disabled':''}>
      <option value="ativo" ${u.status==='ativo'?'selected':''}>Ativo</option>
      <option value="bloqueado" ${u.status==='bloqueado'?'selected':''}>Bloqueado</option>
    </select></div>
    <div class="fgp ff"><label>Módulos de Acesso</label>
      <div class="mod-checks">${ALL_MODS.map(m=>`<label class="mod-check ${u.modules.includes(m)?'active':''}"><input type="checkbox" value="${m}" ${u.modules.includes(m)?'checked':''}><span>${m}</span></label>`).join('')}</div>
    </div>
    ${!isSelf && window.SUPABASE_CONFIGURED ? `
    <div class="fgp ff"><label>Resetar senha</label>
      <div style="font-size:10px;color:var(--text3);margin:2px 0 6px">Define uma nova senha provisória. O usuário deverá trocar no próximo login.</div>
      <div style="display:flex;gap:6px">
        <input type="text" class="fi" id="eu-newpass" placeholder="Nova senha (mín. 8 caracteres)" style="flex:1">
        <button class="btn btn-outline" onclick="resetUserPassword('${id}')"><i data-lucide="key"></i> Resetar</button>
      </div>
    </div>` : ''}
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    ${!isSelf?`<button class="btn btn-danger" onclick="confirmDeleteUser('${u.id}')"><i data-lucide="trash-2"></i> Excluir</button>`:''}
    <button class="btn btn-theme" onclick="saveEditUser('${id}')"><i data-lucide="save"></i> Salvar</button>`);
  if(window.lucide?.createIcons)lucide.createIcons();
};

// Reset a user's password via Supabase admin API. Requires admin role.
window.resetUserPassword = async (id) => {
  const newPass = document.getElementById('eu-newpass')?.value?.trim();
  if (!newPass || newPass.length < 8) return toast('Senha precisa ter ao menos 8 caracteres', 'e');
  if (!window.SUPABASE_CONFIGURED || !window.sb) return toast('Supabase não configurado', 'e');
  if (!confirm('Resetar a senha deste usuário?')) return;
  try {
    // Supabase admin API requires service role — call the edge function if set up,
    // otherwise use the current session method (updates own password only).
    // For now: use the RPC if available, else show instructions.
    const { data, error } = await sb.rpc('admin_reset_password', { user_id: id, new_password: newPass });
    if (error) throw error;
    logAction('Senha resetada', STATE.users.find(x=>x.id===id)?.name || id);
    toast('Senha resetada com sucesso', 's');
    document.getElementById('eu-newpass').value = '';
  } catch (e) {
    console.error('[resetUserPassword]', e);
    toast('Para resetar senhas de outros usuários é preciso configurar a função admin_reset_password no Supabase', 'w');
  }
};

window.saveEditUser=async id=>{
  const u=STATE.users.find(x=>x.id===id);if(!u)return;
  u.name=document.getElementById('eu-name')?.value.trim()||u.name;
  u.title=document.getElementById('eu-title')?.value.trim()||'';
  u.avatar=document.getElementById('eu-avatar')?.value.trim()||'';
  u.role=document.getElementById('eu-role')?.value||u.role;
  u.status=document.getElementById('eu-status')?.value||u.status;
  u.modules=[...document.querySelectorAll('#mbd .mod-check input:checked')].map(c=>c.value);

  // Upsert to Supabase profiles
  if(window.SUPABASE_CONFIGURED && window.sb){
    try {
      const { error } = await sb.from('profiles').upsert({
        id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, modules: u.modules
      });
      if (error) throw error;
    } catch (e) {
      console.error('[saveEditUser] Supabase failed:', e);
      toast('Erro ao salvar no Supabase: ' + (e.message||e), 'e');
      return;
    }
  }

  logAction('Usuário editado', u.name);
  saveToLocal();
  closeModal();
  bUsers(document.getElementById('mod-users'));
  toast('Usuário atualizado!');
};

window.toggleUserStatus=async id=>{
  const u=STATE.users.find(x=>x.id===id);if(!u)return;
  u.status=u.status==='ativo'?'bloqueado':'ativo';

  // Upsert to Supabase profiles
  if(window.SUPABASE_CONFIGURED && window.sb){
    try {
      const { error } = await sb.from('profiles').upsert({
        id: u.id, name: u.name, email: u.email, role: u.role, status: u.status, modules: u.modules
      });
      if (error) throw error;
    } catch (e) {
      console.error('[toggleUserStatus] Supabase failed:', e);
      // Revert local change
      u.status=u.status==='ativo'?'bloqueado':'ativo';
      toast('Erro ao alterar status: ' + (e.message||e), 'e');
      return;
    }
  }

  logAction('Usuário '+(u.status==='ativo'?'desbloqueado':'bloqueado'), u.name);
  saveToLocal();
  bUsers(document.getElementById('mod-users'));
  toast(u.status==='ativo'?'Usuário desbloqueado':'Usuário bloqueado');
};

// ══════════════════════════════════════════════════════════
// CSV EXPORT
// ══════════════════════════════════════════════════════════
window.exportCSV=(type)=>{
  let csv='',filename='export.csv';
  if(type==='audit'){
    csv='Ação,Detalhe,Usuário,Data\n';
    STATE.auditLog.forEach(a=>{csv+=`"${a.action}","${a.detail}","${a.user}","${a.time}"\n`;});
    filename='auditoria_3cos.csv';
  }else if(type==='payments'){
    csv='Afiliado,Marca,Contrato,Valor,Vencimento,Status,NF\n';
    STATE.payments.forEach(p=>{csv+=`"${p.affiliate}","${p.brand}","${p.contract}",${p.amount},"${p.dueDate||''}","${p.status}","${p.nfName||''}"\n`;});
    filename='pagamentos_3cos.csv';
  }else if(type==='affiliates'){
    csv='Nome,Email,Tipo,Status,FTDs,QFTDs,Depósitos,Comissão,Lucro\n';
    STATE.affiliates.forEach(a=>{csv+=`"${a.name}","${a.contactEmail}","${a.contractType}","${a.status}",${a.ftds},${a.qftds},${a.deposits},${a.commission},${a.profit}\n`;});
    filename='afiliados_3cos.csv';
  }
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.appendChild(link);link.click();document.body.removeChild(link);
  URL.revokeObjectURL(url);
  const rowCount=csv.split('\n').length-2;
  logAction('Export CSV',`${type} — ${rowCount} registro(s) → ${filename}`);
  toast('CSV exportado!');
};

// ══════════════════════════════════════════════════════════
// 3. MARCAS (ANTIGO CASAS)
// ══════════════════════════════════════════════════════════
let _brandTab='all';
function bBrands(el){
  const brandsList=Object.entries(STATE.brands);
  el.innerHTML=modHdr('Marcas Parceiras')+`<div class="mod-body">
    ${heroHTML('brands','','Marcas','Casas parceiras e deals negociados')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Nossas Marcas Parceiras</div>
        <div class="sec-actions">
          <button class="btn btn-theme" onclick="openNewBrandModal()"><i data-lucide="plus"></i> Nova Marca Parceira</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">
        ${brandsList.map(([name,br])=>{
          const affsWithBrand=STATE.affiliates.filter(a=>a.deals&&a.deals[name]);
          const affCount=affsWithBrand.length;
          return `<div class="aff-card" style="cursor:pointer" onclick="openEditBrand('${name}')">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
              ${br.logo?`<img src="${br.logo}" alt="${name}" style="width:36px;height:36px;border-radius:8px;object-fit:contain;background:var(--bg3);padding:4px">`
              :`<div style="width:36px;height:36px;border-radius:8px;background:var(--bg3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;color:var(--text)">${name[0]}</div>`}
              <div style="flex:1">
                <div style="font-family:var(--fd);font-size:16px;font-weight:800;color:var(--text);text-transform:uppercase;letter-spacing:0.04em">${name}</div>
                <div style="font-size:10px;color:var(--text3)">${affCount} afiliado${affCount!==1?'s':''} vinculado${affCount!==1?'s':''}</div>
              </div>
              ${typeof isBetaEnabled === 'function' && isBetaEnabled('brand_hub') ? `<button class="btn btn-outline" onclick="event.stopPropagation();openBrandHub('${name}')" style="padding:5px 10px;font-size:9px" title="Materiais"><i data-lucide="palette" style="width:12px;height:12px"></i></button>` : ''}
              <button class="btn btn-outline" onclick="event.stopPropagation();openEditBrand('${name}')" style="padding:5px 10px;font-size:9px"><i data-lucide="edit-3" style="width:12px;height:12px"></i></button>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px">
              <div style="background:var(--bg3);border-radius:8px;padding:8px;text-align:center">
                <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:700">CPA Base</div>
                <div style="font-family:var(--fd);font-size:16px;font-weight:800;color:var(--text)">R$${br.cpa||0}</div>
              </div>
              <div style="background:var(--bg3);border-radius:8px;padding:8px;text-align:center">
                <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Rev Share</div>
                <div style="font-family:var(--fd);font-size:16px;font-weight:800;color:var(--text)">${br.rs||0}%</div>
              </div>
              <div style="background:var(--bg3);border-radius:8px;padding:8px;text-align:center">
                <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:700">Afiliados</div>
                <div style="font-family:var(--fd);font-size:16px;font-weight:800;color:var(--text)">${affCount}</div>
              </div>
            </div>
            <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);margin-bottom:6px">Deals por Afiliado</div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${affsWithBrand.length?affsWithBrand.map(a=>{
                const deal=a.deals[name];const ct=a.contractType;
                let dealInfo=ct==='tiered'?`CPA Escalonado (${(deal.levels||[]).length} níveis)`:
                  ct==='pct_deposit'?`${deal.pctDeposit||0}% Depósitos + CPA R$${deal.cpa||0}`:
                  ct==='rs'?`Rev Share ${deal.rs||br.rs||0}%`:
                  `CPA R$${deal.cpa||br.cpa||0} + RS ${deal.rs||br.rs||0}%`;
                return `<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 10px;background:var(--bg3);border-radius:6px;font-size:11px">
                  <span style="font-weight:600;color:var(--text)">${a.name}</span>
                  <span style="color:var(--text2);font-size:10px">${dealInfo}</span>
                </div>`;
              }).join(''):'<span style="font-size:10px;color:var(--text3)">Nenhum afiliado</span>'}
            </div>
          </div>`;
        }).join('')}
      </div>
    </div></div>`;
}

// ══════════════════════════════════════════════════════════
// BRAND HUB — Materials, promos, features, banners per brand
// ══════════════════════════════════════════════════════════
// Stored in STATE.brandMaterials = { brandName: [ { id, category, title, desc, url, imageUrl, createdAt } ] }

const MATERIAL_CATEGORIES = {
  promo: { label: 'Promoção', icon: 'tag', color: 'var(--amber)' },
  banner: { label: 'Banner', icon: 'image', color: 'var(--blue)' },
  feature: { label: 'Feature da Casa', icon: 'star', color: 'var(--purple)' },
  link: { label: 'Link', icon: 'external-link', color: 'var(--green)' },
  asset: { label: 'Asset / Material', icon: 'file', color: 'var(--text2)' },
};

window.openBrandHub = (brandName) => {
  if (typeof isBetaEnabled !== 'function' || !isBetaEnabled('brand_hub')) {
    return toast('Ative Brand Hub em Configurações > Lab', 'w');
  }
  const br = STATE.brands[brandName];
  if (!br) return;
  if (!STATE.brandMaterials) STATE.brandMaterials = {};
  const materials = STATE.brandMaterials[brandName] || [];

  // Store current filter state on module
  window._bhCurrentBrand = brandName;
  window._bhCurrentFilter = 'all';

  openModal(brandName + ' — Brand Hub', _renderBrandHubBody(brandName, 'all'),
    `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);

  // Make modal wider for the gallery view
  const mbd = document.getElementById('mbd');
  if (mbd) { mbd.style.maxWidth = 'none'; }
  const modal = document.querySelector('#modal-ov .modal');
  if (modal) { modal.style.maxWidth = '920px'; modal.style.width = '92vw'; }

  lucide.createIcons();
};

function _renderBrandHubBody(brandName, filter) {
  const br = STATE.brands[brandName];
  const materials = STATE.brandMaterials?.[brandName] || [];
  const filtered = filter === 'all' ? materials : materials.filter(m => m.category === filter);

  // Header: brand logo + name + quick-add row
  const logoBlock = br.logo
    ? `<img src="${br.logo}" class="bh-logo" alt="${brandName}">`
    : `<div class="bh-logo bh-logo-fallback">${brandName[0]}</div>`;

  const catCounts = Object.fromEntries(
    Object.keys(MATERIAL_CATEGORIES).map(k => [k, materials.filter(m => m.category === k).length])
  );

  // Category filter chips
  const chipsRow = `<div class="bh-chips">
    <button class="bh-chip ${filter === 'all' ? 'on' : ''}" onclick="_filterBH('all')">
      <i data-lucide="grid" style="width:11px;height:11px"></i> Todos
      <span class="bh-chip-count">${materials.length}</span>
    </button>
    ${Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => `
      <button class="bh-chip ${filter === k ? 'on' : ''}" onclick="_filterBH('${k}')" style="--chip-c:${v.color}">
        <i data-lucide="${v.icon}" style="width:11px;height:11px"></i> ${v.label}
        <span class="bh-chip-count">${catCounts[k]}</span>
      </button>
    `).join('')}
  </div>`;

  // Quick-add: colored icons for each category
  const quickAdd = `<div class="bh-quick-add">
    <span class="bh-quick-add-lbl">Criar rápido:</span>
    ${Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => `
      <button class="bh-quick-btn" onclick="openAddBrandMaterial('${brandName}','${k}')" title="Nova ${v.label}" style="--qb-c:${v.color}">
        <i data-lucide="${v.icon}"></i>
      </button>
    `).join('')}
    <button class="bh-quick-btn bh-quick-btn-primary" onclick="openAddBrandMaterial('${brandName}')">
      <i data-lucide="plus"></i> <span>Novo Material</span>
    </button>
  </div>`;

  // Content: gallery view if has materials, landing view if empty
  let content;
  if (!materials.length) {
    content = `<div class="bh-empty">
      <div class="bh-empty-icon"><i data-lucide="folder-open"></i></div>
      <div class="bh-empty-title">Comece a montar o hub da ${brandName}</div>
      <div class="bh-empty-sub">Adicione promoções, banners, features da casa, links e assets. Os afiliados encontram tudo em um só lugar.</div>
      <div class="bh-empty-grid">
        ${Object.entries(MATERIAL_CATEGORIES).map(([k, v]) => `
          <button class="bh-empty-card" onclick="openAddBrandMaterial('${brandName}','${k}')" style="--ec-c:${v.color}">
            <div class="bh-empty-card-icon"><i data-lucide="${v.icon}"></i></div>
            <div class="bh-empty-card-lbl">${v.label}</div>
            <div class="bh-empty-card-hint">+ Adicionar</div>
          </button>
        `).join('')}
      </div>
    </div>`;
  } else if (!filtered.length) {
    const cat = MATERIAL_CATEGORIES[filter];
    content = `<div class="bh-empty-filter">
      <i data-lucide="${cat?.icon || 'folder'}" style="width:32px;height:32px;stroke:${cat?.color || 'var(--text3)'}"></i>
      <div>Nenhum material na categoria <strong>${cat?.label || filter}</strong>.</div>
      <button class="btn btn-theme" onclick="openAddBrandMaterial('${brandName}','${filter}')"><i data-lucide="plus"></i> Criar ${cat?.label || ''}</button>
    </div>`;
  } else {
    content = `<div class="bh-gallery">${filtered.map(m => _renderBHCard(m)).join('')}</div>`;
  }

  return `<div class="bh-wrap">
    <div class="bh-header">
      ${logoBlock}
      <div class="bh-header-body">
        <div class="bh-header-name">${brandName}</div>
        <div class="bh-header-meta">${materials.length} material${materials.length !== 1 ? 'is' : ''} cadastrado${materials.length !== 1 ? 's' : ''}</div>
      </div>
    </div>
    ${quickAdd}
    ${materials.length ? chipsRow : ''}
    <div id="bh-content">${content}</div>
  </div>`;
}

function _renderBHCard(m) {
  const cat = MATERIAL_CATEGORIES[m.category] || MATERIAL_CATEGORIES.asset;
  const date = m.createdAt ? new Date(m.createdAt).toLocaleDateString('pt-BR') : '';
  return `<div class="bh-card">
    ${m.imageUrl
      ? `<div class="bh-card-img" style="background-image:url('${m.imageUrl.replace(/'/g,'')}')"></div>`
      : `<div class="bh-card-img bh-card-img-fallback" style="--c:${cat.color}"><i data-lucide="${cat.icon}"></i></div>`}
    <div class="bh-card-body">
      <div class="bh-card-cat" style="--c:${cat.color}"><i data-lucide="${cat.icon}" style="width:10px;height:10px"></i> ${cat.label}</div>
      <div class="bh-card-title">${m.title}</div>
      ${m.desc ? `<div class="bh-card-desc">${m.desc}</div>` : ''}
      <div class="bh-card-footer">
        ${m.url ? `<a href="${m.url}" target="_blank" class="bh-card-link" onclick="event.stopPropagation()"><i data-lucide="external-link" style="width:10px;height:10px"></i> Abrir</a>` : '<span class="bh-card-date">' + date + '</span>'}
        <button class="ibt" onclick="event.stopPropagation();deleteBrandMaterial('${m.brandName}','${m.id}')" title="Remover"><i data-lucide="trash-2" style="width:12px;height:12px"></i></button>
      </div>
    </div>
  </div>`;
}

window._filterBH = (cat) => {
  window._bhCurrentFilter = cat;
  const brandName = window._bhCurrentBrand;
  if (!brandName) return;
  const mbd = document.getElementById('mbd');
  if (mbd) mbd.innerHTML = _renderBrandHubBody(brandName, cat);
  lucide.createIcons();
};

window.openAddBrandMaterial = (brandName, presetCat) => {
  const catOpts = Object.entries(MATERIAL_CATEGORIES).map(([k, v]) =>
    `<option value="${k}" ${k === presetCat ? 'selected' : ''}>${v.label}</option>`).join('');
  const catLabel = presetCat && MATERIAL_CATEGORIES[presetCat] ? ` · ${MATERIAL_CATEGORIES[presetCat].label}` : '';
  openModal(`Novo Material${catLabel} — ${brandName}`, `<div class="fg">
    <div class="fgp"><label>Categoria</label><select class="fi" id="bm-cat">${catOpts}</select></div>
    <div class="fgp ff"><label>Título *</label><input class="fi" id="bm-title" placeholder="Ex: Promo Welcome Bonus 200%" autofocus></div>
    <div class="fgp ff"><label>Descrição</label><textarea class="fi" id="bm-desc" rows="3" placeholder="Detalhes, regras, observações..."></textarea></div>
    <div class="fgp ff"><label>URL / Link</label><input class="fi" id="bm-url" placeholder="https://..."></div>
    <div class="fgp ff"><label>Imagem / Banner</label>
      <div class="bm-img-upload" id="bm-img-upload">
        <div class="bm-img-tabs">
          <button type="button" class="bm-img-tab on" onclick="_switchImgTab('file',this)"><i data-lucide="upload" style="width:12px;height:12px"></i> Enviar arquivo</button>
          <button type="button" class="bm-img-tab" onclick="_switchImgTab('url',this)"><i data-lucide="link" style="width:12px;height:12px"></i> Colar URL</button>
        </div>
        <div class="bm-img-panel" id="bm-img-file-panel">
          <input type="file" id="bm-img-file" accept="image/*" style="display:none" onchange="_handleBMImgFile(event)">
          <div class="bm-img-drop" id="bm-img-drop" onclick="document.getElementById('bm-img-file').click()">
            <i data-lucide="image-up" style="width:22px;height:22px;stroke:var(--text3)"></i>
            <div class="bm-img-drop-lbl">Clique para escolher uma imagem</div>
            <div class="bm-img-drop-hint">PNG, JPG, WebP — será otimizada automaticamente</div>
          </div>
          <div class="bm-img-preview" id="bm-img-preview" style="display:none">
            <img id="bm-img-preview-img" alt="preview">
            <div class="bm-img-preview-meta">
              <span id="bm-img-preview-size">—</span>
              <button type="button" class="ibt danger" onclick="_clearBMImg()" title="Remover"><i data-lucide="x" style="width:13px;height:13px"></i></button>
            </div>
          </div>
        </div>
        <div class="bm-img-panel" id="bm-img-url-panel" style="display:none">
          <input class="fi" id="bm-img-url-input" placeholder="https://...banner.jpg">
        </div>
        <input type="hidden" id="bm-img" value="">
      </div>
    </div>
  </div>`, `<button class="btn btn-ghost" onclick="closeModal();openBrandHub('${brandName}')">Cancelar</button>
    <button class="btn btn-theme" onclick="saveBrandMaterial('${brandName}')"><i data-lucide="check"></i> Adicionar</button>`);
  lucide.createIcons();
};

window._switchImgTab = (tab, btn) => {
  btn.parentElement.querySelectorAll('.bm-img-tab').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('bm-img-file-panel').style.display = tab === 'file' ? 'block' : 'none';
  document.getElementById('bm-img-url-panel').style.display = tab === 'url' ? 'block' : 'none';
};

window._handleBMImgFile = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return toast('Arquivo deve ser uma imagem', 'e');
  if (file.size > 8 * 1024 * 1024) return toast('Imagem muito grande (máx 8MB)', 'e');
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // Compress: resize to max 1200px width, JPEG quality 0.82
      const maxW = 1200;
      const scale = img.width > maxW ? maxW / img.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
      const sizeKB = Math.round(dataUrl.length * 0.75 / 1024);
      document.getElementById('bm-img').value = dataUrl;
      document.getElementById('bm-img-preview-img').src = dataUrl;
      document.getElementById('bm-img-preview-size').textContent = `${canvas.width}×${canvas.height} · ~${sizeKB} KB`;
      document.getElementById('bm-img-preview').style.display = 'flex';
      document.getElementById('bm-img-drop').style.display = 'none';
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

window._clearBMImg = () => {
  document.getElementById('bm-img').value = '';
  document.getElementById('bm-img-preview').style.display = 'none';
  document.getElementById('bm-img-drop').style.display = 'flex';
  document.getElementById('bm-img-file').value = '';
};

window.saveBrandMaterial = (brandName) => {
  const title = document.getElementById('bm-title')?.value?.trim();
  if (!title) return toast('Título obrigatório', 'e');
  if (!STATE.brandMaterials) STATE.brandMaterials = {};
  if (!STATE.brandMaterials[brandName]) STATE.brandMaterials[brandName] = [];
  // Image: prefer uploaded file (base64), fallback to URL input
  let imageUrl = document.getElementById('bm-img')?.value?.trim() || '';
  if (!imageUrl) imageUrl = document.getElementById('bm-img-url-input')?.value?.trim() || '';
  STATE.brandMaterials[brandName].unshift({
    id: 'bm' + Date.now(),
    brandName,
    category: document.getElementById('bm-cat')?.value || 'asset',
    title,
    desc: document.getElementById('bm-desc')?.value?.trim() || '',
    url: document.getElementById('bm-url')?.value?.trim() || '',
    imageUrl,
    createdAt: new Date().toISOString(),
  });
  logAction('Material adicionado', `${brandName}: ${title}`);
  saveToLocal(); closeModal();
  toast('Material adicionado!');
  setTimeout(() => openBrandHub(brandName), 200);
};

window.deleteBrandMaterial = (brandName, matId) => {
  if (!confirm('Remover este material?')) return;
  const arr = STATE.brandMaterials?.[brandName];
  if (!arr) return;
  const idx = arr.findIndex(m => m.id === matId);
  if (idx >= 0) arr.splice(idx, 1);
  saveToLocal();
  toast('Material removido');
  openBrandHub(brandName);
};

