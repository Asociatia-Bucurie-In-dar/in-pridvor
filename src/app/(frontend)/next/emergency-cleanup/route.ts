import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 300 // This function can run for a maximum of 5 minutes

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  // Authenticate by passing request headers
  const { user } = await payload.auth({ headers: requestHeaders })

  if (!user) {
    return new Response('Action forbidden.', { status: 403 })
  }

  try {
    // Create a Payload request object to pass to the Local API for transactions
    const payloadReq = await createLocalReq({ user }, payload)

    payload.logger.info('🚨 Emergency cleanup starting...')

    // Get all posts to see what we have
    const allPosts = await payload.find({
      collection: 'posts',
      limit: 0, // Get all posts
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`📊 Found ${allPosts.totalDocs} posts in database`)

    if (allPosts.totalDocs === 0) {
      payload.logger.info('✅ No posts found - database is clean!')
      return Response.json({
        success: true,
        totalFound: 0,
        corruptedFound: 0,
        deletedCount: 0,
        remainingCount: 0,
        errors: [],
      })
    }

    // Try to get posts with pagination to see if there are corrupted ones
    const posts = await payload.find({
      collection: 'posts',
      limit: 100,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`📋 Retrieved ${posts.docs.length} posts`)

    // Check for posts with invalid data
    const corruptedPosts = posts.docs.filter(
      (post) => !post.id || !post.title || post.title === '' || !post.slug || post.slug === '',
    )

    payload.logger.info(`🔍 Found ${corruptedPosts.length} corrupted posts`)

    let deletedCount = 0
    const errors: string[] = []

    if (corruptedPosts.length > 0) {
      payload.logger.info('Corrupted posts:')
      corruptedPosts.forEach((post, index) => {
        payload.logger.info(
          `${index + 1}. ID: ${post.id}, Title: ${post.title || 'NO TITLE'}, Slug: ${post.slug || 'NO SLUG'}`,
        )
      })

      // Delete corrupted posts
      payload.logger.info('\n🗑️ Deleting corrupted posts...')

      for (const post of corruptedPosts) {
        try {
          await payload.delete({
            collection: 'posts',
            id: post.id,
            req: payloadReq,
          })
          payload.logger.info(`✅ Deleted post ID: ${post.id}`)
          deletedCount++
        } catch (error: any) {
          const errorMessage = `Failed to delete post ID: ${post.id} - ${error.message || error}`
          payload.logger.error(errorMessage)
          errors.push(errorMessage)
        }
      }
    }

    // Final count
    const finalPosts = await payload.find({
      collection: 'posts',
      limit: 0,
      depth: 0,
      req: payloadReq,
    })

    payload.logger.info(`\n✅ Cleanup complete! ${finalPosts.totalDocs} posts remaining`)

    return Response.json({
      success: true,
      totalFound: allPosts.totalDocs,
      corruptedFound: corruptedPosts.length,
      deletedCount,
      remainingCount: finalPosts.totalDocs,
      errors,
    })
  } catch (e: any) {
    payload.logger.error({ err: e, message: 'Error during emergency cleanup' })
    return new Response('Error during emergency cleanup.', { status: 500 })
  }
}
