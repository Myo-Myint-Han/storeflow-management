import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Optimize production build
  productionBrowserSourceMaps: false,

  // Experimental optimizations
  experimental: {
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@supabase/supabase-js",
    ],
  },
};

export default nextConfig;
