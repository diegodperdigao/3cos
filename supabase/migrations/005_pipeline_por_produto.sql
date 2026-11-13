-- ══════════════════════════════════════════════════════════
-- 3cos — Pipeline por produto (universos de marca)
-- ══════════════════════════════════════════════════════════
-- Cada produto ganha a própria pipeline: scope = nome do produto sem acento
-- e em minúsculas ('chute', 'rips', 'sortudao'). B2B e B2C continuam como
-- funis gerais da 3C.
--   1. scope deixa de ser lista fechada (b2b/b2c/rips) e aceita qualquer slug.
--   2. Chute e Sortudão ganham as mesmas etapas do B2C (com "Lead LP").
--      Rips ganha a etapa "Lead LP" no começo.
--   3. Cards do B2C que são de um produto mudam para a pipeline dele, na etapa
--      de mesmo nome: os de produto marcado e os leads das LPs
--      ("origem: LP Chute Parceiros", "LP Rips Afiliados", "LP Sortudão Afiliados").
--   4. Parceiro criado por card ganho acha o produto pelo scope.
-- Idempotente: pode rodar de novo sem duplicar nada.
-- Aplicar ANTES do merge do PR "CRM por marca".
-- ══════════════════════════════════════════════════════════

-- 1. scope livre (slug)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conrelid::regclass AS tbl, conname
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN ('crm.pipeline_stages'::regclass, 'crm.pipeline_cards'::regclass)
      AND pg_get_constraintdef(oid) ILIKE '%scope%'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.conname);
  END LOOP;
END $$;
ALTER TABLE crm.pipeline_stages ADD CONSTRAINT pipeline_stages_scope_slug CHECK (scope ~ '^[a-z0-9_]+$');
ALTER TABLE crm.pipeline_cards  ADD CONSTRAINT pipeline_cards_scope_slug  CHECK (scope ~ '^[a-z0-9_]+$');

-- slug do produto: minúsculo e sem acento ("Sortudão" → "sortudao")
CREATE OR REPLACE FUNCTION crm.product_slug(n text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(lower(translate(coalesce(n, ''),
    'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇáàâãäéèêëíìîïóòôõöúùûüç',
    'AAAAAEEEEIIIIOOOOOUUUUCaaaaaeeeeiiiiooooouuuuc')), '[^a-z0-9]+', '_', 'g')
$$;

-- 2. etapas
INSERT INTO crm.pipeline_stages (scope, name, position, color, is_won, is_lost)
SELECT x.scope, s.name, s.position, s.color, s.is_won, s.is_lost
FROM crm.pipeline_stages s
CROSS JOIN (VALUES ('chute'), ('sortudao')) AS x(scope)
WHERE s.scope = 'b2c'
ON CONFLICT (scope, name) DO NOTHING;

INSERT INTO crm.pipeline_stages (scope, name, position, color, is_won, is_lost)
VALUES ('rips', 'Lead LP', 0, '#0ea5e9', false, false)
ON CONFLICT (scope, name) DO NOTHING;

-- 3. cards do B2C → pipeline do produto (mesma etapa, pelo nome)
WITH alvo AS (
  SELECT c.id,
         coalesce(p.id, lp.id) AS product_id,
         crm.product_slug(coalesce(p.name, lp.name)) AS scope,
         lower(st.name) AS stage_name
  FROM crm.pipeline_cards c
  LEFT JOIN crm.pipeline_stages st ON st.id = c.stage_id
  LEFT JOIN crm.products p ON p.id = c.product_id
  LEFT JOIN crm.products lp ON c.product_id IS NULL AND (
       (c.notes ILIKE '%origem: LP Chute%'    AND crm.product_slug(lp.name) = 'chute')
    OR (c.notes ILIKE '%origem: LP Rips%'     AND crm.product_slug(lp.name) = 'rips')
    OR (c.notes ILIKE '%origem: LP Sortud%'   AND crm.product_slug(lp.name) = 'sortudao'))
  WHERE c.scope = 'b2c' AND coalesce(p.id, lp.id) IS NOT NULL
)
UPDATE crm.pipeline_cards c
SET scope = a.scope,
    product_id = a.product_id,
    stage_id = coalesce(
      (SELECT s2.id FROM crm.pipeline_stages s2 WHERE s2.scope = a.scope AND lower(s2.name) = a.stage_name LIMIT 1),
      (SELECT s3.id FROM crm.pipeline_stages s3 WHERE s3.scope = a.scope ORDER BY s3.position LIMIT 1))
FROM alvo a
WHERE c.id = a.id
  AND EXISTS (SELECT 1 FROM crm.pipeline_stages s WHERE s.scope = a.scope);

-- 4. parceiro nascido de card ganho: produto pelo card ou pelo scope
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
  IF v_product IS NULL THEN
    SELECT id INTO v_product FROM crm.products WHERE crm.product_slug(name) = c.scope LIMIT 1;
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

-- Conferência (deve listar chute, rips, sortudao, b2b, b2c)
SELECT scope, count(*) AS cards FROM crm.pipeline_cards GROUP BY scope ORDER BY scope;
