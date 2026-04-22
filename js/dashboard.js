// ══════════════════════════════════════════════════════════
// 1. DASHBOARD
// ══════════════════════════════════════════════════════════
let _dashBrand='all',_dashDateRange='all';
// Helper: pick the month (YYYY-MM) with the most reports. Used to add a
// "dataset" pill so the user can jump straight to the period where data lives.
function _mostRecentDataMonth(){
  const counts={};
  (STATE.reports||[]).forEach(r=>{
    const m=(r.date||'').substring(0,7);
    if(!m)return;
    counts[m]=(counts[m]||0)+1;
  });
  const months=Object.keys(counts).sort().reverse();
  return months[0]||null;
}
function bDash(el){
  el.innerHTML=modHdr('Dashboard')+`<div class="mod-body">
    ${heroHTML('dashboard','Operação 3C','Dashboard','Visão geral consolidada')}
    <div class="mod-main">
      <div class="sec-hdr" style="margin-bottom:14px">
        <div class="sec-lbl">Painel de Controle</div>
        <div class="sec-actions">
          <button class="btn btn-outline" onclick="openReportsHistory()"><i data-lucide="list"></i> Lançamentos</button>
          <button class="btn btn-outline" onclick="openImportModal()"><i data-lucide="upload"></i> Importar CSV</button>
          <button class="btn btn-theme" onclick="openDailyDataModal()"><i data-lucide="database"></i> Lançar Dados</button>
        </div>
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
          <div class="tab-dot" style="background:#ec4899"></div>Visão Geral</button>
        ${Object.entries(STATE.brands).map(([name,br])=>`<button class="tab ${_dashBrand===name?'on':''}" style="--tab-color:${br.color}" onclick="setDashBrandTab('${name}',this)">
          <div class="tab-dot" style="background:${br.color}"></div>${name}</button>`).join('')}
      </div>

      <!-- DYNAMIC CONTENT -->
      <div id="dash-dynamic"></div>
    </div></div>`;
  refreshDash();
}

window.setDashDate=(range,btn)=>{
  // Toggle: clicking same pill again resets to 'all' (for custom, hides date pickers)
  if(_dashDateRange===range&&range==='custom'){_dashDateRange='all';range='all';
    btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));
    btn.closest('.pills').querySelector('.pill').classList.add('on');
  }else{
    _dashDateRange=range;
    btn.closest('.pills').querySelectorAll('.pill').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  }
  const custom=document.getElementById('dash-custom-dates');
  if(custom)custom.style.display=_dashDateRange==='custom'?'flex':'none';
  refreshDash();
};

window.setDashBrandTab=(brand,btn)=>{
  _dashBrand=brand;
  btn.closest('.tabs').querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  // Switch mosaic to brand logo or back to 3C logo
  const mosaic=document.getElementById('mosaic-dashboard');
  const br=brand!=='all'?STATE.brands[brand]:null;
  if(mosaic){
    const logoUrl=br?.logo||LOGO;
    mosaic.style.backgroundImage=`url('${logoUrl}')`;
  }
  // Apply brand tint on the mosaic wrapper (stronger brand presence)
  const heroEl=document.getElementById('dashboard-hero');
  const mosaicWrap=heroEl?.querySelector('.mosaic-wrapper');
  if(mosaicWrap){
    if(br)mosaicWrap.style.backgroundColor=`rgba(${br.rgb},0.28)`;
    else mosaicWrap.style.backgroundColor='';
  }
  // Update hero eyebrow and title for brand context
  if(heroEl){
    const ey=heroEl.querySelector('.hero-eyebrow');
    const ti=heroEl.querySelector('.hero-title');
    const su=heroEl.querySelector('.hero-sub');
    if(ey)ey.textContent=brand!=='all'?`${brand} — Intelligence`:'Dashboard — Operação 3C';
    if(ti)ti.textContent=brand!=='all'?brand:'Visão Geral 3C';
    if(su)su.textContent=brand!=='all'?`Resultado e performance — ${brand}`:'Resultado consolidado da operação';
    // Stronger brand accent gradient
    const accent=heroEl.querySelector('.hero-accent');
    if(accent&&br)accent.style.background=`linear-gradient(135deg,rgba(${br.rgb},0.32),rgba(${br.rgb},0.08) 55%,transparent 85%)`;
    else if(accent)accent.style.background='';
  }
  refreshDash();
};

