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
  openModal('Editar Usuário',`<div class="fg">
    <div style="display:flex;align-items:center;gap:14px;margin-bottom:4px">${userAvatar(u,56)}<div><div style="font-weight:700;font-size:14px">${u.name}</div><div style="font-size:11px;color:var(--text3)">${u.email}</div></div></div>
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="eu-name" value="${u.name}"></div>
    <div class="fgp"><label>Cargo / Título</label><input class="fi" id="eu-title" value="${u.title||''}" placeholder="Ex: Head de BizDev, Analista Financeiro..."></div>
    <div class="fgp ff"><label>Avatar (URL da foto)</label><input class="fi" id="eu-avatar" value="${u.avatar||''}" placeholder="https://..."></div>
    <div class="fgp"><label>Email</label><input class="fi" id="eu-email" value="${u.email}" disabled></div>
    <div class="fgp"><label>Permissão</label><select class="fi" id="eu-role">
      <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
      <option value="financeiro" ${u.role==='financeiro'?'selected':''}>Financeiro</option>
      <option value="operacao" ${u.role==='operacao'?'selected':''}>Operação</option>
      <option value="viewer" ${u.role==='viewer'?'selected':''}>Viewer</option>
    </select></div>
    <div class="fgp ff"><label>Módulos de Acesso</label>
      <div class="mod-checks">${ALL_MODS.map(m=>`<label class="mod-check ${u.modules.includes(m)?'active':''}"><input type="checkbox" value="${m}" ${u.modules.includes(m)?'checked':''}><span>${m}</span></label>`).join('')}</div>
    </div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    ${u.id!==STATE.user?.id?`<button class="btn btn-danger" onclick="confirmDeleteUser('${u.id}')"><i data-lucide="trash-2"></i> Excluir</button>`:''}
    <button class="btn btn-theme" onclick="saveEditUser('${id}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditUser=async id=>{
  const u=STATE.users.find(x=>x.id===id);if(!u)return;
  u.name=document.getElementById('eu-name')?.value.trim()||u.name;
  u.title=document.getElementById('eu-title')?.value.trim()||'';
  u.avatar=document.getElementById('eu-avatar')?.value.trim()||'';
  u.role=document.getElementById('eu-role')?.value||u.role;
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

// Brand tab functions removed — brand results now in Dashboard

