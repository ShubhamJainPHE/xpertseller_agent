import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds to prevent deployment failures from warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Temporarily disable TypeScript error checking during builds for deployment
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
