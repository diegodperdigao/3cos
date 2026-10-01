// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Instagram Avatar Fetcher
// ══════════════════════════════════════════════════════════
// GET /api/ig-avatar?handle=<username>
//
// Fetches the public Instagram profile page server-side (bypasses browser
// CORS) and extracts the og:image meta tag which holds the profile picture.
// Returns a 302 redirect to the image URL so <img src> can use it directly.
//
// Fallbacks when scraping fails or is blocked:
//   1. Try unavatar.io/instagram/<handle> (public service, may be rate-limited)
//   2. Return 404 — client's onerror handler falls back to initials gradient
//
// Caching: Cache-Control: public, max-age=43200 (12h) so the browser +
// Vercel edge cache serve the redirect without re-fetching Instagram.
// ══════════════════════════════════════════════════════════

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
];

// Detecta imagens genéricas que o Instagram devolve quando bloqueia scraping:
// - static.cdninstagram.com → página genérica (logo do IG)
// - URLs com "logo", "anonymous", "default", "fallback"
// Fotos reais vêm de scontent-*.cdninstagram.com ou instagram.f*.fbcdn.net
function _isGenericImage(url) {
  if (!url) return true;
  const u = url.toLowerCase();
  if (u.includes('static.cdninstagram.com')) return true;
  if (u.includes('static.xx.fbcdn.net')) return true;
  if (/\b(logo|anonymous|default|fallback|avatar_placeholder)\b/.test(u)) return true;
  // Caminhos tipicamente usados pelas imagens de perfil reais:
  // v/t51.2885-19 (profile pic size), scontent-*.cdninstagram.com, instagram.f*.fbcdn.net
  const looksReal = /scontent[-.]|cdninstagram\.com\/v\/t51|instagram\.f\w+\.fbcdn\.net/.test(u);
  return !looksReal;
}

async function _fetchOgImage(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    for (const ua of USER_AGENTS) {
      const r = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': ua,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        redirect: 'follow',
      });
      if (!r.ok) continue;
      const html = await r.text();
      // Try og:image, og:image:secure_url, twitter:image
      const matches = [
        html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
        html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i),
        html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i),
      ];
      for (const m of matches) {
        if (!m || !m[1]) continue;
        const candidate = m[1].replace(/&amp;/g, '&');
        // Rejeita imagens genéricas do IG (logo, anonymous, default)
        if (_isGenericImage(candidate)) continue;
        return candidate;
      }
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Verifica se a URL responde com uma imagem real (não erro, não genérica)
async function _validateImage(url) {
  if (_isGenericImage(url)) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const r = await fetch(url, { method: 'HEAD', signal: controller.signal, redirect: 'follow' });
    clearTimeout(timer);
    if (!r.ok) return false;
    const ct = r.headers.get('content-type') || '';
    return ct.startsWith('image/');
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  const handleRaw = (req.query.handle || '').toString().trim();
  // Sanitize: só permite chars válidos de username do IG
  const handle = handleRaw.replace(/[^a-zA-Z0-9._]/g, '');
  if (!handle || handle.length > 30) {
    res.status(400).json({ error: 'Invalid handle' });
    return;
  }

  // CORS liberado — para o <img src> funcionar em qualquer origem
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Tenta 1: Scraping direto do Instagram
  const igUrl = `https://www.instagram.com/${handle}/`;
  let imageUrl = await _fetchOgImage(igUrl);

  // Tenta 2: unavatar.io — mas verifica que o resultado é uma imagem real,
  // não o logo genérico que o serviço devolve quando a Meta bloqueia
  if (!imageUrl) {
    const unavatarUrl = `https://unavatar.io/instagram/${handle}?fallback=false`;
    // Em alguns casos, unavatar devolve 302 pra uma URL real do IG CDN.
    // Validamos seguindo o redirect e checando se é imagem real.
    try {
      const r = await fetch(unavatarUrl, { redirect: 'follow' });
      if (r.ok) {
        const finalUrl = r.url || unavatarUrl;
        if (!_isGenericImage(finalUrl)) imageUrl = finalUrl;
      }
    } catch (e) { /* ignore */ }
  }

  // Validação final: imagem real + content-type image/*
  if (imageUrl && !(await _validateImage(imageUrl))) imageUrl = null;

  if (!imageUrl) {
    // Cache 404 por 1h pra não refazer o scraping toda hora
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }

  // Cache agressivo quando encontra: 12h no cliente + 24h edge
  res.setHeader('Cache-Control', 'public, max-age=43200, s-maxage=86400');
  res.redirect(302, imageUrl);
};
