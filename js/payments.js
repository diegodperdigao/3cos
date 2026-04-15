// ══════════════════════════════════════════════════════════
// 4. PAYMENTS
// ══════════════════════════════════════════════════════════
let _pyF=null;
function bPayments(el){
  const total=STATE.payments.reduce((s,p)=>s+p.amount,0);
  const paid=STATE.payments.filter(p=>p.status==='pago').reduce((s,p)=>s+p.amount,0);
  const pend=STATE.payments.filter(p=>p.status==='pendente').reduce((s,p)=>s+p.amount,0);
  const appr=STATE.payments.filter(p=>p.status==='aprovado').reduce((s,p)=>s+p.amount,0);
  el.innerHTML=modHdr('Financeiro — Pagamentos')+`<div class="mod-body">
    ${heroHTML('payments','Financeiro','Gestão Financeira','Aprovação, recusa e comissões por afiliado')}
    <div class="mod-main">
      <div class="kpi-row">
        <div class="kpi" style="--kpi-c:var(--blue);--kpi-glow:rgba(59,130,246,0.1)">
          <div class="kpi-icon-row"><i data-lucide="trending-up" style="width:14px;height:14px;stroke:var(--blue)"></i><span class="kpi-lbl">Pipeline</span></div>
          <div class="kpi-val sm">${fc(total)}</div></div>
        <div class="kpi" style="--kpi-c:var(--green);--kpi-glow:rgba(16,185,129,0.1)">
          <div class="kpi-icon-row"><i data-lucide="check-circle" style="width:14px;height:14px;stroke:var(--green)"></i><span class="kpi-lbl">Recebido</span></div>
          <div class="kpi-val sm col" style="--kpi-c:var(--green)">${fc(paid)}</div></div>
        <div class="kpi" style="--kpi-c:var(--amber);--kpi-glow:rgba(245,158,11,0.1)">
          <div class="kpi-icon-row"><i data-lucide="clock" style="width:14px;height:14px;stroke:var(--amber)"></i><span class="kpi-lbl">Aprovados</span></div>
          <div class="kpi-val sm col" style="--kpi-c:var(--amber)">${fc(appr)}</div></div>
        <div class="kpi" style="--kpi-c:var(--red);--kpi-glow:rgba(239,68,68,0.1)">
          <div class="kpi-icon-row"><i data-lucide="alert-circle" style="width:14px;height:14px;stroke:var(--red)"></i><span class="kpi-lbl">Pendente</span></div>
          <div class="kpi-val sm col" style="--kpi-c:var(--red)">${fc(pend)}</div></div>
      </div>
      <div class="tabs" id="pay-tabs">
        <button class="tab on" style="--tab-color:var(--pink)" onclick="showPayTab('closing',this)"><div class="tab-dot" style="background:var(--pink)"></div>Fechamento</button>
        <button class="tab" style="--tab-color:var(--blue)" onclick="showPayTab('queue',this)"><div class="tab-dot" style="background:var(--blue)"></div>Pagamentos</button>
        <button class="tab" style="--tab-color:var(--amber)" onclick="showPayTab('deadlines',this)"><div class="tab-dot" style="background:var(--amber)"></div>Prazos & Calendário</button>
      </div>
      <div id="pay-tab-closing"></div>
      <div id="pay-tab-queue" style="display:none">
      <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);margin-bottom:16px;font-size:11px;color:var(--text2);line-height:1.6">
        <strong style="color:var(--text)">Como funciona:</strong> Pagamentos são criados automaticamente ao executar um <strong>Fechamento</strong>, ou manualmente com o botão "Novo Pagamento". Todos passam pelo fluxo: <span style="color:var(--red)">Pendente</span> → <span style="color:var(--amber)">Aprovado</span> → <span style="color:var(--green)">Pago</span>.
      </div>
      <div class="sec-hdr"><div class="sec-lbl">Todos os Pagamentos</div>
        <div class="sec-actions">
          <button class="btn btn-outline" onclick="exportCSV('payments')"><i data-lucide="download"></i>CSV</button>
          <button class="btn btn-theme" onclick="openNewPay()"><i data-lucide="plus"></i>Novo Pagamento</button>
        </div></div>
      <div class="pills">
        <button class="pill on" onclick="pilPy(null,this)">Todos</button>
        <button class="pill" onclick="pilPy('pendente',this)">Pendentes</button>
        <button class="pill" onclick="pilPy('ajuste',this)">Em Ajuste</button>
        <button class="pill" onclick="pilPy('aprovado',this)">Aprovados</button>
        <button class="pill" onclick="pilPy('pago',this)">Pagos</button>
      </div>
      <div class="tbl-wrap" id="py-tbl"></div>
      </div>
      <div id="pay-tab-deadlines" style="display:none"></div>
    </div></div>`;
  renderPyTbl(STATE.payments);
  renderClosingTab();
  renderDeadlinesTab();
}
function renderPyTbl(list){
  const el=document.getElementById('py-tbl');if(!el)return;
  // Group by affiliate
  const groups={};
  list.forEach(p=>{const k=p.affiliate||'Sem afiliado';if(!groups[k])groups[k]={payments:[],total:0,pending:0};groups[k].payments.push(p);groups[k].total+=p.amount;if(p.status==='pendente'||p.status==='ajuste')groups[k].pending+=p.amount;});

  if(!Object.keys(groups).length){el.innerHTML='<div class="empty"><i data-lucide="inbox"></i><p>Nenhum pagamento</p></div>';lucide.createIcons();return;}

  el.innerHTML=Object.entries(groups).map(([name,g])=>`
    <div style="margin-bottom:10px;border:1px solid var(--gb);border-radius:14px;overflow:hidden">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.py-chev').style.transform=this.nextElementSibling.style.display==='none'?'':'rotate(180deg)'"
        style="padding:12px 16px;background:var(--bg3);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          <span style="font-size:13px;font-weight:700;color:var(--text)">${name}</span>
          <span style="font-size:9px;color:var(--text3)">${g.payments.length} pgto(s)</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${g.pending>0?`<span style="font-size:10px;font-weight:700;color:var(--amber)">Pend: ${fc(g.pending)}</span>`:''}
          <span style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--text)">${fc(g.total)}</span>
          <i data-lucide="chevron-down" class="py-chev" style="width:14px;height:14px;stroke:var(--text3);transition:transform 0.2s"></i>
        </div>
      </div>
      <div>
        <table style="width:100%;border-collapse:collapse;min-width:680px"><tbody>
  ${g.payments.map(p=>`<tr class="tr" onclick="openAffDetail('${p.affiliateId}')">`).join('')}
        </tbody></table>
      </div>
    </div>`).join('');

  // Now properly build the table rows inside each group
  let groupIdx=0;
  el.innerHTML=Object.entries(groups).map(([name,g])=>`
    <div style="margin-bottom:10px;border:1px solid var(--gb);border-radius:14px;overflow:hidden">
      <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none';this.querySelector('.py-chev').style.transform=this.nextElementSibling.style.display==='none'?'':'rotate(180deg)'"
        style="padding:12px 16px;background:var(--bg3);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div style="display:flex;align-items:center;gap:10px;flex:1">
          <span style="font-size:13px;font-weight:700;color:var(--text)">${name}</span>
          <span style="font-size:9px;color:var(--text3)">${g.payments.length} pgto(s)</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          ${g.pending>0?`<span style="font-size:10px;font-weight:700;color:var(--amber)">Pend: ${fc(g.pending)}</span>`:''}
          <span style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--text)">${fc(g.total)}</span>
          <i data-lucide="chevron-down" class="py-chev" style="width:14px;height:14px;stroke:var(--text3);transition:transform 0.2s"></i>
        </div>
      </div>
      <div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;min-width:680px">
        <thead><tr><th>Marca</th><th>Contrato</th><th>Valor</th><th>Vencimento</th><th>NF</th><th>Status</th><th>Ações</th></tr></thead>
        <tbody>${g.payments.map(p=>`<tr class="tr" onclick="openAffDetail('${p.affiliateId}')">`).join('')}</tbody>
      </table></div>
    </div>`).join('');

  // Re-render properly with full row content
  el.innerHTML='';
  Object.entries(groups).forEach(([name,g])=>{
    const div=document.createElement('div');
    div.style.cssText='margin-bottom:10px;border:1px solid var(--gb);border-radius:14px;overflow:hidden';
    const hdr=document.createElement('div');
    hdr.style.cssText='padding:12px 16px;background:var(--bg3);cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:10px';
    hdr.innerHTML=`<div style="display:flex;align-items:center;gap:10px;flex:1">
      <span style="font-size:13px;font-weight:700;color:var(--text)">${name}</span>
      <span style="font-size:9px;color:var(--text3)">${g.payments.length} pgto(s)</span>
    </div><div style="display:flex;align-items:center;gap:12px">
      ${g.pending>0?`<span style="font-size:10px;font-weight:700;color:var(--amber)">Pend: ${fc(g.pending)}</span>`:''}
      <span style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--text)">${fc(g.total)}</span>
      <i data-lucide="chevron-down" class="py-chev" style="width:14px;height:14px;stroke:var(--text3);transition:transform 0.2s"></i>
    </div>`;
    const body=document.createElement('div');
    body.style.cssText='overflow-x:auto';
    body.innerHTML=`<table style="width:100%;border-collapse:collapse;min-width:600px">
      <tbody>${g.payments.map(p=>`<tr class="tr" onclick="openAffDetail('${p.affiliateId}')">
        <td><span style="font-size:10px;font-weight:700;color:${STATE.brands[p.brand]?.color||'#888'}">${p.brand}</span>
          ${p.type?.includes('Fechamento')?'<span style="font-size:7px;display:block;color:var(--pink);font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-top:1px">FECHAMENTO</span>':''}</td>
        <td style="font-size:11px;color:var(--text2)">${p.contract}</td>
        <td class="td-money">${fc(p.amount)}</td>
        <td style="font-size:11px;${od(p.dueDate,p.status)?'color:var(--red)':''}">${p.dueDate?new Date(p.dueDate).toLocaleDateString('pt-BR'):'—'}</td>
        <td>${p.nfLink?`<a href="${p.nfLink}" target="_blank" rel="noopener" style="font-size:10px;color:var(--blue);text-decoration:none" onclick="event.stopPropagation()">🔗 ${p.nfName||'Ver NF'}</a>`:p.nfName?`<span style="font-size:10px;color:var(--blue)">📎 ${p.nfName}</span>`:'<span style="font-size:10px;color:var(--text3)">—</span>'}</td>
        <td><span class="pb pb-${p.status}">${pl(p.status)}</span></td>
        <td class="td-acts">
          ${p.status==='pendente'||p.status==='ajuste'?`<button class="ibt" onclick="event.stopPropagation();approvePay('${p.id}')" title="Aprovar"><i data-lucide="check" style="width:13px;height:13px;stroke:var(--green)"></i></button><button class="ibt amber" onclick="event.stopPropagation();promptPayAction('${p.id}','ajuste')" title="Ajuste"><i data-lucide="alert-circle" style="width:13px;height:13px"></i></button><button class="ibt danger" onclick="event.stopPropagation();promptPayAction('${p.id}','recusado')" title="Recusar"><i data-lucide="x" style="width:13px;height:13px"></i></button>`:''}
          ${p.status==='aprovado'?`<button class="ibt" onclick="event.stopPropagation();markPaid('${p.id}')" title="Confirmar"><i data-lucide="banknote" style="width:13px;height:13px;stroke:var(--green)"></i></button>`:''}
          <button class="ibt" onclick="event.stopPropagation();openEditPay('${p.id}')" title="Editar"><i data-lucide="edit-2" style="width:13px;height:13px"></i></button>
        </td></tr>`).join('')}</tbody></table>`;
    hdr.onclick=()=>{body.style.display=body.style.display==='none'?'block':'none';hdr.querySelector('.py-chev').style.transform=body.style.display==='none'?'':'rotate(180deg)';};
    div.appendChild(hdr);div.appendChild(body);el.appendChild(div);
  });
  lucide.createIcons();
}
window.pilPy=(s,btn)=>{_pyF=s;btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');renderPyTbl(s?STATE.payments.filter(p=>p.status===s):STATE.payments);};
window.approvePay=id=>{const p=STATE.payments.find(x=>x.id===id);if(!p)return;p.status='aprovado';logAction('Pagamento aprovado',`${p.affiliate} ${fc(p.amount)}`);renderPyTbl(_pyF?STATE.payments.filter(x=>x.status===_pyF):STATE.payments);toast('Aprovado!');};
window.markPaid=id=>{const p=STATE.payments.find(x=>x.id===id);if(!p)return;p.status='pago';logAction('Pagamento confirmado',`${p.affiliate} ${fc(p.amount)}`);saveToLocal();renderPyTbl(_pyF?STATE.payments.filter(x=>x.status===_pyF):STATE.payments);toast('Marcado como pago!');};

window.openEditPay=id=>{
  const p=STATE.payments.find(x=>x.id===id);if(!p)return;
  openModal('Editar Pagamento',`<div class="fg">
    <div class="fgp ff"><label>Afiliado</label><input class="fi" value="${p.affiliate}" disabled></div>
    <div class="fgp"><label>Marca</label><input class="fi" value="${p.brand}" disabled></div>
    <div class="fgp"><label>Contrato / Referência</label><input class="fi" id="ep-contract" value="${p.contract||''}"></div>
    <div class="fgp"><label>Valor (R$) *</label><input type="number" class="fi" id="ep-amount" value="${p.amount}"></div>
    <div class="fgp"><label>Data de Vencimento</label><input type="date" class="fi" id="ep-date" value="${p.dueDate||''}"></div>
    <div class="fgp"><label>Status</label><select class="fi" id="ep-status">
      <option value="pendente" ${p.status==='pendente'?'selected':''}>Pendente</option>
      <option value="aprovado" ${p.status==='aprovado'?'selected':''}>Aprovado</option>
      <option value="ajuste" ${p.status==='ajuste'?'selected':''}>Em Ajuste</option>
      <option value="pago" ${p.status==='pago'?'selected':''}>Pago</option>
      <option value="recusado" ${p.status==='recusado'?'selected':''}>Recusado</option>
    </select></div>
    <div class="fgp ff"><label>Substituir NF (opcional)</label>
      <input type="file" class="fi" id="ep-nf" accept=".pdf,.jpg,.png" style="padding:7px 10px;cursor:pointer">
      ${p.nfName?`<div style="font-size:10px;color:var(--blue);margin-top:4px">Atual: ${p.nfName}</div>`:''}
    </div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveEditPay('${id}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditPay=id=>{
  const p=STATE.payments.find(x=>x.id===id);if(!p)return;
  p.contract=document.getElementById('ep-contract')?.value.trim()||p.contract;
  p.amount=parseFloat(document.getElementById('ep-amount')?.value)||p.amount;
  p.dueDate=document.getElementById('ep-date')?.value||p.dueDate;
  p.status=document.getElementById('ep-status')?.value||p.status;
  const nf=document.getElementById('ep-nf')?.files[0];
  if(nf)p.nfName=nf.name;
  logAction('Pagamento editado',`${p.affiliate} ${fc(p.amount)}`);saveToLocal();closeModal();
  renderPyTbl(_pyF?STATE.payments.filter(x=>x.status===_pyF):STATE.payments);
  toast('Pagamento atualizado!');
};

window.promptPayAction = (id, action) => {
  const p = STATE.payments.find(x => x.id === id);
  if(!p) return;
  const actionName = action === 'ajuste' ? 'Devolver para Ajuste' : 'Recusar Pagamento';
  openModal(actionName, `
    <div class="fgp ff">
      <label>Motivo da recusa/devolução *</label>
      <textarea class="fi" id="pay-reason" rows="3" placeholder="Ex: NF incorreta, dados bancários não batem..."></textarea>
    </div>
    <div style="font-size:10px;color:var(--text3);margin-top:8px">Isso enviará uma notificação automática detalhada.</div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-${action==='ajuste'?'theme':'danger'}" onclick="confirmPayAction('${id}', '${action}')">Confirmar</button>`);
};

window.confirmPayAction = (id, action) => {
  const reason = document.getElementById('pay-reason').value.trim();
  if(!reason) { toast('Informe o motivo', 'e'); return; }
  const p = STATE.payments.find(x => x.id === id);
  if(!p) return;
  
  p.status = action;
  
  STATE.notifications.unshift({
    id: 'n' + Date.now(),
    type: action === 'ajuste' ? 'amber' : 'red',
    text: `Pagamento de ${fc(p.amount)} (${p.affiliate}) devolvido: ${reason}`,
    time: 'agora',
    read: false,
    action: {module:'payments',tab:'queue',filter:action==='ajuste'?'ajuste':'recusado',entityId:p.id}
  });
  
  logAction(`Pagamento ${action === 'ajuste' ? 'em ajuste' : 'recusado'}`, `${p.affiliate}: ${reason}`);
  closeModal();
  renderPyTbl(_pyF ? STATE.payments.filter(x => x.status === _pyF) : STATE.payments);
  toast(`Marcado como ${pl(action)}`);
  updateNotifBadge();
};

window.openNewPay=()=>{
  openModal('Solicitar Pagamento',`<div class="fg">
    <div class="fgp ff"><label>Afiliado *</label>
      <select class="fi" id="np-aff">
        ${STATE.affiliates.map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
      </select>
    </div>
    <div class="fgp"><label>Marca Parceira *</label>
      <select class="fi" id="np-brand">
        ${Object.keys(STATE.brands).map(b=>`<option value="${b}">${b}</option>`).join('')}
      </select>
    </div>
    <div class="fgp"><label>Referência / Contrato</label>
      <input class="fi" type="text" id="np-contract" placeholder="Ex: Faturamento Março">
    </div>
    <div class="fgp"><label>Valor (R$) *</label>
      <input class="fi" type="number" id="np-amount" placeholder="0.00">
    </div>
    <div class="fgp"><label>Data de Vencimento *</label>
      <input class="fi" type="date" id="np-date">
    </div>
    <div class="fgp ff"><label>Nota Fiscal (NF) — arquivo ou link *</label>
      <input class="fi" type="file" id="np-nf" accept=".pdf,.jpg,.png" style="padding: 7px 10px; cursor: pointer;">
      <div style="text-align:center;font-size:9px;color:var(--text3);margin:4px 0">ou cole um link externo (Google Drive, etc)</div>
      <input class="fi" id="np-nf-url" placeholder="https://drive.google.com/...">
    </div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveNewPay()"><i data-lucide="upload-cloud"></i> Solicitar Pagamento</button>`);
};

window.saveNewPay=()=>{
  const affId = document.getElementById('np-aff').value;
  const brand = document.getElementById('np-brand').value;
  const contract = document.getElementById('np-contract').value.trim() || 'Pagamento Avulso';
  const amountStr = document.getElementById('np-amount').value;
  const dueDate = document.getElementById('np-date').value;
  const nfFile = document.getElementById('np-nf').files[0];
  const nfUrl = document.getElementById('np-nf-url')?.value.trim();

  if(!affId || !brand || !amountStr || !dueDate) { toast('Preencha todos os campos obrigatórios', 'e'); return; }
  if(!nfFile && !nfUrl) { toast('Anexe a NF (arquivo ou link)', 'w'); return; }

  const amount = parseFloat(amountStr);
  const affiliate = STATE.affiliates.find(a => a.id === affId)?.name || 'Desconhecido';
  const nfName = nfFile ? nfFile.name : '';
  const nfLink = nfUrl || '';

  const newPay = {
    id: 'py' + Date.now(),
    affiliateId: affId, affiliate, brand, contract, amount, dueDate,
    status: 'pendente', nfName, nfLink
  };

  STATE.payments.unshift(newPay); 
  logAction('Solicitação de pagamento', `${affiliate} - ${fc(amount)}`);
  
  STATE.notifications.unshift({
    id: 'n' + Date.now(),
    type: 'blue',
    text: `Novo pagamento solicitado: ${affiliate} (${fc(amount)})`,
    time: 'agora',
    read: false,
    action: {module:'payments',tab:'queue',filter:'pendente',entityId:newPay.id}
  });

  closeModal();
  renderPyTbl(_pyF ? STATE.payments.filter(x => x.status === _pyF) : STATE.payments);
  updateActionCenter();
  updateNotifBadge();
  toast('Pagamento solicitado com sucesso!');
};

window.openBatch=()=>{
  const now=new Date();
  const mesRef=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const affs=STATE.affiliates.filter(a=>a.status==='ativo'&&Object.keys(a.deals||{}).length>0);
  openModal('Relatório de Fechamento — '+mesRef,`
    <div style="margin-bottom:12px">
      <p style="font-size:12px;color:var(--text2);margin-bottom:12px">Selecione os afiliados para gerar o relatório de fechamento em PDF:</p>
      <div style="display:flex;gap:6px;margin-bottom:12px">
        <button class="btn btn-outline" style="font-size:9px" onclick="document.querySelectorAll('.batch-chk').forEach(c=>c.checked=true)">Selecionar Todos</button>
        <button class="btn btn-outline" style="font-size:9px" onclick="document.querySelectorAll('.batch-chk').forEach(c=>c.checked=false)">Nenhum</button>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:7px">
      ${affs.map(a=>{
        const brands=Object.keys(a.deals||{});
        return `<label style="display:flex;align-items:center;gap:9px;padding:10px 12px;background:rgba(0,0,0,0.2);border-radius:9px;cursor:pointer">
          <input type="checkbox" class="batch-chk" value="${a.id}" checked style="accent-color:var(--theme);flex-shrink:0">
          <div style="flex:1">
            <span style="font-size:12px;font-weight:600;color:var(--text);display:block">${a.name}</span>
            <span style="font-size:10px;color:var(--text2)">${brands.join(', ')} · ${CONTRACT_TYPES[a.contractType]?.label||a.contractType}</span>
          </div>
          <span style="font-family:var(--fd);font-size:13px;font-weight:700;color:var(--theme)">${fc(a.commission)}</span>
        </label>`;
      }).join('')}
    </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-outline" onclick="generateAllReports()"><i data-lucide="file-text"></i> Gerar PDFs individuais</button>
    <button class="btn btn-theme" onclick="generateConsolidatedReport()"><i data-lucide="printer"></i> Relatório Consolidado</button>`);
  lucide.createIcons();
};

window.generateAllReports=()=>{
  const checked=[...document.querySelectorAll('.batch-chk:checked')].map(c=>c.value);
  if(!checked.length)return toast('Selecione pelo menos um afiliado','e');
  checked.forEach(id=>{const a=STATE.affiliates.find(x=>x.id===id);if(a)generateClosingPDF(a);});
  logAction('Relatórios gerados',`${checked.length} afiliado(s)`);
  closeModal();toast(`${checked.length} relatório(s) gerado(s)!`);
};

window.generateConsolidatedReport=()=>{
  const checked=[...document.querySelectorAll('.batch-chk:checked')].map(c=>c.value);
  if(!checked.length)return toast('Selecione pelo menos um afiliado','e');
  const affs=checked.map(id=>STATE.affiliates.find(x=>x.id===id)).filter(Boolean);
  generateClosingPDF(null,affs);
  logAction('Relatório consolidado gerado',`${affs.length} afiliado(s)`);
  closeModal();toast('Relatório consolidado gerado!');
};

window.generateClosingPDF=(affiliate,affiliatesList,filterBrand,filterMonth,closingData)=>{
  const now=new Date();
  const mesRef=filterMonth||now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const dataEmissao=now.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  const isConsolidated=!affiliate&&affiliatesList;
  const affs=isConsolidated?affiliatesList:[affiliate];
  const title=isConsolidated?'Relatório Consolidado de Fechamento':`Relatório de Fechamento — ${affiliate.name}`;

  let sections='';
  let totalComm=0,totalProfit=0,totalDep=0;

  affs.forEach(a=>{
    const brands=Object.keys(a.deals||{});
    const ct=CONTRACT_TYPES[a.contractType]||{label:'CPA'};
    totalComm+=a.commission;totalProfit+=a.profit;totalDep+=a.deposits;

    let brandRows='';
    brands.forEach(b=>{
      const deal=a.deals[b];const br=STATE.brands[b]||{color:'#888'};
      let dealDesc='';
      if(a.contractType==='tiered')dealDesc=(deal.levels||[]).map(l=>`${l.name}: R$ ${l.cpa} (base ${l.baseline})`).join(' | ')+` + RS ${deal.rs||0}%`;
      else if(a.contractType==='deposit')dealDesc=`Meta: R$ ${(deal.depositTarget||0).toLocaleString('pt-BR')}/mês`;
      else if(a.contractType==='pct_deposit')dealDesc=`${deal.pctDeposit||0}% dos depósitos + CPA R$ ${deal.cpa||0}`;
      else if(a.contractType==='rs')dealDesc=`Revenue Share: ${deal.rs||0}%`;
      else dealDesc=`CPA: R$ ${deal.cpa||0} + RS: ${deal.rs||0}%`;

      brandRows+=`<tr><td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600;color:${br.color}">${b}</td><td style="padding:8px 12px;border-bottom:1px solid #eee;font-size:11px;color:#666">${dealDesc}</td></tr>`;
    });

    sections+=`
      ${isConsolidated?`<div style="page-break-inside:avoid;margin-bottom:28px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">`:''}
      <div style="background:#f8fafc;padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-family:'Montserrat',sans-serif;font-size:18px;font-weight:800;color:#0f172a">${a.name}</div>
          <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px">${ct.label} · ${a.contactEmail||''}</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Comissão Total</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#ec4899">R$ ${a.commission.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <div style="padding:20px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div style="background:#f1f5f9;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">FTDs</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:24px;font-weight:800;color:#0f172a">${a.ftds}</div>
        </div>
        <div style="background:#f1f5f9;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">QFTDs</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:24px;font-weight:800;color:#ec4899">${a.qftds}</div>
        </div>
        <div style="background:#f1f5f9;border-radius:8px;padding:12px;text-align:center">
          <div style="font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px">Depósitos</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:18px;font-weight:800;color:#0f172a">R$ ${a.deposits.toLocaleString('pt-BR')}</div>
        </div>
      </div>

      <div style="padding:0 20px 16px">
        <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;margin-bottom:8px">Deals por Marca</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px">${brandRows}</table>
      </div>

      <div style="padding:0 20px 16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Net Revenue</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:${(a.netRev||0)>=0?'#10b981':'#ef4444'}">R$ ${(a.netRev||0).toLocaleString('pt-BR')}</div></div>
        <div><div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em">Lucro 3C</div>
          <div style="font-family:'Montserrat',sans-serif;font-size:16px;font-weight:700;color:#10b981">R$ ${a.profit.toLocaleString('pt-BR')}</div></div>
      </div>

      ${isConsolidated?'</div>':''}`;
  });

  // Totais consolidados
  let totalsHTML='';
  if(isConsolidated){
    totalsHTML=`<div style="margin-top:24px;padding:20px;background:linear-gradient(135deg,#fdf2f8,#f5f3ff);border-radius:12px;border:1px solid #f0abfc">
      <div style="font-size:9px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;font-weight:700;margin-bottom:12px">Totais Consolidados — ${affs.length} afiliado(s)</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <div><div style="font-size:9px;color:#64748b;text-transform:uppercase">Total Comissões</div><div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#ec4899">R$ ${totalComm.toLocaleString('pt-BR')}</div></div>
        <div><div style="font-size:9px;color:#64748b;text-transform:uppercase">Total Depósitos</div><div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#3b82f6">R$ ${totalDep.toLocaleString('pt-BR')}</div></div>
        <div><div style="font-size:9px;color:#64748b;text-transform:uppercase">Lucro 3C Total</div><div style="font-family:'Montserrat',sans-serif;font-size:22px;font-weight:800;color:#10b981">R$ ${totalProfit.toLocaleString('pt-BR')}</div></div>
      </div>
    </div>`;
  }

  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório de Fechamento — ${mesRef}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Inter',sans-serif;color:#0f172a;font-size:13px;line-height:1.6;background:#fff}
      @page{size:A4;margin:15mm 15mm 15mm 15mm}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
        /* Hide browser default headers/footers */
        @page{margin-top:10mm;margin-bottom:10mm}
      }
      .page{max-width:800px;margin:0 auto;padding:40px}
    </style></head><body>
    <div class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div style="background:#0f172a;border-radius:10px;padding:10px 18px;display:inline-flex;align-items:center">
          <img src="https://i.ibb.co/chfw0cND/Horizontal-Com-Tag-W.png" style="height:36px" crossorigin="anonymous">
        </div>
        <div style="text-align:right">
          <div style="font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#64748b">Relatório de Fechamento</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">${dataEmissao}</div>
        </div>
      </div>
      <div style="height:3px;background:linear-gradient(to right,#ec4899,#a855f7);border-radius:2px;margin-bottom:28px"></div>

      <div style="font-family:'Montserrat',sans-serif;font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px">${title}</div>
      <div style="font-size:11px;color:#94a3b8;margin-bottom:24px">Referência: ${mesRef.charAt(0).toUpperCase()+mesRef.slice(1)}</div>

      ${sections}
      ${totalsHTML}

      <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;text-align:center">
        <div style="font-size:9px;color:#cbd5e1;letter-spacing:0.15em;text-transform:uppercase">Confidencial · 3C Gaming BizDev · ${now.getFullYear()}</div>
      </div>
    </div></body></html>`;

  const w=window.open('','_blank');
  w.document.write(html);w.document.close();
  setTimeout(()=>w.print(),500);
};

window.sendBatch=()=>{
  const checked=[...document.querySelectorAll('#mbd input[type="checkbox"]:checked')];
  const appr=STATE.payments.filter(p=>p.status==='aprovado');
  let sent=0;
  appr.forEach((p,i)=>{if(checked[i]?.checked){p.status='pago';sent++;}});
  if(sent>0){logAction('Remessa enviada',`${sent} pagamento(s) confirmado(s)`);saveToLocal();}
  closeModal();
  renderPyTbl(_pyF?STATE.payments.filter(x=>x.status===_pyF):STATE.payments);
  toast(sent>0?`${sent} pagamento(s) confirmado(s)!`:'Nenhum selecionado');
};

// ══════════════════════════════════════════════════════════
// PRAZOS & CALENDÁRIO + AUTO-TASK GENERATOR
// ══════════════════════════════════════════════════════════
window.showPayTab=(tab,btn)=>{
  btn.closest('.tabs').querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  document.getElementById('pay-tab-closing').style.display=tab==='closing'?'block':'none';
  document.getElementById('pay-tab-queue').style.display=tab==='queue'?'block':'none';
  document.getElementById('pay-tab-deadlines').style.display=tab==='deadlines'?'block':'none';
  if(tab==='closing')renderClosingTab();
  if(tab==='deadlines')renderDeadlinesTab();
};

function renderClosingTab(){
  const el=document.getElementById('pay-tab-closing');if(!el)return;
  const now=new Date();
  const months=[];
  for(let i=0;i<6;i++){const d=new Date(now.getFullYear(),now.getMonth()-i,1);months.push({value:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,label:d.toLocaleDateString('pt-BR',{month:'long',year:'numeric'})});}

  // Histórico de fechamentos
  const closings=STATE.closings||[];

  el.innerHTML=`
    <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);margin-bottom:16px;font-size:11px;color:var(--text2);line-height:1.6">
      <strong style="color:var(--text)">Fechamento mensal:</strong> Selecione o afiliado, marca e mês de referência. O sistema calcula a comissão com base nos dados lançados, gera um PDF de relatório e cria automaticamente um pagamento pendente na aba <strong>Pagamentos</strong>.
    </div>

    <div class="intel-wrap" style="margin-bottom:20px">
      <div class="intel-hdr"><div>
        <div class="intel-eye">Executar Fechamento</div>
        <div class="intel-title">Novo Fechamento de Período</div>
        <div class="intel-sub">Calcula comissão → Gera PDF → Cria pagamento pendente</div>
      </div></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:14px">
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          <div class="fgp"><label>Afiliado *</label>
            <select class="fi" id="cl-aff" onchange="updateClosingDeals()">
              <option value="">Selecione...</option>
              ${STATE.affiliates.filter(a=>a.status==='ativo').map(a=>`<option value="${a.id}">${a.name}</option>`).join('')}
            </select>
          </div>
          <div class="fgp"><label>Mês de Referência *</label>
            <select class="fi" id="cl-month">
              ${months.map((m,i)=>`<option value="${m.value}" ${i===0?'selected':''}>${m.label}</option>`).join('')}
            </select>
          </div>
          <div class="fgp"><label>Marca *</label>
            <select class="fi" id="cl-brand" onchange="updateClosingDeals()">
              <option value="">Selecione...</option>
              ${Object.keys(STATE.brands).map(b=>`<option value="${b}">${b}</option>`).join('')}
            </select>
          </div>
          <div class="fgp"><label>Deal / Contrato</label>
            <select class="fi" id="cl-deal"><option value="">Automático</option></select>
          </div>
        </div>

        <div id="cl-preview" style="display:none;padding:16px;background:var(--bg3);border:1px solid var(--gb);border-radius:12px">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:10px">Preview do Fechamento</div>
          <div id="cl-preview-content"></div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-outline" onclick="previewClosing()"><i data-lucide="eye"></i> Preview</button>
          <button class="btn btn-theme" onclick="executeClosing()"><i data-lucide="zap"></i> Executar Fechamento</button>
        </div>
      </div>
    </div>

    <div class="sec-hdr">
      <div class="sec-lbl">Fechamentos Realizados</div>
      ${closings.length?`<div class="sec-actions">
        <button class="btn btn-outline" id="cl-batch-btn" style="display:none" onclick="sendBatchClosingEmail()"><i data-lucide="send"></i> Enviar Remessa (<span id="cl-batch-count">0</span>)</button>
      </div>`:''}
    </div>
    ${closings.length?`<div class="tbl-wrap"><table><thead><tr>
      <th style="width:36px"><input type="checkbox" id="cl-check-all" onchange="toggleAllClosings(this.checked)" style="accent-color:var(--theme)"></th>
      <th>Afiliado</th><th>Marca</th><th>Referência</th><th>Comissão</th><th>Status</th><th>Data</th><th>Ações</th>
    </tr></thead><tbody>
      ${closings.slice().reverse().map(c=>`<tr class="tr">
        <td onclick="event.stopPropagation()"><input type="checkbox" class="cl-check" value="${c.id}" onchange="updateBatchCount()" style="accent-color:var(--theme)"></td>
        <td class="td-name">${c.affiliateName}</td>
        <td><span style="font-size:10px;font-weight:700;color:${STATE.brands[c.brand]?.color||'#888'}">${c.brand}</span></td>
        <td style="font-size:11px;color:var(--text2)">${c.monthLabel}</td>
        <td class="td-money">${fc(c.commission)}</td>
        <td><span class="pb pb-${c.paymentStatus}">${pl(c.paymentStatus)}</span></td>
        <td style="font-size:10px;color:var(--text3)">${c.createdAt}</td>
        <td class="td-acts">
          <button class="ibt" onclick="regenerateClosingPDF('${c.id}')" title="Gerar PDF"><i data-lucide="file-text"></i></button>
          <button class="ibt" onclick="sendClosingEmail(STATE.closings.find(x=>x.id==='${c.id}'))" title="Enviar individual"><i data-lucide="send"></i></button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>`:'<div class="mob-home-empty">Nenhum fechamento realizado.</div>'}`;
  lucide.createIcons();
}

window.toggleAllClosings=(checked)=>{
  document.querySelectorAll('.cl-check').forEach(cb=>cb.checked=checked);
  updateBatchCount();
};

window.updateBatchCount=()=>{
  const count=document.querySelectorAll('.cl-check:checked').length;
  const btn=document.getElementById('cl-batch-btn');
  const span=document.getElementById('cl-batch-count');
  if(btn)btn.style.display=count>0?'inline-flex':'none';
  if(span)span.textContent=count;
};

window.sendBatchClosingEmail=()=>{
  const cfg=STATE.emailjs;
  if(!cfg?.publicKey||!cfg?.serviceId||!cfg?.templateId||!cfg?.financeEmail)
    return toast('EmailJS não configurado. Vá em Backup & Nuvem.','w');

  const selectedIds=[...document.querySelectorAll('.cl-check:checked')].map(cb=>cb.value);
  if(!selectedIds.length)return toast('Selecione pelo menos um fechamento','e');

  const selected=selectedIds.map(id=>(STATE.closings||[]).find(c=>c.id===id)).filter(Boolean);
  const totalComm=selected.reduce((s,c)=>s+c.commission,0);

  // Build summary table
  const lines=selected.map(c=>{
    return `• ${c.affiliateName} — ${c.brand} (${c.monthLabel}): ${fc(c.commission)} | FTDs: ${c.ftds} | QFTDs: ${c.qftds} | Dep: ${fc(c.deposits)}`;
  }).join('\n');

  openModal('Enviar Remessa ao Financeiro',`
    <div style="font-size:12px;color:var(--text2);line-height:1.6;margin-bottom:14px">
      <strong style="color:var(--text)">${selected.length} fechamento${selected.length>1?'s':''}</strong> selecionado${selected.length>1?'s':''} para envio ao <strong style="color:var(--theme)">${cfg.financeEmail}</strong>
    </div>
    <div style="max-height:300px;overflow-y:auto;margin-bottom:14px">
      ${selected.map(c=>`
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;margin-bottom:6px;border-left:3px solid ${STATE.brands[c.brand]?.color||'#888'}">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text)">${c.affiliateName}</div>
            <div style="font-size:10px;color:var(--text3)">${c.brand} · ${c.monthLabel} · FTDs: ${c.ftds} · QFTDs: ${c.qftds}</div>
          </div>
          <div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--red)">${fc(c.commission)}</div>
        </div>`).join('')}
    </div>
    <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:11px;font-weight:700;color:var(--text)">Total da Remessa</span>
      <span style="font-family:var(--fd);font-size:18px;font-weight:800;color:var(--red)">${fc(totalComm)}</span>
    </div>`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-theme" onclick="confirmBatchSend()"><i data-lucide="send"></i> Enviar Remessa</button>`);
  lucide.createIcons();

  // Store for confirm
  window._batchClosings=selected;
  window._batchLines=lines;
  window._batchTotal=totalComm;
};

window.confirmBatchSend=()=>{
  const cfg=STATE.emailjs;
  const selected=window._batchClosings;if(!selected?.length)return;
  if(typeof emailjs==='undefined')return toast('SDK EmailJS não carregado','e');

  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId,cfg.templateId,{
    to_email:cfg.financeEmail,
    subject:`3COS — Remessa de Fechamentos (${selected.length}) — ${fc(window._batchTotal)}`,
    affiliate_name:`Remessa com ${selected.length} fechamento(s)`,
    brand:selected.map(c=>c.brand).filter((v,i,a)=>a.indexOf(v)===i).join(', '),
    month_ref:selected[0]?.monthLabel||'',
    contract_type:'Diversos',
    commission:fc(window._batchTotal),
    ftds:String(selected.reduce((s,c)=>s+c.ftds,0)),
    qftds:String(selected.reduce((s,c)=>s+c.qftds,0)),
    deposits:fc(selected.reduce((s,c)=>s+c.deposits,0)),
    net_rev:fc(selected.reduce((s,c)=>s+(c.netRev||0),0)),
    profit:fc(selected.reduce((s,c)=>s+(c.profit||0),0)),
    analyst:STATE.user?.name||'',
    date:new Date().toLocaleDateString('pt-BR'),
    message:`REMESSA DE FECHAMENTOS — ${selected.length} nota(s)\nTotal: ${fc(window._batchTotal)}\nEnviado por: ${STATE.user?.name||'—'}\n\n${window._batchLines}\n\nPor favor, verificar e processar os pagamentos.`
  }).then(()=>{
    toast(`Remessa de ${selected.length} fechamento(s) enviada!`);
    logAction('Remessa de fechamentos enviada',`${selected.length} notas · ${fc(window._batchTotal)}`);
    closeModal();
  },(err)=>toast('Erro ao enviar: '+err.text,'e'));
};

