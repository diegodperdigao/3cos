// ══════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ══════════════════════════════════════════════════════════
// Initializes the Supabase JS client.
//
// CONFIG: replace with your project credentials after running
// the schema (see supabase/README.md).
//
// The anon key is SAFE to be public — RLS policies protect data.
// Don't put service_role keys here.
// ══════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://zolvuamsikxtobzafkao.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_pLaVyissnbo1jvOwfoG3pQ_ENDQZrpd';

// Detect placeholder credentials → don't initialize
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;

if (SUPABASE_CONFIGURED && typeof window.supabase !== 'undefined') {
  // Default client — reads from public schema (3C OS Pro legacy)
  window.sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  });

  // CRM client — reads from `crm` schema (frente comercial B2B/B2C + wishlist)
  // IMPORTANTE: para funcionar, o schema `crm` precisa estar em
  // Dashboard → Settings → API → "Exposed schemas" (adicionar crm junto com public).
  // Compartilha a sessão de auth do cliente default (mesmo login).
  window.sb_crm = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'sb-3cos-auth-token',  // mesma chave do sb → sessão compartilhada
    },
    db: { schema: 'crm' },
  });

  console.log('[Supabase] clients initialized:', SUPABASE_URL, '(default + crm)');
} else {
  // Stub for graceful no-op when not yet configured
  window.sb = null;
  window.sb_crm = null;
  console.warn('[Supabase] NOT configured — set credentials in js/supabase-client.js to enable cloud sync');
}
