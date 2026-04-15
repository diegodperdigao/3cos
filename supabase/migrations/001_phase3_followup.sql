-- ════════════════════════════════════════════════════════════
-- Migration 001 — Phase 3 follow-up
-- ════════════════════════════════════════════════════════════
-- Adds the unique constraint on reports natural key so that
-- Data.syncAll() can use upsert with onConflict.
--
-- Without this, repeated bulk syncs would create duplicate
-- report rows because the JS state doesn't track the bigserial
-- id from Supabase.
--
-- Run this once in the Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════

-- Reports: unique on (brand, affiliate_id, date)
create unique index if not exists uq_reports_brand_aff_date
  on public.reports (brand, affiliate_id, date);

-- Profiles: also ensure email is unique (defensive — should be
-- already from schema.sql but doesn't hurt to enforce)
create unique index if not exists uq_profiles_email
  on public.profiles (email);

-- Done