window.updateClosingDeals=()=>{
  const affId=document.getElementById('cl-aff')?.value;
  const brand=document.getElementById('cl-brand')?.value;
  const dealSelect=document.getElementById('cl-deal');
  dealSelect.innerHTML='<option value="">Automático</option>';
  if(affId&&brand){
    const cts=STATE.contracts.filter(c=>c.affiliateId===affId&&c.brand===brand&&c.status==='ativo');
    cts.forEach(c=>{dealSelect.innerHTML+=`<option value="${c.id}">${c.name} (${fc(c.value)})</option>`;});
  }
};

window.previewClosing=()=>{
  const affId=document.getElementById('cl-aff')?.value;
  const brand=document.getElementById('cl-brand')?.value;
  const month=document.getElementById('cl-month')?.value;
  if(!affId||!brand||!month)return toast('Selecione afiliado, marca e mês','e');

  const a=STATE.affiliates.find(x=>x.id===affId);if(!a)return;
  const deal=a.deals?.[brand];
  const ct=CONTRACT_TYPES[a.contractType]||{label:'CPA'};
  const br=STATE.brands[brand]||{color:'#888'};

  let dealInfo='';
  if(a.contractType==='tiered')dealInfo=(deal?.levels||[]).map(l=>`${l.name}: R$ ${l.cpa} (base ${l.baseline})`).join(' | ')+` + RS ${deal?.rs||0}%`;
  else if(a.contractType==='deposit')dealInfo=`Meta: R$ ${(deal?.depositTarget||0).toLocaleString('pt-BR')}/mês`;
  else if(a.contractType==='pct_deposit')dealInfo=`${deal?.pctDeposit||0}% dos depósitos + CPA R$ ${deal?.cpa||0}`;
  else if(a.contractType==='rs')dealInfo=`RS: ${deal?.rs||0}%`;
  else dealInfo=`CPA: R$ ${deal?.cpa||0} + RS: ${deal?.rs||0}%`;

  const preview=document.getElementById('cl-preview');
  const content=document.getElementById('cl-preview-content');
  preview.style.display='block';
  content.innerHTML=`
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="dr"><span>Afiliado</span><strong>${a.name}</strong></div>
      <div class="dr"><span>Marca</span><strong style="color:${br.color}">${brand}</strong></div>
      <div class="dr"><span>Tipo</span><strong>${ct.label}</strong></div>
      <div class="dr"><span>Deal</span><strong style="font-size:10px">${dealInfo}</strong></div>
      <div class="dr"><span>FTDs</span><strong>${a.ftds}</strong></div>
      <div class="dr"><span>QFTDs</span><strong style="color:var(--pink)">${a.qftds}</strong></div>
      <div class="dr"><span>Depósitos</span><strong>${fc(a.deposits)}</strong></div>
      <div class="dr"><span>Comissão</span><strong style="color:var(--red)">${fc(a.commission)}</strong></div>
    </div>`;
};

