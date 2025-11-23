"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  AlertTriangle,
  Package,
  Loader2,
} from "lucide-react";
import {
  useProducts,
  useStores,
  useDeleteProduct,
  usePrefetchProducts,
} from "@/hooks/useSupabaseQuery";
import { useDebounce } from "@/hooks/useDebounce";

export default function ProductsPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const prefetchProducts = usePrefetchProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDeleteId, setProductToDeleteId] = useState<string | null>(
    null
  );

  // Debounce search for better performance
  const debouncedSearch = useDebounce(searchQuery, 300);

  const isOwner = profile?.role === "owner";
  const isReceptionist = profile?.role === "receptionist";

  // Determine which store to fetch from
  const storeIdToFetch = isReceptionist
    ? profile?.store_id ?? undefined
    : selectedStore === "all"
    ? undefined
    : selectedStore;

  // ✅ React Query: Automatic caching, background refetching
  const { data: products = [], isLoading: loadingProducts } =
    useProducts(storeIdToFetch);
  const { data: stores = [] } = useStores();
  const deleteProductMutation = useDeleteProduct();

  // Filter products by search query (client-side for instant results)
  const filteredProducts = useMemo(() => {
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.sku?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.category?.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [products, debouncedSearch]);

  // Calculate low stock products
  const lowStockProducts = useMemo(() => {
    return filteredProducts.filter((p) => p.stock <= p.low_stock_threshold);
  }, [filteredProducts]);

  const handleDeleteClick = (productId: string) => {
    setProductToDeleteId(productId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDeleteId) return;

    await deleteProductMutation.mutateAsync(productToDeleteId);
    setDeleteDialogOpen(false);
    setProductToDeleteId(null);
  };

  const productToDelete = products.find((p) => p.id === productToDeleteId);

  // Prefetch on hover for instant navigation
  const handleProductHover = (storeId: string) => {
    prefetchProducts(storeId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 mt-1">
            {isReceptionist
              ? "View and add products to inventory"
              : "Manage your product inventory across all stores"}
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/products/new")}
          onMouseEnter={() => prefetchProducts(storeIdToFetch)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Low Stock Alert
            </CardTitle>
            <CardDescription className="text-yellow-700">
              {lowStockProducts.length} product(s) running low on stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between text-sm p-3 bg-white rounded-md border border-yellow-200 hover:border-yellow-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-yellow-900 truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {product.sku && (
                        <span className="text-xs text-yellow-700">
                          SKU: {product.sku}
                        </span>
                      )}
                      {product.category && (
                        <Badge
                          variant="outline"
                          className="text-xs bg-yellow-100 border-yellow-300"
                        >
                          {product.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    <div className="text-right">
                      <p className="text-xs text-yellow-700">Current / Min</p>
                      <p className="text-sm font-medium text-yellow-900">
                        {product.stock} / {product.low_stock_threshold}
                      </p>
                    </div>
                    <Badge variant="destructive">{product.stock} left</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Store Filter - Only show for owners */}
            {isOwner && (
              <Select
                value={selectedStore}
                onValueChange={(value) => {
                  setSelectedStore(value);
                  prefetchProducts(value === "all" ? undefined : value);
                }}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map((store) => (
                    <SelectItem
                      key={store.id}
                      value={store.id}
                      onMouseEnter={() => handleProductHover(store.id)}
                    >
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>All Products ({filteredProducts.length})</span>
            {loadingProducts && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingProducts && products.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-gray-600">Loading products...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Get started by adding your first product"}
              </p>
              {!searchQuery && (
                <Button onClick={() => router.push("/dashboard/products/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Buying Price</TableHead>
                    <TableHead className="text-right">Selling Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Margin</TableHead>
                    {isOwner && (
                      <TableHead className="text-right">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => {
                    const margin =
                      ((product.selling_price - product.buying_price) /
                        product.selling_price) *
                      100;
                    const isLowStock =
                      product.stock <= product.low_stock_threshold;

                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="font-medium">{product.name}</div>
                          {product.description && (
                            <div className="text-sm text-gray-500 mt-0.5">
                              {product.description.substring(0, 50)}
                              {product.description.length > 50 && "..."}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {product.sku || "-"}
                        </TableCell>
                        <TableCell>
                          {product.category && (
                            <Badge variant="secondary">
                              {product.category}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          ฿{product.buying_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ฿{product.selling_price.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={isLowStock ? "destructive" : "secondary"}
                          >
                            {product.stock}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              margin > 30
                                ? "text-green-600 font-medium"
                                : "text-gray-600"
                            }
                          >
                            {margin.toFixed(1)}%
                          </span>
                        </TableCell>
                        {isOwner && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  router.push(
                                    `/dashboard/products/${product.id}`
                                  )
                                }
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteClick(product.id)}
                                disabled={deleteProductMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      {isOwner && (
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{productToDelete?.name}
                &quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteProductMutation.isPending}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                disabled={deleteProductMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteProductMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
