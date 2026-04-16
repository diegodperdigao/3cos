# 3C Copilot — Setup

O Copilot é uma feature Beta que integra o Claude (IA da Anthropic) ao 3C OS.

## Como funciona

```
[Browser]  →  /api/claude  (Vercel serverless)  →  Anthropic API  →  resposta
```

A chave da API fica SOMENTE no backend (variável de ambiente Vercel). O frontend
nunca vê a chave.

## Setup (única vez)

### 1. Criar conta na Anthropic
- Acesse https://console.anthropic.com
- Crie uma conta
- Vá em **Settings → API Keys → Create Key**
- Copie a chave (`sk-ant-...`)
- Coloque créditos na conta (mínimo US$ 5)

### 2. Configurar Vercel
No painel do projeto Vercel (`3cos.vercel.app`):

1. **Settings → Environment Variables**
2. Add New:
   - Key: `ANTHROPIC_API_KEY`
   - Value: `sk-ant-api03-...` (sua chave)
   - Environments: Production + Preview + Development (todos)
3. Save
4. **Redeploy** (Deployments → ... → Redeploy)

### 3. (Opcional) Escolher modelo
Padrão: `claude-opus-4-7` (mais inteligente).

Para usar modelo mais barato, adicione outra env var:
- `CLAUDE_MODEL = claude-haiku-4-5` (5× mais barato, ~1/5 da qualidade)
- `CLAUDE_MODEL = claude-sonnet-4-6` (meio-termo)

## Usando o Copilot

1. Entre no 3C OS
2. Vá em **Configurações → Labs**
3. Ative **Modo Beta**
4. Um botão flutuante roxo aparece no canto inferior direito
5. Clique e pergunte qualquer coisa sobre:
   - Pagamentos (vencidos, atrasados, totais)
   - Afiliados (top performers, em risco)
   - Tarefas pendentes
   - Análise de performance por marca
   - Resumos financeiros

## Custos

Claude API é **pay-per-use** (sem plano grátis permanente):

| Modelo | Input (por 1M tokens) | Output (por 1M tokens) |
|---|---|---|
| Opus 4.7 | $5.00 | $25.00 |
| Sonnet 4.6 | $3.00 | $15.00 |
| Haiku 4.5 | $1.00 | $5.00 |

**Estimativa**: uma pergunta típica envia ~5K tokens de contexto (dados do STATE)
e recebe ~500 tokens de resposta. Custo aproximado por pergunta:

- Opus 4.7: ~$0.04 (R$ 0.20)
- Haiku 4.5: ~$0.008 (R$ 0.04)

Para uso interno de um time pequeno (10-50 perguntas/dia), custo mensal fica
entre US$ 10–60 no Opus ou US$ 2–12 no Haiku.

## Segurança

- ✅ Chave da API nunca chega ao browser
- ✅ Requests passam pelo domínio do projeto (mesma origem)
- ✅ Anthropic não treina modelos com dados enviados via API
- ⚠️ Não coloque PII sensível (CPFs, senhas) nas perguntas — o snapshot do STATE
  é enviado como contexto em cada request

## Troubleshooting

**"ANTHROPIC_API_KEY não configurada"**
- Você não configurou a env var no Vercel, ou esqueceu de redeployar

**"401 authentication_error"**
- Chave inválida ou expirada — gere uma nova no console.anthropic.com

**"429 rate_limit_error"**
- Muitas requests em pouco tempo — aguarde alguns segundos

**Botão flutuante não aparece**
- Verifique se Beta Mode está ON em Configurações → Labs
- Verifique se você está logado
