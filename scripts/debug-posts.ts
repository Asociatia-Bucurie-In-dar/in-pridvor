import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function debugPosts() {
  const payload = await getPayload({ config: configPromise })
  
  console.log('🔍 Debugging posts...\n')
  
  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    sort: '-createdAt',
  })
  
  console.log(`Found ${posts.docs.length} posts in database\n`)
  
  if (posts.docs.length === 0) {
    console.log('❌ NO POSTS FOUND! The import may have failed silently.')
    console.log('\nPossible issues:')
    console.log('1. Posts were created but failed validation')
    console.log('2. Database connection issues during import')
    console.log('3. Import script errors were caught but not reported')
    
    // Check if there are any posts in draft status
    const draftPosts = await payload.find({
      collection: 'posts',
      where: {
        _status: {
          equals: 'draft',
        },
      },
      limit: 1000,
    })
    
    console.log(`\nDraft posts: ${draftPosts.docs.length}`)
    
    if (draftPosts.docs.length > 0) {
      console.log('\nDraft posts found:')
      draftPosts.docs.forEach(post => {
        console.log(`  • ${post.title} (${post.slug}) - Status: ${post._status}`)
      })
    }
    
    process.exit(1)
  }
  
  console.log('📝 Recent posts:')
  posts.docs.slice(0, 10).forEach((post, i) => {
    console.log(`  ${i + 1}. ${post.title}`)
    console.log(`     Slug: ${post.slug}`)
    console.log(`     Status: ${post._status || 'published'}`)
    console.log(`     Created: ${new Date(post.createdAt).toLocaleString()}`)
    console.log(`     Categories: ${post.categories?.length || 0}`)
    console.log()
  })
  
  if (posts.docs.length > 10) {
    console.log(`... and ${posts.docs.length - 10} more posts`)
  }
  
  // Check categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
  })
  
  console.log(`\n📁 Categories: ${categories.docs.length}`)
  
  // Check media
  const media = await payload.find({
    collection: 'media',
    limit: 100,
  })
  
  console.log(`\n🖼️  Media files: ${media.docs.length}`)
  
  process.exit(0)
}

debugPosts().catch((error) => {
  console.error('Debug failed:', error)
  process.exit(1)
})
