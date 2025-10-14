/**
 * R2 Configuration Template
 * 
 * This file shows how to configure Payload CMS to use Cloudflare R2
 * for media storage instead of local storage.
 */

import { cloudStorage } from '@payloadcms/plugin-cloud-storage'
import { s3Adapter } from '@payloadcms/plugin-cloud-storage/s3'

// Add this to your payload.config.ts plugins array:
export const r2StoragePlugin = cloudStorage({
  collections: {
    media: {
      adapter: s3Adapter({
        config: {
          credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
          },
          region: 'auto', // R2 uses 'auto' region
          endpoint: process.env.R2_ENDPOINT || '',
        },
        bucket: process.env.R2_BUCKET_NAME || '',
      }),
      // Disable local storage to use only R2
      disableLocalStorage: true,
      // Allow public access to uploaded files
      disablePayloadAccessControl: true,
    },
  },
})

// Required environment variables:
/*
R2_ACCESS_KEY_ID="your_access_key_here"
R2_SECRET_ACCESS_KEY="your_secret_key_here"  
R2_ENDPOINT="https://xxxxx.r2.cloudflarestorage.com"
R2_BUCKET_NAME="in-pridvor-media"
R2_PUBLIC_URL="https://pub-xxxxx.r2.dev"
*/

// Example usage in payload.config.ts:
/*
import { r2StoragePlugin } from './scripts/r2-config-template'

export default buildConfig({
  // ... other config
  plugins: [
    ...plugins,
    r2StoragePlugin,
  ],
})
*/
