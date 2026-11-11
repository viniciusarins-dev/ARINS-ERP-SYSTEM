-- =====================================================================
-- ARMAG: prospecção (leads) e configurações compartilhadas
-- =====================================================================

create table armag.leads (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid default auth.uid() references auth.users (id) on delete set null,
  name             text not null check (char_length(btrim(name)) between 1 and 160),
  segment          text not null default 'barbearia' check (segment in ('barbearia', 'salao', 'outro')),
  phone            text check (phone is null or phone ~ '^[0-9]{10,11}$'),
  instagram        text check (instagram is null or char_length(instagram) <= 60),
  website          text check (website is null or char_length(website) <= 300),
  address          text check (address is null or char_length(address) <= 300),
  city             text check (city is null or char_length(city) <= 120),
  lat              double precision,
  lon              double precision,
  source           text not null default 'manual' check (source in ('osm', 'manual')),
  source_ref       text unique,
  status           text not null default 'novo'
                   check (status in ('novo', 'contatado', 'interessado', 'proposta', 'fechado', 'sem_interesse')),
  notes            text check (notes is null or char_length(notes) <= 4000),
  last_contact_at  date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index armag_leads_status_idx on armag.leads (status, created_at desc);

create trigger leads_touch before update on armag.leads for each row execute function armag.touch_updated_at();

-- Preferências do ARMAG (ex.: mensagem de apresentação da prospecção)
create table armag.settings (
  key         text primary key check (key ~ '^[a-z_]{1,60}$'),
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

create trigger settings_touch before update on armag.settings for each row execute function armag.touch_updated_at();

alter table armag.leads    enable row level security;
alter table armag.settings enable row level security;

create policy leads_members on armag.leads for all to authenticated
  using ((select armag.is_member())) with check ((select armag.is_member()));
create policy settings_members on armag.settings for all to authenticated
  using ((select armag.is_member())) with check ((select armag.is_member()));

grant select, insert, update, delete on armag.leads, armag.settings to authenticated;
