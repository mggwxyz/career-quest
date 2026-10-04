import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    process.env.BONSAI_PRIMARY_URL,
    process.env.BONSAI_WEB_TAILNET_ORIGIN,
    process.env.BONSAI_WEB_CUSTOM_ORIGIN,
  ]
    .filter((origin): origin is string => Boolean(origin))
    .map(origin => new URL(origin).hostname),
}

export default nextConfig
