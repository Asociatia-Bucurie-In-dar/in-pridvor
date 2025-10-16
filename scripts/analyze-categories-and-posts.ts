import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category } from '../src/payload-types'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

interface CategoryAnalysis {
  id: string
  title: string
  slug: string
  parent?: string
  hasDirectPosts: boolean
  hasChildCategories: boolean
  childCategories: string[]
  postCount: number
  isOrphaned: boolean
}

interface PostAnalysis {
  id: string
  title: string
  slug: string
  categories: string[]
  hasNoCategories: boolean
}

async function analyzeCategoriesAndPosts() {
  const payload = await getPayload({ config })

  console.log('🔍 Analyzing posts and categories...\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  // Get all categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📊 Found ${posts.docs.length} posts and ${categories.docs.length} categories\n`)

  // Analyze posts
  const postsAnalysis: PostAnalysis[] = posts.docs.map((post) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    categories: post.categories?.map((cat) => (typeof cat === 'string' ? cat : cat.id)) || [],
    hasNoCategories: !post.categories || post.categories.length === 0,
  }))

  // Analyze categories
  const categoriesAnalysis: CategoryAnalysis[] = categories.docs.map((category) => {
    const categoryPosts = postsAnalysis.filter((post) => post.categories.includes(category.id))

    const childCategories = categories.docs
      .filter(
        (cat) =>
          cat.parent === category.id ||
          (typeof cat.parent === 'object' && cat.parent?.id === category.id),
      )
      .map((cat) => cat.id)

    return {
      id: category.id,
      title: category.title,
      slug: category.slug,
      parent: typeof category.parent === 'string' ? category.parent : category.parent?.id,
      hasDirectPosts: categoryPosts.length > 0,
      hasChildCategories: childCategories.length > 0,
      childCategories,
      postCount: categoryPosts.length,
      isOrphaned: false, // Will be calculated later
    }
  })

  // Calculate if categories are orphaned
  categoriesAnalysis.forEach((category) => {
    const hasDirectOrIndirectPosts =
      category.hasDirectPosts ||
      category.childCategories.some((childId) => {
        const childCategory = categoriesAnalysis.find((cat) => cat.id === childId)
        return (
          childCategory?.hasDirectPosts ||
          childCategory?.childCategories.some((grandChildId) => {
            const grandChildCategory = categoriesAnalysis.find((cat) => cat.id === grandChildId)
            return grandChildCategory?.hasDirectPosts
          })
        )
      })

    category.isOrphaned = !hasDirectOrIndirectPosts
  })

  // Find posts with no categories
  const uncategorizedPosts = postsAnalysis.filter((post) => post.hasNoCategories)

  // Find "Har peste Har" related categories (potential clones)
  const harPesteHarCategories = categoriesAnalysis.filter(
    (cat) =>
      cat.title.toLowerCase().includes('har peste har') ||
      cat.slug.toLowerCase().includes('har-peste-har'),
  )

  // Find orphaned categories
  const orphanedCategories = categoriesAnalysis.filter((cat) => cat.isOrphaned)

  // Display results
  console.log('📝 POSTS WITH NO CATEGORIES:')
  if (uncategorizedPosts.length > 0) {
    uncategorizedPosts.forEach((post) => {
      console.log(`  - ${post.title} (${post.slug})`)
    })
  } else {
    console.log('  ✅ All posts have categories assigned')
  }

  console.log('\n🔍 "HAR PESTE HAR" CATEGORIES (potential clones):')
  if (harPesteHarCategories.length > 0) {
    harPesteHarCategories.forEach((cat) => {
      console.log(`  - ${cat.title} (${cat.slug}) - Posts: ${cat.postCount}`)
    })
  } else {
    console.log('  No "Har peste Har" categories found')
  }

  console.log('\n🗑️  ORPHANED CATEGORIES (no posts, no children with posts):')
  if (orphanedCategories.length > 0) {
    orphanedCategories.forEach((cat) => {
      const parentInfo = cat.parent
        ? ` (Parent: ${categoriesAnalysis.find((p) => p.id === cat.parent)?.title || 'Unknown'})`
        : ' (Root category)'
      console.log(`  - ${cat.title} (${cat.slug})${parentInfo}`)
    })
  } else {
    console.log('  ✅ No orphaned categories found')
  }

  console.log('\n📊 CATEGORY HIERARCHY SUMMARY:')
  categoriesAnalysis.forEach((cat) => {
    const parentInfo = cat.parent
      ? ` (Parent: ${categoriesAnalysis.find((p) => p.id === cat.parent)?.title || 'Unknown'})`
      : ' (Root)'
    const status = cat.isOrphaned ? '❌ ORPHANED' : '✅ ACTIVE'
    console.log(
      `  ${status} ${cat.title}${parentInfo} - Posts: ${cat.postCount}, Children: ${cat.childCategories.length}`,
    )
  })

  console.log('\n📈 SUMMARY:')
  console.log(`  Total posts: ${posts.docs.length}`)
  console.log(`  Total categories: ${categories.docs.length}`)
  console.log(`  Posts without categories: ${uncategorizedPosts.length}`)
  console.log(`  "Har peste Har" categories: ${harPesteHarCategories.length}`)
  console.log(`  Orphaned categories: ${orphanedCategories.length}`)

  return {
    postsAnalysis,
    categoriesAnalysis,
    uncategorizedPosts,
    harPesteHarCategories,
    orphanedCategories,
  }
}

// Run the analysis
analyzeCategoriesAndPosts()
  .then(() => {
    console.log('\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during analysis:', error)
    process.exit(1)
  })
