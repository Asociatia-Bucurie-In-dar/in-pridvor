import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function fixMediaUrls() {
  const payload = await getPayload({ config: configPromise })

  console.log('🔧 Fixing media URLs to use /media/ instead of /api/media/file/...\n')

  // Get all media files
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1000,
  })

  console.log(`Found ${allMedia.totalDocs} media files to update\n`)

  let updated = 0
  let skipped = 0

  for (const media of allMedia.docs) {
    // Check if URL uses the API route
    if (media.url && media.url.includes('/api/media/file/')) {
      try {
        // Extract just the filename
        const filename = media.filename || media.url.split('/').pop()?.split('?')[0]
        
        if (filename) {
          // Update to use /media/ path
          const newUrl = `/media/${filename}`
          
          await payload.update({
            collection: 'media',
            id: media.id,
            data: {
              url: newUrl,
            },
          })

          console.log(`✅ Updated: ${media.filename} → ${newUrl}`)
          updated++
        } else {
          console.log(`⏭️  Skipped: ${media.id} - no filename`)
          skipped++
        }
      } catch (error) {
        console.error(`❌ Failed to update ${media.filename}: ${error}`)
      }
    } else {
      skipped++
    }
  }

  console.log(`\n✅ Fixed ${updated} media URLs`)
  console.log(`⏭️  Skipped ${skipped} files`)
  
  process.exit(0)
}

fixMediaUrls()

