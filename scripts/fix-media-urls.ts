// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function fixMediaUrls() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('🔧 Fixing media URLs to use root level paths...')

  // Get all media files
  const result = await payload.find({
    collection: 'media',
    limit: 1000,
    depth: 0,
  })

  console.log(`📁 Found ${result.docs.length} media files to update`)

  let updatedCount = 0
  let errorCount = 0

  for (const media of result.docs) {
    try {
      // Check if URL contains /media/ path
      if (media.url && media.url.includes('/media/')) {
        const newUrl = media.url.replace('/media/', '/')

        console.log(`🔄 Updating: ${media.filename}`)
        console.log(`   Old URL: ${media.url}`)
        console.log(`   New URL: ${newUrl}`)

        await payload.update({
          collection: 'media',
          id: media.id,
          data: {
            url: newUrl,
          },
        })

        updatedCount++
      } else {
        console.log(`✅ Already correct: ${media.filename}`)
      }
    } catch (error) {
      console.error(`❌ Error updating ${media.filename}:`, error)
      errorCount++
    }
  }

  console.log(`\n🎉 URL fix complete!`)
  console.log(`✅ Updated: ${updatedCount}`)
  console.log(`❌ Errors: ${errorCount}`)

  process.exit(0)
}

fixMediaUrls().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
