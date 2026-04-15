-- ════════════════════════════════════════════════════════════
-- 3C OS — Supabase Schema (PostgreSQL)
-- ════════════════════════════════════════════════════════════
-- Run this in the Supabase SQL Editor on a fresh project.
-- Order matters — tables with FKs come after their referents.
-- ════════════════════════════════════════════════════════════

-- Extensions
create extension if not exists "uuid-ossp";

-- ════════════════════════════════════════════════════════════
-- USERS (extends auth.users)
-- ════════════════════════════════════════════════════════════
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role text not null check (role in ('admin','financeiro','operacao','viewer')) default 'operacao',
  status text not null check (status in ('ativo','bloqueado')) default 'ativo',
  modules text[] not null default array['dashboard','affiliates'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- BRANDS
-- ════════════════════════════════════════════════════════════
create table if not exists public.brands (
  name text primary key,
  color text not null,
  rgb text not null,
  type text not null default 'standard' check (type in ('standard','tiered')),
  cpa numeric default 0,
  rs numeric default 0,
  levels jsonb,
  logo text,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- AFFILIATES
-- ════════════════════════════════════════════════════════════
create table if not exists public.affiliates (
  id text primary key,
  name text not null,
  type text not null default 'afiliado',
  status text not null default 'ativo',
  contact_name text,
  contact_email text,
  contract_type text check (contract_type in ('cpa','tiered','pct_deposit','rs','deposit')),
  deals jsonb not null default '{}',
  ftds int not null default 0,
  qftds int not null default 0,
  deposits numeric not null default 0,
  net_rev numeric not null default 0,
  commission numeric not null default 0,
  profit numeric not null default 0,
  notes text,
  external_ids jsonb,
  social jsonb,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_affiliates_status on public.affiliates(status);
create index if not exists idx_affiliates_contract_type on public.affiliates(contract_type);

-- ════════════════════════════════════════════════════════════
-- CONTRACTS
-- ════════════════════════════════════════════════════════════
create table if not exists public.contracts (
  id text primary key,
  affiliate_id text not null references public.affiliates(id) on delete cascade,
  affiliate text not null,
  brand text not null references public.brands(name) on delete restrict,
  name text not null,
  type text not null,
  value numeric not null default 0,
  status text not null default 'ativo' check (status in ('ativo','encerrado','negociação')),
  start_date date,
  end_date date,
  description text,
  payment_status text not null default 'pendente',
  paid numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_contracts_affiliate on public.contracts(affiliate_id);
create index if not exists idx_contracts_brand on public.contracts(brand);

-- ════════════════════════════════════════════════════════════
-- PAYMENTS
-- ════════════════════════════════════════════════════════════
create table if not exists public.payments (
  id text primary key,
  contract_id text references public.contracts(id) on delete set null,
  affiliate_id text not null references public.affiliates(id) on delete cascade,
  affiliate text not null,
  brand text not null references public.brands(name) on delete restrict,
  contract text,
  amount numeric not null,
  nf_received_date date,
  due_date date,
  status text not null default 'pendente' check (status in ('pendente','aprovado','ajuste','pago','recusado')),
  type text,
  nf_name text,
  nf_link text,
  nf_storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_status on public.payments(status);
create index if not exists idx_payments_due_date on public.payments(due_date);
create index if not exists idx_payments_nf_received on public.payments(nf_received_date);
create index if not exists idx_payments_affiliate on public.payments(affiliate_id);

-- ════════════════════════════════════════════════════════════
-- CLOSINGS
-- ════════════════════════════════════════════════════════════
create table if not exists public.closings (
  id text primary key,
  affiliate_id text not null references public.affiliates(id) on delete cascade,
  affiliate_name text not null,
  brand text not null references public.brands(name) on delete restrict,
  month_label text not null,
  contract_type text,
  commission numeric not null,
  ftds int not null default 0,
  qftds int not null default 0,
  deposits numeric not null default 0,
  net_rev numeric not null default 0,
  profit numeric not null default 0,
  payment_status text not null default 'pendente',
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_closings_affiliate on public.closings(affiliate_id);
create index if not exists idx_closings_brand on public.closings(brand);
create index if not exists idx_closings_month on public.closings(month_label);

-- ════════════════════════════════════════════════════════════
-- TASKS
-- ════════════════════════════════════════════════════════════
create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  linked_module text,
  affiliate_id text references public.affiliates(id) on delete set null,
  contract_id text references public.contracts(id) on delete set null,
  priority text not null default 'média' check (priority in ('alta','média','baixa')),
  status text not null default 'pendente' check (status in ('pendente','em andamento','concluída')),
  assignee text,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_assignee on public.tasks(assignee);

-- ════════════════════════════════════════════════════════════
-- REPORTS (daily data input)
-- ════════════════════════════════════════════════════════════
create table if not exists public.reports (
  id bigserial primary key,
  brand text not null references public.brands(name) on delete restrict,
  affiliate_id text not null references public.affiliates(id) on delete cascade,
  date date not null,
  ftd int not null default 0,
  qftd int not null default 0,
  deposits numeric not null default 0,
  net_rev numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_reports_brand_date on public.reports(brand, date);
create index if not exists idx_reports_affiliate on public.reports(affiliate_id);

-- ════════════════════════════════════════════════════════════
-- AUDIT LOG
-- ════════════════════════════════════════════════════════════
create table if not exists public.audit_log (
  id bigserial primary key,
  action text not null,
  detail text,
  user_name text,
  user_id uuid references auth.users(id) on delete set null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_log_created on public.audit_log(created_at desc);

-- ════════════════════════════════════════════════════════════
-- NOTIFICATIONS
-- ════════════════════════════════════════════════════════════
create table if not exists public.notifications (
  id text primary key,
  type text not null,
  text text not null,
  action jsonb,
  read boolean not null default false,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, read);

-- ════════════════════════════════════════════════════════════
-- DEADLINES (singleton — one row only)
-- ════════════════════════════════════════════════════════════
create table if not exists public.deadlines (
  id int primary key default 1,
  brand_pay_days jsonb not null default '{}',
  affiliate_pay_days int not null default 10,
  nf_reminder_days int not null default 5,
  standard_payment_days int not null default 5,
  last_generated text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- ════════════════════════════════════════════════════════════
-- EMAILJS CONFIG (singleton)
-- ════════════════════════════════════════════════════════════
create table if not exists public.emailjs_config (
  id int primary key default 1,
  public_key text,
  service_id text,
  template_id text,
  finance_email text,
  updated_at timestamptz not null default now(),
  constraint single_row check (id = 1)
);

-- ════════════════════════════════════════════════════════════
-- AVAILABLE TAGS
-- ════════════════════════════════════════════════════════════
create table if not exists public.available_tags (
  id text primary key,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- PIPELINE
-- ════════════════════════════════════════════════════════════
create table if not exists public.pipeline_stages (
  id text primary key,
  name text not null,
  color text not null,
  position int not null default 0
);

create table if not exists public.pipeline_cards (
  id text primary key,
  affiliate_id text not null references public.affiliates(id) on delete cascade,
  affiliate_name text not null,
  stage_id text references public.pipeline_stages(id) on delete set null,
  value numeric default 0,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pipeline_cards_stage on public.pipeline_cards(stage_id);

-- ════════════════════════════════════════════════════════════
-- USER SETTINGS (per-user preferences)
-- ════════════════════════════════════════════════════════════
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  beta_mode boolean not null default false,
  theme text not null default 'dark',
  updated_at timestamptz not null default now()
);

-- ════════════════════════════════════════════════════════════
-- REMINDERS (custom user reminders for the calendar)
-- ════════════════════════════════════════════════════════════
create table if not exists public.reminders (
  id text primary key,
  title text not null,
  note text,
  date date not null,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists idx_reminders_date on public.reminders(date);

-- ════════════════════════════════════════════════════════════
-- updated_at TRIGGERS
-- ════════════════════════════════════════════════════════════
create or replace function public.tg_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','affiliates','payments','tasks','user_settings','deadlines','emailjs_config'
  ])
  loop
    execute format('drop trigger if exists tg_%I_updated_at on public.%I', t, t);
    execute format('create trigger tg_%I_updated_at before update on public.%I for each row execute function public.tg_set_updated_at()', t, t);
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.affiliates enable row level security;
alter table public.contracts enable row level security;
alter table public.payments enable row level security;
alter table public.closings enable row level security;
alter table public.tasks enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.notifications enable row level security;
alter table public.deadlines enable row level security;
alter table public.emailjs_config enable row level security;
alter table public.available_tags enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.pipeline_cards enable row level security;
alter table public.user_settings enable row level security;
alter table public.reminders enable row level security;

-- Helper function: is user admin?
create or replace function public.is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
$$;

-- Helper function: get user role
create or replace function public.user_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ──────────────────────────────────────────────────────────
-- POLICIES — for V1, allow any authenticated user to do
-- everything. Tighten later based on role × module mapping.
-- ──────────────────────────────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','brands','affiliates','contracts','payments','closings',
    'tasks','reports','audit_log','notifications','deadlines','emailjs_config',
    'available_tags','pipeline_stages','pipeline_cards','user_settings','reminders'
  ])
  loop
    execute format('drop policy if exists "auth_all" on public.%I', t);
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ════════════════════════════════════════════════════════════
-- AUTH TRIGGER — auto-create profile on signup
-- ════════════════════════════════════════════════════════════
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'operacao'
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ════════════════════════════════════════════════════════════
-- REALTIME — enable for all relevant tables
-- ════════════════════════════════════════════════════════════
do $$
declare t text;
begin
  for t in select unnest(array[
    'affiliates','contracts','payments','closings','tasks','reports',
    'notifications','audit_log','pipeline_cards','reminders'
  ])
  loop
    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
exception when others then null; -- ignore if already added
end $$;
