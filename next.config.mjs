/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/sitemap.xml",
        destination: "/sitemap",
      },
    ]
  },
  webpack(config, { dev }) {
    if (dev) {
      config.devtool = false
    }
    return config
  },
}

export default nextConfig
