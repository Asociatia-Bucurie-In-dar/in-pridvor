import React from 'react'
import type { Post } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getURL'

interface ArticleStructuredDataProps {
  post: Post
}

export const ArticleStructuredData: React.FC<ArticleStructuredDataProps> = ({ post }) => {
  const siteUrl = getServerSideURL()
  const postUrl = `${siteUrl}/posts/${typeof post.slug === 'string' ? post.slug : post.slug?.join('/') || ''}`
  
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

  const imageUrl = post.meta?.image && typeof post.meta.image === 'object' && 'url' in post.meta.image
    ? post.meta.image.url.startsWith('http')
      ? post.meta.image.url
      : `${siteUrl}${post.meta.image.url}`
    : post.heroImage && typeof post.heroImage === 'object' && 'url' in post.heroImage
      ? post.heroImage.url.startsWith('http')
        ? post.heroImage.url
        : `${siteUrl}${post.heroImage.url}`
      : `${siteUrl}/logo-in-pridvor-1.jpg`

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

