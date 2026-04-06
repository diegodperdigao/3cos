// ══════════════════════════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════════════════════════
let _dashBrand='all',_dashDateRange='all';
function bDash(el){
  el.innerHTML=modHdr('Dashboard')+`<div class="mod-body">
    ${heroHTML('dashboard','Dashboard — Operação 3C','Visão Geral 3C','Resultado consolidado da operação')}
    <div class="mod-main">
      <div class="sec-hdr" style="margin-bottom:14px">
        <div class="sec-lbl">Painel de Controle</div>
        <button class="btn btn-theme" onclick="openDailyDataModal()"><i data-lucide="database"></i> Lançar Dados</button>
      </div>

      <!-- FILTRO DE DATAS -->
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px">
        <div class="pills" id="dash-date-pills">
          <button class="pill ${_dashDateRange==='all'?'on':''}" onclick="setDashDate('all',this)">Todo Período</button>
          <button class="pill ${_dashDateRange==='month'?'on':''}" onclick="setDashDate('month',this)">Este Mês</button>
          <button class="pill ${_dashDateRange==='last'?'on':''}" onclick="setDashDate('last',this)">Mês Passado</button>
          <button class="pill ${_dashDateRange==='custom'?'on':''}" onclick="setDashDate('custom',this)">Personalizado</button>
        </div>
        <div id="dash-custom-dates" style="display:${_dashDateRange==='custom'?'flex':'none'};gap:6px;align-items:center">
          <input type="date" class="fi" id="dash-date-from" style="padding:6px 10px;font-size:11px;width:140px" onchange="refreshDash()">
          <span style="color:var(--text3);font-size:10px">até</span>
          <input type="date" class="fi" id="dash-date-to" style="padding:6px 10px;font-size:11px;width:140px" onchange="refreshDash()">
        </div>
      </div>

      <!-- BRAND TABS -->
      <div class="tabs" id="dash-brand-tabs" style="margin-bottom:6px">
        <button class="tab ${_dashBrand==='all'?'on':''}" style="--tab-color:#ec4899" onclick="setDashBrandTab('all',this)">
          <div class="tab-dot" style="background:#ec4899"></div>Todas</button>
        ${Object.entries(STATE.brands).map(([name,br])=>`<button class="tab ${_dashBrand===name?'on':''}" style="--tab-color:${br.color}" onclick="setDashBrandTab('${name}',this)">
          <div class="tab-dot" style="background:${br.color}"></div>${name}</button>`).join('')}
      </div>

      <!-- DYNAMIC CONTENT -->
      <div id="dash-dynamic"></div>
    </div></div>`;
  refreshDash();
}

window.setDashDate=(range,btn)=>{
  _dashDateRange=range;
  btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  const custom=document.getElementById('dash-custom-dates');
  if(custom)custom.style.display=range==='custom'?'flex':'none';
  refreshDash();
};

window.setDashBrandTab=(brand,btn)=>{
  _dashBrand=brand;
  btn.closest('.tabs').querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  refreshDash();
};

function getDashDateRange(){
  const now=new Date();
  if(_dashDateRange==='month'){
    return {from:new Date(now.getFullYear(),now.getMonth(),1),to:new Date(now.getFullYear(),now.getMonth()+1,0)};
  }else if(_dashDateRange==='last'){
    return {from:new Date(now.getFullYear(),now.getMonth()-1,1),to:new Date(now.getFullYear(),now.getMonth(),0)};
  }else if(_dashDateRange==='custom'){
    const f=document.getElementById('dash-date-from')?.value;
    const t=document.getElementById('dash-date-to')?.value;
    return {from:f?new Date(f):null,to:t?new Date(t):null};
  }
  return {from:null,to:null};
}

function getFilteredReports(brandFilter){
  const {from,to}=getDashDateRange();
  let reps=STATE.reports;
  if(brandFilter)reps=reps.filter(r=>r.brand===brandFilter);
  if(from||to){
    reps=reps.filter(r=>{
      const d=new Date(r.date);
      if(from&&d<from)return false;
      if(to&&d>new Date(to.getTime()+86400000))return false;
      return true;
    });
  }
  return reps;
}

