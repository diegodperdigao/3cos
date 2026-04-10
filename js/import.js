// ══════════════════════════════════════════════════════════
// CSV/EXCEL BULK IMPORT SYSTEM
// ══════════════════════════════════════════════════════════

window.openImportModal=()=>{
  openModal('Importar Dados em Massa',`
    <div style="padding:12px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:var(--radius);margin-bottom:16px;font-size:11px;color:var(--text2);line-height:1.6">
      <strong style="color:var(--text)">Como funciona:</strong> Exporte o CSV da plataforma da casa parceira →
      Selecione a marca → Mapeie as colunas → Preview → Importe. O sistema usa o <strong>ID externo</strong>
      cadastrado em cada afiliado para fazer o match automático.
    </div>

    <div class="fg">
      <div class="fgp"><label>Marca Parceira *</label>
        <select class="fi" id="imp-brand">
          <option value="">Selecione a marca...</option>
          ${Object.keys(STATE.brands).map(b=>`<option value="${b}">${b}</option>`).join('')}
        </select>
      </div>

      <div class="fgp ff">
        <label>Arquivo CSV ou Excel *</label>
        <div id="imp-dropzone" style="border:2px dashed var(--gb2);border-radius:var(--radius);padding:30px 20px;text-align:center;cursor:pointer;transition:all 0.15s"
          onclick="document.getElementById('imp-file').click()"
          ondragover="event.preventDefault();this.style.borderColor='var(--theme)';this.style.background='var(--theme-dim)'"
          ondragleave="this.style.borderColor='var(--gb2)';this.style.background=''"
          ondrop="event.preventDefault();this.style.borderColor='var(--gb2)';this.style.background='';handleImportFile(event.dataTransfer.files[0])">
          <i data-lucide="upload" style="width:24px;height:24px;stroke:var(--text3);margin-bottom:8px;display:block;margin:0 auto 8px"></i>
          <div style="font-size:12px;font-weight:600;color:var(--text)">Arraste o arquivo aqui ou clique para selecionar</div>
          <div style="font-size:10px;color:var(--text3);margin-top:4px">CSV, TXT (separado por vírgula ou ponto-e-vírgula)</div>
          <div id="imp-filename" style="font-size:11px;color:var(--theme);font-weight:600;margin-top:8px;display:none"></div>
        </div>
        <input type="file" id="imp-file" accept=".csv,.txt,.tsv" style="display:none" onchange="handleImportFile(this.files[0])">
      </div>
    </div>

    <div id="imp-mapping" style="display:none;margin-top:16px"></div>
    <div id="imp-preview" style="display:none;margin-top:16px"></div>
  `,`<button class="btn btn-ghost" onclick="closeModal()">Cancelar</button>
    <button class="btn btn-theme" id="imp-btn-import" style="display:none" onclick="executeImport()"><i data-lucide="database"></i> Importar Dados</button>`);
  lucide.createIcons();
};

let _impData=null,_impHeaders=[],_impMapping={},_impBrand='';

window.handleImportFile=(file)=>{
  if(!file)return;
  const brand=document.getElementById('imp-brand')?.value;
  if(!brand)return toast('Selecione a marca primeiro','e');
  _impBrand=brand;

  document.getElementById('imp-filename').textContent=file.name;
  document.getElementById('imp-filename').style.display='block';

  const reader=new FileReader();
  reader.onload=(e)=>{
    const text=e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file,'UTF-8');
};

function parseCSV(text){
  // Detect separator
  const firstLine=text.split('\n')[0];
  const sep=firstLine.split(';').length>firstLine.split(',').length?';':',';

  const lines=text.split('\n').filter(l=>l.trim());
  if(lines.length<2)return toast('Arquivo vazio ou sem dados','e');

  _impHeaders=lines[0].split(sep).map(h=>h.trim().replace(/^"|"$/g,''));
  _impData=lines.slice(1).map(line=>{
    const vals=[];let current='',inQuote=false;
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='"'){inQuote=!inQuote;}
      else if(c===sep&&!inQuote){vals.push(current.trim());current='';}
      else{current+=c;}
    }
    vals.push(current.trim());
    return vals;
  }).filter(row=>row.some(v=>v));

  toast(`${_impData.length} linhas encontradas`,'i');
  renderMapping();
}