window.executeClosing=()=>{
  const affId=document.getElementById('cl-aff')?.value;
  const brand=document.getElementById('cl-brand')?.value;
  const month=document.getElementById('cl-month')?.value;
  const dealId=document.getElementById('cl-deal')?.value;
  if(!affId||!brand||!month)return toast('Selecione afiliado, marca e mês','e');

  const a=STATE.affiliates.find(x=>x.id===affId);if(!a)return;
  const monthLabel=document.getElementById('cl-month').selectedOptions[0]?.text||month;
  const br=STATE.brands[brand]||{};
  const ct=CONTRACT_TYPES[a.contractType]||{label:'CPA'};
  const deal=a.deals?.[brand]||{};

  // Criar registro de fechamento
  if(!STATE.closings)STATE.closings=[];
  const closingId='cl'+Date.now();
  const closing={
    id:closingId,affiliateId:affId,affiliateName:a.name,
    brand,monthRef:month,monthLabel,dealId:dealId||'',
    contractType:a.contractType,deal:JSON.parse(JSON.stringify(deal)),
    ftds:a.ftds,qftds:a.qftds,deposits:a.deposits,
    netRev:a.netRev||0,commission:a.commission,profit:a.profit,
    paymentStatus:'pendente',
    createdAt:new Date().toLocaleDateString('pt-BR'),
    createdBy:STATE.user?.name||''
  };
  STATE.closings.push(closing);

  // Criar ticket na fila de pagamentos
  const contract=dealId?STATE.contracts.find(c=>c.id===dealId):null;
  STATE.payments.unshift({
    id:'py'+Date.now(),affiliateId:affId,affiliate:a.name,brand,
    contract:contract?.name||`Fechamento ${brand} — ${monthLabel}`,
    contractId:dealId||'',amount:a.commission,
    dueDate:'',status:'pendente',type:`Fechamento ${monthLabel}`,nfName:''
  });

  // Notificação
  STATE.notifications.unshift({
    id:'n'+Date.now(),type:'blue',
    text:`Fechamento ${a.name} (${brand}) — ${monthLabel}: ${fc(a.commission)}`,
    time:'agora',read:false,
    action:{module:'payments',tab:'closing'}
  });

  logAction('Fechamento executado',`${a.name} · ${brand} · ${monthLabel}`);
  saveToLocal();updateNotifBadge();

  // Gerar PDF
  generateClosingPDF(a,null,brand,monthLabel,closing);

  toast('Fechamento executado! Ticket criado na fila.');
  renderClosingTab();

  // Oferecer envio por email
  if(STATE.emailjs?.publicKey){
    setTimeout(()=>{
      openModal('Enviar ao Financeiro?',`
        <div style="font-size:12px;color:var(--text2);line-height:1.6">
          <p>Fechamento de <strong style="color:var(--text)">${a.name}</strong> (${brand}) — ${monthLabel} concluído.</p>
          <p style="margin-top:8px">Deseja enviar os detalhes por email para <strong style="color:var(--theme)">${STATE.emailjs.financeEmail}</strong>?</p>
          <div style="margin-top:12px;padding:12px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;font-size:11px">
            <div class="dr"><span>Comissão</span><strong style="color:var(--red)">${fc(closing.commission)}</strong></div>
            <div class="dr"><span>FTDs / QFTDs</span><strong>${closing.ftds} / ${closing.qftds}</strong></div>
            <div class="dr"><span>Depósitos</span><strong>${fc(closing.deposits)}</strong></div>
          </div>
        </div>`,
      `<button class="btn btn-ghost" onclick="closeModal()">Agora Não</button>
       <button class="btn btn-theme" onclick="sendClosingEmail(STATE.closings.find(x=>x.id==='${closingId}'));closeModal()"><i data-lucide="send"></i> Enviar Email</button>`);
      lucide.createIcons();
    },600);
  }
};

