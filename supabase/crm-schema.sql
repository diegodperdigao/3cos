-- ══════════════════════════════════════════════════════════
-- 3cos — CRM Schema (frente comercial)
-- ══════════════════════════════════════════════════════════
-- Schema isolado do public (que pertence ao 3C OS Pro atual).
-- Compartilha auth.users e public.profiles para login unificado.
--
-- Como o app CRM acessa:
--   const sb = supabase.createClient(URL, KEY, {
--     db: { schema: 'crm' }
--   })
--   await sb.from('contacts').select('*')  // → crm.contacts
--
-- Migrations aplicadas via Supabase MCP em 2026-10-01:
--   1. crm_schema_init
--   2. crm_rls_and_seed
-- ══════════════════════════════════════════════════════════

CREATE SCHEMA IF NOT EXISTS crm;

GRANT USAGE ON SCHEMA crm TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA crm GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;

-- ── CONTACTS (Wishlist + ativos) ────────────────────────
CREATE TABLE IF NOT EXISTS crm.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  company text,
  type text NOT NULL DEFAULT 'b2c' CHECK (type IN ('b2b', 'b2c', 'both')),
  status text NOT NULL DEFAULT 'wishlist' CHECK (status IN ('wishlist', 'in_pipeline', 'customer', 'churned')),
  source text CHECK (source IN ('inbound', 'outbound', 'referral', 'event', 'social', 'other')),
  temperature text NOT NULL DEFAULT 'cold' CHECK (temperature IN ('cold', 'warm', 'hot', 'ready')),
  notes text,
  avatar_url text,
  social_links jsonb DEFAULT '{}'::jsonb,
  owner uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contacts_status_idx ON crm.contacts(status);
CREATE INDEX IF NOT EXISTS contacts_type_idx ON crm.contacts(type);
CREATE INDEX IF NOT EXISTS contacts_owner_idx ON crm.contacts(owner);

-- ── PRODUCTS (portfolio da empresa — ex-"marcas") ──────
CREATE TABLE IF NOT EXISTS crm.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  baseline jsonb DEFAULT '{}'::jsonb,
  icp text,                                      -- ideal customer profile
  tags text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'planning')),
  logo_url text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS products_status_idx ON crm.products(status);

-- ── TAGS (registro central) ─────────────────────────────
CREATE TABLE IF NOT EXISTS crm.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  color text DEFAULT '#94a3b8',
  category text DEFAULT 'other' CHECK (category IN ('audience', 'niche', 'region', 'persona', 'other')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crm.contact_tags (
  contact_id uuid REFERENCES crm.contacts(id) ON DELETE CASCADE,
  tag_id uuid REFERENCES crm.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, tag_id)
);

-- ── CONTACT ↔ PRODUCT FIT (categoria por produto) ──────
CREATE TABLE IF NOT EXISTS crm.contact_product_fit (
  contact_id uuid REFERENCES crm.contacts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES crm.products(id) ON DELETE CASCADE,
  category text,
  fit_score int CHECK (fit_score BETWEEN 1 AND 5),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (contact_id, product_id)
);
CREATE INDEX IF NOT EXISTS contact_product_fit_product_idx ON crm.contact_product_fit(product_id);

-- ── PIPELINE STAGES (por scope b2b/b2c) ─────────────────
CREATE TABLE IF NOT EXISTS crm.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('b2b', 'b2c')),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  color text DEFAULT '#94a3b8',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, name)
);

