"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  ShoppingCart,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";

type Sale = {
  id: string;
  total_amount: number;
  profit: number;
  payment_method: string | null;
  created_at: string;
};

type SaleWithItems = Sale & {
  sale_items: Array<{
    id: string;
    quantity: number;
    price_at_sale: number;
    subtotal: number;
    products: {
      name: string;
      sku: string | null;
    } | null;
  }>;
};

const ITEMS_PER_PAGE = 15;

export default function SalesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Stats (calculated from API, not client-side)
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayProfit: 0,
    todayCount: 0,
    totalRevenue: 0,
    totalProfit: 0,
  });

  useEffect(() => {
    fetchSales();
    fetchStats();
  }, [currentPage]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let query = supabase.from("sales").select("total_amount, profit");

      // If receptionist, filter by their store
      if (profile?.role === "receptionist" && profile.store_id) {
        query = query.eq("store_id", profile.store_id);
      }

      // Get all time stats
      const { data: allSales } = await query;

      // Get today's stats
      const { data: todaySales } = await supabase
        .from("sales")
        .select("total_amount, profit")
        .gte("created_at", today.toISOString());

      const totalRevenue =
        allSales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const totalProfit = allSales?.reduce((sum, s) => sum + s.profit, 0) || 0;
      const todayRevenue =
        todaySales?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
      const todayProfit =
        todaySales?.reduce((sum, s) => sum + s.profit, 0) || 0;

      setStats({
        todayRevenue,
        todayProfit,
        todayCount: todaySales?.length || 0,
        totalRevenue,
        totalProfit,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // ⚡ OPTIMIZED: Pagination with limited data
  const fetchSales = async () => {
    try {
      setLoading(true);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

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
        `,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(from, to);

      // If receptionist, filter by their store
      if (profile?.role === "receptionist" && profile.store_id) {
        query = query.eq("store_id", profile.store_id);
      }

      // Search filter
      if (searchQuery) {
        query = query.ilike("id", `%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setSales((data || []) as SaleWithItems[]);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetails = (sale: SaleWithItems) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const avgSale = totalCount > 0 ? stats.totalRevenue / totalCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-500 mt-1">
            View all transactions and revenue ({totalCount} total)
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/sales/new")} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Sale
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ฿{stats.todayRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.todayCount} transaction{stats.todayCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ฿{stats.todayProfit.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.todayRevenue > 0
                ? ((stats.todayProfit / stats.todayRevenue) * 100).toFixed(1)
                : 0}
              % margin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿{stats.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-gray-500 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{avgSale.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by transaction ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to page 1
              }}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Transactions (Page {currentPage} of {totalPages || 1})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No sales yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start recording sales to see them here
              </p>
              <Button onClick={() => router.push("/dashboard/sales/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Sale
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sales.map((sale) => (
                  <Card
                    key={sale.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => viewDetails(sale)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                              <ShoppingCart className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {format(
                                  new Date(sale.created_at),
                                  "MMM dd, yyyy"
                                )}
                              </p>
                              <p className="text-sm text-gray-500">
                                {format(new Date(sale.created_at), "hh:mm a")} •{" "}
                                {sale.sale_items.length} item
                                {sale.sale_items.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          {/* Product names preview */}
                          <div className="ml-13 text-sm text-gray-600">
                            {sale.sale_items.slice(0, 2).map((item, idx) => (
                              <span key={item.id}>
                                {item.products?.name}
                                {item.quantity > 1 && ` (×${item.quantity})`}
                                {idx <
                                  Math.min(sale.sale_items.length, 2) - 1 &&
                                  ", "}
                              </span>
                            ))}
                            {sale.sale_items.length > 2 && (
                              <span className="text-gray-400">
                                {" "}
                                +{sale.sale_items.length - 2} more
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-right ml-4">
                          <p className="text-xl font-bold text-gray-900">
                            ฿{sale.total_amount.toFixed(2)}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            +฿{sale.profit.toFixed(2)} profit
                          </p>
                          <Badge
                            variant="secondary"
                            className="mt-2 capitalize"
                          >
                            {sale.payment_method || "cash"}
                          </Badge>
                        </div>

                        <Button variant="ghost" size="sm" className="ml-4">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{" "}
                    {totalCount} sales
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p - 1)}
                      disabled={!hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-2 px-4">
                      <span className="text-sm font-medium">
                        Page {currentPage} of {totalPages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={!hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Sale Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>

          {selectedSale && (
            <div className="space-y-6">
              {/* Transaction Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Date & Time</p>
                    <p className="font-medium">
                      {format(
                        new Date(selectedSale.created_at),
                        "MMM dd, yyyy hh:mm a"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Payment Method</p>
                    <p className="font-medium capitalize">
                      {selectedSale.payment_method || "cash"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Transaction ID</p>
                    <p className="font-mono text-xs">{selectedSale.id}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Items</p>
                    <p className="font-medium">
                      {selectedSale.sale_items.reduce(
                        (sum, item) => sum + item.quantity,
                        0
                      )}{" "}
                      units
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Items Purchased
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                          Product
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                          Price
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">
                          Subtotal
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedSale.sale_items.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900">
                              {item.products?.name || "Unknown Product"}
                            </p>
                            {item.products?.sku && (
                              <p className="text-xs text-gray-500">
                                SKU: {item.products.sku}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary">×{item.quantity}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600">
                            ฿{item.price_at_sale.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium">
                            ฿{item.subtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium">
                    ฿{selectedSale.total_amount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Profit</span>
                  <span className="font-medium">
                    ฿{selectedSale.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                  <span>Total</span>
                  <span className="text-blue-600">
                    ฿{selectedSale.total_amount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
