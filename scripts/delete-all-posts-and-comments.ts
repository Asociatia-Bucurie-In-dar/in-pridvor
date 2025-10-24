import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function deleteAllPostsAndComments() {
  console.log('🗑️  Starting deletion of ALL comments and posts...\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get counts
  const postsCount = await payload.count({ collection: 'posts' })
  const commentsCount = await payload.count({ collection: 'comments' })

  console.log(`📊 Current database:`)
  console.log(`   Posts: ${postsCount.totalDocs}`)
  console.log(`   Comments: ${commentsCount.totalDocs}`)

  if (postsCount.totalDocs === 0) {
    console.log('\n✅ No posts to delete!')
    return
  }

  console.log('\n⚠️  WARNING: This will delete ALL comments and posts!')
  console.log('⚠️  Starting deletion in 3 seconds...\n')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // STEP 1: Delete all comments first
  console.log('📝 STEP 1: Deleting all comments...')
  let deletedComments = 0

  if (commentsCount.totalDocs > 0) {
    while (true) {
      const comments = await payload.find({
        collection: 'comments',
        limit: 50,
        page: 1,
        depth: 0,
      })

      if (comments.docs.length === 0) break

      for (const comment of comments.docs) {
        try {
          await payload.delete({
            collection: 'comments',
            id: comment.id,
          })
          deletedComments++
          if (deletedComments % 50 === 0) {
            console.log(`   Deleted ${deletedComments}/${commentsCount.totalDocs} comments...`)
          }
        } catch (error: any) {
          console.error(`   ❌ Error deleting comment:`, error.message)
        }
      }
    }
    console.log(`✅ Deleted ${deletedComments} comments\n`)
  } else {
    console.log('   No comments to delete\n')
  }

  // STEP 2: Delete all posts
  console.log('📰 STEP 2: Deleting all posts...')
  let deletedPosts = 0

  while (true) {
    const posts = await payload.find({
      collection: 'posts',
      limit: 50,
      page: 1,
      depth: 0,
    })

    if (posts.docs.length === 0) break

    for (const post of posts.docs) {
      try {
        await payload.delete({
          collection: 'posts',
          id: post.id,
          context: {
            disableRevalidate: true,
          },
        })
        deletedPosts++
        if (deletedPosts % 25 === 0) {
          console.log(`   Deleted ${deletedPosts}/${postsCount.totalDocs} posts...`)
        }
      } catch (error: any) {
        console.error(`   ❌ Error deleting post ${post.id}:`, error.message)
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 DELETION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Comments deleted: ${deletedComments}/${commentsCount.totalDocs}`)
  console.log(`Posts deleted: ${deletedPosts}/${postsCount.totalDocs}`)
  console.log('='.repeat(60))

  // Check final counts
  const finalPostsCount = await payload.count({ collection: 'posts' })
  const finalCommentsCount = await payload.count({ collection: 'comments' })

  console.log(`\n📊 Remaining:`)
  console.log(`   Posts: ${finalPostsCount.totalDocs}`)
  console.log(`   Comments: ${finalCommentsCount.totalDocs}`)

  if (finalPostsCount.totalDocs === 0) {
    console.log('\n✅ All posts deleted successfully!')
  } else {
    console.log(`\n⚠️  Warning: ${finalPostsCount.totalDocs} posts could not be deleted`)
  }
}

deleteAllPostsAndComments()
  .then(() => {
    console.log('\n✅ Deletion complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Deletion failed:', error)
    process.exit(1)
  })
