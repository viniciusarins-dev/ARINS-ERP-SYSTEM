-- =====================================================================
-- ARMAG: prospecção pelo Google Places (serviço "bob")
-- =====================================================================

-- leads vindos do Google
alter table armag.leads drop constraint if exists leads_source_check;
alter table armag.leads add constraint leads_source_check check (source in ('osm', 'manual', 'google'));

-- contador de buscas do mês (controle da cota do Google)
create table if not exists armag.prospect_usage (
  mes     text primary key check (mes ~ '^[0-9]{4}-[0-9]{2}$'),
  buscas  integer not null default 0
);
alter table armag.prospect_usage enable row level security; -- sem policies: só a chave de serviço acessa

create or replace function armag.bump_prospect_usage(p_mes text, p_qtd integer default 1) returns integer
language sql security invoker set search_path = '' as $$
  insert into armag.prospect_usage as u (mes, buscas) values (p_mes, greatest(p_qtd, 0))
  on conflict (mes) do update set buscas = u.buscas + greatest(excluded.buscas, 0)
  returning buscas;
$$;

-- a chave de serviço (Edge Function) precisa de acesso explícito ao schema
grant usage on schema armag to service_role;
grant select, insert, update on armag.leads to service_role;
grant select on armag.clients, armag.settings to service_role;
grant select, insert, update on armag.prospect_usage to service_role;
grant execute on function armag.bump_prospect_usage(text, integer) to service_role;
revoke execute on function armag.bump_prospect_usage(text, integer) from public, anon, authenticated;
