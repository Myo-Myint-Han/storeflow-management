"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
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
// ⚡ OPTIMIZATION: Lazy load charts (reduces initial bundle by ~150KB)
import dynamic from "next/dynamic";

// Lazy load chart components
const LineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  { ssr: false }
);
const Line = dynamic(() => import("recharts").then((mod) => mod.Line), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});
const Legend = dynamic(() => import("recharts").then((mod) => mod.Legend), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

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

type ChartData = {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
};

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

  // Redirect receptionist
  useEffect(() => {
    if (profile && profile.role === "receptionist") {
      router.push("/dashboard/sales/new");
    }
  }, [profile, router]);

  const getDateRange = useCallback(() => {
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
  }, [timeRange]);

  const generateSalesTrend = useCallback(
    (sales: Sale[], start: Date, end: Date) => {
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
    },
    []
  );

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { start, end } = getDateRange();

      // ⚡ Run all queries in parallel
      const [salesResult, productsResult, lowStockResult] = await Promise.all([
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

        supabase.from("products").select("id", { count: "exact", head: true }),

        supabase
          .from("products")
          .select("id, name, sku, stock, low_stock_threshold")
          .lte("stock", supabase.rpc("low_stock_threshold"))
          .order("stock", { ascending: true })
          .limit(5),
      ]);

      const salesData = (salesResult.data || []) as unknown as Sale[];

      const todaySales = salesData
        .filter((s) => new Date(s.created_at) >= today)
        .reduce((sum, s) => sum + s.total_amount, 0);

      const todayProfit = salesData
        .filter((s) => new Date(s.created_at) >= today)
        .reduce((sum, s) => sum + s.profit, 0);

      const periodSales = salesData.reduce((sum, s) => sum + s.total_amount, 0);
      const periodProfit = salesData.reduce((sum, s) => sum + s.profit, 0);
      const totalOrders = salesData.length;
      const avgOrderValue = totalOrders > 0 ? periodSales / totalOrders : 0;

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

      // Generate charts data
      generateSalesTrend(salesData, start, end);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, supabase, getDateRange, generateSalesTrend]);

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
    </div>
  );
}