window.regenerateClosingPDF=(closingId)=>{
  const c=(STATE.closings||[]).find(x=>x.id===closingId);if(!c)return toast('Fechamento não encontrado','e');
  const a=STATE.affiliates.find(x=>x.id===c.affiliateId)||{name:c.affiliateName,ftds:c.ftds,qftds:c.qftds,deposits:c.deposits,netRev:c.netRev,commission:c.commission,profit:c.profit,contractType:c.contractType,deals:{[c.brand]:c.deal},notes:''};
  generateClosingPDF(a,null,c.brand,c.monthLabel,c);
};

// ══════════════════════════════════════════════════════════
// FINANCIAL SUMMARY WIDGET — A Pagar / A Receber / Saldo
// ══════════════════════════════════════════════════════════
function renderFinancialSummary(){
  const now=new Date();
  const y=now.getFullYear(),m=now.getMonth();
  const monthStart=new Date(y,m,1),monthEnd=new Date(y,m+1,0,23,59,59);
  const monthLabel=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  // A Pagar: pagamentos não-pagos do mês atual (por dueDate)
  const toPay=(STATE.payments||[]).filter(p=>{
    if(p.status==='pago'||p.status==='recusado')return false;
    if(!p.dueDate)return false;
    const d=new Date(p.dueDate);
    return d>=monthStart&&d<=monthEnd;
  });
  const toPaySum=toPay.reduce((s,p)=>s+(p.amount||0),0);
  const overdue=toPay.filter(p=>new Date(p.dueDate)<now);
  const overdueSum=overdue.reduce((s,p)=>s+(p.amount||0),0);

  // A Receber: closings do mês (commission + profit = total que a marca vai repassar)
  const monthClosings=(STATE.closings||[]).filter(c=>{
    // Match monthLabel loosely (e.g. "abril de 2026" matches the current month)
    const cLabel=(c.monthLabel||'').toLowerCase();
    const curLabel=monthLabel.toLowerCase();
    return cLabel===curLabel||cLabel.includes(curLabel.split(' ')[0]);
  });
  const toReceive=monthClosings.reduce((s,c)=>s+(c.commission||0)+(c.profit||0),0);

  // Saldo previsto
  const saldo=toReceive-toPaySum;
  const saldoOk=saldo>=0;

  // Helpers
  const countTxt=(n,singular,plural)=>`${n} ${n===1?singular:plural}`;

  return `<div class="fin-summary">
    <div class="fin-summary-hdr">
      <div>
        <div class="fin-summary-eye">Controle Financeiro</div>
        <div class="fin-summary-title">${monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</div>
        <div class="fin-summary-sub">Fluxo previsto do mês</div>
      </div>
    </div>
    <div class="fin-summary-grid">
      <div class="fin-card fin-card-out">
        <div class="fin-card-head">
          <i data-lucide="arrow-up-right" style="stroke:#ef4444"></i>
          <span class="fin-card-lbl">A Pagar</span>
        </div>
        <div class="fin-card-val">${fc(toPaySum)}</div>
        <div class="fin-card-meta">${countTxt(toPay.length,'pagamento','pagamentos')}${overdueSum?`<span class="fin-card-alert"> · ${fc(overdueSum)} vencido</span>`:''}</div>
      </div>
      <div class="fin-card fin-card-in">
        <div class="fin-card-head">
          <i data-lucide="arrow-down-left" style="stroke:#10b981"></i>
          <span class="fin-card-lbl">A Receber</span>
        </div>
        <div class="fin-card-val">${fc(toReceive)}</div>
        <div class="fin-card-meta">${countTxt(monthClosings.length,'fechamento','fechamentos')} — previsto das marcas</div>
      </div>
      <div class="fin-card fin-card-net ${saldoOk?'fin-card-positive':'fin-card-negative'}">
        <div class="fin-card-head">
          <i data-lucide="wallet" style="stroke:${saldoOk?'#10b981':'#ef4444'}"></i>
          <span class="fin-card-lbl">Saldo Previsto</span>
        </div>
        <div class="fin-card-val">${saldoOk?'+':''}${fc(saldo)}</div>
        <div class="fin-card-meta">${saldoOk?'Fluxo positivo':'⚠ Atenção no fluxo'}</div>
      </div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════════
// MONTHLY VISUAL CALENDAR — Google Calendar-style grid
// ══════════════════════════════════════════════════════════
let _calMonth=null,_calYear=null;

function _buildCalEvents(year,month){
  const now=new Date();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const events={};
  const add=(day,e)=>{if(!events[day])events[day]=[];events[day].push(e);};

  // Pagamentos com dueDate no mês
  (STATE.payments||[]).forEach(p=>{
    if(!p.dueDate)return;
    const d=new Date(p.dueDate);
    if(d.getFullYear()!==year||d.getMonth()!==month)return;
    const isOverdue=d<now&&p.status!=='pago';
    const color=p.status==='pago'?'#10b981':isOverdue?'#ef4444':'#f59e0b';
    add(d.getDate(),{
      type:'payment',color,
      label:`${p.affiliate} — ${fc(p.amount)}`,
      sub:`${p.brand} · ${pl(p.status)}`,
      id:p.id,
      action:`closeModal();openMod('payments');setTimeout(()=>{const tb=document.querySelector('[onclick*="showPayTab(\\'queue\\'"]');if(tb)showPayTab('queue',tb);},320);`
    });
  });

  // Repasses de marca (recorrente mensal)
  const dl=STATE.deadlines||{};
  Object.entries(dl.brandPayDays||{}).forEach(([brand,day])=>{
    if(day<1||day>daysInMonth)return;
    const br=STATE.brands[brand];if(!br)return;
    add(day,{
      type:'brand',color:br.color,
      label:`Repasse ${brand}`,
      sub:'Marca repassa para 3C',
      action:`closeModal();openMod('brands');`
    });
  });

  // Lembretes customizados
  (STATE.reminders||[]).forEach(r=>{
    if(!r.date)return;
    const d=new Date(r.date);
    if(d.getFullYear()!==year||d.getMonth()!==month)return;
    add(d.getDate(),{
      type:'reminder',color:'#a855f7',
      label:r.title,
      sub:r.note||'Lembrete',
      action:`closeModal();`
    });
  });

  return events;
}

function renderMonthlyCalendar(){
  const now=new Date();
  if(_calMonth===null){_calMonth=now.getMonth();_calYear=now.getFullYear();}

  const firstDay=new Date(_calYear,_calMonth,1);
  const daysInMonth=new Date(_calYear,_calMonth+1,0).getDate();
  const startWeekday=firstDay.getDay();
  const events=_buildCalEvents(_calYear,_calMonth);

  const monthLabel=firstDay.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  const totalEvents=Object.values(events).reduce((s,arr)=>s+arr.length,0);
  const weekdays=['DOM','SEG','TER','QUA','QUI','SEX','SAB'];

  let grid='';
  // Leading blank cells
  for(let i=0;i<startWeekday;i++){
    grid+=`<div class="fin-cal-day fin-cal-day-empty"></div>`;
  }

  // Day cells
  for(let day=1;day<=daysInMonth;day++){
    const date=new Date(_calYear,_calMonth,day);
    const isToday=date.toDateString()===now.toDateString();
    const wd=date.getDay();
    const isWeekend=wd===0||wd===6;
    const dayEvents=events[day]||[];
    const hasEvents=dayEvents.length>0;
    const overdueCount=dayEvents.filter(e=>e.color==='#ef4444').length;

    grid+=`
      <div class="fin-cal-day ${isToday?'fin-cal-day-today':''} ${isWeekend?'fin-cal-day-weekend':''} ${hasEvents?'fin-cal-day-hasevents':''} ${overdueCount?'fin-cal-day-alert':''}"
           ${hasEvents?`onclick="calShowDay(${day})"`:''}>
        <div class="fin-cal-day-num">${day}</div>
        ${hasEvents?`
          <div class="fin-cal-dots">
            ${dayEvents.slice(0,4).map(e=>`<span class="fin-cal-dot" style="background:${e.color}" title="${e.label}"></span>`).join('')}
            ${dayEvents.length>4?`<span class="fin-cal-more">+${dayEvents.length-4}</span>`:''}
          </div>
        `:''}
      </div>`;
  }

  return `<div class="intel-wrap" style="margin-bottom:20px" id="fin-cal-wrap-inner">
    <div class="intel-hdr" style="align-items:center">
      <div>
        <div class="intel-eye">Calendário Financeiro</div>
        <div class="intel-title">${monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1)}</div>
        <div class="intel-sub">${totalEvents} evento${totalEvents!==1?'s':''} neste mês</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button class="btn btn-outline" onclick="calNavMonth(-1)" style="padding:6px 10px"><i data-lucide="chevron-left" style="width:14px;height:14px"></i></button>
        <button class="btn btn-outline" onclick="calGoToday()" style="padding:6px 12px;font-size:10px">HOJE</button>
        <button class="btn btn-outline" onclick="calNavMonth(1)" style="padding:6px 10px"><i data-lucide="chevron-right" style="width:14px;height:14px"></i></button>
      </div>
    </div>
    <div style="padding:16px 20px 20px">
      <div class="fin-cal-weekdays">
        ${weekdays.map(w=>`<div>${w}</div>`).join('')}
      </div>
      <div class="fin-cal-grid">${grid}</div>
      <div class="fin-cal-legend">
        <div class="fin-cal-legend-item"><span class="fin-cal-dot" style="background:#ef4444"></span>Vencido</div>
        <div class="fin-cal-legend-item"><span class="fin-cal-dot" style="background:#f59e0b"></span>Pendente</div>
        <div class="fin-cal-legend-item"><span class="fin-cal-dot" style="background:#10b981"></span>Pago / Repasse</div>
        <div class="fin-cal-legend-item"><span class="fin-cal-dot" style="background:#a855f7"></span>Lembrete</div>
      </div>
    </div>
  </div>`;
}

window.calNavMonth=(delta)=>{
  _calMonth+=delta;
  if(_calMonth<0){_calMonth=11;_calYear--;}
  if(_calMonth>11){_calMonth=0;_calYear++;}
  const wrap=document.getElementById('fin-cal-wrap');
  if(wrap){wrap.innerHTML=renderMonthlyCalendar();lucide.createIcons();}
};

window.calGoToday=()=>{
  const now=new Date();
  _calMonth=now.getMonth();_calYear=now.getFullYear();
  const wrap=document.getElementById('fin-cal-wrap');
  if(wrap){wrap.innerHTML=renderMonthlyCalendar();lucide.createIcons();}
};

window.calShowDay=(day)=>{
  const events=_buildCalEvents(_calYear,_calMonth)[day]||[];
  if(!events.length)return;
  const date=new Date(_calYear,_calMonth,day);
  const dateStr=date.toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});

  const body=`<div style="display:flex;flex-direction:column;gap:8px">
    ${events.map(e=>`
      <div class="fin-cal-event" ${e.action?`onclick="${e.action}"`:''} style="border-left:3px solid ${e.color}">
        <div class="fin-cal-event-dot" style="background:${e.color}"></div>
        <div style="flex:1;min-width:0">
          <div class="fin-cal-event-label">${e.label}</div>
          <div class="fin-cal-event-sub">${e.sub||''}</div>
        </div>
        ${e.action?`<i data-lucide="chevron-right" style="width:14px;height:14px;stroke:var(--text3);flex-shrink:0"></i>`:''}
      </div>
    `).join('')}
  </div>`;

  openModal(dateStr,body,`<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>`);
  lucide.createIcons();
};

function renderDeadlinesTab(){
  const el=document.getElementById('pay-tab-deadlines');if(!el)return;
  const dl=STATE.deadlines||{brandPayDays:{},affiliatePayDays:10,nfReminderDays:5,lastGenerated:''};
  const brands=Object.keys(STATE.brands);

  el.innerHTML=`
    ${renderFinancialSummary()}
    <div id="fin-cal-wrap">${renderMonthlyCalendar()}</div>
    <div class="intel-wrap" style="margin-bottom:20px">
      <div class="intel-hdr"><div>
        <div class="intel-eye">Configuração de Prazos</div>
        <div class="intel-title">Datas de Repasse</div>
        <div class="intel-sub">Define quando cada marca repassa e o prazo para pagar afiliados</div>
      </div></div>
      <div style="padding:20px;display:flex;flex-direction:column;gap:16px">
        <div class="dtl">Dia de Repasse por Marca (dia do mês)</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px">
          ${brands.map(b=>{
            const br=STATE.brands[b];
            return `<div style="padding:12px;background:rgba(${br.rgb},0.06);border:1px solid rgba(${br.rgb},0.2);border-radius:12px;display:flex;align-items:center;gap:10px">
              <div style="width:8px;height:8px;border-radius:50%;background:${br.color};flex-shrink:0"></div>
              <span style="font-size:12px;font-weight:700;color:${br.color};flex:1">${b}</span>
              <input type="number" min="1" max="31" class="fi dl-brand-day" data-brand="${b}" value="${dl.brandPayDays[b]||15}" style="width:60px;padding:6px;font-size:13px;text-align:center">
            </div>`;
          }).join('')}
        </div>

        <div class="dtl" style="margin-top:8px">Prazos Gerais</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">
          <div style="padding:12px;background:var(--bg3);border:1px solid var(--gb);border-radius:12px">
            <label style="font-size:9px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:6px">Dias após repasse da marca para pagar afiliado</label>
            <input type="number" min="1" max="60" class="fi" id="dl-aff-days" value="${dl.affiliatePayDays||10}" style="padding:8px;font-size:13px">
          </div>
          <div style="padding:12px;background:var(--bg3);border:1px solid var(--gb);border-radius:12px">
            <label style="font-size:9px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:0.1em;display:block;margin-bottom:6px">Dias antes do vencimento para lembrete de NF</label>
            <input type="number" min="1" max="30" class="fi" id="dl-nf-days" value="${dl.nfReminderDays||5}" style="padding:8px;font-size:13px">
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
          <button class="btn btn-theme" onclick="saveDeadlines()"><i data-lucide="save"></i> Salvar Prazos</button>
          <button class="btn btn-outline" onclick="generatePaymentTasks()"><i data-lucide="zap"></i> Gerar Tarefas do Mês</button>
        </div>
      </div>
    </div>

    <div class="intel-wrap" style="margin-bottom:20px">
      <div class="intel-hdr"><div>
        <div class="intel-eye">Lembretes Personalizados</div>
        <div class="intel-title">Lembretes Manuais</div>
      </div>
      <button class="btn btn-theme" onclick="openNewReminder()" style="flex-shrink:0"><i data-lucide="plus"></i> Novo Lembrete</button>
      </div>
      <div style="padding:20px" id="dl-reminders"></div>
    </div>

    <div class="intel-wrap">
      <div class="intel-hdr"><div>
        <div class="intel-eye">Calendário Visual</div>
        <div class="intel-title">Próximos Vencimentos</div>
      </div></div>
      <div style="padding:20px" id="dl-calendar"></div>
    </div>`;
  renderDeadlineCalendar();
  renderReminders();
  lucide.createIcons();
}

window.saveDeadlines=()=>{
  if(!STATE.deadlines)STATE.deadlines={brandPayDays:{},affiliatePayDays:10,nfReminderDays:5,lastGenerated:''};
  document.querySelectorAll('.dl-brand-day').forEach(inp=>{
    STATE.deadlines.brandPayDays[inp.dataset.brand]=parseInt(inp.value)||15;
  });
  STATE.deadlines.affiliatePayDays=parseInt(document.getElementById('dl-aff-days')?.value)||10;
  STATE.deadlines.nfReminderDays=parseInt(document.getElementById('dl-nf-days')?.value)||5;
  logAction('Prazos atualizados','Calendário financeiro');saveToLocal();toast('Prazos salvos!');
  renderDeadlineCalendar();
};

function renderDeadlineCalendar(){
  const el=document.getElementById('dl-calendar');if(!el)return;
  const dl=STATE.deadlines||{brandPayDays:{},affiliatePayDays:10,nfReminderDays:5};
  const now=new Date();
  const events=[];

  Object.entries(dl.brandPayDays).forEach(([brand,day])=>{
    const br=STATE.brands[brand];if(!br)return;
    // Repasse da marca (este mês ou próximo)
    let brandDate=new Date(now.getFullYear(),now.getMonth(),day);
    if(brandDate<now)brandDate=new Date(now.getFullYear(),now.getMonth()+1,day);
    events.push({date:brandDate,type:'brand',label:`${brand} repassa para 3C`,color:br.color,icon:'building-2'});

    // NF reminder
    const nfDate=new Date(brandDate);nfDate.setDate(nfDate.getDate()-(dl.nfReminderDays||5));
    if(nfDate>now)events.push({date:nfDate,type:'nf',label:`Lembrete NF — ${brand}`,color:'#f59e0b',icon:'file-text'});

    // Pagamento dos afiliados
    const affDate=new Date(brandDate);affDate.setDate(affDate.getDate()+(dl.affiliatePayDays||10));
    events.push({date:affDate,type:'aff',label:`Pagar afiliados ${brand}`,color:'#10b981',icon:'banknote'});
  });

  // Add custom reminders
  (STATE.reminders||[]).forEach(r=>{
    const d=new Date(r.date);
    if(d>=now)events.push({date:d,type:'reminder',label:r.title,color:'var(--purple)',icon:'bell',note:r.note||''});
  });
  events.sort((a,b)=>a.date-b.date);
  const upcoming=events.filter(e=>e.date>=now).slice(0,12);

  el.innerHTML=upcoming.length?`<div style="display:flex;flex-direction:column;gap:8px">
    ${upcoming.map(e=>{
      const days=Math.ceil((e.date-now)/(1000*60*60*24));
      const dateStr=e.date.toLocaleDateString('pt-BR');
      const urgency=days<=3?'var(--red)':days<=7?'var(--amber)':'var(--text2)';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;border-left:3px solid ${e.color}">
        <i data-lucide="${e.icon}" style="width:16px;height:16px;stroke:${e.color};flex-shrink:0"></i>
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--text)">${e.label}</div>
          <div style="font-size:10px;color:var(--text3)">${dateStr}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${urgency}">${days===0?'Hoje':days===1?'Amanhã':`${days} dias`}</span>
      </div>`;
    }).join('')}
  </div>`:'<div class="mob-home-empty">Configure os prazos acima para ver o calendário.</div>';
  lucide.createIcons();
}

window.generatePaymentTasks=()=>{
  const dl=STATE.deadlines||{brandPayDays:{},affiliatePayDays:10,nfReminderDays:5};
  const now=new Date();
  const monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  if(dl.lastGenerated===monthKey){
    if(!confirm('Tarefas deste mês já foram geradas. Gerar novamente?'))return;
  }

  let count=0;
  const monthName=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});

  Object.entries(dl.brandPayDays).forEach(([brand,day])=>{
    const br=STATE.brands[brand];if(!br)return;
    const brandDate=new Date(now.getFullYear(),now.getMonth(),day);
    const nfDate=new Date(brandDate);nfDate.setDate(nfDate.getDate()-(dl.nfReminderDays||5));
    const affPayDate=new Date(brandDate);affPayDate.setDate(affPayDate.getDate()+(dl.affiliatePayDays||10));

    // Afiliados ativos com deals nessa marca
    const affsWithBrand=STATE.affiliates.filter(a=>a.status==='ativo'&&a.deals&&a.deals[brand]);

    if(affsWithBrand.length>0){
      // Tarefa: Enviar NFs para o financeiro
      STATE.tasks.unshift({
        id:'tk'+Date.now()+count,title:`Enviar NFs ${brand} — ${monthName}`,
        description:`Cobrar NFs dos afiliados: ${affsWithBrand.map(a=>a.name).join(', ')}.\nPrazo de repasse da ${brand}: dia ${day}.`,
        linkedModule:'payments',affiliateId:'',contractId:'',
        priority:'alta',status:'pendente',
        assignee:STATE.users.find(u=>u.role==='financeiro')?.name||STATE.user?.name||'',
        dueDate:nfDate.toISOString().split('T')[0]
      });count++;

      // Tarefa: Pagamento dos afiliados
      affsWithBrand.forEach(aff=>{
        STATE.tasks.unshift({
          id:'tk'+Date.now()+count,title:`Pagar ${aff.name} — ${brand} ${monthName}`,
          description:`Pagamento ref. ${monthName}.\nTipo: ${CONTRACT_TYPES[aff.contractType]?.label||aff.contractType}.\nPrazo: ${affPayDate.toLocaleDateString('pt-BR')}.`,
          linkedModule:'payments',affiliateId:aff.id,contractId:'',
          priority:'alta',status:'pendente',
          assignee:STATE.users.find(u=>u.role==='financeiro')?.name||STATE.user?.name||'',
          dueDate:affPayDate.toISOString().split('T')[0]
        });count++;
      });
    }
  });

  STATE.deadlines.lastGenerated=monthKey;
  logAction('Tarefas financeiras geradas',`${count} tarefa(s) — ${monthName}`);
  saveToLocal();toast(`${count} tarefa(s) gerada(s) para ${monthName}!`);

  // Gerar notificação
  STATE.notifications.unshift({
    id:'n'+Date.now(),type:'green',
    text:`${count} tarefas financeiras geradas para ${monthName}`,
    time:'agora',read:false
  });
  updateNotifBadge();
};

