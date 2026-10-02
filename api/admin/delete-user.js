// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Admin: delete user
// ══════════════════════════════════════════════════════════
// POST /api/admin/delete-user
// Auth: Bearer <session JWT> from a profile with role='admin'
// Body: { id }   (the profile/auth id of the user to delete)
// Returns: { ok: true }
//
// Removes the row from public.profiles and the auth.users entry so the
// person cannot log in anymore. An admin cannot delete themselves (keeps
// the system from locking out).
// ══════════════════════════════════════════════════════════

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

function admin() {
  if (!SUPABASE_URL || !SERVICE_KEY) throw new Error('Supabase env vars missing');
  return createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const authHdr = (req.headers.authorization || req.headers.Authorization || '').toString();
    const token = authHdr.startsWith('Bearer ') ? authHdr.slice(7).trim() : '';
    if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }

    const sb = admin();
    const { data: userResp, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userResp?.user) { res.status(401).json({ error: 'Invalid session' }); return; }
    const callerId = userResp.user.id;

    const { data: callerProfile, error: profErr } = await sb
      .from('profiles').select('role, status').eq('id', callerId).single();
    if (profErr || !callerProfile) { res.status(403).json({ error: 'Caller has no profile' }); return; }
    if (callerProfile.role !== 'admin' || callerProfile.status !== 'ativo') {
      res.status(403).json({ error: 'Admins only' });
      return;
    }

    const body = await readBody(req);
    const targetId = String(body.id || '').trim();
    if (!targetId) { res.status(400).json({ error: 'id é obrigatório' }); return; }
    if (targetId === callerId) {
      res.status(400).json({ error: 'Você não pode excluir a si mesmo' });
      return;
    }

    // 1) delete profile row (RLS bypassed because we're service_role)
    const { error: delProfileErr } = await sb.from('profiles').delete().eq('id', targetId);
    if (delProfileErr) {
      res.status(500).json({ error: 'Falha ao excluir profile: ' + delProfileErr.message });
      return;
    }

    // 2) delete auth user (irreversible — ends their ability to log in)
    const { error: delAuthErr } = await sb.auth.admin.deleteUser(targetId);
    if (delAuthErr) {
      // Profile already gone; log but still return ok so the UI doesn't
      // get stuck on a "half-deleted" state.
      console.warn('[delete-user] auth delete failed:', delAuthErr.message);
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[admin/delete-user]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
