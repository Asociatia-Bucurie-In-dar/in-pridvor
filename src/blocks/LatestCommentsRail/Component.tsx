import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'
import { getTranslations } from 'next-intl/server'

import { LatestCommentsRailClient } from './Component.client'

const fetchLatestComments = async (limit: number) => {
  const getCachedLatestComments = unstable_cache(
    async () => {
      const payload = await getPayload({ config: configPromise })

      const result = await payload.find({
        collection: 'comments',
        depth: 1,
        limit,
        sort: '-createdAt',
        where: {
          status: {
            equals: 'approved',
          },
        },
      })

      return result.docs ?? []
    },
    ['latest-comments-rail', String(limit)],
    {
      revalidate: 300,
      tags: [`latest_comments_rail_${limit}`],
    },
  )

  return getCachedLatestComments()
}

const truncate = (value: string, length: number) => {
  if (!value) return ''
  const condensed = value.trim().replace(/\s+/g, ' ')
  if (condensed.length <= length) return condensed
  return `${condensed.slice(0, length - 1).trimEnd()}…`
}

type LatestCommentsRailBlockProps = {
  heading?: string
  subheading?: string
  limit?: number
}

export const LatestCommentsRailBlock: React.FC<LatestCommentsRailBlockProps> = async (props) => {
  const t = await getTranslations('Comments')
  const limit =
    typeof props.limit === 'number' && Number.isFinite(props.limit) && props.limit > 0
      ? Math.min(props.limit, 24)
      : 8
  const comments = await fetchLatestComments(limit)

  const items = comments.map((comment) => {
    const post = comment.post
    const postSlug =
      post && typeof post === 'object' && post !== null && 'slug' in post && post.slug
        ? String(post.slug)
        : null
    const postTitle =
      post && typeof post === 'object' && post !== null && 'title' in post && post.title
        ? String(post.title)
        : t('unknownArticle')

    return {
      id: String(comment.id),
      name: comment.name || t('anonymousReader'),
      createdAt: comment.createdAt ? String(comment.createdAt) : null,
      body: truncate(comment.comment || '', 220),
      href: postSlug ? `/posts/${postSlug}` : '#',
      postTitle,
    }
  })

  return (
    <LatestCommentsRailClient
      heading={props.heading || t('railHeading')}
      subheading={props.subheading || t('railSubheading')}
      items={items}
    />
  )
}
