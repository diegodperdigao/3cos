-- ══════════════════════════════════════════════════════════
-- 3cos — Parceiros: resultados (somam no Dashboard) + métricas de conteúdo
-- ══════════════════════════════════════════════════════════
-- crm.partners.monthly_value      → valor fixo mensal (número, p/ custo por cadastro)
-- crm.partner_deliveries.views... → desempenho de cada entrega
-- crm.partner_results             → resultado de negócio por parceiro/mês
--                                   (lançado à mão ou importado de CSV)
-- Idempotente.
-- ══════════════════════════════════════════════════════════

ALTER TABLE crm.partners ADD COLUMN IF NOT EXISTS monthly_value numeric(14,2);
UPDATE crm.partners p SET monthly_value = c.fixed_monthly_value
FROM crm.pipeline_cards c
WHERE c.id = p.card_id AND p.monthly_value IS NULL AND c.fixed_monthly_value IS NOT NULL;

ALTER TABLE crm.partner_deliveries
  ADD COLUMN IF NOT EXISTS views int,
  ADD COLUMN IF NOT EXISTS likes int,
  ADD COLUMN IF NOT EXISTS comments int,
  ADD COLUMN IF NOT EXISTS shares int,
  ADD COLUMN IF NOT EXISTS clicks int;

CREATE TABLE IF NOT EXISTS crm.partner_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES crm.partners(id) ON DELETE CASCADE,
  period date NOT NULL,                 -- 1º dia do mês
  registrations int NOT NULL DEFAULT 0,
  ftd int NOT NULL DEFAULT 0,
  deposits numeric(14,2) NOT NULL DEFAULT 0,
  net_rev numeric(14,2) NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, period)
);
CREATE INDEX IF NOT EXISTS partner_results_period_idx ON crm.partner_results(period);

GRANT ALL ON crm.partner_results TO authenticated, service_role;
ALTER TABLE crm.partner_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth_all_partner_results" ON crm.partner_results;
CREATE POLICY "auth_all_partner_results" ON crm.partner_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE crm.partner_results;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS partner_results_touch ON crm.partner_results;
CREATE TRIGGER partner_results_touch BEFORE UPDATE ON crm.partner_results FOR EACH ROW EXECUTE FUNCTION crm.ptn_touch();

-- Parceiro novo vindo do Pipeline já leva o valor mensal
CREATE OR REPLACE FUNCTION crm.ptn_from_card(c crm.pipeline_cards) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
DECLARE
  v_name text;
  v_product uuid;
  v_summary text;
BEGIN
  IF EXISTS (SELECT 1 FROM crm.partners WHERE card_id = c.id) THEN RETURN; END IF;
  SELECT name INTO v_name FROM crm.contacts WHERE id = c.contact_id;
  v_product := c.product_id;
  IF v_product IS NULL AND c.scope = 'rips' THEN
    SELECT id INTO v_product FROM crm.products WHERE lower(name) = 'rips' LIMIT 1;
  END IF;
  v_summary := CASE c.deal_type
    WHEN 'revenue_share' THEN 'RevShare ' || replace(trim(to_char(c.rev_share_pct, 'FM999990.##')), '.', ',') || '%'
    WHEN 'fixo' THEN 'Fixo R$ ' || crm.ptn_brl(c.fixed_monthly_value) || '/mês'
      || coalesce(' · ' || c.fixed_contract_months || ' meses', '')
    ELSE NULL END;
  v_summary := regexp_replace(v_summary, ',%$', '%');
  INSERT INTO crm.partners (card_id, contact_id, product_id, name, owner, deal_summary, monthly_value, notes, end_date)
  VALUES (
    c.id, c.contact_id, v_product, coalesce(v_name, c.title), c.owner, v_summary, c.fixed_monthly_value,
    nullif(concat_ws(E'\n\n',
      CASE WHEN c.fixed_deliverables IS NOT NULL THEN 'Entregas combinadas: ' || c.fixed_deliverables END,
      CASE WHEN c.fixed_goals IS NOT NULL THEN 'Metas: ' || c.fixed_goals END), ''),
    CASE WHEN c.fixed_contract_months IS NOT NULL THEN (current_date + make_interval(months => c.fixed_contract_months))::date END
  );
END $$;

SELECT name, monthly_value FROM crm.partners;
