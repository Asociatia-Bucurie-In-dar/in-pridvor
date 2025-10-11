import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

// Helper to generate proper slug from title
function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      // Replace Romanian diacritics
      .replace(/ă/g, 'a')
      .replace(/â/g, 'a')
      .replace(/î/g, 'i')
      .replace(/ș/g, 's')
      .replace(/ț/g, 't')
      // Replace other common diacritics
      .replace(/[áàäâ]/g, 'a')
      .replace(/[éèëê]/g, 'e')
      .replace(/[íìïî]/g, 'i')
      .replace(/[óòöô]/g, 'o')
      .replace(/[úùüû]/g, 'u')
      .replace(/ñ/g, 'n')
      .replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '') // Remove remaining special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50)
  ) // Limit length
}

async function cleanupBadImports() {
  const payload = await getPayload({ config: configPromise })

  console.log('🧹 Cleaning up bad imports...\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
    sort: '-createdAt',
  })

  console.log(`Found ${posts.docs.length} posts\n`)

  // Find posts with bad slugs (date-based or very long)
  const badPosts = posts.docs.filter((post) => {
    const slug = post.slug
    // Check if slug is date-based or too long
    return (
      slug &&
      (/^\d{1,2}-[a-z]+-\d{4}/.test(slug) || // Date pattern like "27-aprilie-2025"
        slug.length > 60 || // Too long
        slug.includes('ziua-in-care') || // Contains date descriptions
        /^\d{4}-\d{2}-\d{2}/.test(slug)) // ISO date pattern
    )
  })

  console.log(`Found ${badPosts.length} posts with bad slugs:`)
  badPosts.forEach((post) => {
    console.log(`  • "${post.title}" → slug: "${post.slug}"`)
  })

  if (badPosts.length === 0) {
    console.log('✅ No bad posts found!')
    return
  }

  console.log('\n🗑️  Deleting bad posts...')
  let deletedCount = 0

  for (const post of badPosts) {
    try {
      await payload.delete({
        collection: 'posts',
        id: post.id,
        context: {
          disableRevalidate: true,
        },
      })
      console.log(`   ✅ Deleted: "${post.title}"`)
      deletedCount++
    } catch (error) {
      console.error(`   ❌ Failed to delete "${post.title}": ${error}`)
    }
  }

  console.log(`\n🗑️  Deleted ${deletedCount} bad posts`)

  // Clean up orphaned categories created during failed imports
  console.log('\n🧹 Cleaning up orphaned categories...')

  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
  })

  // Find categories that were created today (likely from failed imports)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const orphanedCategories = categories.docs.filter((cat) => {
    const createdDate = new Date(cat.createdAt)
    return createdDate >= today && !cat.parent // Top-level categories created today
  })

  console.log(`Found ${orphanedCategories.length} potentially orphaned categories:`)
  orphanedCategories.forEach((cat) => {
    console.log(`  • "${cat.title}" (created: ${new Date(cat.createdAt).toLocaleString()})`)
  })

  if (orphanedCategories.length > 0) {
    console.log('\n⚠️  These categories were likely created during failed imports.')
    console.log('You may want to review and delete them manually in the admin panel.')
  }

  console.log('\n✅ Cleanup completed!')
  process.exit(0)
}

cleanupBadImports().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
