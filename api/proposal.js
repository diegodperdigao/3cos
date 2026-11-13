// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — lê proposta + escopo e devolve os campos
// do fechamento (janela "Ganho" do Pipeline)
// ══════════════════════════════════════════════════════════
// POST /api/proposal
// Auth: Authorization: Bearer <JWT da sessão do CRM> (só usuário logado)
// Body: { text: "proposta/escopo colado, o mesmo enviado ao jurídico", today: "YYYY-MM-DD" }
// Returns: { fields: { deal_type, monthly_value, contract_months, start_date,
//            scope_mode, deliverables: [{kind, platform, qty, notes}],
//            goals, rev_share_pct, contract_url, summary, warnings: [] } }
//
// A IA só PREENCHE o formulário: a pessoa revisa antes de fechar o negócio.
// Usa a mesma chave do Copilot (GEMINI_API_KEY / GEMINI_MODEL no Vercel).
// ══════════════════════════════════════════════════════════

// Projeto e chave PÚBLICA (anon) do Supabase, as mesmas de js/supabase-client.js.
// Servem só para conferir o token da sessão em /auth/v1/user (sem chave de serviço).
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zolvuamsikxtobzafkao.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_pLaVyissnbo1jvOwfoG3pQ_ENDQZrpd';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
// Ordem de tentativa. O Gemini às vezes fica sobrecarregado (503) ou sem cota
// momentânea (429): troca de modelo e, se todos falharem, espera e tenta de novo.
const FALLBACK_MODELS = ['gemini-2.5-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'];
const ROUNDS = 3;                 // voltas pela lista de modelos
const ROUND_WAIT_MS = [0, 2500, 6000];
const ATTEMPT_TIMEOUT_MS = 12000; // por chamada
const BUDGET_MS = 45000;          // tempo total (a função tem 60s na Vercel)
const MAX_CHARS = 20000;

// Mesmos formatos e plataformas do módulo Parceiros (js/partners.js)
const KINDS = ['reel', 'story', 'post', 'short', 'video', 'live', 'other'];
const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Twitch', 'Kick', 'X', 'Discord', 'Outro'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    deal_type: { type: 'STRING', enum: ['fixo', 'revenue_share', 'minimo_garantido'], nullable: true },
    monthly_value: { type: 'NUMBER', nullable: true },
    contract_months: { type: 'INTEGER', nullable: true },
    start_date: { type: 'STRING', nullable: true, description: 'YYYY-MM-DD' },
    scope_mode: { type: 'STRING', enum: ['monthly', 'package'], nullable: true },
    deliverables: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          kind: { type: 'STRING', enum: KINDS },
          platform: { type: 'STRING', enum: PLATFORMS },
          qty: { type: 'INTEGER' },
          notes: { type: 'STRING', nullable: true },
        },
        required: ['kind', 'platform', 'qty'],
      },
    },
    goals: { type: 'STRING', nullable: true },
    rev_share_pct: { type: 'NUMBER', nullable: true },
    contract_url: { type: 'STRING', nullable: true },
    summary: { type: 'STRING' },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['deliverables', 'summary', 'warnings'],
};

