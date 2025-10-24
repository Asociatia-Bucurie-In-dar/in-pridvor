// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function checkMediaFiles() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  // Get all media files
  const result = await payload.find({
    collection: 'media',
    limit: 10,
    sort: '-createdAt',
  })

  console.log('Recent media files in database:\n')
  for (const media of result.docs) {
    console.log(`Filename: ${media.filename}`)
    console.log(`URL: ${media.url}`)
    console.log(`MIME: ${media.mimeType}`)
    console.log(`Size: ${media.filesize} bytes`)
    console.log('---')
  }

  process.exit(0)
}

checkMediaFiles().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
