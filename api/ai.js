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
- Você RECEBEU o snapshot COMPLETO dos dados da plataforma na primeira mensagem da conversa (em formato JSON). Consulte SEMPRE esse JSON para responder perguntas específicas. Nunca diga "não tenho acesso aos dados" — você tem, basta ler o JSON que foi compartilhado no primeiro turno da conversa.
- Use formatação Markdown (negrito, listas) quando ajudar a legibilidade
- Se o usuário pedir ação (criar tarefa, alterar pagamento, etc), responda que você ainda não pode executar alterações — apenas consultar e analisar dados
- Se faltar dado no contexto pra responder, diga isso claramente e sugira onde o usuário pode encontrar`;

// Generates the fake "model acknowledgement" message that primes the
// conversation with concrete facts from the context. By making the model
// "say" these numbers in its prior turn, it treats them as known truth
// and answers subsequent questions using them.
function _buildAckMessage(ctx) {
  // If the platform is empty (fresh setup, no data yet), acknowledge that
  // and pivot to helpful onboarding instead of complaining about missing data.
  if (ctx._empty_state) {
    return `Recebi o snapshot da sua plataforma. Ela está recém-configurada — ainda não tem dados cadastrados (zero afiliados, zero pagamentos, zero tarefas).

Posso te ajudar a começar. Os passos típicos são:

1. **Cadastrar marcas parceiras** no módulo *Marcas* (Vupi, Novibet, etc — com CPA base e Rev Share)
2. **Cadastrar afiliados** no módulo *Afiliados* (com os deals negociados por marca)
3. **Lançar performance** no módulo *Dashboard* (FTDs, QFTDs, depósitos por dia)
4. **Executar fechamento** mensal no módulo *Financeiro* (gera pagamentos automaticamente)

Depois que tiver dados lançados, posso te ajudar com análises: top afiliados, pagamentos vencidos, performance por marca, previsões, etc. O que você quer fazer primeiro?`;
  }

  const affCount = (ctx.affiliates || []).length;
  const payBuckets = ctx.payments_by_status || {};
  const totalPayments = Object.values(payBuckets).reduce((s, b) => s + (b.count || 0), 0);
  const taskCount = (ctx.tasks || []).filter(t => t.status !== 'concluída').length;
  const contractCount = (ctx.contracts || []).length;
  const brands = Object.keys(ctx.brands || {});

  // List top 3 affiliates by profit so the model has them explicit
  const top3 = [...(ctx.affiliates || [])]
    .sort((a, b) => (b.profit || 0) - (a.profit || 0))
    .slice(0, 3)
    .map(a => `${a.name} (lucro R$${(a.profit || 0).toLocaleString('pt-BR')}, ${a.ftds || 0} FTDs, ${a.qftds || 0} QFTDs)`)
    .join(', ') || 'nenhum';

  const statusSummary = Object.entries(payBuckets)
    .map(([k, v]) => `${v.count} ${k} (R$${(v.total || 0).toLocaleString('pt-BR')})`)
    .join(', ') || 'nenhum';

  return `Recebi e analisei o snapshot. Confirmação dos dados que tenho agora:

- **Afiliados**: ${affCount} cadastrados
- **Top 3 por lucro 3C**: ${top3}
- **Marcas parceiras**: ${brands.join(', ') || 'nenhuma'}
- **Contratos**: ${contractCount}
- **Pagamentos**: ${totalPayments} no total — ${statusSummary}
- **Tarefas abertas**: ${taskCount}

Estou pronto para responder qualquer pergunta sobre esses dados. O que você quer saber?`;
}

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

    // systemInstruction holds only the PERSONA (how to act, tone, rules).
    // Data goes in the messages array as a primed user/model turn so the
    // model treats it as concrete facts in the conversation, not easily
    // dropped preamble. Works reliably on all Gemini flash variants.
    const systemText = SYSTEM_PROMPT;

    // Build primed context turn (user dumps data, model acknowledges).
    // Then append the real conversation.
    const primedContext = [
      {
        role: 'user',
        parts: [{
          text: `Aqui está o snapshot atual da plataforma 3C OS que você deve consultar para responder todas as minhas perguntas. Use este JSON como fonte única de verdade:\n\n\`\`\`json\n${contextText}\n\`\`\`\n\nConfirme que recebeu os dados listando brevemente quantos afiliados, pagamentos e tarefas eu tenho na plataforma agora.`
        }]
      },
      {
        role: 'model',
        parts: [{
          text: _buildAckMessage(context)
        }]
      }
    ];

    const userMessages = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const contents = [...primedContext, ...userMessages];

    // Build ordered model list: primary first, then fallbacks (deduped)
    const tryOrder = [MODEL, ...FALLBACK_MODELS.filter(m => m !== MODEL)];
    const attempts = [];

    for (const modelId of tryOrder) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemText }] },
          contents,
          generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.4 },
        }),
      });
      const data = await response.json();

      if (response.ok) {
        const reply =
          data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') ||
          '(sem resposta)';
        // Debug: echo back what we actually sent so frontend can verify
        const contextStats = {
          affiliates: (context.affiliates || []).length,
          contracts: (context.contracts || []).length,
          tasks: (context.tasks || []).length,
          payments_statuses: Object.keys(context.payments_by_status || {}),
          brands: Object.keys(context.brands || {}),
          context_bytes: contextText.length,
          contents_turns: contents.length,
        };
        return res.status(200).json({
          reply,
          usage: data?.usageMetadata,
          model: modelId,
          finish_reason: data?.candidates?.[0]?.finishReason,
          attempts: attempts.length > 0 ? attempts : undefined,
          _debug_context_stats: contextStats,
          _build_id: 'ai-v2-primed',
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
