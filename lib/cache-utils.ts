// lib/cache-utils.ts
// Caching utilities for StoreFlow - inspired by JumpStudy architecture
import { unstable_cache } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Cache products list for 60 seconds
 * Invalidate on product create/update/delete
 */
export const getCachedProducts = unstable_cache(
  async (storeId?: string) => {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("products")
      .select(
        "id, name, sku, category, selling_price, buying_price, stock, store_id, low_stock_threshold"
      )
      .order("name");

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching products:", error);
      return [];
    }
    return data || [];
  },
  ["products-list"],
  {
    revalidate: 60,
    tags: ["products"],
  }
);

/**
 * Cache products with stock > 0 for POS
 * Shorter cache for more accuracy
 */
export const getCachedAvailableProducts = unstable_cache(
  async (storeId?: string) => {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("products")
      .select(
        "id, name, sku, category, selling_price, buying_price, stock, store_id"
      )
      .gt("stock", 0)
      .order("name");

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching available products:", error);
      return [];
    }
    return data || [];
  },
  ["products-available"],
  {
    revalidate: 30, // Shorter cache for stock accuracy
    tags: ["products"],
  }
);

/**
 * Cache stores list for 5 minutes (rarely changes)
 */
export const getCachedStores = unstable_cache(
  async () => {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, location, address, phone")
      .order("name");

    if (error) {
      console.error("Error fetching stores:", error);
      return [];
    }
    return data || [];
  },
  ["stores-list"],
  {
    revalidate: 300, // 5 minutes
    tags: ["stores"],
  }
);

/**
 * Cache dashboard statistics
 * Short cache for near real-time feel
 */
export const getCachedDashboardStats = unstable_cache(
  async (storeId?: string) => {
    const supabase = await createServerSupabaseClient();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Build sales query
    let salesQuery = supabase
      .from("sales")
      .select("total_amount, profit")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString());

    if (storeId) {
      salesQuery = salesQuery.eq("store_id", storeId);
    }

    // Build products query for low stock count
    let productsQuery = supabase
      .from("products")
      .select("id, stock, low_stock_threshold");

    if (storeId) {
      productsQuery = productsQuery.eq("store_id", storeId);
    }

    // Execute queries in parallel
    const [salesResult, productsResult] = await Promise.all([
      salesQuery,
      productsQuery,
    ]);

    const todaySales =
      salesResult.data?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
    const todayProfit =
      salesResult.data?.reduce((sum, s) => sum + s.profit, 0) || 0;
    const totalOrders = salesResult.data?.length || 0;
    const totalProducts = productsResult.data?.length || 0;
    const lowStockCount =
      productsResult.data?.filter((p) => p.stock <= p.low_stock_threshold)
        .length || 0;

    return {
      todaySales,
      todayProfit,
      totalOrders,
      totalProducts,
      lowStockCount,
      avgOrderValue: totalOrders > 0 ? todaySales / totalOrders : 0,
    };
  },
  ["dashboard-stats"],
  {
    revalidate: 30, // 30 seconds for near real-time
    tags: ["sales", "products"],
  }
);

/**
 * Cache low stock products for alerts
 */
export const getCachedLowStockProducts = unstable_cache(
  async (storeId?: string, limit: number = 5) => {
    const supabase = await createServerSupabaseClient();

    // We need to filter where stock <= low_stock_threshold
    // Supabase doesn't support column-to-column comparison directly in .filter()
    // So we fetch all and filter in JS (or use RPC function)
    let query = supabase
      .from("products")
      .select("id, name, sku, stock, low_stock_threshold, store_id")
      .order("stock", { ascending: true });

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching low stock products:", error);
      return [];
    }

    // Filter for low stock (stock <= threshold)
    const lowStock = (data || [])
      .filter((p) => p.stock <= p.low_stock_threshold)
      .slice(0, limit);

    return lowStock;
  },
  ["products-low-stock"],
  {
    revalidate: 60,
    tags: ["products"],
  }
);

/**
 * Cache recent sales for dashboard
 */
export const getCachedRecentSales = unstable_cache(
  async (storeId?: string, limit: number = 10) => {
    const supabase = await createServerSupabaseClient();

    let query = supabase
      .from("sales")
      .select(
        `
        id,
        total_amount,
        profit,
        payment_method,
        created_at,
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
      .order("created_at", { ascending: false })
      .limit(limit);

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching recent sales:", error);
      return [];
    }

    return data || [];
  },
  ["sales-recent"],
  {
    revalidate: 30,
    tags: ["sales"],
  }
);
