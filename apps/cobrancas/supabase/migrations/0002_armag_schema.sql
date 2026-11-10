-- =====================================================================
-- ARMAG COBRANÇAS — esquema multiusuário por empresa
-- Substitui o esquema pessoal da 0001 (tabelas vazias no momento da troca).
--
-- organizations ─┬─ memberships (usuários + papel)
--                ├─ clients ── charges ── payments (parciais)
--                └─ activities (log automático por triggers)
--
-- Regras críticas ficam no banco:
--   * RLS por empresa: cada usuário só enxerga a própria empresa.
--   * Pagamento nunca ultrapassa o saldo da cobrança (trigger com lock).
--   * idempotency_key única: o mesmo pagamento não entra duas vezes.
--   * Valor da cobrança não pode ficar abaixo do que já foi pago.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Remove o esquema anterior
-- ---------------------------------------------------------------------
-- Sem operações destrutivas: as tabelas e funções antigas (vazias) são movidas
-- para o schema "legacy", fora da API, e podem ser apagadas depois com segurança.
create schema if not exists legacy;
revoke all on schema legacy from public, anon, authenticated;
alter table if exists public.payments     set schema legacy;
alter table if exists public.installments set schema legacy;
alter table if exists public.projects     set schema legacy;
alter table if exists public.clients      set schema legacy;
alter function public.register_payment(uuid, date) set schema legacy;
alter function public.update_client_with_project(uuid, text, text, text, bigint, bigint, text, integer, date, jsonb) set schema legacy;
alter function public.create_client_with_project(text, text, text, bigint, bigint, text, integer, date, jsonb) set schema legacy;
alter function public._write_schedule(uuid, bigint, jsonb) set schema legacy;

