// ══════════════════════════════════════════════════════════
// PIPELINE (KANBAN)
// ══════════════════════════════════════════════════════════
function bPipeline(el){
  if(!STATE.pipeline)STATE.pipeline={stages:[{id:'s1',name:'Lead',color:'#94a3b8'},{id:'s2',name:'Negociação',color:'#f59e0b'},{id:'s3',name:'Deal Fechado',color:'#3b82f6'},{id:'s4',name:'Ativo',color:'#10b981'},{id:'s5',name:'Inativo',color:'#ef4444'}],cards:[]};
  el.innerHTML=modHdr('Pipeline — Kanban')+`<div class="mod-body">
    ${heroHTML('pipeline','','Pipeline','Funil e negociações com afiliados')}
    <div class="mod-main">
      <div class="sec-hdr">
        <div class="sec-lbl">Pipeline Kanban</div>
        <div class="sec-actions">
          <button class="btn btn-outline" onclick="openManageStages()"><i data-lucide="settings"></i> Editar Etapas</button>
          ${STATE.affiliates.length>0&&STATE.pipeline.cards.length===0?`<button class="btn btn-outline" onclick="importAffiliatesToPipeline()"><i data-lucide="download"></i> Importar Afiliados</button>`:''}
          <button class="btn btn-theme" onclick="openAddPipelineCard()"><i data-lucide="plus"></i> Novo Lead</button>
        </div>
      </div>
      <div class="kanban" id="kanban-board"></div>
    </div></div>`;
  renderKanban();
}

