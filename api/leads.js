// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Lead intake (landing pages)
// ══════════════════════════════════════════════════════════
// POST /api/leads
// Auth: `x-api-key: <LEAD_INTAKE_API_KEY>` header
// Body (JSON): see FIELD MAPPING below
// Returns: { ok: true, lead: { id, name, email, phone, created_at } }
//
// Env vars (Vercel → Settings → Environment Variables):
//   SUPABASE_URL / SUPABASE_SERVICE_KEY  (shared helper picks these up)
//   LEAD_INTAKE_API_KEY   — the token the landing page sends in x-api-key
//   LEAD_INTAKE_ALLOWED_ORIGINS  (optional, comma-separated; default: *)
//
// FIELD MAPPING (what the LP sends → what we store)
//   nome                 → contacts.name           (required)
//   email                → contacts.email          (email OR telefone required)
//   telefone             → contacts.phone
//   perfil               → contacts.profile        (any string; UI expects
//                                                   influencer / tipster /
//                                                   streamer / agencia)
//   origem               → contacts.source + lead_meta.channel
//   url_origem           → lead_meta.landing_url
//   utm                  → lead_meta.utm           ({source,medium,campaign,term,content})
//   consentimento_lgpd   → lead_meta.consent_lgpd + lead_meta.consent_at
//                          (REQUIRED to be true — LGPD)
//   notes                → contacts.notes
//   type                 → contacts.type           (default 'b2b' for parceiros)
//   tags                 → stored on lead_meta.tags (for future linking)
//   test / ?test=1       → lead_meta.test:true + notes prefixed with [TESTE]
//   criado_em            → IGNORED (server time wins)
// ══════════════════════════════════════════════════════════

const { admin } = require('./_lib/supabase-admin');

const API_KEY = process.env.LEAD_INTAKE_API_KEY || '';
const ALLOWED_ORIGINS = (process.env.LEAD_INTAKE_ALLOWED_ORIGINS || '*')
  .split(',').map(s => s.trim()).filter(Boolean);

function originAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes('*')) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

function setCORS(res, origin) {
  const allowOrigin = ALLOWED_ORIGINS.includes('*') ? '*' : (originAllowed(origin) ? origin : '');
  if (allowOrigin) res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, X-API-Key, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('Vary', 'Origin');
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function clean(v, max = 500) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function normPhone(v) {
  if (!v) return null;
  const digits = String(v).replace(/[^\d+]/g, '');
  return digits || null;
}

function pickUtm(obj) {
  if (!obj || typeof obj !== 'object') return {};
  const keys = ['source', 'medium', 'campaign', 'term', 'content'];
  const out = {};
  keys.forEach(k => {
    const v = obj[k] ?? obj['utm_' + k];
    const s = clean(v, 200);
    if (s) out[k] = s;
  });
  return out;
}

module.exports = async (req, res) => {
  const origin = (req.headers.origin || '').toString();
  setCORS(res, origin);
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }
  if (!originAllowed(origin)) {
    res.status(403).json({ error: 'Origin not allowed.' });
    return;
  }

  // Auth: x-api-key is the primary; Authorization: Bearer <key> also accepted
  const apiKeyHdr = (req.headers['x-api-key'] || req.headers['X-API-Key'] || '').toString();
  const authHdr = (req.headers.authorization || '').toString();
  const bearer = authHdr.startsWith('Bearer ') ? authHdr.slice(7).trim() : '';
  const token = apiKeyHdr || bearer;
  if (!API_KEY) {
    console.error('[leads] LEAD_INTAKE_API_KEY not configured');
    res.status(503).json({ error: 'Lead intake not configured. Contact support.' });
    return;
  }
  if (token !== API_KEY) {
    res.status(401).json({ error: 'Invalid API key.' });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch (_) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  // ── Field mapping ────────────────────────────────────────────
  const name = clean(body.nome || body.name, 200);
  const email = clean((body.email || '').toLowerCase(), 200);
  const phone = normPhone(body.telefone || body.phone);
  const profile = clean(body.perfil || body.profile, 60);
  const origem = clean(body.origem || body.source, 200);
  const landingUrl = clean(body.url_origem || body.landing_url, 1000);
  const notesIn = clean(body.notes, 2000);
  const typeIn = clean(body.type, 10);
  const type = ['b2b', 'b2c', 'both'].includes(typeIn) ? typeIn : 'b2b';
  const tags = Array.isArray(body.tags) ? body.tags.slice(0, 20).map(t => clean(t, 60)).filter(Boolean) : [];
  const utm = pickUtm(body.utm);
  const consent = body.consentimento_lgpd === true || body.consent_lgpd === true;
  const testFlag = body.test === true || /^(1|true)$/i.test(String(req.query?.test ?? ''));

  // ── Validation ───────────────────────────────────────────────
  if (!name) {
    res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    return;
  }
  if (!email && !phone) {
    res.status(400).json({ error: 'Informe pelo menos "email" ou "telefone".' });
    return;
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.status(400).json({ error: 'Email inválido.' });
    return;
  }
  if (!consent) {
    res.status(400).json({ error: 'consentimento_lgpd deve ser true. O lead precisa autorizar o uso dos dados.' });
    return;
  }

  // ── lead_meta payload ────────────────────────────────────────
  const now = new Date().toISOString();
  const ip = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim() || null;
  const userAgent = (req.headers['user-agent'] || '').toString().slice(0, 500) || null;

  const leadMeta = {
    channel: origem || null,
    landing_url: landingUrl,
    utm,
    consent_lgpd: true,
    consent_at: now,
    received_at: now,
    ip,
    user_agent: userAgent,
  };
  if (tags.length) leadMeta.tags = tags;
  if (testFlag) leadMeta.test = true;

  const notes = testFlag
    ? ('[TESTE] ' + (notesIn || '')).trim()
    : (notesIn || null);

  // ── Insert ───────────────────────────────────────────────────
  try {
    const sb = admin();
    const { data, error } = await sb
      .schema('crm')
      .from('contacts')
      .insert({
        name,
        email,
        phone,
        profile,
        type,
        status: 'wishlist',
        source: 'inbound',
        temperature: 'warm',
        notes,
        lead_meta: leadMeta,
      })
      .select('id, name, email, phone, created_at')
      .single();

    if (error) {
      console.error('[leads] insert failed:', error);
      res.status(500).json({ error: 'Falha ao gravar o lead: ' + error.message });
      return;
    }

    res.status(201).json({ ok: true, lead: data });
  } catch (e) {
    console.error('[leads]', e);
    res.status(500).json({ error: e.message || 'Erro interno.' });
  }
};
