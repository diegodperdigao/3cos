// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Complete password reset
// ══════════════════════════════════════════════════════════
// POST /api/auth/complete-reset
// Body: { token, password }
// Returns: { ok: true } on success, or { error } with 400/410/500
//
// Validates a token issued by /api/auth/forgot-password, updates the
// user's password via admin.updateUserById, marks the token used.
// ══════════════════════════════════════════════════════════

const crypto = require('crypto');
const { admin } = require('../_lib/supabase-admin');

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

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
    const body = await readBody(req);
    const token = String(body.token || '').trim();
    const password = String(body.password || '');
    if (!token || token.length < 32) { res.status(400).json({ error: 'Token inválido' }); return; }
    if (password.length < 8) { res.status(400).json({ error: 'Senha mínima: 8 caracteres' }); return; }

    const sb = admin();
    const tokenHash = sha256(token);

    const { data: row, error: lookupErr } = await sb
      .from('password_reset_tokens')
      .select('id, email, expires_at, used_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();
    if (lookupErr) { res.status(500).json({ error: 'DB error: ' + lookupErr.message }); return; }
    if (!row) { res.status(410).json({ error: 'Link inválido ou já utilizado.' }); return; }
    if (row.used_at) { res.status(410).json({ error: 'Este link já foi usado. Peça um novo.' }); return; }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      res.status(410).json({ error: 'Link expirado. Peça um novo "esqueci minha senha".' });
      return;
    }

    // Find the auth user via listUsers (there's no direct getByEmail in v2)
    const { data: list, error: listErr } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) { res.status(500).json({ error: 'Falha ao localizar usuário' }); return; }
    const target = list.users.find(u => (u.email || '').toLowerCase() === row.email.toLowerCase());
    if (!target) { res.status(500).json({ error: 'Conta não encontrada' }); return; }

    const { error: upErr } = await sb.auth.admin.updateUserById(target.id, { password });
    if (upErr) { res.status(500).json({ error: 'Falha ao atualizar senha: ' + upErr.message }); return; }

    // Mark token used (and invalidate any other outstanding ones for this email)
    await sb.from('password_reset_tokens').update({ used_at: new Date().toISOString() }).eq('id', row.id);
    await sb.from('password_reset_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('email', row.email)
      .is('used_at', null);

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[complete-reset]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
