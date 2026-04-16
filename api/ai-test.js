// ══════════════════════════════════════════════════════════
// /api/ai-test — Diagnóstico público do Gemini
// ══════════════════════════════════════════════════════════
// Abra https://3cos.vercel.app/api/ai-test no navegador.
// Retorna JSON com o estado da API key e um teste mínimo.
// NÃO EXPÕE a chave — só reporta existência, formato e se funciona.
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
    test_call: null,
  };

  if (!apiKey) {
    result.diagnosis = 'FALHA: variável GEMINI_API_KEY não existe neste deploy. Adicione em Vercel Settings → Environment Variables → marque Production+Preview+Development → REDEPLOY com "Use existing build cache" DESMARCADO.';
    return res.status(200).json(result);
  }

  if (!apiKey.startsWith('AIza')) {
    result.diagnosis = 'FALHA: a chave não começa com "AIza" — isso não é uma chave do Google AI Studio. Gere uma nova em aistudio.google.com/apikey';
    return res.status(200).json(result);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Responda apenas com a palavra OK.' }] }],
        generationConfig: { maxOutputTokens: 10 },
      }),
    });

    const data = await response.json();
    result.test_call = {
      http_status: response.status,
      ok: response.ok,
      response_preview: data?.candidates?.[0]?.content?.parts?.[0]?.text || null,
      error: data?.error || null,
    };

    if (response.ok) {
      result.diagnosis = 'SUCESSO: a chave funciona e o Gemini respondeu. O Copilot deve funcionar no site. Se ainda não estiver funcionando, faça hard refresh (Ctrl+Shift+R).';
    } else if (response.status === 400 && data?.error?.message?.includes('API key not valid')) {
      result.diagnosis = 'FALHA: chave inválida/revogada. Gere uma nova em aistudio.google.com/apikey e atualize no Vercel.';
    } else if (response.status === 403) {
      result.diagnosis = 'FALHA: 403 — provavelmente Gemini API não está habilitada no projeto Google Cloud dessa chave, ou restrição de IP/referrer.';
    } else if (response.status === 404) {
      result.diagnosis = `FALHA: modelo "${model}" não encontrado. Tente deixar GEMINI_MODEL vazio (usa o padrão gemini-2.0-flash) ou use "gemini-1.5-flash".`;
    } else if (response.status === 429) {
      result.diagnosis = 'FALHA: 429 — passou do free tier (1500 req/dia). Aguarde ou use outro modelo.';
    } else {
      result.diagnosis = `FALHA: ${data?.error?.message || 'erro desconhecido'}`;
    }
  } catch (err) {
    result.test_call = { exception: err.message };
    result.diagnosis = `FALHA (exceção): ${err.message}`;
  }

  return res.status(200).json(result);
};
