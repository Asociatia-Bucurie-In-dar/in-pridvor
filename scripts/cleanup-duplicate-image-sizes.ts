import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function cleanupDuplicateImageSizes() {
  const payload = await getPayload({ config: configPromise })

  console.log('🧹 Cleaning up duplicate WordPress image sizes...\n')

  // Get all media
  const allMedia = await payload.find({
    collection: 'media',
    limit: 2000,
  })

  console.log(`Total media files: ${allMedia.totalDocs}`)

  // Group images by base name (removing size suffixes like -2, -3, etc.)
  const imageGroups = new Map<string, any[]>()

  for (const media of allMedia.docs) {
    const filename = media.filename || ''

    // Extract base name by removing WordPress size suffixes
    // e.g., "image-featured-3.jpg" -> "image-featured"
    // Pattern: filename can be like "slug-featured-3.jpg" or "slug-featured.jpg"
    const baseName = filename
      .replace(/-featured-\d+\./, '-featured.') // Remove -2, -3, etc. before extension
      .replace(/-\d+\./, '.') // Also catch any -2, -3 pattern
      .replace(/\.\w+$/, '') // Remove extension for grouping

    if (!imageGroups.has(baseName)) {
      imageGroups.set(baseName, [])
    }
    imageGroups.get(baseName)!.push(media)
  }

  // Find groups with duplicates
  const duplicateGroups: Array<{ baseName: string; files: any[] }> = []

  for (const [baseName, files] of imageGroups.entries()) {
    if (files.length > 1) {
      // Sort by file size (largest first) or by width if available
      files.sort((a, b) => {
        // Prefer images with dimensions
        if (a.width && b.width) {
          return b.width - a.width
        }
        // Otherwise sort by filesize
        if (a.filesize && b.filesize) {
          return b.filesize - a.filesize
        }
        return 0
      })

      duplicateGroups.push({ baseName, files })
    }
  }

  console.log(`\nFound ${duplicateGroups.length} image groups with duplicates`)

  if (duplicateGroups.length === 0) {
    console.log('✅ No duplicates to clean up!')
    process.exit(0)
  }

  // Show some examples
  console.log('\n📊 Examples of duplicate groups:')
  duplicateGroups.slice(0, 5).forEach((group) => {
    console.log(`\n  ${group.baseName}:`)
    group.files.forEach((file, idx) => {
      const sizeInfo = file.width ? `${file.width}x${file.height}` : 'unknown size'
      const keep = idx === 0 ? '✅ KEEP' : '🗑️  DELETE'
      console.log(
        `    ${keep} ${file.filename} (${sizeInfo}, ${Math.round(file.filesize / 1024)}KB)`,
      )
    })
  })

  console.log(
    `\n⚠️  Will delete ${duplicateGroups.reduce((sum, g) => sum + g.files.length - 1, 0)} duplicate images`,
  )
  console.log('⚠️  Will keep the largest/highest quality version of each image')

  // Get all posts to update their heroImage references
  const posts = await payload.find({
    collection: 'posts',
    limit: 1000,
  })

  console.log(`\n📝 Checking ${posts.totalDocs} posts for image references...`)

  let updatedPosts = 0
  let deletedImages = 0

  for (const group of duplicateGroups) {
    const keepFile = group.files[0] // Largest/best quality
    const deleteFiles = group.files.slice(1)

    // Update posts that reference any of the files to be deleted
    for (const post of posts.docs) {
      if (post.heroImage && typeof post.heroImage === 'object') {
        const currentImageId = post.heroImage.id

        // Check if this post uses any of the images we're about to delete
        const matchingDeleteFile = deleteFiles.find((f) => f.id === currentImageId)

        if (matchingDeleteFile) {
          console.log(`   Updating post "${post.title}" to use kept image`)

          await payload.update({
            collection: 'posts',
            id: post.id,
            data: {
              heroImage: keepFile.id,
            },
            context: {
              disableRevalidate: true,
            },
          })

          updatedPosts++
        }
      }
    }

    // Delete the duplicate files
    for (const deleteFile of deleteFiles) {
      try {
        await payload.delete({
          collection: 'media',
          id: deleteFile.id,
        })
        deletedImages++
      } catch (error) {
        console.error(`   ❌ Failed to delete ${deleteFile.filename}: ${error}`)
      }
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Cleanup completed!')
  console.log(`🗑️  Deleted: ${deletedImages} duplicate images`)
  console.log(`📝 Updated: ${updatedPosts} posts`)
  console.log(`💾 Kept: ${duplicateGroups.length} high-quality images`)
  console.log('='.repeat(50))

  const remaining = await payload.count({
    collection: 'media',
  })

  console.log(`\n📊 Final media count: ${remaining.totalDocs} files`)

  process.exit(0)
}

cleanupDuplicateImageSizes().catch((error) => {
  console.error('Cleanup failed:', error)
  process.exit(1)
})
