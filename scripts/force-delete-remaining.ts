import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function forceDeleteRemaining() {
  const payload = await getPayload({ config: configPromise })

  console.log('🗑️  Force deleting remaining posts...\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
  })

  console.log(`Found ${posts.docs.length} remaining posts\n`)

  for (const post of posts.docs) {
    console.log(`Processing: "${post.title}"`)

    // First delete any comments associated with this post
    try {
      const comments = await payload.find({
        collection: 'comments',
        where: {
          post: {
            equals: post.id,
          },
        },
        limit: 100,
      })

      console.log(`  Found ${comments.docs.length} comments`)

      for (const comment of comments.docs) {
        await payload.delete({
          collection: 'comments',
          id: comment.id,
        })
        console.log(`  ✅ Deleted comment`)
      }
    } catch (error) {
      console.log(`  ⚠️  Could not delete comments: ${error}`)
    }

    // Now delete the post
    try {
      await payload.delete({
        collection: 'posts',
        id: post.id,
        context: {
          disableRevalidate: true,
        },
      })
      console.log(`  ✅ Deleted post: "${post.title}"`)
    } catch (error) {
      console.error(`  ❌ Failed to delete post: ${error}`)
    }
  }

  console.log('\n✅ Cleanup completed!')

  process.exit(0)
}

forceDeleteRemaining().catch((error) => {
  console.error('Delete failed:', error)
  process.exit(1)
})
