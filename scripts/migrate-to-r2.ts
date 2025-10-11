import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

/**
 * Migration Script: Upload Local Images to Cloudflare R2
 * 
 * This script will:
 * 1. Connect to your Cloudflare R2 bucket
 * 2. Upload all 535 images from public/media/
 * 3. Update database URLs to point to R2
 * 4. Preserve all image metadata
 * 
 * Prerequisites:
 * - R2 credentials in .env file
 * - @aws-sdk/client-s3 installed (pnpm add @aws-sdk/client-s3)
 */

async function migrateToR2() {
  console.log('🚀 Starting migration to Cloudflare R2...\n')

  // Check environment variables
  const requiredEnvVars = [
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_ENDPOINT',
    'R2_BUCKET_NAME',
    'R2_PUBLIC_URL',
  ]

  const missingVars = requiredEnvVars.filter((v) => !process.env[v])
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:')
    missingVars.forEach((v) => console.error(`   - ${v}`))
    console.error('\nPlease add these to your .env file')
    process.exit(1)
  }

  // Initialize S3 client (R2 is S3-compatible)
  const s3Client = new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  })

  const payload = await getPayload({ config: configPromise })

  console.log('📋 Getting list of media files from database...\n')

  // Get all media from database
  const allMedia = await payload.find({
    collection: 'media',
    limit: 1000,
  })

  console.log(`Found ${allMedia.totalDocs} media records in database\n`)

  const mediaDir = path.resolve(process.cwd(), 'public/media')
  let uploaded = 0
  let skipped = 0
  let failed = 0

  for (const media of allMedia.docs) {
    const filename = media.filename
    if (!filename) {
      console.log(`⏭️  Skipping ${media.id} - no filename`)
      skipped++
      continue
    }

    const localPath = path.join(mediaDir, filename)

    // Check if file exists locally
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  File not found: ${filename}`)
      failed++
      continue
    }

    try {
      // Read file
      const fileBuffer = fs.readFileSync(localPath)
      const contentType = media.mimeType || 'application/octet-stream'

      // Upload to R2
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: filename,
          Body: fileBuffer,
          ContentType: contentType,
          // Make public readable
          ACL: 'public-read',
        }),
      )

      // Update database URL
      const newUrl = `${process.env.R2_PUBLIC_URL}/${filename}`

      await payload.update({
        collection: 'media',
        id: media.id,
        data: {
          url: newUrl,
        },
      })

      console.log(`✅ Uploaded: ${filename}`)
      uploaded++

      // Also upload all size variants
      if (media.sizes) {
        for (const sizeName of Object.keys(media.sizes)) {
          const size = media.sizes[sizeName]
          if (size.filename) {
            const sizePath = path.join(mediaDir, size.filename)
            if (fs.existsSync(sizePath)) {
              const sizeBuffer = fs.readFileSync(sizePath)
              await s3Client.send(
                new PutObjectCommand({
                  Bucket: process.env.R2_BUCKET_NAME!,
                  Key: size.filename,
                  Body: sizeBuffer,
                  ContentType: size.mimeType || contentType,
                  ACL: 'public-read',
                }),
              )
              console.log(`   ↳ ${sizeName}: ${size.filename}`)
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${filename}:`, error)
      failed++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary:')
  console.log('='.repeat(60))
  console.log(`✅ Uploaded: ${uploaded} images`)
  console.log(`⏭️  Skipped: ${skipped} images`)
  console.log(`❌ Failed: ${failed} images`)
  console.log('='.repeat(60))

  if (failed === 0) {
    console.log('\n🎉 Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('1. Update payload.config.ts to use R2 (see r2-config-template.ts)')
    console.log('2. Deploy to Vercel with R2 env variables')
    console.log('3. Test uploading new images in admin panel')
    console.log('4. Once verified, remove public/media/ from git')
  } else {
    console.log('\n⚠️  Migration completed with errors. Please review failed uploads.')
  }

  process.exit(failed === 0 ? 0 : 1)
}

migrateToR2()

