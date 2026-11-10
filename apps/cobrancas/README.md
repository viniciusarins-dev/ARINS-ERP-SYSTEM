# Parcela OS — painel de cobranças pessoal

Painel para controlar quanto cada cliente ainda deve pelos sites e sistemas desenvolvidos,
com parcelamento automático, situação calculada em tempo real e cobrança pronta pelo WhatsApp.

Detalhes de arquitetura, modelo de dados e identidade visual: [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## Rodar localmente

```bash
npm install                 # na raiz do monorepo
npm run dev:cobrancas       # http://localhost:5174
```

Sem `.env`, o app abre em **modo local**: os dados ficam só no navegador (começa vazio, sem
dados fictícios). O guia visual fica em `/identidade` (apenas em desenvolvimento).

```bash
npm test --workspace apps/cobrancas        # testes das regras (parcelas, status, telefone, mensagem)
npm run build --workspace apps/cobrancas   # typecheck + build
```

## Banco atual: projeto Supabase "Arins-ERP" (schema `armag`)

O ARMAG divide o projeto Supabase com o ERP, mas vive no schema próprio `armag`
(migration `supabase/migrations/0003_armag_schema_on_arins_erp.sql`). Requisitos:

1. **Settings → API → Exposed schemas**: incluir `armag` (além de `public`).
2. Variáveis do app: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e
   `VITE_SUPABASE_DB_SCHEMA=armag`.
3. Acesso: só usuários listados em `armag.members` usam o ARMAG — contas do ERP não
   enxergam nada do ARMAG e vice-versa. Todos os membros compartilham a mesma carteira
   (migration `0004_armag_shared_records.sql`); `owner_id` indica quem cadastrou.

As migrations 0001/0002 são do projeto avulso anterior (histórico).

## Configurar o Supabase (projeto avulso — histórico)

1. Crie um projeto novo em supabase.com (separado do ERP).
2. **SQL Editor** → cole e execute `supabase/migrations/0001_billing_schema.sql`.
3. **Authentication → Sign In / Providers**: desative *Allow new users to sign up*.
4. **Authentication → Users → Add user**: crie o seu usuário (e-mail + senha, *Auto Confirm*).
   A senha é guardada pelo Supabase Auth — o app nunca armazena senhas.
5. **Project Settings → API**: copie a *Project URL* e a chave pública *anon/publishable*
   para `apps/cobrancas/.env` (veja `.env.example`).

Todas as tabelas têm RLS: cada linha pertence ao `owner_id` que a criou e só essa conta
autenticada consegue ler ou alterar. O papel anônimo não tem acesso a nada.

## Publicar na Vercel

1. Importe o repositório e defina **Root Directory** = `apps/cobrancas`.
2. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Deploy. O `vercel.json` já cuida das rotas da SPA e de cabeçalhos de segurança.

Se as variáveis faltarem, o build de produção mostra uma tela de "Supabase não configurado"
em vez de cair silenciosamente no modo local.

## Renomear o produto

Altere `src/config/brand.ts` e o `<title>` de `index.html`.
