// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Admin: reset password
// ══════════════════════════════════════════════════════════
// POST /api/admin/reset-password
// Auth: Bearer <session JWT> from a profile with role='admin'
// Body: { id }   (the profile/auth id of the user)
// Returns: { ok: true, password }
//
// Substitui o "Esqueci minha senha": o admin gera uma senha nova e
// manda pra pessoa, que troca em Configurações depois de entrar.
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
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    const authHdr = (req.headers.authorization || req.headers.Authorization || '').toString();
    const token = authHdr.startsWith('Bearer ') ? authHdr.slice(7).trim() : '';
    if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }

    const sb = admin();
    const { data: userResp, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userResp?.user) { res.status(401).json({ error: 'Invalid session' }); return; }

    const { data: callerProfile, error: profErr } = await sb
      .from('profiles').select('role, status').eq('id', userResp.user.id).single();
    if (profErr || !callerProfile) { res.status(403).json({ error: 'Caller has no profile' }); return; }
    if (callerProfile.role !== 'admin' || callerProfile.status !== 'ativo') {
      res.status(403).json({ error: 'Admins only' });
      return;
    }

    const body = await readBody(req);
    const targetId = String(body.id || '').trim();
    if (!targetId) { res.status(400).json({ error: 'id é obrigatório' }); return; }

    const password = generatePassword();
    const { error: updErr } = await sb.auth.admin.updateUserById(targetId, { password });
    if (updErr) { res.status(500).json({ error: 'Falha ao trocar a senha: ' + updErr.message }); return; }

    res.status(200).json({ ok: true, password });
  } catch (e) {
    console.error('[admin/reset-password]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
