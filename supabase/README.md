# Supabase Setup — 3C OS

Setup completo do backend Supabase para o 3C OS. Tempo estimado: **15 minutos**.

---

## 1. Criar projeto Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Configure:
   - **Name**: `3cos` (ou o que preferir)
   - **Database password**: gere uma forte e **guarde**
   - **Region**: `South America (São Paulo)` — mais próximo dos usuários BR
   - **Pricing plan**: Free
3. Clique em **Create new project** e aguarde ~2 minutos

---

## 2. Rodar o schema

1. No painel Supabase → **SQL Editor** (menu lateral)
2. Clique em **+ New query**
3. Copie todo o conteúdo de [`supabase/schema.sql`](./schema.sql)
4. Cole no editor → **Run** (Ctrl+Enter)
5. Deve aparecer **Success. No rows returned** — todas as tabelas criadas

---

## 3. Rodar o seed (opcional, recomendado pra começar com dados)

1. **+ New query** novamente
2. Copie [`supabase/seed.sql`](./seed.sql)
3. **Run**
4. Deve popular brands, affiliates, contracts, payments, etc.

---

## 4. Pegar credenciais

1. **Settings** (engrenagem no menu lateral) → **API**
2. Você verá:
   - **Project URL**: `https://XXXXXXXX.supabase.co`
   - **anon public** key: `eyJhbGc...` (longa, começa com eyJ)
3. **Importante**: a `anon` key é segura pra ser pública (RLS protege os dados). NÃO use a `service_role`.

---

## 5. Configurar no app

Edite [`js/supabase-client.js`](../js/supabase-client.js) e substitua:

```js
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY';
```

Pelas suas credenciais reais.

---

## 6. Criar primeiro usuário (admin)

### Opção A — Via painel Supabase (mais rápido)
1. **Authentication** → **Users** → **+ Add user** → **Create new user**
2. Email: `diego@3c.gg`, Password: defina uma
3. **Auto Confirm User**: ✅ marcado
4. Click **Create user**

O trigger `handle_new_user` cria automaticamente um row em `profiles` com role=`operacao`. Pra promover pra admin:

5. **SQL Editor** → New query:
```sql
update public.profiles set role = 'admin', modules = array['dashboard','affiliates','brands','payments','tasks','pipeline','audit','backup','users']
where email = 'diego@3c.gg';
```

### Opção B — Via signup do app (depois da Fase 3)
Quando o app estiver migrado, dá pra criar usuários direto pela tela de login.

---

## 7. Testar a conexão

Abra o 3C OS no navegador, aperte **F12** (DevTools) → **Console** → cole:

```js
await sb.from('brands').select('*');
```

Deve retornar `{ data: [...3 brands...], error: null }`.

Se der erro:
- **CORS**: vá em **Settings → API → CORS** e adicione o domínio do app
- **JWT**: confira que `SUPABASE_ANON_KEY` no client tá certo
- **404**: confira o `SUPABASE_URL`

---

## 8. Storage (Fase 4 — pra arquivos NF)

1. **Storage** (menu lateral) → **+ New bucket**
2. Name: `nfs`
3. Public: **OFF** (privado)
4. Click **Create**

Configurar políticas (SQL Editor):
```sql
create policy "auth_read_nfs" on storage.objects for select to authenticated
  using (bucket_id = 'nfs');
create policy "auth_write_nfs" on storage.objects for insert to authenticated
  with check (bucket_id = 'nfs');
create policy "auth_update_nfs" on storage.objects for update to authenticated
  using (bucket_id = 'nfs');
```

---

## Estrutura do schema

| Tabela | Descrição |
|---|---|
| `profiles` | Perfil do usuário (extends auth.users) |
| `brands` | Marcas parceiras (Vupi, Novibet, etc) |
| `affiliates` | Afiliados / criadores de conteúdo |
| `contracts` | Contratos por afiliado × marca |
| `payments` | Pagamentos com status workflow + datas NF/vencimento |
| `closings` | Fechamentos mensais executados |
| `tasks` | Tarefas vinculadas a afiliados/contratos |
| `reports` | Lançamentos diários de FTD/QFTD/depósitos |
| `audit_log` | Histórico de ações no sistema |
| `notifications` | Avisos com routing pra navegação |
| `deadlines` | Singleton — config de prazos da empresa |
| `emailjs_config` | Singleton — credenciais EmailJS |
| `available_tags` | Tags coloridas disponíveis pra atribuir |
| `pipeline_stages` | Estágios do pipeline kanban |
| `pipeline_cards` | Cards no pipeline |
| `user_settings` | Preferências por usuário (theme, beta) |
| `reminders` | Lembretes customizados pro calendário |

---

## RLS (Row Level Security)

Por padrão, todas as tabelas têm RLS habilitado com policy `auth_all` que permite acesso total a qualquer usuário autenticado.

**Pra V1 isso é suficiente.** Em produção, ajustar policies por role × módulo:

```sql
-- Exemplo: viewer só lê dashboard, não edita nada
drop policy "auth_all" on public.payments;
create policy "viewer_read" on public.payments for select to authenticated
  using (user_role() in ('admin','financeiro'));
create policy "fin_write" on public.payments for all to authenticated
  using (user_role() in ('admin','financeiro'))
  with check (user_role() in ('admin','financeiro'));
```

---

## Realtime

Já está habilitado para: `affiliates`, `contracts`, `payments`, `closings`, `tasks`, `reports`, `notifications`, `audit_log`, `pipeline_cards`, `reminders`.

Subscriptions client-side em [`js/data.js`](../js/data.js) → `Data.subscribeAll()`.

---

## Próximos passos

Depois desse setup completo, me confirma e eu sigo pra:
- **Fase 2**: Switch reads (app carrega dados do Supabase em vez do Firebase)
- **Fase 3**: Switch writes + auth migration
- **Fase 4**: Cleanup Firebase + Vercel deploy