window.refreshDash=()=>{
  const el=document.getElementById('dash-dynamic');if(!el)return;
  const brand=_dashBrand;
  const isAllTime=_dashDateRange==='all';
  const brands=brand==='all'?Object.keys(STATE.brands):[brand];

  // Calculate data
  let totFTD=0,totQFTD=0,totDep=0,totComm=0,totProfit=0,totRev=0;
  const agg={};brands.forEach(b=>{agg[b]={ftd:0,qftd:0,dep:0,netRev:0,affCount:new Set()};});

  if(isAllTime&&brand==='all'){
    STATE.affiliates.forEach(a=>{totFTD+=a.ftds;totQFTD+=a.qftds;totDep+=a.deposits;totComm+=a.commission;totProfit+=a.profit;});
    STATE.reports.forEach(r=>{
      if(!agg[r.brand])return;
      const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
      agg[r.brand].ftd+=r.ftd||0;agg[r.brand].qftd+=q;agg[r.brand].dep+=r.deposits||0;agg[r.brand].netRev+=r.netRev||0;
      agg[r.brand].affCount.add(r.affiliateId);
    });
  }else{
    const reps=getFilteredReports(brand==='all'?null:brand);
    reps.forEach(r=>{
      const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
      totFTD+=r.ftd||0;totQFTD+=q;totDep+=r.deposits||0;totRev+=r.netRev||0;
      if(agg[r.brand]){agg[r.brand].ftd+=r.ftd||0;agg[r.brand].qftd+=q;agg[r.brand].dep+=r.deposits||0;
        agg[r.brand].netRev+=r.netRev||0;agg[r.brand].affCount.add(r.affiliateId);}
    });
  }
  const br=brand==='all'?null:STATE.brands[brand];
  const conv=pct(totQFTD,totFTD);

  const {from,to}=getDashDateRange();
  const dateLbl=_dashDateRange==='all'?'Todo Período':_dashDateRange==='month'?'Este Mês':_dashDateRange==='last'?'Mês Passado':
    (from&&to?`${from.toLocaleDateString('pt-BR')} — ${to.toLocaleDateString('pt-BR')}`:'Personalizado');

  // Intel affiliates
  const filteredReps=getFilteredReports(brand==='all'?null:brand);
  let intelAffs;
  if(isAllTime&&brand==='all'){
    intelAffs=[...STATE.affiliates].filter(a=>a.ftds>0).sort((a,b)=>pct(b.qftds,b.ftds)-pct(a.qftds,a.ftds));
  }else if(brand==='all'){
    const affIds=new Set(filteredReps.map(r=>r.affiliateId));
    intelAffs=STATE.affiliates.filter(a=>affIds.has(a.id));
  }else{
    intelAffs=STATE.affiliates.filter(a=>a.deals&&a.deals[brand]);
  }

  const intelTitle=brand==='all'?'Intelligence 3C':`${brand} Intelligence`;
  const intelSub=brand==='all'?'Conversão e Retenção por Afiliado':`Performance por Afiliado — ${brand}`;
  const eyeColor=br?br.color:'';

  // Ranking
  let ranked;
  if(isAllTime&&brand==='all'){
    ranked=[...STATE.affiliates].sort((a,b)=>b.commission-a.commission);
  }else{
    const affMap={};
    filteredReps.forEach(r=>{
      if(!affMap[r.affiliateId])affMap[r.affiliateId]={ftd:0,qftd:0,dep:0,netRev:0};
      const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
      affMap[r.affiliateId].ftd+=r.ftd||0;affMap[r.affiliateId].qftd+=q;
      affMap[r.affiliateId].dep+=r.deposits||0;affMap[r.affiliateId].netRev+=r.netRev||0;
    });
    ranked=Object.entries(affMap).map(([id,d])=>{
      const a=STATE.affiliates.find(x=>x.id===id);
      return a?{...a,ftds:d.ftd,qftds:d.qftd,deposits:d.dep,commission:0,profit:0}:null;
    }).filter(Boolean).sort((a,b)=>b.deposits-a.deposits);
  }

  el.innerHTML=`
    <!-- KPIs -->
    <div class="kpi-row" style="margin-bottom:22px">
      <div class="kpi" style="--kpi-c:#ec4899;--kpi-glow:rgba(236,72,153,0.1)">
        <div class="kpi-icon-row"><i data-lucide="users" style="width:14px;height:14px;stroke:#ec4899"></i><span class="kpi-lbl">QFTDs</span></div>
        <div class="kpi-val">${totQFTD}</div><div class="kpi-sub">${totFTD} FTDs · ${dateLbl}</div></div>
      <div class="kpi" style="--kpi-c:var(--blue);--kpi-glow:rgba(59,130,246,0.1)">
        <div class="kpi-icon-row"><i data-lucide="trending-down" style="width:14px;height:14px;stroke:var(--blue)"></i><span class="kpi-lbl">Depósitos</span></div>
        <div class="kpi-val sm">${fc(totDep)}</div><div class="kpi-sub">Volume depositado</div></div>
      ${isAllTime&&brand==='all'?`
      <div class="kpi" style="--kpi-c:var(--red);--kpi-glow:rgba(220,38,38,0.1)">
        <div class="kpi-icon-row"><i data-lucide="credit-card" style="width:14px;height:14px;stroke:var(--red)"></i><span class="kpi-lbl">Comissão</span></div>
        <div class="kpi-val sm col" style="--kpi-c:var(--red)">${fc(totComm)}</div><div class="kpi-sub">CPA + Rev Share</div></div>
      <div class="kpi" style="--kpi-c:var(--green);--kpi-glow:rgba(16,185,129,0.1)">
        <div class="kpi-icon-row"><i data-lucide="diamond" style="width:14px;height:14px;stroke:var(--green)"></i><span class="kpi-lbl">Lucro 3C</span></div>
        <div class="kpi-val sm col" style="--kpi-c:var(--green)">${fc(totProfit)}</div><div class="kpi-sub">Bruto: ${fc(totComm+totProfit)}</div></div>`:`
      <div class="kpi" style="--kpi-c:var(--red);--kpi-glow:rgba(220,38,38,0.1)">
        <div class="kpi-icon-row"><i data-lucide="activity" style="width:14px;height:14px;stroke:var(--red)"></i><span class="kpi-lbl">Net Revenue</span></div>
        <div class="kpi-val sm ${totRev<0?'col':''}" style="${totRev<0?'--kpi-c:var(--red)':''}">${fc(totRev)}</div><div class="kpi-sub">Receita líquida</div></div>
      <div class="kpi" style="--kpi-c:var(--green);--kpi-glow:rgba(16,185,129,0.1)">
        <div class="kpi-icon-row"><i data-lucide="percent" style="width:14px;height:14px;stroke:var(--green)"></i><span class="kpi-lbl">Conversão</span></div>
        <div class="kpi-val">${conv}%</div><div class="kpi-sub">FTD → QFTD</div></div>`}
    </div>

    ${brand==='all'?`
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-bottom:24px">
      ${Object.keys(STATE.brands).map(b=>{const br2=STATE.brands[b];const d=agg[b];
        return `<div class="aff-card" style="border-left:3px solid ${br2.color};cursor:pointer" onclick="setDashBrandTab('${b}',document.querySelectorAll('#dash-brand-tabs .tab')[${Object.keys(STATE.brands).indexOf(b)+1}])">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
            <div style="width:10px;height:10px;border-radius:50%;background:${br2.color}"></div>
            <span style="font-family:var(--fd);font-size:15px;font-weight:800;color:${br2.color};text-transform:uppercase;letter-spacing:0.06em">${b}</span>
            <span style="margin-left:auto;font-size:10px;color:var(--text3)">${d.affCount.size} afil.</span>
          </div>
          <div style="display:flex;gap:12px">
            <div style="text-align:center;flex:1"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">QFTDs</div><div style="font-family:var(--fd);font-size:22px;font-weight:800;color:${br2.color}">${d.qftd}</div></div>
            <div style="text-align:center;flex:1"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">FTDs</div><div style="font-family:var(--fd);font-size:22px;font-weight:800;color:var(--text)">${d.ftd}</div></div>
            <div style="text-align:center;flex:1"><div style="font-size:9px;color:var(--text3);text-transform:uppercase;letter-spacing:0.08em">Dep.</div><div style="font-family:var(--fd);font-size:14px;font-weight:700;color:var(--text);margin-top:2px">${fc(d.dep)}</div></div>
          </div>
        </div>`;}).join('')}
    </div>`:''}

    <!-- INTELLIGENCE -->
    <div class="intel-wrap" style="margin-bottom:24px">
      <div class="intel-hdr">
        <div><div class="intel-eye" ${eyeColor?`style="color:${eyeColor}"`:''}>${intelTitle}</div>
          <div class="intel-title">${intelSub}</div>
          <div class="intel-sub">Taxa FTD→QFTD · Depósitos · Tendência</div></div>
      </div>
      <div class="intel-grid">
        ${intelAffs.map(a=>{
          let aFTD,aQFTD,aDep;
          if(isAllTime&&brand==='all'){aFTD=a.ftds;aQFTD=a.qftds;aDep=a.deposits;}
          else{const rs=filteredReps.filter(r=>r.affiliateId===a.id);
            aFTD=rs.reduce((s,r)=>s+(r.ftd||0),0);aQFTD=rs.reduce((s,r)=>s+(typeof r.qftd==='object'?Object.values(r.qftd).reduce((x,v)=>x+v,0):(r.qftd||0)),0);
            aDep=rs.reduce((s,r)=>s+(r.deposits||0),0);}
          if(!aFTD&&!aQFTD&&!aDep&&!(isAllTime&&brand==='all'))return '';
          const p2=pct(aQFTD,aFTD);const col=cvC(p2);
          const dealStr=brand==='all'?`${aFTD} FTDs · ${CONTRACT_TYPES[a.contractType]?.label||''}`:
            (()=>{const deal=a.deals?.[brand];return a.contractType==='tiered'?'CPA Escalonado':
              a.contractType==='rs'?`RS ${deal?.rs||STATE.brands[brand]?.rs||0}%`:`CPA R$${deal?.cpa||STATE.brands[brand]?.cpa||0}`;})()+(aFTD?` · ${aFTD} FTDs`:'');
          return `<div class="intel-card" onclick="openAffDetail('${a.id}')">
            <div class="intel-name">${a.name}</div>
            <div class="intel-meta">${dealStr}</div>
            <div class="conv-row"><span class="conv-label">Conversão FTD→QFTD</span><span class="conv-pct" style="color:${col}">${p2}%</span></div>
            <div class="conv-bg"><div class="conv-fill" style="width:${Math.min(p2,100)}%;background:${col}"></div></div>
            <div class="conv-ft"><span style="color:var(--text3)">${aFTD} FTDs</span><span style="color:${col}">${aQFTD} QFTDs</span></div>
            <div class="intel-sep"><div><div class="dep-lbl">Depósitos</div><div class="dep-val">${fc(aDep)}</div></div>
              <svg width="70" height="24" style="overflow:visible"><polyline points="0,20 14,15 28,17 42,9 56,11 70,7" fill="none" stroke="var(--green)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/><circle cx="70" cy="7" r="2.5" fill="var(--green)"/></svg>
            </div></div>`;
        }).join('')}
      </div>
    </div>

    <!-- TOP RANKING -->
    ${ranked.length?`
    <div class="sec-hdr" style="margin-bottom:12px"><div class="sec-lbl">Top Ranking${brand!=='all'?' — '+brand:''}</div></div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>Afiliado</th><th>Tipo</th><th style="text-align:center">FTDs</th>
      <th style="text-align:center" class="col-theme">QFTDs</th>
      <th>Depósitos</th>${isAllTime&&brand==='all'?'<th class="col-theme">Comissão</th><th style="color:var(--green)">Lucro 3C</th>':''}
    </tr></thead><tbody>
      ${ranked.map((a,i)=>`<tr class="tr" onclick="openAffDetail('${a.id}')">
        <td><span class="td-rank">${medal(i)}</span> <span class="td-name">${a.name}</span></td>
        <td><span class="ct-badge ${CONTRACT_TYPES[a.contractType]?.css||''}">${CONTRACT_TYPES[a.contractType]?.label||''}</span></td>
        <td class="td-num">${a.ftds}</td><td class="td-pink">${a.qftds}</td>
        <td class="td-money">${fc(a.deposits)}</td>${isAllTime&&brand==='all'?`
        <td class="td-red" style="color:var(--red)">${fc(a.commission)}</td><td class="td-green" style="color:var(--green)">${fc(a.profit)}</td>`:''}
      </tr>`).join('')}
    </tbody></table></div>`:''}`;
  lucide.createIcons();
};