function getDashDateRange(){
  const now=new Date();
  // Custom-encoded month: "ym:YYYY-MM" (used by the dataset pill)
  if(typeof _dashDateRange==='string' && _dashDateRange.startsWith('ym:')){
    const [y,m]=_dashDateRange.slice(3).split('-').map(Number);
    return {from:new Date(y,m-1,1),to:new Date(y,m,0)};
  }
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

// Resolve a brand filter against STATE.brands, tolerating casing / whitespace
// mismatches between the tab key and report.brand values. Falls back to the
// original value if no lookup match — keeps the previous exact-match behavior.
function _resolveBrandKey(brandFilter){
  if(!brandFilter)return null;
  const target=(brandFilter||'').toString().trim().toLowerCase();
  const keys=Object.keys(STATE.brands||{});
  const match=keys.find(k=>k.trim().toLowerCase()===target);
  return match||brandFilter;
}

function getFilteredReports(brandFilter){
  const {from,to}=getDashDateRange();
  let reps=STATE.reports;
  if(brandFilter){
    const target=(brandFilter||'').toString().trim().toLowerCase();
    reps=reps.filter(r=>(r.brand||'').toString().trim().toLowerCase()===target);
  }
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

// Compute tiered CPA commission for a given QFTD count.
// levels = [{cpa, baseline}, ...] sorted by baseline ascending.
// Returns total CPA value: each QFTD tier pays its own rate.
function _computeTieredCPA(qftds, levels) {
  if (!levels?.length || qftds <= 0) return 0;
  const sorted = [...levels].sort((a, b) => (a.baseline || 0) - (b.baseline || 0));
  let remaining = qftds, total = 0;
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    const nextBase = sorted[i + 1]?.baseline || Infinity;
    const tierCap = nextBase - (tier.baseline || 0);
    const inTier = Math.min(remaining, tierCap);
    total += inTier * (tier.cpa || 0);
    remaining -= inTier;
    if (remaining <= 0) break;
  }
  return total;
}

// Compute commission from a deal structure (affiliate deal or brand config).
// Handles both standard (flat CPA) and tiered (levels array).
function _computeDealComm(qftds, netRev, deal) {
  if (!deal) return 0;
  let cpaPart = 0;
  if (deal.levels?.length) {
    cpaPart = _computeTieredCPA(qftds, deal.levels);
  } else {
    cpaPart = (deal.cpa || 0) * qftds;
  }
  const rsPart = (deal.rs || 0) / 100 * (netRev || 0);
  return cpaPart + Math.max(0, rsPart);
}

// Compute commission + 3C profit from a set of reports.
// For EACH report, looks up:
//   1) brandComm = what the brand pays 3C (brand-level CPA/RS/tiers)
//   2) affComm   = what 3C pays the affiliate (affiliate deal CPA/RS/tiers)
//   3) profit    = brandComm - affComm (can be negative = 3C losing money)
function _estimateRevFromReports(reps){
  let comm=0,profit=0;
  reps.forEach(r=>{
    const brandKey = _resolveBrandKey(r.brand) || r.brand;
    const brand = STATE.brands?.[brandKey] || STATE.brands?.[r.brand];
    if(!brand) return;
    const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+(v||0),0):(r.qftd||0);
    const nr = r.netRev || 0;

    // What brand pays 3C
    const brandComm = _computeDealComm(q, nr, brand);

    // What 3C pays the affiliate (look up their specific deal)
    const aff = STATE.affiliates?.find(a => a.id === r.affiliateId);
    const affDeal = aff?.deals?.[brandKey] || aff?.deals?.[r.brand];
    const affComm = affDeal ? _computeDealComm(q, nr, affDeal) : 0;

    comm += affComm;
    profit += brandComm - affComm;
  });
  return {comm, profit};
}

