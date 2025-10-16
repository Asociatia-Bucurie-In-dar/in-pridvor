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

function createSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/ă/g, 'a')
    .replace(/â/g, 'a')
    .replace(/î/g, 'i')
    .replace(/ș/g, 's')
    .replace(/ț/g, 't')
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
}

async function createMissingCategories() {
  const payload = await getPayload({ config })

  console.log('🔄 Creating missing categories from WordPress XML file...\n')

  // Read and parse the XML file
  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-15.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  console.log('📖 Reading WordPress XML file...')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

  // Extract all unique categories from XML
  const categoryMatches =
    xmlContent.match(
      /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([^\]]+)\]\]><\/category>/g,
    ) || []
  const uniqueCategories = new Set<string>()

  for (const match of categoryMatches) {
    const categoryMatch = match.match(
      /<category domain="category" nicename="([^"]+)"><!\[CDATA\[([^\]]+)\]\]><\/category>/,
    )
    if (categoryMatch) {
      uniqueCategories.add(categoryMatch[2]) // Use the display name (CDATA content)
    }
  }

  console.log(`📊 Found ${uniqueCategories.size} unique categories in XML file`)

  // Get existing categories
  const existingCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📂 Found ${existingCategories.docs.length} existing categories in database`)

  // Create a set of existing category names
  const existingCategoryNames = new Set(existingCategories.docs.map((cat) => cat.title))

  // Find missing categories
  const missingCategories = Array.from(uniqueCategories).filter(
    (catName) => !existingCategoryNames.has(catName),
  )

  console.log(`🆕 Found ${missingCategories.length} missing categories to create`)

  if (missingCategories.length === 0) {
    console.log('✅ All categories already exist!')
    return
  }

  // Create missing categories
  let createdCount = 0
  for (const categoryName of missingCategories) {
    try {
      const slug = createSlug(categoryName)

      await payload.create({
        collection: 'categories',
        data: {
          title: categoryName,
          slug: slug,
        },
        context: {
          disableRevalidate: true,
        },
      })

      console.log(`✅ Created category: ${categoryName} (${slug})`)
      createdCount++
    } catch (error) {
      console.error(`❌ Failed to create category "${categoryName}":`, error)
    }
  }

  console.log(`\n📊 Created ${createdCount} new categories`)

  // Now restore categories for existing posts
  console.log('\n🔄 Now restoring categories for existing posts...')

  // Parse posts from XML
  const posts: WordPressPost[] = []
  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

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

  // Get all current posts
  const currentPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  // Create a mapping of post slugs to database posts
  const postMap = new Map<string, Post>()
  for (const post of currentPosts.docs) {
    postMap.set(post.slug, post)
  }

  // Get all categories (including newly created ones)
  const allCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  // Create a mapping of category names to IDs
  const categoryMap = new Map<string, string>()
  for (const category of allCategories.docs) {
    categoryMap.set(category.title, category.id)
  }

  // Restore categories for posts that exist in both XML and database
  let restoredCount = 0
  let skippedCount = 0

  for (const xmlPost of posts) {
    const dbPost = postMap.get(xmlPost.slug)

    if (!dbPost) {
      // Post doesn't exist in database, skip
      continue
    }

    // Map XML categories to database category IDs
    const categoryIds: string[] = []

    for (const categoryName of xmlPost.categories) {
      const categoryId = categoryMap.get(categoryName)
      if (categoryId) {
        categoryIds.push(categoryId)
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
    } catch (error) {
      console.error(`❌ Failed to restore: ${xmlPost.title}`, error)
    }
  }

  console.log('\n📊 FINAL SUMMARY:')
  console.log(`  Categories created: ${createdCount}`)
  console.log(`  Posts restored: ${restoredCount}`)
  console.log(`  Posts skipped: ${skippedCount}`)
  console.log(`  Total categories now: ${allCategories.docs.length + createdCount}`)

  console.log('\n✅ Category creation and restoration complete!')
}

// Run the script
createMissingCategories()
  .then(() => {
    console.log('\n🎉 All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