function renderKanban(){
  const board=document.getElementById('kanban-board');if(!board)return;
  const stages=STATE.pipeline.stages;
  const cards=STATE.pipeline.cards;

  board.innerHTML=stages.map(stage=>{
    const stageCards=cards.filter(c=>c.stageId===stage.id);
    return `<div class="kanban-col" data-stage="${stage.id}"
      ondragover="event.preventDefault();this.querySelector('.kanban-col-body').classList.add('drag-over')"
      ondragleave="this.querySelector('.kanban-col-body').classList.remove('drag-over')"
      ondrop="dropCard(event,'${stage.id}');this.querySelector('.kanban-col-body').classList.remove('drag-over')">
      <div class="kanban-col-hdr">
        <div class="kanban-col-dot" style="background:${stage.color}"></div>
        <div class="kanban-col-name">${stage.name}</div>
        <div class="kanban-col-count">${stageCards.length}</div>
      </div>
      <div class="kanban-col-body">
        ${stageCards.map(c=>{
          const aff=STATE.affiliates.find(a=>a.id===c.affiliateId);
          const brands=aff?Object.keys(aff.deals||{}):[]; const ct=CONTRACT_TYPES[aff?.contractType]||{label:''};
          return `<div class="kanban-card" draggable="true" data-card="${c.id}"
            ondragstart="event.dataTransfer.setData('text/plain','${c.id}')"
            onclick="openPipelineCardDetail('${c.id}')">
            <div class="kanban-card-name">${aff?.name||c.affiliateName||'?'}</div>
            <div class="kanban-card-meta">
              ${brands.map(b=>`<span class="kanban-card-brand" style="background:${STATE.brands[b]?.color||'#888'}22;color:${STATE.brands[b]?.color||'#888'}">${b}</span>`).join('')}
              <span>${ct.label}</span>
            </div>
            ${c.note?`<div style="font-size:9px;color:var(--text2);margin-top:4px;line-height:1.3">${c.note.length>60?c.note.slice(0,60)+'...':c.note}</div>`:''}
            ${c.value?`<div style="font-family:var(--fd);font-size:12px;font-weight:700;color:var(--theme);margin-top:4px">${fc(c.value)}</div>`:''}
          </div>`;
        }).join('')}
        <div class="kanban-add" onclick="openAddPipelineCard('${stage.id}')">+ Novo Lead</div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

window.dropCard=(event,stageId)=>{
  event.preventDefault();
  const cardId=event.dataTransfer.getData('text/plain');
  const card=STATE.pipeline.cards.find(c=>c.id===cardId);
  if(!card)return;
  const oldStage=STATE.pipeline.stages.find(s=>s.id===card.stageId)?.name;
  const newStage=STATE.pipeline.stages.find(s=>s.id===stageId)?.name;
  card.stageId=stageId;card.updatedAt=new Date().toLocaleDateString('pt-BR');
  logAction('Pipeline: movido',`${card.affiliateName}: ${oldStage} → ${newStage}`);
  saveToLocal();renderKanban();
};

window.openAddPipelineCard=(defaultStage)=>{
  const stageOpts=STATE.pipeline.stages.map(s=>`<option value="${s.id}" ${s.id===defaultStage?'selected':''}>${s.name}</option>`).join('');
  const existingAffs=STATE.affiliates.filter(a=>!STATE.pipeline.cards.find(c=>c.affiliateId===a.id));
  const affOpts=existingAffs.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
  const brandsList=Object.entries(STATE.brands);

  openModal('Novo Lead',`<div class="fg">
    <div class="fgp ff">
      <label>Modo</label>
      <div class="pills" style="margin-top:4px">
        <button class="pill on" onclick="togglePipeMode('new',this)">Novo Afiliado</button>
        <button class="pill" onclick="togglePipeMode('existing',this)">Existente</button>
      </div>
    </div>

    <!-- EXISTING AFFILIATE -->
    <div id="pk-existing" style="display:none">
      <div class="fgp ff"><label>Selecionar Afiliado</label>
        <select class="fi" id="pk-aff">${affOpts.length?affOpts:'<option value="">Todos já estão no funil</option>'}</select>
      </div>
    </div>

    <!-- NEW AFFILIATE (full form) -->
    <div id="pk-new">
      <div class="fgp ff"><label>Nome *</label><input class="fi" id="pk-name" placeholder="Ex: Agência FMG"></div>
      <div class="fgp"><label>Email</label><input class="fi" id="pk-email" placeholder="afiliado@email.com"></div>
      <div class="fgp"><label>Tipo de Comissão</label><select class="fi" id="pk-ct" onchange="updatePkDealFields()">
        <option value="cpa">CPA + Rev Share</option>
        <option value="tiered">CPA Escalonado</option>
        <option value="pct_deposit">% de Depósitos</option>
      </select></div>
      <div class="fgp ff"><label>Marcas e Comissões</label>
        <div id="pk-deals" style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
          ${brandsList.map(([n,br])=>`
            <div class="pk-brand-deal" style="padding:12px;background:rgba(${br.rgb},0.06);border:1px solid rgba(${br.rgb},0.2);border-radius:12px">
              <label style="display:flex;align-items:center;gap:7px;margin-bottom:8px;cursor:pointer">
                <input type="checkbox" class="pk-brand-chk" value="${n}" style="accent-color:${br.color}">
                <span style="font-size:12px;font-weight:700;color:${br.color}">${n}</span>
              </label>
              <div class="pk-deal-fields" data-brand="${n}" style="display:none;gap:8px;flex-wrap:wrap">
                <div class="pk-deal-std" style="display:flex;gap:6px;flex-wrap:wrap">
                  <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">CPA (R$)</label>
                    <input type="number" class="fi" data-field="cpa" value="${br.cpa||0}" style="padding:8px;font-size:12px"></div>
                  <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Rev Share (%)</label>
                    <input type="number" class="fi" data-field="rs" value="${br.rs||0}" style="padding:8px;font-size:12px"></div>
                  <div style="flex:1;min-width:100px" class="pk-deal-pct"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">% Depósitos</label>
                    <input type="number" class="fi" data-field="pctDeposit" value="5" step="0.1" style="padding:8px;font-size:12px"></div>
                </div>
                <div class="pk-deal-tiered" style="display:none;margin-top:8px;width:100%">
                  <label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;display:block">Níveis CPA Escalonado</label>
                  <div class="pk-tiers" data-brand="${n}" style="display:flex;flex-direction:column;gap:4px">
                    <div style="display:flex;gap:4px">
                      <span style="width:50px;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">Nível</span>
                      <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">CPA (R$)</span>
                      <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">Baseline</span>
                    </div>
                    <div style="display:flex;gap:4px;align-items:center">
                      <input class="fi" data-tier="name" value="L1" style="width:50px;padding:6px;font-size:11px">
                      <input type="number" class="fi" data-tier="cpa" value="${br.cpa||0}" style="flex:1;padding:6px;font-size:11px">
                      <input type="number" class="fi" data-tier="baseline" value="30" style="flex:1;padding:6px;font-size:11px">
                    </div>
                  </div>
                  <button onclick="addPkTier('${n}')" style="margin-top:4px;background:transparent;border:1px dashed var(--gb2);border-radius:6px;padding:4px 10px;font-size:9px;color:var(--text3);cursor:pointer;width:100%">+ Nível</button>
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>
      <div class="fgp ff"><label>Redes Sociais</label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
          <div style="position:relative"><input class="fi" id="pk-instagram" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">📷</span></div>
          <div style="position:relative"><input class="fi" id="pk-twitter" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">𝕏</span></div>
          <div style="position:relative"><input class="fi" id="pk-youtube" placeholder="Canal YouTube" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">▶</span></div>
          <div style="position:relative"><input class="fi" id="pk-tiktok" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">♪</span></div>
          <div style="position:relative;grid-column:1/-1"><input class="fi" id="pk-website" placeholder="https://site.com" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🌐</span></div>
        </div>
      </div>
      <div class="fgp ff"><label>Observações</label><textarea class="fi" id="pk-notes" rows="2" placeholder="Notas sobre este afiliado..."></textarea></div>
    </div>

    <div style="border-top:1px solid var(--gb);padding-top:12px;margin-top:8px">
      <div class="fgp"><label>Etapa no Funil *</label><select class="fi" id="pk-stage">${stageOpts}</select></div>
      <div class="fgp"><label>Valor Potencial (R$)</label><input type="number" class="fi" id="pk-value" placeholder="0"></div>
      <div class="fgp ff"><label>Nota do Funil</label><input class="fi" id="pk-note" placeholder="Observação rápida sobre o deal..."></div>
    </div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="savePipelineCard()"><i data-lucide="plus"></i> Adicionar</button>`);
  // Toggle deal fields on checkbox
  document.querySelectorAll('.pk-brand-chk').forEach(chk=>{
    chk.addEventListener('change',()=>{
      const fields=document.querySelector(`.pk-deal-fields[data-brand="${chk.value}"]`);
      if(fields)fields.style.display=chk.checked?'flex':'none';
    });
  });
  updatePkDealFields();
};

window.togglePipeMode=(mode,btn)=>{
  btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  document.getElementById('pk-new').style.display=mode==='new'?'block':'none';
  document.getElementById('pk-existing').style.display=mode==='existing'?'block':'none';
  document.getElementById('pk-new').dataset.active=mode==='new'?'1':'0';
};

window.updatePkDealFields=()=>{
  const ct=document.getElementById('pk-ct')?.value||'cpa';
  document.querySelectorAll('.pk-deal-std').forEach(el=>el.style.display='flex');
  document.querySelectorAll('.pk-deal-tiered').forEach(el=>el.style.display=ct==='tiered'?'block':'none');
  document.querySelectorAll('.pk-deal-pct').forEach(el=>el.style.display=(ct==='pct_deposit')?'block':'none');
};

window.addPkTier=(brand)=>{
  const container=document.querySelector(`.pk-tiers[data-brand="${brand}"]`);if(!container)return;
  const div=document.createElement('div');div.style.cssText='display:flex;gap:4px;align-items:center';
  const n=container.querySelectorAll('[data-tier="name"]').length+1;
  div.innerHTML=`<input class="fi" data-tier="name" value="L${n}" style="width:50px;padding:6px;font-size:11px">
    <input type="number" class="fi" data-tier="cpa" value="0" style="flex:1;padding:6px;font-size:11px">
    <input type="number" class="fi" data-tier="baseline" value="0" style="flex:1;padding:6px;font-size:11px">
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button>`;
  container.appendChild(div);
};

window.savePipelineCard=()=>{
  const isNew=document.getElementById('pk-new')?.dataset?.active!=='0';
  const stageId=document.getElementById('pk-stage')?.value;
  if(!stageId)return toast('Selecione uma etapa','e');

  let affId,affName;

  if(isNew){
    // Create new affiliate from form
    const name=document.getElementById('pk-name')?.value.trim();
    if(!name)return toast('Nome é obrigatório','e');
    const ct=document.getElementById('pk-ct')?.value||'cpa';
    const deals={};
    document.querySelectorAll('.pk-brand-chk:checked').forEach(chk=>{
      const brand=chk.value;
      const fields=document.querySelector(`.pk-deal-fields[data-brand="${brand}"]`);
      if(!fields)return;
      const deal={cpa:parseFloat(fields.querySelector('[data-field="cpa"]')?.value)||0,
        rs:parseFloat(fields.querySelector('[data-field="rs"]')?.value)||0};
      if(ct==='pct_deposit')deal.pctDeposit=parseFloat(fields.querySelector('[data-field="pctDeposit"]')?.value)||0;
      if(ct==='tiered'){
        const tiers=fields.querySelector(`.pk-tiers[data-brand="${brand}"]`);
        if(tiers){const levels=[];const rows=tiers.querySelectorAll('div:has([data-tier="name"])');
          rows.forEach(r=>{const tn=r.querySelector('[data-tier="name"]')?.value;const tc=parseFloat(r.querySelector('[data-tier="cpa"]')?.value)||0;
            const tb=parseInt(r.querySelector('[data-tier="baseline"]')?.value)||0;if(tn)levels.push({name:tn,cpa:tc,baseline:tb});});
          deal.levels=levels;}
      }
      deals[brand]=deal;
    });
    const newAff={id:'a'+Date.now(),name,contactEmail:document.getElementById('pk-email')?.value.trim()||'',
      contractType:ct,deals,status:'ativo',ftds:0,qftds:0,deposits:0,commission:0,profit:0,
      social:{instagram:document.getElementById('pk-instagram')?.value.trim()||'',
        twitter:document.getElementById('pk-twitter')?.value.trim()||'',
        youtube:document.getElementById('pk-youtube')?.value.trim()||'',
        tiktok:document.getElementById('pk-tiktok')?.value.trim()||'',
        website:document.getElementById('pk-website')?.value.trim()||''},
      notes:document.getElementById('pk-notes')?.value.trim()||''};
    STATE.affiliates.push(newAff);
    logAction('Afiliado criado (Pipeline)',name);
    affId=newAff.id;affName=name;
  } else {
    // Existing affiliate
    affId=document.getElementById('pk-aff')?.value;
    if(!affId)return toast('Selecione um afiliado','e');
    if(STATE.pipeline.cards.find(c=>c.affiliateId===affId))return toast('Afiliado já está no funil','w');
    affName=STATE.affiliates.find(a=>a.id===affId)?.name||'';
  }

  STATE.pipeline.cards.push({
    id:'pk'+Date.now(),affiliateId:affId,affiliateName:affName,stageId,
    value:parseFloat(document.getElementById('pk-value')?.value)||0,
    note:document.getElementById('pk-note')?.value.trim()||'',
    createdAt:new Date().toLocaleDateString('pt-BR'),updatedAt:new Date().toLocaleDateString('pt-BR')
  });
  logAction('Pipeline: adicionado',`${affName} → ${STATE.pipeline.stages.find(s=>s.id===stageId)?.name}`);
  saveToLocal();closeModal();renderKanban();toast('Adicionado ao funil!');
};

window.openPipelineCardDetail=(cardId)=>{
  const c=STATE.pipeline.cards.find(x=>x.id===cardId);if(!c)return;
  const aff=STATE.affiliates.find(a=>a.id===c.affiliateId);
  const stageOpts=STATE.pipeline.stages.map(s=>`<option value="${s.id}" ${s.id===c.stageId?'selected':''}>${s.name}</option>`).join('');
  const brandsList=Object.entries(STATE.brands);
  const ct=aff?.contractType||'cpa';
  const socials=aff?.social||{};

  // Social links (clickable, open in new tab)
  const socialLinks=[];
  if(socials.instagram)socialLinks.push(`<a href="https://instagram.com/${socials.instagram.replace('@','')}" target="_blank" rel="noopener" class="social-pill">📷 ${socials.instagram}</a>`);
  if(socials.twitter)socialLinks.push(`<a href="https://x.com/${socials.twitter.replace('@','')}" target="_blank" rel="noopener" class="social-pill">𝕏 ${socials.twitter}</a>`);
  if(socials.youtube)socialLinks.push(`<a href="https://youtube.com/${socials.youtube.startsWith('@')?socials.youtube:'@'+socials.youtube}" target="_blank" rel="noopener" class="social-pill">▶ ${socials.youtube}</a>`);
  if(socials.tiktok)socialLinks.push(`<a href="https://tiktok.com/@${socials.tiktok.replace('@','')}" target="_blank" rel="noopener" class="social-pill">♪ ${socials.tiktok}</a>`);
  if(socials.website)socialLinks.push(`<a href="${socials.website.startsWith('http')?socials.website:'https://'+socials.website}" target="_blank" rel="noopener" class="social-pill">🌐 Site</a>`);

  openModal(c.affiliateName||'Card do Pipeline',`<div class="fg">
    <!-- PIPELINE INFO -->
    <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:12px;padding:14px;margin-bottom:4px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);margin-bottom:8px">Funil</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Etapa</label>
          <select class="fi" id="pkd-stage" style="margin-top:2px">${stageOpts}</select></div>
        <div><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Valor Potencial (R$)</label>
          <input type="number" class="fi" id="pkd-value" value="${c.value||0}" style="margin-top:2px"></div>
      </div>
      <div style="margin-top:8px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Nota do Funil</label>
        <input class="fi" id="pkd-note" value="${c.note||''}" style="margin-top:2px"></div>
      <div style="margin-top:6px;font-size:9px;color:var(--text3)">Criado: ${c.createdAt} · Atualizado: ${c.updatedAt}</div>
    </div>

    <!-- AFFILIATE INFO (editable) -->
    ${aff?`
    <div style="border-top:1px solid var(--gb);padding-top:12px;margin-top:4px">
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:var(--text3);margin-bottom:8px">Dados do Afiliado</div>
      <div class="fgp ff"><label>Nome</label><input class="fi" id="pkd-name" value="${aff.name}"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div class="fgp"><label>Email</label><input class="fi" id="pkd-email" value="${aff.contactEmail||''}"></div>
        <div class="fgp"><label>Status</label><select class="fi" id="pkd-status">
          <option value="ativo" ${aff.status==='ativo'?'selected':''}>Ativo</option>
          <option value="negociando" ${aff.status==='negociando'?'selected':''}>Negociando</option>
          <option value="pausado" ${aff.status==='pausado'?'selected':''}>Pausado</option>
          <option value="inativo" ${aff.status==='inativo'?'selected':''}>Inativo</option>
        </select></div>
      </div>
      <div class="fgp"><label>Tipo de Comissão</label><select class="fi" id="pkd-ct" onchange="updatePkdDealFields()">
        <option value="cpa" ${ct==='cpa'?'selected':''}>CPA + Rev Share</option>
        <option value="tiered" ${ct==='tiered'?'selected':''}>CPA Escalonado</option>
        <option value="pct_deposit" ${ct==='pct_deposit'?'selected':''}>% de Depósitos</option>
      </select></div>

      <div class="fgp ff"><label>Marcas e Comissões</label>
        <div id="pkd-deals" style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
          ${brandsList.map(([n,br])=>{
            const hasDeal=!!(aff.deals&&aff.deals[n]);
            const deal=hasDeal?aff.deals[n]:{};
            return `<div style="padding:12px;background:rgba(${br.rgb},0.06);border:1px solid rgba(${br.rgb},0.2);border-radius:12px">
              <label style="display:flex;align-items:center;gap:7px;margin-bottom:8px;cursor:pointer">
                <input type="checkbox" class="pkd-brand-chk" value="${n}" ${hasDeal?'checked':''} style="accent-color:${br.color}">
                <span style="font-size:12px;font-weight:700;color:${br.color}">${n}</span>
              </label>
              <div class="pkd-deal-fields" data-brand="${n}" style="display:${hasDeal?'flex':'none'};gap:8px;flex-wrap:wrap">
                <div class="pkd-deal-std" style="display:flex;gap:6px;flex-wrap:wrap">
                  <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">CPA (R$)</label>
                    <input type="number" class="fi" data-field="cpa" value="${deal.cpa||br.cpa||0}" style="padding:8px;font-size:12px"></div>
                  <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Rev Share (%)</label>
                    <input type="number" class="fi" data-field="rs" value="${deal.rs||br.rs||0}" style="padding:8px;font-size:12px"></div>
                  <div style="flex:1;min-width:100px" class="pkd-deal-pct"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">% Depósitos</label>
                    <input type="number" class="fi" data-field="pctDeposit" value="${deal.pctDeposit||5}" step="0.1" style="padding:8px;font-size:12px"></div>
                </div>
                <div class="pkd-deal-tiered" style="display:${ct==='tiered'?'block':'none'};margin-top:8px;width:100%">
                  <label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;display:block">Níveis CPA Escalonado</label>
                  <div class="pkd-tiers" data-brand="${n}" style="display:flex;flex-direction:column;gap:4px">
                    <div style="display:flex;gap:4px">
                      <span style="width:50px;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">Nível</span>
                      <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">CPA (R$)</span>
                      <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;font-weight:700">Baseline</span>
                    </div>
                    ${(deal.levels||[{name:'L1',cpa:br.cpa||0,baseline:30}]).map(l=>`<div style="display:flex;gap:4px;align-items:center">
                      <input class="fi" data-tier="name" value="${l.name||l.key||''}" style="width:50px;padding:6px;font-size:11px">
                      <input type="number" class="fi" data-tier="cpa" value="${l.cpa||0}" style="flex:1;padding:6px;font-size:11px">
                      <input type="number" class="fi" data-tier="baseline" value="${l.baseline||0}" style="flex:1;padding:6px;font-size:11px">
                      <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button>
                    </div>`).join('')}
                  </div>
                  <button onclick="addPkdTier('${n}')" style="margin-top:4px;background:transparent;border:1px dashed var(--gb2);border-radius:6px;padding:4px 10px;font-size:9px;color:var(--text3);cursor:pointer;width:100%">+ Nível</button>
                </div>
              </div>
            </div>`;}).join('')}
        </div>
      </div>

      <div class="fgp ff"><label>Redes Sociais</label>
        ${socialLinks.length?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0 8px">${socialLinks.join('')}</div>`:''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
          <div style="position:relative"><input class="fi" id="pkd-instagram" value="${socials.instagram||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">📷</span></div>
          <div style="position:relative"><input class="fi" id="pkd-twitter" value="${socials.twitter||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">𝕏</span></div>
          <div style="position:relative"><input class="fi" id="pkd-youtube" value="${socials.youtube||''}" placeholder="Canal YouTube" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">▶</span></div>
          <div style="position:relative"><input class="fi" id="pkd-tiktok" value="${socials.tiktok||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">♪</span></div>
          <div style="position:relative;grid-column:1/-1"><input class="fi" id="pkd-website" value="${socials.website||''}" placeholder="https://site.com" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🌐</span></div>
        </div>
      </div>
      <div class="fgp ff"><label>Observações</label><textarea class="fi" id="pkd-notes" rows="2">${aff.notes||''}</textarea></div>
    </div>`:'<div style="padding:12px;color:var(--text3);font-size:11px">Afiliado não encontrado no sistema.</div>'}
  </div>`,`<button class="btn btn-danger" onclick="removePipelineCard('${c.id}')"><i data-lucide="trash-2"></i> Remover</button>
    <button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="updatePipelineCard('${c.id}')"><i data-lucide="save"></i> Salvar</button>`);
  // Toggle deal fields on checkbox
  document.querySelectorAll('.pkd-brand-chk').forEach(chk=>{
    chk.addEventListener('change',()=>{
      const fields=document.querySelector(`.pkd-deal-fields[data-brand="${chk.value}"]`);
      if(fields)fields.style.display=chk.checked?'flex':'none';
    });
  });
  updatePkdDealFields();
};

window.updatePkdDealFields=()=>{
  const ct=document.getElementById('pkd-ct')?.value||'cpa';
  document.querySelectorAll('.pkd-deal-std').forEach(el=>el.style.display='flex');
  document.querySelectorAll('.pkd-deal-tiered').forEach(el=>el.style.display=ct==='tiered'?'block':'none');
  document.querySelectorAll('.pkd-deal-pct').forEach(el=>el.style.display=(ct==='pct_deposit')?'block':'none');
};

window.addPkdTier=(brand)=>{
  const container=document.querySelector(`.pkd-tiers[data-brand="${brand}"]`);if(!container)return;
  const div=document.createElement('div');div.style.cssText='display:flex;gap:4px;align-items:center';
  const n=container.querySelectorAll('[data-tier="name"]').length+1;
  div.innerHTML=`<input class="fi" data-tier="name" value="L${n}" style="width:50px;padding:6px;font-size:11px">
    <input type="number" class="fi" data-tier="cpa" value="0" style="flex:1;padding:6px;font-size:11px">
    <input type="number" class="fi" data-tier="baseline" value="0" style="flex:1;padding:6px;font-size:11px">
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button>`;
  container.appendChild(div);
};

window.updatePipelineCard=id=>{
  const c=STATE.pipeline.cards.find(x=>x.id===id);if(!c)return;
  const aff=STATE.affiliates.find(a=>a.id===c.affiliateId);
  const oldStage=c.stageId;

  // Update pipeline card
  c.stageId=document.getElementById('pkd-stage')?.value||c.stageId;
  c.value=parseFloat(document.getElementById('pkd-value')?.value)||0;
  c.note=document.getElementById('pkd-note')?.value.trim()||'';
  c.updatedAt=new Date().toLocaleDateString('pt-BR');

  // Update affiliate data
  if(aff){
    const newName=document.getElementById('pkd-name')?.value.trim();
    if(newName){aff.name=newName;c.affiliateName=newName;}
    aff.contactEmail=document.getElementById('pkd-email')?.value.trim()||aff.contactEmail;
    aff.status=document.getElementById('pkd-status')?.value||aff.status;
    aff.contractType=document.getElementById('pkd-ct')?.value||aff.contractType;
    aff.notes=document.getElementById('pkd-notes')?.value.trim()||'';

    // Update social
    aff.social={
      instagram:document.getElementById('pkd-instagram')?.value.trim()||'',
      twitter:document.getElementById('pkd-twitter')?.value.trim()||'',
      youtube:document.getElementById('pkd-youtube')?.value.trim()||'',
      tiktok:document.getElementById('pkd-tiktok')?.value.trim()||'',
      website:document.getElementById('pkd-website')?.value.trim()||''
    };

    // Update deals
    const deals={};
    document.querySelectorAll('.pkd-brand-chk:checked').forEach(chk=>{
      const brand=chk.value;
      const fields=document.querySelector(`.pkd-deal-fields[data-brand="${brand}"]`);
      if(!fields)return;
      const deal={cpa:parseFloat(fields.querySelector('[data-field="cpa"]')?.value)||0,
        rs:parseFloat(fields.querySelector('[data-field="rs"]')?.value)||0};
      if(aff.contractType==='pct_deposit')deal.pctDeposit=parseFloat(fields.querySelector('[data-field="pctDeposit"]')?.value)||0;
      if(aff.contractType==='tiered'){
        const tiers=fields.querySelector(`.pkd-tiers[data-brand="${brand}"]`);
        if(tiers){const levels=[];const rows=tiers.querySelectorAll('div:has([data-tier="name"])');
          rows.forEach(r=>{const tn=r.querySelector('[data-tier="name"]')?.value;const tc=parseFloat(r.querySelector('[data-tier="cpa"]')?.value)||0;
            const tb=parseInt(r.querySelector('[data-tier="baseline"]')?.value)||0;if(tn)levels.push({name:tn,cpa:tc,baseline:tb});});
          deal.levels=levels;}
      }
      deals[brand]=deal;
    });
    aff.deals=deals;
  }

  if(oldStage!==c.stageId)logAction('Pipeline: movido',`${c.affiliateName}: ${STATE.pipeline.stages.find(s=>s.id===oldStage)?.name} → ${STATE.pipeline.stages.find(s=>s.id===c.stageId)?.name}`);
  logAction('Pipeline: card atualizado',c.affiliateName);
  saveToLocal();closeModal();renderKanban();toast('Atualizado!');
};

window.removePipelineCard=id=>{
  const idx=STATE.pipeline.cards.findIndex(x=>x.id===id);
  if(idx>-1){logAction('Pipeline: removido',STATE.pipeline.cards[idx].affiliateName);STATE.pipeline.cards.splice(idx,1);saveToLocal();closeModal();renderKanban();toast('Removido do funil');}
};

window.openManageStages=()=>{
  const stages=STATE.pipeline.stages;
  openModal('Gerenciar Etapas',`<div id="stage-list" style="display:flex;flex-direction:column;gap:8px">
    ${stages.map((s,i)=>`<div style="display:flex;gap:6px;align-items:center" data-stageid="${s.id}">
      <input type="color" value="${s.color}" class="stg-color" style="width:30px;height:30px;border:none;border-radius:6px;cursor:pointer">
      <input class="fi stg-name" value="${s.name}" style="flex:1;padding:8px;font-size:12px">
      <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px">×</button>
    </div>`).join('')}
  </div>
  <button onclick="addStageRow()" style="margin-top:8px;width:100%;padding:8px;border:1px dashed var(--gb2);border-radius:8px;background:transparent;color:var(--text3);cursor:pointer;font-size:10px">+ Nova Etapa</button>`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-theme" onclick="saveStages()"><i data-lucide="save"></i> Salvar Etapas</button>`);
};

window.addStageRow=()=>{
  const list=document.getElementById('stage-list');
  const div=document.createElement('div');div.style.cssText='display:flex;gap:6px;align-items:center';
  div.innerHTML=`<input type="color" value="#64748b" class="stg-color" style="width:30px;height:30px;border:none;border-radius:6px;cursor:pointer">
    <input class="fi stg-name" value="" placeholder="Nome da etapa" style="flex:1;padding:8px;font-size:12px">
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:16px;padding:4px">×</button>`;
  list.appendChild(div);
};

window.saveStages=()=>{
  const rows=document.querySelectorAll('#stage-list > div');
  const newStages=[];
  rows.forEach((row,i)=>{
    const name=row.querySelector('.stg-name')?.value.trim();
    const color=row.querySelector('.stg-color')?.value||'#64748b';
    const existingId=row.dataset?.stageid;
    if(name)newStages.push({id:existingId||'s'+Date.now()+i,name,color});
  });
  if(!newStages.length)return toast('Adicione pelo menos uma etapa','e');
  // Move orphaned cards to first stage
  const validIds=new Set(newStages.map(s=>s.id));
  STATE.pipeline.cards.forEach(c=>{if(!validIds.has(c.stageId))c.stageId=newStages[0].id;});
  STATE.pipeline.stages=newStages;
  logAction('Pipeline: etapas atualizadas',`${newStages.length} etapas`);
  saveToLocal();closeModal();renderKanban();toast('Etapas atualizadas!');
};

// Bulk-import existing affiliates into the pipeline. Auto-buckets into
// stages based on affiliate status + activity (active → "Ativo" stage,
// inactive → "Inativo", no FTDs → "Lead", others → "Negociação"). Skips
// any affiliate already present as a pipeline card.
window.importAffiliatesToPipeline=()=>{
  const stages=STATE.pipeline.stages;
  const findStage=(name)=>stages.find(s=>s.name.toLowerCase()===name.toLowerCase())?.id;
  const leadStage=findStage('Lead')||stages[0]?.id;
  const negotiationStage=findStage('Negociação')||stages[1]?.id||leadStage;
  const activeStage=findStage('Ativo')||stages[stages.length-2]?.id||leadStage;
  const inactiveStage=findStage('Inativo')||stages[stages.length-1]?.id||leadStage;

  const existingAffIds=new Set(STATE.pipeline.cards.map(c=>c.affiliateId));
  const toImport=STATE.affiliates.filter(a=>!existingAffIds.has(a.id));
  if(!toImport.length)return toast('Todos os afiliados já estão no pipeline','w');

  const preview=toImport.slice(0,6).map(a=>`• ${a.name}`).join('\n');
  const extra=toImport.length>6?`\n• ...e mais ${toImport.length-6}`:'';
  if(!confirm(`Importar ${toImport.length} afiliado(s) para o pipeline?\n\n${preview}${extra}\n\nA alocação inicial será automática por status/atividade.`))return;

  let added=0;
  toImport.forEach(a=>{
    let stageId;
    if(a.status==='inativo')stageId=inactiveStage;
    else if((a.ftds||0)===0)stageId=leadStage;
    else if(a.status==='ativo'&&(a.ftds||0)>0)stageId=activeStage;
    else stageId=negotiationStage;

    STATE.pipeline.cards.push({
      id:'pc'+Date.now()+'_'+a.id,
      affiliateId:a.id,
      affiliateName:a.name,
      stageId,
      value:a.commission||0,
      notes:`Importado do módulo Afiliados em ${new Date().toLocaleDateString('pt-BR')}`,
      createdAt:new Date().toISOString(),
    });
    added++;
  });

  logAction('Pipeline: importação em massa',`${added} afiliado(s) → funil`);
  saveToLocal();renderKanban();toast(`${added} afiliado(s) adicionados ao pipeline`);
};

