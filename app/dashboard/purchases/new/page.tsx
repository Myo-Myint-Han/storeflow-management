"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2 } from "lucide-react";

type Store = Database["public"]["Tables"]["stores"]["Row"];
type Product = Database["public"]["Tables"]["products"]["Row"];

export default function NewPurchasePage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_id: "",
    product_id: "",
    quantity: "",
    cost_per_unit: "",
    supplier: "",
    notes: "",
  });

  // Redirect if not owner
  useEffect(() => {
    if (profile && profile.role !== "owner") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (formData.store_id) {
      fetchProducts(formData.store_id);
    }
  }, [formData.store_id]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      setStores(data || []);

      if (data && data.length > 0) {
        setFormData((prev) => ({ ...prev, store_id: data[0].id }));
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchProducts = async (storeId: string) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("name");

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const cost = parseFloat(formData.cost_per_unit) || 0;
    return quantity * cost;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const totalCost = calculateTotal();

      const { error } = await supabase.from("purchases").insert({
        store_id: formData.store_id,
        product_id: formData.product_id,
        quantity: parseInt(formData.quantity),
        cost_per_unit: parseFloat(formData.cost_per_unit),
        total_cost: totalCost,
        supplier: formData.supplier || null,
        notes: formData.notes || null,
        purchased_by: profile?.id,
      });

      if (error) throw error;

      router.push("/dashboard/purchases");
    } catch (error) {
      console.error("Error recording purchase:", error);
      alert("Failed to record purchase");
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role !== "owner") {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/purchases")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Purchases
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Record Purchase</h1>
        <p className="text-gray-500 mt-1">
          Add new inventory purchase to update stock
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Details</CardTitle>
          <CardDescription>Stock will be automatically updated</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Selection */}
            <div className="space-y-2">
              <Label htmlFor="store_id">Store *</Label>
              <Select
                value={formData.store_id}
                onValueChange={(value) => {
                  setFormData((prev) => ({
                    ...prev,
                    store_id: value,
                    product_id: "",
                  }));
                }}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Product Selection */}
            <div className="space-y-2">
              <Label htmlFor="product_id">Product *</Label>
              <Select
                value={formData.product_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, product_id: value }))
                }
                required
                disabled={!formData.store_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Current stock: {product.stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Supplier */}
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier</Label>
              <Input
                id="supplier"
                name="supplier"
                value={formData.supplier}
                onChange={handleInputChange}
                placeholder="e.g., ABC Distributors"
              />
            </div>

            {/* Quantity and Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cost_per_unit">Cost per Unit *</Label>
                <Input
                  id="cost_per_unit"
                  name="cost_per_unit"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost_per_unit}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Total Cost Display */}
            {formData.quantity && formData.cost_per_unit && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-medium">Total Cost:</span>{" "}
                  <span className="text-lg font-bold">
                    ฿{calculateTotal().toFixed(2)}
                  </span>
                </p>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional notes about this purchase"
                className="w-full min-h-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/purchases")}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  "Record Purchase"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
