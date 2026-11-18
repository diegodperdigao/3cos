# Referências de UI: Apple, HubSpot, Pipedrive, Attio, Folk, Close e Salesforce

Data: 11/11/2026 · Pedido por: Diego · Escopo: Pipeline, Contatos, Dashboard/Hub, Parceiros, Calendário

## Como esta análise foi feita

- **Com navegador (Claude in Chrome) e captura de tela:** o próprio 3cos em produção
  (Hub, Pipeline, Dashboard, Contatos, Parceiros, Calendário), apple.com (página do
  MacBook Pro e página de comparação de Macs), HubSpot (página de produto do CRM e
  central de ajuda), Pipedrive (página de recurso e central de ajuda, com print real do
  pipeline), Attio (home com telas de produto renderizadas: tabela e kanban), Folk (home
  com tela de produto: kanban + painel lateral) e Close (página do CRM com a caixa de
  entrada do produto).
- **Medições:** em Apple, Attio e Folk li as fontes, tamanhos, pesos e espaçamento de
  letra calculados pelo navegador (não é chute). Valores citados abaixo vêm dali.
- **Só por texto:** Salesforce Lightning. A página de produto deu 404 e a central de
  ajuda exige aceitar todos os cookies (não aceitei). Usei documentação oficial
  (Trailhead e developer.salesforce.com) via busca.
- **Limites:** HubSpot e Pipedrive não mostram o produto inteiro fora do login; os prints
  da central de ajuda são recortes. Não usei Mobbin/Refero (exigem conta). Não fiz login,
  não criei conta, não aceitei cookies além de recusar os opcionais.

---

## 1. Diagnóstico do 3cos hoje

