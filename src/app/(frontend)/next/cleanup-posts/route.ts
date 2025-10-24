import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'

export const maxDuration = 60 // This function can run for a maximum of 60 seconds

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

    payload.logger.info('Starting corrupted posts cleanup...')

    // Get all posts
    const posts = await payload.find({
      collection: 'posts',
      limit: 1000,
      depth: 0,
      req: payloadReq
    })

    payload.logger.info(`Found ${posts.docs.length} posts`)

    // Check for corrupted posts
    const corruptedPosts = posts.docs.filter(post => {
      return !post.id || 
             !post.title || 
             !post.slug ||
             typeof post.id !== 'number'
    })

    payload.logger.info(`Found ${corruptedPosts.length} corrupted posts`)

    let deletedCount = 0
    const errors: string[] = []

    // Delete corrupted posts
    for (const post of corruptedPosts) {
      try {
        if (post.id) {
          await payload.delete({
            collection: 'posts',
            id: post.id,
            req: payloadReq
          })
          deletedCount++
          payload.logger.info(`Deleted corrupted post ID: ${post.id}`)
        }
      } catch (error) {
        const errorMsg = `Failed to delete post ID: ${post.id}, Error: ${error}`
        errors.push(errorMsg)
        payload.logger.error(errorMsg)
      }
    }

    // Get final count
    const finalPosts = await payload.find({
      collection: 'posts',
      limit: 1000,
      depth: 0,
      req: payloadReq
    })

    payload.logger.info(`Cleanup complete! ${finalPosts.docs.length} posts remaining`)

    return Response.json({
      success: true,
      totalFound: posts.docs.length,
      corruptedFound: corruptedPosts.length,
      deletedCount,
      remainingCount: finalPosts.docs.length,
      errors: errors.slice(0, 10) // Return first 10 errors
    })

  } catch (e) {
    payload.logger.error({ err: e, message: 'Error cleaning up posts' })
    return new Response('Error cleaning up posts.', { status: 500 })
  }
}
