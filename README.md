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

## Fiscal (NF-e/NFC-e)

Integracao com a [Focus NFe](https://focusnfe.com.br) (`apps/api/src/lib/focus-nfe-client.ts`).
Pontos de seguranca que valem a pena conhecer antes de mexer aqui:

- **O certificado digital A1 de cada cliente nunca e persistido.** Ele chega via upload
  (`PUT /api/fiscal/config`, `multer` com `memoryStorage` — nunca grava em disco), e nesse
  mesmo request e repassado pra Focus NFe (que assume a custodia dele) e descartado da
  memoria do processo. A tabela `fiscal_configs` guarda so metadados (CNPJ, regime, status) —
  nunca o certificado nem a senha.
- **A ARINS usa uma unica conta na Focus NFe** (token em `FOCUS_NFE_API_TOKEN`, so no
  `apps/api`, nunca chega no browser) e registra uma "empresa" la pra cada organizacao via
  API — e assim que o modelo multi-tenant funciona: um cliente da ARINS nao precisa saber que
  a Focus NFe existe por baixo.
- **Emissao e idempotente**: `fiscal_documents.sale_id` e `unique`, entao reenviar a mesma
  venda (retry de rede, duplo clique) atualiza a linha existente em vez de arriscar emitir
  nota duplicada.
- **O webhook (`POST /api/fiscal/webhooks/focus-nfe/:secret`) e a unica rota que usa a
  service role key** — a Focus NFe chama ele direto, sem JWT de usuario nosso, entao a
  autenticidade e checada por um segredo (`FOCUS_NFE_WEBHOOK_SECRET`) embutido na propria URL
  em vez de sessao.
- Os nomes exatos de campo do payload da Focus NFe em `focus-nfe-client.ts` e
  `routes/fiscal-webhook.ts` foram escritos a partir da documentacao publica deles, ainda sem
  testar contra uma conta real — validar/ajustar assim que houver um `FOCUS_NFE_API_TOKEN` de
  verdade (conta gratuita de 30 dias, sem CNPJ pra so explorar a API: veja
  [focusnfe.com.br/cadastro](https://focusnfe.com.br/cadastro/)).

## Estrutura do projeto

```
supabase/migrations/          # schema SQL (compartilhado pelas duas apps)
  0001_orgs_and_members.sql     # organizations, memberships, RLS base, criacao de org
  0002_catalog.sql               # categories, products, stock_movements + trigger de estoque
  0003_customers_and_sales.sql   # customers, sales, sale_items + RPCs create_sale/cancel_sale
  0004_fiscal.sql                 # fiscal_configs, fiscal_documents (nunca guarda certificado)

packages/shared/src/
  types/database.ts             # tipos do schema Supabase
  validations/                  # schemas Zod por modulo (auth, product, customer, sale, fiscal)
  format.ts, slug.ts

apps/api/src/
  index.ts                      # setup do Express + montagem das rotas
  middleware/auth.ts             # valida o bearer token, cria client Supabase escopado ao usuario
  middleware/organization.ts     # resolve a organizacao do usuario, 404 se nao tiver
  lib/organizations.ts
  lib/focus-nfe-client.ts        # wrapper da API da Focus NFe
  routes/                        # organizations, dashboard, categories, products, customers,
                                  # sales, fiscal, fiscal-webhook

apps/web/src/
  lib/
    supabase.ts                  # client Supabase do browser (auth)
    api.ts                       # fetch wrapper que injeta o bearer token
    auth-context.tsx             # sessao + organizacao atual (React context)
    theme-context.tsx            # tema claro/escuro (persistido em localStorage)
  components/
    route-guards.tsx             # GuestOnlyRoute / OnboardingRoute / RequireOrganizationRoute
    app-shell.tsx, app-sidebar.tsx, theme-toggle.tsx
    ui/                          # kit de componentes (shadcn-style)
  pages/
    LoginPage, SignupPage, OnboardingPage, DashboardPage, ConfiguracoesPage
    produtos/                    # catalogo + estoque
    clientes/                    # cadastro de clientes
    vendas/                      # historico de vendas + nova venda (carrinho) + emissao de NFC-e
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
`http://localhost:5173`, o dev server do Vite). As variaveis de fiscal
(`FOCUS_NFE_API_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`, `FOCUS_NFE_WEBHOOK_SECRET`) sao
opcionais — sem elas, o resto do app funciona normalmente e as rotas `/api/fiscal/*`
retornam 503 em vez de emitir nota.

### 3. Instalar e rodar

Da raiz do repositorio (workspaces do npm resolvem as duas apps + o pacote compartilhado):

```bash
npm install
npm run dev:api    # terminal 1 — API em :3001
npm run dev:web    # terminal 2 — frontend em :5173
```

Abra [http://localhost:5173](http://localhost:5173).

## Proximos passos sugeridos

- Validar o modulo fiscal contra uma conta real da Focus NFe (homologacao) e ajustar os
  nomes de campo em `focus-nfe-client.ts`/`fiscal-webhook.ts` se a documentacao atual
  divergir do que foi escrito aqui.
- Multiplas organizacoes por usuario (o schema ja suporta; falta o seletor na UI).
- Convite de membros da equipe (hoje so o criador da empresa tem acesso).
- Relatorios (curva ABC, margem por produto, inadimplencia).
- Testes automatizados (unitarios para calculo de venda/estoque, e2e para os fluxos de auth e
  venda).
- Deploy: `apps/api` como um servico Node comum (Render/Railway/Fly), `apps/web` como estatico
  (Vercel/Netlify/Cloudflare Pages) apontando `VITE_API_URL` para a URL da API.
