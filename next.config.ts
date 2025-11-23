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
      "@supabase/ssr",
      "date-fns",
    ],
  },

  // Turbopack configuration
  turbopack: {},

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  // ⚡ CRITICAL: Add aggressive caching headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ⚡ Cache everything for 60 seconds
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
      {
        // ⚡ Cache static assets for 1 year
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