O que dá a "cara de IA", com onde aparece (visto em https://3cos.vercel.app e no código):

1. **Tudo vira card com a mesma borda e o mesmo raio.** KPI, coluna de kanban, cartão de
   negócio, cartão de contato, parceiro, widget do Hub: todos `background:var(--bg2)` +
   `1px solid var(--gb)` + raio 10 a 12px (`.kpi`, `.kan-col`, `.kan-card`, `.ctc-tile`,
   `.ptn-card` em `css/styles.css`). Há 10 raios diferentes em uso (3, 4, 5, 6, 8, 9, 10,
   12, 14, 999px). Nada se diferencia por superfície.
2. **A fileira de 4 KPIs iguais se repete em todo módulo.** Dashboard (2 fileiras),
   Parceiros, Calendário, Auditoria, Usuários: ícone 14px + rótulo em caixa alta 11px +
   número 28px (`.kpi-row`, `.kpi-val` forçado a 28px com `!important` na linha ~2659).
   No Parceiros e no Calendário, 4 KPIs ocupam uma faixa inteira para mostrar "0", "0/0",
   "0", "0".
3. **Uma família só, sem escala.** Inter em título, rótulo, dado e botão. Montserrat só no
   logo e no cadeado. A folha tem **mais de 20 tamanhos de fonte** (8, 9, 9.5, 10, 10.5,
   11, 11.5, 12, 12.5, 13, 14, 15, 16, 18, 20, 22, 24, 26, 28, 30px) e **665
   `!important`**: sinal de ajustes em camadas, não de escala. Resultado: tudo entre 11 e
   13px, nada domina.
4. **Hierarquia invertida na faixa do topo.** A capa escura de cada módulo (`.hero`,
   ~110px de altura, ícone 52px + título 30px) é o elemento mais forte da tela e não
   carrega dado nenhum. O que importa (o board, a lista, os números) começa abaixo dela.
5. **Contatos em grade de cartões.** 2.022 contatos mostrados como cartões de ~140px de
   altura, 9 por linha (`.ctc-grid` / `.ctc-tile`): cabem ~30 por tela. Uma lista de 36px
   por linha mostraria ~20 por tela **com 6 a 8 colunas de dado** (canal, tier, seguidores,
   etapa no funil, dono, última interação) e permitiria ordenar.
6. **Cartão de negócio com ruído e sem prioridade.** No Pipeline cada cartão repete o
   selo "RIPS" mesmo dentro da aba Rips (`.kan-card-tag`), o nome está em 12px, e o sinal
   que mais importa (há quantos dias parado) aparece como texto pequeno no rodapé. O
   cabeçalho da coluna só mostra contagem.
7. **Cor sem sistema.** O rosa é acento de botão; estados usam cores soltas (vermelho,
   âmbar, verde em selos com fundo `cor + 22` em hex). O calendário já tem um uso bom
   (`--heat` pinta o dia pela intensidade), mas é exceção.
8. **Vazios sem desenho.** Dashboard mostra "R$ 0" e gráficos com eixo vazio; Parceiros e
   Calendário mostram fileiras de zeros. Estado vazio é tratado como dado.

---

## 2. Referências analisadas

### 2.1 Apple (apple.com), referência de acabamento, não de produto

Links: https://www.apple.com/macbook-pro/ · https://www.apple.com/mac/compare/
(com screenshot e medição)

Por que importa: é o exemplo mais claro de "poucos elementos com peso". A página de
comparação de Macs é, na prática, uma tabela de dados, e é ela que mais serve ao 3cos.

Observações:
- **Número grande, legenda pequena, nada de caixa.** Na comparação, "13.6″" ou
  "10-core" aparecem em ~40px semibold, com a legenda logo abaixo em ~12px. Sem borda,
  sem fundo, sem ícone antes do número. Três colunas alinhadas e muito espaço vertical
  entre linhas. A razão número:legenda é cerca de 3:1 (no 3cos, `.kpi-val` 28px contra
  `.kpi-lbl` 11px, mas o rótulo vem em cima, em caixa alta, com ícone, e compete).
- **Padrão "qualificador / valor / nota".** Na página do MacBook Pro: "Up to" pequeno,
  "24 hours" grande, "battery life" pequeno. O qualificador fica fora do número, e o
  número fica limpo.
- **Poucos neutros.** Medidos: texto principal `#f5f5f7`, secundário `#e8e8ed`, terciário
  `rgba(255,255,255,.8)`, fundo `#000`. Um só azul de ação (`#2997ff` no texto,
  botão preenchido). Nenhuma outra cor de interface.
- **Espaçamento de letra varia com o tamanho.** Medido: 17px com `-0.374px` (-0.022em),
  14px com `-0.224px` (-0.016em); títulos de 24 a 28px usam a variante Display com
  tracking próprio. O texto pequeno é levemente apertado, não aberto em caixa alta.
- **Uma divisória por seção, não uma por item.** "Quick Look" tem título 24px semibold e
  uma linha fina embaixo. Os itens abaixo não têm borda.
- **Uma ação primária por bloco.** Um botão "Buy" e um link "Learn more"; nada mais
  compete.

O que levar para o 3cos (traduzido para ferramenta densa):
- KPIs sem caixa: número grande + rótulo curto embaixo em caixa baixa, separados por
  espaço e, no máximo, por uma divisória vertical fina.
- Uma divisória por seção, título de seção com peso real (16 a 20px, 600).
- Tracking negativo leve em títulos e números grandes; caixa alta só em microrrótulo
  (cabeçalho de tabela), se tanto.
- Um acento só (o rosa) para ação e foco; o resto em 4 a 5 neutros.
- Não levar: o espaço vertical de página de marketing, fotos, rolagem cinematográfica.

### 2.2 HubSpot (produto CRM)

Links: https://www.hubspot.com/products/crm (screenshot) ·
https://knowledge.hubspot.com/object-settings/select-properties-to-show-on-records-in-board-view
(screenshot dos recortes e texto)

Por que importa: é o CRM mais configurável no board e no relatório de funil; mostra o que
um quadro de negócios precisa expor além do nome.

Observações:
- **Resumo por coluna (lane summary).** O board pode mostrar até 3 métricas agregadas
  por coluna (ex.: soma, contagem), no topo ou no pé da coluna, com opção de abreviar
  moeda ("$2K"). Fonte: artigo da central acima.
- **Cartão configurável, sem campos vazios.** Até 15 itens por cartão; chave para
  esconder propriedades vazias "para reduzir ruído"; ações rápidas (criar tarefa, nota)
  no canto inferior esquerdo e atividade anterior/próxima no canto inferior direito.
- **Coluna recolhível e cor por etapa.** Cada etapa tem cor própria editável; a coluna
  pode ser minimizada para esconder os cartões.
- **Funil como barras horizontais.** Na página do produto, o gráfico "Deal Stages
  Progress" mostra etapa à esquerda, barra proporcional e contagem dentro da barra. Lê
  melhor que colunas verticais para funil.
- **Marca separa título e texto.** Medido no site: títulos em HubSpot Serif 48px peso
  300; texto em HubSpot Sans 14 a 18px. É marketing, mas mostra o efeito de um par com
  contraste real (não levar a serifa para dentro do CRM; levar o princípio do contraste).

O que levar: rodapé do cartão com "próxima ação" à direita; esconder campos vazios;
resumo numérico no cabeçalho da coluna; funil em barras horizontais no Dashboard;
colunas recolhíveis (Perdido, Follow Up).

### 2.3 Pipedrive (produto: pipeline, listas, relatórios)

Links: https://support.pipedrive.com/en/article/pipeline-view (screenshot real do board) ·
https://support.pipedrive.com/en/article/the-rotting-feature ·
https://www.pipedrive.com/en/features/pipeline-management

Por que importa: é o kanban de vendas de referência; resolveu "o que está parado" melhor
que todos.

Observações (do print real do pipeline):
- **Cabeçalho de coluna em duas linhas:** nome da etapa em negrito; embaixo, em cinza
  menor, "valor total · N deals". A contagem vem junto do total, não num selo.
- **Cartão muito compacto (~50px):** título em negrito, uma linha cinza com
  pessoa/organização, e uma linha com valor + selo vermelho "22d" (dias parado).
  Nenhuma etiqueta de produto repetida.
- **Apodrecimento ("rotting"):** o cartão parado além do prazo da etapa ganha **fundo
  rosado inteiro**, e o prazo é configurado por etapa. É o sinal mais visível do board.
- **Ícone de status de atividade à direita do cartão:** triângulo amarelo quando não há
  próxima atividade marcada, círculo verde quando há, vermelho quando atrasada.
- **Ordenação padrão por próxima atividade**, e não por data de criação. A barra de
  ferramentas tem: alternância de visualização (board/lista/previsão), "+ Deal", contagem
  total, seletor de pipeline, filtro e ordenação.
- **Ganho/Perdido/Excluir por arrastar** o cartão para zonas de destino que aparecem ao
  arrastar (citado no artigo; não vi a animação).

O que levar: no 3cos já existe `_daysSince(card.updated_at)` e `ageClass` no cartão. Falta
dar a isso o peso do Pipedrive: prazo por etapa, cartão tingido quando passa do prazo, e
ícone de próxima tarefa. Ordenar por "mais parado primeiro" como opção.

### 2.4 Attio (escolhido: a interface de CRM mais refinada hoje)

Link: https://attio.com (screenshot e medição das telas de produto renderizadas na home)

Por que entrou: é o CRM que mais se aproxima de uma ferramenta "de ofício"
(tipografia, tabela, kanban). E usa **Inter**, o que prova que o problema do 3cos não é a
fonte e sim o uso dela.

Observações:
- **Inter + Inter Display.** Medido: h1 Inter Display 80px/600 com tracking -2.4px
  (-0.03em); h2 40px/500 com -0.4px; h3 24px/500 com -0.24px. Corpo Inter 16px/500 com
  -0.16px. A versão Display (ótica para tamanhos grandes) é o que dá o acabamento.
- **Título em dois tons.** "Your team, amplified." em preto, seguido do resto da frase em
  cinza no mesmo tamanho. Hierarquia sem mudar tamanho nem peso.
- **Tabela de 36px por linha, texto 14px.** Medido na tabela "Companies to work". Colunas
  separadas por linha vertical fina, cabeçalho com ícone do tipo do campo, nome do
  registro sublinhado como link, avatar 16px antes do dono, e a nota (ICP Score) num
  chip verde tingido. Checkbox na primeira coluna.
- **Cartão de kanban como lista de atributos.** Cada linha com ícone cinza do campo à
  esquerda: empresa (sublinhado), data, "USD" em cinza + valor em preto, dono com avatar
  colorido, "próximo passo" como campo editável em cinza. Rodapé com 3 ações em ícone
  (nota, tarefa, comentário) e idade "12d" à direita.
- **Coluna sem caixa.** Cabeçalho: bolinha de cor + nome + contagem num quadradinho cinza
  + "+" à direita. A coluna é só uma faixa de fundo levemente mais escura, sem borda.
- **Navegação lateral com Favoritos** e "Quick Actions ⌘K" fixo no topo.

O que levar: Inter com variante de tamanho ótico nos títulos; título de seção em dois
tons; tabela de Contatos a 36px; unidade em cinza e valor em preto ("R$" cinza, número
escuro); colunas do kanban sem borda.

### 2.5 Folk (escolhido: CRM de relacionamento, parecido com a operação de criadores)

Link: https://www.folk.app (screenshot e medição da tela de produto)

Por que entrou: o 3cos gere pessoas (criadores, influenciadores, parceiros), não só
empresas. Folk é o CRM mais bem resolvido para "relacionamento com pessoas".

Observações:
- **Cabeçalho de coluna como pílula tingida** com a cor da etapa ("Qualified",
  "Proposal sent") + contagem + **soma alinhada à direita** ($134,000).
- **Bloco "próxima ação" no pé do cartão**, com fundo levemente diferente: bolinha
  vermelha "Overdue" ou âmbar "Today" + o texto da tarefa. É o elemento que manda no
  cartão.
- **Números em fonte mono.** Medido: valores ($120,500) em Geist Mono 13px; títulos em
  grotesca própria (Uxum Grotesque 72px/500, tracking -1.8px); texto em Inter.
- **Painel lateral em vez de navegar.** Clicar num cartão abre a pessoa à direita (foto,
  empresa, resumo, abas "Interactions 12 / Notes 31 / Tasks 3" com contagem) sem sair do
  board. No topo do painel, um aviso: há quantos dias não houve contato + botão
  "Follow-up".
- **Status do contato como chip tingido** (Contacted, Warm, Push to campaign) com cor por
  estado.

O que levar: bloco de próxima ação no cartão; contagem nas abas; painel lateral do contato
(o 3cos já tem `_ctcOpenDetail` e um hover card, dá para unificar como gaveta); aviso de
"sem contato há N dias" no topo do contato.

### 2.6 Close (escolhido: densidade de lista e caixa de entrada)

Link: https://close.com/crm (screenshot da caixa de entrada e da lista de tarefas)

Por que entrou: é o CRM mais denso e orientado a "o que eu faço agora", bom modelo para a
lista de Contatos e para o Hub.

Observações:
- **Linha única por item.** Empresa em negrito + pessoa em cinza; assunto em negrito +
  prévia em cinza na mesma linha; tempo relativo alinhado à direita ("7h ago",
  "2 days ago"). Cerca de 8 itens visíveis num bloco pequeno.
- **Abas de filtro com ícone** (Primary, Emails, Calls, SMS, Tasks, Reminders) em
  segmento, com a ativa preenchida.
- **Tarefas com chip de data colorido:** vermelho para atrasada, azul para hoje, ao lado
  do responsável com avatar.
- **Título com par de pesos.** "Close more deals. Move faster." em duas linhas, mesmo
  tamanho, frase curta. Sem subtítulo longo competindo.

O que levar: lista de Contatos em linha única com metadado cinza na mesma linha; Hub com
uma lista "Para hoje" (tarefas e negócios parados) no lugar de cartões de atalho; chip de
data por estado.

### 2.7 Salesforce Lightning (escolhido: referência de densidade e de etapa) — só texto

Links: https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/data_service_display_density.htm ·
https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/visualize-success-with-path-and-kanban ·
https://developer.salesforce.com/docs/component-library/bundle/lightning:path

Por que entrou: define padrões que o mercado inteiro copiou (densidade selecionável,
barra de etapas, kanban com total por coluna). Não vi telas: análise sem captura.

Observações (da documentação):
- **Densidade escolhida pelo usuário:** "Comfy" (rótulo acima do campo, mais espaço),
  "Compact" (rótulo na mesma linha, menos espaço) e "Cozy" (intermediária). O admin
  define o padrão, o usuário troca quando quiser. O blog de lançamento fala em cerca de
  30% mais informação no modo compacto (não consegui abrir o blog; dado vindo do resumo
  da busca).
- **Path (barra de etapas em chevron)** no topo do registro: até 5 campos-chave e um
  texto de orientação por etapa, editáveis ali mesmo.
- **Kanban de oportunidades** agrupado por etapa, com o resumo da coluna = soma do valor
  por padrão, trocável para outro campo numérico ("Summarize by").

O que levar: um seletor de densidade (2 níveis bastam) guardado por usuário; barra de
etapas no detalhe do negócio com "o que fazer nesta etapa"; resumo da coluna trocável.

---

## 3. Padrões que se repetem (o que mais vale)

1. **O cabeçalho da coluna do kanban carrega número agregado**, não só contagem
   (Pipedrive, HubSpot, Folk, Salesforce). No 3cos a pipeline não mede dinheiro (comentário
   em `js/pipeline-crm.js`, linha 161), então o agregado certo é **alcance somado
   (seguidores)** e **quantos estão parados além do prazo**.
2. **O tempo parado é o sinal mais forte do cartão** (Pipedrive pinta o cartão, Folk põe
   "Overdue" em vermelho, Attio e HubSpot mostram idade/atividade no canto). No 3cos está
   em 10px cinza no rodapé.
3. **Cartão sem etiqueta redundante e sem campos vazios** (HubSpot esconde vazios;
   ninguém repete o nome do pipeline em cada cartão).
4. **Unidade cinza, valor escuro; números em fonte tabular ou mono** (Apple, Attio,
   Folk). O número é o protagonista da linha.
5. **Coluna sem borda; cartão com borda leve** (Attio, Pipedrive, Folk). Uma camada de
   contorno só, não duas.
6. **Título de seção com contraste real e uma divisória por seção** (Apple, Attio). Não
   cada bloco numa caixa.
7. **Painel lateral para detalhe** em vez de modal ou troca de tela (Folk, Attio,
   HubSpot), com abas que mostram contagem.
8. **Lista densa de 32 a 36px por linha** para registros em quantidade (Attio, Close,
   Pipedrive em lista). Grade de cartões fica para poucos itens com imagem.
9. **Poucos neutros e um acento.** Apple: 3 tons de texto + 1 azul. Attio: preto, cinza
   médio, cinza claro + azul. Cor de estado só onde há estado.

---

## 4. Proposta de direção visual

### 4.1 Tipografia (par definido, Google Fonts)

**Direção sugerida: Geist (interface e títulos) + Geist Mono (números e códigos).**

- Geist é uma grotesca de desenho mais "construído" que Inter (terminações retas,
  números mais largos), o que tira a cara de padrão sem perder legibilidade em 12 a 14px.
  Com tracking negativo em tamanhos grandes, chega perto do acabamento SF Pro da Apple.
- Geist Mono nos números de tabela, KPIs, valores em R$, seguidores e datas curtas dá o
  efeito Folk/terminal: o dado vira protagonista e as colunas alinham sozinhas.
- Montserrat fica só no logo (como já é). Remover do resto.

Alternativa de menor esforço (se não quiser trocar a família): manter **Inter** com o
eixo de tamanho ótico (`opsz`) ligado nos títulos (`font-optical-sizing:auto`) e usar
**JetBrains Mono** (já carregada) só nos números. É o caminho Attio.

```html
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Montserrat:wght@800&display=swap" rel="stylesheet">
```

### 4.2 Escala de tamanhos (8 degraus no lugar de 20+)

```css
:root{
  --fd:'Geist',system-ui,sans-serif;
  --fb:'Geist',system-ui,sans-serif;
  --fmono:'Geist Mono',ui-monospace,Menlo,monospace;

  --fs-11:11px;  /* microrrótulo, cabeçalho de tabela, legenda de gráfico */
  --fs-12:12px;  /* metadado, chip, rodapé de cartão */
  --fs-13:13px;  /* texto de tabela e de cartão (padrão da interface) */
  --fs-14:14px;  /* texto corrido, campos de formulário */
  --fs-16:16px;  /* título de seção / cabeçalho de coluna */
  --fs-20:20px;  /* título do módulo */
  --fs-28:28px;  /* número de destaque secundário */
  --fs-40:40px;  /* número herói (1 por tela, no máximo) */

  --tr-tight:-0.02em;  /* 20px ou mais */
  --tr-snug:-0.011em;  /* 13 a 16px */
  --lh-tight:1.15; --lh-ui:1.4;
}
```

Regras: caixa alta só em `--fs-11` de cabeçalho de tabela (e com `letter-spacing:0.04em`);
rótulo de KPI vira caixa baixa embaixo do número; pesos usados: 400, 500, 600 (700 só no
número herói, se precisar).

### 4.3 Densidade

```css
:root{
  --row-h:36px;          /* linha de tabela/lista (Attio) */
  --row-h-compact:30px;  /* modo compacto (Salesforce Compact) */
  --pad-cell:0 12px;
  --gap-1:4px; --gap-2:8px; --gap-3:12px; --gap-4:16px; --gap-6:24px; --gap-8:32px;
}
[data-density="compact"]{ --row-h:30px; --gap-3:8px; --gap-4:12px; }
```

- Tabela: 36px por linha, texto 13px, cabeçalho fixo 11px cinza, números à direita em
  `--fmono` com `font-variant-numeric:tabular-nums`.
- Cartão de kanban: padding 10px 12px, alvo de ~64 a 72px de altura com 3 linhas (título,
  contato, rodapé). Hoje passa de 90px por causa da linha de etiqueta.
- Faixa de capa do módulo (`.hero`): de ~110px para uma barra de título de 56px.

### 4.4 Neutros e cor

```css
:root{ /* escuro */
  --bg:#0e0f12;   /* fundo da página */
  --bg0:#0a0b0d;  /* faixa da coluna de kanban, fundo de painel */
  --bg2:#15171b;  /* superfície elevada (cartão, gaveta, modal) */
  --bg3:#1d2026;  /* hover, campo de formulário */
  --text:#ededef; --text2:#a1a4ab; --text3:#6b6f77; /* 3 tons, como a Apple */
  --gb:rgba(255,255,255,0.07); --gb2:rgba(255,255,255,0.12);

  /* estados: só onde há estado */
  --st-late:#ef5a5a;  --st-late-bg:color-mix(in srgb,#ef5a5a 10%,transparent);
  --st-today:#e8a33c; --st-today-bg:color-mix(in srgb,#e8a33c 12%,transparent);
  --st-ok:#34c285;    --st-ok-bg:color-mix(in srgb,#34c285 10%,transparent);
}
```

- Acento rosa (`--theme`) só para: ação primária, foco, aba ativa, item selecionado.
- Cor de etapa: só na bolinha do cabeçalho e no tingimento do cabeçalho da coluna (Folk).
- Cor de produto (Rips, Chute, CAP, Fortuna): só na aba e no calendário, não em cada
  cartão.
- Intensidade (calor) como já faz o calendário (`--heat`): estender para a coluna de
  dias parados e para a tabela de resultados de Parceiros.

### 4.5 Card x divisória, raio e sombra

- **Card só para coisa que se move ou se abre**: cartão de kanban, cartão de parceiro,
  gaveta, modal, menu.
- **Divisória para o resto**: KPIs (separados por linha vertical de 1px), seções do
  Dashboard (título + linha embaixo), linhas de tabela.
- **Nada (só espaço)**: entre grupos dentro de uma seção.
- Raio: 3 valores.

```css
:root{ --r-sm:6px; /* chip, botão pequeno, campo */
       --r-md:8px; /* cartão, botão */
       --r-lg:12px;/* gaveta, modal */
       --shadow-pop:0 12px 32px -12px rgba(0,0,0,.5); /* só em gaveta, menu, arraste */ }
```
- Sombra só em camada flutuante (menu, gaveta, cartão sendo arrastado). Cartão parado não
  tem sombra nem `translateY` no hover; o hover muda só a borda.

---

## 5. Plano de melhorias priorizado

| # | Melhoria | Onde | Impacto | Esforço |
|---|----------|------|---------|---------|
| 1 | Cartão de negócio: tirar o selo de produto quando a aba já é do produto; nome em 13px/600; idade como selo colorido ("22d", vermelho acima do prazo); cartão tingido (`--st-late-bg`) quando passa do prazo da etapa | `js/pipeline-crm.js` (`_cardHTML`), `.kan-card*` em `css/styles.css` | Alto | Pequeno |
| 2 | Cabeçalho da coluna em 2 linhas: nome + bolinha; embaixo, em 12px cinza, "N negócios · alcance somado · N parados" | `js/pipeline-crm.js` (render das colunas, linha ~197), `.kan-col-hdr` | Alto | Pequeno |
| 3 | KPIs sem caixa: número 28 a 40px em `--fmono`, rótulo em caixa baixa embaixo, divisória vertical entre eles; esconder a fileira inteira quando todos forem zero e mostrar um vazio desenhado | `.kpi-row`, `.kpi*` (e remover os `!important` da linha ~2659); `js/partners.js`, `js/calendar.js`, `js/dashboard.js` | Alto | Pequeno |
| 4 | Trocar par tipográfico (Geist + Geist Mono) e adotar a escala de 8 tamanhos; números de tabela/KPI em mono tabular | `index.html` (link de fontes), `:root` em `css/styles.css` | Alto | Médio (varrer tamanhos soltos) |
| 5 | Encolher a capa do módulo (`.hero`) para uma barra de título de 56px com o título em 20px e as ações à direita; o board/lista começa mais alto | `.hero*` em `css/styles.css`, `heroHTML()` em `js/app.js` | Alto | Pequeno |
| 6 | Contatos: visão em lista como padrão (36px, colunas: nome+e-mail, perfil, tier, seguidores, etapa, dono, última interação), grade de cartões vira opção | `js/contacts.js` (`ctc-list`), novo bloco `.ctc-table` | Muito alto | Médio |
| 7 | Bloco "próxima ação" no pé do cartão de negócio (tarefa vinculada com data, vermelho se atrasada, âmbar se hoje), e ícone de alerta quando não há próxima ação | `js/pipeline-crm.js` + dados de `js/tasks.js` | Alto | Médio |
| 8 | Colunas do kanban sem borda (só fundo `--bg0`), cartão com borda leve; colunas "Perdido" e "Follow Up" recolhíveis | `.kan-col`, `.kan-card` | Médio | Pequeno |
| 9 | Hub: trocar os 4 cartões de atalho por uma lista "Para hoje" estilo Close (tarefas atrasadas, negócios parados, entregas de parceiros do dia), uma linha por item com tempo à direita | `js/widgets.js`, Hub em `js/app.js` | Alto | Médio |
| 10 | Dashboard: funil comercial em barras horizontais (etapa, barra, número) no lugar de 4 KPIs; gráficos com estado vazio desenhado em vez de eixo vazio | `js/dashboard.js` | Médio | Médio |
| 11 | Parceiros > Resultados: tabela com números à direita em mono, linha de total fixa embaixo, células com intensidade (calor) por meta atingida | `js/partners.js`, estilos de tabela | Médio | Pequeno |
| 12 | Gaveta lateral do contato/negócio (abas com contagem: Interações, Notas, Tarefas; aviso "sem contato há N dias") no lugar de modal | `js/contacts.js` (`_ctcOpenDetail`), `js/pipeline-crm.js` | Alto | Grande |
| 13 | Seletor de densidade (Confortável/Compacto) por usuário, via `[data-density]` | `js/settings.js`, `:root` | Médio | Pequeno, depois de #4 |
| 14 | Limpeza: unificar raios em 3 tokens e reduzir os 665 `!important` (consolidar blocos de sobrescrita no fim da folha) | `css/styles.css` | Médio (base para tudo) | Grande |

Ordem sugerida: 1, 2, 3, 5 numa primeira branch (só CSS e templates, rápido de ver na
prévia); depois 4; depois 6 e 7; o resto conforme fôlego.

---

## 6. O que não fazer

- **Não transformar o CRM em página da Apple.** Espaço vertical generoso, fotos e
  números de 40px em toda parte matam a densidade. Número herói: no máximo um por tela.
- **Não copiar a fileira de KPIs com ícone de todos os SaaS.** Foi o que gerou o
  problema; as referências boas não fazem isso no produto.
- **Não importar a configuração infinita do HubSpot** (15 itens por cartão, 3 métricas por
  coluna, beta de visualizações). Para o 3cos, decidir os campos fixos é melhor que dar um
  editor de cartão.
- **Não usar fundo gradiente nem vidro** (Close e Attio usam isso no marketing, não no
  produto). A folha já tem resquícios de mosaico e glass desativados; não reativar.
- **Não pintar cada cartão com a cor do produto/etapa.** Cor de etapa fica no cabeçalho;
  cor no cartão só para estado (parado, atrasado).
- **Não usar serifa ou grotesca de exibição dentro das telas de trabalho** (HubSpot Serif,
  Uxum Grotesque são de marketing). Se quiser personalidade, que seja no título do módulo
  e no logo.
- **Não usar o painel de IA como herói da tela** (Attio põe o chat no centro da home). O
  Copilot do 3cos deve continuar como ação lateral.
- **Não copiar marca:** nada de logo, ilustração, mascote ou paleta das referências. O 3cos
  mantém rosa `#e4407f` e o nome 3COS.

---

## Fontes

- 3cos (produção, logado): https://3cos.vercel.app
- Apple: https://www.apple.com/macbook-pro/ · https://www.apple.com/mac/compare/
- HubSpot: https://www.hubspot.com/products/crm ·
  https://knowledge.hubspot.com/object-settings/select-properties-to-show-on-records-in-board-view
- Pipedrive: https://www.pipedrive.com/en/features/pipeline-management ·
  https://support.pipedrive.com/en/article/pipeline-view ·
  https://support.pipedrive.com/en/article/the-rotting-feature
- Attio: https://attio.com
- Folk: https://www.folk.app
- Close: https://close.com/crm
- Salesforce (só texto):
  https://developer.salesforce.com/docs/atlas.en-us.lightning.meta/lightning/data_service_display_density.htm ·
  https://trailhead.salesforce.com/content/learn/modules/leads_opportunities_lightning_experience/visualize-success-with-path-and-kanban ·
  https://developer.salesforce.com/docs/component-library/bundle/lightning:path
