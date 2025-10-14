#!/usr/bin/env tsx

/**
 * Simple Database URL Update Script
 * 
 * Updates all media URLs in the database to point to R2 instead of local storage
 * This version uses direct database connection to avoid payload config issues
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

class SimpleDatabaseUpdater {
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
    console.log('🔄 Starting simple database URL update...')
    console.log(`📦 R2 Public URL: ${this.r2PublicUrl}`)
    console.log('─'.repeat(50))

    try {
      // Use direct PostgreSQL connection
      const { Pool } = await import('pg')
      
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      console.log('📡 Connected to database')

      // Get all media records
      const result = await pool.query(`
        SELECT id, filename, url, sizes 
        FROM media 
        WHERE url IS NOT NULL
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
        let updatedSizes = { ...media.sizes }
        let sizesChanged = false
        
        for (const [sizeName, sizeData] of Object.entries(media.sizes)) {
          if (sizeData && typeof sizeData === 'object' && 'url' in sizeData) {
            const sizeUrl = (sizeData as any).url
            if (sizeUrl && sizeUrl.includes('/media/')) {
              const filename = sizeUrl.split('/').pop()
              const newSizeUrl = `${this.r2PublicUrl}/media/${filename}`
              
              if (sizeUrl !== newSizeUrl) {
                updatedSizes[sizeName] = {
                  ...sizeData,
                  url: newSizeUrl,
                }
                sizesChanged = true
                console.log(`📝 Updating ${sizeName} size: ${media.filename}`)
              }
            }
          }
        }
        
        if (sizesChanged) {
          updates.sizes = updatedSizes
          hasUpdates = true
        }
      }

      // Update the record if there are changes
      if (hasUpdates) {
        const updateFields = []
        const updateValues = []
        let paramCount = 1

        if (updates.url) {
          updateFields.push(`url = $${paramCount++}`)
          updateValues.push(updates.url)
        }

        if (updates.sizes) {
          updateFields.push(`sizes = $${paramCount++}`)
          updateValues.push(JSON.stringify(updates.sizes))
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
  const updater = new SimpleDatabaseUpdater()
  updater.run().catch((error) => {
    console.error('❌ Database update failed:', error)
    process.exit(1)
  })
}
