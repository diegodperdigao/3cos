-- ══════════════════════════════════════════════════════════
-- 3cos — Logo de cada projeto/produto (Rips, Chute, CAP, Fortuna...)
-- A imagem é reduzida no navegador (até 160px) e guardada como data URL.
-- Idempotente.
-- ══════════════════════════════════════════════════════════
ALTER TABLE crm.products ADD COLUMN IF NOT EXISTS logo_url text;
