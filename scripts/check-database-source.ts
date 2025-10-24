// Check where the posts are coming from
import { getPayload } from 'payload'
import config from '@payload-config'

async function checkDatabaseSource() {
  console.log('🔍 Checking database source and posts...')

  try {
    const payload = await getPayload({ config })

    // Check database connection info
    console.log('📊 Database configuration:')
    console.log('- Adapter:', payload.db?.constructor?.name || 'Unknown')

    // Get posts count
    const posts = await payload.find({
      collection: 'posts',
      limit: 0, // Get count only
      depth: 0,
    })

    console.log(`📋 Total posts in database: ${posts.totalDocs}`)

    if (posts.totalDocs > 0) {
      // Get a few sample posts
      const samplePosts = await payload.find({
        collection: 'posts',
        limit: 5,
        depth: 0,
      })

      console.log('\n📝 Sample posts:')
      samplePosts.docs.forEach((post, index) => {
        console.log(
          `${index + 1}. ID: ${post.id}, Title: "${post.title || 'NO TITLE'}", Slug: "${post.slug || 'NO SLUG'}"`,
        )
      })

      // Check for corrupted posts
      const corruptedPosts = samplePosts.docs.filter(
        (post) => !post.id || !post.title || post.title === '' || !post.slug || post.slug === '',
      )

      if (corruptedPosts.length > 0) {
        console.log(`\n⚠️  Found ${corruptedPosts.length} corrupted posts in sample`)
        corruptedPosts.forEach((post, index) => {
          console.log(
            `   ${index + 1}. ID: ${post.id}, Title: "${post.title || 'NO TITLE'}", Slug: "${post.slug || 'NO SLUG'}"`,
          )
        })
      }
    }

    // Check if there are any posts with empty IDs
    try {
      const allPosts = await payload.find({
        collection: 'posts',
        limit: 1000, // Get more posts to check
        depth: 0,
      })

      const emptyIdPosts = allPosts.docs.filter((post) => !post.id || post.id === '')
      console.log(`\n🔍 Posts with empty IDs: ${emptyIdPosts.length}`)

      if (emptyIdPosts.length > 0) {
        console.log('Empty ID posts:')
        emptyIdPosts.forEach((post, index) => {
          console.log(`   ${index + 1}. ID: "${post.id}", Title: "${post.title || 'NO TITLE'}"`)
        })
      }
    } catch (error) {
      console.log('❌ Error checking for empty ID posts:', error)
    }
  } catch (error) {
    console.error('❌ Error checking database:', error)
  }
}

checkDatabaseSource().catch(console.error)
