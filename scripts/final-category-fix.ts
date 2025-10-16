import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category } from '../src/payload-types'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

async function finalCategoryFix() {
  const payload = await getPayload({ config })

  console.log('🔧 Final category fix - Creating "Har peste Har" and assigning all posts...\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  console.log(`📊 Found ${posts.docs.length} posts\n`)

  // Find uncategorized posts
  const uncategorizedPosts = posts.docs.filter(
    (post) => !post.categories || post.categories.length === 0,
  )

  console.log(`📝 Found ${uncategorizedPosts.length} posts without categories\n`)

  // Create "Har peste Har" category
  console.log('🔄 Creating "Har peste Har" category...')
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

  console.log(`✅ Created category: ${newCategory.title} (${newCategory.id})\n`)

  // Assign all uncategorized posts to the new category
  console.log('📝 Assigning all uncategorized posts to "Har peste Har" category...')

  let assignedCount = 0
  for (const post of uncategorizedPosts) {
    try {
      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          categories: [newCategory.id],
          authors: post.authors, // Preserve existing authors
        },
        context: {
          disableRevalidate: true,
        },
      })
      assignedCount++

      if (assignedCount % 50 === 0) {
        console.log(`    Assigned ${assignedCount}/${uncategorizedPosts.length} posts...`)
      }
    } catch (error) {
      console.error(`    ❌ Failed to assign post "${post.title}":`, error)
    }
  }

  console.log(`✅ Successfully assigned ${assignedCount} posts to "Har peste Har" category\n`)

  // Final verification
  console.log('🔍 Final verification...')
  const finalPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  const finalUncategorized = finalPosts.docs.filter(
    (post) => !post.categories || post.categories.length === 0,
  )

  console.log(`📊 Final results:`)
  console.log(`  Total posts: ${finalPosts.docs.length}`)
  console.log(`  Posts without categories: ${finalUncategorized.length}`)
  console.log(`  Posts assigned to "Har peste Har": ${assignedCount}`)

  if (finalUncategorized.length === 0) {
    console.log('\n🎉 SUCCESS! All posts now have categories assigned!')
  } else {
    console.log(`\n⚠️  ${finalUncategorized.length} posts still without categories`)
  }
}

// Run the fix
finalCategoryFix()
  .then(() => {
    console.log('\n✅ Final category fix completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Final category fix failed:', error)
    process.exit(1)
  })
