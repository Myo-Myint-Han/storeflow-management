"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  ShoppingBag,
  Store,
  LogOut,
  Menu,
  X,
  Users,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, signOut } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🚀 CRITICAL FIX: Remove artificial delay, redirect immediately if no user
  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const navigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      roles: ["owner"],
    },
    {
      name: "Products",
      href: "/dashboard/products",
      icon: Package,
      roles: ["owner", "receptionist"],
    },
    {
      name: "Sales",
      href: "/dashboard/sales",
      icon: ShoppingCart,
      roles: ["owner", "receptionist"],
    },
    {
      name: "New Sale",
      href: "/dashboard/sales/new",
      icon: ShoppingBag,
      roles: ["owner", "receptionist"],
    },
    {
      name: "Customers",
      href: "/dashboard/customers",
      icon: Users,
      roles: ["owner"],
    },
    {
      name: "Purchases",
      href: "/dashboard/purchases",
      icon: ShoppingBag,
      roles: ["owner"],
    },
    {
      name: "Stores",
      href: "/dashboard/stores",
      icon: Store,
      roles: ["owner"],
    },
  ];

  const filteredNavigation = profile
    ? navigation.filter((item) => item.roles.includes(profile.role))
    : navigation;

  // 🚀 CRITICAL: Show loading skeleton while profile loads
  // Don't block rendering
  const showSkeleton = !profile;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200
          transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <Store className="h-8 w-8 text-blue-600" />
              <span className="text-xl font-bold text-gray-900">StoreFlow</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center space-x-4 ml-auto">
            {showSkeleton ? (
              // 🚀 Show skeleton while loading
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white text-xs">
                        {profile.full_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{profile.full_name}</p>
                      <p className="text-xs text-gray-500">{profile.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>

        {/* Page content - 🚀 ALWAYS RENDER, even while loading */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
