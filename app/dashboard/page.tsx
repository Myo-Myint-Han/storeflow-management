"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  Package,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
} from "date-fns";

type SaleItem = {
  quantity: number;
  subtotal: number;
  product_id: string;
  products: {
    name: string;
    category: string | null;
  } | null;
};

type Sale = {
  id: string;
  total_amount: number;
  profit: number;
  payment_method: string | null;
  created_at: string;
  sale_items: SaleItem[];
};

type Product = Database["public"]["Tables"]["products"]["Row"];

type ChartData = {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
};

type CategoryData = {
  name: string;
  value: number;
};

type ProductStat = {
  name: string;
  quantity: number;
  revenue: number;
};

type PaymentMethodData = {
  name: string;
  value: number;
};

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export default function DashboardPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "thisMonth">(
    "7days"
  );

  // Stats
  const [stats, setStats] = useState({
    todaySales: 0,
    todayProfit: 0,
    periodSales: 0,
    periodProfit: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0,
    lowStockCount: 0,
  });

  // Charts data
  const [salesTrendData, setSalesTrendData] = useState<ChartData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductStat[]>([]);
  const [paymentMethodData, setPaymentMethodData] = useState<
    PaymentMethodData[]
  >([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

  // Redirect receptionist
  useEffect(() => {
    if (profile && profile.role === "receptionist") {
      router.push("/dashboard/sales/new");
    }
  }, [profile, router]);

  const getDateRange = () => {
    const today = new Date();

    switch (timeRange) {
      case "7days":
        return {
          start: subDays(today, 6),
          end: today,
          label: "Last 7 Days",
        };
      case "30days":
        return {
          start: subDays(today, 29),
          end: today,
          label: "Last 30 Days",
        };
      case "thisMonth":
        return {
          start: startOfMonth(today),
          end: endOfMonth(today),
          label: "This Month",
        };
      default:
        return {
          start: subDays(today, 6),
          end: today,
          label: "Last 7 Days",
        };
    }
  };

  const generateSalesTrend = (sales: Sale[], start: Date, end: Date) => {
    const days = eachDayOfInterval({ start, end });

    const trend = days.map((day) => {
      const daySales = sales.filter((s) => {
        const saleDate = new Date(s.created_at);
        return saleDate.toDateString() === day.toDateString();
      });

      const revenue = daySales.reduce((sum, s) => sum + s.total_amount, 0);
      const profit = daySales.reduce((sum, s) => sum + s.profit, 0);
      const orders = daySales.length;

      return {
        date: format(day, "MMM dd"),
        revenue: Number(revenue.toFixed(2)),
        profit: Number(profit.toFixed(2)),
        orders,
      };
    });

    setSalesTrendData(trend);
  };

  const generateCategoryData = (sales: Sale[]) => {
    const categoryRevenue: Record<string, number> = {};

    sales.forEach((sale) => {
      sale.sale_items?.forEach((item) => {
        const category = item.products?.category || "Uncategorized";
        categoryRevenue[category] =
          (categoryRevenue[category] || 0) + item.subtotal;
      });
    });

    const data = Object.entries(categoryRevenue).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));

    setCategoryData(data);
  };

  const generateTopProducts = (sales: Sale[]) => {
    const productStats: Record<string, ProductStat> = {};

    sales.forEach((sale) => {
      sale.sale_items?.forEach((item) => {
        const productId = item.product_id;
        if (!productStats[productId]) {
          productStats[productId] = {
            name: item.products?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        productStats[productId].quantity += item.quantity;
        productStats[productId].revenue += item.subtotal;
      });
    });

    const data = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        revenue: Number(item.revenue.toFixed(2)),
      }));

    setTopProducts(data);
  };

  const generatePaymentMethodData = (sales: Sale[]) => {
    const methodRevenue: Record<string, number> = {};

    sales.forEach((sale) => {
      const method = sale.payment_method || "cash";
      methodRevenue[method] = (methodRevenue[method] || 0) + sale.total_amount;
    });

    const data = Object.entries(methodRevenue).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: Number(value.toFixed(2)),
    }));

    setPaymentMethodData(data);
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { start, end } = getDateRange();

      // ⚡ Run all queries in parallel
      const [salesResult, productsResult, lowStockResult] = await Promise.all([
        // Query 1: Sales data with items (only for selected period)
        supabase
          .from("sales")
          .select(
            `
            id,
            total_amount,
            profit,
            payment_method,
            created_at,
            sale_items (
              quantity,
              subtotal,
              product_id,
              products!inner (
                name,
                category
              )
            )
          `
          )
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: true }),

        // Query 2: Product count (just count, not full data)
        supabase.from("products").select("id", { count: "exact", head: true }),

        // Query 3: Only low stock products (limited to 5)
        supabase
          .from("products")
          .select("id, name, sku, stock, low_stock_threshold")
          .lte("stock", supabase.rpc("low_stock_threshold"))
          .order("stock", { ascending: true })
          .limit(5),
      ]);

      const salesData = (salesResult.data || []) as Sale[];

      // Calculate today's stats (filter in memory, faster than separate query)
      const todaySales = salesData
        .filter((s) => new Date(s.created_at) >= today)
        .reduce((sum, s) => sum + s.total_amount, 0);

      const todayProfit = salesData
        .filter((s) => new Date(s.created_at) >= today)
        .reduce((sum, s) => sum + s.profit, 0);

      // Calculate period stats
      const periodSales = salesData.reduce((sum, s) => sum + s.total_amount, 0);
      const periodProfit = salesData.reduce((sum, s) => sum + s.profit, 0);
      const totalOrders = salesData.length;
      const avgOrderValue = totalOrders > 0 ? periodSales / totalOrders : 0;

      // Get counts
      const totalProducts = productsResult.count || 0;
      const lowStock = lowStockResult.data || [];

      setStats({
        todaySales,
        todayProfit,
        periodSales,
        periodProfit,
        totalOrders,
        avgOrderValue,
        totalProducts,
        lowStockCount: lowStock.length,
      });

      setLowStockProducts(lowStock as Product[]);

      // Generate charts data
      generateSalesTrend(salesData, start, end);
      generateCategoryData(salesData);
      generateTopProducts(salesData);
      generatePaymentMethodData(salesData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, supabase]);

  useEffect(() => {
    if (profile?.role === "owner") {
      fetchDashboardData();
    }
  }, [timeRange, fetchDashboardData, profile?.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const { label: periodLabel } = getDateRange();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Analytics Dashboard
          </h1>
          <p className="text-gray-500 mt-1">Track your business performance</p>
        </div>
        <Select
          value={timeRange}
          onValueChange={(value: "7days" | "30days" | "thisMonth") =>
            setTimeRange(value)
          }
        >
          <SelectTrigger className="w-[180px]">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="thisMonth">This Month</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Today Sales
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ฿{stats.todaySales.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Profit: ฿{stats.todayProfit.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              {periodLabel} Sales
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ฿{stats.periodSales.toFixed(2)}
            </div>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />฿
              {stats.periodProfit.toFixed(2)} profit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Total Orders
              <ShoppingCart className="h-4 w-4 text-purple-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalOrders}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Avg: ฿{stats.avgOrderValue.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center justify-between">
              Low Stock Alert
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.lowStockCount}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalProducts} total products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                stroke="#888"
                style={{ fontSize: "12px" }}
              />
              <YAxis stroke="#888" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Revenue (฿)"
                dot={{ fill: "#3b82f6" }}
              />
              <Line
                type="monotone"
                dataKey="profit"
                stroke="#10b981"
                strokeWidth={2}
                name="Profit (฿)"
                dot={{ fill: "#10b981" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="number"
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  stroke="#888"
                  style={{ fontSize: "12px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (฿)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => `฿${value.toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {paymentMethodData.map((method, index) => {
                const total = paymentMethodData.reduce(
                  (sum, m) => sum + m.value,
                  0
                );
                const percentage = total > 0 ? (method.value / total) * 100 : 0;

                return (
                  <div key={method.name}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        {method.name}
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        ฿{method.value.toFixed(2)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {percentage.toFixed(1)}% of total sales
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Low Stock Products
              <Badge variant="destructive">{stats.lowStockCount}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>All products are well stocked!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {product.name}
                      </p>
                      {product.sku && (
                        <p className="text-xs text-gray-500">
                          SKU: {product.sku}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {product.stock} left
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        Min: {product.low_stock_threshold}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.lowStockCount > 5 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push("/dashboard/products")}
                  >
                    View All ({stats.lowStockCount})
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
