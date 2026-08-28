-- Customers and sales. Sales are never inserted directly by clients — the
-- create_sale RPC below is the only path, so a sale and its stock
-- deduction always happen atomically (either both succeed or neither does).

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  document text,
  phone text,
  email text,
  address text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_organization_id_idx on customers(organization_id);

create trigger customers_set_updated_at
  before update on customers
  for each row
  execute function public.set_updated_at();

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  status text not null default 'completed' check (status in ('completed', 'cancelled')),
  total numeric(12, 2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists sales_organization_id_idx on sales(organization_id, created_at desc);
create index if not exists sales_customer_id_idx on sales(customer_id);

create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  product_id uuid not null references products(id) on delete restrict,
  quantity numeric(14, 3) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  subtotal numeric(12, 2) not null
);

create index if not exists sale_items_sale_id_idx on sale_items(sale_id);
create index if not exists sale_items_product_id_idx on sale_items(product_id);

-- Creates a sale, its line items, and the matching "saida" stock movements
-- in one transaction. p_items is a JSON array of
-- {product_id, quantity, unit_price}. Every product is re-checked against
-- p_organization_id server-side (never trust the client to only send its
-- own org's product ids), and apply_stock_movement() (0002) rejects the
-- whole transaction if any item would take stock negative.
create or replace function public.create_sale(
  p_organization_id uuid,
  p_customer_id uuid,
  p_items jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_item jsonb;
  v_total numeric(12, 2) := 0;
  v_product_id uuid;
  v_quantity numeric(14, 3);
  v_unit_price numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_product_org uuid;
begin
  if not is_org_member(p_organization_id) then
    raise exception 'not a member of this organization';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'a venda precisa de pelo menos um item';
  end if;

  if p_customer_id is not null then
    perform 1 from customers
      where id = p_customer_id and organization_id = p_organization_id;
    if not found then
      raise exception 'cliente nao pertence a esta organizacao';
    end if;
  end if;

  insert into sales (organization_id, customer_id, status, total, notes, created_by)
  values (p_organization_id, p_customer_id, 'completed', 0, p_notes, auth.uid())
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'quantidade invalida para o produto %', v_product_id;
    end if;

    if v_unit_price is null or v_unit_price < 0 then
      raise exception 'preco invalido para o produto %', v_product_id;
    end if;

    select organization_id into v_product_org from products where id = v_product_id;
    if v_product_org is null or v_product_org <> p_organization_id then
      raise exception 'produto % nao pertence a esta organizacao', v_product_id;
    end if;

    v_subtotal := round(v_quantity * v_unit_price, 2);
    v_total := v_total + v_subtotal;

    insert into sale_items (sale_id, organization_id, product_id, quantity, unit_price, subtotal)
    values (v_sale_id, p_organization_id, v_product_id, v_quantity, v_unit_price, v_subtotal);

    insert into stock_movements (organization_id, product_id, type, quantity, reference_type, reference_id, created_by)
    values (p_organization_id, v_product_id, 'saida', v_quantity, 'sale', v_sale_id, auth.uid());
  end loop;

  update sales set total = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

grant execute on function public.create_sale(uuid, uuid, jsonb, text) to authenticated;

-- Cancels a sale and reverses its stock movements ("entrada" for each item)
-- so cancelling twice, or cancelling a non-completed sale, is a no-op error
-- rather than double-crediting stock.
create or replace function public.cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales%rowtype;
  v_item sale_items%rowtype;
begin
  select * into v_sale from sales where id = p_sale_id;

  if not found then
    raise exception 'venda nao encontrada';
  end if;

  if not is_org_member(v_sale.organization_id) then
    raise exception 'not a member of this organization';
  end if;

  if v_sale.status <> 'completed' then
    raise exception 'apenas vendas concluidas podem ser canceladas';
  end if;

  for v_item in select * from sale_items where sale_id = p_sale_id
  loop
    insert into stock_movements (organization_id, product_id, type, quantity, reason, reference_type, reference_id, created_by)
    values (v_sale.organization_id, v_item.product_id, 'entrada', v_item.quantity, 'cancelamento de venda', 'sale_cancel', p_sale_id, auth.uid());
  end loop;

  update sales set status = 'cancelled' where id = p_sale_id;
end;
$$;

grant execute on function public.cancel_sale(uuid) to authenticated;

alter table customers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;

create policy "members can view customers"
  on customers for select
  using (is_org_member(organization_id));

create policy "members can insert customers"
  on customers for insert
  with check (is_org_member(organization_id));

create policy "members can update customers"
  on customers for update
  using (is_org_member(organization_id))
  with check (is_org_member(organization_id));

create policy "members can delete customers"
  on customers for delete
  using (is_org_member(organization_id));

create policy "members can view sales"
  on sales for select
  using (is_org_member(organization_id));

create policy "members can view sale items"
  on sale_items for select
  using (is_org_member(organization_id));

-- No insert/update/delete policies on sales or sale_items: every write
-- goes through create_sale / cancel_sale (security definer, bypasses RLS),
-- so totals and stock movements can never drift out of sync with the rows
-- a client wrote directly.
