// ══════════════════════════════════════════════════════════
// PAYMENT WATCHDOG — Automated overdue/late payment checker
// ══════════════════════════════════════════════════════════
// Runs on login. Uses computePaymentStatus() to detect:
//   - VENCIDO: past the explicit dueDate
//   - ATRASADO: past company standard deadline (NF received + N business days)
//   - DUE SOON: dueDate within next 3 days
//
// Generates notifications with proper routing + sends summary
// email to finance team via EmailJS (when configured).
//
// AI agents reading from Firestore can replicate this same logic
// using computePaymentStatus / getPaymentDeadlineInfo helpers.
// ══════════════════════════════════════════════════════════

function runPaymentWatchdog(){
  const now=new Date();
  const today=now.toISOString().split('T')[0];
  const overdue=[];   // vencido — past dueDate
  const late=[];      // atrasado — past company deadline
  const dueSoon=[];   // dueDate within 3 days

  STATE.payments.forEach(p=>{
    // Terminal states are skipped
    if(p.status==='pago'||p.status==='recusado')return;

    const cs=(typeof computePaymentStatus==='function')?computePaymentStatus(p):p.status;
    const hasReceipt=!!(p.nfName||p.nfLink);

    if(cs==='vencido'){
      const due=p.dueDate?new Date(p.dueDate):null;
      const daysLate=due?Math.abs(Math.ceil((due-now)/86400000)):0;
      overdue.push({...p,daysLate,hasReceipt});
      return;
    }
    if(cs==='atrasado'){
      const std=STATE.deadlines?.standardPaymentDays||5;
      const deadline=p.nfReceivedDate?addBusinessDays(new Date(p.nfReceivedDate),std):null;
      const daysLate=deadline?Math.abs(Math.ceil((deadline-now)/86400000)):0;
      late.push({...p,daysLate,hasReceipt});
      return;
    }
    // Due soon (still within term, but close)
    if(p.dueDate){
      const due=new Date(p.dueDate);
      const daysLeft=Math.ceil((due-now)/86400000);
      if(daysLeft>=0&&daysLeft<=3){
        dueSoon.push({...p,daysLeft,hasReceipt});
      }
    }
  });

  if(!overdue.length&&!late.length&&!dueSoon.length)return;

  const newAlerts=[];
  const dateStamp=now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  const todayBR=today.split('-').reverse().join('/');
  const isDuplicate=(id)=>STATE.notifications?.some(n=>n.id===id&&n.time?.includes(todayBR));

  // VENCIDOS — alta prioridade (vermelho)
  overdue.forEach(p=>{
    const alertId='wd_v_'+p.id;
    if(isDuplicate(alertId))return;
    const msg=`VENCIDO: ${p.affiliate} — ${p.brand} (${fc(p.amount)}) há ${p.daysLate} dia(s)${!p.hasReceipt?' · SEM NF':''}`;
    newAlerts.push({id:alertId,type:'red',text:msg,time:dateStamp,read:false,
      action:{module:'payments',tab:'queue',filter:'vencido',entityId:p.id}});
  });

  // ATRASADOS — média prioridade (amber)
  late.forEach(p=>{
    const alertId='wd_a_'+p.id;
    if(isDuplicate(alertId))return;
    const msg=`EM ATRASO: ${p.affiliate} — ${p.brand} (${fc(p.amount)}) prazo da empresa estourou há ${p.daysLate} dia(s)`;
    newAlerts.push({id:alertId,type:'amber',text:msg,time:dateStamp,read:false,
      action:{module:'payments',tab:'queue',filter:'atrasado',entityId:p.id}});
  });

  // DUE SOON — info (azul)
  dueSoon.forEach(p=>{
    const alertId='wd_s_'+p.id;
    if(isDuplicate(alertId))return;
    const daysTxt=p.daysLeft===0?'HOJE':p.daysLeft===1?'AMANHÃ':`em ${p.daysLeft} dias`;
    const msg=`Vence ${daysTxt}: ${p.affiliate} — ${p.brand} (${fc(p.amount)})${!p.hasReceipt?' · SEM NF':''}`;
    newAlerts.push({id:alertId,type:'blue',text:msg,time:dateStamp,read:false,
      action:{module:'payments',tab:'queue',filter:'pendente',entityId:p.id}});
  });

  if(newAlerts.length){
    if(!STATE.notifications)STATE.notifications=[];
    STATE.notifications.unshift(...newAlerts);
    updateNotifBadge();
    saveToLocal();
  }
  // Alerts go silently to the notification center (no toast)

  // Email summary (vencidos + atrasados — aggregated, once per day)
  const criticalList=[...overdue,...late];
  if(criticalList.length&&STATE.emailjs?.publicKey&&STATE.emailjs?.serviceId&&STATE.emailjs?.financeEmail){
    sendWatchdogEmail(overdue,late);
  }

  if(overdue.length||late.length||dueSoon.length){
    logAction('Watchdog executado',`${overdue.length} vencido(s), ${late.length} em atraso, ${dueSoon.length} próximo(s)`);
  }
}

