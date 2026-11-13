-- ══════════════════════════════════════════════════════════
-- 3cos — Escopo e valor sincronizados entre Parceiros e o card do Pipeline
-- ══════════════════════════════════════════════════════════
-- Depois que um negócio Fixo vira parceiro, escopo, valor, início/fim e contrato
-- podem ser editados dos dois lados e ficam iguais:
--   · Parceiros → card: estes gatilhos copiam do parceiro para o card de origem
--     (valor, início, duração, tipo de escopo, contrato e as linhas do escopo).
--   · Card → Parceiros: feito pelo app ao salvar "Editar" no card fechado
--     (js/pipeline-crm.js), gravando no parceiro e no escopo dele.
-- Não há laço: a cópia para o card não mexe em stage_id/deal_type, que são o que
-- dispara a criação do parceiro.
-- Idempotente. Ao final, sincroniza os parceiros que já existem.
-- ══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION crm.card_sync_from_partner(p_partner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
DECLARE
  v crm.partners;
  v_months int;
BEGIN
  SELECT * INTO v FROM crm.partners WHERE id = p_partner;
  IF NOT FOUND OR v.card_id IS NULL THEN RETURN; END IF;
  IF v.start_date IS NOT NULL AND v.end_date IS NOT NULL AND v.end_date > v.start_date THEN
    v_months := greatest(1, (extract(year FROM age(v.end_date, v.start_date)) * 12
                             + extract(month FROM age(v.end_date, v.start_date)))::int);
  END IF;
  UPDATE crm.pipeline_cards c SET
    fixed_monthly_value = v.monthly_value,
    fixed_start_date = v.start_date,
    fixed_contract_months = coalesce(v_months, c.fixed_contract_months),
    fixed_scope_mode = v.scope_mode,
    contract_url = v.contract_url,
    contract_status = v.contract_status,
    fixed_scope = (
      SELECT coalesce(jsonb_agg(jsonb_build_object('kind', s.kind, 'platform', s.platform, 'qty', s.qty, 'notes', s.notes)
                                ORDER BY s.position, s.created_at), '[]'::jsonb)
      FROM crm.partner_scope s WHERE s.partner_id = p_partner)
  WHERE c.id = v.card_id AND c.deal_type = 'fixo';
END $$;

CREATE OR REPLACE FUNCTION crm.trg_scope_sync_card() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
BEGIN
  PERFORM crm.card_sync_from_partner(CASE WHEN TG_OP = 'DELETE' THEN OLD.partner_id ELSE NEW.partner_id END);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS partner_scope_sync_card ON crm.partner_scope;
CREATE TRIGGER partner_scope_sync_card AFTER INSERT OR UPDATE OR DELETE ON crm.partner_scope
  FOR EACH ROW EXECUTE FUNCTION crm.trg_scope_sync_card();

CREATE OR REPLACE FUNCTION crm.trg_partner_sync_card() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
BEGIN
  PERFORM crm.card_sync_from_partner(NEW.id);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS partners_sync_card ON crm.partners;
CREATE TRIGGER partners_sync_card
  AFTER UPDATE OF monthly_value, start_date, end_date, scope_mode, contract_url, contract_status ON crm.partners
  FOR EACH ROW EXECUTE FUNCTION crm.trg_partner_sync_card();

-- Sincroniza os parceiros que já existem (cards antigos passam a refletir o parceiro)
SELECT crm.card_sync_from_partner(id) FROM crm.partners WHERE card_id IS NOT NULL;

-- Conferência: negócios Fixo ganhos e o que falta preencher
SELECT c.title, p.name AS parceiro, c.fixed_monthly_value AS valor,
       coalesce(jsonb_array_length(c.fixed_scope), 0) AS linhas_escopo,
       c.fixed_start_date AS inicio
FROM crm.pipeline_cards c
JOIN crm.pipeline_stages st ON st.id = c.stage_id AND st.is_won
LEFT JOIN crm.partners p ON p.card_id = c.id
WHERE c.deal_type = 'fixo'
ORDER BY c.title;
