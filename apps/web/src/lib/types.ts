export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  min_stock: number;
  active: boolean;
  category_id: string | null;
  categories: { id: string; name: string } | null;
}

export interface Customer {
  id: string;
  name: string;
  document: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
}

export interface Sale {
  id: string;
  total: number;
  status: "completed" | "cancelled";
  notes: string | null;
  created_at: string;
  customers: { id: string; name: string } | null;
}
