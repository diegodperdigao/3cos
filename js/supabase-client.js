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

const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';

// Detect placeholder credentials → don't initialize
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR_PROJECT') && !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY');

window.SUPABASE_CONFIGURED = SUPABASE_CONFIGURED;

if (SUPABASE_CONFIGURED && typeof window.supabase !== 'undefined') {
  // window.supabase comes from the @supabase/supabase-js CDN script
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
  console.log('[Supabase] client initialized:', SUPABASE_URL);
} else {
  // Stub for graceful no-op when not yet configured
  window.sb = null;
  console.warn('[Supabase] NOT configured — set credentials in js/supabase-client.js to enable cloud sync');
}
