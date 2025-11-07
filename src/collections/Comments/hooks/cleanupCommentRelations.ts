import type { CollectionBeforeDeleteHook } from 'payload'

export const cleanupCommentRelations: CollectionBeforeDeleteHook = async ({
  id,
  req: { payload },
}) => {
  try {
    const childComments = await payload.find({
      collection: 'comments',
      where: {
        parent: {
          equals: id,
        },
      },
      limit: 0,
      depth: 0,
    })

    if (childComments.totalDocs > 0) {
      for (const child of childComments.docs) {
        await payload.update({
          collection: 'comments',
          id: child.id,
          data: {
            parent: null,
          },
          depth: 0,
        })
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    payload.logger.error(`Failed to cleanup comment relations for comment ${id}: ${errorMessage}`)
  }
}

