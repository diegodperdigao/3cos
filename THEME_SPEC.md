# 3C OS — Especificação de Tema (v2)

Documento pra designer (ou IA de design) criar um novo tema completo para a plataforma **3C OS Pro**.

> **Leia isto antes de começar.** Os primeiros temas tentados falharam por não cobrirem o Hub principal e por serem visualmente "pesados". Esta versão do spec deixa essas regras explícitas.

---

## ⚠️ Regras críticas (não-negociáveis)

### 1. O tema PRECISA transformar o Hub principal
O Hub (tela inicial após login, com os 10 cards de módulos) é o primeiro contato do usuário. Um tema que não muda o Hub **não é um tema completo** — o usuário entra, vê a mesma tela de sempre, e acha que o tema não foi aplicado.

**O que DEVE mudar no Hub:**
- Fundo do Hub (`.hub-bg`) — o mosaico com logos repetidos. Temas diferentes devem ter fundos diferentes (ex: Mono substitui por cinza sólido, Nebula adiciona campo de estrelas, Default mantém o mosaico animado)
- Hub app cards (`.hub-app`) — os 10 cards dos módulos. Mudar borda, hover, ícone, sombra — não deixar igual ao Default
- Hub wordmark (`3C**OS**`) — especialmente o `em` do "OS" que costuma ter acento colorido
- Hub identity (.hub-identity) — tagline e logo central
- Hub icon buttons (sino, tema, etc)

### 2. Substituir o mosaico infinito
O `.mosaic-pattern` é o logo 3C repetido infinitamente como textura. Ele aparece:
- No Hub principal (background)
- Em cada módulo (dentro do `.hero`)
- No lock screen

**Cada tema define sua própria alternativa:**
- Pode manter o mosaico mas com opacidade/cor diferente
- Pode substituir por padrão geométrico, noise, gradiente, estrelas, etc.
- Pode remover e deixar fundo sólido (Mono faz isso)
- **Não pode simplesmente ignorar e deixar o mosaico rosa padrão no meio de um tema violeta**

### 3. Tom CLEAN, não "cool"
O 3C OS é um **CRM profissional** — afiliados ganhando dinheiro, gestão financeira, contratos. Não é um site de jogo nem landing page de startup.

**DO:**
- ✅ Restrição visual: **1 a 2 cores** de destaque, no máximo
- ✅ Cor semântica preservada (vermelho = ruim, verde = bom, amarelo = atenção)
- ✅ Ampla respiração entre elementos
- ✅ Tipografia limpa, sem muitos pesos
- ✅ Hovers e focos sutis, não agressivos

**DON'T:**
- ❌ Neon saturado em tudo (`#39ff14`, `#ff0066` espalhado) — cansa o olho em uso diário
- ❌ Gradientes multi-color em cada card
- ❌ Animações infinitas (pulse, shimmer) em elementos grandes
- ❌ Bordas grossas coloridas (3px+ neon)
- ❌ Backdrops borrados em tudo (peso de GPU)
- ❌ Uppercase forçado em labels longos (ilegível)

**Referência de "clean":** Linear, Vercel, Arc Browser, Superhuman, Notion. Temas que são bonitos em uso diário, não que impressionam em uma screenshot.

### 4. Funcionar em dark E light mode
Não aceita "só tem dark". Ambos modos precisam estar prontos. Seletor: `[data-edition="NOME"][data-theme="dark|light"]`.

### 5. Acessibilidade WCAG AA
- Contraste mínimo 4.5:1 para texto body
- 3:1 para texto grande (>18px)
- Foco visível em todos os inputs
- Cores semânticas com intensidade similar à do Default

---

## Visão geral do sistema

A plataforma tem **3 temas funcionando**: `Default`, `Mono` e `Nebula`. Um tema é aplicado via `data-edition="NOME"` no `<html>`, com overrides combinados com `data-theme="dark|light"`.

O designer entrega um **bloco CSS** colado no fim de `css/styles.css`.

---

## Variáveis CSS (obrigatórias)

Override TODAS estas no seletor raiz do tema:

### Backgrounds
| Variável | Uso | Exemplo (Default dark) |
|---|---|---|
| `--bg` | Fundo geral da página + hub | `#060810` |
| `--bg2` | Superfícies elevadas (cards, modais, action center) | `rgba(15,18,28,0.7)` |
| `--bg3` | Inputs, surfaces terciárias | `rgba(255,255,255,0.04)` |

### Bordas
| `--gb` | Borda sutil padrão | `rgba(255,255,255,0.07)` |
| `--gb2` | Borda média (hover, divisores) | `rgba(255,255,255,0.1)` |
| `--gb3` | Borda forte (focus ring) | `rgba(255,255,255,0.14)` |

### Texto (hierarquia de 3 níveis)
| `--text` | Texto principal | `#f1f5f9` |
| `--text2` | Texto secundário | `#94a3b8` |
| `--text3` | Texto terciário | `#4b5563` |

