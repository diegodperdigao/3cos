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

  // sb_crm removido: tínhamos problemas de sincronização de sessão entre
  // duas instâncias concorrentes do cliente. Agora todas operações no
  // schema `crm` usam window.sb.schema('crm') — mesma instância, mesma sessão.
  // Alias defensivo caso algum código ainda chame sb_crm.
  window.sb_crm = {
    from: (t) => window.sb.schema('crm').from(t),
    schema: window.sb.schema.bind(window.sb),
    auth: window.sb.auth,
  };

  console.log('[Supabase] client initialized:', SUPABASE_URL);
} else {
  // Stub for graceful no-op when not yet configured
  window.sb = null;
  window.sb_crm = null;
  console.warn('[Supabase] NOT configured — set credentials in js/supabase-client.js to enable cloud sync');
}
