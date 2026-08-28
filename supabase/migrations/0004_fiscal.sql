-- Fiscal (NF-e/NFC-e) configuration and document log.
--
-- The A1 digital certificate itself is never stored here (or anywhere in our
-- database or disk). It is uploaded once through the API, forwarded straight
-- to the fiscal provider (Focus NFe) which takes custody of it, and dropped
-- from server memory as soon as that request finishes. This table only ever
-- holds the non-secret bookkeeping: which CNPJ is configured, whether the
-- provider has accepted the certificate, and the tax regime.
create table if not exists fiscal_configs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade unique,
  cnpj text not null,
  regime_tributario text not null check (regime_tributario in ('simples_nacional', 'lucro_presumido', 'lucro_real')),
  inscricao_estadual text,
  environment text not null default 'homologacao' check (environment in ('homologacao', 'producao')),
  provider text not null default 'focus_nfe',
  provider_status text not null default 'pending' check (provider_status in ('pending', 'active', 'error')),
  provider_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger fiscal_configs_set_updated_at
  before update on fiscal_configs
  for each row
  execute function public.set_updated_at();

-- One row per sale that a fiscal document was requested for. The unique
-- constraint on sale_id is what makes emission idempotent: the API checks
-- this table before calling the provider, so a retried request (network
-- blip, double click) updates the existing row instead of ever creating a
-- second document for the same sale.
create table if not exists fiscal_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  sale_id uuid not null references sales(id) on delete restrict unique,
  type text not null check (type in ('nfce', 'nfe')),
  status text not null default 'pending' check (status in ('pending', 'processing', 'authorized', 'rejected', 'cancelled')),
  provider_ref text,
  numero text,
  serie text,
  chave_acesso text,
  xml_url text,
  danfe_url text,
  error_message text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fiscal_documents_organization_id_idx on fiscal_documents(organization_id, created_at desc);

create trigger fiscal_documents_set_updated_at
  before update on fiscal_documents
  for each row
  execute function public.set_updated_at();

alter table fiscal_configs enable row level security;
alter table fiscal_documents enable row level security;

create policy "members can view fiscal config"
  on fiscal_configs for select
  using (is_org_member(organization_id));

create policy "members can insert fiscal config"
  on fiscal_configs for insert
  with check (is_org_member(organization_id));

create policy "members can update fiscal config"
  on fiscal_configs for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members can view fiscal documents"
  on fiscal_documents for select
  using (is_org_member(organization_id));

create policy "members can insert fiscal documents"
  on fiscal_documents for insert
  with check (is_org_member(organization_id));

create policy "members can update fiscal documents"
  on fiscal_documents for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));
