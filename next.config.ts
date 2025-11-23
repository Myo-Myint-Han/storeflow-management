import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚡ VERCEL OPTIMIZATION
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // ⚡ Disable source maps in production (faster builds)
  productionBrowserSourceMaps: false,

  // ⚡ Optimize for Vercel Edge
  experimental: {
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
    ],
  },

  // ⚡ Use Turbopack in development only
  turbopack: {},

  // ⚡ Image optimization
  images: {
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
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    // ⚡ Optimize for Vercel
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // ⚡ Security headers (Vercel-optimized)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // ⚡ Cache static assets aggressively
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // ⚡ Cache images
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // ⚡ API routes - cache for 60 seconds
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=120",
          },
        ],
      },
    ];
  },

  // ⚡ Redirects
  async redirects() {
    return [];
  },

  // ⚡ Rewrites
  async rewrites() {
    return [];
  },
};

export default nextConfig;
