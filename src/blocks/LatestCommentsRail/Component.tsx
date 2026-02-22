import React from 'react'
import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

import { LatestCommentsRailClient } from './Component.client'

const getCachedLatestComments = unstable_cache(
  async (limit: number) => {
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
      select: {
        name: true,
        comment: true,
        createdAt: true,
        post: true,
      } as any,
    })

    return result.docs ?? []
  },
  ['latest-comments-rail'],
  { tags: ['comments'], revalidate: 300 },
)

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
  const limit =
    typeof props.limit === 'number' && Number.isFinite(props.limit) && props.limit > 0
      ? Math.min(props.limit, 24)
      : 10
  const comments = await getCachedLatestComments(limit)

  const items = comments.map((comment) => {
    const post = comment.post
    const postSlug =
      post && typeof post === 'object' && post !== null && 'slug' in post && post.slug
        ? String(post.slug)
        : null
    const postTitle =
      post && typeof post === 'object' && post !== null && 'title' in post && post.title
        ? String(post.title)
        : 'Articol necunoscut'

    return {
      id: String(comment.id),
      name: comment.name || 'Cititor anonim',
      createdAt: comment.createdAt ? String(comment.createdAt) : null,
      body: truncate(comment.comment || '', 180),
      href: postSlug ? `/posts/${postSlug}` : '#',
      postTitle,
    }
  })

  return (
    <LatestCommentsRailClient
      heading={props.heading || 'Vocile comunității'}
      subheading={props.subheading || 'Cele mai recente comentarii de la cititorii noștri'}
      items={items}
    />
  )
}
