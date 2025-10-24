// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function testR2Upload() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('Testing R2 upload...')

  // Create a simple test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  )

  try {
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: 'Test image',
      },
      file: {
        data: testImageBuffer,
        mimetype: 'image/png',
        name: 'test-image.png',
        size: testImageBuffer.byteLength,
      },
    })

    console.log('✅ Successfully uploaded test image!')
    console.log(`Media ID: ${media.id}`)
    console.log(`URL: ${media.url}`)
    console.log(`Filename: ${media.filename}`)

    // Test if the URL is accessible
    const response = await fetch(media.url)
    console.log(`URL accessible: ${response.ok ? '✅ Yes' : '❌ No'} (Status: ${response.status})`)
  } catch (error) {
    console.error('❌ Error uploading test image:', error)
  }

  process.exit(0)
}

testR2Upload().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
