# 3cos — manual do projeto

CRM interno da 3C (Pipeline, Contatos, Parceiros, Calendário, Dashboard, Copilot).
Dono: Diego (`diegodperdigao`). Mais de uma pessoa coda aqui, cada uma com o próprio
Claude Code. Este arquivo vale para todas: siga as regras abaixo.

## Como trabalhamos em dupla

- **Nunca envie direto para o `main`.** O `main` publica sozinho em
  https://3cos.vercel.app (produção, usada pela equipe todo dia).
- Toda melhoria nasce numa branch própria, a partir do `main` atualizado:
  `git switch main && git pull && git switch -c <quem>/<assunto>`
  (ex.: `diego/calendario-filtros`, `joao/importar-leads`).
- Ao terminar: `git push -u origin <branch>` e abra um Pull Request para o `main`
  (`gh pr create`). A Vercel gera um **link de prévia** no PR; teste por ele.
- O outro revisa/testa a prévia e faz o merge. Depois do merge, apague a branch.
- Antes de começar e antes de abrir o PR: `git pull origin main` (ou rebase) para
  pegar o que o outro já publicou.
- Uma branch = um assunto. PRs pequenos dão menos conflito.
- Combine quem mexe em qual módulo para não editarem o mesmo arquivo ao mesmo tempo.

### Conflitos que vão acontecer (e como resolver)

- `index.html`, `?v=N`: os dois aumentam o número. Fique com o **maior + 1** em
  todas as ocorrências.
- `css/styles.css`: os dois acrescentam estilos no fim. Mantenha **os dois blocos**.
- `js/app.js` / `js/users.js` (lista de módulos): mantenha as duas entradas.

## Arquitetura

- **Sem build.** HTML + JS puro (`index.html`, `js/*.js`, `css/styles.css`), servido
  como arquivo estático. Ícones via Lucide (`<i data-lucide="nome">` + `lucide.createIcons()`).
- **Cache:** a cada mudança em JS/CSS, aumente o `?v=N` em **todas** as tags do
  `index.html` (ex.: `sed -i '' 's/?v=243/?v=244/g' index.html`). Sem isso, a equipe
  continua vendo a versão velha.
- `api/*.js`: funções serverless da Vercel (Copilot, leads da LP, MCP, admin). Só
  rodam na Vercel; localmente não existem. Variáveis secretas ficam no painel da
  Vercel (Settings → Environment Variables, marcando Production + Preview), nunca no
  código. O Copilot usa Google Gemini: `GEMINI_API_KEY` (chave do AI Studio) e,
  opcional, `GEMINI_MODEL`.
- Login é só Supabase Auth (o Firebase foi removido; não reintroduza).
- **Banco:** Supabase, projeto "3cos" (`zolvuamsikxtobzafkao`), schema `crm`.
  O front usa a chave pública (anon) + RLS; `window.sb.schema('crm')`.
  Os dados são **reais e compartilhados**: local, prévia e produção usam o mesmo banco.
  Não crie dados de teste sem apagar depois (prefixe com `ZZ TESTE`).

### Módulos

Cada módulo é um IIFE em `js/<modulo>.js` que expõe `window.b<Modulo>(el)`.
Para criar um módulo novo:
1. `index.html`: `<div class="mod" id="mod-<id>"></div>` + `<script src="js/<id>.js?v=N">`.
2. `js/app.js`: entrada em `MODS`, no mapa do `buildMod`, `HERO_ICONS` e `ALL_MODS`.
3. `js/users.js`: `_ALL_MODULE_IDS` e `_MODULE_LABELS` (permissão por usuário).
4. Tabelas novas: incluir em `RT_TABLES` de `js/crm-data.js` (tempo real).

Estado global em `STATE` (`STATE.crm.*` para dados do CRM). Helpers globais:
`openModal(titulo, corpo, rodapé, {wide})`, `closeModal()`, `toast(msg, 's'|'w'|'e'|'i')`,
`modHdr()`, `heroHTML()`, `openMod(id)`.

### Sidebar e universos por marca (`js/shell.js`)

- A sidebar (`#app-side`) é só da 3C: **Início** e os módulos gerais. As marcas são
  escolhidas pelos cartões do Início (macro resultados do mês); dentro de uma marca, o bloco
  dela aparece no topo da sidebar. No celular: gaveta + barra inferior.
- Entrar numa marca (`enterBrand(productId, mod)`) liga `html[data-brand="<slug>"]`.
  **A base continua a da 3C** (fundo, texto, botões, tipografia). A marca entra só nos
  detalhes: logo, fio de acento, ícone da capa, aba ativa e foco (seção "Universos" no fim
  do `css/styles.css`). Cores conferidas nos sites oficiais; não usar a cor do cadastro.
- Dentro da marca, Dashboard, Pipeline, Parceiros e Calendário ficam presos a ela
  (`brandId()`, `brandProduct()`, `brandScope()`). `go3C(mod)` sai do universo.
- Pipeline por produto: `scope` = slug do produto (`chute`, `rips`, `sortudao`); B2B e B2C
  são os funis gerais da 3C. Produto novo ganha pipeline quando existirem etapas com o slug
  dele (ver `supabase/migrations/005_pipeline_por_produto.sql`).
- Produto novo com tema próprio: entrada em `BRANDS` (`js/shell.js`) + bloco de tokens CSS.
- Logo da 3C: só o oficial do 3c.gg (`assets/brand/3c-logo-branco.png` / `-preto.png`).

### Mudanças no banco

- Escreva um arquivo novo em `supabase/migrations/NNN_assunto.sql` (próximo número),
  **idempotente** (`IF NOT EXISTS`, `DROP ... IF EXISTS` antes de recriar).
- Padrão de tabela nova: `GRANT ALL ... TO authenticated, service_role`, RLS ligada com
  política `auth_all_<tabela>` (`FOR ALL TO authenticated USING (true) WITH CHECK (true)`),
  entrar na publicação `supabase_realtime`, trigger de `updated_at`.
- **Quem aplica o SQL é o Diego**, no SQL Editor do painel Supabase. Não rode SQL em
  produção por conta própria; avise no PR que há migration para aplicar e aplique
  **antes** do merge do código que depende dela.

## Regras de produto

- Interface em português do Brasil. Sem emojis: use ícones SVG (Lucide).
- Parceiros: só parcerias de **valor fixo** (RevShare/permuta/variável ficam fora).
  **Uma aba por produto** (Rips, Chute, CAP, Fortuna), nunca misturar.
- Resultados de parceiros somam no Dashboard via `AFF.all()` (`js/widgets.js`).
- Campos numéricos em R$ no formato brasileiro (`toLocaleString('pt-BR')`).

## Testar localmente

Qualquer servidor estático na pasta do projeto, por exemplo:
`python3 -m http.server 8080` e abrir http://localhost:8080 (precisa fazer login com
a conta do CRM). Recuperar senha, Copilot e outras rotas `/api` só funcionam na
Vercel (use o link de prévia do PR). Antes do PR: `node --check js/<arquivo>.js`.
