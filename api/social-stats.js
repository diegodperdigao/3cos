// ══════════════════════════════════════════════════════════
// POST /api/social-stats   { contact_id }
// Auth: Bearer <session JWT> de um usuário ativo
//
// Lê crm.contacts.social_links, busca seguidores e dados públicos em cada
// rede que tem fonte disponível e grava o resultado em
// crm.contacts.social_stats (cache — o front só rebusca depois de 24h).
//
// Fontes:
//   youtube  → YouTube Data API v3   (env YOUTUBE_API_KEY)
//   twitch   → Twitch Helix          (env TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET)
//   kick     → endpoint público kick.com (melhor esforço, sem chave)
//   instagram / tiktok / x → sem API pública; ficam com o valor manual
//
// Redes sem fonte ou que falharem mantêm o que já estava salvo (inclusive
// valores digitados à mão), nunca são apagadas.
// ══════════════════════════════════════════════════════════

const { admin } = require('./_lib/supabase-admin');

const NETWORKS = ['instagram', 'tiktok', 'youtube', 'twitch', 'kick', 'x'];

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Aceita "@handle", "handle" ou URL completa e devolve só o handle.
function handleOf(raw) {
  let s = String(raw || '').trim();
  if (!s) return '';
  s = s.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/^m\./i, '');
  s = s.replace(/^(instagram\.com|tiktok\.com|youtube\.com|twitch\.tv|kick\.com|x\.com|twitter\.com)\//i, '');
  s = s.split(/[/?#]/)[0];
  return s.replace(/^@/, '');
}

async function fetchJSON(url, opts = {}, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const body = await r.json().catch(() => null);
    if (!r.ok) throw new Error((body && (body.message || body.error?.message || body.error)) || `HTTP ${r.status}`);
    return body;
  } finally { clearTimeout(t); }
}

// ── YouTube ─────────────────────────────────────────────
async function youtube(raw) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return { skipped: 'YOUTUBE_API_KEY não configurada' };
  const s = String(raw || '').trim();
  const base = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&key=' + encodeURIComponent(key);
  const idMatch = s.match(/(UC[\w-]{22})/);
  let url;
  if (idMatch) url = base + '&id=' + idMatch[1];
  else {
    let h = handleOf(s);
    if (/^(c|user|channel)$/i.test(h)) h = s.split('/').filter(Boolean).pop();
    url = base + '&forHandle=' + encodeURIComponent('@' + h.replace(/^@/, ''));
  }
  const data = await fetchJSON(url);
  const ch = data.items && data.items[0];
  if (!ch) throw new Error('Canal não encontrado');
  const st = ch.statistics || {};
  return {
    followers: st.hiddenSubscriberCount ? null : Number(st.subscriberCount || 0),
    views: Number(st.viewCount || 0),
    posts: Number(st.videoCount || 0),
    name: ch.snippet?.title || null,
    avatar: ch.snippet?.thumbnails?.default?.url || null,
    url: 'https://youtube.com/' + (ch.snippet?.customUrl || 'channel/' + ch.id),
  };
}

// ── Twitch ──────────────────────────────────────────────
let _twitchToken = null; // { token, exp }
async function twitchToken() {
  if (_twitchToken && _twitchToken.exp > Date.now() + 60000) return _twitchToken.token;
  const id = process.env.TWITCH_CLIENT_ID, secret = process.env.TWITCH_CLIENT_SECRET;
  const data = await fetchJSON('https://id.twitch.tv/oauth2/token?client_id=' + encodeURIComponent(id) +
    '&client_secret=' + encodeURIComponent(secret) + '&grant_type=client_credentials', { method: 'POST' });
  _twitchToken = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return _twitchToken.token;
}
async function twitch(raw) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return { skipped: 'TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET não configurados' };
  const login = handleOf(raw).toLowerCase();
  const token = await twitchToken();
  const headers = { 'Client-Id': process.env.TWITCH_CLIENT_ID, Authorization: 'Bearer ' + token };
  const users = await fetchJSON('https://api.twitch.tv/helix/users?login=' + encodeURIComponent(login), { headers });
  const u = users.data && users.data[0];
  if (!u) throw new Error('Canal não encontrado');
  const [fol, live] = await Promise.all([
    fetchJSON('https://api.twitch.tv/helix/channels/followers?broadcaster_id=' + u.id, { headers }).catch(() => null),
    fetchJSON('https://api.twitch.tv/helix/streams?user_id=' + u.id, { headers }).catch(() => null),
  ]);
  const stream = live && live.data && live.data[0];
  return {
    followers: fol ? Number(fol.total || 0) : null,
    name: u.display_name,
    avatar: u.profile_image_url || null,
    live: !!stream,
    live_viewers: stream ? stream.viewer_count : null,
    url: 'https://twitch.tv/' + u.login,
  };
}

// ── Kick (best effort) ──────────────────────────────────
async function kick(raw) {
  const slug = handleOf(raw).toLowerCase();
  const data = await fetchJSON('https://kick.com/api/v2/channels/' + encodeURIComponent(slug), {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (3cos CRM)' },
  });
  return {
    followers: Number(data.followers_count ?? data.followersCount ?? 0),
    name: data.user?.username || slug,
    avatar: data.user?.profile_pic || null,
    live: !!data.livestream,
    live_viewers: data.livestream?.viewer_count ?? null,
    url: 'https://kick.com/' + slug,
  };
}

const PROVIDERS = { youtube, twitch, kick };

module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const auth = (req.headers.authorization || '').toString();
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) { res.status(401).json({ error: 'Missing bearer token' }); return; }
    const sb = admin();
    const { data: u, error: uErr } = await sb.auth.getUser(token);
    if (uErr || !u?.user) { res.status(401).json({ error: 'Sessão inválida' }); return; }
    const { data: prof } = await sb.from('profiles').select('status').eq('id', u.user.id).single();
    if (!prof || prof.status !== 'ativo') { res.status(403).json({ error: 'Usuário inativo' }); return; }

    const body = await readBody(req);
    const contactId = String(body.contact_id || '');
    if (!contactId) { res.status(400).json({ error: 'contact_id é obrigatório' }); return; }

    const crm = sb.schema('crm');
    const { data: c, error: cErr } = await crm.from('contacts').select('id, social_links, social_stats').eq('id', contactId).single();
    if (cErr || !c) { res.status(404).json({ error: 'Contato não encontrado' }); return; }

    const links = c.social_links || {};
    const stats = { ...(c.social_stats || {}) };
    const report = {};
    const now = new Date().toISOString();

    await Promise.all(NETWORKS.filter(n => links[n]).map(async (net) => {
      const fn = PROVIDERS[net];
      if (!fn) { report[net] = 'manual'; return; }
      try {
        const r = await fn(links[net]);
        if (r && r.skipped) { report[net] = r.skipped; return; }
        stats[net] = { ...(stats[net] || {}), ...r, source: 'api', fetched_at: now };
        report[net] = 'ok';
      } catch (e) {
        report[net] = 'erro: ' + (e.message || 'falha');
      }
    }));

    // Remove stats de redes que o contato não tem mais
    Object.keys(stats).forEach(k => { if (!links[k]) delete stats[k]; });

    const { error: upErr } = await crm.from('contacts').update({ social_stats: stats }).eq('id', contactId);
    if (upErr) { res.status(500).json({ error: upErr.message }); return; }

    res.status(200).json({ ok: true, social_stats: stats, report });
  } catch (e) {
    console.error('[social-stats]', e);
    res.status(500).json({ error: e.message || 'Erro interno' });
  }
};