function renderMapping(){
  const el=document.getElementById('imp-mapping');if(!el)return;
  el.style.display='block';

  // Fields we need to map
  const fields=[
    {key:'externalId',label:'ID do Afiliado na Plataforma',required:true,hint:'Código que identifica o afiliado na casa'},
    {key:'date',label:'Data',required:true,hint:'Data de referência do dado'},
    {key:'ftd',label:'FTDs',required:false,hint:'First Time Deposits'},
    {key:'qftd',label:'QFTDs',required:false,hint:'Qualified FTDs'},
    {key:'deposits',label:'Depósitos (R$)',required:false,hint:'Volume de depósitos'},
    {key:'netRev',label:'Net Revenue (R$)',required:false,hint:'Receita líquida'},
    {key:'clicks',label:'Clicks',required:false,hint:'Cliques (opcional)'},
    {key:'regs',label:'Registros',required:false,hint:'Cadastros (opcional)'},
  ];

  // Auto-map: try to match headers to fields
  const autoMap={};
  const headerLower=_impHeaders.map(h=>h.toLowerCase());
  fields.forEach(f=>{
    const matches={
      externalId:['id','code','código','codigo','affiliate_id','affiliate','aff_id','sub_id','tracker','tag'],
      date:['date','data','dia','day','period','período'],
      ftd:['ftd','ftds','first_time_deposit','first_deposit','new_depositor'],
      qftd:['qftd','qftds','qualified','qualified_ftd'],
      deposits:['deposit','deposits','depósito','depósitos','depositos','amount','valor_deposito','total_deposits'],
      netRev:['net_revenue','netrev','net_rev','revenue','receita','net','ngr','ggr','net_gaming_revenue'],
      clicks:['clicks','click','cliques','clique'],
      regs:['registrations','regs','registros','sign_up','signups','cadastros'],
    };
    const candidates=matches[f.key]||[];
    const found=headerLower.findIndex(h=>candidates.some(c=>h.includes(c)));
    if(found>=0)autoMap[f.key]=found;
  });

  const headerOpts=_impHeaders.map((h,i)=>`<option value="${i}">${h}</option>`).join('');

  el.innerHTML=`
    <div style="font-size:11px;font-weight:700;color:var(--text);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px">Mapeamento de Colunas</div>
    <div style="font-size:10px;color:var(--text3);margin-bottom:12px">Associe cada campo do 3COS a uma coluna do seu CSV. Campos com * são obrigatórios.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px">
      ${fields.map(f=>`
        <div style="padding:10px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px">
          <label style="font-size:10px;font-weight:600;color:var(--text)">${f.label}${f.required?' *':''}</label>
          <div style="font-size:9px;color:var(--text3);margin-bottom:4px">${f.hint}</div>
          <select class="fi imp-col-map" data-field="${f.key}" style="padding:6px;font-size:11px">
            <option value="-1">— Ignorar —</option>
            ${headerOpts}
          </select>
        </div>`).join('')}
    </div>
    <button class="btn btn-outline" onclick="previewImport()" style="margin-top:12px"><i data-lucide="eye"></i> Preview</button>`;

  // Apply auto-mapping
  Object.entries(autoMap).forEach(([field,colIdx])=>{
    const sel=el.querySelector(`[data-field="${field}"]`);
    if(sel)sel.value=colIdx;
  });
  lucide.createIcons();
}

