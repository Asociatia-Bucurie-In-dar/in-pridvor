// Emergency cleanup script - runs directly in the server context
import { getPayload } from 'payload'
import config from '@payload-config'

async function emergencyCleanup() {
  console.log('🚨 Emergency cleanup starting...')

  try {
    const payload = await getPayload({ config })

    // Get all posts to see what we have
    const allPosts = await payload.find({
      collection: 'posts',
      limit: 0, // Get all posts
      depth: 0,
    })

    console.log(`📊 Found ${allPosts.totalDocs} posts in database`)

    if (allPosts.totalDocs === 0) {
      console.log('✅ No posts found - database is clean!')
      return
    }

    // Try to get posts with pagination to see if there are corrupted ones
    const posts = await payload.find({
      collection: 'posts',
      limit: 100,
      depth: 0,
    })

    console.log(`📋 Retrieved ${posts.docs.length} posts`)

    // Check for posts with invalid data
    const corruptedPosts = posts.docs.filter(
      (post) => !post.id || !post.title || post.title === '' || !post.slug || post.slug === '',
    )

    console.log(`🔍 Found ${corruptedPosts.length} corrupted posts`)

    if (corruptedPosts.length > 0) {
      console.log('Corrupted posts:')
      corruptedPosts.forEach((post, index) => {
        console.log(
          `${index + 1}. ID: ${post.id}, Title: ${post.title || 'NO TITLE'}, Slug: ${post.slug || 'NO SLUG'}`,
        )
      })

      // Delete corrupted posts
      console.log('\n🗑️ Deleting corrupted posts...')

      for (const post of corruptedPosts) {
        try {
          await payload.delete({
            collection: 'posts',
            id: post.id,
          })
          console.log(`✅ Deleted post ID: ${post.id}`)
        } catch (error) {
          console.error(`❌ Failed to delete post ID: ${post.id}`, error)
        }
      }
    }

    // Final count
    const finalPosts = await payload.find({
      collection: 'posts',
      limit: 0,
      depth: 0,
    })

    console.log(`\n✅ Cleanup complete! ${finalPosts.totalDocs} posts remaining`)
  } catch (error) {
    console.error('❌ Emergency cleanup failed:', error)
  }
}

emergencyCleanup().catch(console.error)
