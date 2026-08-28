-- Catalog: categories, products and stock movements.
--
-- Stock is never edited directly on `products`. Every change in
-- `stock_quantity` — a manual adjustment, a purchase entry, or a sale — goes
-- through a row in `stock_movements`, and a trigger applies the delta to the
-- product. This keeps a full audit trail (who moved what, when, and why)
-- and gives us one place to enforce "stock can never go negative", instead
-- of trusting every caller to check that in application code.

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, name)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  sku text not null,
  name text not null,
  unit text not null default 'un',
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12, 2) not null default 0 check (sale_price >= 0),
  stock_quantity numeric(14, 3) not null default 0,
  min_stock numeric(14, 3) not null default 0 check (min_stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sku)
);

create index if not exists products_organization_id_idx on products(organization_id);
create index if not exists products_category_id_idx on products(category_id);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  type text not null check (type in ('entrada', 'saida', 'ajuste')),
  quantity numeric(14, 3) not null,
  reason text,
  reference_type text,
  reference_id uuid,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint stock_movements_quantity_sign check (
    (type in ('entrada', 'saida') and quantity > 0) or
    (type = 'ajuste' and quantity <> 0)
  )
);

create index if not exists stock_movements_product_id_idx on stock_movements(product_id);
create index if not exists stock_movements_organization_id_idx on stock_movements(organization_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on products
  for each row
  execute function public.set_updated_at();

-- Applies the movement's delta to the product's stock_quantity and rejects
-- it outright if that would take the product negative. This runs
-- regardless of who inserted the row (manual adjustment or the create_sale
-- RPC), so "never sell more than you have" is guaranteed at the database
-- level, not just in the UI.
create or replace function public.apply_stock_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric(14, 3);
  v_new_quantity numeric(14, 3);
begin
  v_delta := case
    when new.type = 'saida' then -new.quantity
    else new.quantity
  end;

  update products
  set stock_quantity = stock_quantity + v_delta
  where id = new.product_id
    and organization_id = new.organization_id
  returning stock_quantity into v_new_quantity;

  if not found then
    raise exception 'produto % nao encontrado nesta organizacao', new.product_id;
  end if;

  if v_new_quantity < 0 then
    raise exception 'estoque insuficiente para o produto %', new.product_id;
  end if;

  return new;
end;
$$;

create trigger stock_movements_apply
  after insert on stock_movements
  for each row
  execute function public.apply_stock_movement();

alter table categories enable row level security;
alter table products enable row level security;
alter table stock_movements enable row level security;

create policy "members can view categories"
  on categories for select
  using (is_org_member(organization_id));

create policy "members can manage categories"
  on categories for insert
  with check (is_org_member(organization_id));

create policy "members can update categories"
  on categories for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members can delete categories"
  on categories for delete
  using (is_org_member(organization_id));

create policy "members can view products"
  on products for select
  using (is_org_member(organization_id));

create policy "members can insert products"
  on products for insert
  with check (is_org_member(organization_id));

create policy "members can update products"
  on products for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members can delete products"
  on products for delete
  using (is_org_member(organization_id));

create policy "members can view stock movements"
  on stock_movements for select
  using (is_org_member(organization_id));

create policy "members can insert stock movements"
  on stock_movements for insert
  with check (is_org_member(organization_id));
