import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function deleteAllPosts() {
  const payload = await getPayload({ config: configPromise })

  console.log('🗑️  Deleting all posts...\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
  })

  console.log(`Found ${posts.docs.length} posts to delete\n`)

  let deletedCount = 0

  for (const post of posts.docs) {
    try {
      await payload.delete({
        collection: 'posts',
        id: post.id,
        context: {
          disableRevalidate: true,
        },
      })
      console.log(`   ✅ Deleted: "${post.title}"`)
      deletedCount++
    } catch (error) {
      console.error(`   ❌ Failed to delete "${post.title}": ${error}`)
    }
  }

  console.log(`\n🗑️  Deleted ${deletedCount} posts`)
  console.log('\n✅ All posts deleted! Ready for fresh import.')

  process.exit(0)
}

deleteAllPosts().catch((error) => {
  console.error('Delete failed:', error)
  process.exit(1)
})
