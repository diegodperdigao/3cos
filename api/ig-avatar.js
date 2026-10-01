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
        if (m && m[1] && !m[1].includes('fallback') && !m[1].includes('default')) {
          return m[1].replace(/&amp;/g, '&');
        }
      }
    }
    return null;
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
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

  // Tenta 2: unavatar.io como fallback (muitas vezes já tem a foto cacheada)
  if (!imageUrl) {
    try {
      const r = await fetch(`https://unavatar.io/instagram/${handle}?fallback=false`, {
        redirect: 'manual',
      });
      // unavatar devolve 200 com a imagem ou 404 se não tiver
      if (r.ok) {
        imageUrl = `https://unavatar.io/instagram/${handle}?fallback=false`;
      }
    } catch (e) { /* ignore */ }
  }

  if (!imageUrl) {
    res.status(404).json({ error: 'Avatar not found' });
    return;
  }

  // Cache agressivo: 12h no cliente + edge
  res.setHeader('Cache-Control', 'public, max-age=43200, s-maxage=86400');
  res.redirect(302, imageUrl);
};