window.refreshDash=()=>{
  const el=document.getElementById('dash-dynamic');if(!el)return;
  const brand=_dashBrand;
  const isAllTime=_dashDateRange==='all';
  const brands=brand==='all'?Object.keys(STATE.brands):[brand];

  // Calculate data — report-driven always, for consistency across views.
  // When the view is "all time + all brands" we also cross-check against
  // STATE.affiliates rollups to catch totals imported without daily breakdowns.
  let totFTD=0,totQFTD=0,totDep=0,totComm=0,totProfit=0,totRev=0;
  const agg={};brands.forEach(b=>{agg[b]={ftd:0,qftd:0,dep:0,netRev:0,affCount:new Set()};});

  // Normalized per-brand aggregation into agg map (case-insensitive)
  const brandKeyByLower={};Object.keys(STATE.brands||{}).forEach(k=>{brandKeyByLower[k.trim().toLowerCase()]=k;});
  const _aggBucket=(rbrand)=>agg[brandKeyByLower[(rbrand||'').toString().trim().toLowerCase()]];

  const scopedReps=getFilteredReports(brand==='all'?null:brand);
  scopedReps.forEach(r=>{
    const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+(v||0),0):(r.qftd||0);
    totFTD+=r.ftd||0;totQFTD+=q;totDep+=r.deposits||0;totRev+=r.netRev||0;
    const b=_aggBucket(r.brand);
    if(b){b.ftd+=r.ftd||0;b.qftd+=q;b.dep+=r.deposits||0;b.netRev+=r.netRev||0;b.affCount.add(r.affiliateId);}
  });
  const {comm:estComm,profit:estProfit}=_estimateRevFromReports(scopedReps);
  totComm=estComm;totProfit=estProfit;

  // For "all + all time", prefer the affiliate rollups if they're larger —
  // handles datasets imported with only totals (no per-day reports).
  if(isAllTime&&brand==='all'){
    let affFTD=0,affQFTD=0,affDep=0,affComm=0,affProfit=0,affRev=0;
    STATE.affiliates.forEach(a=>{
      affFTD+=a.ftds||0;affQFTD+=a.qftds||0;affDep+=a.deposits||0;
      affComm+=a.commission||0;affProfit+=a.profit||0;affRev+=a.netRev||0;
    });
    if(affFTD>totFTD)totFTD=affFTD;
    if(affQFTD>totQFTD)totQFTD=affQFTD;
    if(affDep>totDep)totDep=affDep;
    if(affRev>totRev)totRev=affRev;
    if(affComm>totComm)totComm=affComm;
    if(affProfit>totProfit)totProfit=affProfit;
  }

  // Brand-filtered fallback: when there are no matching reports for the
  // selected brand + period, derive from affiliate-level data for affiliates
  // that have this brand in their deals. Best-effort — we don't know the
  // per-brand breakdown at the affiliate level, so we prorate by deal count.
  if(brand!=='all'&&scopedReps.length===0&&isAllTime){
    const brandKey=_resolveBrandKey(brand);
    const affsWithBrand=STATE.affiliates.filter(a=>a.deals&&(a.deals[brandKey]||a.deals[brand]));
    console.log('[dashboard] Brand filter fallback —',brand,': 0 reports, using',affsWithBrand.length,'affiliate(s) with this brand');
    affsWithBrand.forEach(a=>{
      const brandCount=Object.keys(a.deals||{}).length||1;
      const ratio=1/brandCount;
      totFTD+=(a.ftds||0)*ratio;
      totQFTD+=(a.qftds||0)*ratio;
      totDep+=(a.deposits||0)*ratio;
      totRev+=(a.netRev||0)*ratio;
      totComm+=(a.commission||0)*ratio;
      totProfit+=(a.profit||0)*ratio;
    });
    totFTD=Math.round(totFTD);totQFTD=Math.round(totQFTD);
    totDep=Math.round(totDep*100)/100;totRev=Math.round(totRev*100)/100;
    totComm=Math.round(totComm*100)/100;totProfit=Math.round(totProfit*100)/100;
  }

  // Debug trace — shows exactly what the filter produced
  if(brand!=='all'){
    console.log('[dashboard] brand filter:',brand,'| reports matched:',scopedReps.length,
      '| totals: FTD',totFTD,'QFTD',totQFTD,'Dep',totDep,'Rev',totRev);
    if(scopedReps.length===0&&STATE.reports?.length>0){
      const uniqueBrands=[...new Set(STATE.reports.map(r=>r.brand))].slice(0,10);
      console.warn('[dashboard] Nenhum report match.  Marcas encontradas em reports:',uniqueBrands,'| Filtro:',brand);
    }
  }

  const br=brand==='all'?null:STATE.brands[_resolveBrandKey(brand)];
  const conv=pct(totQFTD,totFTD);

  const {from,to}=getDashDateRange();
  const dateLbl=_dashDateRange==='all'?'Todo Período':_dashDateRange==='month'?'Este Mês':_dashDateRange==='last'?'Mês Passado':
    (from&&to?`${from.toLocaleDateString('pt-BR')} — ${to.toLocaleDateString('pt-BR')}`:'Personalizado');

  // Intel affiliates — use affiliate deals to find who operates each brand,
  // regardless of whether reports match the current period.
  const filteredReps=getFilteredReports(brand==='all'?null:brand);
  let intelAffs;
  if(brand==='all'){
    intelAffs=[...STATE.affiliates].filter(a=>(a.ftds||0)>0).sort((a,b)=>pct(b.qftds,b.ftds)-pct(a.qftds,a.ftds));
  }else{
    const brandKey=_resolveBrandKey(brand);
    intelAffs=STATE.affiliates.filter(a=>{
      if(!a.deals)return false;
      return a.deals[brand]||a.deals[brandKey]||Object.keys(a.deals).some(k=>k.toLowerCase()===brand.toLowerCase());
    });
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

  // Detect the common case of "no daily reports at all" — JSON was imported
  // with only aggregated affiliate totals, no per-day breakdown.
  const hasAnyReports = (STATE.reports || []).length > 0;
  const noData = (scopedReps.length === 0) && (totFTD + totQFTD + totDep + totRev + totComm === 0);
  const recentMonth = hasAnyReports ? _mostRecentDataMonth() : null;
  let emptyHint = '';
  // Subtle hint only when genuinely empty — no persistent banner.
  if (noData && _dashDateRange !== 'all') {
    const jumpBtn = recentMonth
      ? `<button class="dash-hint-btn" onclick="setDashDate('ym:${recentMonth}',this)"><i data-lucide="arrow-right" style="width:11px;height:11px"></i> Ir para ${new Date(recentMonth+'-02').toLocaleDateString('pt-BR',{month:'short',year:'numeric'})}</button>`
      : `<button class="dash-hint-btn" onclick="setDashDate('all',document.querySelector('.pill[onclick*=&quot;setDashDate(\\'all\\'&quot;]'))"><i data-lucide="arrow-right" style="width:11px;height:11px"></i> Todo período</button>`;
    emptyHint = `<div class="dash-hint">
      <i data-lucide="info" style="width:12px;height:12px"></i>
      <span>Nenhum dado neste período${brand!=='all'?` para <strong>${brand}</strong>`:''}.</span>
      ${jumpBtn}
    </div>`;
  }
  // When there are no reports at all, force the data source to the affiliate
  // rollups regardless of the selected period — otherwise KPIs show zero.
  if (!hasAnyReports) {
    const eligibleAffs = (brand === 'all')
      ? STATE.affiliates
      : STATE.affiliates.filter(a => a.deals && (a.deals[_resolveBrandKey(brand)] || a.deals[brand]));
    let affFTD=0,affQFTD=0,affDep=0,affComm=0,affProfit=0,affRev=0;
    eligibleAffs.forEach(a => {
      affFTD += a.ftds||0; affQFTD += a.qftds||0; affDep += a.deposits||0;
      affComm += a.commission||0; affProfit += a.profit||0; affRev += a.netRev||0;
    });
    // Only overwrite when those totals would give us MORE signal than the empty reports
    if (affFTD + affQFTD + affDep > 0) {
      totFTD = affFTD; totQFTD = affQFTD; totDep = affDep;
      totRev = affRev; totComm = affComm; totProfit = affProfit;
    }
  }

  el.innerHTML=`
    ${emptyHint}
    <!-- KPIs — sempre os mesmos 4 para qualquer visão (total, por marca, por período) -->
    <div class="kpi-row" style="margin-bottom:14px">
      <div class="kpi" style="--kpi-c:#ec4899" title="Qualified First Time Deposits no período">
        <div class="kpi-icon-row"><i data-lucide="users"></i><span class="kpi-lbl">QFTDs</span></div>
        <div class="kpi-val">${totQFTD}</div><div class="kpi-sub">${totFTD} FTDs · ${dateLbl}</div></div>
      <div class="kpi" style="--kpi-c:var(--blue)" title="Volume depositado pelos jogadores no período">
        <div class="kpi-icon-row"><i data-lucide="trending-down"></i><span class="kpi-lbl">Depósitos</span></div>
        <div class="kpi-val sm">${fc(totDep)}</div><div class="kpi-sub">Volume depositado</div></div>
      <div class="kpi" style="--kpi-c:var(--red)" title="Net Revenue = receita líquida gerada à marca (depósitos menos bônus e chargebacks)">
        <div class="kpi-icon-row"><i data-lucide="activity"></i><span class="kpi-lbl">Net Revenue</span></div>
        <div class="kpi-val sm">${fc(totRev)}</div><div class="kpi-sub">Receita líquida</div></div>
      <div class="kpi" style="--kpi-c:var(--green)" title="FTD → QFTD (taxa de qualificação dos jogadores trazidos)">
        <div class="kpi-icon-row"><i data-lucide="percent"></i><span class="kpi-lbl">Conversão</span></div>
        <div class="kpi-val">${conv}%</div><div class="kpi-sub">FTD → QFTD</div></div>
    </div>
    <!-- Financeiro secundário -->
    <div class="kpi-row" style="margin-bottom:22px;grid-template-columns:repeat(2,1fr)">
      <div class="kpi" style="--kpi-c:var(--amber)" title="Comissão total a pagar aos afiliados no período (CPA + Rev Share)">
        <div class="kpi-icon-row"><i data-lucide="credit-card"></i><span class="kpi-lbl">Comissão</span></div>
        <div class="kpi-val sm">${fc(totComm)}</div><div class="kpi-sub">CPA + Rev Share</div></div>
      <div class="kpi" style="--kpi-c:var(--purple)" title="Lucro 3C = Net Revenue recebido da marca menos comissão paga aos afiliados">
        <div class="kpi-icon-row"><i data-lucide="diamond"></i><span class="kpi-lbl">Lucro 3C</span></div>
        <div class="kpi-val sm">${fc(totProfit)}</div><div class="kpi-sub">Net Rev − Comissão</div></div>
    </div>
    ${_renderForecast(scopedReps, totRev, totQFTD)}

    <!-- INTELLIGENCE -->
    <div class="intel-wrap" style="margin-bottom:24px">
      <div class="intel-hdr">
        <div><div class="intel-eye">${intelTitle}</div>
          <div class="intel-title">${intelSub}</div>
          <div class="intel-sub">Taxa FTD→QFTD · Depósitos · Tendência</div></div>
      </div>
      <div class="intel-grid">
        ${intelAffs.map(a=>{
          let aFTD,aQFTD,aDep;
          // Try report data first; fall back to affiliate totals
          const affReps=filteredReps.filter(r=>r.affiliateId===a.id);
          if(affReps.length){
            aFTD=affReps.reduce((s,r)=>s+(r.ftd||0),0);
            aQFTD=affReps.reduce((s,r)=>s+(typeof r.qftd==='object'?Object.values(r.qftd).reduce((x,v)=>x+v,0):(r.qftd||0)),0);
            aDep=affReps.reduce((s,r)=>s+(r.deposits||0),0);
          }else{aFTD=a.ftds||0;aQFTD=a.qftds||0;aDep=a.deposits||0;}
          if(!aFTD&&!aQFTD&&!aDep)return '';
          const p2=pct(aQFTD,aFTD);const col=cvC(p2);
          const dealStr=brand==='all'?`${aFTD} FTDs · ${CONTRACT_TYPES[a.contractType]?.label||''}`:
            (()=>{const deal=a.deals?.[brand];return a.contractType==='tiered'?'CPA Escalonado':
              a.contractType==='rs'?`RS ${deal?.rs||STATE.brands[brand]?.rs||0}%`:`CPA R$${deal?.cpa||STATE.brands[brand]?.cpa||0}`;})()+(aFTD?` · ${aFTD} FTDs`:'');
          return `<div class="intel-card" onclick="openMod('affiliates');setTimeout(()=>openAffDetail('${a.id}'),500)">
            <div class="intel-name">${a.name}</div>
            <div class="intel-meta">${dealStr}</div>
            <div class="conv-row"><span class="conv-label">Conversão FTD→QFTD</span><span class="conv-pct">${p2}%</span></div>
            <div class="conv-bg"><div class="conv-fill" style="width:${Math.min(p2,100)}%;background:${col}"></div></div>
            <div class="conv-ft"><span>${aFTD} FTDs</span><span>${aQFTD} QFTDs</span></div>
            <div class="intel-sep"><div><div class="dep-lbl">Depósitos</div><div class="dep-val">${fc(aDep)}</div></div>
              <svg width="70" height="24" style="overflow:visible"><polyline points="0,20 14,15 28,17 42,9 56,11 70,7" fill="none" stroke="var(--text3)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.6"/><circle cx="70" cy="7" r="2.5" fill="var(--text2)"/></svg>
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
      <th>Depósitos</th>${isAllTime&&brand==='all'?'<th>Comissão</th><th>Lucro 3C</th>':''}
    </tr></thead><tbody>
      ${ranked.map((a,i)=>`<tr class="tr" onclick="openMod('affiliates');setTimeout(()=>openAffDetail('${a.id}'),500)">
        <td><span class="td-rank">${medal(i)}</span> <span class="td-name">${a.name}</span></td>
        <td><span class="ct-badge ${CONTRACT_TYPES[a.contractType]?.css||''}">${CONTRACT_TYPES[a.contractType]?.label||''}</span></td>
        <td class="td-num">${a.ftds}</td><td class="td-num">${a.qftds}</td>
        <td class="td-money">${fc(a.deposits)}</td>${isAllTime&&brand==='all'?`
        <td class="td-money">${fc(a.commission)}</td><td class="td-money">${fc(a.profit)}</td>`:''}
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
      <div class="fgp"><label>QFTDs ${l.name||l.key||'Nível'} (base ${l.baseline||0})</label>
        <input type="number" class="fi dd-qftd-tier" data-tier="${l.name||l.key||'l1'}" placeholder="0">
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

// ══════════════════════════════════════════════════════════
// HISTÓRICO DE LANÇAMENTOS (ver, editar, excluir)
// ══════════════════════════════════════════════════════════
window.openReportsHistory=()=>{
  renderReportsHistory();
};

function renderReportsHistory(){
  const sorted=[...STATE.reports].sort((a,b)=>new Date(b.date)-new Date(a.date));
  openModal('Histórico de Lançamentos',`
    <div style="margin-bottom:12px;font-size:11px;color:var(--text3)">${sorted.length} lançamento${sorted.length!==1?'s':''} registrado${sorted.length!==1?'s':''}</div>
    ${sorted.length?`<div class="tbl-wrap"><table><thead><tr>
      <th>Data</th><th>Marca</th><th>Afiliado</th><th>FTDs</th><th>QFTDs</th><th>Dep.</th><th>Net Rev</th><th></th>
    </tr></thead><tbody>
      ${sorted.map((r,i)=>{
        const aff=STATE.affiliates.find(a=>a.id===r.affiliateId);
        const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
        const origIdx=STATE.reports.indexOf(r);
        return `<tr class="tr">
          <td style="font-size:11px">${new Date(r.date).toLocaleDateString('pt-BR')}</td>
          <td><span class="td-brand">${r.brand}</span></td>
          <td style="font-size:11px">${aff?.name||'—'}</td>
          <td class="td-num">${r.ftd||0}</td>
          <td class="td-num">${q}</td>
          <td class="td-money">${fc(r.deposits||0)}</td>
          <td class="td-money">${fc(r.netRev||0)}</td>
          <td style="white-space:nowrap">
            <button onclick="editReport(${origIdx})" style="background:none;border:none;color:var(--theme);cursor:pointer;padding:2px 4px"><i data-lucide="edit-3" style="width:13px;height:13px"></i></button>
            <button onclick="deleteReport(${origIdx})" style="background:none;border:none;color:var(--red);cursor:pointer;padding:2px 4px"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
          </td>
        </tr>`;}).join('')}
    </tbody></table></div>`:'<div style="text-align:center;padding:30px;color:var(--text3)">Nenhum lançamento registrado.</div>'}`,
  `<button class="btn btn-ghost" onclick="closeModal()">Fechar</button>
   <button class="btn btn-theme" onclick="closeModal();openDailyDataModal()"><i data-lucide="plus"></i> Novo Lançamento</button>`);
  lucide.createIcons();
}

window.editReport=(idx)=>{
  const r=STATE.reports[idx];if(!r)return;
  const aff=STATE.affiliates.find(a=>a.id===r.affiliateId);
  const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);
  openModal(`Editar Lançamento — ${aff?.name||''}`,`<div class="fg">
    <div style="font-size:10px;color:var(--text3);margin-bottom:8px">${r.brand} · ${new Date(r.date).toLocaleDateString('pt-BR')}</div>
    <div class="fgp"><label>Data</label><input type="date" class="fi" id="er-date" value="${r.date}"></div>
    <div class="fgp"><label>FTDs</label><input type="number" class="fi" id="er-ftd" value="${r.ftd||0}"></div>
    <div class="fgp"><label>QFTDs</label><input type="number" class="fi" id="er-qftd" value="${q}"></div>
    <div class="fgp"><label>Depósitos (R$)</label><input type="number" step="0.01" class="fi" id="er-dep" value="${r.deposits||0}"></div>
    <div class="fgp"><label>Net Revenue (R$)</label><input type="number" step="0.01" class="fi" id="er-rev" value="${r.netRev||0}"></div>
  </div>`,`<button class="btn btn-ghost" onclick="closeModal();openReportsHistory()">Cancelar</button>
    <button class="btn btn-theme" onclick="saveEditReport(${idx})"><i data-lucide="save"></i> Salvar</button>`);
};

window.saveEditReport=(idx)=>{
  const r=STATE.reports[idx];if(!r)return;
  const aff=STATE.affiliates.find(a=>a.id===r.affiliateId);
  const oldQ=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);

  // Reverse old values from affiliate totals
  if(aff){aff.ftds-=r.ftd||0;aff.qftds-=oldQ;aff.deposits-=r.deposits||0;}

  // Apply new values
  r.date=document.getElementById('er-date')?.value||r.date;
  r.ftd=parseInt(document.getElementById('er-ftd')?.value)||0;
  r.qftd=parseInt(document.getElementById('er-qftd')?.value)||0;
  r.deposits=parseFloat(document.getElementById('er-dep')?.value)||0;
  r.netRev=parseFloat(document.getElementById('er-rev')?.value)||0;

  // Re-add to affiliate totals
  if(aff){aff.ftds+=r.ftd;aff.qftds+=r.qftd;aff.deposits+=r.deposits;}

  logAction('Lançamento editado',`${r.brand} · ${aff?.name||''} · ${r.date}`);
  saveToLocal();closeModal();toast('Lançamento atualizado!');
  openReportsHistory();
  if(document.getElementById('mod-dashboard').classList.contains('active'))bDash(document.getElementById('mod-dashboard'));
};

window.deleteReport=(idx)=>{
  const r=STATE.reports[idx];if(!r)return;
  const aff=STATE.affiliates.find(a=>a.id===r.affiliateId);
  const q=typeof r.qftd==='object'?Object.values(r.qftd).reduce((s,v)=>s+v,0):(r.qftd||0);

  // Reverse values from affiliate totals
  if(aff){aff.ftds-=r.ftd||0;aff.qftds-=q;aff.deposits-=r.deposits||0;}

  logAction('Lançamento excluído',`${r.brand} · ${aff?.name||''} · ${r.date}`);
  STATE.reports.splice(idx,1);
  saveToLocal();closeModal();toast('Lançamento excluído');
  openReportsHistory();
  if(document.getElementById('mod-dashboard').classList.contains('active'))bDash(document.getElementById('mod-dashboard'));
};

// ══════════════════════════════════════════════════════════
// FORECAST — Monthly projection (Lab beta feature)
// ══════════════════════════════════════════════════════════
function _renderForecast(scopedReps, currentRev, currentQFTD) {
  if (typeof isBetaEnabled !== 'function' || !isBetaEnabled('forecast')) return '';
  if (_dashDateRange !== 'month' && _dashDateRange !== 'all') return '';
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthReps = (STATE.reports || []).filter(r => (r.date || '').startsWith(monthKey));
  if (!monthReps.length) return '';
  const dates = [...new Set(monthReps.map(r => r.date))].sort();
  const daysWithData = dates.length;
  if (daysWithData < 2) return '';
  const totalDays = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysPassed = now.getDate();
  const daysLeft = totalDays - daysPassed;
  let mRev = 0, mQFTD = 0, mFTD = 0, mDep = 0;
  monthReps.forEach(r => {
    mRev += r.netRev || 0;
    mQFTD += typeof r.qftd === 'number' ? r.qftd : 0;
    mFTD += r.ftd || 0;
    mDep += r.deposits || 0;
  });
  const dailyRev = mRev / daysWithData;
  const dailyQFTD = mQFTD / daysWithData;
  const projRev = mRev + dailyRev * daysLeft;
  const projQFTD = Math.round(mQFTD + dailyQFTD * daysLeft);
  const pctMonth = Math.round(daysPassed / totalDays * 100);
  const monthName = now.toLocaleDateString('pt-BR', { month: 'long' });
  const lastKey = now.getMonth() === 0 ? `${now.getFullYear()-1}-12` : `${now.getFullYear()}-${String(now.getMonth()).padStart(2,'0')}`;
  const lastReps = (STATE.reports || []).filter(r => (r.date || '').startsWith(lastKey));
  let lastRev = 0;
  lastReps.forEach(r => { lastRev += r.netRev || 0; });
  const vsLast = lastRev > 0 ? Math.round((projRev - lastRev) / lastRev * 100) : null;
  const vsColor = vsLast !== null ? (vsLast >= 0 ? 'var(--green)' : 'var(--red)') : '';
  const vsText = vsLast !== null ? `${vsLast >= 0 ? '+' : ''}${vsLast}% vs. mês anterior` : '';

  return `<div class="forecast-card" style="margin-bottom:22px">
    <div class="forecast-hdr">
      <div class="forecast-icon"><i data-lucide="trending-up"></i></div>
      <div>
        <div class="forecast-title">Forecast · ${monthName}</div>
        <div class="forecast-sub">Projeção baseada em ${daysWithData} dias de dados (${pctMonth}% do mês)</div>
      </div>
    </div>
    <div class="forecast-bar-wrap">
      <div class="forecast-bar" style="width:${pctMonth}%"></div>
      <span class="forecast-bar-label">${daysPassed}/${totalDays} dias</span>
    </div>
    <div class="forecast-metrics">
      <div class="forecast-metric">
        <div class="forecast-metric-lbl">Receita projetada</div>
        <div class="forecast-metric-val">${fc(projRev)}</div>
        ${vsText ? `<div class="forecast-metric-delta" style="color:${vsColor}">${vsText}</div>` : ''}
      </div>
      <div class="forecast-metric">
        <div class="forecast-metric-lbl">QFTDs projetados</div>
        <div class="forecast-metric-val">${projQFTD}</div>
        <div class="forecast-metric-delta" style="color:var(--text3)">Atual: ${mQFTD}</div>
      </div>
      <div class="forecast-metric">
        <div class="forecast-metric-lbl">Média diária</div>
        <div class="forecast-metric-val">${fc(dailyRev)}</div>
        <div class="forecast-metric-delta" style="color:var(--text3)">${Math.round(dailyQFTD)} QFTDs/dia</div>
      </div>
    </div>
  </div>`;
}
