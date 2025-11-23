// components/ui/LazyCharts.tsx
"use client";

import dynamic from "next/dynamic";

// Skeleton component for loading state
function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div
      className="bg-gray-100 animate-pulse rounded-lg"
      style={{ height: `${height}px` }}
    />
  );
}

// Lazy load recharts components to reduce initial bundle size
// These components are heavy (~150KB+ together)

export const LazyLineChart = dynamic(
  () => import("recharts").then((mod) => mod.LineChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={300} />,
  }
);

export const LazyBarChart = dynamic(
  () => import("recharts").then((mod) => mod.BarChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={300} />,
  }
);

export const LazyPieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={300} />,
  }
);

export const LazyAreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  {
    ssr: false,
    loading: () => <ChartSkeleton height={300} />,
  }
);

export const LazyResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);

// Re-export non-heavy components directly
// These are small and don't benefit from lazy loading
export {
  Line,
  Bar,
  Pie,
  Cell,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
