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
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Package,
  Clock,
  CreditCard,
} from "lucide-react";
import { subDays, startOfMonth, endOfMonth } from "date-fns";
// ⚡ OPTIMIZATION: Lazy load charts
import dynamic from "next/dynamic";

const BarChart = dynamic(() => import("recharts").then((mod) => mod.BarChart), {
  ssr: false,
});
const Bar = dynamic(() => import("recharts").then((mod) => mod.Bar), {
  ssr: false,
});
const PieChart = dynamic(() => import("recharts").then((mod) => mod.PieChart), {
  ssr: false,
});
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
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

type Product = {
  id: string;
  name: string;
  stock: number;
  low_stock_threshold: number;
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
    itemsInStock: 0,
    lowStockCount: 0,
  });

  // Charts data
  const [peakHoursData, setPeakHoursData] = useState<
    Array<{ hour: string; sales: number }>
  >([]);
  const [topProductsData, setTopProductsData] = useState<
    Array<{ name: string; quantity: number; revenue: number }>
  >([]);
  const [topCategoriesData, setTopCategoriesData] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [paymentMethodsData, setPaymentMethodsData] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);

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

        supabase.from("products").select("id, stock"),

        supabase
          .from("products")
          .select("id, name, stock, low_stock_threshold")
          .order("stock", { ascending: true })
          .limit(10),
      ]);

      const salesData = (salesResult.data || []) as unknown as Sale[];
      const allProducts = productsResult.data || [];
      const lowStockData = (lowStockResult.data || []) as Product[];

      // Calculate stats
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

      const totalProducts = allProducts.length;
      const itemsInStock = allProducts.reduce((sum, p) => sum + p.stock, 0);
      const lowStock = lowStockData.filter(
        (p) => p.stock <= p.low_stock_threshold
      );

      setStats({
        todaySales,
        todayProfit,
        periodSales,
        periodProfit,
        totalOrders,
        avgOrderValue,
        totalProducts,
        itemsInStock,
        lowStockCount: lowStock.length,
      });

      // Peak Hours Analysis
      const hourlyData: { [key: string]: number } = {};
      salesData.forEach((sale) => {
        const hour = new Date(sale.created_at).getHours();
        const hourLabel = `${hour}:00`;
        hourlyData[hourLabel] =
          (hourlyData[hourLabel] || 0) + sale.total_amount;
      });
      const peakHours = Object.entries(hourlyData)
        .map(([hour, sales]) => ({ hour, sales }))
        .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
      setPeakHoursData(peakHours);

      // Top Products
      const productStats: {
        [key: string]: { name: string; quantity: number; revenue: number };
      } = {};
      salesData.forEach((sale) => {
        sale.sale_items.forEach((item) => {
          const productName = item.products?.name || "Unknown";
          if (!productStats[productName]) {
            productStats[productName] = {
              name: productName,
              quantity: 0,
              revenue: 0,
            };
          }
          productStats[productName].quantity += item.quantity;
          productStats[productName].revenue += item.subtotal;
        });
      });
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setTopProductsData(topProducts);

      // Top Categories
      const categoryStats: { [key: string]: number } = {};
      salesData.forEach((sale) => {
        sale.sale_items.forEach((item) => {
          const category = item.products?.category || "Uncategorized";
          categoryStats[category] =
            (categoryStats[category] || 0) + item.subtotal;
        });
      });
      const topCategories = Object.entries(categoryStats)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      setTopCategoriesData(topCategories);

      // Payment Methods
      const paymentStats: { [key: string]: number } = {};
      salesData.forEach((sale) => {
        const method = sale.payment_method || "cash";
        paymentStats[method] = (paymentStats[method] || 0) + 1;
      });
      const paymentMethods = Object.entries(paymentStats).map(
        ([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        })
      );
      setPaymentMethodsData(paymentMethods);

      // Low Stock Products
      setLowStockProducts(lowStock);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, getDateRange]);

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
  const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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
              Items in Stock
              <Package className="h-4 w-4 text-indigo-600" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.itemsInStock}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.totalProducts} products
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Peak Sales Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Peak Sales Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {peakHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="hour"
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
                    formatter={(value) => [
                      `฿${Number(value).toFixed(2)}`,
                      "Sales",
                    ]}
                  />
                  <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Top 5 Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topProductsData.length > 0 ? (
              <div className="space-y-3">
                {topProductsData.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {product.quantity} units sold
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="font-bold text-green-600">
                        ฿{product.revenue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No sales data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top 5 Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-purple-600" />
              Top 5 Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCategoriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={topCategoriesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {topCategoriesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      `฿${Number(value).toFixed(2)}`,
                      "Revenue",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No category data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paymentMethodsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentMethodsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name} ${((percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentMethodsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No payment data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Low Stock Items ({stats.lowStockCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length > 0 ? (
            <div className="space-y-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {product.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      Threshold: {product.low_stock_threshold}
                    </p>
                  </div>
                  <Badge variant="destructive" className="ml-4">
                    {product.stock} left
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>All products are well stocked!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
