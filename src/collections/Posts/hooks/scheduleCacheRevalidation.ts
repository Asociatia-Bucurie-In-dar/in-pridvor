import type { CollectionAfterChangeHook } from 'payload'

import type { Post } from '../../../payload-types'

export const scheduleCacheRevalidation: CollectionAfterChangeHook<Post> = async ({
  doc,
  req,
}) => {
  if (!doc || !req.payload) return doc

  const publishedAt = doc.publishedAt ? new Date(doc.publishedAt) : null
  const now = new Date()

  if (doc._status === 'published' && publishedAt && publishedAt > now) {
    const revalidationTime = new Date(publishedAt.getTime() + 10 * 1000)

    try {
      await req.payload.create({
        collection: 'payload-jobs',
        data: {
          taskSlug: 'revalidateCache' as any,
          waitUntil: revalidationTime.toISOString(),
          input: {
            postId: doc.id,
            postSlug: doc.slug,
          },
        },
        overrideAccess: true,
      })

      req.payload.logger.info(
        `✅ Scheduled cache revalidation for post "${doc.title}" (ID: ${doc.id}) at ${revalidationTime.toISOString()}`,
      )
    } catch (error) {
      req.payload.logger.error(
        `❌ Failed to schedule cache revalidation for post ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  return doc
}

