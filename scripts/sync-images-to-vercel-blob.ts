import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import fs from 'fs'
import path from 'path'

async function syncImagesToVercelBlob() {
  // Temporarily enable Vercel Blob
  process.env.ENABLE_VERCEL_BLOB = 'true'
  
  const payload = await getPayload({ config: configPromise })

  console.log('📤 Syncing local images to Vercel Blob...\n')

  // Get all media
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1000,
  })

  console.log(`Found ${allMedia.totalDocs} media files to sync`)

  const publicMediaPath = path.join(process.cwd(), 'public', 'media')

  let synced = 0
  let skipped = 0
  let failed = 0

  for (const media of allMedia.docs) {
    try {
      const filename = media.filename
      if (!filename) {
        console.log(`⏭️  Skipping ${media.id} - no filename`)
        skipped++
        continue
      }

      const localPath = path.join(publicMediaPath, filename)

      // Check if file exists locally
      if (!fs.existsSync(localPath)) {
        console.log(`⏭️  Skipping ${filename} - not found locally`)
        skipped++
        continue
      }

      console.log(`📤 Uploading ${filename}...`)

      // Read the local file
      const fileBuffer = fs.readFileSync(localPath)

      // Re-upload to trigger Vercel Blob storage
      await payload.update({
        collection: 'media',
        id: media.id,
        data: {
          alt: media.alt || '',
        },
        file: {
          data: fileBuffer,
          mimetype: media.mimeType || 'image/jpeg',
          name: filename,
          size: fileBuffer.length,
        },
      })

      console.log(`   ✅ Synced ${filename}`)
      synced++

      // Add a small delay to avoid hitting rate limits
      await new Promise((resolve) => setTimeout(resolve, 100))
    } catch (error) {
      console.error(`   ❌ Failed to sync ${media.filename}: ${error}`)
      failed++
    }
  }

  console.log('\n' + '='.repeat(50))
  console.log('✅ Sync completed!')
  console.log(`📤 Synced: ${synced}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('='.repeat(50))

  process.exit(0)
}

syncImagesToVercelBlob().catch((error) => {
  console.error('Sync failed:', error)
  process.exit(1)
})
