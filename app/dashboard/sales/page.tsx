"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  ShoppingCart,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  Percent,
  Calendar,
  X,
} from "lucide-react";
import {
  format,
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
} from "date-fns";

type SaleItem = {
  id: string;
  quantity: number;
  price_at_sale: number;
  subtotal: number;
  products: {
    name: string;
    sku: string | null;
  } | null;
};

type Sale = {
  id: string;
  total_amount: number;
  profit: number;
  payment_method: string | null;
  created_at: string;
  original_amount: number | null;
  discount_amount: number | null;
  customer_id: string | null;
  customers: {
    name: string;
    customer_type: string;
  } | null;
  sale_items: SaleItem[];
};

const ITEMS_PER_PAGE = 15;

export default function SalesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Date filter states
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Stats for filtered period
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProfit: 0,
    totalDiscount: 0,
    orderCount: 0,
  });

  const getDateRange = useCallback(() => {
    const now = new Date();

    switch (dateFilter) {
      case "today":
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return {
          start: startOfDay(yesterday),
          end: endOfDay(yesterday),
        };
      case "last7days":
        return {
          start: startOfDay(subDays(now, 6)),
          end: endOfDay(now),
        };
      case "last30days":
        return {
          start: startOfDay(subDays(now, 29)),
          end: endOfDay(now),
        };
      case "thisMonth":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      case "custom":
        if (customStartDate && customEndDate) {
          return {
            start: startOfDay(new Date(customStartDate)),
            end: endOfDay(new Date(customEndDate)),
          };
        }
        return null;
      default:
        return null;
    }
  }, [dateFilter, customStartDate, customEndDate]);

  const fetchSales = useCallback(async () => {
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
          original_amount,
          discount_amount,
          customer_id,
          customers (
            name,
            customer_type
          ),
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

      // Date filter
      const dateRange = getDateRange();
      if (dateRange) {
        query = query
          .gte("created_at", dateRange.start.toISOString())
          .lte("created_at", dateRange.end.toISOString());
      }

      // Search filter
      if (searchQuery) {
        query = query.ilike("id", `%${searchQuery}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      setSales((data || []) as unknown as Sale[]);
      setTotalCount(count || 0);

      // Calculate stats for the filtered data
      if (data) {
        const totalSales = data.reduce((sum, s) => sum + s.total_amount, 0);
        const totalProfit = data.reduce((sum, s) => sum + s.profit, 0);
        const totalDiscount = data.reduce(
          (sum, s) => sum + (s.discount_amount || 0),
          0
        );
        setStats({
          totalSales,
          totalProfit,
          totalDiscount,
          orderCount: count || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile, currentPage, searchQuery, getDateRange]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  const viewDetails = (sale: Sale) => {
    setSelectedSale(sale);
    setDetailsOpen(true);
  };

  const clearFilters = () => {
    setDateFilter("all");
    setCustomStartDate("");
    setCustomEndDate("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const getCustomerTypeBadgeColor = (type: string) => {
    switch (type) {
      case "vip":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "wholesale":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "last7days":
        return "Last 7 Days";
      case "last30days":
        return "Last 30 Days";
      case "thisMonth":
        return "This Month";
      case "custom":
        return customStartDate && customEndDate
          ? `${format(new Date(customStartDate), "MMM dd")} - ${format(
              new Date(customEndDate),
              "MMM dd, yyyy"
            )}`
          : "Custom Range";
      default:
        return "All Time";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-500 mt-1">
            View all transactions ({totalCount} total)
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/sales/new")} size="lg">
          <Plus className="h-5 w-5 mr-2" />
          New Sale
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Transaction ID..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Date Filter */}
              <div className="space-y-2">
                <Label htmlFor="dateFilter">Time Period</Label>
                <Select
                  value={dateFilter}
                  onValueChange={(value) => {
                    setDateFilter(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="dateFilter">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {dateFilter === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={customStartDate}
                      onChange={(e) => {
                        setCustomStartDate(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={customEndDate}
                      onChange={(e) => {
                        setCustomEndDate(e.target.value);
                        setCurrentPage(1);
                      }}
                      min={customStartDate}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Active Filters & Clear Button */}
            {(dateFilter !== "all" || searchQuery) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Active filters:</span>
                {dateFilter !== "all" && (
                  <Badge variant="secondary" className="gap-2">
                    <Calendar className="h-3 w-3" />
                    {getDateFilterLabel()}
                  </Badge>
                )}
                {searchQuery && (
                  <Badge variant="secondary" className="gap-2">
                    <Search className="h-3 w-3" />
                    Search: {searchQuery}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-6 text-xs"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary for Filtered Period */}
      {dateFilter !== "all" && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ฿{stats.totalSales.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.orderCount} orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Profit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ฿{stats.totalProfit.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.orderCount > 0
                  ? `Avg: ฿${(stats.totalProfit / stats.orderCount).toFixed(2)}`
                  : "No orders"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Discounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                ฿{stats.totalDiscount.toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {stats.totalSales > 0
                  ? `${(
                      (stats.totalDiscount /
                        (stats.totalSales + stats.totalDiscount)) *
                      100
                    ).toFixed(1)}% of original`
                  : "No discounts"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Avg Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ฿
                {stats.orderCount > 0
                  ? (stats.totalSales / stats.orderCount).toFixed(2)
                  : "0.00"}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {getDateFilterLabel()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Transactions (Page {currentPage} of {totalPages || 1})
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
                No sales found
              </h3>
              <p className="text-gray-500 mb-6">
                {dateFilter !== "all" || searchQuery
                  ? "Try adjusting your filters"
                  : "Start recording sales to see them here"}
              </p>
              {(dateFilter !== "all" || searchQuery) && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {sales.map((sale) => {
                  const hasDiscount =
                    sale.discount_amount && sale.discount_amount > 0;
                  const subtotal = sale.original_amount || sale.total_amount;

                  return (
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
                                  {format(new Date(sale.created_at), "hh:mm a")}{" "}
                                  • {sale.sale_items.length} item
                                  {sale.sale_items.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>

                            {/* Customer Info */}
                            {sale.customers && (
                              <div className="ml-13 mb-2 flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">
                                  {sale.customers.name}
                                </span>
                                <Badge
                                  className={getCustomerTypeBadgeColor(
                                    sale.customers.customer_type
                                  )}
                                >
                                  {sale.customers.customer_type.toUpperCase()}
                                </Badge>
                              </div>
                            )}

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

                            {/* Discount Info */}
                            {hasDiscount && sale.discount_amount && (
                              <div className="ml-13 mt-2 flex items-center gap-2">
                                <Percent className="h-4 w-4 text-green-600" />
                                <span className="text-sm text-green-600 font-medium">
                                  Discount: ฿{sale.discount_amount.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-right ml-4">
                            {hasDiscount && (
                              <p className="text-sm text-gray-500 line-through">
                                ฿{subtotal.toFixed(2)}
                              </p>
                            )}
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
                  );
                })}
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

                {/* Customer Info in Dialog */}
                {selectedSale.customers && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-gray-600 text-sm mb-2">Customer</p>
                    <div className="flex items-center gap-2">
                      <User className="h-5 w-5 text-gray-400" />
                      <span className="font-medium text-gray-900">
                        {selectedSale.customers.name}
                      </span>
                      <Badge
                        className={getCustomerTypeBadgeColor(
                          selectedSale.customers.customer_type
                        )}
                      >
                        {selectedSale.customers.customer_type.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                )}
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
                    ฿
                    {(
                      selectedSale.original_amount || selectedSale.total_amount
                    ).toFixed(2)}
                  </span>
                </div>
                {selectedSale.discount_amount &&
                  selectedSale.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Discount Applied
                      </span>
                      <span className="font-medium">
                        -฿{selectedSale.discount_amount.toFixed(2)}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between text-green-600">
                  <span>Profit</span>
                  <span className="font-medium">
                    ฿{selectedSale.profit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold text-gray-900 pt-3 border-t">
                  <span>Total Paid</span>
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
