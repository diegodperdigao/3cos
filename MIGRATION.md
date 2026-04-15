# 3C OS — Migração Firebase → Supabase + Vercel

Plano de migração arquitetural completo. Versão: **Fase 1 (Foundation)**.

---

## Por quê migrar

| Aspecto | Firebase atual | Supabase futuro |
|---|---|---|
| **Modelo de dados** | Documento único `3cos/appState` (limit 1MB) | Tabelas relacionais SQL com FKs |
| **Storage** | Não usado (só `nfName` string) | Bucket `nfs` privado pra arquivos reais |
| **Realtime** | Listener no doc inteiro | Postgres CDC por tabela |
| **Backup** | Limitado | `pg_dump` padrão |
| **Auth** | Firebase Auth | Supabase Auth (OAuth + email) |
| **Lock-in** | Google | Open source / self-hostable |
| **Migrations versionadas** | Não tem | SQL files versionados |
| **Hosting** | GitHub Pages | Vercel (preview deploys, edge CDN, env vars) |

---

## Plano em 4 fases

### ✅ Fase 1 — Foundation (este commit)
**Aditivo, não quebra nada.** Tudo coexiste com Firebase.

- [x] `supabase/schema.sql` — schema PostgreSQL completo (17 tabelas + RLS + triggers + realtime)
- [x] `supabase/seed.sql` — dados iniciais convertidos do `DEFAULT_STATE`
- [x] `supabase/README.md` — setup passo a passo (15 min)
- [x] `js/supabase-client.js` — init do client (placeholder credentials)
- [x] `js/data.js` — data access layer (`loadAll`, `upsert`, `remove`, `subscribeAll`, `logAction`)
- [x] `vercel.json` — config Vercel pronto pra deploy
- [x] `MIGRATION.md` — este documento

**Status**: app continua rodando em Firebase. Supabase está disponível pra teste manual via console.

### ⏳ Fase 2 — Switch reads
**Mudança controlada.** App passa a ler do Supabase em vez do Firebase.

- [ ] `js/app.js`: substituir `loadFromCloud()` por `Data.loadAll()` no boot
- [ ] Manter `saveToLocal/saveToCloud` em paralelo (escreve em ambos)
- [ ] Realtime subscriptions ativas
- [ ] Verificar todos os módulos visualmente

**Risco**: baixo. Reads são read-only — se algo quebrar, basta reverter o commit.

### ⏳ Fase 3 — Switch writes + auth
**Mudança grande.** Operações de escrita persistem no Supabase. Auth migra.

- [ ] Substituir todas as chamadas `saveToLocal()` por `Data.upsert()` específicas
- [ ] Migrar `logAction` → `Data.logAction`
- [ ] Substituir Firebase Auth por Supabase Auth (lock screen, signIn, signOut, session)
- [ ] Criar primeiro usuário admin via painel Supabase
- [ ] Testar fluxo completo: criar afiliado, executar fechamento, aprovar pagamento

**Risco**: médio. Auth migration é o ponto sensível — mas como não temos usuários reais, é tranquilo.

### ⏳ Fase 4 — Cleanup + Vercel deploy
- [ ] Remover scripts Firebase do `index.html`
- [ ] Remover `firebaseConfig`, `fbAuth`, `fbDb`, `FB_DOC` do `js/app.js`
- [ ] Remover funções `saveToCloud`, `loadFromCloud`, `forceSyncCloud`
- [ ] Conectar repo no Vercel → deploy from `main`
- [ ] Configurar custom domain (se houver)
- [ ] Decommissionar projeto Firebase do hub-3c (apenas o 3c os, hub continua)

**Risco**: baixo. Já está tudo em Supabase nesse ponto, é só limpeza.

---

## Decisões arquiteturais

### 1. STATE como cache, não fonte da verdade
**Por quê**: o app inteiro lê `STATE.X` direto. Refatorar pra async em todo lugar = semanas de trabalho. Usando STATE como cache, a UI continua síncrona, e o Data layer cuida do sync com Supabase.

