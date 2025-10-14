#!/usr/bin/env tsx

/**
 * Update Only Matching R2 Images Script
 *
 * Updates database records only for images that actually exist in R2
 * This prevents creating broken links for non-existent images
 */

import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { createRequire } from 'module'
import { config } from 'dotenv'

const require = createRequire(import.meta.url)

// Load environment variables
config()

class MatchingR2Updater {
  private r2PublicUrl: string
  private s3Client: S3Client
  private bucketName: string
  private updatedCount = 0
  private skippedCount = 0
  private errorCount = 0

  constructor() {
    this.r2PublicUrl = process.env.R2_PUBLIC_URL!
    this.bucketName = process.env.R2_BUCKET_NAME!

    if (!this.r2PublicUrl || !this.bucketName) {
      throw new Error('R2_PUBLIC_URL and R2_BUCKET_NAME environment variables are required')
    }

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT!,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    })
  }

  async run() {
    console.log('🔄 Starting matching R2 images update...')
    console.log(`📦 R2 Public URL: ${this.r2PublicUrl}`)
    console.log(`🪣 Bucket: ${this.bucketName}`)
    console.log('─'.repeat(50))

    try {
      // Get list of actual images in R2
      console.log('📋 Getting list of images in R2...')
      const r2Images = await this.getR2ImageList()
      console.log(`📁 Found ${r2Images.size} unique images in R2`)

      // Connect to database
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      console.log('📡 Connected to database')

      // Get all media records
      const result = await pool.query(`
        SELECT id, filename, url, 
               sizes_thumbnail_url, sizes_square_url, sizes_small_url,
               sizes_medium_url, sizes_large_url, sizes_xlarge_url, sizes_og_url
        FROM media 
        WHERE filename IS NOT NULL
        ORDER BY filename
      `)

      console.log(`📁 Found ${result.rows.length} media records in database`)

      // Update only records that match R2 images
      for (const media of result.rows) {
        await this.updateMatchingRecord(pool, media, r2Images)
      }

      // Print summary
      this.printSummary()

      await pool.end()
    } catch (error) {
      console.error('❌ Update failed:', error)
      process.exit(1)
    }
  }

  private async getR2ImageList(): Promise<Set<string>> {
    const images = new Set<string>()
    let continuationToken: string | undefined

    do {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: 'media/',
        ContinuationToken: continuationToken,
      })

      const result = await this.s3Client.send(command)

      if (result.Contents) {
        for (const obj of result.Contents) {
          if (obj.Key && obj.Key.startsWith('media/')) {
            const filename = obj.Key.replace('media/', '')
            images.add(filename)
          }
        }
      }

      continuationToken = result.NextContinuationToken
    } while (continuationToken)

    return images
  }

  private async updateMatchingRecord(pool: any, media: any, r2Images: Set<string>) {
    try {
      // Check if this image exists in R2
      if (!r2Images.has(media.filename)) {
        console.log(`⏭️  Skipping ${media.filename} (not in R2)`)
        this.skippedCount++
        return
      }

      const updates: any = {}
      let hasUpdates = false

      // Update main URL
      const newUrl = `${this.r2PublicUrl}/media/${media.filename}`

      if (!media.url || media.url !== newUrl) {
        updates.url = newUrl
        hasUpdates = true
        console.log(`📝 Updating URL: ${media.filename}`)
        console.log(`   Old: ${media.url || 'null'}`)
        console.log(`   New: ${newUrl}`)
      }

      // Update size variants (only if they exist in R2)
      const sizeFields = [
        'sizes_thumbnail_url',
        'sizes_square_url',
        'sizes_small_url',
        'sizes_medium_url',
        'sizes_large_url',
        'sizes_xlarge_url',
        'sizes_og_url',
      ]

      const baseFilename = media.filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '')

      for (const sizeField of sizeFields) {
        const sizeName = sizeField.replace('sizes_', '').replace('_url', '')

        // Generate expected filename for this size
        let sizeFilename = baseFilename
        if (sizeName !== 'og') {
          sizeFilename = `${baseFilename}-${
            sizeName === 'thumbnail'
              ? '300x300'
              : sizeName === 'square'
                ? '500x500'
                : sizeName === 'small'
                  ? '600x'
                  : sizeName === 'medium'
                    ? '900x'
                    : sizeName === 'large'
                      ? '1400x'
                      : sizeName === 'xlarge'
                        ? '1920x'
                        : sizeName
          }`
        }

        // Determine file extension
        const originalExt = media.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg'
        const ext = sizeName === 'og' ? 'jpg' : originalExt === 'jpg' ? 'webp' : originalExt

        const expectedFilename = `${sizeFilename}.${ext}`

        // Only update if this size variant exists in R2
        if (r2Images.has(expectedFilename)) {
          const newSizeUrl = `${this.r2PublicUrl}/media/${expectedFilename}`

          if (!media[sizeField] || media[sizeField] !== newSizeUrl) {
            updates[sizeField] = newSizeUrl
            hasUpdates = true
            console.log(`📝 Updating ${sizeName} size: ${expectedFilename}`)
          }
        }
      }

      // Update the record if there are changes
      if (hasUpdates) {
        const updateFields = []
        const updateValues = []
        let paramCount = 1

        for (const [field, value] of Object.entries(updates)) {
          updateFields.push(`${field} = $${paramCount++}`)
          updateValues.push(value)
        }

        updateValues.push(media.id)

        const updateQuery = `
          UPDATE media 
          SET ${updateFields.join(', ')}, updated_at = NOW()
          WHERE id = $${paramCount}
        `

        await pool.query(updateQuery, updateValues)

        this.updatedCount++
        console.log(`✅ Updated: ${media.filename}`)
      } else {
        console.log(`⏭️  No changes needed: ${media.filename}`)
        this.skippedCount++
      }
    } catch (error: any) {
      console.error(`❌ Failed to update ${media.filename}:`, error.message)
      this.errorCount++
    }
  }

  private printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 MATCHING R2 IMAGES UPDATE SUMMARY')
    console.log('='.repeat(50))
    console.log(`✅ Updated: ${this.updatedCount} records`)
    console.log(`⏭️  Skipped: ${this.skippedCount} records (not in R2 or no changes)`)
    console.log(`❌ Failed: ${this.errorCount} records`)

    if (this.updatedCount > 0) {
      console.log('\n🎉 Database URLs have been updated to point to R2!')
      console.log('\nNext steps:')
      console.log('1. Test image loading on your website')
      console.log('2. Test uploading new images in admin panel')
      console.log('3. Test deleting images in admin panel')
    }
  }
}

// Run update
if (import.meta.url === `file://${process.argv[1]}`) {
  const updater = new MatchingR2Updater()
  updater.run().catch((error) => {
    console.error('❌ Update failed:', error)
    process.exit(1)
  })
}
