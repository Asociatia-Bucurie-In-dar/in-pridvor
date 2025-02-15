import type { Metadata } from 'next'
import { getServerSideURL } from './getURL'
import { websiteDescription, websiteTitle } from './commonInfo'

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: websiteDescription,
  images: [
    {
      url: `${getServerSideURL()}/website-template-OG.webp`,
    },
  ],
  siteName: websiteTitle,
  title: websiteTitle,
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
