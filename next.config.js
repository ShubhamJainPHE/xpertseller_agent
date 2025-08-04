/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove the experimental appDir - it's default in Next.js 15
  eslint: {
    ignoreDuringBuilds: true
  }
}

module.exports = nextConfig