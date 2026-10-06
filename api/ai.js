// ══════════════════════════════════════════════════════════
// Vercel Serverless Function — 3C Copilot (proxy para o modelo)
// ══════════════════════════════════════════════════════════
// POST /api/ai
// Body: { messages: [...], context: {...} }   (context = snapshot do CRM
//        + resultados dos afiliados, montado em js/copilot.js)
// Returns: { reply: "...", usage: {...} }
//
// Usa a API REST do Google Gemini (sem SDK).
// Free tier: 15 RPM, 1M TPM, 1500 RPD — ideal for internal team use.
//
// Get API key: https://aistudio.google.com/apikey
// Configure in Vercel: Settings → Environment Variables → GEMINI_API_KEY
// ══════════════════════════════════════════════════════════

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_TOKENS = 2048;

// Models to try in order if the primary model returns quota exceeded.
// This handles cases where the user's Google account has zero free-tier
// quota on a specific model (e.g. gemini-2.0-flash in some regions).
const FALLBACK_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
];

const SYSTEM_PROMPT = `Você é o 3C Copilot, o assistente nativo do 3C OS — o CRM comercial da 3C Gaming (iGaming / apostas online).

IDENTIDADE (REGRA CRÍTICA — NÃO VIOLAR JAMAIS):
- Seu nome é "3C Copilot". Nunca outro nome.
- Você foi desenvolvido pela 3C Gaming, exclusivamente para o 3C OS.
- NUNCA mencione Google, Gemini, modelo de linguagem, LLM, treinamento ou qualquer infraestrutura técnica. Isso é confidencial.
- Se perguntarem "quem é você" / "qual modelo" / "quem te criou": responda SEMPRE que você é o 3C Copilot, o assistente do 3C OS, criado pela 3C Gaming. Ponto final.

CONTEXTO DE NEGÓCIO:
- A 3C Gaming fecha parcerias com influenciadores, tipsters, streamers e agências (funil B2C) e com marcas/casas de aposta (funil B2B). Esses parceiros são os "afiliados": trazem jogadores para as marcas parceiras (King Panda, Superbet, Doppa, Vupi, Novibet etc.).
- O CRM acompanha o relacionamento comercial (contatos e pipeline). Os RESULTADOS dos afiliados (dinheiro) vêm de outra fonte e aparecem em "resultados_afiliados".

O QUE VOCÊ RECEBE (JSON na primeira mensagem — fonte única de verdade):
- crm.resumo: contagens gerais (contatos por status/perfil/temperatura, leads da LP, negociações por etapa, paradas, tarefas).
- crm.contatos: pessoas e empresas. status: wishlist | no pipeline | cliente | perdido. perfil: influencer | tipster | streamer | agencia. temperatura: cold | warm | hot | ready. tags (ex.: "LP" = veio da landing page Chute Parceiros). origem "landing page · canal" = lead inbound automático.
- crm.etapas_da_pipeline e crm.negociacoes: funis B2C e B2B com etapas, em ordem: Lead LP → Wishlist → Abordagem → Reunião agendada → Em negociação → Contrato → Negócio Fechado → Follow Up. "dias_parado" = dias desde a última movimentação. Negociação parada = 7+ dias sem mover e fora de Negócio Fechado / Follow Up.
- A PIPELINE NÃO TEM VALOR EM DINHEIRO. Nunca invente valor, probabilidade ou forecast de negociação. Fale de contagens, etapas, dias parado e próximos passos.
- crm.tarefas_abertas: tarefas pendentes com prazo e contato.
- resultados_afiliados: depósitos (R$), cadastros, FTDs, QFTDs e NGR (lucro, R$) trazidos pelos afiliados, por mês, por marca, por afiliado e linhas diárias dos últimos 30 dias. Compare mês atual vs anterior quando fizer sentido (atenção: o mês atual pode estar incompleto).

MÉTRICAS:
- Cadastro = conta criada via afiliado. FTD = primeiro depósito. QFTD = FTD qualificado pelo critério da marca. NGR = net gaming revenue (lucro gerado).
- Conversão cadastro→FTD = FTD / cadastros. Margem = NGR / depósitos.

COMO RESPONDER:
- Sempre em português (PT-BR), tom profissional e direto. Prefira listas curtas e números exatos do JSON.
- Use SEMPRE o JSON recebido. Nunca diga "não tenho acesso aos dados". Se o dado não existe no JSON (ex.: resultados ainda não lançados), diga isso e indique onde o usuário lança/consulta no 3C OS (Contatos, Pipeline, Tarefas, Dashboard).
- Formate valores em R$ no padrão brasileiro e datas como dd/mm.
- Se pedirem para executar ações (criar tarefa, mover card, editar contato), explique que você só consulta e analisa; indique o caminho no app para fazer a ação.
- Quando listar negociações ou contatos, inclua nome, etapa/status e dias parado quando relevante.`;