-- ---------------------------------------------------------------------
-- Empresa e usuários
-- ---------------------------------------------------------------------
create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 2 and 160),
  document    text check (document ~ '^([0-9]{11}|[0-9]{14})$'),
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  address     jsonb not null default '{}'::jsonb,
  settings    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.memberships (
  org_id      uuid not null references public.organizations (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        text not null check (role in ('owner', 'admin', 'operador')),
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  primary key (org_id, user_id)
);
-- Cada usuário pertence a uma única empresa.
create unique index memberships_one_org_per_user on public.memberships (user_id);

-- Funções auxiliares usadas pelas políticas (SECURITY DEFINER evita recursão de RLS).
create function public.current_org_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select org_id from public.memberships where user_id = auth.uid()
$$;

create function public.current_member_role() returns text
language sql stable security definer set search_path = '' as $$
  select role from public.memberships where user_id = auth.uid()
$$;

-- ---------------------------------------------------------------------
-- Clientes, cobranças, pagamentos
-- ---------------------------------------------------------------------
create table public.clients (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default public.current_org_id() references public.organizations (id) on delete cascade,
  kind        text not null check (kind in ('pf', 'pj')),
  name        text not null check (char_length(btrim(name)) between 2 and 160),
  document    text,
  email       text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  cep         text check (cep is null or cep ~ '^[0-9]{8}$'),
  street      text,
  number      text,
  complement  text,
  district    text,
  city        text,
  state       text check (state is null or state ~ '^[A-Z]{2}$'),
  notes       text check (notes is null or char_length(notes) <= 2000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint clients_document_format check (
    document is null
    or (kind = 'pf' and document ~ '^[0-9]{11}$')
    or (kind = 'pj' and document ~ '^[0-9]{14}$')
  ),
  unique (org_id, id),
  unique (org_id, document)
);

create table public.charges (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null default public.current_org_id() references public.organizations (id) on delete cascade,
  client_id           uuid not null,
  description         text not null check (char_length(btrim(description)) between 1 and 200),
  amount_cents        bigint not null check (amount_cents > 0 and amount_cents <= 100000000000),
  due_date            date not null,
  category            text check (category is null or char_length(category) <= 60),
  payment_method      text not null check (payment_method in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  notes               text check (notes is null or char_length(notes) <= 2000),
  group_id            uuid,
  installment_number  integer,
  installment_total   integer,
  canceled_at         timestamptz,
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  foreign key (org_id, client_id) references public.clients (org_id, id) on delete cascade,
  unique (org_id, id),
  constraint charges_installment_consistency check (
    (group_id is null and installment_number is null and installment_total is null)
    or (group_id is not null and installment_number between 1 and installment_total and installment_total between 1 and 120)
  )
);

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null default public.current_org_id() references public.organizations (id) on delete cascade,
  charge_id        uuid not null,
  amount_cents     bigint not null check (amount_cents > 0),
  paid_at          date not null,
  method           text not null check (method in ('pix', 'boleto', 'cartao', 'transferencia', 'dinheiro', 'outro')),
  notes            text check (notes is null or char_length(notes) <= 500),
  idempotency_key  uuid not null unique,
  created_by       uuid default auth.uid() references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  foreign key (org_id, charge_id) references public.charges (org_id, id) on delete cascade
);

create table public.activities (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations (id) on delete cascade,
  actor_id      uuid references auth.users (id) on delete set null,
  kind          text not null,
  client_name   text,
  description   text,
  amount_cents  bigint,
  ref_id        uuid,
  created_at    timestamptz not null default now()
);

create index clients_org_idx      on public.clients (org_id, name);
create index charges_org_due_idx  on public.charges (org_id, due_date);
create index charges_client_idx   on public.charges (client_id);
create index charges_group_idx    on public.charges (group_id) where group_id is not null;
create index payments_charge_idx  on public.payments (charge_id);
create index payments_org_idx     on public.payments (org_id, paid_at);
create index activities_org_idx   on public.activities (org_id, created_at desc);

-- ---------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger organizations_touch before update on public.organizations for each row execute function public.touch_updated_at();
create trigger clients_touch       before update on public.clients       for each row execute function public.touch_updated_at();
create trigger charges_touch       before update on public.charges       for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Integridade financeira
-- ---------------------------------------------------------------------

-- Pagamento: trava a cobrança e garante que a soma nunca passe do valor.
create function public.check_payment() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_amount   bigint;
  v_canceled timestamptz;
  v_paid     bigint;
begin
  select amount_cents, canceled_at into v_amount, v_canceled
    from public.charges where id = new.charge_id for update;
  if not found then
    raise exception 'not_found';
  end if;
  if v_canceled is not null then
    raise exception 'charge_canceled';
  end if;
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where charge_id = new.charge_id;
  if v_paid + new.amount_cents > v_amount then
    raise exception 'exceeds_remaining: restante %', v_amount - v_paid;
  end if;
  if new.paid_at > (now() at time zone 'America/Sao_Paulo')::date + 1 then
    raise exception 'invalid: data de pagamento no futuro';
  end if;
  return new;
end $$;

create trigger payments_check before insert on public.payments for each row execute function public.check_payment();

-- Cobrança: valor não pode ficar abaixo do já recebido; pagas não são canceladas.
create function public.check_charge_update() returns trigger
language plpgsql set search_path = '' as $$
declare
  v_paid bigint;
begin
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where charge_id = new.id;
  if new.amount_cents < v_paid then
    raise exception 'amount_below_paid: já recebido %', v_paid;
  end if;
  if new.canceled_at is not null and old.canceled_at is null and v_paid >= new.amount_cents then
    raise exception 'invalid: cobrança quitada não pode ser cancelada';
  end if;
  return new;
end $$;

create trigger charges_check before update on public.charges for each row execute function public.check_charge_update();

-- ---------------------------------------------------------------------
-- Atividades (log automático)
-- ---------------------------------------------------------------------
create function public.log_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_client text;
  v_desc   text;
begin
  if tg_table_name = 'clients' then
    if tg_op = 'INSERT' then
      insert into public.activities (org_id, actor_id, kind, client_name, ref_id)
      values (new.org_id, auth.uid(), 'client_created', new.name, new.id);
    elsif tg_op = 'DELETE' then
      insert into public.activities (org_id, actor_id, kind, client_name, ref_id)
      values (old.org_id, auth.uid(), 'client_deleted', old.name, old.id);
    end if;

  elsif tg_table_name = 'charges' then
    if tg_op = 'INSERT' then
      -- Parcelamentos geram um único registro (na parcela 1).
      if new.group_id is null or new.installment_number = 1 then
        select name into v_client from public.clients where id = new.client_id;
        insert into public.activities (org_id, actor_id, kind, client_name, description, amount_cents, ref_id)
        values (new.org_id, auth.uid(), 'charge_created', v_client,
                case when new.group_id is null then new.description
                     else new.description || ' (' || new.installment_total || 'x)' end,
                new.amount_cents, new.id);
      end if;
    elsif tg_op = 'UPDATE' and new.canceled_at is not null and old.canceled_at is null then
      select name into v_client from public.clients where id = new.client_id;
      insert into public.activities (org_id, actor_id, kind, client_name, description, amount_cents, ref_id)
      values (new.org_id, auth.uid(), 'charge_canceled', v_client, new.description, new.amount_cents, new.id);
    elsif tg_op = 'DELETE' then
      -- Em exclusão em cascata (cliente apagado) não registra cada cobrança.
      select name into v_client from public.clients where id = old.client_id;
      if found then
        insert into public.activities (org_id, actor_id, kind, client_name, description, amount_cents, ref_id)
        values (old.org_id, auth.uid(), 'charge_deleted', v_client, old.description, old.amount_cents, old.id);
      end if;
    end if;

  elsif tg_table_name = 'payments' then
    select c.description, cl.name into v_desc, v_client
      from public.charges c join public.clients cl on cl.id = c.client_id
     where c.id = coalesce(new.charge_id, old.charge_id);
    if tg_op = 'INSERT' then
      insert into public.activities (org_id, actor_id, kind, client_name, description, amount_cents, ref_id)
      values (new.org_id, auth.uid(), 'payment_created', v_client, v_desc, new.amount_cents, new.charge_id);
    elsif tg_op = 'DELETE' and v_desc is not null then
      insert into public.activities (org_id, actor_id, kind, client_name, description, amount_cents, ref_id)
      values (old.org_id, auth.uid(), 'payment_deleted', v_client, v_desc, old.amount_cents, old.charge_id);
    end if;
  end if;
  return coalesce(new, old);
end $$;

create trigger clients_log  after insert or delete on public.clients for each row execute function public.log_activity();
create trigger charges_log  after insert or update or delete on public.charges for each row execute function public.log_activity();
create trigger payments_log after insert or delete on public.payments for each row execute function public.log_activity();

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.memberships   enable row level security;
alter table public.clients       enable row level security;
alter table public.charges       enable row level security;
alter table public.payments      enable row level security;
alter table public.activities    enable row level security;

create policy org_select on public.organizations for select to authenticated
  using (id = (select public.current_org_id()));
create policy org_update on public.organizations for update to authenticated
  using (id = (select public.current_org_id()) and (select public.current_member_role()) in ('owner', 'admin'))
  with check (id = (select public.current_org_id()));

create policy members_select on public.memberships for select to authenticated
  using (org_id = (select public.current_org_id()));

create policy clients_select on public.clients for select to authenticated
  using (org_id = (select public.current_org_id()));
create policy clients_insert on public.clients for insert to authenticated
  with check (org_id = (select public.current_org_id()));
create policy clients_update on public.clients for update to authenticated
  using (org_id = (select public.current_org_id()))
  with check (org_id = (select public.current_org_id()));
create policy clients_delete on public.clients for delete to authenticated
  using (org_id = (select public.current_org_id()) and (select public.current_member_role()) in ('owner', 'admin'));

create policy charges_select on public.charges for select to authenticated
  using (org_id = (select public.current_org_id()));
create policy charges_insert on public.charges for insert to authenticated
  with check (org_id = (select public.current_org_id()));
create policy charges_update on public.charges for update to authenticated
  using (org_id = (select public.current_org_id()))
  with check (org_id = (select public.current_org_id()));
create policy charges_delete on public.charges for delete to authenticated
  using (org_id = (select public.current_org_id()) and (select public.current_member_role()) in ('owner', 'admin'));

create policy payments_select on public.payments for select to authenticated
  using (org_id = (select public.current_org_id()));
create policy payments_insert on public.payments for insert to authenticated
  with check (org_id = (select public.current_org_id()));
create policy payments_delete on public.payments for delete to authenticated
  using (org_id = (select public.current_org_id()) and (select public.current_member_role()) in ('owner', 'admin'));

create policy activities_select on public.activities for select to authenticated
  using (org_id = (select public.current_org_id()));

revoke all on public.organizations, public.memberships, public.clients, public.charges, public.payments, public.activities from anon;
grant select, update                  on public.organizations to authenticated;
grant select                          on public.memberships   to authenticated;
grant select, insert, update, delete  on public.clients       to authenticated;
grant select, insert, update, delete  on public.charges       to authenticated;
grant select, insert, delete          on public.payments      to authenticated;
grant select                          on public.activities    to authenticated;

-- ---------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------

-- Primeiro acesso: cria a empresa e torna o usuário proprietário.
create function public.create_organization(p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_org   uuid;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if exists (select 1 from public.memberships where user_id = auth.uid()) then
    raise exception 'already_member';
  end if;
  select email into v_email from auth.users where id = auth.uid();
  insert into public.organizations (name) values (btrim(p_name)) returning id into v_org;
  insert into public.memberships (org_id, user_id, role, email) values (v_org, auth.uid(), 'owner', v_email);
  return v_org;
end $$;

-- Proprietário altera o papel de outro usuário.
create function public.update_member_role(p_user_id uuid, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_member_role() is distinct from 'owner' then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'invalid: não é possível alterar o próprio papel';
  end if;
  if p_role not in ('admin', 'operador') then
    raise exception 'invalid: papel';
  end if;
  update public.memberships set role = p_role
   where user_id = p_user_id and org_id = public.current_org_id();
  if not found then
    raise exception 'not_found';
  end if;
end $$;

-- Proprietário remove um usuário da empresa (a conta de login é apagada pela Edge Function).
create function public.remove_member(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.current_member_role() is distinct from 'owner' then
    raise exception 'forbidden';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'invalid: não é possível remover a si mesmo';
  end if;
  delete from public.memberships where user_id = p_user_id and org_id = public.current_org_id();
  if not found then
    raise exception 'not_found';
  end if;
end $$;

-- Usuário atualiza o próprio nome de exibição.
create function public.update_my_profile(p_full_name text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.memberships set full_name = nullif(btrim(p_full_name), '') where user_id = auth.uid();
end $$;

revoke execute on function public.current_org_id()                 from public, anon;
revoke execute on function public.current_member_role()            from public, anon;
revoke execute on function public.create_organization(text)        from public, anon;
revoke execute on function public.update_member_role(uuid, text)   from public, anon;
revoke execute on function public.remove_member(uuid)              from public, anon;
revoke execute on function public.update_my_profile(text)          from public, anon;
revoke execute on function public.check_payment()                  from public, anon, authenticated;
revoke execute on function public.check_charge_update()            from public, anon, authenticated;
revoke execute on function public.log_activity()                   from public, anon, authenticated;
grant execute on function public.current_org_id()                  to authenticated;
grant execute on function public.current_member_role()             to authenticated;
grant execute on function public.create_organization(text)         to authenticated;
grant execute on function public.update_member_role(uuid, text)    to authenticated;
grant execute on function public.remove_member(uuid)               to authenticated;
grant execute on function public.update_my_profile(text)           to authenticated;