// ══════════════════════════════════════════════════════════
// LEMBRETES PERSONALIZADOS (CRUD)
// ══════════════════════════════════════════════════════════
function renderReminders(){
  const el=document.getElementById('dl-reminders');if(!el)return;
  if(!STATE.reminders)STATE.reminders=[];
  const sorted=[...STATE.reminders].sort((a,b)=>new Date(a.date)-new Date(b.date));
  const now=new Date();
  el.innerHTML=sorted.length?`<div style="display:flex;flex-direction:column;gap:6px">
    ${sorted.map(r=>{
      const d=new Date(r.date);const days=Math.ceil((d-now)/(1000*60*60*24));
      const past=days<0;const urgency=past?'var(--red)':days<=3?'var(--amber)':'var(--text2)';
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;${past?'opacity:0.6':''}">
        <div style="flex:1">
          <div style="font-size:12px;font-weight:600;color:var(--text)">${r.title}</div>
          <div style="font-size:10px;color:var(--text3)">${d.toLocaleDateString('pt-BR')}${r.note?' · '+r.note:''}</div>
        </div>
        <span style="font-size:10px;font-weight:700;color:${urgency};white-space:nowrap">${past?`${Math.abs(days)}d atrás`:days===0?'Hoje':days===1?'Amanhã':`${days}d`}</span>
        <button onclick="editReminder('${r.id}')" style="background:none;border:none;color:var(--theme);cursor:pointer;padding:2px"><i data-lucide="edit-3" style="width:13px;height:13px"></i></button>
        <button onclick="deleteReminder('${r.id}')" style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
      </div>`;
    }).join('')}
  </div>`:'<div style="text-align:center;padding:16px;color:var(--text3);font-size:11px">Nenhum lembrete. Clique em "Novo Lembrete" para criar.</div>';
  lucide.createIcons();
}

window.openNewReminder=()=>{
  const today=new Date().toISOString().split('T')[0];
  openModal('Novo Lembrete',`<div class="fg">
    <div class="fgp ff"><label>Título *</label><input class="fi" id="rm-title" placeholder="Ex: Cobrar NF do afiliado X"></div>
    <div class="fgp"><label>Data *</label><input type="date" class="fi" id="rm-date" value="${today}"></div>
    <div class="fgp ff"><label>Nota</label><input class="fi" id="rm-note" placeholder="Observação opcional"></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveReminder()"><i data-lucide="plus"></i> Criar</button>`);
};

