import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  experimental: {
    // Next 15.5 still validates this under experimental (top-level is rejected).
    serverActions: {
      bodySizeLimit: "30mb",
    },
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "@tanstack/react-table",
      "recharts",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Fixed hostname — do not parse NEXT_PUBLIC_SUPABASE_URL here
        // (Vercel env typos crash the build with ERR_INVALID_URL).
        hostname: "rayzcfjxkugzwetfxkkl.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
