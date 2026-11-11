-- =====================================================================
-- ARMAG: orçamentos
-- Guarda as escolhas do formulário (catálogo + tópicos livres) e os totais
-- calculados no momento em que o orçamento foi salvo. Compartilhado entre
-- os membros, como o resto do schema armag.
-- =====================================================================

create table armag.budgets (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null default auth.uid() references auth.users (id) on delete set null,
  client_name        text check (client_name is null or char_length(client_name) <= 160),
  client_phone       text check (client_phone is null or client_phone ~ '^[0-9]{10,11}$'),
  title              text not null check (char_length(btrim(title)) between 1 and 160),
  selections         jsonb not null default '{}'::jsonb,
  topics             jsonb not null default '[]'::jsonb,
  hourly_rate_cents  bigint not null check (hourly_rate_cents > 0),
  hours_per_day      numeric(4, 1) not null check (hours_per_day > 0 and hours_per_day <= 24),
  margin_percent     numeric(5, 1) not null default 0 check (margin_percent >= 0 and margin_percent <= 200),
  total_hours        numeric(8, 1) not null check (total_hours >= 0),
  total_cents        bigint not null check (total_cents >= 0),
  notes              text check (notes is null or char_length(notes) <= 4000),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index armag_budgets_created_idx on armag.budgets (created_at desc);

create trigger budgets_touch before update on armag.budgets for each row execute function armag.touch_updated_at();

alter table armag.budgets enable row level security;

create policy budgets_members on armag.budgets for all to authenticated
  using ((select armag.is_member()))
  with check ((select armag.is_member()));

grant select, insert, update, delete on armag.budgets to authenticated;
