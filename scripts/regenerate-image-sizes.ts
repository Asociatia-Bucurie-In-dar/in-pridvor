#!/usr/bin/env tsx

/**
 * Regenerate image size variants for all media in R2
 * This will create thumbnail, small, medium, large, xlarge, and og sizes
 */

import { createRequire } from 'module'
import { config } from 'dotenv'

const require = createRequire(import.meta.url)

// Load environment variables
config()

async function regenerateImageSizes() {
  try {
    console.log('🔄 Regenerating image size variants...\n')

    const { getPayload } = await import('payload')
    const payloadConfig = await import('../src/payload.config.js')

    const payload = await getPayload({
      config: payloadConfig.default,
    })

    // Get all media records
    const { docs: mediaRecords } = await payload.find({
      collection: 'media',
      limit: 1000,
      where: {
        mime_type: {
          like: 'image/%',
        },
      },
    })

    console.log(`📁 Found ${mediaRecords.length} image records\n`)

    let processed = 0
    let skipped = 0
    let failed = 0

    for (const media of mediaRecords) {
      try {
        // Check if already has size variants
        if (media.sizes?.thumbnail || media.sizes?.small) {
          console.log(`⏭️  Skipping ${media.filename} (already has variants)`)
          skipped++
          continue
        }

        console.log(`🔄 Processing ${media.filename}...`)

        // Trigger regeneration by updating the record
        // This will cause Payload to regenerate all size variants
        await payload.update({
          collection: 'media',
          id: media.id,
          data: {
            // Triggering an update will regenerate sizes
            alt: media.alt || '',
          },
        })

        processed++
        console.log(`✅ Regenerated sizes for ${media.filename}`)
      } catch (error: any) {
        console.error(`❌ Failed to process ${media.filename}:`, error.message)
        failed++
      }
    }

    console.log('\n' + '='.repeat(50))
    console.log('📊 REGENERATION SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ Processed: ${processed}`)
    console.log(`⏭️  Skipped: ${skipped}`)
    console.log(`❌ Failed: ${failed}`)
    console.log()
  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

regenerateImageSizes()
