-- ══════════════════════════════════════════════════════════
-- 3cos — Fechamento completo no Pipeline (escopo, contrato, início)
-- ══════════════════════════════════════════════════════════
-- O que foi negociado fica no card ao marcar "Ganho" (Fixo) e o parceiro já
-- nasce com tudo, sem digitar de novo em Parceiros:
--   pipeline_cards.fixed_scope        → escopo estruturado: [{kind, platform, qty, notes}]
--   pipeline_cards.fixed_scope_mode   → 'monthly' (repete todo mês) | 'package' (pacote fechado)
--   pipeline_cards.fixed_start_date   → início do contrato
--   pipeline_cards.contract_url       → link do contrato (Drive, D4Sign...)
--   pipeline_cards.contract_status    → 'draft' | 'sent' | 'signed'
--   pipeline_cards.proposal_text      → texto da proposta/escopo colado (o mesmo do jurídico)
--   partners.contract_url / contract_status → seguem para o parceiro
-- O card guarda "o que foi negociado"; depois da conversão, quem manda é Parceiros.
-- Só acrescenta colunas e troca a função: seguro aplicar antes do merge.
-- Idempotente.
-- ══════════════════════════════════════════════════════════

ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS fixed_scope jsonb;
ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS fixed_scope_mode text;
ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS fixed_start_date date;
ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS contract_url text;
ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS contract_status text;
ALTER TABLE crm.pipeline_cards ADD COLUMN IF NOT EXISTS proposal_text text;
ALTER TABLE crm.partners ADD COLUMN IF NOT EXISTS contract_url text;
ALTER TABLE crm.partners ADD COLUMN IF NOT EXISTS contract_status text;

ALTER TABLE crm.pipeline_cards DROP CONSTRAINT IF EXISTS pipeline_cards_fixed_scope_mode_chk;
ALTER TABLE crm.pipeline_cards ADD CONSTRAINT pipeline_cards_fixed_scope_mode_chk
  CHECK (fixed_scope_mode IS NULL OR fixed_scope_mode IN ('monthly', 'package'));
ALTER TABLE crm.pipeline_cards DROP CONSTRAINT IF EXISTS pipeline_cards_contract_status_chk;
ALTER TABLE crm.pipeline_cards ADD CONSTRAINT pipeline_cards_contract_status_chk
  CHECK (contract_status IS NULL OR contract_status IN ('draft', 'sent', 'signed'));
ALTER TABLE crm.partners DROP CONSTRAINT IF EXISTS partners_contract_status_chk;
ALTER TABLE crm.partners ADD CONSTRAINT partners_contract_status_chk
  CHECK (contract_status IS NULL OR contract_status IN ('draft', 'sent', 'signed'));

-- Parceiro nascido de card ganho: leva valor, início, fim, tipo de escopo,
-- contrato e as linhas do escopo.
CREATE OR REPLACE FUNCTION crm.ptn_from_card(c crm.pipeline_cards) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
DECLARE
  v_name text;
  v_product uuid;
  v_summary text;
  v_start date;
  v_partner uuid;
  v_item jsonb;
  v_pos int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM crm.partners WHERE card_id = c.id) THEN RETURN; END IF;
  SELECT name INTO v_name FROM crm.contacts WHERE id = c.contact_id;
  v_product := c.product_id;
  IF v_product IS NULL THEN
    SELECT id INTO v_product FROM crm.products WHERE crm.product_slug(name) = c.scope LIMIT 1;
  END IF;
  v_summary := CASE c.deal_type
    WHEN 'revenue_share' THEN 'RevShare ' || replace(trim(to_char(c.rev_share_pct, 'FM999990.##')), '.', ',') || '%'
    WHEN 'fixo' THEN 'Fixo R$ ' || crm.ptn_brl(c.fixed_monthly_value) || '/mês'
      || coalesce(' · ' || c.fixed_contract_months || ' meses', '')
    ELSE NULL END;
  v_summary := regexp_replace(v_summary, ',%$', '%');
  v_start := coalesce(c.fixed_start_date, current_date);

  INSERT INTO crm.partners (card_id, contact_id, product_id, name, owner, deal_summary, monthly_value, notes,
                            start_date, end_date, scope_mode, contract_url, contract_status)
  VALUES (
    c.id, c.contact_id, v_product, coalesce(v_name, c.title), c.owner, v_summary, c.fixed_monthly_value,
    nullif(concat_ws(E'\n\n',
      -- texto livre só quando não veio escopo estruturado
      CASE WHEN c.fixed_deliverables IS NOT NULL AND coalesce(jsonb_array_length(c.fixed_scope), 0) = 0
           THEN 'Entregas combinadas: ' || c.fixed_deliverables END,
      CASE WHEN c.fixed_goals IS NOT NULL THEN 'Metas: ' || c.fixed_goals END), ''),
    v_start,
    CASE WHEN c.fixed_contract_months IS NOT NULL THEN (v_start + make_interval(months => c.fixed_contract_months))::date END,
    coalesce(c.fixed_scope_mode, 'monthly'),
    c.contract_url,
    c.contract_status
  )
  RETURNING id INTO v_partner;

  IF jsonb_typeof(c.fixed_scope) = 'array' THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(c.fixed_scope) LOOP
      IF coalesce(v_item->>'kind', '') <> '' AND coalesce((v_item->>'qty')::int, 0) > 0 THEN
        INSERT INTO crm.partner_scope (partner_id, kind, platform, qty, notes, position)
        VALUES (v_partner, v_item->>'kind', nullif(v_item->>'platform', ''), (v_item->>'qty')::int,
                nullif(v_item->>'notes', ''), v_pos);
        v_pos := v_pos + 1;
      END IF;
    END LOOP;
  END IF;
END $$;

-- Conferência: colunas novas (deve listar 8 linhas)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'crm'
  AND ((table_name = 'pipeline_cards' AND column_name IN ('fixed_scope','fixed_scope_mode','fixed_start_date','contract_url','contract_status','proposal_text'))
    OR (table_name = 'partners' AND column_name IN ('contract_url','contract_status')))
ORDER BY table_name, column_name;
