import type { CollectionBeforeDeleteHook } from 'payload'

export const cleanupPostRelations: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const { payload, context } = req
  const postId = typeof id === 'number' ? id : parseInt(String(id), 10)

  if (isNaN(postId)) {
    payload.logger.warn(`Invalid post ID for cleanup: ${id}`)
    return
  }

  try {
    let cleanedCount = 0

    const commentsResult = await payload.find({
      collection: 'comments',
      where: { post: { equals: postId } },
      limit: 1000,
      depth: 0,
    })
    for (const comment of commentsResult.docs) {
      try {
        await payload.delete({
          collection: 'comments',
          id: comment.id,
          req: { ...req, context: { ...context, disableRevalidate: true } },
        })
        cleanedCount++
      } catch {}
    }

    const relatedPostsResult = await payload.find({
      collection: 'posts',
      where: { relatedPosts: { contains: postId } },
      limit: 1000,
      depth: 0,
    })
    for (const relatedPost of relatedPostsResult.docs) {
      try {
        const currentRelated = Array.isArray(relatedPost.relatedPosts)
          ? relatedPost.relatedPosts
              .map((p: any) => (typeof p === 'object' ? p.id : p))
              .filter((p: any) => p !== postId)
          : []
        await payload.update({
          collection: 'posts',
          id: relatedPost.id,
          data: { relatedPosts: currentRelated.length > 0 ? currentRelated : undefined },
          req: { ...req, context: { ...context, disableRevalidate: true } },
        })
        cleanedCount++
      } catch {}
    }

    if (cleanedCount > 0) {
      payload.logger.info(
        `Cleanup completed for post ${postId}: ${cleanedCount} related records processed`,
      )
    }
  } catch (error: any) {
    payload.logger.error(`Error during post cleanup: ${error.message}`)
  }
}
