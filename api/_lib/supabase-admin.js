// ══════════════════════════════════════════════════════════
// Shared Supabase service-role client for /api endpoints
// ══════════════════════════════════════════════════════════
// Accepts either the project-native env names or the Supabase/Vercel
// integration defaults, in that order, so endpoints work regardless of
// which naming the Vercel project uses:
//
//   URL:  SUPABASE_URL
//      ↳ NEXT_PUBLIC_SUPABASE_URL   (Vercel/Supabase integration default)
//
//   KEY:  SUPABASE_SERVICE_KEY
//      ↳ SUPABASE_SERVICE_ROLE_KEY   (Vercel/Supabase integration default)
// ══════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

function resolveEnv() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  return { url, key };
}

function missingReason() {
  const { url, key } = resolveEnv();
  const missing = [];
  if (!url) missing.push('SUPABASE_URL (ou NEXT_PUBLIC_SUPABASE_URL)');
  if (!key) missing.push('SUPABASE_SERVICE_KEY (ou SUPABASE_SERVICE_ROLE_KEY)');
  return missing.length ? `Faltam env vars no Vercel: ${missing.join(', ')}` : '';
}

function admin() {
  const { url, key } = resolveEnv();
  const reason = missingReason();
  if (reason) throw new Error(reason);
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

module.exports = { admin, resolveEnv, missingReason };
