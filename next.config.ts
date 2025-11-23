// next.config.ts (optimized for Next.js 16 with Turbopack)
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
    // Tree-shake these packages for smaller bundles
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@supabase/supabase-js",
      "@supabase/ssr",
      "date-fns",
      "@radix-ui/react-dialog",
      "@radix-ui/react-select",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-avatar",
      "@radix-ui/react-label",
      "@radix-ui/react-separator",
      "class-variance-authority",
      "clsx",
      "tailwind-merge",
    ],
  },

  // Turbopack configuration (Next.js 16+)
  // Empty object enables Turbopack with default settings
  turbopack: {},

  // Image optimization configuration
  images: {
    // Allow images from Supabase storage
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.in",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    // Modern formats for better compression
    formats: ["image/avif", "image/webp"],
    // Cache images for 7 days
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },

  // Security and caching headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          // DNS prefetching for faster external resource loading
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // XSS protection (legacy browsers)
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Referrer policy
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Cache static assets aggressively
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache images
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // API routes - no cache by default (handled per-route)
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },

  // Redirects (add as needed)
  async redirects() {
    return [];
  },

  // Rewrites (add as needed)
  async rewrites() {
    return [];
  },
};

export default nextConfig;
