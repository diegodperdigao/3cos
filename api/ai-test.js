// ══════════════════════════════════════════════════════════
// /api/ai-test — Diagnóstico completo do Gemini + context
// ══════════════════════════════════════════════════════════
// Abra https://3cos.vercel.app/api/ai-test no navegador.
// Faz duas chamadas de teste:
//   1. Teste básico: "diga OK" (confirma que a chave funciona)
//   2. Teste de contexto: envia systemInstruction com dado fake e
//      pergunta sobre ele (confirma que o contexto chega ao modelo)
// ══════════════════════════════════════════════════════════

module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

  const result = {
    timestamp: new Date().toISOString(),
    env: {
      has_GEMINI_API_KEY: !!apiKey,
      key_length: apiKey ? apiKey.length : 0,
      key_starts_with: apiKey ? apiKey.substring(0, 4) + '...' : null,
      key_format_ok: apiKey ? apiKey.startsWith('AIza') : false,
      GEMINI_MODEL: model,
      node_version: process.version,
    },
    basic_test: null,
    context_test: null,
  };

  if (!apiKey) {
    result.diagnosis = 'FALHA: variável GEMINI_API_KEY não existe neste deploy. Adicione em Vercel Settings → Environment Variables → marque Production+Preview+Development → REDEPLOY.';
    return res.status(200).json(result);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  // ── Test 1: basic call ──
  try {
    const r1 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas com a palavra OK.' }] }],
        generationConfig: { maxOutputTokens: 20 },
      }),
    });
    const d1 = await r1.json();
    result.basic_test = {
      http_status: r1.status,
      ok: r1.ok,
      response: d1?.candidates?.[0]?.content?.parts?.[0]?.text || null,
      error: d1?.error || null,
    };
    if (!r1.ok) {
      result.diagnosis = `FALHA no teste básico: ${d1?.error?.message || `HTTP ${r1.status}`}`;
      return res.status(200).json(result);
    }
  } catch (err) {
    result.basic_test = { exception: err.message };
    result.diagnosis = `FALHA (exceção no teste básico): ${err.message}`;
    return res.status(200).json(result);
  }

  // ── Test 2: systemInstruction with fake context ──
  try {
    const r2 = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text: 'Você tem acesso aos seguintes dados fictícios para testar:\n\nAfiliado "TesteXYZ" tem lucro de R$ 7777. Responda sempre com base nesses dados.'
          }]
        },
        contents: [{
          role: 'user',
          parts: [{ text: 'Qual é o lucro do afiliado TesteXYZ? Responda apenas com o número.' }]
        }],
        generationConfig: { maxOutputTokens: 30, temperature: 0 },
      }),
    });
    const d2 = await r2.json();
    const reply = d2?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const sawContext = reply.includes('7777');
    result.context_test = {
      http_status: r2.status,
      ok: r2.ok,
      response: reply,
      saw_context: sawContext,
      error: d2?.error || null,
    };

    if (!r2.ok) {
      result.diagnosis = `FALHA no teste de contexto: ${d2?.error?.message || `HTTP ${r2.status}`}`;
    } else if (sawContext) {
      result.diagnosis = 'SUCESSO COMPLETO: chave válida + systemInstruction funciona + Gemini lê o contexto. O Copilot deve estar funcionando. Se não, a conversa do usuário pode estar caching respostas antigas — abra o Copilot e clique em "+" para iniciar uma NOVA conversa.';
    } else {
      result.diagnosis = `FALHA PARCIAL: chave funciona mas o systemInstruction não está chegando ao modelo. Gemini respondeu "${reply}" ao invés de 7777. Modelo usado: ${model}.`;
    }
  } catch (err) {
    result.context_test = { exception: err.message };
    result.diagnosis = `FALHA (exceção no teste de contexto): ${err.message}`;
  }

  return res.status(200).json(result);
};