**Como funciona**:
1. Boot: `Data.loadAll()` → popula STATE
2. Mutação: `STATE.X.push(...)` + `Data.upsert('table', obj)` (paralelo)
3. Realtime: subscriptions atualizam STATE em background

### 2. Conversão snake_case ↔ camelCase
**Por quê**: SQL standard é snake_case. JS é camelCase. Misturar é confuso.

**Como**: `TABLE_FIELD_MAP` em `data.js` declara o mapeamento. `toCamel()` e `toSnake()` convertem nas bordas (Supabase → STATE e STATE → Supabase). Nada de código de UI precisa saber.

### 3. RLS aberto pra autenticados em V1
**Por quê**: shipar primeiro, refinar depois. Toda tabela tem `auth_all` policy que permite tudo pra usuários logados. Não-logados não conseguem nada (Auth obriga).

**Próximo**: refinar policies por role × módulo. Exemplos no `supabase/README.md`.

### 4. Anon key no client (público)
**Por quê**: a `anon` key do Supabase é **desenhada pra ser pública**. RLS é o que protege. Não confundir com `service_role` que NUNCA deve ir pro client.

### 5. Singletons como rows id=1
**Por quê**: `deadlines` e `emailjs_config` são single-row. Podia virar coluna num "settings" mas a separação fica mais limpa.

**Como**: tabelas com `check (id = 1)` constraint. Upsert sempre passa `id: 1`.

### 6. Audit log com before/after JSONB
**Por quê**: o user pediu "field-level audit". Schema já tem `before_state` e `after_state` colunas JSONB. Migrar quando for usar.

---

## Como o agente Adaptive IA se conecta

Depois da Fase 4, a integração com o agente fica trivial:

### Opção A — Direto ao Postgres (recomendado)
1. No Supabase Dashboard: **Settings → Database → Connection String**
2. Use a connection pooler URL (porta 6543)
3. No agente, conecte com node-postgres / asyncpg / psycopg2
4. Query SQL nativo:
```sql
select id, affiliate, brand, amount, nf_received_date, due_date, status
from payments
where status not in ('pago', 'recusado');
```
5. Aplique a lógica de status computado:
```python
def compute_status(p, std_days=5):
    if p['status'] in ('pago', 'recusado', 'ajuste'):
        return p['status']
    now = date.today()
    if p['due_date'] and p['due_date'] < now:
        return 'vencido'
    if p['nf_received_date']:
        deadline = add_business_days(p['nf_received_date'], std_days)
        if deadline < now:
            return 'atrasado'
    return p['status']
```

### Opção B — Via Supabase REST API
1. Use a `service_role` key (do servidor — NUNCA do client!)
2. `GET https://YOUR_PROJECT.supabase.co/rest/v1/payments?status=neq.pago`
3. Headers:
```
apikey: SERVICE_ROLE_KEY
Authorization: Bearer SERVICE_ROLE_KEY
```

### Enviando notificações
O agente pode:
- **Inserir notificações** direto na tabela `notifications` → aparecem no app via realtime
- **Enviar email** via EmailJS usando as credenciais em `emailjs_config` (sem precisar de SMTP próprio)
- **Update no `payments`** marcando flags custom (ex: `_agent_notified_at`)

---

## Cronograma estimado

| Fase | Esforço dev | Você fazer |
|---|---|---|
| 1 — Foundation (este commit) | ~3h | Criar projeto Supabase, rodar schema, atualizar credenciais |
| 2 — Switch reads | ~2h | Testar visualmente cada módulo |
| 3 — Switch writes + auth | ~4h | Criar usuário admin, testar fluxos |
| 4 — Cleanup + Vercel | ~1h | Conectar repo no Vercel, configurar domain |
| **Total** | **~10h** | **~30 min de trabalho seu** |

Pode rodar em 1 dia se for focado, ou em 1 semana com checkpoints.

---

## Próximo passo

**Você**: seguir `supabase/README.md` pra setup.

**Eu**: aguardar confirmação que `await sb.from('brands').select('*')` retorna dados. Aí toco a Fase 2.
