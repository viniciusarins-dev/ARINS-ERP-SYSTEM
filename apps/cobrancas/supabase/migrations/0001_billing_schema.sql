-- =====================================================================
-- Parcela OS — painel de cobranças pessoal
-- Esquema: clients → projects → installments → payments
-- Valores monetários em centavos (bigint). Status NÃO é gravado: é
-- calculado no app a partir de payments + due_date.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 2 and 160),
  whatsapp    text not null check (whatsapp ~ '^[1-9][0-9]{9,10}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.projects (
  id                  uuid primary key default gen_random_uuid(),
  owner_id            uuid not null default auth.uid() references auth.users (id) on delete cascade,
  client_id           uuid not null references public.clients (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 160),
  total_cents         bigint not null check (total_cents > 0),
  down_payment_cents  bigint not null default 0 check (down_payment_cents >= 0),
  plan                text not null check (plan in ('avista', 'semanal', 'mensal')),
  installments_count  integer not null check (installments_count between 0 and 120),
  first_due_date      date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint down_payment_le_total check (down_payment_cents <= total_cents),
  constraint first_due_required check (installments_count = 0 or first_due_date is not null)
);

create table public.installments (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id    uuid not null references public.projects (id) on delete cascade,
  number        integer not null check (number >= 1),
  amount_cents  bigint not null check (amount_cents > 0),
  due_date      date not null,
  created_at    timestamptz not null default now(),
  unique (project_id, number)
);

-- unique(installment_id): o mesmo pagamento nunca é registrado duas vezes.
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  installment_id  uuid not null unique references public.installments (id) on delete cascade,
  amount_cents    bigint not null check (amount_cents > 0),
  paid_at         date not null,
  created_at      timestamptz not null default now()
);

create index clients_owner_idx       on public.clients (owner_id);
create index projects_client_idx     on public.projects (client_id);
create index installments_project_idx on public.installments (project_id, due_date);

-- ---------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger clients_touch  before update on public.clients  for each row execute function public.touch_updated_at();
create trigger projects_touch before update on public.projects for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Row Level Security: cada linha pertence a quem a criou (owner_id).
-- Só a conta autenticada dona dos dados lê ou escreve.
-- ---------------------------------------------------------------------
alter table public.clients      enable row level security;
alter table public.projects     enable row level security;
alter table public.installments enable row level security;
alter table public.payments     enable row level security;

create policy clients_owner on public.clients
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy projects_owner on public.projects
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.clients c where c.id = client_id and c.owner_id = (select auth.uid()))
  );

create policy installments_owner on public.installments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.projects p where p.id = project_id and p.owner_id = (select auth.uid()))
  );

create policy payments_owner on public.payments
  for all to authenticated
  using (owner_id = (select auth.uid()))
  with check (
    owner_id = (select auth.uid())
    and exists (select 1 from public.installments i where i.id = installment_id and i.owner_id = (select auth.uid()))
  );

-- Nada para o papel anônimo; acesso explícito para usuários logados (filtrado pelo RLS).
revoke all on public.clients, public.projects, public.installments, public.payments from anon;
grant select, insert, update, delete on public.clients, public.projects, public.installments, public.payments to authenticated;

-- ---------------------------------------------------------------------
-- Funções (SECURITY INVOKER: rodam como o usuário, RLS continua valendo)
-- ---------------------------------------------------------------------

-- Valida e grava o cronograma de parcelas de um projeto.
create function public._write_schedule(
  p_project_id uuid,
  p_remaining  bigint,
  p_schedule   jsonb
) returns void
language plpgsql set search_path = '' as $$
declare
  v_sum   bigint;
  v_count integer;
begin
  if jsonb_typeof(p_schedule) <> 'array' then
    raise exception 'invalid: schedule';
  end if;

  select coalesce(sum((e->>'amount_cents')::bigint), 0), count(*)
    into v_sum, v_count
    from jsonb_array_elements(p_schedule) e;

  if v_sum <> p_remaining then
    raise exception 'invalid: soma das parcelas (%) difere do restante (%)', v_sum, p_remaining;
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_schedule) with ordinality as t(e, idx)
     where (e->>'number')::integer <> idx
        or (e->>'amount_cents')::bigint <= 0
        or (e->>'due_date') is null
  ) then
    raise exception 'invalid: parcela';
  end if;

  insert into public.installments (project_id, number, amount_cents, due_date)
  select p_project_id, (e->>'number')::integer, (e->>'amount_cents')::bigint, (e->>'due_date')::date
    from jsonb_array_elements(p_schedule) e;
end $$;