window.previewImport=()=>{
  // Read mapping
  _impMapping={};
  document.querySelectorAll('.imp-col-map').forEach(sel=>{
    const idx=parseInt(sel.value);if(idx>=0)_impMapping[sel.dataset.field]=idx;
  });

  if(_impMapping.externalId===undefined)return toast('Mapeie pelo menos o ID do Afiliado','e');
  if(_impMapping.date===undefined)return toast('Mapeie a coluna de Data','e');

  const brand=_impBrand;
  // Build lookup: externalId → affiliate
  const extLookup={};
  STATE.affiliates.forEach(a=>{
    const extId=a.externalIds?.[brand];
    if(extId)extLookup[extId.toLowerCase()]=a;
  });

  let matched=0,unmatched=0,dupes=0;
  const preview=_impData.slice(0,20).map(row=>{
    const extId=(row[_impMapping.externalId]||'').trim();
    const aff=extLookup[extId.toLowerCase()];
    const date=row[_impMapping.date]||'';
    if(aff)matched++;else unmatched++;

    // Check duplicate
    const isDupe=aff&&STATE.reports.some(r=>r.affiliateId===aff.id&&r.brand===brand&&r.date===normalizeDate(date));
    if(isDupe)dupes++;

    return {extId,aff,date,row,isDupe};
  });

  // Count full stats
  let totalMatched=0,totalUnmatched=0,totalDupes=0;
  _impData.forEach(row=>{
    const extId=(row[_impMapping.externalId]||'').trim();
    const aff=extLookup[extId.toLowerCase()];
    const date=row[_impMapping.date]||'';
    if(aff)totalMatched++;else totalUnmatched++;
    if(aff&&STATE.reports.some(r=>r.affiliateId===aff.id&&r.brand===brand&&r.date===normalizeDate(date)))totalDupes++;
  });

  const el=document.getElementById('imp-preview');
  el.style.display='block';
  el.innerHTML=`
    <div style="display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap">
      <div style="padding:10px 16px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:10px;text-align:center;flex:1;min-width:100px">
        <div style="font-family:var(--fd);font-size:20px;font-weight:800;color:var(--green)">${totalMatched}</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase">Encontrados</div>
      </div>
      <div style="padding:10px 16px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;text-align:center;flex:1;min-width:100px">
        <div style="font-family:var(--fd);font-size:20px;font-weight:800;color:var(--red)">${totalUnmatched}</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase">Sem Match</div>
      </div>
      <div style="padding:10px 16px;background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;text-align:center;flex:1;min-width:100px">
        <div style="font-family:var(--fd);font-size:20px;font-weight:800;color:var(--amber)">${totalDupes}</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase">Duplicados</div>
      </div>
      <div style="padding:10px 16px;background:var(--bg3);border:1px solid var(--gb);border-radius:10px;text-align:center;flex:1;min-width:100px">
        <div style="font-family:var(--fd);font-size:20px;font-weight:800;color:var(--text)">${_impData.length}</div>
        <div style="font-size:9px;color:var(--text3);text-transform:uppercase">Total Linhas</div>
      </div>
    </div>
    ${totalUnmatched>0?`<div style="padding:10px 14px;background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;margin-bottom:12px;font-size:11px;color:var(--red)">
      <strong>${totalUnmatched} linhas sem match</strong> — verifique se os IDs externos estão cadastrados no perfil de cada afiliado (aba Afiliados → Editar → IDs nas Plataformas).
    </div>`:''}
    <div style="font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;margin-bottom:8px">Preview (primeiras 20 linhas)</div>
    <div class="tbl-wrap"><table><thead><tr>
      <th>ID Externo</th><th>Afiliado</th><th>Data</th>
      ${_impMapping.ftd!==undefined?'<th>FTDs</th>':''}
      ${_impMapping.qftd!==undefined?'<th>QFTDs</th>':''}
      ${_impMapping.deposits!==undefined?'<th>Dep.</th>':''}
      ${_impMapping.netRev!==undefined?'<th>Net Rev</th>':''}
      <th>Status</th>
    </tr></thead><tbody>
      ${preview.map(p=>`<tr class="tr">
        <td style="font-size:11px;font-family:monospace">${p.extId}</td>
        <td style="font-size:11px;font-weight:600;color:${p.aff?'var(--text)':'var(--red)'}">${p.aff?.name||'NÃO ENCONTRADO'}</td>
        <td style="font-size:11px">${p.date}</td>
        ${_impMapping.ftd!==undefined?`<td style="font-size:11px;text-align:center">${p.row[_impMapping.ftd]||0}</td>`:''}
        ${_impMapping.qftd!==undefined?`<td style="font-size:11px;text-align:center;color:var(--pink)">${p.row[_impMapping.qftd]||0}</td>`:''}
        ${_impMapping.deposits!==undefined?`<td style="font-size:11px">${p.row[_impMapping.deposits]||0}</td>`:''}
        ${_impMapping.netRev!==undefined?`<td style="font-size:11px">${p.row[_impMapping.netRev]||0}</td>`:''}
        <td>${p.isDupe?'<span style="font-size:9px;color:var(--amber);font-weight:700">DUPLICADO</span>':p.aff?'<span style="font-size:9px;color:var(--green);font-weight:700">OK</span>':'<span style="font-size:9px;color:var(--red);font-weight:700">SKIP</span>'}</td>
      </tr>`).join('')}
    </tbody></table></div>
    <div style="margin-top:10px">
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);cursor:pointer">
        <input type="checkbox" id="imp-skip-dupes" checked style="accent-color:var(--theme)">
        Pular duplicados (mesma data + afiliado + marca)
      </label>
    </div>`;

  document.getElementById('imp-btn-import').style.display='inline-flex';
  lucide.createIcons();
};

