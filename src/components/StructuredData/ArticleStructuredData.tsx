import React from 'react'
import type { Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

interface ArticleStructuredDataProps {
  post: Post
}

export const ArticleStructuredData: React.FC<ArticleStructuredDataProps> = ({ post }) => {
  const siteUrl = getServerSideURL()
  const slug = post.slug || ''
  const postUrl = `${siteUrl}/posts/${slug}`
  
  const authors = post.populatedAuthors && post.populatedAuthors.length > 0
    ? post.populatedAuthors.map((author) => ({
        '@type': 'Person',
        name: author.name || 'Unknown Author',
      }))
    : [{ '@type': 'Person', name: 'În Pridvor' }]

  const categories = post.categories && Array.isArray(post.categories)
    ? post.categories
        .filter((cat) => typeof cat === 'object' && cat !== null)
        .map((cat) => (cat as { title?: string }).title || '')
        .filter((title) => title.length > 0)
    : []

  const getImageUrl = (image: unknown): string | null => {
    if (!image || typeof image !== 'object' || !('url' in image)) return null
    const url = (image as { url?: string | null }).url
    if (!url) return null
    return url.startsWith('http') ? url : `${siteUrl}${url}`
  }

  const imageUrl = getImageUrl(post.meta?.image) || getImageUrl(post.heroImage) || `${siteUrl}/logo-in-pridvor-1.jpg`

  const publishedDate = post.publishedAt || new Date().toISOString()
  const modifiedDate = post.updatedAt || publishedDate

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: imageUrl,
    datePublished: publishedDate,
    dateModified: modifiedDate,
    author: authors,
    publisher: {
      '@type': 'Organization',
      name: 'În Pridvor',
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/logo-in-pridvor-1.jpg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    ...(categories.length > 0 && { articleSection: categories.join(', ') }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}

