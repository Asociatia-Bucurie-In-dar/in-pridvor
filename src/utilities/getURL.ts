import canUseDOM from './canUseDOM'

const normalizeURL = (urlString: string): string => {
  if (!urlString) return urlString
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    return urlString
  }
  return `https://${urlString}`
}

export const getServerSideURL = () => {
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return normalizeURL(process.env.NEXT_PUBLIC_SERVER_URL)
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}

export const getClientSideURL = () => {
  if (canUseDOM) {
    const protocol = window.location.protocol
    const domain = window.location.hostname
    const port = window.location.port

    return `${protocol}//${domain}${port ? `:${port}` : ''}`
  }

  // Server-side fallbacks (in order of preference)
  if (process.env.NEXT_PUBLIC_SERVER_URL) {
    return normalizeURL(process.env.NEXT_PUBLIC_SERVER_URL)
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'http://localhost:3000'
}
