import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function checkMediaDuplicates() {
  const payload = await getPayload({ config: configPromise })

  console.log('🔍 Checking for duplicate media files...\n')

  // Get all media
  const allMedia = await payload.find({
    collection: 'media',
    limit: 2000,
  })

  console.log(`Total media files: ${allMedia.totalDocs}`)

  // Group by filename
  const fileMap = new Map<string, any[]>()

  for (const media of allMedia.docs) {
    const filename = media.filename || 'unknown'
    if (!fileMap.has(filename)) {
      fileMap.set(filename, [])
    }
    fileMap.get(filename)!.push(media)
  }

  // Find duplicates
  const duplicates: Array<{ filename: string; count: number; ids: string[] }> = []

  for (const [filename, files] of fileMap.entries()) {
    if (files.length > 1) {
      duplicates.push({
        filename,
        count: files.length,
        ids: files.map((f) => f.id),
      })
    }
  }

  console.log(`\n📊 Analysis:`)
  console.log(`  Unique files: ${fileMap.size}`)
  console.log(`  Duplicate files: ${duplicates.length}`)
  console.log(`  Total duplicates: ${allMedia.totalDocs - fileMap.size}`)

  if (duplicates.length > 0) {
    console.log(`\n⚠️  Found ${duplicates.length} files with duplicates:\n`)

    // Show top 20 duplicates
    const topDuplicates = duplicates.sort((a, b) => b.count - a.count).slice(0, 20)

    topDuplicates.forEach((dup) => {
      console.log(`  ${dup.filename}: ${dup.count} copies`)
    })

    if (duplicates.length > 20) {
      console.log(`\n  ... and ${duplicates.length - 20} more`)
    }

    // Calculate how many posts there are
    const posts = await payload.find({
      collection: 'posts',
      limit: 1,
    })

    console.log(`\n📝 Posts: ${posts.totalDocs}`)
    console.log(`🖼️  Media: ${allMedia.totalDocs}`)
    console.log(
      `📈 Ratio: ${(allMedia.totalDocs / posts.totalDocs).toFixed(1)} media files per post`,
    )

    console.log(`\n💡 Recommendation:`)
    console.log(
      `   Each post should have ~1 featured image, so we'd expect ~${posts.totalDocs} media files.`,
    )
    console.log(`   Having ${allMedia.totalDocs} media files suggests duplicates were created.`)
    console.log(`\n   Run the cleanup script to remove duplicates and keep only the first upload.`)
  } else {
    console.log('\n✅ No duplicates found!')
  }

  process.exit(0)
}

checkMediaDuplicates().catch((error) => {
  console.error('Check failed:', error)
  process.exit(1)
})
