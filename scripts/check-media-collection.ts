// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function checkMediaCollection() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('=== CHECKING MEDIA COLLECTION ===\n')
  
  const media = await payload.find({
    collection: 'media',
    limit: 20
  })

  console.log(`Found ${media.docs.length} media items (showing first 20):\n`)
  
  media.docs.forEach((item, index) => {
    console.log(`${index + 1}. ${item.filename || 'No filename'}`)
    console.log(`   URL: ${item.url || 'No URL'}`)
    console.log(`   ID: ${item.id}`)
    console.log(`   Alt: ${item.alt || 'No alt text'}`)
    console.log('')
  })

  // Check for specific image that should be linked to "Mai liberi" post
  console.log('=== LOOKING FOR "a2.jpg" (should be linked to "Mai liberi") ===\n')
  
  const a2Image = media.docs.find(item => 
    item.filename?.includes('a2') || 
    item.url?.includes('a2')
  )
  
  if (a2Image) {
    console.log('Found a2.jpg:')
    console.log(`   Filename: ${a2Image.filename}`)
    console.log(`   URL: ${a2Image.url}`)
    console.log(`   ID: ${a2Image.id}`)
  } else {
    console.log('a2.jpg NOT FOUND in media collection!')
    console.log('This explains why "Mai liberi" shows "No Image"')
  }

  process.exit(0)
}

checkMediaCollection().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
