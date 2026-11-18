-- ══════════════════════════════════════════════════════════
-- 009 · Resultado diário dos parceiros (backoffice da casa)
-- ══════════════════════════════════════════════════════════
-- crm.partners.ref_code     → código de indicação (cupom) do parceiro na casa
-- crm.partners.utm_content  → valor de utm_content do link do parceiro
-- crm.partner_daily         → números por parceiro / dia / origem (link ou cupom),
--                             importados da Visão geral do backoffice pela rotina
--                             diária. Link e cupom ficam separados: quem veio pelo
--                             link e usou o cupom aparece nos dois.
-- Idempotente.
-- ══════════════════════════════════════════════════════════

ALTER TABLE crm.partners
  ADD COLUMN IF NOT EXISTS ref_code text,
  ADD COLUMN IF NOT EXISTS utm_content text;

CREATE TABLE IF NOT EXISTS crm.partner_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES crm.partners(id) ON DELETE CASCADE,
  day date NOT NULL,
  channel text NOT NULL CHECK (channel IN ('link', 'cupom')),
  registrations int NOT NULL DEFAULT 0,
  ftd int NOT NULL DEFAULT 0,
  depositors int NOT NULL DEFAULT 0,
  deposits numeric(14,2) NOT NULL DEFAULT 0,
  ftd_value numeric(14,2) NOT NULL DEFAULT 0,
  withdrawals numeric(14,2) NOT NULL DEFAULT 0,
  net_cash numeric(14,2) NOT NULL DEFAULT 0,
  buyers int NOT NULL DEFAULT 0,
  gmv numeric(14,2) NOT NULL DEFAULT 0,
  take numeric(14,2) NOT NULL DEFAULT 0,
  bonus_cost numeric(14,2) NOT NULL DEFAULT 0,
  ngr numeric(14,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'backoffice',
  synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, day, channel)
);
CREATE INDEX IF NOT EXISTS partner_daily_day_idx ON crm.partner_daily(day);

GRANT ALL ON crm.partner_daily TO authenticated, service_role;
ALTER TABLE crm.partner_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_partner_daily" ON crm.partner_daily;
CREATE POLICY "auth_all_partner_daily" ON crm.partner_daily FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crm.partner_daily;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS partner_daily_touch ON crm.partner_daily;
CREATE TRIGGER partner_daily_touch BEFORE UPDATE ON crm.partner_daily FOR EACH ROW EXECUTE FUNCTION crm.ptn_touch();

-- Registro de cada execução da rotina (quando rodou, quantas linhas, erro)
CREATE TABLE IF NOT EXISTS crm.partner_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  rows_upserted int NOT NULL DEFAULT 0,
  ok boolean NOT NULL DEFAULT true,
  detail text
);
GRANT ALL ON crm.partner_sync_runs TO authenticated, service_role;
ALTER TABLE crm.partner_sync_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_partner_sync_runs" ON crm.partner_sync_runs;
CREATE POLICY "auth_all_partner_sync_runs" ON crm.partner_sync_runs FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
