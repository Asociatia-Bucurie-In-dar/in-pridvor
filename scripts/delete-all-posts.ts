import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function deleteAllPosts() {
  console.log('🗑️  Starting deletion of ALL posts...\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get total count
  const totalCount = await payload.count({ collection: 'posts' })
  console.log(`📊 Total posts in database: ${totalCount.totalDocs}`)

  if (totalCount.totalDocs === 0) {
    console.log('✅ No posts to delete!')
    return
  }

  console.log('\n⚠️  WARNING: This will delete ALL posts!')
  console.log('⚠️  Starting deletion in 5 seconds...\n')
  await new Promise((resolve) => setTimeout(resolve, 5000))

  let deletedCount = 0
  let errorCount = 0
  let page = 1
  const limit = 50

  while (true) {
    const posts = await payload.find({
      collection: 'posts',
      limit: limit,
      page: page,
      depth: 0,
    })

    if (posts.docs.length === 0) break

    console.log(`\n📦 Processing batch ${page} (${posts.docs.length} posts)...`)

    for (const post of posts.docs) {
      try {
        await payload.delete({
          collection: 'posts',
          id: post.id,
          context: {
            disableRevalidate: true,
          },
        })
        deletedCount++
        if (deletedCount % 10 === 0) {
          console.log(`   Deleted ${deletedCount}/${totalCount.totalDocs} posts...`)
        }
      } catch (error: any) {
        console.error(`   ❌ Error deleting post ${post.id}:`, error.message)
        errorCount++
      }
    }

    page++
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 DELETION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total posts: ${totalCount.totalDocs}`)
  console.log(`Successfully deleted: ${deletedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log('='.repeat(60))

  // Check final count
  const finalCount = await payload.count({ collection: 'posts' })
  console.log(`\n📊 Remaining posts: ${finalCount.totalDocs}`)
}

deleteAllPosts()
  .then(() => {
    console.log('\n✅ Deletion complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deletion failed:', error)
    process.exit(1)
  })
