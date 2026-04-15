function bAudit(el){
  el.innerHTML=modHdr('Auditoria — Log de Atividades')+`<div class="mod-body">
    ${heroHTML('audit','Segurança','Log de Auditoria','Registro imutável de ações do sistema')}
    <div class="mod-main">
      <div class="sec-hdr"><div class="sec-lbl">Últimas ações no sistema</div>
        <button class="btn btn-outline" onclick="exportCSV('audit')"><i data-lucide="download"></i>Exportar CSV</button>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--glass-border);border-radius:16px;padding:12px 24px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px)">
        ${STATE.auditLog.length?STATE.auditLog.map(a=>`
          <div class="audit-item">
            <div class="audit-icon"><i data-lucide="shield-check"></i></div>
            <div class="audit-info">
              <div class="audit-action">${a.action||''}</div>
              <div class="audit-detail">${a.detail||''}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;font-weight:600;color:var(--text)">${a.user||'Sistema'}</div>
              <div class="audit-time">${a.time||''}</div>
            </div>
          </div>`).join(''):'<div class="empty"><p>Nenhum log registrado.</p></div>'}
      </div>
    </div></div>`;
  lucide.createIcons();
}

