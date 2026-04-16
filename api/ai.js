// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Google Gemini proxy
// ══════════════════════════════════════════════════════════
// POST /api/ai
// Body: { messages: [...], context: {...} }
// Returns: { reply: "...", usage: {...} }
//
// Uses Google Gemini 2.0 Flash via REST API (no SDK needed).
// Free tier: 15 RPM, 1M TPM, 1500 RPD — ideal for internal team use.
//
// Get API key: https://aistudio.google.com/apikey
// Configure in Vercel: Settings → Environment Variables → GEMINI_API_KEY
// ══════════════════════════════════════════════════════════

const MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const MAX_TOKENS = 2048;

// Models to try in order if the primary model returns quota exceeded.
// This handles cases where the user's Google account has zero free-tier
// quota on a specific model (e.g. gemini-2.0-flash in some regions).
const FALLBACK_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

const SYSTEM_PROMPT = `Você é o 3C Copilot, um assistente de IA integrado ao 3C OS Pro — um CRM para gestão de afiliados na indústria de iGaming (apostas online).

CONTEXTO DE NEGÓCIO:
- A 3C Gaming é a operadora. Afiliados são parceiros que trazem jogadores para marcas (casas de aposta) parceiras.
- A 3C recebe comissão das marcas (via CPA, Revenue Share, ou modelos híbridos) e repassa uma parte aos afiliados.
- O lucro da 3C = Receita da marca - Comissão paga ao afiliado.

ENTIDADES PRINCIPAIS:
- brands (marcas parceiras): Vupi, Novibet, Superbet — cada uma com CPA/Rev Share base
- affiliates (afiliados): têm ftds, qftds, deposits, commission, profit, netRev, tags, notes
- contracts: deals entre afiliado ↔ marca
- payments: valores a pagar aos afiliados — status possíveis: pendente, aprovado, pago, ajuste, atrasado, vencido
- reports: dados diários de performance (FTD, QFTD, deposits, netRev)
- tasks: tarefas da operação
- closings: fechamentos mensais de comissão
- pipeline: kanban de negociações com afiliados

MÉTRICAS-CHAVE:
- FTD = First Time Deposit (primeiro depósito de um jogador)
- QFTD = Qualified FTD (FTD que atendeu critério mínimo da marca)
- Net Revenue = receita líquida da marca (depois de bônus, chargebacks)
- CPA = valor fixo por QFTD
- Rev Share = % da Net Revenue

COMO RESPONDER:
- Sempre em português (PT-BR), tom profissional mas acessível
- Conciso — prefira listas e destaques curtos
- Quando perguntado sobre dados específicos, use o contexto JSON fornecido abaixo
- Use formatação Markdown (negrito, listas) quando ajudar a legibilidade
- Se o usuário pedir ação (criar tarefa, alterar pagamento, etc), responda que você ainda não pode executar alterações — apenas consultar e analisar dados
- Se faltar dado no contexto pra responder, diga isso claramente e sugira onde o usuário pode encontrar`;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY não configurada',
      hint: 'Pegue uma chave grátis em aistudio.google.com/apikey e configure no Vercel: Settings → Environment Variables'
    });
  }

  try {
    const { messages = [], context = {} } = req.body || {};
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array obrigatório' });
    }

    const contextText = JSON.stringify(context, null, 2);
    const systemText = `${SYSTEM_PROMPT}\n\n---\nDADOS ATUAIS DO USUÁRIO (snapshot do STATE):\n\n${contextText}`;

    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Build ordered model list: primary first, then fallbacks (deduped)
    const tryOrder = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
    const attempts = [];

    for (const modelId of tryOrder) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.4 },
        }),
      });
      const data = await response.json();

      if (response.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ||
          '(sem resposta)';
        return res.status(200).json({
          reply,
          usage: data?.usageMetadata,
          model: modelId,
          finish_reason: data?.candidates?.[0]?.finishReason,
          attempts: attempts.length > 0 ? attempts : undefined,
        });
      }

      // Log attempt, decide whether to fallback
      const errMsg = data?.error?.message || `HTTP ${response.status}`;
      const isQuotaZero = response.status === 429 && /limit:\s*0/.test(errMsg);
      const isModelNotFound = response.status === 404;
      attempts.push({ model: modelId, status: response.status, error: errMsg });

      // Only fallback on "quota 0" or "model not found" — other errors are fatal
      if (!isQuotaZero && !isModelNotFound) {
        console.error('[api/ai] Gemini fatal error:', data);
        return res.status(response.status).json({
          error: errMsg,
          type: data?.error?.status || 'GeminiError',
          attempts,
        });
      }
    }

    // All models exhausted
    return res.status(429).json({
      error: 'Todos os modelos Gemini falharam. Verifique se sua conta Google tem acesso ao free tier em ai.dev/rate-limit',
      attempts,
    });
  } catch (err) {
    console.error('[api/ai] Exception:', err);
    return res.status(500).json({
      error: err.message || 'Erro interno',
      type: err.constructor?.name || 'UnknownError',
    });
  }
};
