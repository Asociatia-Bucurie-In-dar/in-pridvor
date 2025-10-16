import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category } from '../src/payload-types'
import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
require('dotenv').config()

interface WordPressPost {
  title: string
  slug: string
  categories: string[]
}

async function restoreCategoriesFromXML() {
  const payload = await getPayload({ config })

  console.log('🔄 Restoring categories from WordPress XML file...\n')

  // Read and parse the XML file
  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-15.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  console.log('📖 Reading WordPress XML file...')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

  // Parse posts from XML
  const posts: WordPressPost[] = []

  // Extract posts using regex (simple approach for this use case)
  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

  console.log(`📊 Found ${postMatches.length} posts in XML file`)

  for (const postMatch of postMatches) {
    // Extract title
    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    if (!titleMatch) continue

    // Extract slug
    const slugMatch = postMatch.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)
    if (!slugMatch) continue

    // Extract categories
    const categoryMatches =
      postMatch.match(
        /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([^\]]+)\]\]><\/category>/g,
      ) || []
    const categories = categoryMatches
      .map((cat) => {
        const match = cat.match(
          /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([^\]]+)\]\]><\/category>/,
        )
        return match ? match[2] : '' // Use the display name (CDATA content)
      })
      .filter((cat) => cat.length > 0)

    posts.push({
      title: titleMatch[1],
      slug: slugMatch[1],
      categories,
    })
  }

  console.log(`📝 Parsed ${posts.length} posts with categories`)

  // Get all current categories from the database
  const currentCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📂 Found ${currentCategories.docs.length} categories in database`)

  // Create a mapping of category names to IDs
  const categoryMap = new Map<string, string>()
  for (const category of currentCategories.docs) {
    categoryMap.set(category.title, category.id)
  }

  // Get all current posts
  const currentPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  console.log(`📰 Found ${currentPosts.docs.length} posts in database`)

  // Create a mapping of post slugs to database posts
  const postMap = new Map<string, Post>()
  for (const post of currentPosts.docs) {
    postMap.set(post.slug, post)
  }

  // Restore categories
  let restoredCount = 0
  let skippedCount = 0
  let notFoundCount = 0

  console.log('\n🔄 Restoring category assignments...')

  for (const xmlPost of posts) {
    const dbPost = postMap.get(xmlPost.slug)

    if (!dbPost) {
      console.log(`⚠️  Post not found in database: ${xmlPost.title} (${xmlPost.slug})`)
      notFoundCount++
      continue
    }

    // Map XML categories to database category IDs
    const categoryIds: string[] = []
    const missingCategories: string[] = []

    for (const categoryName of xmlPost.categories) {
      const categoryId = categoryMap.get(categoryName)
      if (categoryId) {
        categoryIds.push(categoryId)
      } else {
        missingCategories.push(categoryName)
      }
    }

    if (categoryIds.length === 0) {
      console.log(`⚠️  No valid categories found for: ${xmlPost.title}`)
      skippedCount++
      continue
    }

    try {
      await payload.update({
        collection: 'posts',
        id: dbPost.id,
        data: {
          categories: categoryIds,
          authors: dbPost.authors, // Preserve existing authors
        },
        context: {
          disableRevalidate: true,
        },
      })

      console.log(`✅ Restored: ${xmlPost.title} -> [${xmlPost.categories.join(', ')}]`)
      restoredCount++

      if (missingCategories.length > 0) {
        console.log(`   ⚠️  Missing categories: ${missingCategories.join(', ')}`)
      }
    } catch (error) {
      console.error(`❌ Failed to restore: ${xmlPost.title}`, error)
    }
  }

  // Final verification
  console.log('\n🔍 Final verification...')
  const finalPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 1,
  })

  const uncategorizedPosts = finalPosts.docs.filter(
    (post) => !post.categories || post.categories.length === 0,
  )

  console.log('\n📊 RESTORATION SUMMARY:')
  console.log(`  Posts processed: ${posts.length}`)
  console.log(`  Posts restored: ${restoredCount}`)
  console.log(`  Posts skipped: ${skippedCount}`)
  console.log(`  Posts not found: ${notFoundCount}`)
  console.log(`  Final uncategorized posts: ${uncategorizedPosts.length}`)

  if (uncategorizedPosts.length > 0) {
    console.log('\n📝 Remaining uncategorized posts:')
    uncategorizedPosts.forEach((post) => {
      console.log(`  - ${post.title} (${post.slug})`)
    })
  }

  console.log('\n✅ Category restoration complete!')
}

// Run the restoration
restoreCategoriesFromXML()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Restoration failed:', error)
    process.exit(1)
  })
