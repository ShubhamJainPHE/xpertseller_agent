import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds to prevent deployment failures from warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Enable TypeScript error checking during builds
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
