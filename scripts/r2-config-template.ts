/**
 * Cloudflare R2 Storage Configuration Template
 * 
 * This file shows how to configure @payloadcms/plugin-cloud-storage
 * with Cloudflare R2 for your Payload CMS project.
 * 
 * INSTRUCTIONS:
 * 1. Get your R2 credentials from Cloudflare dashboard
 * 2. Add them to your .env file
 * 3. This configuration will be automatically added to payload.config.ts
 */

import { cloudStorage } from '@payloadcms/plugin-cloud-storage'
import { s3Adapter } from '@payloadcms/plugin-cloud-storage/s3'

// Example configuration (will be added to payload.config.ts plugins array)
const r2StorageConfig = cloudStorage({
  collections: {
    media: {
      // Use S3 adapter (R2 is S3-compatible)
      adapter: s3Adapter({
        config: {
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
          region: 'auto', // R2 uses 'auto' for region
          endpoint: process.env.R2_ENDPOINT || '',
          // Force path style is required for R2
          forcePathStyle: false,
        },
        bucket: process.env.R2_BUCKET_NAME || '',
      }),
      // Disable local storage when using R2
      disableLocalStorage: true,
      // Disable Payload's API routes since R2 serves files directly
      disablePayloadAccessControl: true,
    },
  },
})

export default r2StorageConfig

/**
 * Required Environment Variables:
 * 
 * R2_ACCESS_KEY_ID=your_access_key_here
 * R2_SECRET_ACCESS_KEY=your_secret_key_here
 * R2_ENDPOINT=https://xxxxx.r2.cloudflarestorage.com
 * R2_BUCKET_NAME=in-pridvor-media
 * R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
 * 
 * Benefits of this setup:
 * - ✅ Images uploaded directly to Cloudflare R2
 * - ✅ Automatic optimization with Sharp (WebP, quality settings)
 * - ✅ Multiple image sizes generated automatically
 * - ✅ Global CDN delivery
 * - ✅ Full CRUD operations in production
 * - ✅ No Vercel deployment size limits
 * - ✅ Free tier: 10GB storage, 10M reads/month
 */

