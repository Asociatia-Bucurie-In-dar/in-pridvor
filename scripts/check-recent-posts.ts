import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function checkRecentPosts() {
  console.log('🔍 Checking most recent posts by publication date...\n')

  // Dynamically import payload after env vars are loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  // Initialize Payload
  const payload = await getPayload({ config })

  // Get posts sorted by publishedAt date
  const recentPosts = await payload.find({
    collection: 'posts',
    limit: 10,
    sort: '-publishedAt', // Sort by publication date, newest first
    depth: 1,
  })

  console.log(`📊 Top 10 most recent posts by publishedAt:\n`)

  for (const post of recentPosts.docs) {
    console.log(`📝 ${post.title}`)
    console.log(`   Published: ${post.publishedAt}`)
    console.log(`   Created: ${post.createdAt}`)
    console.log(`   Slug: ${post.slug}`)
    console.log('')
  }

  // Also check posts created today
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const todayPosts = await payload.find({
    collection: 'posts',
    where: {
      createdAt: {
        greater_than_equal: today.toISOString(),
      },
    },
    sort: '-publishedAt',
    depth: 0,
  })

  console.log(`\n📅 Posts created today: ${todayPosts.docs.length}`)

  if (todayPosts.docs.length > 0) {
    console.log('\nTheir publication dates:')
    for (const post of todayPosts.docs) {
      console.log(`   - ${post.title}: ${post.publishedAt}`)
    }
  }
}

// Run check
checkRecentPosts()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error)
    process.exit(1)
  })
