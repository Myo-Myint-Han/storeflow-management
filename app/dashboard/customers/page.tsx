"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Database } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Search,
  Pencil,
  Users,
  Phone,
  Mail,
  Percent,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";

type Customer = Database["public"]["Tables"]["customers"]["Row"];
type Store = Database["public"]["Tables"]["stores"]["Row"];

const CUSTOMER_TYPES = {
  regular: { label: "Regular", color: "bg-blue-100 text-blue-800" },
  vip: { label: "VIP", color: "bg-purple-100 text-purple-800" },
  wholesale: { label: "Wholesale", color: "bg-green-100 text-green-800" },
};

const DISCOUNT_TYPE_DEFAULTS = {
  regular: { type: "percentage" as const, percentage: 0, fixed: 0 },
  vip: { type: "percentage" as const, percentage: 10, fixed: 50 },
  wholesale: { type: "fixed" as const, percentage: 20, fixed: 100 },
};

export default function CustomersPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStore, setSelectedStore] = useState<string>("all");

  const [formData, setFormData] = useState({
    store_id: "",
    name: "",
    phone: "",
    email: "",
    customer_type: "regular" as "regular" | "vip" | "wholesale",
    discount_type: "percentage" as "percentage" | "fixed",
    discount_percentage: "0",
    discount_fixed_amount: "0",
    notes: "",
  });

  const isOwner = profile?.role === "owner";

  // Redirect if not owner
  useEffect(() => {
    if (profile && profile.role !== "owner") {
      router.push("/dashboard");
    }
  }, [profile, router]);

  const fetchStores = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("name");

      if (error) throw error;
      setStores(data || []);

      if (data && data.length > 0 && !formData.store_id) {
        setFormData((prev) => ({ ...prev, store_id: data[0].id }));
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    }
  }, [supabase, formData.store_id]);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase.from("customers").select("*").order("name");

      if (selectedStore !== "all") {
        query = query.eq("store_id", selectedStore);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedStore]);

  useEffect(() => {
    if (isOwner) {
      fetchStores();
      fetchCustomers();
    }
  }, [isOwner, selectedStore, fetchStores, fetchCustomers]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCustomerTypeChange = (type: "regular" | "vip" | "wholesale") => {
    const defaults = DISCOUNT_TYPE_DEFAULTS[type];
    setFormData((prev) => ({
      ...prev,
      customer_type: type,
      discount_type: defaults.type,
      discount_percentage: defaults.percentage.toString(),
      discount_fixed_amount: defaults.fixed.toString(),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const customerData = {
        store_id: formData.store_id,
        name: formData.name.trim(),
        phone: formData.phone.trim() || null,
        email: formData.email.trim() || null,
        customer_type: formData.customer_type,
        discount_type: formData.discount_type,
        discount_percentage: parseFloat(formData.discount_percentage),
        discount_fixed_amount: parseFloat(formData.discount_fixed_amount),
        notes: formData.notes.trim() || null,
      };

      if (editingCustomer) {
        const { error } = await supabase
          .from("customers")
          .update(customerData)
          .eq("id", editingCustomer.id);

        if (error) throw error;
        toast.success("Customer updated successfully!");
      } else {
        const { error } = await supabase.from("customers").insert(customerData);

        if (error) throw error;
        toast.success("Customer added successfully!");
      }

      setDialogOpen(false);
      setEditingCustomer(null);
      resetForm();
      fetchCustomers();
    } catch (error) {
      console.error("Error saving customer:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to save customer";
      toast.error(errorMessage);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      store_id: customer.store_id,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      customer_type: customer.customer_type,
      discount_type: customer.discount_type,
      discount_percentage: customer.discount_percentage.toString(),
      discount_fixed_amount: customer.discount_fixed_amount.toString(),
      notes: customer.notes || "",
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      store_id: stores.length > 0 ? stores[0].id : "",
      name: "",
      phone: "",
      email: "",
      customer_type: "regular",
      discount_type: "percentage",
      discount_percentage: "0",
      discount_fixed_amount: "0",
      notes: "",
    });
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 mt-1">
            Manage customer discounts and information
          </p>
        </div>
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingCustomer(null);
              resetForm();
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add New Customer"}
              </DialogTitle>
              <DialogDescription>
                Create customer profiles with percentage or fixed Baht discounts
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Store Selection */}
              <div className="space-y-2">
                <Label htmlFor="store_id">Store *</Label>
                <Select
                  value={formData.store_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, store_id: value }))
                  }
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

              {/* Customer Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  required
                />
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g., 081-234-5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g., customer@email.com"
                  />
                </div>
              </div>

              {/* Customer Type */}
              <div className="space-y-2">
                <Label htmlFor="customer_type">Customer Type *</Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value: "regular" | "vip" | "wholesale") =>
                    handleCustomerTypeChange(value)
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Customer</SelectItem>
                    <SelectItem value="vip">VIP Customer</SelectItem>
                    <SelectItem value="wholesale">
                      Wholesale Customer
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Discount Type Selection */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                <Label className="text-blue-900 font-semibold">
                  Discount Settings
                </Label>

                {/* Discount Type */}
                <div className="space-y-2">
                  <Label htmlFor="discount_type">Discount Type *</Label>
                  <Select
                    value={formData.discount_type}
                    onValueChange={(value: "percentage" | "fixed") =>
                      setFormData((prev) => ({ ...prev, discount_type: value }))
                    }
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">
                        <div className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Percentage (e.g., 10%)
                        </div>
                      </SelectItem>
                      <SelectItem value="fixed">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Fixed Amount (e.g., ฿100)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Discount Input */}
                {formData.discount_type === "percentage" ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="discount_percentage"
                      className="flex items-center gap-2"
                    >
                      <Percent className="h-4 w-4 text-blue-600" />
                      Discount Percentage (%)
                    </Label>
                    <Input
                      id="discount_percentage"
                      name="discount_percentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.discount_percentage}
                      onChange={handleInputChange}
                      placeholder="e.g., 10"
                    />
                    <p className="text-xs text-gray-600">
                      Customer gets {formData.discount_percentage || 0}% off
                      total purchase
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label
                      htmlFor="discount_fixed_amount"
                      className="flex items-center gap-2"
                    >
                      <DollarSign className="h-4 w-4 text-green-600" />
                      Fixed Discount Amount (฿)
                    </Label>
                    <Input
                      id="discount_fixed_amount"
                      name="discount_fixed_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.discount_fixed_amount}
                      onChange={handleInputChange}
                      placeholder="e.g., 100"
                    />
                    <p className="text-xs text-gray-600">
                      Customer gets ฿{formData.discount_fixed_amount || 0} off
                      total purchase
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Additional information about this customer"
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingCustomer ? "Update Customer" : "Add Customer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Total Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredCustomers.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              VIP Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {
                filteredCustomers.filter((c) => c.customer_type === "vip")
                  .length
              }
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Wholesale Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {
                filteredCustomers.filter((c) => c.customer_type === "wholesale")
                  .length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Store Filter */}
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Stores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer List ({filteredCustomers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-500">Loading customers...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No customers found
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? "Try a different search term"
                  : "Add your first customer to start managing discounts"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const typeConfig = CUSTOMER_TYPES[customer.customer_type];
                    return (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="font-medium">{customer.name}</div>
                          {customer.notes && (
                            <div className="text-sm text-gray-500 mt-0.5">
                              {customer.notes.substring(0, 50)}
                              {customer.notes.length > 50 && "..."}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {customer.phone && (
                              <div className="flex items-center text-gray-600">
                                <Phone className="h-3 w-3 mr-1" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center text-gray-600">
                                <Mail className="h-3 w-3 mr-1" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeConfig.color}>
                            {typeConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {customer.discount_type === "percentage" ? (
                            <div className="flex items-center justify-end font-medium text-green-600">
                              <Percent className="h-4 w-4 mr-1" />
                              {customer.discount_percentage}%
                            </div>
                          ) : (
                            <div className="flex items-center justify-end font-medium text-blue-600">
                              ฿{customer.discount_fixed_amount.toFixed(0)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(customer)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
