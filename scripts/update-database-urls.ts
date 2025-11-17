#!/usr/bin/env tsx

/**
 * Database URL Update Script
 *
 * Updates all media URLs in the database to point to R2 instead of local storage
 * Run this AFTER the migration script has uploaded all images to R2
 */

import { createRequire } from 'module'
import { config } from 'dotenv'

const require = createRequire(import.meta.url)

// Load environment variables
config()

interface MediaRecord {
  id: string
  filename: string
  url: string
  sizes?: Record<string, { url: string }>
}

const normalizeURL = (urlString: string | undefined): string => {
  if (!urlString) return 'http://localhost:3000'
  if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
    return urlString
  }
  return `https://${urlString}`
}

class DatabaseUpdater {
  private r2PublicUrl: string
  private localMediaUrl: string
  private updatedCount = 0
  private errorCount = 0

  constructor() {
    this.r2PublicUrl = process.env.R2_PUBLIC_URL!
    this.localMediaUrl = normalizeURL(process.env.NEXT_PUBLIC_SERVER_URL)

    if (!this.r2PublicUrl) {
      throw new Error('R2_PUBLIC_URL environment variable is required')
    }
  }

  async run() {
    console.log('🔄 Starting database URL update...')
    console.log(`📦 R2 Public URL: ${this.r2PublicUrl}`)
    console.log(`🏠 Local URL: ${this.localMediaUrl}`)
    console.log('─'.repeat(50))

    try {
      // Initialize Payload
      const { getPayload } = await import('payload')
      const payload = await getPayload({
        config: await import('../src/payload.config.js').then((m) => m.default),
      })

      // Get all media records
      const mediaRecords = await payload.find({
        collection: 'media',
        limit: 1000, // Adjust if you have more than 1000 media items
        depth: 0,
      })

      console.log(`📁 Found ${mediaRecords.docs.length} media records to update`)

      if (mediaRecords.docs.length === 0) {
        console.log('✅ No media records found')
        return
      }

      // Update each media record
      for (const media of mediaRecords.docs) {
        await this.updateMediaRecord(payload, media)
      }

      // Print summary
      this.printSummary()
    } catch (error) {
      console.error('❌ Database update failed:', error)
      process.exit(1)
    }
  }

  private async updateMediaRecord(payload: any, media: any) {
    try {
      const updates: any = {}
      let hasUpdates = false

      // Update main URL
      if (media.url && media.url.includes('/media/')) {
        const filename = media.url.split('/').pop()
        const newUrl = `${this.r2PublicUrl}/media/${filename}`

        if (media.url !== newUrl) {
          updates.url = newUrl
          hasUpdates = true
          console.log(`📝 Updating URL: ${media.filename}`)
          console.log(`   Old: ${media.url}`)
          console.log(`   New: ${newUrl}`)
        }
      }

      // Update size variants
      if (media.sizes && typeof media.sizes === 'object') {
        updates.sizes = { ...media.sizes }

        for (const [sizeName, sizeData] of Object.entries(media.sizes)) {
          if (sizeData && typeof sizeData === 'object' && 'url' in sizeData) {
            const sizeUrl = (sizeData as any).url
            if (sizeUrl && sizeUrl.includes('/media/')) {
              const filename = sizeUrl.split('/').pop()
              const newSizeUrl = `${this.r2PublicUrl}/media/${filename}`

              if (sizeUrl !== newSizeUrl) {
                updates.sizes[sizeName] = {
                  ...sizeData,
                  url: newSizeUrl,
                }
                hasUpdates = true
                console.log(`📝 Updating ${sizeName} size: ${media.filename}`)
              }
            }
          }
        }
      }

      // Update the record if there are changes
      if (hasUpdates) {
        await payload.update({
          collection: 'media',
          id: media.id,
          data: updates,
        })

        this.updatedCount++
        console.log(`✅ Updated: ${media.filename}`)
      } else {
        console.log(`⏭️  No changes needed: ${media.filename}`)
      }
    } catch (error: any) {
      console.error(`❌ Failed to update ${media.filename}:`, error.message)
      this.errorCount++
    }
  }

  private printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 DATABASE UPDATE SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ Updated: ${this.updatedCount} records`)
    console.log(`❌ Failed: ${this.errorCount} records`)

    if (this.updatedCount > 0) {
      console.log('\n🎉 Database URLs have been updated to point to R2!')
      console.log('\nNext steps:')
      console.log('1. Test image loading on your website')
      console.log('2. Test uploading new images in admin panel')
      console.log('3. Test deleting images in admin panel')
      console.log('4. If everything works, remove local media files from git')
    }
  }
}

// Run database update
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new DatabaseUpdater()
  updater.run().catch((error) => {
    console.error('❌ Database update failed:', error)
    process.exit(1)
  })
}
