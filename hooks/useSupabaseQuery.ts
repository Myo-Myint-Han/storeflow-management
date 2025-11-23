import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { toast } from "sonner";
import { PostgrestError } from "@supabase/supabase-js";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Store = Database["public"]["Tables"]["stores"]["Row"];
type Sale = Database["public"]["Tables"]["sales"]["Row"];

// ============================================
// QUERY KEYS - Centralized for consistency
// ============================================
export const queryKeys = {
  products: {
    all: ["products"],
    byStore: (storeId?: string) =>
      storeId ? ["products", "store", storeId] : ["products"],
    detail: (id: string) => ["products", id],
  },
  stores: {
    all: ["stores"],
    detail: (id: string) => ["stores", id],
  },
  sales: {
    all: ["sales"],
    byStore: (storeId: string) => ["sales", "store", storeId],
    byDateRange: (start: string, end: string) => [
      "sales",
      "dateRange",
      start,
      end,
    ],
  },
};

// ============================================
// PRODUCTS HOOKS
// ============================================

export function useProducts(storeId?: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: storeId
      ? queryKeys.products.byStore(storeId)
      : queryKeys.products.all,
    queryFn: async () => {
      let query = supabase.from("products").select("*").order("name");

      if (storeId && storeId !== "all") {
        query = query.eq("store_id", storeId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 3 * 60 * 1000,
  });
}

export function useProduct(id: string) {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });
}

export function useCreateProduct() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      productData: Database["public"]["Tables"]["products"]["Insert"]
    ) => {
      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.products.byStore(data.store_id),
      });
      toast.success("Product created successfully!");
    },
    onError: (error: PostgrestError) => {
      console.error("Error creating product:", error);
      if (error.code === "23505") {
        toast.error("A product with this SKU already exists");
      } else {
        toast.error("Failed to create product");
      }
    },
  });
}

export function useUpdateProduct() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Database["public"]["Tables"]["products"]["Update"];
    }) => {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.products.detail(data.id), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Product updated successfully!");
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });
}

export function useDeleteProduct() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Product deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });
}

// ============================================
// STORES HOOKS
// ============================================

export function useStores() {
  const supabase = createClient();

  return useQuery({
    queryKey: queryKeys.stores.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      return data as Store[];
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ============================================
// SALES HOOKS
// ============================================

export function useSales(storeId?: string, startDate?: Date, endDate?: Date) {
  const supabase = createClient();

  const queryKey =
    startDate && endDate
      ? queryKeys.sales.byDateRange(
          startDate.toISOString(),
          endDate.toISOString()
        )
      : storeId
      ? queryKeys.sales.byStore(storeId)
      : queryKeys.sales.all;

  return useQuery({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select(
          `
          *,
          sale_items (
            id,
            quantity,
            price_at_sale,
            subtotal,
            products (
              name,
              sku
            )
          )
        `
        )
        .order("created_at", { ascending: false });

      if (storeId && storeId !== "all") {
        query = query.eq("store_id", storeId);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        query = query.lte("created_at", endDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Sale[];
    },
    staleTime: 1 * 60 * 1000,
  });
}

export function useCreateSale() {
  const supabase = createClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleData: {
      sale: Database["public"]["Tables"]["sales"]["Insert"];
      items: Database["public"]["Tables"]["sale_items"]["Insert"][];
    }) => {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert(saleData.sale)
        .select()
        .single();

      if (saleError) throw saleError;

      const itemsWithSaleId = saleData.items.map((item) => ({
        ...item,
        sale_id: sale.id,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(itemsWithSaleId);

      if (itemsError) throw itemsError;

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
      toast.success("Sale completed successfully!");
    },
    onError: () => {
      toast.error("Failed to complete sale");
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

export function usePrefetchProducts() {
  const queryClient = useQueryClient();
  const supabase = createClient();

  return (storeId?: string) => {
    queryClient.prefetchQuery({
      queryKey: storeId
        ? queryKeys.products.byStore(storeId)
        : queryKeys.products.all,
      queryFn: async () => {
        let query = supabase.from("products").select("*").order("name");

        if (storeId && storeId !== "all") {
          query = query.eq("store_id", storeId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data as Product[];
      },
    });
  };
}
