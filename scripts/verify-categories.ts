import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category } from '../src/payload-types'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function verifyCategories() {
  const payload = await getPayload({ config })

  console.log('🔍 Verifying category assignments...\n')

  // Get all posts with categories populated
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 1, // This will populate the category relationships
  })

  // Get all categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📊 Found ${posts.docs.length} posts and ${categories.docs.length} categories\n`)

  // Count posts per category
  const categoryCounts = new Map<string, { title: string; count: number }>()

  for (const category of categories.docs) {
    categoryCounts.set(category.id, { title: category.title, count: 0 })
  }

  let postsWithCategories = 0
  let postsWithoutCategories = 0

  for (const post of posts.docs) {
    if (post.categories && post.categories.length > 0) {
      postsWithCategories++

      for (const category of post.categories) {
        const categoryId = typeof category === 'string' ? category : category.id
        const categoryInfo = categoryCounts.get(categoryId)
        if (categoryInfo) {
          categoryInfo.count++
        }
      }
    } else {
      postsWithoutCategories++
    }
  }

  console.log('📊 CATEGORY POST COUNTS:')
  for (const [id, info] of categoryCounts) {
    console.log(`  ${info.title}: ${info.count} posts`)
  }

  console.log('\n📈 SUMMARY:')
  console.log(`  Total posts: ${posts.docs.length}`)
  console.log(`  Posts with categories: ${postsWithCategories}`)
  console.log(`  Posts without categories: ${postsWithoutCategories}`)
  console.log(`  Total categories: ${categories.docs.length}`)

  // Check for "Har peste Har" specifically
  const harPesteHarCategory = categories.docs.find((cat) =>
    cat.title.toLowerCase().includes('har peste har'),
  )

  if (harPesteHarCategory) {
    const harPesteHarCount = categoryCounts.get(harPesteHarCategory.id)?.count || 0
    console.log(`\n🎯 "Har peste Har" category: ${harPesteHarCount} posts`)
  }
}

// Run the verification
verifyCategories()
  .then(() => {
    console.log('\n✅ Verification complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error)
    process.exit(1)
  })
