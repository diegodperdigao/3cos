-- ══════════════════════════════════════════════════════════
-- 010 · Marca Naipe (naipe.com.br, truco a dinheiro real)
-- ══════════════════════════════════════════════════════════
-- Produto "Naipe" + pipeline própria (scope 'naipe') com as etapas do B2C,
-- sem "Lead LP" (leads de LP não entram mais na pipeline, PR #62).
-- Idempotente.
-- ══════════════════════════════════════════════════════════

INSERT INTO crm.products (name, category, description, color, status)
SELECT 'Naipe', 'Truco', 'Truco a dinheiro real', '#0A2F86', 'active'
WHERE NOT EXISTS (SELECT 1 FROM crm.products WHERE crm.product_slug(name) = 'naipe');

INSERT INTO crm.pipeline_stages (scope, name, position, color, is_won, is_lost)
SELECT 'naipe', s.name, s.position, s.color, s.is_won, s.is_lost
FROM crm.pipeline_stages s
WHERE s.scope = 'b2c' AND s.name <> 'Lead LP'
ON CONFLICT (scope, name) DO NOTHING;