### Accent (cor do tema)
| `--theme` | Cor principal do tema (botões, links, active) | `#ec4899` |
| `--theme-dim` | Bg sutil (8-10% alpha) | `rgba(236,72,153,0.08)` |
| `--theme-b` | Borda média (15-25% alpha) | `rgba(236,72,153,0.15)` |
| `--theme-glow` | Box-shadow glow (20-40% alpha) | `rgba(236,72,153,0.2)` |

### Cores semânticas (MANTER reconhecíveis)
| `--red` | Erro, vencido, destrutivo | `#ef4444` |
| `--amber` | Aviso, atrasado | `#f59e0b` |
| `--green` | Sucesso, pago, conectado | `#10b981` |
| `--blue` | Info, aprovado | `#3b82f6` |
| `--pink` | Acento decorativo | `#ec4899` |
| `--purple` | Acento decorativo | `#a855f7` |
| `--lime` | Auditoria | `#c8ff00` |

> Pode ajustar saturação/lightness pro modo (light precisa de cores mais escuras), mas mantém o significado: vermelho continua sendo vermelho.

### Outros
| `--radius` | Raio padrão de cantos | `14px` |
| `--space` | Espaçamento padrão | `16px` |
| `--fd` | Fonte display (números, títulos) | `'Montserrat', sans-serif` |
| `--fb` | Fonte body (texto) | `'Inter', sans-serif` |

---

## Elementos a estilizar (checklist)

Use esta lista pra garantir cobertura completa. O tema Mono cobre ~140 seletores. Um tema bom cobre **pelo menos 80**.

### 🏠 Hub (prioridade ALTA — é o que o user vê primeiro)
- [ ] `.hub-bg` — fundo geral (tratar mosaico!)
- [ ] `.hub-bg::after` — camada de estrelas/padrão custom
- [ ] `.hub-overlay` — vignette
- [ ] `.hub-bar` — barra superior
- [ ] `.hub-wordmark`, `.hub-wordmark em` — logo
- [ ] `.hub-identity`, `.hub-id-logo`, `.hub-id-name`, `.hub-id-name span` — bloco central
- [ ] `.hub-id-tagline`, `.hub-greeting` — tagline e boas-vindas
- [ ] `.hub-app` — **10 cards dos módulos** (borda, bg, hover, sombra)
- [ ] `.hub-app-icon`, `.hub-app-icon svg` — ícones dos cards
- [ ] `.hub-app-name`, `.hub-app-sub` — texto dos cards
- [ ] `.hub-apps-label`, `.hub-apps-label::after` — "Módulos disponíveis"
- [ ] `.hub-icon-btn` (sino, tema) + `:hover` + svg
- [ ] `.hub-notif-badge` — contador de notificações
- [ ] `.hub-logout-btn` — botão SAIR
- [ ] `.hub-user-name`, `.hub-user-role` — info do usuário

### 🎯 Module header (barra topo dentro dos módulos)
- [ ] `.mod-hdr` — background
- [ ] `.mod-hdr-logo em` — "OS" do logo
- [ ] `.mod-hdr-name` — nome do módulo
- [ ] `.hdr-btn` — ícones (sino, tema, sair)
- [ ] `.hdr-divider` — divisor
- [ ] `.sync-pill`, `.sync-dot`, `.sync-txt` — "Cloud Sync" (manter verde)
- [ ] `.beta-pill` — indicador Beta ON (pode adotar cor do tema)

### 🦸 Hero (banner topo de cada módulo)
- [ ] `.hero`, `.hero .mosaic-wrapper` — bg + mosaico
- [ ] `.hero-overlay`, `.hero-accent` — camadas de cor
- [ ] `.hero-eyebrow` — pequeno texto superior
- [ ] `.hero-title` — título grande
- [ ] `.hero-sub` — subtítulo

### 📊 Cards (cobrir TODOS, não só os principais)
- [ ] `.kpi` + `.kpi::before` (strip lateral) + `.kpi-val` + `.kpi-lbl` + `.kpi-sub`
- [ ] `.intel-wrap`, `.intel-card`, `.intel-eye`, `.intel-title`, `.intel-sub`
- [ ] `.aff-card` (+ `:hover`), `.aff-name`, `.aff-type`, `.aff-stat-v`, `.aff-tag`
- [ ] `.user-card`, `.user-av`, `.user-name`, `.user-email`
- [ ] `.tk` (+ todos `.tk-*`), incluindo `.tk-chk` (checkbox)
- [ ] `.kanban-col`, `.kanban-card` (+ `:hover`), `.kanban-add`
- [ ] `.st-card`, `.st-section-icon` — cards de Configurações
- [ ] `.ac-card` — cards do Action Center
- [ ] `.fin-card`, `.fin-cal-day`, `.fin-cal-day-today` — financeiro

### 🎛 Controles
- [ ] `.btn-theme` — botão primary
- [ ] `.btn-outline` + `:hover`
- [ ] `.btn-ghost` + `:hover`
- [ ] `.tab`, `.tab:hover`, `.tab.on`
- [ ] `.pill`, `.pill:hover`, `.pill.on`, `.pill-tag` (+ variantes)
- [ ] `.fi` (inputs) + `::placeholder` + `:focus`
- [ ] `textarea:focus`
- [ ] `.search-pill`, `.search-panel`, `.search-item:hover`
- [ ] `.st-switch-track`, `.st-switch-thumb` — toggles
- [ ] `.st-seg`, `.st-seg.on` — segmented controls
- [ ] `.ibt:hover` — icon buttons de tabela

