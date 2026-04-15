// ══════════════════════════════════════════════════════════
// 2. AFFILIATES
// ══════════════════════════════════════════════════════════
function bAffs(el){
  el.innerHTML=modHdr('Afiliados — CRM')+`<div class="mod-body">
    ${heroHTML('affiliates','CRM — Base de Afiliados','Afiliados','Parceiros, deals, contratos e pagamentos')}
    <div class="mod-main">
      <div class="sec-hdr">
        <div class="sec-lbl">Todos os afiliados</div>
        <div class="sec-actions">
          <div class="srch"><i data-lucide="search"></i><input type="text" placeholder="Buscar..." oninput="filterAff(this.value)"></div>
          <button class="btn btn-outline" onclick="exportCSV('affiliates')"><i data-lucide="download"></i>CSV</button>
          <button class="btn btn-theme" onclick="openNewAff()"><i data-lucide="plus"></i>Novo Afiliado</button>
        </div>
      </div>
      <div class="pills">
        <button class="pill on" onclick="filterAffType(null,this)">Todos</button>
        <button class="pill" onclick="filterAffType('cpa',this)">CPA+RS</button>
        <button class="pill" onclick="filterAffType('tiered',this)">CPA Escalonado</button>
        <button class="pill" onclick="filterAffType('pct_deposit',this)">% de Depósitos</button>
      </div>
      ${isLab()?`
      <div class="pills pills-smart" style="margin-top:6px">
        <div class="pills-lbl">Smart Lists ${labBadge()}</div>
        ${SMART_LISTS.map(sl=>`<button class="pill pill-smart" style="--sl-c:${sl.color}" onclick="applySmartFilter('${sl.key}',this)" title="${sl.desc}"><i data-lucide="${sl.icon}" style="width:10px;height:10px;stroke:${sl.color}"></i>${sl.name}</button>`).join('')}
      </div>
      <div class="pills pills-tags" style="margin-top:6px">
        <div class="pills-lbl">Tags ${labBadge()}</div>
        ${(STATE.availableTags||[]).map(t=>{const count=(STATE.affiliates||[]).filter(a=>(a.tags||[]).includes(t.id)).length;return `<button class="pill pill-tag" style="--tag-c:${t.color}" onclick="applyTagFilter('${t.id}',this)"><span class="aff-tag-dot" style="background:${t.color}"></span>${t.name}<span class="pill-count">${count}</span></button>`;}).join('')}
      </div>`:''}
      <div class="aff-grid" id="aff-grid"></div>
    </div></div>`;
  renderAffs(STATE.affiliates);
}
let _affTypeF=null;
let _affSmartF=null;
let _affTagF=null;
function renderAffs(list){
  const g=document.getElementById('aff-grid');if(!g)return;
  if(!list.length){g.innerHTML='<div class="empty"><i data-lucide="users"></i><p>Nenhum afiliado</p></div>';lucide.createIcons();return;}
  g.innerHTML=list.map(a=>{
    const ct=CONTRACT_TYPES[a.contractType]||{label:'CPA',css:'cpa'};
    const brands=Object.keys(a.deals||{});
    let s1={l:'FTDs',v:a.ftds},s2={l:'QFTDs',v:a.qftds,c:'#ec4899'},s3={l:'Depósitos',v:fc(a.deposits)};
    if(a.contractType==='deposit'){s2={l:'Meta/Mês',v:fc(a.deals[brands[0]]?.depositTarget||0)};s3={l:'Progresso',v:Math.round(a.deposits/(a.deals[brands[0]]?.depositTarget||1)*100)+'%'};}
    if(a.contractType==='rs'){s1={l:'Net Rev',v:fc(a.netRev)};s2={l:'Depósitos',v:fc(a.deposits)};s3={l:'Comissão',v:fc(a.commission)};}
    const tagsHTML=isLab('tags')&&(a.tags||[]).length?`<div class="tag-row">${(a.tags||[]).map(tid=>{const t=STATE.availableTags?.find(x=>x.id===tid);return t?`<span class="aff-tag" style="background:${t.color}15;color:${t.color};border:1px solid ${t.color}33"><span class="aff-tag-dot" style="background:${t.color}"></span>${t.name}</span>`:'';}).join('')}</div>`:'';
    const lcHTML=typeof lastContactHTML==='function'?lastContactHTML(a):'';
    return `<div class="aff-card ct-${ct.css}" onclick="openAffDetail('${a.id}')">
      <div class="aff-top">
        <div class="aff-av">${a.name[0]}</div>
        <div style="flex:1"><div class="aff-name">${a.name}</div><div class="aff-type">${a.type}</div></div>
        <span class="ct-badge ${ct.css}">${ct.label}</span>
      </div>
      ${tagsHTML}
      ${lcHTML}
      <div class="aff-stats">
        <div class="aff-stat"><span class="aff-stat-l">${s1.l}</span><span class="aff-stat-v">${s1.v}</span></div>
        <div class="aff-stat"><span class="aff-stat-l">${s2.l}</span><span class="aff-stat-v" style="color:${s2.c||'var(--text)'}">${s2.v}</span></div>
        <div class="aff-stat"><span class="aff-stat-l">${s3.l}</span><span class="aff-stat-v">${s3.v}</span></div>
      </div>
      <div class="aff-foot">
        <div class="aff-casas">${brands.map(b=>`<div class="casa-chip" style="color:${STATE.brands[b]?.color};border-color:${STATE.brands[b]?.color}22;background:${STATE.brands[b]?.color}11">${b}</div>`).join('')}</div>
        <div class="aff-contact"><i data-lucide="mail"></i>${a.contactEmail}</div>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}
window.filterAff=q=>renderAffs(_computeAffList().filter(a=>a.name.toLowerCase().includes(q.toLowerCase())));
window.filterAffType=(t,btn)=>{_affTypeF=t;_affSmartF=null;_affTagF=null;btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');document.querySelectorAll('.pills-smart .pill, .pills-tags .pill').forEach(b=>b.classList.remove('on'));renderAffs(_computeAffList());};

// BETA: Smart list + tag filters
window.applySmartFilter=(key,btn)=>{
  _affSmartF=_affSmartF===key?null:key;
  _affTagF=null;_affTypeF=null;
  document.querySelectorAll('.pills .pill').forEach(b=>b.classList.remove('on'));
  if(_affSmartF)btn.classList.add('on');
  else document.querySelector('.pills .pill:first-child')?.classList.add('on');
  renderAffs(_computeAffList());
};
window.applyTagFilter=(tagId,btn)=>{
  _affTagF=_affTagF===tagId?null:tagId;
  _affSmartF=null;_affTypeF=null;
  document.querySelectorAll('.pills .pill').forEach(b=>b.classList.remove('on'));
  if(_affTagF)btn.classList.add('on');
  else document.querySelector('.pills .pill:first-child')?.classList.add('on');
  renderAffs(_computeAffList());
};

function _computeAffList(){
  let list=STATE.affiliates||[];
  if(_affSmartF&&typeof applySmartList==='function')return applySmartList(_affSmartF);
  if(_affTagF)return list.filter(a=>(a.tags||[]).includes(_affTagF));
  if(_affTypeF)return list.filter(a=>a.contractType===_affTypeF);
  return list;
}

window.openAffDetail=id=>{
  const a=STATE.affiliates.find(x=>x.id===id);if(!a)return;
  const ct=CONTRACT_TYPES[a.contractType]||{label:'CPA'};
  const cts=STATE.contracts.filter(c=>c.affiliateId===id);
  const pys=STATE.payments.filter(p=>p.affiliateId===id);
  const tks=STATE.tasks.filter(t=>t.affiliateId===id&&t.status!=='concluída');
  const p=pct(a.qftds,a.ftds);
  const brands=Object.keys(a.deals||{});
  const history=STATE.auditLog.filter(log=>log.detail.includes(a.name)||log.action.includes(a.name)).slice(0,15);
  const reports=STATE.reports.filter(r=>r.affiliateId===id).sort((x,y)=>new Date(y.date)-new Date(x.date));
  const pipeCard=STATE.pipeline?.cards?.find(c=>c.affiliateId===id);
  const pipeStage=pipeCard?STATE.pipeline.stages.find(s=>s.id===pipeCard.stageId):null;

  const socialHTML=a.social&&Object.values(a.social).some(v=>v)?`<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
    ${a.social.instagram?`<a href="https://instagram.com/${a.social.instagram.replace('@','')}" target="_blank" rel="noopener" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(228,64,95,0.1);color:#e4405f;text-decoration:none;font-weight:600;border:1px solid rgba(228,64,95,0.2)">📷 ${a.social.instagram}</a>`:''}
    ${a.social.twitter?`<a href="https://x.com/${a.social.twitter.replace('@','')}" target="_blank" rel="noopener" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.05);color:var(--text);text-decoration:none;font-weight:600;border:1px solid var(--gb)">𝕏 ${a.social.twitter}</a>`:''}
    ${a.social.youtube?`<a href="https://youtube.com/${a.social.youtube.startsWith('@')?a.social.youtube:'@'+a.social.youtube}" target="_blank" rel="noopener" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(255,0,0,0.08);color:#ff0000;text-decoration:none;font-weight:600;border:1px solid rgba(255,0,0,0.15)">▶ ${a.social.youtube}</a>`:''}
    ${a.social.tiktok?`<a href="https://tiktok.com/@${a.social.tiktok.replace('@','')}" target="_blank" rel="noopener" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(0,0,0,0.05);color:var(--text);text-decoration:none;font-weight:600;border:1px solid var(--gb)">♪ ${a.social.tiktok}</a>`:''}
    ${a.social.website?`<a href="${a.social.website.startsWith('http')?a.social.website:'https://'+a.social.website}" target="_blank" rel="noopener" style="font-size:10px;padding:3px 8px;border-radius:6px;background:rgba(59,130,246,0.08);color:var(--blue);text-decoration:none;font-weight:600;border:1px solid rgba(59,130,246,0.15)">🌐 Site</a>`:''}
  </div>`:'';

  openModal(a.name,`
    <div class="pills" style="margin-bottom:14px" id="aff-detail-tabs">
      <button class="pill on" onclick="showAffTab('perfil',this)">Perfil</button>
      <button class="pill" onclick="showAffTab('timeline',this)">Timeline</button>
      <button class="pill" onclick="showAffTab('performance',this)">Performance</button>
    </div>

    <!-- TAB: PERFIL -->
    <div id="aff-tab-perfil">
      ${isLab('tags')?`<div style="margin-bottom:14px"><div class="dtl" style="margin-bottom:8px;display:flex;align-items:center">Tags ${labBadge()}</div>
        <div class="tag-picker">
          ${(STATE.availableTags||[]).map(t=>{const on=(a.tags||[]).includes(t.id);return `<div class="tag-picker-item ${on?'selected':''}" style="background:${t.color}${on?'22':'10'};color:${t.color};border-color:${t.color}${on?'66':'22'}" onclick="toggleAffTag('${a.id}','${t.id}')"><span class="aff-tag-dot" style="background:${t.color}"></span>${t.name}</div>`;}).join('')}
        </div>
      </div>`:''}
      <div class="dg">
        <div class="ds2"><div class="dtl">Afiliado · <span style="color:var(--theme)">${ct.label}</span></div>
          <div class="dr"><span>Status</span><span class="b b-${a.status}">${sl(a.status)}</span></div>
          <div class="dr"><span>Email</span><strong>${a.contactEmail}</strong></div>
          <div class="dr"><span>Marcas</span><strong>${brands.join(', ')}</strong></div>
          ${pipeStage?`<div class="dr"><span>Pipeline</span><strong style="color:${pipeStage.color}">${pipeStage.name}</strong></div>`:''}
          ${socialHTML}
        </div>
        <div class="ds2"><div class="dtl">Performance</div>
          <div class="dr"><span>FTDs</span><strong style="color:var(--blue)">${a.ftds}</strong></div>
          <div class="dr"><span>QFTDs</span><strong style="color:var(--pink)">${a.qftds}</strong></div>
          <div class="dr"><span>Conversão</span><strong style="color:${cvC(p)}">${p}%</strong></div>
          <div class="dr"><span>Depósitos</span><strong style="color:var(--green)">${fc(a.deposits)}</strong></div>
          <div class="dr"><span>Comissão</span><strong style="color:var(--red)">${fc(a.commission)}</strong></div>
          <div class="dr"><span>Lucro 3C</span><strong class="hi">${fc(a.profit)}</strong></div>
        </div>
      </div>
      <div style="margin-top:14px"><div class="dtl" style="margin-bottom:8px">Deals por Marca</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${brands.map(brand=>{const deal=a.deals[brand];const br=STATE.brands[brand]||{color:'#888',rgb:'136,136,136'};
            let info=a.contractType==='tiered'?`CPA Escalonado: ${(deal.levels||[]).map(l=>`${l.name} R$${l.cpa} (base ${l.baseline})`).join(' | ')} + RS ${deal.rs||br.rs}%`:
              a.contractType==='pct_deposit'?`% de Depósitos: ${deal.pctDeposit||0}% + CPA R$${deal.cpa||0}`:
              `CPA: R$${deal.cpa||br.cpa} + RS: ${deal.rs||br.rs}%`;
            return `<div style="padding:10px 13px;background:rgba(${br.rgb},0.08);border:1px solid rgba(${br.rgb},0.2);border-radius:10px">
              <div style="font-size:11px;font-weight:600;color:${br.color};margin-bottom:3px">${brand}</div>
              <div style="font-size:11px;color:var(--text2)">${info}</div></div>`;}).join('')}
        </div>
      </div>
      ${a.notes?`<div style="margin-top:12px"><div class="dtl" style="margin-bottom:6px">Observações</div><p style="font-size:12px;color:var(--text2);line-height:1.7">${a.notes}</p></div>`:''}
      <div style="margin-top:12px"><div class="dtl" style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">Contratos (${cts.length}) <button onclick="closeModal();openNewContract('${a.id}')" style="background:none;border:none;color:var(--theme);cursor:pointer;font-size:9px;font-weight:700;text-transform:uppercase">+ Novo</button></div>
        ${cts.length?`<div class="mini-list">${cts.map(c=>`<div class="mini" onclick="openEditContract('${c.id}')"><div class="mini-info"><span class="mini-n">${c.name}</span><span class="mini-s">${c.brand} · ${c.type}</span></div>
          <div class="mini-r"><span class="pb pb-${c.paymentStatus}">${pl(c.paymentStatus)}</span><span class="mini-v">${fc(c.value)}</span></div></div>`).join('')}</div>`:'<span style="font-size:10px;color:var(--text3)">Nenhum contrato.</span>'}
      </div>
    </div>

    <!-- TAB: TIMELINE -->
    <div id="aff-tab-timeline" style="display:none">
      <div class="dtl" style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        Histórico Cronológico
        <button onclick="addCRMNote('${a.id}')" style="background:none;border:none;color:var(--theme);cursor:pointer;font-size:9px;font-weight:700;text-transform:uppercase">+ Nota</button>
      </div>
      <div style="position:relative;padding-left:20px;border-left:2px solid var(--gb)">
        ${history.length?history.map(h=>{
          const isNote=h.action.includes('Nota');const isPay=h.action.includes('Pagamento')||h.action.includes('Fechamento');
          const isTask=h.action.includes('Tarefa');const isPipe=h.action.includes('Pipeline');
          const dotColor=isNote?'var(--theme)':isPay?'var(--green)':isTask?'var(--amber)':isPipe?'var(--blue)':'var(--text3)';
          return `<div style="position:relative;padding:8px 0 16px">
            <div style="position:absolute;left:-25px;top:10px;width:10px;height:10px;border-radius:50%;background:${dotColor};border:2px solid var(--bg)"></div>
            <div style="font-size:12px;font-weight:500;color:var(--text)">${h.action}</div>
            <div style="font-size:10px;color:var(--text2);margin-top:2px">${h.detail||''}</div>
            <div style="font-size:9px;color:var(--text3);margin-top:2px">${h.user} · ${h.time}</div>
          </div>`;
        }).join(''):'<span style="font-size:10px;color:var(--text3)">Nenhum registro.</span>'}
      </div>
      ${tks.length?`<div style="margin-top:16px"><div class="dtl" style="margin-bottom:8px">Tarefas em aberto (${tks.length})</div>
        <div class="mini-list">${tks.map(t=>`<div class="mini"><div class="mini-info"><span class="mini-n">${t.title}</span><span class="mini-s">${t.assignee}</span></div>
          <div class="mini-r"><span class="pri pri-${t.priority[0]==='a'?'a':t.priority[0]==='m'?'m':'b'}">${t.priority.toUpperCase()}</span></div></div>`).join('')}</div></div>`:''}
    </div>

    <!-- TAB: PERFORMANCE -->
    <div id="aff-tab-performance" style="display:none">
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:10px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:10px;padding:14px 12px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">FTDs</div>
          <div style="font-family:var(--fd);font-size:22px;font-weight:800;color:var(--blue);line-height:1">${a.ftds}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:10px;padding:14px 12px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">QFTDs</div>
          <div style="font-family:var(--fd);font-size:22px;font-weight:800;color:var(--pink);line-height:1">${a.qftds}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:10px;padding:14px 12px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Conversão</div>
          <div style="font-family:var(--fd);font-size:22px;font-weight:800;color:${cvC(p)};line-height:1">${p}%</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:10px;padding:14px 12px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Depósitos</div>
          <div style="font-family:var(--fd);font-size:22px;font-weight:800;color:var(--text);line-height:1">${fc(a.deposits)}</div>
        </div>
        <div style="background:var(--bg3);border:1px solid var(--gb);border-radius:10px;padding:14px 12px;text-align:center">
          <div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:6px">Comissão</div>
          <div style="font-family:var(--fd);font-size:22px;font-weight:800;color:var(--red);line-height:1">${fc(a.commission)}</div>
        </div>
      </div>
      <div class="dtl" style="margin-bottom:8px">Lançamentos Diários (${reports.length})</div>
      ${reports.length?`<div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Marca</th><th>FTDs</th><th>QFTDs</th><th>Depósitos</th><th>Net Rev</th></tr></thead>
        <tbody>${reports.slice(0,20).map(r=>{
          const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
          return `<tr class="tr"><td style="font-size:11px">${new Date(r.date).toLocaleDateString('pt-BR')}</td>
            <td><span style="font-size:10px;font-weight:700;color:${STATE.brands[r.brand]?.color||'#888'}">${r.brand}</span></td>
            <td class="td-num">${r.ftd}</td><td class="td-num" style="color:var(--pink)">${q}</td>
            <td class="td-money">${fc(r.deposits)}</td>
            <td style="color:${(r.netRev||0)>=0?'var(--green)':'var(--red)'}; font-weight:600">${fc(r.netRev)}</td></tr>`;
        }).join('')}</tbody></table></div>`:'<span style="font-size:10px;color:var(--text3)">Nenhum lançamento diário registrado.</span>'}
      ${pys.length?`<div style="margin-top:14px"><div class="dtl" style="margin-bottom:8px">Pagamentos (${pys.length})</div>
        <div class="mini-list">${pys.map(py=>`<div class="mini"><div class="mini-info"><span class="mini-n">${py.contract}</span><span class="mini-s">${py.type||''} · ${py.dueDate?new Date(py.dueDate).toLocaleDateString('pt-BR'):''}</span></div>
          <div class="mini-r"><span class="pb pb-${py.status}">${pl(py.status)}</span><span class="mini-v">${fc(py.amount)}</span></div></div>`).join('')}</div></div>`:''}
    </div>`,
    `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
     <button class="btn btn-outline" onclick="closeModal();openEditAff('${a.id}')"><i data-lucide="edit-3"></i> Editar</button>
     <button class="btn btn-theme" onclick="closeModal();openMod('payments')">Financeiro</button>`);
};

window.showAffTab=(tab,btn)=>{
  btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  ['perfil','timeline','performance'].forEach(t=>{
    const el=document.getElementById('aff-tab-'+t);if(el)el.style.display=t===tab?'block':'none';
  });
};

window.addCRMNote = (affiliateId) => {
  const a = STATE.affiliates.find(x => x.id === affiliateId);
  if (!a) return;
  const note = prompt(`Adicionar nota ao histórico de ${a.name}:`);
  if (note && note.trim()) {
    logAction(`Nota adicionada: ${note.trim()}`, `Afiliado: ${a.name}`);
    openAffDetail(affiliateId);
    toast('Nota registrada no CRM!');
  }
}

// ── LAB: Tags (beta) ──
window.toggleAffTag = (affId, tagId) => {
  const a = STATE.affiliates.find(x => x.id === affId);
  if (!a) return;
  if (!a.tags) a.tags = [];
  const idx = a.tags.indexOf(tagId);
  if (idx >= 0) a.tags.splice(idx, 1); else a.tags.push(tagId);
  const tag = STATE.availableTags?.find(t => t.id === tagId);
  logAction(`[BETA] Tag ${idx >= 0 ? 'removida' : 'adicionada'}`, `${a.name} · ${tag?.name || tagId}`);
  saveToLocal();
  openAffDetail(affId);
  // Also refresh the grid underneath
  const grid = document.getElementById('aff-grid');
  if (grid) renderAffs(_affTypeF ? STATE.affiliates.filter(x => x.contractType === _affTypeF) : STATE.affiliates);
};

window.openNewAff=()=>{
  const brandsList=Object.entries(STATE.brands);
  openModal('Novo Afiliado',`<div class="fg">
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="na-name" placeholder="Ex: Agência FMG"></div>
    <div class="fgp"><label>Email</label><input class="fi" id="na-email" placeholder="afiliado@3c.gg"></div>
    <div class="fgp"><label>Tipo de comissão principal</label><select class="fi" id="na-ct" onchange="updateDealFields()">
      <option value="cpa">CPA + Rev Share</option>
      <option value="tiered">CPA Escalonado</option>
      <option value="pct_deposit">% de Depósitos</option>
    </select></div>
    <div class="fgp ff"><label>Marcas e Comissões</label>
      <div id="na-deals" style="display:flex;flex-direction:column;gap:10px;margin-top:6px">
        ${brandsList.map(([n,br])=>`
          <div class="na-brand-deal" style="padding:12px;background:rgba(${br.rgb},0.06);border:1px solid rgba(${br.rgb},0.2);border-radius:12px">
            <label style="display:flex;align-items:center;gap:7px;margin-bottom:8px;cursor:pointer">
              <input type="checkbox" class="na-brand-chk" value="${n}" style="accent-color:${br.color}">
              <span style="font-size:12px;font-weight:700;color:${br.color}">${n}</span>
            </label>
            <div class="na-deal-fields" data-brand="${n}" style="display:none;gap:8px;flex-wrap:wrap">
              <div style="margin-bottom:6px"><label style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em;font-weight:600">Identificação na ${n}</label>
                <input class="fi na-extid" data-brand="${n}" placeholder="Nome, code, username — como aparece na dash" style="padding:8px;font-size:12px;margin-top:2px"></div>
              <div class="na-deal-std" style="display:flex;gap:6px;flex-wrap:wrap">
                <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">CPA (R$)</label>
                  <input type="number" class="fi" data-field="cpa" value="${br.cpa||0}" style="padding:8px;font-size:12px"></div>
                <div style="flex:1;min-width:100px"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Rev Share (%)</label>
                  <input type="number" class="fi" data-field="rs" value="${br.rs||0}" style="padding:8px;font-size:12px"></div>
                <div style="flex:1;min-width:100px" class="na-deal-dep"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">Meta Dep. (R$)</label>
                  <input type="number" class="fi" data-field="depositTarget" value="50000" style="padding:8px;font-size:12px"></div>
                <div style="flex:1;min-width:100px" class="na-deal-pct"><label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em">% Depósitos</label>
                  <input type="number" class="fi" data-field="pctDeposit" value="5" step="0.1" style="padding:8px;font-size:12px"></div>
              </div>
              <div class="na-deal-tiered" style="display:none;margin-top:8px;width:100%">
                <label style="font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;display:block">Níveis CPA Escalonado</label>
                <div class="na-tiers" data-brand="${n}" style="display:flex;flex-direction:column;gap:4px">
                  <div style="display:flex;gap:4px;margin-bottom:2px">
                    <span style="width:50px;font-size:7px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Nível</span>
                    <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">CPA (R$)</span>
                    <span style="flex:1;font-size:7px;color:var(--text3);text-transform:uppercase;letter-spacing:0.1em;font-weight:700">Baseline (FTDs)</span>
                  </div>
                  <div style="display:flex;gap:4px;align-items:center">
                    <input class="fi" data-tier="name" value="L1" style="width:50px;padding:6px;font-size:11px" placeholder="L1">
                    <input type="number" class="fi" data-tier="cpa" value="${br.cpa||0}" style="flex:1;padding:6px;font-size:11px" placeholder="R$ por FTD">
                    <input type="number" class="fi" data-tier="baseline" value="30" style="flex:1;padding:6px;font-size:11px" placeholder="Mín. FTDs">
                  </div>
                </div>
                <button onclick="addTier('${n}')" style="margin-top:4px;background:transparent;border:1px dashed var(--gb2);border-radius:6px;padding:4px 10px;font-size:9px;color:var(--text3);cursor:pointer;width:100%">+ Nível</button>
              </div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="fgp ff"><label>Redes Sociais</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <div style="position:relative"><input class="fi" id="na-instagram" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">📷</span></div>
        <div style="position:relative"><input class="fi" id="na-twitter" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">𝕏</span></div>
        <div style="position:relative"><input class="fi" id="na-youtube" placeholder="Canal YouTube" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">▶</span></div>
        <div style="position:relative"><input class="fi" id="na-tiktok" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">♪</span></div>
        <div style="position:relative;grid-column:1/-1"><input class="fi" id="na-website" placeholder="https://site.com" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🌐</span></div>
      </div>
    </div>
    <div class="fgp ff"><label>Observações</label><textarea class="fi" id="na-notes" rows="2"></textarea></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveNewAff()"><i data-lucide="save"></i> Salvar</button>`);
  // Toggle deal fields on checkbox
  document.querySelectorAll('.na-brand-chk').forEach(chk=>{
    chk.addEventListener('change',()=>{
      const fields=document.querySelector(`.na-deal-fields[data-brand="${chk.value}"]`);
      if(fields)fields.style.display=chk.checked?'flex':'none';
    });
  });
  updateDealFields();
};

window.updateDealFields=()=>{
  const ct=document.getElementById('na-ct')?.value||'cpa';
  document.querySelectorAll('.na-deal-std').forEach(el=>el.style.display='flex');
  document.querySelectorAll('.na-deal-tiered').forEach(el=>el.style.display=ct==='tiered'?'block':'none');
  document.querySelectorAll('.na-deal-dep').forEach(el=>el.style.display=(ct==='deposit')?'block':'none');
  document.querySelectorAll('.na-deal-pct').forEach(el=>el.style.display=(ct==='pct_deposit')?'block':'none');
};

window.addTier=(brand)=>{
  const container=document.querySelector(`.na-tiers[data-brand="${brand}"]`);if(!container)return;
  const n=container.children.length+1;
  const div=document.createElement('div');div.style.cssText='display:flex;gap:4px;align-items:center';
  div.innerHTML=`<input class="fi" data-tier="name" value="L${n}" style="width:50px;padding:6px;font-size:11px" placeholder="L${n}">
    <input type="number" class="fi" data-tier="cpa" value="0" style="flex:1;padding:6px;font-size:11px" placeholder="R$ por FTD">
    <input type="number" class="fi" data-tier="baseline" value="0" style="flex:1;padding:6px;font-size:11px" placeholder="Mín. FTDs">
    <button onclick="this.parentElement.remove()" style="background:transparent;border:none;color:var(--red);cursor:pointer;font-size:14px">×</button>`;
  container.appendChild(div);
};

window.saveNewAff=()=>{
  const name=document.getElementById('na-name')?.value.trim();
  if(!name){toast('Nome é obrigatório','e');return;}
  const email=document.getElementById('na-email')?.value.trim()||'';
  const ct=document.getElementById('na-ct')?.value||'cpa';
  const notes=document.getElementById('na-notes')?.value.trim()||'';
  const deals={};
  document.querySelectorAll('.na-brand-chk:checked').forEach(chk=>{
    const b=chk.value;const fields=document.querySelector(`.na-deal-fields[data-brand="${b}"]`);
    if(!fields)return;
    const deal={};
    deal.cpa=parseFloat(fields.querySelector('[data-field="cpa"]')?.value)||0;
    deal.rs=parseFloat(fields.querySelector('[data-field="rs"]')?.value)||0;
    if(ct==='deposit')deal.depositTarget=parseFloat(fields.querySelector('[data-field="depositTarget"]')?.value)||0;
    if(ct==='pct_deposit')deal.pctDeposit=parseFloat(fields.querySelector('[data-field="pctDeposit"]')?.value)||0;
    if(ct==='tiered'){
      const tiers=fields.querySelector(`.na-tiers[data-brand="${b}"]`);
      if(tiers){deal.levels=[];
        tiers.querySelectorAll('div').forEach(row=>{
          const tn=row.querySelector('[data-tier="name"]')?.value||'L1';
          const tc=parseFloat(row.querySelector('[data-tier="cpa"]')?.value)||0;
          const tb=parseFloat(row.querySelector('[data-tier="baseline"]')?.value)||0;
          deal.levels.push({key:tn.toLowerCase(),name:tn,cpa:tc,baseline:tb});
        });
      }
    }
    deals[b]=deal;
  });
  if(!Object.keys(deals).length){toast('Selecione pelo menos uma marca','e');return;}
  const externalIds={};
  document.querySelectorAll('.na-extid').forEach(inp=>{
    const v=inp.value.trim();if(v)externalIds[inp.dataset.brand]=v;
  });
  const social={
    instagram:document.getElementById('na-instagram')?.value.trim()||'',
    twitter:document.getElementById('na-twitter')?.value.trim()||'',
    youtube:document.getElementById('na-youtube')?.value.trim()||'',
    tiktok:document.getElementById('na-tiktok')?.value.trim()||'',
    website:document.getElementById('na-website')?.value.trim()||''
  };
  const newAff={id:'a'+Date.now(),name,type:'afiliado',status:'ativo',contactName:name,contactEmail:email,contractType:ct,deals,externalIds,social,ftds:0,qftds:0,deposits:0,netRev:0,commission:0,profit:0,notes};
  STATE.affiliates.push(newAff);logAction('Afiliado cadastrado',name);saveToLocal();closeModal();
  renderAffs(_affTypeF?STATE.affiliates.filter(a=>a.contractType===_affTypeF):STATE.affiliates);
  toast('Afiliado cadastrado!');
};

window.openEditAff=id=>{
  const a=STATE.affiliates.find(x=>x.id===id);if(!a)return;
  openModal('Editar Afiliado',`<div class="fg">
    <div class="fgp ff"><label>Nome *</label><input class="fi" id="ea-name" value="${a.name}"></div>
    <div class="fgp"><label>Email</label><input class="fi" id="ea-email" value="${a.contactEmail||''}"></div>
    <div class="fgp"><label>Tipo de contrato</label><select class="fi" id="ea-ct">
      <option value="cpa" ${a.contractType==='cpa'?'selected':''}>CPA + Rev Share</option>
      <option value="tiered" ${a.contractType==='tiered'?'selected':''}>CPA Escalonado</option>
      <option value="pct_deposit" ${a.contractType==='pct_deposit'?'selected':''}>% de Depósitos</option>
    </select></div>
    <div class="fgp"><label>Status</label><select class="fi" id="ea-st">
      <option value="ativo" ${a.status==='ativo'?'selected':''}>Ativo</option>
      <option value="negociação" ${a.status==='negociação'?'selected':''}>Negociação</option>
      <option value="encerrado" ${a.status==='encerrado'?'selected':''}>Encerrado</option>
    </select></div>
    <div class="fgp"><label>FTDs</label><input type="number" class="fi" id="ea-ftds" value="${a.ftds}"></div>
    <div class="fgp"><label>QFTDs</label><input type="number" class="fi" id="ea-qftds" value="${a.qftds}"></div>
    <div class="fgp"><label>Depósitos (R$)</label><input type="number" class="fi" id="ea-dep" value="${a.deposits}"></div>
    <div class="fgp"><label>Net Revenue (R$)</label><input type="number" class="fi" id="ea-rev" value="${a.netRev||0}"></div>
    <div class="fgp"><label>Comissão (R$)</label><input type="number" class="fi" id="ea-comm" value="${a.commission}"></div>
    <div class="fgp"><label>Lucro 3C (R$)</label><input type="number" class="fi" id="ea-profit" value="${a.profit}"></div>
    <div class="fgp ff"><label>Identificação nas Plataformas</label>
      <div style="font-size:10px;color:var(--text3);margin:2px 0 6px">Como o afiliado aparece na dashboard de cada casa (nome, code, username)</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px">
        ${Object.keys(a.deals||{}).map(b=>{const br=STATE.brands[b]||{color:'#888'};
          return `<div style="display:flex;align-items:center;gap:6px"><span style="font-size:10px;font-weight:700;color:${br.color};min-width:60px">${b}</span>
            <input class="fi ea-extid" data-brand="${b}" value="${a.externalIds?.[b]||''}" placeholder="Como aparece na dash" style="padding:6px 10px;font-size:12px;flex:1"></div>`;
        }).join('')}
      </div>
    </div>
    <div class="fgp ff"><label>Redes Sociais</label>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px">
        <div style="position:relative"><input class="fi" id="ea-instagram" value="${a.social?.instagram||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">📷</span></div>
        <div style="position:relative"><input class="fi" id="ea-twitter" value="${a.social?.twitter||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">𝕏</span></div>
        <div style="position:relative"><input class="fi" id="ea-youtube" value="${a.social?.youtube||''}" placeholder="Canal YouTube" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">▶</span></div>
        <div style="position:relative"><input class="fi" id="ea-tiktok" value="${a.social?.tiktok||''}" placeholder="@usuario" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">♪</span></div>
        <div style="position:relative;grid-column:1/-1"><input class="fi" id="ea-website" value="${a.social?.website||''}" placeholder="https://site.com" style="padding-left:30px"><span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:12px">🌐</span></div>
      </div>
    </div>
    <div class="fgp ff"><label>Observações</label><textarea class="fi" id="ea-notes" rows="2">${a.notes||''}</textarea></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-danger" onclick="confirmDeleteAff('${a.id}')"><i data-lucide="trash-2"></i> Excluir</button>
    <button class="btn btn-theme" onclick="saveEditAff('${a.id}')"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditAff=id=>{
  const a=STATE.affiliates.find(x=>x.id===id);if(!a)return;
  const name=document.getElementById('ea-name')?.value.trim();
  if(!name){toast('Nome é obrigatório','e');return;}
  a.name=name;a.contactName=name;
  a.contactEmail=document.getElementById('ea-email')?.value.trim()||'';
  a.contractType=document.getElementById('ea-ct')?.value||a.contractType;
  a.status=document.getElementById('ea-st')?.value||a.status;
  a.ftds=parseInt(document.getElementById('ea-ftds')?.value)||0;
  a.qftds=parseInt(document.getElementById('ea-qftds')?.value)||0;
  a.deposits=parseFloat(document.getElementById('ea-dep')?.value)||0;
  a.netRev=parseFloat(document.getElementById('ea-rev')?.value)||0;
  a.commission=parseFloat(document.getElementById('ea-comm')?.value)||0;
  a.profit=parseFloat(document.getElementById('ea-profit')?.value)||0;
  a.notes=document.getElementById('ea-notes')?.value.trim()||'';
  if(!a.externalIds)a.externalIds={};
  document.querySelectorAll('.ea-extid').forEach(inp=>{
    const v=inp.value.trim();if(v)a.externalIds[inp.dataset.brand]=v;else delete a.externalIds[inp.dataset.brand];
  });
  a.social={
    instagram:document.getElementById('ea-instagram')?.value.trim()||'',
    twitter:document.getElementById('ea-twitter')?.value.trim()||'',
    youtube:document.getElementById('ea-youtube')?.value.trim()||'',
    tiktok:document.getElementById('ea-tiktok')?.value.trim()||'',
    website:document.getElementById('ea-website')?.value.trim()||''
  };
  logAction('Afiliado editado',name);saveToLocal();closeModal();
  renderAffs(_affTypeF?STATE.affiliates.filter(x=>x.contractType===_affTypeF):STATE.affiliates);
  toast('Afiliado atualizado!');
};

window.confirmDeleteAff=id=>{
  const a=STATE.affiliates.find(x=>x.id===id);if(!a)return;
  openModal('Excluir Afiliado',`<p style="color:var(--text2);font-size:13px">Tem certeza que deseja excluir <strong>${a.name}</strong>? Contratos e pagamentos vinculados serão mantidos.</p>`,
  `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
   <button class="btn btn-danger" onclick="deleteAff('${id}')"><i data-lucide="trash-2"></i> Excluir</button>`);
};

window.deleteAff=id=>{
  const idx=STATE.affiliates.findIndex(x=>x.id===id);
  if(idx>-1){const name=STATE.affiliates[idx].name;STATE.affiliates.splice(idx,1);
    logAction('Afiliado excluído',name);saveToLocal();closeModal();
    renderAffs(_affTypeF?STATE.affiliates.filter(x=>x.contractType===_affTypeF):STATE.affiliates);
    toast('Afiliado excluído!');}
};

