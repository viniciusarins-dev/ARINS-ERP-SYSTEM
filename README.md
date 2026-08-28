# ARINS ERP

Sistema de gestao (ERP) multi-tenant para pequenas e medias empresas, comecando pelo
segmento de comercio/varejo: catalogo de produtos com controle de estoque, cadastro de
clientes e registro de vendas com baixa automatica de estoque.

## Stack

Monorepo com **frontend e backend desacoplados**:

- **`apps/web`**: React 19 + Vite + TypeScript + Tailwind CSS v4 + componentes estilo
  shadcn/ui (Radix UI) + Lucide Icons + React Router + TanStack Query
- **`apps/api`**: Node.js + Express + TypeScript — camada de API REST entre o frontend e o
  Supabase
- **`packages/shared`**: schemas Zod, tipos do banco e utilitarios compartilhados pelas duas
  apps (uma unica fonte de verdade para validacao, tanto no cliente quanto no servidor)
- **Banco de dados**: Supabase (PostgreSQL) com **Row Level Security multi-tenant** — cada
  empresa (`organizations`) so enxerga e escreve seus proprios dados, aplicado no banco, nao
  so na aplicacao
- **Auth**: Supabase Auth (e-mail/senha), chamado direto do browser; a API valida o JWT em
  cada requisicao

## Como a API preserva a seguranca do Supabase

O `apps/api` **nao** usa a service role key do Supabase. Cada requisicao chega com
`Authorization: Bearer <token>` (o access token da sessao Supabase do usuario); o middleware
`requireAuth` (`apps/api/src/middleware/auth.ts`) valida esse token e cria um client do
Supabase **com esse mesmo token**. Isso significa que toda query feita pela API roda como o
usuario que fez a requisicao — a Row Level Security do Postgres se aplica exatamente como se
o usuario tivesse acessado o banco diretamente. A API e um proxy fino, nao um cofre de
privilegios elevados.

## Modelo multi-tenant e seguranca (banco)

Toda tabela de negocio (`products`, `customers`, `sales`, etc.) tem uma coluna
`organization_id` e RLS habilitado. O acesso e controlado por uma funcao
`is_org_member(organization_id)` (`SECURITY DEFINER`) que verifica a tabela `memberships` —
so quem tem vinculo com aquela organizacao consegue ler ou escrever nela. Isso significa que
mesmo um bug na API (esquecer um filtro `.eq("organization_id", ...)`, por exemplo) nao vaza
dados entre empresas: o banco recusa a query.

Pontos que merecem atencao ao ler o schema (`supabase/migrations/`):

- **Criacao de organizacao** e **vendas** nunca sao inseridas diretamente pelo cliente. Elas
  passam pelas funcoes `create_organization_with_owner` e `create_sale`
  (`SECURITY DEFINER`, executam como uma unica transacao), o que garante que uma organizacao
  sempre nasce com exatamente um dono e que uma venda so existe junto com seus itens e a baixa
  de estoque correspondente — nunca um sem o outro.
- **Estoque nunca e editado diretamente.** Toda mudanca em `products.stock_quantity` passa por
  um registro em `stock_movements` (entrada/saida/ajuste); um trigger (`apply_stock_movement`)
  aplica o delta e **recusa a operacao se o estoque ficaria negativo** — essa regra vale tanto
  para ajustes manuais quanto para vendas, entao "vender mais do que tem em estoque" e
  impossivel mesmo se algum caminho da aplicacao esquecer de checar.
- Cancelar uma venda (`cancel_sale`) estorna o estoque via novos movimentos de `entrada`
  (auditavel), em vez de apagar/editar os movimentos originais.

## Estrutura do projeto

```
supabase/migrations/          # schema SQL (compartilhado pelas duas apps)
  0001_orgs_and_members.sql     # organizations, memberships, RLS base, criacao de org
  0002_catalog.sql               # categories, products, stock_movements + trigger de estoque
  0003_customers_and_sales.sql   # customers, sales, sale_items + RPCs create_sale/cancel_sale

packages/shared/src/
  types/database.ts             # tipos do schema Supabase
  validations/                  # schemas Zod por modulo (auth, product, customer, sale)
  format.ts, slug.ts

apps/api/src/
  index.ts                      # setup do Express + montagem das rotas
  middleware/auth.ts             # valida o bearer token, cria client Supabase escopado ao usuario
  middleware/organization.ts     # resolve a organizacao do usuario, 404 se nao tiver
  lib/organizations.ts
  routes/                        # organizations, dashboard, categories, products, customers, sales

apps/web/src/
  lib/
    supabase.ts                  # client Supabase do browser (auth)
    api.ts                       # fetch wrapper que injeta o bearer token
    auth-context.tsx             # sessao + organizacao atual (React context)
  components/
    route-guards.tsx             # GuestOnlyRoute / OnboardingRoute / RequireOrganizationRoute
    app-shell.tsx, app-nav.tsx
    ui/                          # kit de componentes (shadcn-style)
  pages/
    LoginPage, SignupPage, OnboardingPage, DashboardPage, ConfiguracoesPage
    produtos/                    # catalogo + estoque
    clientes/                    # cadastro de clientes
    vendas/                      # historico de vendas + nova venda (carrinho)
```

## Configuracao

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No SQL Editor, rode as migrations em `supabase/migrations/` na ordem numerica.
3. Em **Authentication → Providers**, confirme que "Email" esta habilitado.
4. Decida sobre confirmacao de e-mail (**Authentication → Providers → Email**):
   - **Desligada**: o cadastro (`/signup`) ja cria a empresa na hora.
   - **Ligada**: o usuario confirma o e-mail, faz login e cai em `/onboarding` para criar a
     empresa (a UI trata os dois casos automaticamente).
5. Copie a **Project URL** e a **anon key** em Project Settings → API.

### 2. Variaveis de ambiente

```bash
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
# preencha os dois com a URL e a anon key do seu projeto Supabase
```

`apps/api/.env` tambem define `PORT` (padrao 3001) e `CORS_ORIGIN` (padrao
`http://localhost:5173`, o dev server do Vite).

### 3. Instalar e rodar

Da raiz do repositorio (workspaces do npm resolvem as duas apps + o pacote compartilhado):

```bash
npm install
npm run dev:api    # terminal 1 — API em :3001
npm run dev:web    # terminal 2 — frontend em :5173
```

Abra [http://localhost:5173](http://localhost:5173).

## Proximos passos sugeridos

- Emissao de NF-e (integracao com a SEFAZ ou um provedor como Focus NFe/eNotas).
- Multiplas organizacoes por usuario (o schema ja suporta; falta o seletor na UI).
- Convite de membros da equipe (hoje so o criador da empresa tem acesso).
- Relatorios (curva ABC, margem por produto, inadimplencia).
- Testes automatizados (unitarios para calculo de venda/estoque, e2e para os fluxos de auth e
  venda).
- Deploy: `apps/api` como um servico Node comum (Render/Railway/Fly), `apps/web` como estatico
  (Vercel/Netlify/Cloudflare Pages) apontando `VITE_API_URL` para a URL da API.
