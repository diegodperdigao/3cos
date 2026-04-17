# 3C OS — Especificação de Tema

Documento pra designer (ou IA de design) criar um novo tema completo para a plataforma **3C OS Pro**.

---

## 1. Visão geral do sistema

A plataforma já tem **3 temas** funcionando: `Default`, `Mono` e `Nebula`. Um novo tema é uma "skin" completa aplicada sobre a mesma estrutura HTML. Não é só trocar uma cor — é redesenhar a linguagem visual de todo o sistema mantendo a usabilidade.

**Aplicação técnica:** O tema é ativado via atributo `data-edition="NOME"` no `<html>`. Todo o CSS fica num único arquivo (`css/styles.css`) no final. O designer entrega um **bloco CSS** que será colado no arquivo.

**Dark + Light:** Cada tema precisa funcionar em **modo claro E escuro**. Seletor combinado: `[data-edition="novo"][data-theme="dark"]` vs `[data-edition="novo"][data-theme="light"]`.

---

## 2. Variáveis CSS (obrigatórias)

O tema PRECISA sobrescrever estas variáveis no seletor raiz. Cada uma controla uma categoria:

### Backgrounds (fundos)
| Variável | Uso | Exemplo (Default dark) |
|---|---|---|
| `--bg` | Fundo geral da página | `#060810` |
| `--bg2` | Fundo de superfícies elevadas (cards, modais, action center) | `rgba(15,18,28,0.7)` |
| `--bg3` | Fundo de inputs e superfícies terciárias | `rgba(255,255,255,0.04)` |

### Bordas
| Variável | Uso | Exemplo |
|---|---|---|
| `--gb` | Borda padrão (sutil) | `rgba(255,255,255,0.07)` |
| `--gb2` | Borda média (hover, divisores) | `rgba(255,255,255,0.1)` |
| `--gb3` | Borda forte (focus) | `rgba(255,255,255,0.14)` |

### Texto
| Variável | Uso | Exemplo |
|---|---|---|
| `--text` | Texto principal (títulos, valores importantes) | `#f1f5f9` |
| `--text2` | Texto secundário (labels, subtítulos) | `#94a3b8` |
| `--text3` | Texto terciário (placeholder, meta info) | `#4b5563` |

### Cor do tema (accent principal)
| Variável | Uso | Exemplo |
|---|---|---|
| `--theme` | Cor accent do tema (botões, links, active states) | `#ec4899` |
| `--theme-dim` | Versão bem clara para backgrounds sutis | `rgba(236,72,153,0.08)` |
| `--theme-b` | Versão média para bordas e estados hover | `rgba(236,72,153,0.15)` |
| `--theme-glow` | Versão para box-shadow/glow effects | `rgba(236,72,153,0.2)` |

### Cores semânticas (NÃO MUDAR — são semânticas)
Essas devem permanecer reconhecíveis em qualquer tema porque carregam significado:
| Variável | Significado | Default |
|---|---|---|
| `--red` | Erro, pagamento vencido, ação destrutiva | `#ef4444` |
| `--amber` | Aviso, pagamento atrasado | `#f59e0b` |
| `--green` | Sucesso, pago, conectado | `#10b981` |
| `--blue` | Info, aprovado | `#3b82f6` |
| `--pink` | Acento decorativo, QFTDs | `#ec4899` |
| `--purple` | Acento decorativo | `#a855f7` |
| `--lime` | Auditoria | `#c8ff00` |

> **Regra:** O tema pode ajustar o tom dessas cores (ex: verde mais escuro no light mode) mas não pode mudar radicalmente (não use roxo como "verde" porque quebra a leitura semântica).

### Outros
| Variável | Uso | Exemplo |
|---|---|---|
| `--radius` | Raio de cantos padrão | `14px` |
| `--space` | Espaçamento padrão | `16px` |
| `--fd` | Fonte display (números, títulos) | `'Montserrat', sans-serif` |
| `--fb` | Fonte body (texto corrido) | `'Inter', sans-serif` |

---

## 3. Elementos a serem estilizados

Lista completa dos componentes UI que o tema deve tratar. Cada item tem a(s) classe(s) CSS correspondente(s).

### Navegação e estrutura
- **Hub principal** (`.hub-main`, `.hub-bg`, `.hub-identity`) — tela inicial com cards dos módulos
- **Hub cards** (`.hub-app`, `.hub-app-icon`, `.hub-app-name`) — botões dos 10 módulos
- **Hub bar** (`.hub-bar`) — barra topo com logo, busca, ícones de ação
- **Module header** (`.mod-hdr`, `.mod-hdr-name`, `.mod-hdr-logo`) — topo dentro dos módulos
- **Hero** (`.hero`, `.hero-eyebrow`, `.hero-title`, `.hero-sub`, `.hero-accent`) — banner no topo de cada módulo
- **Mobile sidebar** (`.mob-sidebar`, `.mob-sb-item`) — menu lateral no mobile

