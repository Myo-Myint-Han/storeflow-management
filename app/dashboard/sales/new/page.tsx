"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Package,
  Loader2,
  User,
  Percent,
  X,
} from "lucide-react";
import { toast } from "sonner";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Customer = Database["public"]["Tables"]["customers"]["Row"];

type CartItem = Product & {
  quantity: number;
};

const CUSTOMER_TYPE_COLORS = {
  regular: "bg-blue-100 text-blue-800",
  vip: "bg-purple-100 text-purple-800",
  wholesale: "bg-green-100 text-green-800",
};

export default function NewSalePage() {
  const { profile } = useAuth();
  const supabase = createClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "other">(
    "cash"
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("products")
        .select("*")
        .gt("stock", 0)
        .order("name");

      if (profile?.role === "receptionist" && profile.store_id) {
        query = query.eq("store_id", profile.store_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [profile?.role, profile?.store_id, supabase]);

  const fetchCustomers = useCallback(async () => {
    try {
      let query = supabase.from("customers").select("*").order("name");

      if (profile?.role === "receptionist" && profile.store_id) {
        query = query.eq("store_id", profile.store_id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  }, [profile?.role, profile?.store_id, supabase]);

  useEffect(() => {
    fetchProducts();
    fetchCustomers();
  }, [fetchProducts, fetchCustomers]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          toast.error(`Only ${product.stock} units available`);
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, { ...product, quantity: 1 }];
      }
    });
    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
    toast.info("Item removed from cart");
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.quantity + change;
            if (newQuantity <= 0) {
              return null;
            }
            if (newQuantity > item.stock) {
              toast.error(`Only ${item.stock} units available`);
              return item;
            }
            return { ...item, quantity: newQuantity };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null)
    );
  };

  const calculateSubtotal = () => {
    return cart.reduce(
      (sum, item) => sum + item.selling_price * item.quantity,
      0
    );
  };

  // ✅ UPDATED: Handle both percentage and fixed amount discounts
  const calculateDiscount = () => {
    if (!selectedCustomer) return 0;
    const subtotal = calculateSubtotal();

    if (selectedCustomer.discount_type === "percentage") {
      // Percentage discount
      return (subtotal * selectedCustomer.discount_percentage) / 100;
    } else {
      // Fixed amount discount - don't exceed subtotal
      return Math.min(selectedCustomer.discount_fixed_amount, subtotal);
    }
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscount();
  };

  const calculateProfit = () => {
    const subtotal = cart.reduce(
      (sum, item) =>
        sum + (item.selling_price - item.buying_price) * item.quantity,
      0
    );
    // Reduce profit by discount amount
    return subtotal - calculateDiscount();
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      setSaving(true);

      const subtotal = calculateSubtotal();
      const discountAmount = calculateDiscount();
      const totalAmount = calculateTotal();
      const profit = calculateProfit();
      const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

      let storeId = profile?.store_id;
      if (profile?.role === "owner") {
        storeId = cart[0].store_id;
      }

      if (!storeId) {
        toast.error("Store not found");
        return;
      }

      // Create sale record with discount information
      const { data: saleData, error: saleError } = await supabase
        .from("sales")
        .insert({
          store_id: storeId,
          total_amount: totalAmount,
          profit: profit,
          payment_method: paymentMethod,
          sold_by: profile?.id,
          customer_id: selectedCustomer?.id || null,
          discount_amount: discountAmount,
          original_amount: subtotal,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = cart.map((item) => ({
        sale_id: saleData.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_sale: item.selling_price,
        cost_at_sale: item.buying_price,
        subtotal: item.selling_price * item.quantity,
        profit: (item.selling_price - item.buying_price) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Optimistic update
      setProducts((prevProducts) =>
        prevProducts.map((product) => {
          const soldItem = cart.find((item) => item.id === product.id);
          if (soldItem) {
            return {
              ...product,
              stock: product.stock - soldItem.quantity,
            };
          }
          return product;
        })
      );

      // Success message
      let successMessage = `Total: ฿${totalAmount.toFixed(
        2
      )} • ${totalItems} items sold`;
      if (discountAmount > 0) {
        successMessage += ` • ฿${discountAmount.toFixed(2)} discount applied`;
      }

      toast.success("🎉 Sale Completed Successfully!", {
        description: successMessage,
        duration: 3000,
      });

      // Reset
      setCart([]);
      setSelectedCustomer(null);
      setPaymentMethod("cash");
    } catch (error) {
      console.error("Error completing sale:", error);
      toast.error("Failed to complete sale. Please try again.");
      fetchProducts();
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      product.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      product.category?.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = calculateTotal();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Point of Sale</h1>
        <p className="text-gray-500 mt-1">Record new sales transactions</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search products by name, SKU, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Products Grid */}
          <Card>
            <CardHeader>
              <CardTitle>
                Available Products ({filteredProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">
                    Loading products...
                  </span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No products found
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Try a different search term"
                      : "No products available in stock"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredProducts.map((product) => (
                    <Card
                      key={product.id}
                      className="hover:shadow-md cursor-pointer"
                      onClick={() => addToCart(product)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {product.name}
                            </h3>
                            {product.sku && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                SKU: {product.sku}
                              </p>
                            )}
                            {product.category && (
                              <Badge
                                variant="secondary"
                                className="mt-2 text-xs"
                              >
                                {product.category}
                              </Badge>
                            )}
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-lg font-bold text-blue-600">
                                ฿{product.selling_price.toFixed(2)}
                              </span>
                              <span className="text-sm text-gray-500">
                                Stock: {product.stock}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              addToCart(product);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cart Section */}
        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Shopping Cart
                </span>
                {cart.length > 0 && (
                  <Badge variant="default" className="text-sm">
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Selection */}
              <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
                <Label className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer (Optional)
                </Label>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-md border">
                    <div className="flex-1">
                      <p className="font-medium text-sm">
                        {selectedCustomer.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          className={
                            CUSTOMER_TYPE_COLORS[selectedCustomer.customer_type]
                          }
                        >
                          {selectedCustomer.customer_type.toUpperCase()}
                        </Badge>
                        {/* ✅ Show discount based on type */}
                        <span className="text-xs text-green-600 font-medium flex items-center">
                          {selectedCustomer.discount_type === "percentage" ? (
                            <>
                              <Percent className="h-3 w-3 mr-0.5" />
                              {selectedCustomer.discount_percentage}% discount
                            </>
                          ) : (
                            <>
                              ฿{selectedCustomer.discount_fixed_amount} discount
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search customer..."
                        value={customerSearchQuery}
                        onChange={(e) => setCustomerSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {customerSearchQuery && (
                      <div className="max-h-40 overflow-y-auto space-y-1 border rounded-md p-2 bg-white">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map((customer) => (
                            <div
                              key={customer.id}
                              className="p-2 hover:bg-gray-50 rounded cursor-pointer"
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setCustomerSearchQuery("");
                              }}
                            >
                              <p className="font-medium text-sm">
                                {customer.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge
                                  className={
                                    CUSTOMER_TYPE_COLORS[customer.customer_type]
                                  }
                                >
                                  {customer.customer_type}
                                </Badge>
                                {/* ✅ Show discount based on type */}
                                <span className="text-xs text-gray-500">
                                  {customer.discount_type === "percentage"
                                    ? `${customer.discount_percentage}% off`
                                    : `฿${customer.discount_fixed_amount} off`}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No customers found
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cart Items */}
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {cart.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <ShoppingCart className="h-16 w-16 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">Cart is empty</p>
                    <p className="text-sm mt-1">Add products to get started</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <Card
                      key={item.id}
                      className="hover:shadow-sm border-gray-200"
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-900 truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              ฿{item.selling_price.toFixed(2)} each
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <div className="w-12 text-center font-bold">
                              {item.quantity}
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 w-8 p-0"
                              onClick={() => updateQuantity(item.id, 1)}
                              disabled={item.quantity >= item.stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Subtotal</p>
                            <p className="font-bold text-blue-600">
                              ฿{(item.selling_price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {cart.length > 0 && (
                <>
                  {/* Payment Method */}
                  <div className="space-y-2 pt-4 border-t">
                    <Label htmlFor="payment">Payment Method</Label>
                    <Select
                      value={paymentMethod}
                      onValueChange={(value: "cash" | "card" | "other") =>
                        setPaymentMethod(value)
                      }
                    >
                      <SelectTrigger id="payment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Summary */}
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{totalItems} units</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-medium">
                        ฿{subtotal.toFixed(2)}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          Discount
                          {selectedCustomer && (
                            <span className="text-xs text-green-600">
                              {/* ✅ Show discount type in summary */}
                              {selectedCustomer.discount_type === "percentage"
                                ? `(${selectedCustomer.discount_percentage}%)`
                                : `(฿${selectedCustomer.discount_fixed_amount})`}
                            </span>
                          )}
                          :
                        </span>
                        <span className="font-medium text-green-600">
                          -฿{discount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-lg font-bold pt-3 border-t">
                      <span>Total:</span>
                      <span className="text-blue-600">฿{total.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Complete Sale Button */}
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={handleCompleteSale}
                    disabled={saving || cart.length === 0}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-5 w-5 mr-2" />
                        Complete Sale
                      </>
                    )}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
