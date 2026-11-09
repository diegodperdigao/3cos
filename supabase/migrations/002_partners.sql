-- ══════════════════════════════════════════════════════════
-- 3cos — Parceiros Ativos (escopo + entregas + calendário)
-- ══════════════════════════════════════════════════════════
-- crm.partners            → parceiro de VALOR FIXO em operação (nasce do card ganho
--                           como Fixo no Pipeline ou cadastrado na mão). RevShare,
--                           permuta e variável têm escopo livre e não entram.
-- crm.partner_scope       → o que o parceiro se comprometeu a entregar
--                           (ex.: 4 reels Instagram). Mensal = por mês; pacote = total.
-- crm.partner_deliveries  → cada entrega prevista/feita, com data, status e link.
-- Idempotente: pode rodar de novo sem quebrar.
-- ══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS crm.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid UNIQUE REFERENCES crm.pipeline_cards(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES crm.contacts(id) ON DELETE SET NULL,
  product_id uuid REFERENCES crm.products(id) ON DELETE SET NULL,
  name text NOT NULL,
  owner uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'onboarding' CHECK (status IN ('onboarding', 'active', 'paused', 'ended')),
  scope_mode text NOT NULL DEFAULT 'monthly' CHECK (scope_mode IN ('monthly', 'package')),
  start_date date NOT NULL DEFAULT current_date,
  end_date date,
  deal_summary text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partners_product_idx ON crm.partners(product_id);
CREATE INDEX IF NOT EXISTS partners_status_idx ON crm.partners(status);

CREATE TABLE IF NOT EXISTS crm.partner_scope (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES crm.partners(id) ON DELETE CASCADE,
  kind text NOT NULL,
  platform text,
  qty int NOT NULL DEFAULT 1 CHECK (qty > 0),
  notes text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_scope_partner_idx ON crm.partner_scope(partner_id);

CREATE TABLE IF NOT EXISTS crm.partner_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id uuid NOT NULL REFERENCES crm.partners(id) ON DELETE CASCADE,
  scope_id uuid REFERENCES crm.partner_scope(id) ON DELETE SET NULL,
  kind text NOT NULL,
  platform text,
  title text,
  due_date date,
  period date,                       -- 1º dia do mês (escopo mensal); null em pacote
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'delivered', 'approved', 'rejected')),
  link text,
  delivered_at timestamptz,
  notes text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS partner_deliveries_partner_idx ON crm.partner_deliveries(partner_id);
CREATE INDEX IF NOT EXISTS partner_deliveries_due_idx ON crm.partner_deliveries(due_date);

-- ── Acesso: mesma regra das outras tabelas do CRM (equipe logada) ──
GRANT ALL ON crm.partners, crm.partner_scope, crm.partner_deliveries TO authenticated, service_role;
ALTER TABLE crm.partners           ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.partner_scope      ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm.partner_deliveries ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['partners', 'partner_scope', 'partner_deliveries'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_all_%s" ON crm.%I', t, t);
    EXECUTE format('CREATE POLICY "auth_all_%s" ON crm.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE crm.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ── updated_at automático ──
CREATE OR REPLACE FUNCTION crm.ptn_touch() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS partners_touch ON crm.partners;
CREATE TRIGGER partners_touch BEFORE UPDATE ON crm.partners FOR EACH ROW EXECUTE FUNCTION crm.ptn_touch();
DROP TRIGGER IF EXISTS partner_deliveries_touch ON crm.partner_deliveries;
CREATE TRIGGER partner_deliveries_touch BEFORE UPDATE ON crm.partner_deliveries FOR EACH ROW EXECUTE FUNCTION crm.ptn_touch();

-- Valor em reais: 30000 → 30.000,00
CREATE OR REPLACE FUNCTION crm.ptn_brl(v numeric) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT translate(to_char(v, 'FM999,999,990.00'), ',.', '.,')
$$;

-- ── Card ganho no Pipeline → vira parceiro ──
-- Nunca bloqueia o Pipeline: qualquer erro aqui vira só um aviso no log.
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
  INSERT INTO crm.partners (card_id, contact_id, product_id, name, owner, deal_summary, notes, end_date)
  VALUES (
    c.id, c.contact_id, v_product, coalesce(v_name, c.title), c.owner, v_summary,
    nullif(concat_ws(E'\n\n',
      CASE WHEN c.fixed_deliverables IS NOT NULL THEN 'Entregas combinadas: ' || c.fixed_deliverables END,
      CASE WHEN c.fixed_goals IS NOT NULL THEN 'Metas: ' || c.fixed_goals END), ''),
    CASE WHEN c.fixed_contract_months IS NOT NULL THEN (current_date + make_interval(months => c.fixed_contract_months))::date END
  );
END $$;

CREATE OR REPLACE FUNCTION crm.ptn_card_won() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
BEGIN
  -- Só parceria de valor fixo tem escopo acompanhado (RevShare/permuta/variável = escopo livre)
  IF NEW.stage_id IS NULL OR NEW.deal_type IS DISTINCT FROM 'fixo' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id
     AND NEW.deal_type IS NOT DISTINCT FROM OLD.deal_type THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM crm.pipeline_stages WHERE id = NEW.stage_id AND is_won) THEN
    BEGIN
      PERFORM crm.ptn_from_card(NEW);
    EXCEPTION WHEN others THEN
      RAISE WARNING '[partners] não criou parceiro do card %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS pipeline_cards_partner ON crm.pipeline_cards;
CREATE TRIGGER pipeline_cards_partner AFTER INSERT OR UPDATE OF stage_id, deal_type ON crm.pipeline_cards
  FOR EACH ROW EXECUTE FUNCTION crm.ptn_card_won();

-- ── Negócios fixos que já estão ganhos hoje entram no módulo ──
SELECT crm.ptn_from_card(c)
FROM crm.pipeline_cards c
JOIN crm.pipeline_stages s ON s.id = c.stage_id
WHERE s.is_won AND c.deal_type = 'fixo';

SELECT count(*) AS parceiros_criados FROM crm.partners;
