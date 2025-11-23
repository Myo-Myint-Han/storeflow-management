"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
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
import { useStores, useCreateProduct } from "@/hooks/useSupabaseQuery";

export default function NewProductPage() {
  const { profile } = useAuth();
  const router = useRouter();

  const isOwner = profile?.role === "owner";
  const isReceptionist = profile?.role === "receptionist";

  // ✅ React Query: Cached stores data
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const createProductMutation = useCreateProduct();

  // Calculate default store_id based on role
  const defaultStoreId = useMemo(() => {
    if (isReceptionist && profile?.store_id) {
      return profile.store_id;
    }
    if (isOwner && stores.length > 0) {
      return stores[0].id;
    }
    return "";
  }, [isReceptionist, isOwner, profile, stores]);

  const [formData, setFormData] = useState({
    store_id: defaultStoreId,
    name: "",
    description: "",
    sku: "",
    category: "",
    buying_price: "",
    selling_price: "",
    stock: "",
    low_stock_threshold: "10",
  });

  // Update store_id when defaultStoreId changes
  const currentStoreId = formData.store_id || defaultStoreId;

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const storeId = currentStoreId;

    // Validation
    if (
      !storeId ||
      !formData.name.trim() ||
      !formData.buying_price ||
      !formData.selling_price ||
      !formData.stock
    ) {
      return;
    }

    try {
      await createProductMutation.mutateAsync({
        store_id: storeId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        sku: formData.sku.trim() || null,
        category: formData.category.trim() || null,
        buying_price: parseFloat(formData.buying_price),
        selling_price: parseFloat(formData.selling_price),
        stock: parseInt(formData.stock),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        created_by: profile?.id,
      });

      router.push("/dashboard/products");
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  const calculateMargin = () => {
    const buying = parseFloat(formData.buying_price) || 0;
    const selling = parseFloat(formData.selling_price) || 0;
    if (selling === 0) return 0;
    return (((selling - buying) / selling) * 100).toFixed(1);
  };

  const calculateProfit = () => {
    const buying = parseFloat(formData.buying_price) || 0;
    const selling = parseFloat(formData.selling_price) || 0;
    return (selling - buying).toFixed(2);
  };

  if (loadingStores) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Loading...</span>
        </div>
      </div>
    );
  }

  const isSubmitting = createProductMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/products")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Products
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
        <p className="text-gray-500 mt-1">
          Fill in the details to add a new product to your inventory
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Product Information</CardTitle>
          <CardDescription>
            All fields marked with * are required
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Store Selection */}
            {isOwner ? (
              <div className="space-y-2">
                <Label htmlFor="store_id">Store *</Label>
                <Select
                  value={currentStoreId}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, store_id: value }))
                  }
                  required
                  disabled={isSubmitting}
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
            ) : (
              <div className="space-y-2">
                <Label>Store</Label>
                <div className="p-3 bg-gray-50 rounded-md border border-gray-200">
                  <p className="text-sm font-medium text-gray-700">
                    Adding to your assigned store
                  </p>
                </div>
              </div>
            )}

            {/* Product Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Wireless Mouse"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Optional product description"
                disabled={isSubmitting}
                className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            {/* SKU and Category Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g., WM-001"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., Electronics"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Pricing Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="buying_price">Buying Price (฿) *</Label>
                <Input
                  id="buying_price"
                  name="buying_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.buying_price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="selling_price">Selling Price (฿) *</Label>
                <Input
                  id="selling_price"
                  name="selling_price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Margin Display */}
            {formData.buying_price && formData.selling_price && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 font-medium">
                      Profit Margin
                    </p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {calculateMargin()}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-blue-700 font-medium">
                      Profit per Unit
                    </p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      ฿{calculateProfit()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock *</Label>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={handleInputChange}
                  placeholder="0"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="low_stock_threshold">Low Stock Alert At</Label>
                <Input
                  id="low_stock_threshold"
                  name="low_stock_threshold"
                  type="number"
                  min="0"
                  value={formData.low_stock_threshold}
                  onChange={handleInputChange}
                  placeholder="10"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/dashboard/products")}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding Product...
                  </>
                ) : (
                  "Add Product"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
