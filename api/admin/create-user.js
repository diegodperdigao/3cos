// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Admin: create user
// ══════════════════════════════════════════════════════════
// POST /api/admin/create-user
// Auth: Bearer <session JWT> (passed from the browser; must belong to a
//       profile with role='admin')
// Body: { email, name, role?, status?, modules?, password? }
//   - password is optional; if omitted, a strong one is generated and
//     returned in the response so the admin can forward it to the user.
// Returns: { ok: true, user: {id,email,name}, password, generated: boolean }
//
// Required env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL          — same as the client
//   SUPABASE_SERVICE_KEY  — service_role key (admin privileges, NEVER
//                           exposed to the browser)
// ══════════════════════════════════════════════════════════

const { admin } = require('../_lib/supabase-admin');

function generatePassword() {
  // 14 chars, mix of upper/lower/digits + 2 symbols. Avoids ambiguous 0/O/1/l.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digit = '23456789';
  const sym = '!@#$%&*';
  const all = upper + lower + digit + sym;
  const pick = (set) => set[Math.floor(Math.random() * set.length)];
  const chars = [pick(upper), pick(upper), pick(lower), pick(lower), pick(digit), pick(digit), pick(sym)];
  while (chars.length < 14) chars.push(pick(all));
  // Fisher–Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // 1) Verify caller is an admin via their session JWT
    const auth = (req.headers.authorization || req.headers.Authorization || '').toString();
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }

    const sb = admin();
    const { data: userResp, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userResp?.user) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }
    const callerId = userResp.user.id;
    const { data: callerProfile, error: profErr } = await sb
      .from('profiles').select('role, status').eq('id', callerId).single();
    if (profErr || !callerProfile) {
      res.status(403).json({ error: 'Caller has no profile' });
      return;
    }
    if (callerProfile.role !== 'admin' || callerProfile.status !== 'ativo') {
      res.status(403).json({ error: 'Admins only' });
      return;
    }

    // 2) Validate payload
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { res.status(400).json({ error: 'Email inválido' }); return; }
    if (!name) { res.status(400).json({ error: 'Nome é obrigatório' }); return; }

    let password = body.password ? String(body.password) : '';
    const generated = !password;
    if (generated) password = generatePassword();
    if (password.length < 8) { res.status(400).json({ error: 'Senha mínima: 8 caracteres' }); return; }

    const role = ['admin', 'operacao', 'leitura'].includes(body.role) ? body.role : 'operacao';
    const status = body.status === 'inativo' ? 'inativo' : 'ativo';
    const modules = Array.isArray(body.modules) && body.modules.length
      ? body.modules.map(String)
      : ['dashboard', 'contacts', 'pipeline', 'tasks', 'settings'];

    // 3) Create auth user (email_confirm:true so they can log in immediately
    //    without going through the email verification flow)
    const { data: created, error: createErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role },
    });
    if (createErr) {
      const msg = createErr.message || 'Falha ao criar usuário no Auth';
      const status = /already registered|already exists|duplicate/i.test(msg) ? 409 : 500;
      res.status(status).json({ error: msg });
      return;
    }

    const newId = created.user.id;

    // 4) Upsert profile row. If the project has an on-signup trigger that
    //    already created a stub, we merge our fields in.
    const { error: upErr } = await sb.from('profiles').upsert({
      id: newId,
      name,
      email,
      role,
      status,
      modules,
    }, { onConflict: 'id' });
    if (upErr) {
      // Best-effort rollback: delete the auth user so admin can retry cleanly
      try { await sb.auth.admin.deleteUser(newId); } catch (_) {}
      res.status(500).json({ error: 'Profile upsert falhou: ' + upErr.message });
      return;
    }

    res.status(200).json({
      ok: true,
      user: { id: newId, email, name, role, status, modules },
      password,
      generated,
    });
  } catch (e) {
    console.error('[admin/create-user]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
