import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { unstable_cache } from 'next/cache'

import { LATEST_COMMENTS_TAG } from './revalidate'

export type LatestComment = {
  id: string
  name: string
  comment: string
  createdAt: string | null
  post: { slug: string; title: string } | null
}

/**
 * Latest approved comments with just the post title/slug they belong to.
 * Cached until a comment changes (the Comments hooks expire LATEST_COMMENTS_TAG).
 */
export const getLatestComments = (limit: number, locale: string) =>
  unstable_cache(
    async (): Promise<LatestComment[]> => {
      const payload = await getPayload({ config: configPromise })

      const result = await payload.find({
        collection: 'comments',
        depth: 1,
        limit,
        sort: '-createdAt',
        select: { name: true, comment: true, createdAt: true, post: true },
        // Only what the blocks render — not the whole article body.
        populate: { posts: { title: true, slug: true, en: { title: true } } },
        context: { locale },
        where: { status: { equals: 'approved' } },
      })

      return result.docs.map((doc) => {
        const post = typeof doc.post === 'object' && doc.post?.slug ? doc.post : null
        return {
          id: String(doc.id),
          name: doc.name,
          comment: doc.comment,
          createdAt: doc.createdAt ?? null,
          post: post ? { slug: String(post.slug), title: String(post.title ?? '') } : null,
        }
      })
    },
    ['latest-comments', String(limit), locale],
    { tags: [LATEST_COMMENTS_TAG] },
  )()
