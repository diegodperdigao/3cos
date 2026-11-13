-- ══════════════════════════════════════════════════════════
-- 3cos — Tipo de negócio "Mínimo garantido" (fixo + RevShare, o que for maior)
-- ══════════════════════════════════════════════════════════
-- Ex.: R$ 8.000 de mínimo garantido + 30% de RevShare. No mês, o parceiro recebe
-- o MAIOR entre o mínimo e 30% da receita que ele gerou (não soma os dois).
--   pipeline_cards.deal_type   → aceita 'minimo_garantido'
--                                 (fixed_monthly_value = mínimo, rev_share_pct = %)
--   partners.deal_type         → 'fixo' | 'minimo_garantido' (novo)
--   partners.rev_share_pct     → % do RevShare (novo)
-- Mínimo garantido tem escopo e piso fixo, então também vira parceiro em Parceiros.
-- Idempotente.
-- ══════════════════════════════════════════════════════════

ALTER TABLE crm.pipeline_cards DROP CONSTRAINT IF EXISTS pipeline_cards_deal_type_check;
ALTER TABLE crm.pipeline_cards ADD CONSTRAINT pipeline_cards_deal_type_check
  CHECK (deal_type = ANY (ARRAY['revenue_share'::text, 'fixo'::text, 'minimo_garantido'::text]));

ALTER TABLE crm.partners ADD COLUMN IF NOT EXISTS deal_type text NOT NULL DEFAULT 'fixo';
ALTER TABLE crm.partners ADD COLUMN IF NOT EXISTS rev_share_pct numeric(5,2);
ALTER TABLE crm.partners DROP CONSTRAINT IF EXISTS partners_deal_type_chk;
ALTER TABLE crm.partners ADD CONSTRAINT partners_deal_type_chk CHECK (deal_type IN ('fixo', 'minimo_garantido'));

-- Validação ao fechar: mínimo garantido precisa do mínimo e do percentual
CREATE OR REPLACE FUNCTION crm._enforce_won_deal() RETURNS trigger
LANGUAGE plpgsql SET search_path TO 'crm', 'public', 'pg_temp' AS $function$
declare v_is_won boolean;
begin
  if new.stage_id is null then return new; end if;
  select is_won into v_is_won from crm.pipeline_stages where id = new.stage_id;
  if v_is_won then
    if new.deal_type is null then
      raise exception 'Negócio fechado precisa especificar o tipo (Revenue Share, Fixo ou Mínimo garantido).' using errcode='P0001';
    end if;
    if new.deal_type in ('revenue_share', 'minimo_garantido') then
      if new.rev_share_pct is null or new.rev_share_pct <= 0 or new.rev_share_pct > 100 then
        raise exception 'Informe um percentual de RevShare válido (0 a 100).' using errcode='P0001';
      end if;
      if new.affiliate_role = 'sub' and new.rev_share_pct > 50 then
        raise exception 'Subafiliado não pode ter mais de 50%% (margem total do time sub+master é 50%%).' using errcode='P0001';
      end if;
    end if;
    if new.deal_type in ('fixo', 'minimo_garantido') then
      if new.fixed_monthly_value is null or new.fixed_monthly_value <= 0 then
        raise exception '%', case when new.deal_type = 'fixo' then 'Negócio fixo precisa do valor mensal.'
                                  else 'Mínimo garantido precisa do valor mínimo mensal.' end using errcode='P0001';
      end if;
    end if;
    if new.closed_at is null then new.closed_at := now(); end if;
  end if;
  return new;
end; $function$;

-- Cria o parceiro também para mínimo garantido
CREATE OR REPLACE FUNCTION crm.ptn_card_won() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'crm', 'public' AS $function$
BEGIN
  IF NEW.stage_id IS NULL OR NEW.deal_type IS NULL OR NEW.deal_type NOT IN ('fixo', 'minimo_garantido') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.stage_id IS NOT DISTINCT FROM OLD.stage_id AND NEW.deal_type IS NOT DISTINCT FROM OLD.deal_type THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM crm.pipeline_stages WHERE id = NEW.stage_id AND is_won) THEN
    BEGIN
      PERFORM crm.ptn_from_card(NEW);
    EXCEPTION WHEN others THEN
      RAISE WARNING '[partners] não criou parceiro do card %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END $function$;

