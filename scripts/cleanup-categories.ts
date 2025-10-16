import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category } from '../src/payload-types'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

interface CleanupOptions {
  recreateHarPesteHar: boolean
  assignUncategorizedPosts: boolean
  deleteBadClones: boolean
  deleteOrphanedCategories: boolean
  dryRun: boolean
}

async function cleanupCategories(
  options: CleanupOptions = {
    recreateHarPesteHar: true,
    assignUncategorizedPosts: true,
    deleteBadClones: true,
    deleteOrphanedCategories: true,
    dryRun: true,
  },
) {
  const payload = await getPayload({ config })

  console.log('🧹 Starting category cleanup...\n')

  if (options.dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  }

  // Get all posts and categories
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📊 Found ${posts.docs.length} posts and ${categories.docs.length} categories\n`)

  // Find uncategorized posts
  const uncategorizedPosts = posts.docs.filter(
    (post) => !post.categories || post.categories.length === 0,
  )

  // Find "Har peste Har" categories
  const harPesteHarCategories = categories.docs.filter(
    (cat) =>
      cat.title.toLowerCase().includes('har peste har') ||
      cat.slug.toLowerCase().includes('har-peste-har'),
  )

  // Find orphaned categories (categories with no posts)
  const orphanedCategories = categories.docs.filter((category) => {
    const categoryPosts = posts.docs.filter((post) =>
      post.categories?.some((cat) => (typeof cat === 'string' ? cat : cat.id) === category.id),
    )
    return categoryPosts.length === 0
  })

  console.log('📋 CLEANUP PLAN:')
  console.log(`  • ${uncategorizedPosts.length} posts without categories`)
  console.log(
    `  • ${harPesteHarCategories.length} "Har peste Har" categories (potential duplicates)`,
  )
  console.log(`  • ${orphanedCategories.length} orphaned categories\n`)

  // Step 1: Handle "Har peste Har" categories
  if (options.recreateHarPesteHar && harPesteHarCategories.length > 0) {
    console.log('🔄 Step 1: Handling "Har peste Har" categories...')

    if (harPesteHarCategories.length === 2) {
      console.log('  Found 2 "Har peste Har" categories - these are likely duplicates')

      if (!options.dryRun) {
        // Delete both duplicates
        for (const category of harPesteHarCategories) {
          console.log(`    Deleting duplicate: ${category.title} (${category.id})`)
          await payload.delete({
            collection: 'categories',
            id: category.id,
            context: {
              disableRevalidate: true,
            },
          })
        }

        // Create the correct "Har peste Har" category
        console.log('    Creating correct "Har peste Har" category...')
        const newCategory = await payload.create({
          collection: 'categories',
          data: {
            title: 'Har peste Har',
            slug: 'har-peste-har',
          },
          context: {
            disableRevalidate: true,
          },
        })

        console.log(`    ✅ Created category: ${newCategory.title} (${newCategory.id})`)
      } else {
        console.log('    [DRY RUN] Would delete both duplicates and create correct category')
      }
    }
    console.log('')
  }

  // Step 2: Assign uncategorized posts to the correct category
  if (options.assignUncategorizedPosts && uncategorizedPosts.length > 0) {
    console.log('📝 Step 2: Assigning uncategorized posts...')

    if (!options.dryRun) {
      // Get the correct "Har peste Har" category (either newly created or existing)
      const correctCategory = await payload.find({
        collection: 'categories',
        where: {
          title: {
            equals: 'Har peste Har',
          },
        },
        limit: 1,
      })

      if (correctCategory.docs.length > 0) {
        const categoryId = correctCategory.docs[0].id

        for (const post of uncategorizedPosts) {
          console.log(`    Assigning post: ${post.title}`)
          await payload.update({
            collection: 'posts',
            id: post.id,
            data: {
              categories: [categoryId],
              authors: post.authors, // Preserve existing authors
            },
            context: {
              disableRevalidate: true,
            },
          })
        }

        console.log(
          `    ✅ Assigned ${uncategorizedPosts.length} posts to "Har peste Har" category`,
        )
      } else {
        console.log('    ❌ Could not find "Har peste Har" category to assign posts to')
      }
    } else {
      console.log(
        `    [DRY RUN] Would assign ${uncategorizedPosts.length} posts to "Har peste Har" category`,
      )
    }
    console.log('')
  }

  // Step 3: Delete bad clones (if any other duplicates exist)
  if (options.deleteBadClones) {
    console.log('🗑️  Step 3: Checking for other duplicate categories...')

    // Group categories by slug to find duplicates
    const categoriesBySlug = categories.docs.reduce(
      (acc, cat) => {
        if (!acc[cat.slug]) acc[cat.slug] = []
        acc[cat.slug].push(cat)
        return acc
      },
      {} as Record<string, Category[]>,
    )

    const duplicates = Object.entries(categoriesBySlug)
      .filter(([slug, cats]) => cats.length > 1)
      .filter(([slug]) => slug !== 'har-peste-har') // Already handled above

    if (duplicates.length > 0) {
      console.log(`  Found ${duplicates.length} sets of duplicate categories:`)

      for (const [slug, cats] of duplicates) {
        console.log(`    Slug "${slug}": ${cats.map((c) => c.title).join(', ')}`)

        if (!options.dryRun) {
          // Keep the first one, delete the rest
          const [keep, ...deleteThese] = cats
          console.log(`      Keeping: ${keep.title}`)

          for (const cat of deleteThese) {
            console.log(`      Deleting: ${cat.title} (${cat.id})`)
            await payload.delete({
              collection: 'categories',
              id: cat.id,
              context: {
                disableRevalidate: true,
              },
            })
          }
        }
      }
    } else {
      console.log('  ✅ No duplicate categories found')
    }
    console.log('')
  }

  // Step 4: Delete orphaned categories
  if (options.deleteOrphanedCategories && orphanedCategories.length > 0) {
    console.log('🗑️  Step 4: Deleting orphaned categories...')

    // Refresh categories list to get current state after previous deletions
    const refreshedCategories = await payload.find({
      collection: 'categories',
      limit: 1000,
      depth: 0,
    })

    // Filter out categories that have child categories
    const categoriesWithChildren = refreshedCategories.docs.filter((category) => {
      return refreshedCategories.docs.some(
        (child) =>
          child.parent === category.id ||
          (typeof child.parent === 'object' && child.parent?.id === category.id),
      )
    })

    // Find categories with no posts
    const categoriesWithoutPosts = refreshedCategories.docs.filter((category) => {
      const categoryPosts = posts.docs.filter((post) =>
        post.categories?.some((cat) => (typeof cat === 'string' ? cat : cat.id) === category.id),
      )
      return categoryPosts.length === 0
    })

    const trulyOrphaned = categoriesWithoutPosts.filter(
      (category) => !categoriesWithChildren.includes(category),
    )

    console.log(`  Found ${trulyOrphaned.length} truly orphaned categories (no posts, no children)`)

    if (!options.dryRun) {
      for (const category of trulyOrphaned) {
        console.log(`    Deleting: ${category.title} (${category.id})`)
        await payload.delete({
          collection: 'categories',
          id: category.id,
          context: {
            disableRevalidate: true,
          },
        })
      }
      console.log(`    ✅ Deleted ${trulyOrphaned.length} orphaned categories`)
    } else {
      console.log(`    [DRY RUN] Would delete ${trulyOrphaned.length} orphaned categories`)
    }
    console.log('')
  }

  console.log('✅ Cleanup complete!')

  if (options.dryRun) {
    console.log('\n💡 To execute the cleanup, run:')
    console.log('   npx tsx scripts/cleanup-categories.ts --execute')
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const execute = args.includes('--execute')
const skipHarPesteHar = args.includes('--skip-har-peste-har')
const skipAssignPosts = args.includes('--skip-assign-posts')
const skipDeleteClones = args.includes('--skip-delete-clones')
const skipDeleteOrphaned = args.includes('--skip-delete-orphaned')

const options: CleanupOptions = {
  recreateHarPesteHar: !skipHarPesteHar,
  assignUncategorizedPosts: !skipAssignPosts,
  deleteBadClones: !skipDeleteClones,
  deleteOrphanedCategories: !skipDeleteOrphaned,
  dryRun: !execute,
}

console.log('🎯 CATEGORY CLEANUP SCRIPT')
console.log('='.repeat(50))
console.log('Options:')
console.log(`  Execute: ${execute ? 'YES' : 'NO (dry run)'}`)
console.log(`  Recreate Har peste Har: ${options.recreateHarPesteHar}`)
console.log(`  Assign uncategorized posts: ${options.assignUncategorizedPosts}`)
console.log(`  Delete bad clones: ${options.deleteBadClones}`)
console.log(`  Delete orphaned categories: ${options.deleteOrphanedCategories}`)
console.log('')

// Run the cleanup
cleanupCategories(options)
  .then(() => {
    console.log('\n✅ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
