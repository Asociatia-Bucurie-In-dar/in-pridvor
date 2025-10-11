import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function deleteOrphanedCategories() {
  const payload = await getPayload({ config: configPromise })
  
  console.log('🧹 Deleting orphaned categories...\n')
  
  // Get all categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
  })
  
  console.log(`Found ${categories.docs.length} total categories\n`)
  
  // Find categories that were created today (likely from failed imports)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const orphanedCategories = categories.docs.filter(cat => {
    const createdDate = new Date(cat.createdAt)
    return createdDate >= today && !cat.parent // Top-level categories created today
  })
  
  console.log(`Found ${orphanedCategories.length} orphaned categories created today:`)
  orphanedCategories.forEach(cat => {
    console.log(`  • "${cat.title}" (created: ${new Date(cat.createdAt).toLocaleString()})`)
  })
  
  if (orphanedCategories.length === 0) {
    console.log('✅ No orphaned categories found!')
    return
  }
  
  console.log('\n🗑️  Deleting orphaned categories...')
  let deletedCount = 0
  
  for (const category of orphanedCategories) {
    try {
      await payload.delete({
        collection: 'categories',
        id: category.id,
        context: {
          disableRevalidate: true,
        },
      })
      console.log(`   ✅ Deleted: "${category.title}"`)
      deletedCount++
    } catch (error) {
      console.error(`   ❌ Failed to delete "${category.title}": ${error}`)
    }
  }
  
  console.log(`\n🗑️  Deleted ${deletedCount} orphaned categories`)
  
  // Show remaining categories
  const remainingCategories = await payload.find({
    collection: 'categories',
    limit: 100,
  })
  
  console.log(`\n📁 Remaining categories: ${remainingCategories.docs.length}`)
  remainingCategories.docs.forEach(cat => {
    const parentInfo = cat.parent ? ` (parent: ${cat.parent})` : ' (top-level)'
    console.log(`  • "${cat.title}"${parentInfo}`)
  })
  
  console.log('\n✅ Cleanup completed!')
  process.exit(0)
}

deleteOrphanedCategories().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