function sendWatchdogEmail(overdue,late){
  if(typeof emailjs==='undefined')return;
  const cfg=STATE.emailjs;

  // Avoid spam — once per day
  const today=new Date().toISOString().split('T')[0];
  if(STATE._watchdogLastEmail===today)return;

  const totalOverdue=overdue.reduce((s,p)=>s+p.amount,0);
  const totalLate=late.reduce((s,p)=>s+p.amount,0);
  const totalAmount=totalOverdue+totalLate;

  const overdueLines=overdue.length?'\n— VENCIDOS (passou da data limite) —\n'+overdue.map(p=>
    `• ${p.affiliate} — ${p.brand}: ${fc(p.amount)} (vencido há ${p.daysLate} dia${p.daysLate>1?'s':''})${!p.hasReceipt?' [SEM NF]':''}`
  ).join('\n'):'';

  const lateLines=late.length?'\n\n— EM ATRASO (passou do prazo da empresa) —\n'+late.map(p=>
    `• ${p.affiliate} — ${p.brand}: ${fc(p.amount)} (atraso de ${p.daysLate} dia${p.daysLate>1?'s':''} úteis)`
  ).join('\n'):'';

  const templateId=STATE.emailjs.templateIdWatchdog||STATE.emailjs.templateId;
  if(!templateId)return;

  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId,templateId,{
    to_email:cfg.financeEmail,
    subject:`3COS — ALERTA: ${overdue.length} vencido(s) + ${late.length} em atraso`,
    affiliate_name:`Watchdog Financeiro — ${overdue.length+late.length} pagamento(s)`,
    brand:[...new Set([...overdue,...late].map(p=>p.brand))].join(', '),
    month_ref:new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
    commission:fc(totalAmount),
    ftds:'-',qftds:'-',deposits:'-',net_rev:'-',profit:'-',
    contract_type:'Watchdog',
    analyst:'Watchdog 3COS (automático)',
    date:new Date().toLocaleDateString('pt-BR'),
    message:`ALERTA AUTOMÁTICO — STATUS DOS PAGAMENTOS\n\nTotal crítico: ${fc(totalAmount)}\n• Vencidos: ${overdue.length} (${fc(totalOverdue)})\n• Em atraso: ${late.length} (${fc(totalLate)})\n${overdueLines}${lateLines}\n\nAcesse o 3COS > Financeiro > Pagamentos para resolver.`
  }).then(()=>{
    STATE._watchdogLastEmail=today;
    saveToLocal();
    logAction('Watchdog email enviado',`${overdue.length} vencido(s), ${late.length} em atraso`);
  },(err)=>{
    console.warn('Watchdog email failed:',err);
  });
}
