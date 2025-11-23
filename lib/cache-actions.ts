// lib/cache-actions.ts
"use server";

import { revalidatePath } from "next/cache";

/**
 * Note: Using revalidatePath instead of revalidateTag due to type issues
 * This achieves the same result - invalidating cached data
 */

/**
 * Invalidate products cache
 * Call after: create, update, delete product
 */
export async function invalidateProductsCache() {
  revalidatePath("/dashboard/products", "page");
  revalidatePath("/dashboard/sales/new", "page");
}

/**
 * Invalidate sales cache
 * Call after: complete sale
 */
export async function invalidateSalesCache() {
  revalidatePath("/dashboard", "page");
  revalidatePath("/dashboard/sales", "page");
  revalidatePath("/dashboard/sales/new", "page");
}

/**
 * Invalidate stores cache
 * Call after: create, update, delete store
 */
export async function invalidateStoresCache() {
  revalidatePath("/dashboard/stores", "page");
  revalidatePath("/dashboard/products", "page");
}

/**
 * Invalidate all caches
 * Call after: major data changes or manually
 */
export async function invalidateAllCaches() {
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/products", "page");
  revalidatePath("/dashboard/sales", "page");
  revalidatePath("/dashboard/sales/new", "page");
  revalidatePath("/dashboard/purchases", "page");
  revalidatePath("/dashboard/stores", "page");
}

/**
 * Revalidate specific paths
 * Useful for targeted cache invalidation
 */
export async function revalidateSpecificPaths(paths: string[]) {
  paths.forEach((path) => {
    revalidatePath(path, "page");
  });
}
