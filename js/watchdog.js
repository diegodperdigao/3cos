// ══════════════════════════════════════════════════════════
// PAYMENT WATCHDOG — Automated overdue payment checker
// ══════════════════════════════════════════════════════════
// Runs on login. Checks all payments against deadlines.
// If overdue + no receipt → alert + email (when EmailJS configured).

function runPaymentWatchdog(){
  const now=new Date();
  const today=now.toISOString().split('T')[0];
  const overdue=[];
  const dueSoon=[];

  STATE.payments.forEach(p=>{
    // Only check pending or approved (not paid, not refused)
    if(p.status==='pago'||p.status==='recusado')return;
    if(!p.dueDate)return;

    const due=new Date(p.dueDate);
    const daysLeft=Math.ceil((due-now)/(1000*60*60*24));
    const hasReceipt=!!(p.nfName||p.nfLink);

    if(daysLeft<0){
      // OVERDUE
      overdue.push({...p,daysLeft,hasReceipt});
    }else if(daysLeft<=3){
      // DUE SOON (within 3 days)
      dueSoon.push({...p,daysLeft,hasReceipt});
    }
  });

  if(!overdue.length&&!dueSoon.length)return;

  // Generate notifications for overdue payments
  const newAlerts=[];
  overdue.forEach(p=>{
    const alertId='wd_'+p.id;
    // Avoid duplicate notifications (check if already notified today)
    if(STATE.notifications?.some(n=>n.id===alertId&&n.time?.includes(today.split('-').reverse().join('/'))))return;

    const msg=`VENCIDO: ${p.affiliate} — ${p.brand} (${fc(p.amount)}) venceu há ${Math.abs(p.daysLeft)} dia(s)${!p.hasReceipt?' · SEM COMPROVANTE':''}`;
    newAlerts.push({id:alertId,type:'red',text:msg,time:now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),read:false,
      action:{module:'payments',tab:'queue',filter:'pendente',entityId:p.id}});
  });

  dueSoon.forEach(p=>{
    const alertId='wd_soon_'+p.id;
    if(STATE.notifications?.some(n=>n.id===alertId&&n.time?.includes(today.split('-').reverse().join('/'))))return;

    const daysTxt=p.daysLeft===0?'HOJE':p.daysLeft===1?'AMANHÃ':`em ${p.daysLeft} dias`;
    const msg=`Vence ${daysTxt}: ${p.affiliate} — ${p.brand} (${fc(p.amount)})${!p.hasReceipt?' · SEM COMPROVANTE':''}`;
    newAlerts.push({id:alertId,type:'amber',text:msg,time:now.toLocaleDateString('pt-BR')+' '+now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),read:false,
      action:{module:'payments',tab:'queue',filter:'pendente',entityId:p.id}});
  });

  if(newAlerts.length){
    if(!STATE.notifications)STATE.notifications=[];
    STATE.notifications.unshift(...newAlerts);
    updateNotifBadge();
    saveToLocal();
  }
  // NOTE: alerts go silently to the notification center (bell badge).
  // No toasts — avoids interrupting the user on login/hub entry.

  // Send email if EmailJS configured (overdue only)
  const overdueNoReceipt=overdue.filter(p=>!p.hasReceipt);
  if(overdueNoReceipt.length&&STATE.emailjs?.publicKey&&STATE.emailjs?.serviceId&&STATE.emailjs?.financeEmail){
    sendWatchdogEmail(overdueNoReceipt);
  }

  // Log
  if(overdue.length||dueSoon.length){
    logAction('Watchdog executado',`${overdue.length} vencido(s), ${dueSoon.length} próximo(s)`);
  }
}

function sendWatchdogEmail(overdueList){
  if(typeof emailjs==='undefined')return;
  const cfg=STATE.emailjs;

  // Check if already sent today (avoid spam)
  const today=new Date().toISOString().split('T')[0];
  if(STATE._watchdogLastEmail===today)return;

  const totalAmount=overdueList.reduce((s,p)=>s+p.amount,0);
  const lines=overdueList.map(p=>
    `• ${p.affiliate} — ${p.brand}: ${fc(p.amount)} (vencido há ${Math.abs(p.daysLeft)} dia${Math.abs(p.daysLeft)>1?'s':''})${p.status==='pendente'?' [PENDENTE]':' [APROVADO]'}`
  ).join('\n');

  // Use closing template or a generic one
  const templateId=STATE.emailjs.templateIdWatchdog||STATE.emailjs.templateId;
  if(!templateId)return;

  emailjs.init(cfg.publicKey);
  emailjs.send(cfg.serviceId,templateId,{
    to_email:cfg.financeEmail,
    subject:`3COS — ALERTA: ${overdueList.length} pagamento(s) vencido(s) sem comprovante`,
    affiliate_name:`Alerta Automático — ${overdueList.length} pagamento(s)`,
    brand:overdueList.map(p=>p.brand).filter((v,i,a)=>a.indexOf(v)===i).join(', '),
    month_ref:new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'}),
    commission:fc(totalAmount),
    ftds:'-',qftds:'-',deposits:'-',net_rev:'-',profit:'-',
    contract_type:'Diversos',
    analyst:'Watchdog 3COS (automático)',
    date:new Date().toLocaleDateString('pt-BR'),
    message:`ALERTA AUTOMÁTICO — PAGAMENTOS VENCIDOS SEM COMPROVANTE\n\n${overdueList.length} pagamento(s) vencido(s) totalizando ${fc(totalAmount)}:\n\n${lines}\n\nPor favor, verificar e registrar os comprovantes no sistema 3COS.`
  }).then(()=>{
    STATE._watchdogLastEmail=today;
    saveToLocal();
    logAction('Watchdog email enviado',`${overdueList.length} pagamento(s) vencido(s)`);
  },(err)=>{
    console.warn('Watchdog email failed:',err);
  });
}
