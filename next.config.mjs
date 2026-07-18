/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // These packages use native Node.js modules (fs, path, etc.)
  // and must NOT be bundled by Next.js in production.
  serverExternalPackages: ['pdf-parse', 'mammoth', 'xlsx'],
  experimental: {
    proxyClientMaxBodySize: '100mb',
  },
}

export default nextConfig