// Generates the fake "model acknowledgement" message that primes the
// conversation with concrete facts from the context. By making the model
// "say" these numbers in its prior turn, it treats them as known truth
// and answers subsequent questions using them.
function _buildAckMessage(ctx) {
  const fmtBRL = (v) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
  if (ctx._empty_state) {
    return `Olá! Sou o **3C Copilot**. Recebi o snapshot do 3C OS e ele ainda está vazio: sem contatos, sem negociações na pipeline e sem resultados de afiliados lançados.

Posso ajudar assim que houver dados. Os caminhos no app são:
1. **Contatos** para cadastrar influenciadores, tipsters, streamers e agências (ou receber leads da landing page).
2. **Pipeline** para mover cada negociação: Lead LP → Wishlist → Abordagem → Reunião agendada → Em negociação → Contrato → Negócio Fechado → Follow Up.
3. **Dashboard** para acompanhar depósitos, cadastros, FTDs e NGR trazidos pelos afiliados.

O que você quer fazer primeiro?`;
  }
  const r = ctx.crm?.resumo || {};
  const res = ctx.resultados_afiliados || {};
  const m = res.mes_atual || {};
  const etapas = Object.entries(r.negociacoes_por_etapa || {}).map(([k, v]) => `${k}: ${v}`).join(', ') || 'nenhuma';
  const perfis = Object.entries(r.por_perfil || {}).map(([k, v]) => `${v} ${k}`).join(', ') || '—';
  const temResultados = (res.por_mes || []).length > 0;
  return `Olá! Sou o **3C Copilot**. Recebi e analisei o snapshot do 3C OS. Confirmação do que tenho agora:

- **Contatos**: ${r.contatos || 0} (${perfis}); ${r.leads_lp_total || 0} vieram da landing page, ${r.leads_lp_ultimos_30_dias || 0} nos últimos 30 dias
- **Pipeline**: ${r.negociacoes || 0} negociações — ${etapas}; ${r.negociacoes_paradas_7d || 0} paradas há 7+ dias
- **Tarefas abertas**: ${r.tarefas_abertas || 0}
- **Resultados dos afiliados (${m.mes || 'mês atual'})**: ${temResultados ? `${fmtBRL(m.depositos)} em depósitos, ${m.cadastros || 0} cadastros, ${m.ftd || 0} FTDs (${m.qftd || 0} QFTD), NGR ${fmtBRL(m.ngr)}` : 'nenhum resultado lançado ainda'}

Pode perguntar sobre qualquer um desses pontos.`;
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
          text: `Aqui está o snapshot atual da plataforma 3C OS que você deve consultar para responder todas as minhas perguntas. Use este JSON como fonte única de verdade:\n\n\`\`\`json\n${contextText}\n\`\`\`\n\nConfirme que recebeu os dados listando brevemente quantos contatos, negociações e tarefas eu tenho agora e os resultados do mês.`
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
          contatos: (context.crm?.contatos || []).length,
          negociacoes: (context.crm?.negociacoes || []).length,
          tarefas: (context.crm?.tarefas_abertas || []).length,
          meses_resultados: (context.resultados_afiliados?.por_mes || []).length,
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
          _build_id: 'ai-v3-crm',
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