### Cards e superfícies
- **KPI cards** (`.kpi`, `.kpi-val`, `.kpi-lbl`, `.kpi::before`) — indicadores numéricos (ex: "Total Pago R$ 1M")
- **Intelligence cards** (`.intel-wrap`, `.intel-card`, `.intel-eye`) — cards analíticos do dashboard
- **Affiliate cards** (`.aff-card`, `.aff-name`, `.aff-stat-v`) — cards na listagem de afiliados
- **User cards** (`.user-card`) — cards na tela de usuários
- **Task cards** (`.tk`, `.tk-ttl`, `.tk-desc`) — cards de tarefas
- **Kanban cards** (`.kanban-col`, `.kanban-card`) — pipeline de vendas
- **Settings cards** (`.st-card`, `.st-section`) — tela de configurações
- **Action Center cards** (`.ac-card`) — notificações
- **Financial calendar** (`.fin-card`, `.fin-cal-day`) — calendário financeiro

### Controles
- **Botões primary** (`.btn-theme`) — ação principal
- **Botões outline** (`.btn-outline`) — ação secundária
- **Botões ghost** (`.btn-ghost`) — ação terciária
- **Icon buttons** (`.hdr-btn`, `.hub-icon-btn`, `.ibt`) — botões só com ícone
- **Tabs** (`.tab`, `.tab.on`) — navegação por abas
- **Pills** (`.pill`, `.pill.on`, `.pill-tag`) — filtros e tags
- **Form inputs** (`.fi`, textarea) — campos de texto/select
- **Search pill** (`.search-pill`, `.search-panel`) — campo busca global
- **Toggle switches** (`.st-switch`, `.st-switch-track`) — on/off
- **Segmented controls** (`.st-seg`) — dark/light, densidade

### Badges e indicadores
- **Payment status** (`.pb-pago`, `.pb-pendente`, `.pb-vencido`, `.pb-atrasado`, `.pb-aprovado`, `.pb-ajuste`) — status de pagamento (semântico — mantém verde/amarelo/vermelho)
- **Task priority** (`.pri-a`, `.pri-m`, `.pri-b`) — prioridade alta/média/baixa
- **Contract type** (`.ct-badge`, `.ct-cpa`, `.ct-tiered`, etc.) — tipo de contrato
- **Ranking** (`.rank-badge`, `.rank-gold`, `.rank-silver`, `.rank-bronze`) — top 3 com medalhas
- **Role badge** (`.role-badge`) — cargo do usuário
- **Last contact** (`.lc-ok`, `.lc-warn`, `.lc-danger`) — status de último contato
- **Sync pill** (`.sync-pill`, `.sync-dot`) — "Cloud Sync" (mantém verde)
- **Beta pill** (`.beta-pill`) — sinal de "Modo Beta ativo"
- **Notification dot** (`.hub-notif-badge`, `.ac-notif-dot`) — contador de notificações

### Tabelas e dados
- **Tables** (`table`, `th`, `td`, `.tr:hover`) — tabelas de dados
- **Rank cells** (`.td-rank`, `.td-name`, `.td-num`, `.td-money`) — células especializadas
- **Chart canvas** (`.chart-wrap canvas`) — gráficos Chart.js

### Overlays e flutuantes
- **Modal** (`.modal`, `.modal-hdr`, `.modal-ttl`, `#modal-ov`) — diálogos
- **Action Center** (`#action-center`, `.ac-hdr`, `.ac-title`) — painel lateral direito
- **Toast** (`.toast`) — notificações efêmeras
- **Scrollbar** (`::-webkit-scrollbar`, `-thumb`) — barra de rolagem

### Copilot (Beta)
- **Floating button** (`#copilot-fab`, `.cp-fab-pulse`) — botão canto inferior direito
- **Drawer** (`#copilot-drawer`, `.cp-hdr`, `.cp-body`) — painel de chat à direita
- **Messages** (`.cp-msg`, `.cp-msg-user`, `.cp-msg-assist`, `.cp-bubble`) — bolhas de chat
- **History sidebar** (`.cp-history-panel`, `.cp-hist-item`) — histórico de conversas
- **Input** (`.cp-input`, `.cp-send`) — campo de envio