-- ── PIPELINE CARDS (B2B + B2C em 1 tabela, filtra por scope) ──
CREATE TABLE IF NOT EXISTS crm.pipeline_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('b2b', 'b2c')),
  stage_id uuid REFERENCES crm.pipeline_stages(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm.contacts(id) ON DELETE CASCADE,
  product_id uuid REFERENCES crm.products(id) ON DELETE SET NULL,
  title text NOT NULL,
  value numeric(14,2) DEFAULT 0,
  probability int DEFAULT 50 CHECK (probability BETWEEN 0 AND 100),
  expected_close_date date,
  notes text,
  owner uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pipeline_cards_scope_idx ON crm.pipeline_cards(scope);
CREATE INDEX IF NOT EXISTS pipeline_cards_stage_idx ON crm.pipeline_cards(stage_id);
CREATE INDEX IF NOT EXISTS pipeline_cards_contact_idx ON crm.pipeline_cards(contact_id);
CREATE INDEX IF NOT EXISTS pipeline_cards_owner_idx ON crm.pipeline_cards(owner);

-- ── TASKS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  assignee uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date date,
  related_contact_id uuid REFERENCES crm.contacts(id) ON DELETE SET NULL,
  related_card_id uuid REFERENCES crm.pipeline_cards(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON crm.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_assignee_idx ON crm.tasks(assignee);
CREATE INDEX IF NOT EXISTS tasks_due_idx ON crm.tasks(due_date);

-- ── ACTIVITIES (timeline do contato/card) ───────────────
CREATE TABLE IF NOT EXISTS crm.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES crm.contacts(id) ON DELETE CASCADE,
  card_id uuid REFERENCES crm.pipeline_cards(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'meeting', 'task', 'status_change', 'stage_change')),
  description text NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activities_contact_idx ON crm.activities(contact_id);
CREATE INDEX IF NOT EXISTS activities_card_idx ON crm.activities(card_id);
CREATE INDEX IF NOT EXISTS activities_created_idx ON crm.activities(created_at DESC);

-- ── AUDIT LOG ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON crm.audit_log(user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON crm.audit_log(created_at DESC);

-- ── NOTIFICATIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text DEFAULT 'info',
  text text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON crm.notifications(user_id, read);

-- ── USER SETTINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS crm.user_settings (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  theme text DEFAULT 'default-dark',
  hub_widgets text[] DEFAULT '{"contacts_summary","pipeline_b2b","pipeline_b2c","tasks"}',
  preferences jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── TRIGGER: auto updated_at ────────────────────────────
CREATE OR REPLACE FUNCTION crm.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contacts_updated_at BEFORE UPDATE ON crm.contacts
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER products_updated_at BEFORE UPDATE ON crm.products
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER pipeline_cards_updated_at BEFORE UPDATE ON crm.pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON crm.tasks
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();
CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON crm.user_settings
  FOR EACH ROW EXECUTE FUNCTION crm.set_updated_at();

-- ══════════════════════════════════════════════════════════
-- RLS: authenticated users têm acesso total (modelo colaborativo)
-- ══════════════════════════════════════════════════════════

ALTER TABLE crm.contacts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.products            ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.tags                ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contact_tags        ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.contact_product_fit ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.pipeline_stages     ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.pipeline_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.activities          ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.audit_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.user_settings       ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['contacts','products','tags','contact_tags',
                                'contact_product_fit','pipeline_stages',
                                'pipeline_cards','tasks','activities','audit_log'])
  LOOP
    EXECUTE format('CREATE POLICY "auth_all_%s" ON crm.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

CREATE POLICY "own_notifications" ON crm.notifications
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_user_settings" ON crm.user_settings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ══════════════════════════════════════════════════════════
-- SEED: Pipeline stages padrão para B2B e B2C
-- ══════════════════════════════════════════════════════════

INSERT INTO crm.pipeline_stages (scope, name, position, color) VALUES
  ('b2b', 'Prospecção',         1, '#94a3b8'),
  ('b2b', 'Primeiro contato',   2, '#3b82f6'),
  ('b2b', 'Proposta enviada',   3, '#f59e0b'),
  ('b2b', 'Em negociação',      4, '#a855f7'),
  ('b2b', 'Fechado — Ganho',    5, '#10b981'),
  ('b2b', 'Fechado — Perdido',  6, '#ef4444'),
  ('b2c', 'Mapeado',            1, '#94a3b8'),
  ('b2c', 'Abordagem',          2, '#3b82f6'),
  ('b2c', 'Em conversa',        3, '#f59e0b'),
  ('b2c', 'Negociando contrato',4, '#a855f7'),
  ('b2c', 'Ativo',              5, '#10b981'),
  ('b2c', 'Descartado',         6, '#ef4444')
ON CONFLICT (scope, name) DO NOTHING;
