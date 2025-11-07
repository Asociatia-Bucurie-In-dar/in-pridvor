import type { CollectionBeforeDeleteHook } from 'payload'

export const cleanupPostRelations: CollectionBeforeDeleteHook = async ({
  id,
  req,
}) => {
  const { payload, context } = req
  const postId = typeof id === 'number' ? id : parseInt(String(id), 10)

  if (isNaN(postId)) {
    payload.logger.warn(`⚠️  Invalid post ID for cleanup: ${id}`)
    return
  }

  try {
    payload.logger.info(`🧹 Cleaning up relations for post ID: ${postId}`)

    let cleanedCount = 0

    // First, delete comments at database level to avoid foreign key constraint issues
    // This must happen BEFORE Payload tries to delete the post, otherwise the foreign key constraint will fail
    try {
      const { Pool } = await import('pg')
      if (process.env.POSTGRES_URL) {
        const pool = new Pool({
          connectionString: process.env.POSTGRES_URL,
        })
        try {
          // Delete comments directly at database level first (bypasses foreign key constraints)
          const deleteCommentsResult = await pool.query(
            'DELETE FROM comments WHERE post_id = $1',
            [postId],
          )
          if (deleteCommentsResult.rowCount && deleteCommentsResult.rowCount > 0) {
            cleanedCount += deleteCommentsResult.rowCount
            payload.logger.info(`   ✅ Deleted ${deleteCommentsResult.rowCount} comments at database level`)
          }
          await pool.end()
        } catch (dbError: any) {
          payload.logger.warn(`   ⚠️  Database cleanup error: ${dbError.message}`)
          await pool.end()
          // Fallback to Payload API deletion if SQL fails
          try {
            const commentsResult = await payload.find({
              collection: 'comments',
              where: {
                post: {
                  equals: postId,
                },
              },
              limit: 1000,
              depth: 0,
            })

            if (commentsResult.docs.length > 0) {
              for (const comment of commentsResult.docs) {
                try {
                  await payload.delete({
                    collection: 'comments',
                    id: comment.id,
                    req: {
                      ...req,
                      context: {
                        ...context,
                        disableRevalidate: true,
                      },
                    },
                  })
                  cleanedCount++
                } catch (error: any) {
                  payload.logger.warn(`   ⚠️  Failed to delete comment ${comment.id}: ${error.message}`)
                }
              }
              payload.logger.info(`   ✅ Deleted ${commentsResult.docs.length} comments via Payload API fallback`)
            }
          } catch (error: any) {
            payload.logger.warn(`   ⚠️  Failed to cleanup comments via Payload API: ${error.message}`)
          }
        }
      }
    } catch (importError: any) {
      payload.logger.warn(`   ⚠️  Failed to import pg for direct comment deletion: ${importError.message}`)
      // Fallback to Payload API deletion
      try {
        const commentsResult = await payload.find({
          collection: 'comments',
          where: {
            post: {
              equals: postId,
            },
          },
          limit: 1000,
          depth: 0,
        })

        if (commentsResult.docs.length > 0) {
          for (const comment of commentsResult.docs) {
            try {
              await payload.delete({
                collection: 'comments',
                id: comment.id,
                req: {
                  ...req,
                  context: {
                    ...context,
                    disableRevalidate: true,
                  },
                },
              })
              cleanedCount++
            } catch (error: any) {
              payload.logger.warn(`   ⚠️  Failed to delete comment ${comment.id}: ${error.message}`)
            }
          }
          payload.logger.info(`   ✅ Deleted ${commentsResult.docs.length} comments via Payload API fallback`)
        }
      } catch (error: any) {
        payload.logger.warn(`   ⚠️  Failed to cleanup comments: ${error.message}`)
      }
    }

    try {
      const relatedPostsResult = await payload.find({
        collection: 'posts',
        where: {
          relatedPosts: {
            contains: postId,
          },
        },
        limit: 1000,
        depth: 0,
      })

      if (relatedPostsResult.docs.length > 0) {
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
              data: {
                relatedPosts: currentRelated.length > 0 ? currentRelated : undefined,
              },
              req: {
                ...req,
                context: {
                  ...context,
                  disableRevalidate: true,
                },
              },
            })
            cleanedCount++
          } catch (error: any) {
            payload.logger.warn(`   ⚠️  Failed to remove post from relatedPosts: ${error.message}`)
          }
        }
        payload.logger.info(`   ✅ Removed post from ${relatedPostsResult.docs.length} related posts`)
      }
    } catch (error: any) {
      payload.logger.warn(`   ⚠️  Failed to cleanup relatedPosts: ${error.message}`)
    }

    // Clean up database-level relations (comments already deleted above)
    try {
      const { Pool } = await import('pg')

      if (process.env.POSTGRES_URL) {
        const pool = new Pool({
          connectionString: process.env.POSTGRES_URL,
        })

        try {
          const deletePostsRels = await pool.query(
            'DELETE FROM posts_rels WHERE parent_id = $1',
            [postId],
          )
          if (deletePostsRels.rowCount && deletePostsRels.rowCount > 0) {
            cleanedCount += deletePostsRels.rowCount
            payload.logger.info(`   ✅ Cleaned up ${deletePostsRels.rowCount} posts_rels records`)
          }

          const deleteVersionsRels = await pool.query(
            'DELETE FROM _posts_v_rels WHERE parent_id = $1',
            [postId],
          )
          if (deleteVersionsRels.rowCount && deleteVersionsRels.rowCount > 0) {
            cleanedCount += deleteVersionsRels.rowCount
            payload.logger.info(`   ✅ Cleaned up ${deleteVersionsRels.rowCount} _posts_v_rels records`)
          }

          const deleteVersions = await pool.query('DELETE FROM _posts_v WHERE id = $1', [postId])
          if (deleteVersions.rowCount && deleteVersions.rowCount > 0) {
            cleanedCount += deleteVersions.rowCount
            payload.logger.info(`   ✅ Cleaned up ${deleteVersions.rowCount} _posts_v records`)
          }

          const deleteSearchIndex = await pool.query(
            `DELETE FROM payload_search WHERE "relationTo" = 'posts' AND id::text = $1`,
            [String(postId)],
          )
          if (deleteSearchIndex.rowCount && deleteSearchIndex.rowCount > 0) {
            cleanedCount += deleteSearchIndex.rowCount
            payload.logger.info(`   ✅ Cleaned up ${deleteSearchIndex.rowCount} search index records`)
          }

          const deleteLockedDocs = await pool.query(
            `DELETE FROM payload_locked_documents WHERE document->>'relationTo' = 'posts' AND (document->>'value')::int = $1`,
            [postId],
          )
          if (deleteLockedDocs.rowCount && deleteLockedDocs.rowCount > 0) {
            cleanedCount += deleteLockedDocs.rowCount
            payload.logger.info(`   ✅ Cleaned up ${deleteLockedDocs.rowCount} locked document records`)
          }

          const updateRedirects = await pool.query(
            `UPDATE redirects SET "to" = NULL WHERE "to"->>'type' = 'reference' AND "to"->>'relationTo' = 'posts' AND ("to"->>'value')::int = $1`,
            [postId],
          )
          if (updateRedirects.rowCount && updateRedirects.rowCount > 0) {
            cleanedCount += updateRedirects.rowCount
            payload.logger.info(`   ✅ Updated ${updateRedirects.rowCount} redirects`)
          }

          await pool.end()
        } catch (dbError: any) {
          payload.logger.warn(`   ⚠️  Database cleanup error: ${dbError.message}`)
          await pool.end()
        }
      }
    } catch (importError: any) {
      payload.logger.warn(`   ⚠️  Failed to import pg for database cleanup: ${importError.message}`)
    }

    if (cleanedCount > 0) {
      payload.logger.info(`✅ Cleanup completed: ${cleanedCount} related records processed`)
    } else {
      payload.logger.info(`✅ Cleanup completed: No related records found`)
    }
  } catch (error: any) {
    payload.logger.error(`❌ Error during post cleanup: ${error.message}`)
    payload.logger.warn(`⚠️  Continuing with post deletion despite cleanup errors`)
  }
}
