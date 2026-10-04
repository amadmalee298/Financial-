// Database types for supabase/migrations (001_initial_schema, 002_manual_prices).
// Same shape as `npx supabase gen types typescript`; regenerate with that
// command once the project is linked, and keep this file in sync otherwise.
//
// Note: Postgres `numeric` arrives as a JS number. Convert it with
// `toDecimal()` (lib/utils/decimal.ts) before doing any money math.
// Inserts/updates also accept strings so exact Decimal values can be sent
// (`decimal.toString()`); PostgREST casts them to numeric without rounding.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          default_currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          default_currency?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      stocks: {
        Row: {
          id: string;
          symbol: string;
          name: string | null;
          market: string;
          sector: string | null;
          currency: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          name?: string | null;
          market?: string;
          sector?: string | null;
          currency?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          name?: string | null;
          market?: string;
          sector?: string | null;
          currency?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          stock_id: string;
          transaction_type: "BUY" | "SELL";
          trade_date: string;
          quantity: number;
          price: number;
          commission: number;
          fees: number;
          vat: number;
          total_amount: number;
          broker: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          stock_id: string;
          transaction_type: "BUY" | "SELL";
          trade_date: string;
          quantity: number | string;
          price: number | string;
          commission?: number | string;
          fees?: number | string;
          vat?: number | string;
          broker?: string | null;
          note?: string | null;
          created_at?: string;
          total_amount?: never;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_id?: string;
          transaction_type?: "BUY" | "SELL";
          trade_date?: string;
          quantity?: number | string;
          price?: number | string;
          commission?: number | string;
          fees?: number | string;
          vat?: number | string;
          broker?: string | null;
          note?: string | null;
          created_at?: string;
          total_amount?: never;
        };
        Relationships: [
          {
            foreignKeyName: "transactions_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      dividends: {
        Row: {
          id: string;
          user_id: string;
          stock_id: string;
          xd_date: string | null;
          payment_date: string | null;
          shares: number | null;
          dividend_per_share: number | null;
          gross_amount: number | null;
          withholding_tax: number | null;
          net_amount: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          stock_id: string;
          xd_date?: string | null;
          payment_date?: string | null;
          shares?: number | string | null;
          dividend_per_share?: number | string | null;
          gross_amount?: number | string | null;
          withholding_tax?: number | string | null;
          net_amount?: number | string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_id?: string;
          xd_date?: string | null;
          payment_date?: string | null;
          shares?: number | string | null;
          dividend_per_share?: number | string | null;
          gross_amount?: number | string | null;
          withholding_tax?: number | string | null;
          net_amount?: number | string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dividends_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      watchlists: {
        Row: {
          id: string;
          user_id: string;
          stock_id: string;
          target_price: number | null;
          buy_price: number | null;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          stock_id: string;
          target_price?: number | string | null;
          buy_price?: number | string | null;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_id?: string;
          target_price?: number | string | null;
          buy_price?: number | string | null;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "watchlists_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      stock_analysis: {
        Row: {
          id: string;
          user_id: string;
          stock_id: string;
          investment_thesis: string | null;
          strengths: string | null;
          risks: string | null;
          revenue: number | null;
          net_profit: number | null;
          eps: number | null;
          pe: number | null;
          pbv: number | null;
          roe: number | null;
          roa: number | null;
          debt_equity: number | null;
          dividend_yield: number | null;
          fair_value: number | null;
          target_price: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          stock_id: string;
          investment_thesis?: string | null;
          strengths?: string | null;
          risks?: string | null;
          revenue?: number | string | null;
          net_profit?: number | string | null;
          eps?: number | string | null;
          pe?: number | string | null;
          pbv?: number | string | null;
          roe?: number | string | null;
          roa?: number | string | null;
          debt_equity?: number | string | null;
          dividend_yield?: number | string | null;
          fair_value?: number | string | null;
          target_price?: number | string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          stock_id?: string;
          investment_thesis?: string | null;
          strengths?: string | null;
          risks?: string | null;
          revenue?: number | string | null;
          net_profit?: number | string | null;
          eps?: number | string | null;
          pe?: number | string | null;
          pbv?: number | string | null;
          roe?: number | string | null;
          roa?: number | string | null;
          debt_equity?: number | string | null;
          dividend_yield?: number | string | null;
          fair_value?: number | string | null;
          target_price?: number | string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_analysis_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      cash_transactions: {
        Row: {
          id: string;
          user_id: string;
          transaction_type: "DEPOSIT" | "WITHDRAW";
          transaction_date: string;
          amount: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          transaction_type: "DEPOSIT" | "WITHDRAW";
          transaction_date: string;
          amount: number | string;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          transaction_type?: "DEPOSIT" | "WITHDRAW";
          transaction_date?: string;
          amount?: number | string;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      manual_prices: {
        Row: {
          user_id: string;
          stock_id: string;
          price: number;
          price_date: string;
          updated_at: string;
        };
        Insert: {
          user_id?: string;
          stock_id: string;
          price: number | string;
          price_date?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          stock_id?: string;
          price?: number | string;
          price_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manual_prices_stock_id_fkey";
            columns: ["stock_id"];
            isOneToOne: false;
            referencedRelation: "stocks";
            referencedColumns: ["id"];
          },
        ];
      };
      portfolio_snapshots: {
        Row: {
          id: string;
          user_id: string;
          snapshot_date: string;
          market_value: number;
          cost_basis: number;
          cash_balance: number;
          realized_pl: number;
          dividends: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          snapshot_date: string;
          market_value?: number | string;
          cost_basis?: number | string;
          cash_balance?: number | string;
          realized_pl?: number | string;
          dividends?: number | string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          snapshot_date?: string;
          market_value?: number | string;
          cost_basis?: number | string;
          cash_balance?: number | string;
          realized_pl?: number | string;
          dividends?: number | string;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];

export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];
