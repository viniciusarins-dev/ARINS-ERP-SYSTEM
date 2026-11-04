# Parcela OS — Painel de cobranças pessoal

App independente dentro do monorepo (`apps/cobrancas`). Não compartilha banco nem código de
negócio com o ERP: terá **seu próprio projeto Supabase**, uso de um único usuário.

## Arquitetura

```
Browser (React SPA, Vercel)
  └── supabase-js (anon key + sessão do usuário)
        └── Supabase: Auth (e-mail/senha) + Postgres com RLS
```

- Sem backend próprio: o frontend fala direto com o Supabase. A segurança fica no banco
  (RLS por `auth.uid()`), então a anon key pode estar no frontend sem risco. A
  `service_role` key **nunca** é usada no app.
- Cadastro público desativado no Supabase (apenas a sua conta existe).
- Valores sempre em **centavos (integer)**; status das parcelas **calculado**, nunca gravado.
- Registro de pagamento via função SQL transacional, com `unique(installment_id)` em
  `payments` — impossível registrar o mesmo pagamento duas vezes.
- WhatsApp: link `https://wa.me/55DDDNUMERO?text=...` montado no cliente; envio manual.

## Estrutura de pastas

```
apps/cobrancas/
├── supabase/migrations/      # SQL versionado (Etapa 7)
└── src/
    ├── config/brand.ts       # nome do produto (troca em 1 lugar)
    ├── styles/index.css      # tokens de design + utilitários de identidade
    ├── components/
    │   ├── brand/            # Logo, Sparkle
    │   ├── layout/           # AppShell (sidebar desktop / dock mobile)
    │   └── ui/               # Button, ChargeButton, Panel, StatusBadge, Field,
    │                         # MoneyInput, Segmented, KpiCard, EmptyState, Toast
    ├── features/             # (Etapas 2–6) clients, installments, payments, whatsapp
    │   └── <feature>/        # api.ts · hooks · components · lógica pura testável
    ├── lib/                  # format (BRL/datas), cn, supabase client
    ├── pages/                # telas roteadas
    └── types/
```

## Modelo de dados (Etapa 7)

| Tabela         | Campos principais                                                                 |
| -------------- | --------------------------------------------------------------------------------- |
| `clients`      | id, owner_id → auth.users, full_name, whatsapp (só dígitos, com DDD), created_at  |
| `projects`     | id, owner_id, client_id, name, total_cents, down_payment_cents, plan (`avista`/`semanal`/`mensal`), installments_count, first_due_date |
| `installments` | id, owner_id, project_id, number, amount_cents, due_date — `unique(project_id, number)` |
| `payments`     | id, owner_id, installment_id **unique**, amount_cents, paid_at, created_at        |

Todas com RLS: `owner_id = auth.uid()` para select/insert/update/delete, `on delete cascade`
a partir de `clients`. Status (`pago`/`em_dia`/`proximo`/`atrasado`) é derivado de
`payments` + `due_date` vs. data atual (janela de 3 dias para "próximo").

Parcelamento: `base = floor(restante / n)`, os `restante % n` centavos que sobram vão
1 a 1 nas primeiras parcelas — a soma fecha exata.

## Identidade visual

- Paleta fechada: noite `#261B17`, café `#493126`, laranja `#D66B35`, oliva `#A6B87A`,
  creme `#F2E5CC` (+ derivados só para estados).
- Tipografia: Unbounded (display/valores), Instrument Sans (texto), JetBrains Mono
  (rótulos), Silkscreen (detalhes de sistema, uso mínimo).
- Linguagem: bordas de 1.5px, sombras duras que somem ao pressionar, painéis com barra
  de título, cromado apenas em pequenos detalhes, LEDs nos status, grão e scanlines sutis.
- Laranja = ação/atenção. COBRAR tem forma própria (pílula "jelly" com reflexo).
