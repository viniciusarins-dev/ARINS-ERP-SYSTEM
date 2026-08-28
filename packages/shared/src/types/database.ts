// Hand-written to mirror supabase/migrations/*.sql. If the schema changes,
// update this file in the same commit (or regenerate with
// `supabase gen types typescript` once a live project is linked).

export type MembershipRole = "owner" | "admin" | "staff";
export type StockMovementType = "entrada" | "saida" | "ajuste";
export type SaleStatus = "completed" | "cancelled";
export type RegimeTributario = "simples_nacional" | "lucro_presumido" | "lucro_real";
export type FiscalEnvironment = "homologacao" | "producao";
export type FiscalProviderStatus = "pending" | "active" | "error";
export type FiscalDocumentType = "nfce" | "nfe";
export type FiscalDocumentStatus = "pending" | "processing" | "authorized" | "rejected" | "cancelled";

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          slug: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role?: MembershipRole;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          user_id: string;
          role: MembershipRole;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "memberships_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          name: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          organization_id: string;
          category_id: string | null;
          sku: string;
          name: string;
          unit: string;
          cost_price: number;
          sale_price: number;
          stock_quantity: number;
          min_stock: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          category_id?: string | null;
          sku: string;
          name: string;
          unit?: string;
          cost_price?: number;
          sale_price?: number;
          stock_quantity?: number;
          min_stock?: number;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          category_id: string | null;
          sku: string;
          name: string;
          unit: string;
          cost_price: number;
          sale_price: number;
          stock_quantity: number;
          min_stock: number;
          active: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          organization_id: string;
          product_id: string;
          type: StockMovementType;
          quantity: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          product_id: string;
          type: StockMovementType;
          quantity: number;
          reason?: string | null;
          reference_type?: string | null;
          reference_id?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          product_id: string;
          type: StockMovementType;
          quantity: number;
          reason: string | null;
          reference_type: string | null;
          reference_id: string | null;
          created_by: string | null;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      customers: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          document?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          notes?: string | null;
          active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          name: string;
          document: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          notes: string | null;
          active: boolean;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      sales: {
        Row: {
          id: string;
          organization_id: string;
          customer_id: string | null;
          status: SaleStatus;
          total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          customer_id?: string | null;
          status?: SaleStatus;
          total?: number;
          notes?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          customer_id: string | null;
          status: SaleStatus;
          total: number;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          organization_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Insert: {
          id?: string;
          sale_id: string;
          organization_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        };
        Update: Partial<{
          id: string;
          sale_id: string;
          organization_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          subtotal: number;
        }>;
        Relationships: [
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      fiscal_configs: {
        Row: {
          id: string;
          organization_id: string;
          cnpj: string;
          regime_tributario: RegimeTributario;
          inscricao_estadual: string | null;
          environment: FiscalEnvironment;
          provider: string;
          provider_status: FiscalProviderStatus;
          provider_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          cnpj: string;
          regime_tributario: RegimeTributario;
          inscricao_estadual?: string | null;
          environment?: FiscalEnvironment;
          provider?: string;
          provider_status?: FiscalProviderStatus;
          provider_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          cnpj: string;
          regime_tributario: RegimeTributario;
          inscricao_estadual: string | null;
          environment: FiscalEnvironment;
          provider: string;
          provider_status: FiscalProviderStatus;
          provider_error: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      fiscal_documents: {
        Row: {
          id: string;
          organization_id: string;
          sale_id: string;
          type: FiscalDocumentType;
          status: FiscalDocumentStatus;
          provider_ref: string | null;
          numero: string | null;
          serie: string | null;
          chave_acesso: string | null;
          xml_url: string | null;
          danfe_url: string | null;
          error_message: string | null;
          requested_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          sale_id: string;
          type: FiscalDocumentType;
          status?: FiscalDocumentStatus;
          provider_ref?: string | null;
          numero?: string | null;
          serie?: string | null;
          chave_acesso?: string | null;
          xml_url?: string | null;
          danfe_url?: string | null;
          error_message?: string | null;
          requested_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          id: string;
          organization_id: string;
          sale_id: string;
          type: FiscalDocumentType;
          status: FiscalDocumentStatus;
          provider_ref: string | null;
          numero: string | null;
          serie: string | null;
          chave_acesso: string | null;
          xml_url: string | null;
          danfe_url: string | null;
          error_message: string | null;
          requested_by: string | null;
          created_at: string;
          updated_at: string;
        }>;
        Relationships: [
          {
            foreignKeyName: "fiscal_documents_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: true;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_organization_with_owner: {
        Args: { p_name: string; p_slug: string };
        Returns: string;
      };
      create_sale: {
        Args: {
          p_organization_id: string;
          p_customer_id: string | null;
          p_items: { product_id: string; quantity: number; unit_price: number }[];
          p_notes?: string | null;
        };
        Returns: string;
      };
      cancel_sale: {
        Args: { p_sale_id: string };
        Returns: void;
      };
      is_org_member: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
      is_org_admin: {
        Args: { p_organization_id: string };
        Returns: boolean;
      };
    };
  };
}
