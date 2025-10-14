#!/usr/bin/env tsx

/**
 * Corrected Database URL Update Script
 * 
 * Updates all media URLs in the database to point to R2 instead of local storage
 * Handles the actual database schema with individual size columns
 */

import { createRequire } from 'module'
import { config } from 'dotenv'

const require = createRequire(import.meta.url)

// Load environment variables
config()

class CorrectedDatabaseUpdater {
  private r2PublicUrl: string
  private updatedCount = 0
  private errorCount = 0

  constructor() {
    this.r2PublicUrl = process.env.R2_PUBLIC_URL!
    
    if (!this.r2PublicUrl) {
      throw new Error('R2_PUBLIC_URL environment variable is required')
    }
  }

  async run() {
    console.log('🔄 Starting corrected database URL update...')
    console.log(`📦 R2 Public URL: ${this.r2PublicUrl}`)
    console.log('─'.repeat(50))

    try {
      // Use direct PostgreSQL connection
      const { Pool } = await import('pg')
      
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      console.log('📡 Connected to database')

      // Get all media records (including those with null URLs)
      const result = await pool.query(`
        SELECT id, filename, url, 
               sizes_thumbnail_url, sizes_square_url, sizes_small_url,
               sizes_medium_url, sizes_large_url, sizes_xlarge_url, sizes_og_url
        FROM media 
        WHERE filename IS NOT NULL
      `)

      console.log(`📁 Found ${result.rows.length} media records to check`)

      if (result.rows.length === 0) {
        console.log('✅ No media records found')
        await pool.end()
        return
      }

      // Update each media record
      for (const media of result.rows) {
        await this.updateMediaRecord(pool, media)
      }

      // Print summary
      this.printSummary()

      await pool.end()

    } catch (error) {
      console.error('❌ Database update failed:', error)
      process.exit(1)
    }
  }

  private async updateMediaRecord(pool: any, media: any) {
    try {
      const updates: any = {}
      let hasUpdates = false

      // Update main URL (handle null URLs by using filename)
      let newUrl = `${this.r2PublicUrl}/media/${media.filename}`
      
      if (!media.url || media.url !== newUrl) {
        updates.url = newUrl
        hasUpdates = true
        console.log(`📝 Updating URL: ${media.filename}`)
        console.log(`   Old: ${media.url || 'null'}`)
        console.log(`   New: ${newUrl}`)
      }

      // Update size variants (generate URLs based on filename patterns)
      const sizeFields = [
        'sizes_thumbnail_url',
        'sizes_square_url', 
        'sizes_small_url',
        'sizes_medium_url',
        'sizes_large_url',
        'sizes_xlarge_url',
        'sizes_og_url'
      ]

      // Extract base filename without extensions and size suffixes
      const baseFilename = media.filename.replace(/\.(jpg|jpeg|png|webp|gif)$/i, '')
      
      for (const sizeField of sizeFields) {
        const sizeName = sizeField.replace('sizes_', '').replace('_url', '')
        
        // Generate expected filename for this size
        let sizeFilename = baseFilename
        if (sizeName !== 'og') {
          sizeFilename = `${baseFilename}-${sizeName === 'thumbnail' ? '300x300' : 
            sizeName === 'square' ? '500x500' :
            sizeName === 'small' ? '600x' :
            sizeName === 'medium' ? '900x' :
            sizeName === 'large' ? '1400x' :
            sizeName === 'xlarge' ? '1920x' : sizeName}`
        }
        
        // Determine file extension
        const originalExt = media.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i)?.[1] || 'jpg'
        const ext = sizeName === 'og' ? 'jpg' : originalExt === 'jpg' ? 'webp' : originalExt
        
        const expectedFilename = `${sizeFilename}.${ext}`
        const newSizeUrl = `${this.r2PublicUrl}/media/${expectedFilename}`
        
        // Only update if the URL is different or null
        if (!media[sizeField] || media[sizeField] !== newSizeUrl) {
          updates[sizeField] = newSizeUrl
          hasUpdates = true
          console.log(`📝 Updating ${sizeName} size: ${media.filename} -> ${expectedFilename}`)
        }
      }

      // Update the record if there are changes
      if (hasUpdates) {
        const updateFields = []
        const updateValues = []
        let paramCount = 1

        // Add all update fields
        for (const [field, value] of Object.entries(updates)) {
          updateFields.push(`${field} = $${paramCount++}`)
          updateValues.push(value)
        }

        // Add ID for WHERE clause
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
  const updater = new CorrectedDatabaseUpdater()
  updater.run().catch((error) => {
    console.error('❌ Database update failed:', error)
    process.exit(1)
  })
}
