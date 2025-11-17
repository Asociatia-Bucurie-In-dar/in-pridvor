import React from 'react'
import { getServerSideURL } from '@/utilities/getURL'
import { websiteTitle } from '@/utilities/commonInfo'

export const OrganizationStructuredData: React.FC = () => {
  const siteUrl = getServerSideURL()

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: websiteTitle,
    url: siteUrl,
    logo: `${siteUrl}/logo-in-pridvor-1.jpg`,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

