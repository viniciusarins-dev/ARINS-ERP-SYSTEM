# ARINS ERP

Sistema de gestao (ERP) multi-tenant para pequenas e medias empresas, comecando pelo
segmento de comercio/varejo: catalogo de produtos com controle de estoque, cadastro de
clientes e registro de vendas com baixa automatica de estoque.

## Stack

- **Frontend/Backend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + componentes
  estilo shadcn/ui (Radix UI) + Lucide Icons
- **Banco de dados**: Supabase (PostgreSQL) com **Row Level Security multi-tenant** — cada
  empresa (`organizations`) so enxerga e escreve seus proprios dados, aplicado no banco, nao
  so na aplicacao
- **Auth**: Supabase Auth (e-mail/senha)
- **Formularios/validacao**: React Hook Form + Zod

## Modelo multi-tenant e seguranca

Toda tabela de negocio (`products`, `customers`, `sales`, etc.) tem uma coluna
`organization_id` e RLS habilitado. O acesso e controlado por uma funcao
`is_org_member(organization_id)` (`SECURITY DEFINER`) que verifica a tabela `memberships` —
so quem tem vinculo com aquela organizacao consegue ler ou escrever nela. Isso significa que
mesmo um bug na aplicacao (esquecer um filtro `.eq("organization_id", ...)`, por exemplo) nao
vaza dados entre empresas: o banco recusa a query.

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
supabase/migrations/
  0001_orgs_and_members.sql     # organizations, memberships, RLS base, criacao de org
  0002_catalog.sql               # categories, products, stock_movements + trigger de estoque
  0003_customers_and_sales.sql   # customers, sales, sale_items + RPCs create_sale/cancel_sale
src/
  middleware.ts (raiz)           # protege rotas: sem sessao -> /login
  lib/
    supabase/                    # clients (browser, server, middleware) + tipos do banco
    organizations.ts             # organizacao do usuario logado (getCurrentOrganization)
    validations/                 # schemas Zod por modulo
    actions/auth.ts              # logout
  app/
    login/, signup/              # autenticacao (signup ja cria a empresa)
    onboarding/                  # cria a empresa quando o signup exige confirmacao de e-mail
    (app)/                       # grupo de rotas autenticadas, com organizacao ja resolvida
      layout.tsx                 # nav + redireciona para /onboarding se nao houver empresa
      page.tsx                   # painel (KPIs: produtos, estoque baixo, clientes, vendas)
      produtos/                  # catalogo + estoque
      clientes/                  # cadastro de clientes
      vendas/                    # historico de vendas + nova venda (carrinho)
      configuracoes/             # dados da empresa e equipe
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
5. Copie `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em Project Settings → API.

### 2. Variaveis de ambiente

```bash
cp .env.example .env.local
# preencha com os valores do seu projeto Supabase
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Proximos passos sugeridos

- Emissao de NF-e (integracao com a SEFAZ ou um provedor como Focus NFe/eNotas).
- Multiplas organizacoes por usuario (o schema ja suporta; falta o seletor na UI).
- Convite de membros da equipe (hoje so o criador da empresa tem acesso).
- Relatorios (curva ABC, margem por produto, inadimplencia).
- Testes automatizados (unitarios para calculo de venda/estoque, e2e para os fluxos de auth e
  venda).
