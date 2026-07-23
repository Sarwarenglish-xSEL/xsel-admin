import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@tanstack/react-table"],
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
