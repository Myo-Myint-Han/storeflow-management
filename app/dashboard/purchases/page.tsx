"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package } from "lucide-react";
import { format } from "date-fns";

type Purchase = Database["public"]["Tables"]["purchases"]["Row"] & {
  products?: Database["public"]["Tables"]["products"]["Row"];
};

export default function PurchasesPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect if not owner
  useEffect(() => {
    if (profile && profile.role !== "owner") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("purchases")
        .select("*, products(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPurchases(data || []);
    } catch (error) {
      console.error("Error fetching purchases:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(
    (purchase) =>
      purchase.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.products?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCost = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.total_cost,
    0
  );
  const totalItems = filteredPurchases.reduce(
    (sum, purchase) => sum + purchase.quantity,
    0
  );

  if (profile?.role !== "owner") {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Purchase History</h1>
          <p className="text-gray-500 mt-1">
            Track inventory purchases and restocking
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/purchases/new")}>
          <Plus className="h-4 w-4 mr-2" />
          Record Purchase
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{totalCost.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {filteredPurchases.length} purchases
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Items Purchased
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-gray-500 mt-1">Total units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Average Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ฿
              {filteredPurchases.length > 0
                ? (totalCost / filteredPurchases.length).toFixed(2)
                : "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per purchase</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by product or supplier..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Records ({filteredPurchases.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading purchases...</p>
            </div>
          ) : filteredPurchases.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No purchases yet
              </h3>
              <p className="text-gray-500 mb-6">
                Start recording purchases to track inventory
              </p>
              <Button onClick={() => router.push("/dashboard/purchases/new")}>
                <Plus className="h-4 w-4 mr-2" />
                Record First Purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Cost/Unit</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPurchases.map((purchase) => (
                    <TableRow key={purchase.id}>
                      <TableCell>
                        <div className="font-medium">
                          {format(
                            new Date(purchase.created_at),
                            "MMM dd, yyyy"
                          )}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(purchase.created_at), "hh:mm a")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {purchase.products?.name || "Unknown Product"}
                        </div>
                        {purchase.notes && (
                          <div className="text-sm text-gray-500">
                            {purchase.notes}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {purchase.supplier || "N/A"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {purchase.quantity}
                      </TableCell>
                      <TableCell className="text-right">
                        ฿{purchase.cost_per_unit.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ฿{purchase.total_cost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
