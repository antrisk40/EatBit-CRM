import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure environment variables are available in production
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // Enable standalone output for better production builds
  output: 'standalone',
};

export default nextConfig;
