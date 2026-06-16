import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/supabase-js", "@supabase/ssr"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@tanstack/react-table"],
  },
};

export default nextConfig;
