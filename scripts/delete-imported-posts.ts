import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function deleteImportedPosts() {
  console.log('🗑️  Starting deletion of 39 imported posts...\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get posts sorted by createdAt (newest first) - the 39 we just imported
  const recentPosts = await payload.find({
    collection: 'posts',
    limit: 39,
    sort: '-createdAt',
    depth: 0,
  })

  console.log(`📊 Found ${recentPosts.docs.length} posts to delete\n`)
  console.log('Posts to be deleted:')
  console.log('='.repeat(60))

  recentPosts.docs.forEach((post, idx) => {
    console.log(`${idx + 1}. ${post.title}`)
    console.log(`   Created: ${post.createdAt}`)
    console.log(`   Slug: ${post.slug}`)
  })

  console.log('='.repeat(60))
  console.log('\n⚠️  Starting deletion in 3 seconds...\n')

  // Wait 3 seconds
  await new Promise((resolve) => setTimeout(resolve, 3000))

  let deletedCount = 0
  let errorCount = 0

  for (const post of recentPosts.docs) {
    try {
      await payload.delete({
        collection: 'posts',
        id: post.id,
        context: {
          disableRevalidate: true, // Disable Next.js revalidation during deletion
        },
      })
      console.log(`✅ Deleted: ${post.title}`)
      deletedCount++
    } catch (error: any) {
      console.error(`❌ Error deleting "${post.title}":`, error.message)
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 DELETION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Posts to delete: ${recentPosts.docs.length}`)
  console.log(`Successfully deleted: ${deletedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log('='.repeat(60))

  // Check final count
  const finalCount = await payload.count({ collection: 'posts' })
  console.log(`\n📊 Total posts remaining: ${finalCount.totalDocs}`)
}

deleteImportedPosts()
  .then(() => {
    console.log('\n✅ Deletion complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deletion failed:', error)
    process.exit(1)
  })
