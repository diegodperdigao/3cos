# 3C Copilot — Setup (Google Gemini, gratuito)

O Copilot usa **Google Gemini 2.0 Flash** via API, que tem um free tier generoso:
- **15 requisições por minuto**
- **1 milhão de tokens por minuto**
- **1.500 requisições por dia**

Para um time pequeno (5-10 pessoas, 20-50 perguntas/dia) isso é mais que suficiente
e **não tem custo**.

## Setup (única vez, ~3 minutos)

### 1. Gerar a chave no Google AI Studio
- Acesse https://aistudio.google.com/apikey
- Faça login com sua conta Google (**pode ser a mesma conta 3C Gmail**)
- Clique **Create API key → Create API key in new project** (ou escolha um projeto existente)
- Copie a chave (`AIza...`)

> ℹ️ A chave do AI Studio é **separada** da assinatura Gemini Advanced / Google One AI Premium.
> Aquelas dão acesso ao app `gemini.google.com` (consumidor). A API do AI Studio é para
> desenvolvedores e o free tier é suficiente pra este uso.

### 2. Configurar no Vercel
No painel do projeto `3cos.vercel.app`:

1. **Settings → Environment Variables → Add**
2. Campos:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: cola a chave (`AIza...`)
   - **Environments**: marque **Production + Preview + Development**
3. Clique **Save**
4. Vá em **Deployments → últimas deploys → ⋯ → Redeploy** para aplicar

### 3. (Opcional) Escolher outro modelo
Padrão: `gemini-2.0-flash` (rápido + inteligente). Para usar outro modelo,
adicione `CLAUDE_MODEL` ou `GEMINI_MODEL` como env var:

- `gemini-2.0-flash` — padrão, recomendado
- `gemini-2.5-flash` — mais recente, ligeiramente melhor
- `gemini-2.5-pro` — mais capaz, ainda gratuito mas com limites menores

## Usando o Copilot

1. Entre no 3C OS
2. **Configurações → Labs → Modo Beta: ON**
3. Botão verde flutuante aparece no canto inferior direito (com um pingo pulsando)
4. Clique e pergunte sobre:
   - Pagamentos vencidos / atrasados / próximos
   - Top afiliados por lucro / comissão / FTD
   - Tarefas pendentes do time
   - Análise de performance por marca
   - Resumos financeiros do período

## Perguntas frequentes

**A IA é individual por usuário?**
Sim. Cada usuário vê apenas o próprio chat (estado local no browser) e os próprios
dados (snapshot do STATE enviado com a request). Mas a chave Gemini é compartilhada
(uma variável do projeto Vercel serve todos os usuários do time).

**Tem memória?**
Atualmente não — a conversa é reiniciada quando você recarrega a página. Se quiser
persistência, dá pra adicionar uma tabela `ai_conversations` no Supabase depois.

**Posso usar a minha conta Google Pro?**
Gemini Advanced (app de consumidor) não se integra diretamente com a API. Mas você
pode gerar a chave do AI Studio **com a mesma conta Gmail** que usa o Gemini
Advanced — os dois produtos rodam sob o mesmo login Google.

**Segurança dos dados**
O snapshot enviado é um resumo do STATE (top 20 afiliados, resumo de pagamentos,
tarefas abertas). No free tier, o Google **pode usar os dados** para melhorar modelos.
Para garantir privacidade total, é necessário o tier pago. Para uso interno sem PII
sensível (sem CPF, sem senha), o free tier é seguro.

## Troubleshooting

**"GEMINI_API_KEY não configurada"**
- Configure a env var no Vercel e redeploy.

**"API key not valid"**
- Chave copiada com espaços ou incompleta. Gere uma nova e cole sem editar.

**"429 Resource exhausted" / "RESOURCE_EXHAUSTED"**
- Passou do limite de 15 RPM ou 1500 RPD. Espere um minuto ou aumente para modelo pago.

**Botão flutuante não aparece**
- Verifique: Beta Mode ON + usuário logado
- Hard refresh (Ctrl+Shift+R)
