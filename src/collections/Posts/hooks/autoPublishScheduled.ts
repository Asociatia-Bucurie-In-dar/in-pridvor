import type { CollectionBeforeReadHook } from 'payload'

import type { Post } from '../../../payload-types'

export const autoPublishScheduled: CollectionBeforeReadHook<Post> = async ({
  doc,
  req,
}) => {
  if (!doc) return doc

  const now = new Date()
  const publishedAt = doc.publishedAt ? new Date(doc.publishedAt) : null

  if (
    doc._status === 'draft' &&
    publishedAt &&
    publishedAt <= now &&
    req.payload
  ) {
    try {
      await req.payload.update({
        collection: 'posts',
        id: doc.id,
        data: {
          _status: 'published',
        },
        context: {
          disableRevalidate: false,
        },
      })

      req.payload.logger.info(
        `✅ Auto-published scheduled post: "${doc.title}" (ID: ${doc.id})`,
      )

      const updatedDoc = await req.payload.findByID({
        collection: 'posts',
        id: doc.id,
        draft: false,
      })

      return updatedDoc as Post
    } catch (error) {
      req.payload.logger.error(
        `❌ Failed to auto-publish post ${doc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }

  return doc
}

