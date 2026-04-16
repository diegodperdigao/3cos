// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — Claude API proxy
// ══════════════════════════════════════════════════════════
// POST /api/claude
// Body: { messages: [...], context: {...} }
// Returns: { reply: "...", usage: {...} }
//
// Keeps ANTHROPIC_API_KEY server-side (never exposed to browser).
// Requires env var ANTHROPIC_API_KEY in Vercel project settings.
// ══════════════════════════════════════════════════════════

const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.CLAUDE_MODEL || 'claude-opus-4-7';
const MAX_TOKENS = 2048;

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
  // CORS for same-origin (Vercel auto-handles same-origin; this is defensive)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY não configurada',
      hint: 'Configure a variável de ambiente no painel Vercel: Settings → Environment Variables'
    });
  }

  try {
    const { messages = [], context = {} } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array obrigatório' });
    }

    // Build the initial system + context message
    // Put the data context as the first cacheable system block so prompt caching works
    const contextText = JSON.stringify(context, null, 2);
    const systemBlocks = [
      { type: 'text', text: SYSTEM_PROMPT },
      {
        type: 'text',
        text: `\n\n---\nDADOS ATUAIS DO USUÁRIO (snapshot do STATE):\n\n${contextText}`,
        cache_control: { type: 'ephemeral' },
      },
    ];

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemBlocks,
      messages,
    });

    // Extract the text reply
    const textBlock = response.content.find(b => b.type === 'text');
    const reply = textBlock ? textBlock.text : '';

    return res.status(200).json({
      reply,
      usage: response.usage,
      model: response.model,
      stop_reason: response.stop_reason,
    });
  } catch (err) {
    console.error('[api/claude]', err);
    const status = err.status || 500;
    return res.status(status).json({
      error: err.message || 'Erro interno',
      type: err.constructor?.name || 'UnknownError',
    });
  }
}