// ══════════════════════════════════════════════════════════
// NOVO: Lançar Dados Modal Logic
// ══════════════════════════════════════════════════════════
window.openDailyDataModal = () => {
  const brandOptions = Object.keys(STATE.brands).map(b => `<option value="${b}">${b}</option>`).join('');
  const affOptions = STATE.affiliates.filter(a=>a.status==='ativo').map(a => `<option value="${a.id}">${a.name}</option>`).join('');
  const today = new Date().toISOString().split('T')[0];

  openModal('Lançar Dados de Performance', `
    <div class="fg">
      <div class="fgp"><label>Marca Parceira *</label>
        <select class="fi" id="dd-brand" onchange="updateDailyFields()">${brandOptions}</select>
      </div>
      <div class="fgp"><label>Afiliado *</label>
        <select class="fi" id="dd-aff" onchange="updateDailyFields()">${affOptions}</select>
      </div>
      <div class="fgp"><label>Data de Referência *</label>
        <input type="date" class="fi" id="dd-date" value="${today}">
      </div>
      <div class="fgp"><label>FTDs</label>
        <input type="number" class="fi" id="dd-ftd" placeholder="0">
      </div>
      <div id="dd-qftd-section">
        <div class="fgp"><label>QFTDs</label>
          <input type="number" class="fi" id="dd-qftd" placeholder="0">
        </div>
      </div>
      <div class="fgp"><label>Depósitos (R$)</label>
        <input type="number" step="0.01" class="fi" id="dd-dep" placeholder="0.00">
      </div>
      <div class="fgp"><label>Net Revenue (R$)</label>
        <input type="number" step="0.01" class="fi" id="dd-rev" placeholder="0.00">
      </div>
    </div>
    <div id="dd-history" style="margin-top:14px"></div>
  `, `<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
      <button class="btn btn-theme" onclick="saveDailyData()"><i data-lucide="save"></i> Lançar</button>`);
  updateDailyFields();
};