function normalizeDate(dateStr){
  if(!dateStr)return '';
  // Try various formats
  const s=dateStr.trim();
  // Already ISO: 2026-04-10
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  // BR: 10/04/2026
  const brMatch=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(brMatch)return `${brMatch[3]}-${brMatch[2].padStart(2,'0')}-${brMatch[1].padStart(2,'0')}`;
  // US: 04/10/2026 or 2026/04/10
  const usMatch=s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(usMatch)return `${usMatch[1]}-${usMatch[2].padStart(2,'0')}-${usMatch[3].padStart(2,'0')}`;
  return s;
}

function parseNum(val){
  if(!val)return 0;
  const s=String(val).trim().replace(/[^\d.,-]/g,'');
  // Handle BR format: 1.234,56 → 1234.56
  if(s.includes(',')&&s.includes('.')){
    if(s.lastIndexOf(',')>s.lastIndexOf('.'))return parseFloat(s.replace(/\./g,'').replace(',','.'))||0;
    return parseFloat(s.replace(/,/g,''))||0;
  }
  if(s.includes(','))return parseFloat(s.replace(',','.'))||0;
  return parseFloat(s)||0;
}

window.executeImport=()=>{
  const brand=_impBrand;
  const skipDupes=document.getElementById('imp-skip-dupes')?.checked!==false;

  // Build lookup
  const extLookup={};
  STATE.affiliates.forEach(a=>{
    const extId=a.externalIds?.[brand];
    if(extId)extLookup[extId.toLowerCase()]=a;
  });

  let imported=0,skipped=0,dupes=0;

  _impData.forEach(row=>{
    const extId=(row[_impMapping.externalId]||'').trim();
    const aff=extLookup[extId.toLowerCase()];
    if(!aff){skipped++;return;}

    const date=normalizeDate(row[_impMapping.date]||'');
    if(!date){skipped++;return;}

    // Check dupe
    if(skipDupes&&STATE.reports.some(r=>r.affiliateId===aff.id&&r.brand===brand&&r.date===date)){dupes++;return;}

    const ftd=_impMapping.ftd!==undefined?parseInt(row[_impMapping.ftd])||0:0;
    const qftd=_impMapping.qftd!==undefined?parseInt(row[_impMapping.qftd])||0:0;
    const deposits=_impMapping.deposits!==undefined?parseNum(row[_impMapping.deposits]):0;
    const netRev=_impMapping.netRev!==undefined?parseNum(row[_impMapping.netRev]):0;

    // Add report
    STATE.reports.push({brand,affiliateId:aff.id,date,ftd,qftd,deposits,netRev});

    // Update affiliate totals
    aff.ftds+=ftd;aff.qftds+=qftd;aff.deposits+=deposits;aff.netRev=(aff.netRev||0)+netRev;

    imported++;
  });

  logAction('Importação CSV',`${brand}: ${imported} importados, ${skipped} sem match, ${dupes} duplicados`);
  saveToLocal();closeModal();
  toast(`Importação concluída: ${imported} registros importados!`);

  if(document.getElementById('mod-dashboard')?.classList.contains('active'))bDash(document.getElementById('mod-dashboard'));
};