### Elementos decorativos
- **Mosaic** (`.mosaic-pattern`, `.mosaic-wrapper`) — padrão de fundo animado (logo 3C repetido)
- **Logo** (`.hub-wordmark`, `.hub-wordmark em`) — "3C**OS**" — o `em` costuma ter acento diferente

---

## 4. Referências visuais (temas existentes)

Para entender o que já foi feito:

### Default (Pink)
- Dark: fundo `#060810` (quase preto com azul), texto branco, accent rosa `#ec4899`
- Light: fundo `#f8fafc` (quase branco), accent rosa mais escuro `#db2777`
- Aesthetic: moderno, jovem, gaming
- Cards: glass morphism sutil (transparência + blur)

### Mono
- Dark: preto puro `#0a0b0e` + branco puro `#fafafa`, todas as cores viram branco
- Light: cinza claro + preto
- Aesthetic: editorial, tipográfico, alto contraste
- Bordas retas, sem arredondamento excessivo
- Trata o produto como um objeto editorial

### Nebula
- Dark: preto espacial `#07070c` + violeta `#a78bfa`
- Light: branco rosado + violeta escuro `#7c3aed`
- Aesthetic: cosmic, sci-fi, estrelado (fundo tem pontos brancos sutis)
- Cards mais arredondados (18-20px)
- Um único accent (violeta) contra cinza neutro

---

## 5. Regras de ouro

1. **Acessibilidade:** contraste mínimo WCAG AA (4.5:1 para texto body, 3:1 para texto grande).
2. **Dark + light obrigatórios:** nada de tema "só dark". Ambos os modos devem funcionar.
3. **Cores semânticas:** vermelho continua sendo "ruim", verde "bom", amarelo "atenção". Não troque isso.
4. **Hierarquia tipográfica:** 3 níveis de texto (`--text`, `--text2`, `--text3`) com contraste decrescente claro.
5. **Borders sutis:** 1px, nada de bordas de 3px neon a menos que seja um hover intencional.
6. **Performance:** sem `filter: blur()` pesado, sem animações infinitas em elementos grandes (só em detalhes como dots).
7. **Mobile:** testar em 375px de largura — cards, sidebar, menu hambúrguer.
8. **Fontes:** manter Montserrat (números/títulos) e Inter (body). Não importar novas fontes sem necessidade.

---

## 6. Entregável

O designer/IA deve devolver:

1. **Um bloco de CSS** com tudo abaixo do comentário:
   ```css
   /* ══════════════════════════════════════════════════════════
      EDITION: [NOME] — [Descrição curta]
      ══════════════════════════════════════════════════════════ */
   [data-edition="NOME"][data-theme="dark"] { /* variáveis */ }
   [data-edition="NOME"][data-theme="light"] { /* variáveis */ }
   /* ...seguido de overrides específicos por componente... */
   ```

2. **Um nome** (ex: "Aurora", "Neon", "Brutalist", "Ocean")
3. **Uma descrição curta** (1 linha — vai no card de seleção em Configurações)
4. **Um preview card** (um `div` estilizado 200×70px que represente o tema, pra mostrar na tela de seleção)
5. **Mood board / referências** (opcional mas útil — apps/sites que inspiram o tema)

---

## 7. Como testar o tema localmente

1. Cola o CSS no final de `css/styles.css`
2. No DevTools, muda o atributo do `<html>` para `data-edition="NOME"`
3. Alterna `data-theme="dark"` ↔ `"light"` pra testar os dois modos
4. Percorre todos os módulos: Dashboard, Afiliados, Pagamentos, Tarefas, Pipeline, Audit, Backup, Usuários, Configurações
5. Abre um modal (ex: "Novo Afiliado"), o Action Center (sino), o Copilot (Beta ON)
6. Testa em mobile (F12 > toggle device)

---

## 8. Exemplos de prompt para IA

Se for usar IA para gerar o tema, prompt sugerido:

> "Crie um tema CSS completo para a plataforma 3C OS Pro. O tema é [NOME] e deve evocar [MOOD]. Inspire-se em [REFERÊNCIA]. Precisa funcionar em dark e light mode. Override todas as variáveis CSS listadas (bg, bg2, bg3, gb, gb2, gb3, text, text2, text3, theme, theme-dim, theme-b, theme-glow). Mantenha cores semânticas (red/amber/green/blue) reconhecíveis. Estilize: cards (radius, border, shadow), botões primary/outline/ghost, tabs, pills, badges de status, modais, scrollbar, hero section, hub app cards. Entregue CSS puro com seletores `[data-edition="NOME"][data-theme="dark|light"]`. Contraste mínimo WCAG AA."

Anexe este documento inteiro junto do prompt.