-- Resumo do acordo (texto do parceiro)
CREATE OR REPLACE FUNCTION crm.deal_summary_of(p_type text, p_value numeric, p_pct numeric, p_months int) RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_type
    WHEN 'minimo_garantido' THEN 'Mínimo garantido R$ ' || crm.ptn_brl(p_value) || '/mês ou '
      || replace(trim(to_char(p_pct, 'FM999990.##')), '.', ',') || '% RevShare (o maior)'
    WHEN 'fixo' THEN 'Fixo R$ ' || crm.ptn_brl(p_value) || '/mês'
    WHEN 'revenue_share' THEN 'RevShare ' || replace(trim(to_char(p_pct, 'FM999990.##')), '.', ',') || '%'
    ELSE NULL END
  || CASE WHEN p_type IN ('fixo', 'minimo_garantido') AND p_months IS NOT NULL THEN ' · ' || p_months || ' meses' ELSE '' END
$$;

CREATE OR REPLACE FUNCTION crm.ptn_from_card(c crm.pipeline_cards) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = crm, public AS $$
DECLARE
  v_name text;
  v_product uuid;
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
  v_start := coalesce(c.fixed_start_date, current_date);

  INSERT INTO crm.partners (card_id, contact_id, product_id, name, owner, deal_summary, monthly_value, notes,
                            start_date, end_date, scope_mode, contract_url, contract_status, deal_type, rev_share_pct)
  VALUES (
    c.id, c.contact_id, v_product, coalesce(v_name, c.title), c.owner,
    crm.deal_summary_of(c.deal_type, c.fixed_monthly_value, c.rev_share_pct, c.fixed_contract_months),
    c.fixed_monthly_value,
    nullif(concat_ws(E'\n\n',
      CASE WHEN c.fixed_deliverables IS NOT NULL AND coalesce(jsonb_array_length(c.fixed_scope), 0) = 0
           THEN 'Entregas combinadas: ' || c.fixed_deliverables END,
      CASE WHEN c.fixed_goals IS NOT NULL THEN 'Metas: ' || c.fixed_goals END), ''),
    v_start,
    CASE WHEN c.fixed_contract_months IS NOT NULL THEN (v_start + make_interval(months => c.fixed_contract_months))::date END,
    coalesce(c.fixed_scope_mode, 'monthly'),
    c.contract_url,
    c.contract_status,
    CASE WHEN c.deal_type = 'minimo_garantido' THEN 'minimo_garantido' ELSE 'fixo' END,
    CASE WHEN c.deal_type = 'minimo_garantido' THEN c.rev_share_pct END
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

-- Parceiros → card: também para mínimo garantido (e leva o percentual)
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
    deal_type = v.deal_type,
    rev_share_pct = CASE WHEN v.deal_type = 'minimo_garantido' THEN v.rev_share_pct ELSE NULL END,
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
  WHERE c.id = v.card_id AND c.deal_type IN ('fixo', 'minimo_garantido')
    -- só muda o tipo do card se o parceiro tiver valor (a validação exige)
    AND (v.deal_type = 'fixo' OR v.rev_share_pct > 0);
END $$;

DROP TRIGGER IF EXISTS partners_sync_card ON crm.partners;
CREATE TRIGGER partners_sync_card
  AFTER UPDATE OF monthly_value, start_date, end_date, scope_mode, contract_url, contract_status, deal_type, rev_share_pct ON crm.partners
  FOR EACH ROW EXECUTE FUNCTION crm.trg_partner_sync_card();

-- Conferência
SELECT pg_get_constraintdef(oid) AS tipos_aceitos FROM pg_constraint
WHERE conrelid = 'crm.pipeline_cards'::regclass AND conname = 'pipeline_cards_deal_type_check';
