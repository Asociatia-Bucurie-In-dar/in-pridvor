#!/usr/bin/env tsx

/**
 * Migration script to upload all images from /public/media to Cloudflare R2
 * and update the database with new URLs
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { readdir, readFile, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables
require('dotenv').config()

// R2 Configuration
const r2Config = {
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
}

const bucketName = process.env.R2_BUCKET_NAME!
const publicUrl = process.env.R2_PUBLIC_URL!

// Initialize S3 client for R2
const s3Client = new S3Client(r2Config)

// Supported image formats
const supportedFormats = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']

interface UploadResult {
  localPath: string
  r2Path: string
  r2Url: string
  size: number
  success: boolean
  error?: string
}

class R2Migration {
  private results: UploadResult[] = []
  private totalFiles = 0
  private uploadedFiles = 0
  private skippedFiles = 0

  async run() {
    console.log('🚀 Starting R2 Migration...')
    console.log(`📦 Bucket: ${bucketName}`)
    console.log(`🌐 Public URL: ${publicUrl}`)
    console.log('─'.repeat(50))

    // Validate environment variables
    this.validateEnvironment()

    // Get all image files from public/media
    const mediaDir = join(process.cwd(), 'public', 'media')
    const imageFiles = await this.getImageFiles(mediaDir)

    this.totalFiles = imageFiles.length
    console.log(`📁 Found ${this.totalFiles} image files to migrate`)

    if (this.totalFiles === 0) {
      console.log('❌ No image files found in public/media')
      return
    }

    // Upload files to R2
    console.log('\n📤 Uploading files to R2...')
    for (const filePath of imageFiles) {
      await this.uploadFile(filePath, mediaDir)
    }

    // Print summary
    this.printSummary()

    // Save results to file
    await this.saveResults()

    console.log('\n✅ Migration completed!')
    console.log('\nNext steps:')
    console.log('1. Update payload.config.ts to use R2 storage')
    console.log('2. Test image upload/delete in admin panel')
    console.log('3. Verify images load on frontend')
    console.log('4. Run database update script if needed')
  }

  private validateEnvironment() {
    const required = [
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_ENDPOINT',
      'R2_BUCKET_NAME',
      'R2_PUBLIC_URL',
    ]

    for (const envVar of required) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`)
      }
    }

    console.log('✅ Environment variables validated')
  }

  private async getImageFiles(dir: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.getImageFiles(fullPath)
          files.push(...subFiles)
        } else if (entry.isFile()) {
          const ext = extname(entry.name).toLowerCase()
          if (supportedFormats.includes(ext)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      console.error(`❌ Error reading directory ${dir}:`, error)
    }

    return files
  }

  private async uploadFile(filePath: string, mediaDir: string): Promise<void> {
    try {
      const relativePath = filePath.replace(mediaDir + '/', '')
      const r2Key = `media/${relativePath}`
      const r2Url = `${publicUrl}/${r2Key}`

      // Check if file already exists in R2
      try {
        await s3Client.send(
          new HeadObjectCommand({
            Bucket: bucketName,
            Key: r2Key,
          }),
        )

        console.log(`⏭️  Skipped: ${relativePath} (already exists)`)
        this.skippedFiles++

        this.results.push({
          localPath: filePath,
          r2Path: r2Key,
          r2Url,
          size: 0,
          success: true,
        })

        return
      } catch (error: any) {
        // File doesn't exist, continue with upload
        if (error.name !== 'NotFound') {
          throw error
        }
      }

      // Read file content
      const fileContent = await readFile(filePath)
      const fileStats = await stat(filePath)

      // Upload to R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: r2Key,
          Body: fileContent,
          ContentType: this.getContentType(filePath),
          // Set cache headers for better performance
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      )

      console.log(`✅ Uploaded: ${relativePath} (${this.formatBytes(fileStats.size)})`)
      this.uploadedFiles++

      this.results.push({
        localPath: filePath,
        r2Path: r2Key,
        r2Url,
        size: fileStats.size,
        success: true,
      })
    } catch (error: any) {
      console.error(`❌ Failed: ${filePath} - ${error.message}`)
      this.results.push({
        localPath: filePath,
        r2Path: '',
        r2Url: '',
        size: 0,
        success: false,
        error: error.message,
      })
    }
  }

  private getContentType(filePath: string): string {
    const ext = extname(filePath).toLowerCase()

    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    }

    return contentTypes[ext] || 'application/octet-stream'
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  private printSummary() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 MIGRATION SUMMARY')
    console.log('='.repeat(50))
    console.log(`📁 Total files: ${this.totalFiles}`)
    console.log(`✅ Uploaded: ${this.uploadedFiles}`)
    console.log(`⏭️  Skipped: ${this.skippedFiles}`)
    console.log(`❌ Failed: ${this.totalFiles - this.uploadedFiles - this.skippedFiles}`)

    const successfulResults = this.results.filter((r) => r.success)
    const totalSize = successfulResults.reduce((sum, r) => sum + r.size, 0)
    console.log(`📦 Total size: ${this.formatBytes(totalSize)}`)

    console.log('\n🌐 Your images are now available at:')
    console.log(`   ${publicUrl}/media/`)
  }

  private async saveResults() {
    const resultsFile = join(process.cwd(), 'migration-results.json')
    const fs = await import('fs/promises')

    await fs.writeFile(
      resultsFile,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          config: {
            bucket: bucketName,
            publicUrl,
          },
          summary: {
            total: this.totalFiles,
            uploaded: this.uploadedFiles,
            skipped: this.skippedFiles,
            failed: this.totalFiles - this.uploadedFiles - this.skippedFiles,
          },
          results: this.results,
        },
        null,
        2,
      ),
    )

    console.log(`\n💾 Results saved to: migration-results.json`)
  }
}

// Run migration
if (import.meta.url === `file://${process.argv[1]}`) {
  const migration = new R2Migration()
  migration.run().catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
}