-- Cria cliente + projeto + parcelas numa única transação.
create function public.create_client_with_project(
  p_full_name          text,
  p_whatsapp           text,
  p_project_name       text,
  p_total_cents        bigint,
  p_down_payment_cents bigint,
  p_plan               text,
  p_installments_count integer,
  p_first_due_date     date,
  p_schedule           jsonb
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_client_id  uuid;
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.clients (full_name, whatsapp)
  values (btrim(p_full_name), p_whatsapp)
  returning id into v_client_id;

  insert into public.projects (client_id, name, total_cents, down_payment_cents, plan, installments_count, first_due_date)
  values (v_client_id, btrim(p_project_name), p_total_cents, p_down_payment_cents, p_plan, p_installments_count, p_first_due_date)
  returning id into v_project_id;

  perform public._write_schedule(v_project_id, p_total_cents - p_down_payment_cents, p_schedule);
  return v_client_id;
end $$;

-- Atualiza cliente/projeto. Se os termos financeiros mudarem, refaz as
-- parcelas — mas só se ainda não houver nenhum pagamento registrado.
create function public.update_client_with_project(
  p_client_id          uuid,
  p_full_name          text,
  p_whatsapp           text,
  p_project_name       text,
  p_total_cents        bigint,
  p_down_payment_cents bigint,
  p_plan               text,
  p_installments_count integer,
  p_first_due_date     date,
  p_schedule           jsonb
) returns void
language plpgsql set search_path = '' as $$
declare
  v_project public.projects;
  v_current jsonb;
  v_changed boolean;
begin
  select * into v_project
    from public.projects
   where client_id = p_client_id
   order by created_at desc
   limit 1
   for update;

  if not found then
    raise exception 'not_found';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('number', number, 'amount_cents', amount_cents, 'due_date', due_date) order by number), '[]'::jsonb)
    into v_current
    from public.installments
   where project_id = v_project.id;

  v_changed :=
       v_project.total_cents        <> p_total_cents
    or v_project.down_payment_cents <> p_down_payment_cents
    or v_project.plan               <> p_plan
    or v_project.installments_count <> p_installments_count
    or v_project.first_due_date is distinct from p_first_due_date
    or v_current <> (
      select coalesce(jsonb_agg(jsonb_build_object(
               'number', (e->>'number')::integer,
               'amount_cents', (e->>'amount_cents')::bigint,
               'due_date', (e->>'due_date')::date) order by (e->>'number')::integer), '[]'::jsonb)
        from jsonb_array_elements(p_schedule) e
    );

  update public.clients
     set full_name = btrim(p_full_name), whatsapp = p_whatsapp
   where id = p_client_id;

  update public.projects set name = btrim(p_project_name) where id = v_project.id;

  if v_changed then
    if exists (
      select 1 from public.payments pay
        join public.installments i on i.id = pay.installment_id
       where i.project_id = v_project.id
    ) then
      raise exception 'locked_financials';
    end if;

    delete from public.installments where project_id = v_project.id;

    update public.projects
       set total_cents = p_total_cents,
           down_payment_cents = p_down_payment_cents,
           plan = p_plan,
           installments_count = p_installments_count,
           first_due_date = p_first_due_date
     where id = v_project.id;

    perform public._write_schedule(v_project.id, p_total_cents - p_down_payment_cents, p_schedule);
  end if;
end $$;

-- Registra o pagamento de uma parcela com o valor exato dela.
-- A constraint unique(installment_id) impede duplicidade mesmo com cliques simultâneos.
create function public.register_payment(
  p_installment_id uuid,
  p_paid_at        date
) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_amount bigint;
  v_id     uuid;
begin
  select amount_cents into v_amount from public.installments where id = p_installment_id;
  if not found then
    raise exception 'not_found';
  end if;

  if p_paid_at is null or p_paid_at > (now() at time zone 'America/Sao_Paulo')::date + 1 then
    raise exception 'invalid: data de pagamento';
  end if;

  insert into public.payments (installment_id, amount_cents, paid_at)
  values (p_installment_id, v_amount, p_paid_at)
  returning id into v_id;

  return v_id;
exception
  when unique_violation then
    raise exception 'already_paid';
end $$;

revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public._write_schedule(uuid, bigint, jsonb) from public, anon;
grant execute on function public._write_schedule(uuid, bigint, jsonb) to authenticated;
revoke execute on function public.create_client_with_project(text, text, text, bigint, bigint, text, integer, date, jsonb) from public, anon;
revoke execute on function public.update_client_with_project(uuid, text, text, text, bigint, bigint, text, integer, date, jsonb) from public, anon;
revoke execute on function public.register_payment(uuid, date) from public, anon;
grant execute on function public.create_client_with_project(text, text, text, bigint, bigint, text, integer, date, jsonb) to authenticated;
grant execute on function public.update_client_with_project(uuid, text, text, text, bigint, bigint, text, integer, date, jsonb) to authenticated;
grant execute on function public.register_payment(uuid, date) to authenticated;
