import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  experimental: {
    // Feedback audio UI allows 25MB; FormData overhead needs headroom above that.
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