window.updateDailyFields = () => {
  const brand = document.getElementById('dd-brand')?.value;
  const affId = document.getElementById('dd-aff')?.value;
  const section = document.getElementById('dd-qftd-section');
  const histEl = document.getElementById('dd-history');
  if(!section) return;

  // Check if brand is tiered for this affiliate
  const aff = STATE.affiliates.find(a=>a.id===affId);
  const br = STATE.brands[brand];
  const isTiered = aff?.contractType==='tiered' && aff?.deals?.[brand]?.levels;

  if(isTiered) {
    const levels = aff.deals[brand].levels;
    section.innerHTML = levels.map(l => `
      <div class="fgp"><label>QFTDs ${l.name} (base ${l.baseline})</label>
        <input type="number" class="fi dd-qftd-tier" data-tier="${l.key}" placeholder="0">
      </div>`).join('');
  } else {
    section.innerHTML = `<div class="fgp"><label>QFTDs</label>
      <input type="number" class="fi" id="dd-qftd" placeholder="0">
    </div>`;
  }

  // Show recent entries for this affiliate+brand
  if(affId && brand && histEl) {
    const recent = STATE.reports.filter(r=>r.affiliateId===affId && r.brand===brand).slice(-5).reverse();
    histEl.innerHTML = recent.length ? `
      <div class="dtl" style="margin-bottom:6px">Últimos lançamentos — ${aff?.name||''} · ${brand}</div>
      ${recent.map(r=>{
        const q = typeof r.qftd==='object' ? Object.values(r.qftd).reduce((s,v)=>s+v,0) : (r.qftd||0);
        return `<div class="dr"><span>${new Date(r.date).toLocaleDateString('pt-BR')}</span>
          <span style="font-size:10px;color:var(--text2)">${r.ftd} FTD · ${q} QFTD · ${fc(r.deposits)}</span></div>`;
      }).join('')}` : '';
  }
};