window.saveReminder=()=>{
  const title=document.getElementById('rm-title')?.value.trim();
  const date=document.getElementById('rm-date')?.value;
  if(!title||!date)return toast('Título e data são obrigatórios','e');
  if(!STATE.reminders)STATE.reminders=[];
  STATE.reminders.push({id:'rm'+Date.now(),title,date,note:document.getElementById('rm-note')?.value.trim()||''});
  logAction('Lembrete criado',title);saveToLocal();closeModal();toast('Lembrete criado!');
  renderReminders();renderDeadlineCalendar();
};

window.editReminder=(id)=>{
  const r=(STATE.reminders||[]).find(x=>x.id===id);if(!r)return;
  openModal('Editar Lembrete',`<div class="fg">
    <div class="fgp ff"><label>Título *</label><input class="fi" id="rm-title" value="${r.title}"></div>
    <div class="fgp"><label>Data *</label><input type="date" class="fi" id="rm-date" value="${r.date}"></div>
    <div class="fgp ff"><label>Nota</label><input class="fi" id="rm-note" value="${r.note||''}"></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveEditReminder('${id}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditReminder=(id)=>{
  const r=(STATE.reminders||[]).find(x=>x.id===id);if(!r)return;
  r.title=document.getElementById('rm-title')?.value.trim()||r.title;
  r.date=document.getElementById('rm-date')?.value||r.date;
  r.note=document.getElementById('rm-note')?.value.trim()||'';
  logAction('Lembrete editado',r.title);saveToLocal();closeModal();toast('Lembrete atualizado!');
  renderReminders();renderDeadlineCalendar();
};

window.deleteReminder=(id)=>{
  const idx=(STATE.reminders||[]).findIndex(x=>x.id===id);
  if(idx>-1){logAction('Lembrete excluído',STATE.reminders[idx].title);STATE.reminders.splice(idx,1);saveToLocal();toast('Lembrete excluído');
    renderReminders();renderDeadlineCalendar();}
};

