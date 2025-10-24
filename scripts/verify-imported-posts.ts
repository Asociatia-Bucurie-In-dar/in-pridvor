import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function verifyImportedPosts() {
  console.log('🔍 Verifying imported posts...\n')

  // Dynamically import payload after env vars are loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  // Initialize Payload
  const payload = await getPayload({ config })

  // Get the latest 39 posts (recently imported)
  const recentPosts = await payload.find({
    collection: 'posts',
    limit: 39,
    sort: '-createdAt',
    depth: 2, // Populate relationships
  })

  console.log(`📊 Found ${recentPosts.docs.length} recent posts\n`)

  let postsWithoutCategories = 0
  let postsWithoutAuthors = 0
  let postsWithHeroImage = 0

  for (const post of recentPosts.docs) {
    console.log(`\n📝 ${post.title}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Published: ${post.publishedAt}`)

    // Check categories
    if (post.categories && Array.isArray(post.categories) && post.categories.length > 0) {
      const categoryNames = post.categories
        .map((cat: any) => (typeof cat === 'object' ? cat.title : cat))
        .join(', ')
      console.log(`   ✅ Categories: ${categoryNames}`)
    } else {
      console.log(`   ⚠️  No categories assigned`)
      postsWithoutCategories++
    }

    // Check authors
    if (post.authors && Array.isArray(post.authors) && post.authors.length > 0) {
      const authorNames = post.authors
        .map((author: any) => (typeof author === 'object' ? author.name : author))
        .join(', ')
      console.log(`   ✅ Authors: ${authorNames}`)
    } else {
      console.log(`   ⚠️  No authors assigned`)
      postsWithoutAuthors++
    }

    // Check hero image
    if (post.heroImage) {
      console.log(`   ✅ Has hero image`)
      postsWithHeroImage++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 VERIFICATION SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total verified posts: ${recentPosts.docs.length}`)
  console.log(`Posts with categories: ${recentPosts.docs.length - postsWithoutCategories}`)
  console.log(`Posts without categories: ${postsWithoutCategories}`)
  console.log(`Posts with authors: ${recentPosts.docs.length - postsWithoutAuthors}`)
  console.log(`Posts without authors: ${postsWithoutAuthors}`)
  console.log(`Posts with hero images: ${postsWithHeroImage}`)
  console.log('='.repeat(60))

  if (postsWithoutCategories === 0 && postsWithoutAuthors === 0) {
    console.log('\n✅ All posts have proper categories and authors!')
  }
}

// Run verification
verifyImportedPosts()
  .then(() => {
    console.log('\n✅ Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Verification failed:', error)
    process.exit(1)
  })
