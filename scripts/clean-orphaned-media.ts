import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function cleanOrphanedMedia() {
  console.log('🧹 Finding orphaned media (not used in any posts)...\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get all media
  const allMedia = await payload.find({
    collection: 'media',
    limit: 2000,
    depth: 0,
  })

  console.log(`📊 Total media files: ${allMedia.docs.length}`)

  // Get all posts
  const allPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 1,
  })

  console.log(`📝 Total posts: ${allPosts.docs.length}`)

  // Collect all media IDs used in posts
  const usedMediaIds = new Set<string>()

  for (const post of allPosts.docs) {
    // Check hero image
    if (post.heroImage) {
      const heroId = typeof post.heroImage === 'object' ? post.heroImage.id : post.heroImage
      if (heroId) usedMediaIds.add(heroId)
    }

    // Check meta image
    if (post.meta?.image) {
      const metaId = typeof post.meta.image === 'object' ? post.meta.image.id : post.meta.image
      if (metaId) usedMediaIds.add(metaId)
    }
  }

  console.log(`📎 Media files used in posts: ${usedMediaIds.size}`)

  // Find orphaned media
  const orphanedMedia = allMedia.docs.filter((media) => !usedMediaIds.has(media.id))

  console.log(`🗑️  Orphaned media files: ${orphanedMedia.length}`)

  if (orphanedMedia.length === 0) {
    console.log('\n✅ No orphaned media to clean!')
    return
  }

  console.log('\n⚠️  Will delete orphaned media in 3 seconds...')
  await new Promise((resolve) => setTimeout(resolve, 3000))

  let deletedCount = 0

  for (const media of orphanedMedia) {
    try {
      await payload.delete({
        collection: 'media',
        id: media.id,
      })
      deletedCount++
      if (deletedCount % 10 === 0) {
        console.log(`   Deleted ${deletedCount}/${orphanedMedia.length} orphaned media...`)
      }
    } catch (error: any) {
      console.error(`   ❌ Error deleting media ${media.id}:`, error.message)
    }
  }

  console.log(`\n✅ Deleted ${deletedCount} orphaned media files`)
}

cleanOrphanedMedia()
  .then(() => {
    console.log('\n✅ Cleanup complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error)
    process.exit(1)
  })