window.saveDailyData = () => {
  const b = document.getElementById('dd-brand').value;
  const a = document.getElementById('dd-aff').value;
  const dt = document.getElementById('dd-date').value;
  const ftd = parseInt(document.getElementById('dd-ftd').value)||0;
  const dep = parseFloat(document.getElementById('dd-dep').value)||0;
  const rev = parseFloat(document.getElementById('dd-rev').value)||0;

  if(!b || !a || !dt) return toast("Preencha Marca, Afiliado e Data", "e");

  // Handle tiered or simple QFTDs
  let qftd;
  const tierInputs = document.querySelectorAll('.dd-qftd-tier');
  if(tierInputs.length) {
    qftd = {};
    tierInputs.forEach(inp => { qftd[inp.dataset.tier] = parseInt(inp.value)||0; });
  } else {
    qftd = parseInt(document.getElementById('dd-qftd')?.value)||0;
  }

  STATE.reports.push({ brand:b, affiliateId:a, date:dt, ftd, qftd, deposits:dep, netRev:rev });

  // Auto-update affiliate totals
  const aff = STATE.affiliates.find(x=>x.id===a);
  if(aff) {
    aff.ftds += ftd;
    aff.qftds += typeof qftd==='object' ? Object.values(qftd).reduce((s,v)=>s+v,0) : qftd;
    aff.deposits += dep;
    aff.netRev = (aff.netRev||0) + rev;
  }

  logAction('Lançamento de Dados', `${b} - ${STATE.affiliates.find(x=>x.id===a)?.name||''} - ${dt}`);
  saveToLocal();
  closeModal();
  toast('Dados lançados com sucesso!');

  if(document.getElementById('mod-dashboard').classList.contains('active')) bDash(document.getElementById('mod-dashboard'));
  if(document.getElementById('mod-brands').classList.contains('active')) bBrands(document.getElementById('mod-brands'));
};


