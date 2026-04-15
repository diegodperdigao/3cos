-- ════════════════════════════════════════════════════════════
-- 3C OS — Seed Data (initial state)
-- ════════════════════════════════════════════════════════════
-- Run AFTER schema.sql in the Supabase SQL Editor.
-- This populates the same default state that DEFAULT_STATE
-- has in js/app.js, so the app behaves identically after
-- migration.
-- ════════════════════════════════════════════════════════════

-- ── BRANDS ──────────────────────────────────────────────────
insert into public.brands (name, color, rgb, type, cpa, rs, levels, logo) values
('Vupi', '#6901c7', '105,1,199', 'standard', 50, 20, null, 'https://iili.io/Bq3Hck7.png'),
('Novibet', '#3a5fd9', '58,95,217', 'tiered', 0, 30,
  '[{"key":"l1","name":"L1","cpa":180,"baseline":30},{"key":"l2","name":"L2","cpa":100,"baseline":300},{"key":"l3","name":"L3","cpa":100,"baseline":1200}]'::jsonb,
  'https://i.ibb.co/1fCKT0kq/logonovibet.png'),
('Superbet', '#e80104', '232,1,4', 'standard', 60, 25, null, 'https://i.ibb.co/qL0KMg8k/logosuperbet.webp')
on conflict (name) do nothing;

-- ── AFFILIATES ──────────────────────────────────────────────
insert into public.affiliates
  (id, name, type, status, contact_name, contact_email, contract_type, deals,
   ftds, qftds, deposits, net_rev, commission, profit, notes)
values
('a1', 'Agência FMG', 'afiliado', 'ativo', 'Felipe Mendes', 'fmg@3c.gg', 'tiered',
  '{"Vupi":{"cpa":50,"rs":20},"Novibet":{"levels":[{"key":"l1","cpa":180,"baseline":30},{"key":"l2","cpa":100,"baseline":300}],"rs":30}}'::jsonb,
  240, 189, 29701, 288, 20847, 3794, 'Top afiliado. Foco em Free Fire.'),
('a2', 'Yuri Medeiros', 'afiliado', 'ativo', 'Yuri Medeiros', 'yuri@3c.gg', 'cpa',
  '{"Vupi":{"cpa":50,"rs":20},"Novibet":{"levels":[{"key":"l1","cpa":180,"baseline":30}],"rs":30}}'::jsonb,
  68, 25, 5688, 1300, 2612, 1218, 'Crescimento acelerado em março.'),
('a3', 'Augusto Clauss', 'afiliado', 'ativo', 'Augusto Clauss', 'clauss@3c.gg', 'deposit',
  '{"Vupi":{"cpa":0,"rs":0,"depositTarget":50000}}'::jsonb,
  58, 7, 7289, 3961, 1192, 1796, 'Meta depósitos R$50k/mês.'),
('a4', 'Roberio Santos', 'afiliado', 'ativo', 'Roberio Santos', 'rob@3c.gg', 'cpa',
  '{"Vupi":{"cpa":50,"rs":20},"Novibet":{"levels":[{"key":"l1","cpa":180,"baseline":30}],"rs":30}}'::jsonb,
  24, 13, 12689, 2500, 1580, 915, ''),
('a5', 'Igor Lima', 'afiliado', 'ativo', 'Igor Lima', 'igor@3c.gg', 'rs',
  '{"Superbet":{"cpa":0,"rs":30}}'::jsonb,
  9, 12, 5632, -1578, 1124, 483, 'Revenue Share puro Superbet.'),
('a6', 'WeeDu', 'afiliado', 'ativo', 'WeeDu', 'weedu@3c.gg', 'cpa',
  '{"Vupi":{"cpa":50,"rs":20}}'::jsonb,
  7, 6, 11956, 1817, 1445, 270, '')
on conflict (id) do nothing;

-- ── CONTRACTS ──────────────────────────────────────────────
insert into public.contracts
  (id, affiliate_id, affiliate, brand, name, type, value, status, start_date, end_date, description, payment_status, paid)
values
('ct1','a1','Agência FMG','Vupi','Deal Vupi — FMG Q1 2026','tiered',180000,'ativo','2026-01-01','2026-03-31','CPA escalonado L1/L2/L3.','parcial',90000),
('ct2','a2','Yuri Medeiros','Vupi','Deal Vupi — Yuri Q1','cpa',120000,'ativo','2026-01-01','2026-03-31','CPA R$50 + RS 20%.','pendente',0),
('ct3','a3','Augusto Clauss','Vupi','Meta Dep Vupi — Clauss','deposit',95000,'ativo','2026-02-01','2026-04-30','Meta R$50k/mês.','pendente',0),
('ct4','a5','Igor Lima','Superbet','RS Superbet — Igor','rs',60000,'ativo','2026-01-01','2026-06-30','RS puro 30% Superbet.','aprovado',0),
('ct5','a1','Agência FMG','Novibet','Deal Novibet — FMG','tiered',320000,'ativo','2026-01-15','2026-03-31','CPA escalonado Novibet.','parcial',160000)
on conflict (id) do nothing;