### 🏷 Badges (manter cores semânticas)
- [ ] `.pb-pago` (verde), `.pb-pendente` (amber), `.pb-vencido` (red), `.pb-atrasado` (amber), `.pb-aprovado` (blue), `.pb-ajuste`, `.pb-recusado`
- [ ] `.pri-a` (red), `.pri-m` (amber), `.pri-b` (neutral)
- [ ] `.ct-badge` + variantes (.ct-cpa, .ct-tiered, etc)
- [ ] `.rank-badge`, `.rank-gold`, `.rank-silver`, `.rank-bronze` — medalhas (manter dourado/prata/bronze)
- [ ] `.role-badge` — cargo
- [ ] `.lc-ok`, `.lc-warn`, `.lc-danger`, `.lc-never` — último contato

### 📋 Tabelas
- [ ] `table`, `th`, `td` — bg, color, padding
- [ ] `.tr:hover` — linha hover
- [ ] `.td-name`, `.td-num`, `.td-money`, `.td-brand` — células especializadas
- [ ] `::-webkit-scrollbar`, `-thumb`, `-track`, `-thumb:hover`

### 🪟 Overlays
- [ ] `.modal`, `.modal-hdr`, `.modal-ttl`, `.modal-cls`
- [ ] `#modal-ov` — overlay escuro atrás do modal
- [ ] `#action-center`, `.ac-hdr`, `.ac-title`, `.ac-close`
- [ ] `.toast` — notificações
- [ ] `.mob-sidebar`, `.mob-sb-item`, `.mob-sb-item.active` — menu mobile

### 🤖 Copilot (se for fundir com tema)
- [ ] `#copilot-fab` + `.cp-fab-pulse`
- [ ] `#copilot-drawer`, `.cp-hdr`, `.cp-title-icon`, `.cp-welcome-icon`
- [ ] `.cp-msg-user .cp-bubble`, `.cp-msg-avatar`
- [ ] `.cp-send`, `.cp-input:focus`
- [ ] `.cp-hist-item`, `.cp-hist-item.on`

---

## Exemplo de entregável

```css
/* ══════════════════════════════════════════════════════════
   EDITION: [NOME] — [Descrição 1 linha]
   Inspirado em [REFERÊNCIA].
   ══════════════════════════════════════════════════════════ */

/* Variáveis */
[data-edition="NOME"][data-theme="dark"] {
  --bg: ...;
  --bg2: ...;
  /* ...etc... */
}
[data-edition="NOME"][data-theme="light"] {
  /* ... */
}

/* Hub (PRIORIDADE) */
[data-edition="NOME"] .hub-bg { ... }
[data-edition="NOME"] .hub-app { ... }
[data-edition="NOME"] .hub-app:hover { ... }
/* ... */

/* Hero */
[data-edition="NOME"] .hero { ... }

/* Cards */
[data-edition="NOME"] .kpi { ... }
/* ... */

/* Controles, badges, tabelas, etc. */
```

E junto:
- **Nome do tema** (ex: "Aurora", "Nebula", "Graphite")
- **Descrição 1 linha** pro card de seleção
- **Preview card CSS** (200x70px) que represente o tema
- **Mood board** com 3-5 referências visuais

---

## Processo sugerido

1. **Pesquisa**: rode o sistema no tema Mono — ele é o mais "transformador". Veja tudo que ele muda. Seu tema deve ter profundidade similar.
2. **Paleta**: defina 1 cor accent + cinzas. Nada mais.
3. **Moodboard**: 3 referências visuais. Se possível, temas de produtos reais (Linear, Vercel, Arc, etc), não só artes abstratas.
4. **Hub first**: comece pelo Hub. Se ele não surpreender, não continua.
5. **Dark first, light depois**: dark é mais perdoado visualmente. Se funcionar em light também, ótimo.
6. **Teste em cada módulo**: Dashboard, Afiliados, Pagamentos, etc. Um tema bom é uniforme — não tem módulo que "escapou".
7. **Teste o Action Center, Modais, Copilot**: overlays precisam funcionar.
8. **Mobile**: F12 > 375px. Sidebar mobile, bottom nav, etc.

---

## Prompt para IA (opcional)

> "Crie um tema CSS completo para a plataforma 3C OS Pro seguindo este spec (anexo). Nome: [NOME]. Inspiração: [REFERÊNCIA ex. Linear + Arc Browser]. Dark + light mode obrigatórios. PRIORIDADE ALTA: transformar o Hub principal (hub-app cards, hub-bg, mosaico), não só mudar cores internas. **Tom clean — use no máximo 1 cor accent**, evite neon saturado espalhado. Preservar cores semânticas (red/amber/green/blue reconhecíveis). Contraste WCAG AA. Cobrir os 80+ seletores listados. Entregar CSS puro + 1 preview card de 200x70px representando o tema."