const PROMPT = (text, today) => `Você lê propostas comerciais e escopos de parcerias de influenciadores/afiliados da 3C (iGaming, apostas, colecionáveis) e extrai os termos do negócio fechado para preencher um formulário. Responda SÓ com o JSON do schema, em português.

Hoje é ${today}.

Regras:
- deal_type:
  · "fixo" quando há só valor fixo pago ao parceiro;
  · "revenue_share" quando é só percentual de receita (RevShare/REV/comissão);
  · "minimo_garantido" quando há um valor fixo de MÍNIMO GARANTIDO junto com um percentual, e o parceiro recebe o que for MAIOR (ex.: "R$ 8000 de mínimo garantido + 30% de REV", "fixo de X ou Y% o que for maior"). Nesse caso monthly_value = o mínimo e rev_share_pct = o percentual.
  · Se não der para saber, null.
- monthly_value: valor MENSAL em reais (número, sem "R$"); no mínimo garantido, é o valor mínimo. Se a proposta só traz o valor total de um pacote/período, divida pelo número de meses e avise em warnings. Se não houver valor, null.
- contract_months: duração em meses (ex.: "trimestral" = 3, "semestral" = 6, "anual" = 12). Se não houver, null.
- start_date: data de início em YYYY-MM-DD. Datas relativas ("a partir de segunda", "início em dezembro") são calculadas a partir de hoje. Se não houver, null.
- scope_mode: "monthly" quando as entregas se repetem todo mês; "package" quando é um pacote fechado com total de entregas. Na dúvida, "monthly".
- deliverables: uma linha por tipo de entrega e plataforma. kind: reel (Reels), story (Stories), post (post no feed/carrossel), short (TikTok, YouTube Shorts, Kwai), video (vídeo longo no YouTube), live (live/stream), other (qualquer outra coisa: menção, link na bio, grupo, banner...). qty é sempre a quantidade POR MÊS quando scope_mode = "monthly" (converta: "1 por semana" = 4/mês, "3 stories por semana" = 12/mês) e o TOTAL quando scope_mode = "package". Use notes para detalhes curtos (ex.: "com link na bio", "collab", "fixado 7 dias").
- goals: metas e KPIs combinados (views, cadastros, FTDs, engajamento), em uma frase curta. Se não houver, null.
- rev_share_pct: para revenue_share e minimo_garantido (número, ex.: 30).
- Entregas sem prazo dito: considere o escopo do mês (scope_mode "monthly") e avise em warnings que a periodicidade não estava explícita.
- "Combo de stories" / "sequência de stories" = 1 story (kind story) por combo, com notes "combo/sequência". "Inserção em live" = kind live, com a duração em notes (ex.: "inserção de 15 min").
- contract_url: só se houver um link de contrato no texto.
- summary: 1 frase resumindo o acordo.
- warnings: o que ficou ambíguo ou foi deduzido e precisa ser conferido (vazio se nada).
- Nunca invente números que não estão no texto.

Texto:
"""
${text}
"""`;

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return await new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Garante tipos e listas válidas mesmo se o modelo escorregar
function sanitize(f) {
  const num = (v) => (v === null || v === undefined || v === '' || isNaN(Number(v)) ? null : Number(v));
  const int = (v) => { const n = num(v); return n === null ? null : Math.round(n); };
  const out = {
    deal_type: ['fixo', 'revenue_share', 'minimo_garantido'].includes(f.deal_type) ? f.deal_type : null,
    monthly_value: num(f.monthly_value),
    contract_months: int(f.contract_months),
    start_date: /^\d{4}-\d{2}-\d{2}$/.test(f.start_date || '') ? f.start_date : null,
    scope_mode: ['monthly', 'package'].includes(f.scope_mode) ? f.scope_mode : 'monthly',
    deliverables: (Array.isArray(f.deliverables) ? f.deliverables : [])
      .map(d => ({
        kind: KINDS.includes(d.kind) ? d.kind : 'other',
        platform: PLATFORMS.includes(d.platform) ? d.platform : 'Outro',
        qty: Math.max(1, int(d.qty) || 1),
        notes: d.notes ? String(d.notes).slice(0, 200) : '',
      })).slice(0, 30),
    goals: f.goals ? String(f.goals).slice(0, 500) : null,
    rev_share_pct: num(f.rev_share_pct),
    contract_url: /^https?:\/\//.test(f.contract_url || '') ? String(f.contract_url).slice(0, 500) : null,
    summary: String(f.summary || '').slice(0, 400),
    warnings: (Array.isArray(f.warnings) ? f.warnings : []).map(w => String(w).slice(0, 300)).slice(0, 10),
  };
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Só quem está logado no CRM
  const auth = String(req.headers.authorization || req.headers.Authorization || '');
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Faça login no CRM.' });
  try {
    const u = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` } });
    if (!u.ok) return res.status(401).json({ error: 'Sessão expirada. Entre de novo no CRM.' });
  } catch (e) {
    return res.status(500).json({ error: 'Não foi possível validar a sessão: ' + (e.message || e) });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no Vercel.' });

  let body;
  try { body = await readBody(req); } catch (_) { return res.status(400).json({ error: 'JSON inválido' }); }
  const text = String(body.text || '').trim().slice(0, MAX_CHARS);
  if (text.length < 20) return res.status(400).json({ error: 'Cole o texto da proposta e do escopo.' });
  const today = /^\d{4}-\d{2}-\d{2}$/.test(body.today || '') ? body.today : new Date().toISOString().slice(0, 10);

  const attempts = [];
  const started = Date.now();
  const models = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
  for (let round = 0; round < ROUNDS; round++) {
    if (ROUND_WAIT_MS[round]) await new Promise(r => setTimeout(r, ROUND_WAIT_MS[round]));
    for (const modelId of models) {
      if (Date.now() - started > BUDGET_MS) break;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ATTEMPT_TIMEOUT_MS);
      try {
        const r = await fetch(url, {
          method: 'POST',
          signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: PROMPT(text, today) }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 4096, responseMimeType: 'application/json', responseSchema: SCHEMA },
          }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          const msg = data?.error?.message || `HTTP ${r.status}`;
          attempts.push({ round, model: modelId, status: r.status, error: msg.slice(0, 200) });
          // Modelo fora, sem cota ou sobrecarregado: tenta o próximo
          if ([404, 408, 429, 500, 502, 503, 504].includes(r.status)) continue;
          return res.status(502).json({ error: 'A leitura da proposta falhou: ' + msg, attempts });
        }
        const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
        let parsed;
        try { parsed = JSON.parse(raw); } catch (_) {
          attempts.push({ round, model: modelId, error: 'resposta fora do formato' });
          continue; // resposta cortada ou fora do JSON: tenta outro modelo
        }
        return res.status(200).json({ fields: sanitize(parsed), model: modelId, attempts: attempts.length ? attempts : undefined });
      } catch (e) {
        attempts.push({ round, model: modelId, error: e.name === 'AbortError' ? 'tempo esgotado' : (e.message || String(e)) });
      } finally {
        clearTimeout(timer);
      }
    }
  }
  console.error('[api/proposal] todos os modelos falharam', attempts);
  return res.status(503).json({ error: 'A IA está sobrecarregada agora. Tente de novo em 1 minuto ou preencha as linhas à mão.', attempts });
};

module.exports.config = { maxDuration: 60 };
