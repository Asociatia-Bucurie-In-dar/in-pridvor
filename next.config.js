import { withPayload } from '@payloadcms/next/withPayload'
import createNextIntlPlugin from 'next-intl/plugin'

import redirects from './redirects.js'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const normalizeURL = (urlString) => {
  if (!urlString) return null
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    return urlString
  }
  return `https://${urlString}`
}

const getNEXT_PUBLIC_SERVER_URL = () => {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return normalizeURL(process.env.NEXT_PUBLIC_SERVER_URL)
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  return 'http://localhost:3000'
}

const NEXT_PUBLIC_SERVER_URL = getNEXT_PUBLIC_SERVER_URL()

const getImageRemotePatterns = () => {
  const patterns = []

  if (NEXT_PUBLIC_SERVER_URL) {
    try {
      const url = new URL(NEXT_PUBLIC_SERVER_URL)
      patterns.push({
        hostname: url.hostname,
        protocol: url.protocol.replace(':', ''),
      })
    } catch (e) {
      console.warn('Invalid NEXT_PUBLIC_SERVER_URL:', NEXT_PUBLIC_SERVER_URL)
    }
  }

  if (process.env.VERCEL_URL) {
    try {
      const url = new URL(`https://${process.env.VERCEL_URL}`)
      patterns.push({
        hostname: url.hostname,
        protocol: 'https',
      })
    } catch (e) {
      console.warn('Invalid VERCEL_URL:', process.env.VERCEL_URL)
    }
  }

  if (process.env.R2_PUBLIC_URL) {
    try {
      const url = new URL(process.env.R2_PUBLIC_URL)
      patterns.push({
        hostname: url.hostname,
        protocol: 'https',
      })
    } catch (e) {
      console.warn('Invalid R2_PUBLIC_URL:', process.env.R2_PUBLIC_URL)
    }
  }

  return patterns
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: getImageRemotePatterns(),
    // Next 16 only allows quality 75 by default; ImageMedia requests 100.
    qualities: [75, 100],
    unoptimized: false,
  },
  reactStrictMode: true,
  redirects,
}

export default withNextIntl(withPayload(nextConfig))