-- ── PAYMENTS ───────────────────────────────────────────────
insert into public.payments
  (id, contract_id, affiliate_id, affiliate, brand, contract, amount, nf_received_date, due_date, status, type, nf_name)
values
('py1','ct1','a1','Agência FMG','Vupi','Deal Vupi — FMG Q1 2026',90000,'2026-02-05','2026-02-15','pago','Parcela 1/2','NF_3001.pdf'),
('py2','ct1','a1','Agência FMG','Vupi','Deal Vupi — FMG Q1 2026',90000,'2026-03-25','2026-04-01','pendente','Parcela 2/2',''),
('py3','ct5','a1','Agência FMG','Novibet','Deal Novibet — FMG',60000,'2026-03-20','2026-03-31','aprovado','Parcela 1/2','NF_3045.pdf'),
('py4','ct5','a1','Agência FMG','Novibet','Deal Novibet — FMG',100000,null,'2026-05-31','pendente','Parcela 2/2',''),
('py5','ct4','a5','Igor Lima','Superbet','RS Superbet — Igor',30000,'2026-03-19','2026-03-29','aprovado','Jan-Fev','NF_3067.pdf')
on conflict (id) do nothing;

-- ── REPORTS (daily data) ───────────────────────────────────
insert into public.reports (brand, affiliate_id, date, ftd, qftd, deposits, net_rev) values
('Vupi','a1','2026-03-01',18,14,2200,22),
('Vupi','a1','2026-03-15',22,17,2800,35),
('Vupi','a1','2026-03-25',15,12,1900,18),
('Vupi','a2','2026-03-10',8,3,680,120),
('Vupi','a2','2026-03-20',12,5,920,180),
('Vupi','a3','2026-03-05',12,1,1800,400),
('Vupi','a3','2026-03-18',15,2,2100,510),
('Vupi','a4','2026-03-12',10,6,2800,280),
('Vupi','a6','2026-03-08',7,6,4000,380),
('Novibet','a1','2026-03-01',55,42,8800,55),
('Novibet','a1','2026-03-15',62,50,9200,68),
('Novibet','a1','2026-03-25',48,38,7800,42),
('Novibet','a4','2026-03-10',14,7,9200,220),
('Superbet','a5','2026-03-01',4,5,2400,-450),
('Superbet','a5','2026-03-15',5,7,3200,-1128);

-- ── TASKS ──────────────────────────────────────────────────
insert into public.tasks
  (id, title, description, linked_module, affiliate_id, contract_id, priority, status, assignee, due_date)
values
('tk1','Enviar fechamento FMG — Parcela 2/2 Vupi','Checar se o afiliado já enviou os dados bancários novos pelo WhatsApp.','payments','a1','ct1','alta','pendente','Diego Perdigão','2026-04-01'),
('tk2','Verificar NF Clauss — Meta depósitos fevereiro','Cobrar a emissão da NF contra a base nova.','payments','a3','ct3','alta','em andamento','Financeiro 3C','2026-03-31'),
('tk3','Renovar deal Yuri — Q2 2026','Discutir com ele um possível aumento de CPA condicionado a atingimento de metas.','affiliates','a2','ct2','média','pendente','Diego Perdigão','2026-04-10'),
('tk4','Ajustar RS Igor — renegociar taxa',null,'affiliates','a5','ct4','média','pendente','Operações 3C','2026-04-15'),
('tk5','Relatório conversão Novibet FMG — março','Subir relatório na pasta compartilhada do Drive.','dashboard','a1','ct5','baixa','concluída','Operações 3C','2026-04-05')
on conflict (id) do nothing;

-- ── PIPELINE ───────────────────────────────────────────────
insert into public.pipeline_stages (id, name, color, position) values
('s1','Lead','#94a3b8',1),
('s2','Negociação','#f59e0b',2),
('s3','Deal Fechado','#3b82f6',3),
('s4','Ativo','#10b981',4),
('s5','Inativo','#ef4444',5)
on conflict (id) do nothing;

insert into public.pipeline_cards (id, affiliate_id, affiliate_name, stage_id, value, note) values
('pk1','a1','Agência FMG','s4',25000,'Top performer, foco em Free Fire')
on conflict (id) do nothing;

-- ── DEADLINES (singleton) ──────────────────────────────────
insert into public.deadlines (id, brand_pay_days, affiliate_pay_days, nf_reminder_days, standard_payment_days)
values (1, '{"Vupi":15,"Novibet":20,"Superbet":25}'::jsonb, 10, 5, 5)
on conflict (id) do nothing;

-- ── EMAILJS CONFIG (singleton) ─────────────────────────────
insert into public.emailjs_config (id, public_key, service_id, template_id, finance_email)
values (1, 'gVUoExE8gJiqdy7ko', 'service_cpo2m7f', 'template_99j6q4e', 'diego@3c.gg')
on conflict (id) do nothing;

-- ── AVAILABLE TAGS ─────────────────────────────────────────
insert into public.available_tags (id, name, color) values
('tg1','VIP','#f59e0b'),
('tg2','Em Risco','#ef4444'),
('tg3','Novo','#3b82f6'),
('tg4','Top Performer','#10b981'),
('tg5','Escala','#a855f7')
on conflict (id) do nothing;
