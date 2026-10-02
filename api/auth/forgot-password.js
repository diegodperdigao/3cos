// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Internal "forgot password"
// ══════════════════════════════════════════════════════════
// POST /api/auth/forgot-password
// Body: { email }
// Returns: { ok: true } always (never leaks whether the email exists)
//
// Generates a single-use token, stores its SHA-256 hash in
// public.password_reset_tokens, and emails the user a link via Resend.
// Link shape: https://<app>/?reset_token=<raw>
//
// Env vars required (Vercel → Settings → Environment Variables):
//   SUPABASE_URL          — same as the client
//   SUPABASE_SERVICE_KEY  — service_role (admin on auth + the tokens table)
//   RESEND_API_KEY        — https://resend.com/api-keys
//   RESEND_FROM           — e.g. "3cos <no-reply@yourdomain.com>" (optional;
//                           defaults to the Resend sandbox sender, which
//                           only delivers to the Resend account owner's
//                           email until a domain is verified)
//   APP_URL               — e.g. "https://3cos.vercel.app" (optional;
//                           falls back to the request Origin header)
// ══════════════════════════════════════════════════════════

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || '';

const TOKEN_TTL_MINUTES = 60;
const RATE_LIMIT_SECONDS = 60;

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function newToken() { return crypto.randomBytes(32).toString('hex'); }

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

function appOrigin(req) {
  if (APP_URL) return APP_URL.replace(/\/$/, '');
  const origin = req.headers.origin || req.headers.referer || '';
  try { return new URL(origin).origin; } catch (_) { return ''; }
}

function emailHTML({ name, link }) {
  const safeName = name ? ' ' + name : '';
  return `<!doctype html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f7f9;margin:0;padding:32px 16px;color:#111">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.06)">
<tr><td style="padding:28px 28px 8px">
  <div style="font-size:22px;font-weight:700;letter-spacing:-0.5px">3C<span style="font-weight:400">OS</span></div>
  <div style="font-size:13px;color:#666;margin-top:4px">CRM Comercial</div>
</td></tr>
<tr><td style="padding:16px 28px 8px">
  <h1 style="font-size:20px;margin:12px 0 8px">Redefinir senha</h1>
  <p style="font-size:14px;line-height:1.6;color:#333;margin:0 0 20px">Olá${safeName}, recebemos um pedido para redefinir sua senha do 3cos. Clique no botão abaixo para escolher uma nova. O link vale por ${TOKEN_TTL_MINUTES} minutos.</p>
  <p style="margin:24px 0"><a href="${link}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600">Redefinir senha</a></p>
  <p style="font-size:12px;color:#666;line-height:1.6;margin:20px 0 0">Se o botão não funcionar, copie e cole esta URL no navegador:<br><span style="color:#333;word-break:break-all">${link}</span></p>
</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #eee;margin-top:24px">
  <p style="font-size:12px;color:#999;margin:16px 0 0;line-height:1.6">Se você não pediu isso, pode ignorar este email — nenhuma mudança foi feita na sua conta.</p>
</td></tr>
</table>
<p style="text-align:center;font-size:11px;color:#999;margin:20px 0 0">3cos · envio automático</p>
</body></html>`;
}

async function sendMail({ to, subject, html }) {
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body?.message || `Resend HTTP ${resp.status}`);
  return body;
}

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  try {
    if (!RESEND_API_KEY) {
      console.error('[forgot-password] RESEND_API_KEY not configured');
      // Still answer OK so we don't leak server state to the client
      res.status(200).json({ ok: true });
      return;
    }

    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }

    const sb = admin();

    // Rate limit: if there's an unused, unexpired token issued less than
    // RATE_LIMIT_SECONDS ago, swallow the request.
    const since = new Date(Date.now() - RATE_LIMIT_SECONDS * 1000).toISOString();
    const { data: recent } = await sb
      .from('password_reset_tokens')
      .select('id')
      .eq('email', email)
      .is('used_at', null)
      .gte('created_at', since)
      .limit(1);
    if (recent && recent.length > 0) {
      res.status(200).json({ ok: true, throttled: true });
      return;
    }

    // Look up the auth user. If missing, still return ok (avoids email
    // enumeration) but skip sending.
    let userRow = null;
    try {
      const { data: profileRow } = await sb
        .from('profiles').select('id, name, email').eq('email', email).maybeSingle();
      if (profileRow) userRow = profileRow;
    } catch (_) {}

    if (!userRow) {
      res.status(200).json({ ok: true });
      return;
    }

    // Issue a new token
    const raw = newToken();
    const tokenHash = sha256(raw);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000).toISOString();
    const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || null;

    const { error: insErr } = await sb.from('password_reset_tokens').insert({
      email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      requested_from: ip,
    });
    if (insErr) {
      console.error('[forgot-password] insert token:', insErr);
      res.status(500).json({ error: 'Falha ao gerar token' });
      return;
    }

    // Build the link using APP_URL (preferred) or the request Origin
    const base = appOrigin(req);
    if (!base) {
      console.error('[forgot-password] no APP_URL and no Origin header');
      res.status(500).json({ error: 'App URL não configurado' });
      return;
    }
    const link = `${base}/?reset_token=${raw}`;

    try {
      await sendMail({
        to: email,
        subject: 'Redefinir sua senha do 3cos',
        html: emailHTML({ name: (userRow.name || '').split(' ')[0], link }),
      });
    } catch (e) {
      console.error('[forgot-password] resend send:', e.message);
      res.status(500).json({ error: 'Falha ao enviar email: ' + e.message });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[forgot-password]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
