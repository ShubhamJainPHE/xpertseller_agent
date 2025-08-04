/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the experimental appDir - it's default in Next.js 15
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    // Disable worker threads to prevent DataCloneError during build
    workerThreads: false,
  },
  // External packages for server components - helps with build performance
  serverExternalPackages: ['composio-core'],
}

module.exports = nextConfig