// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function checkHeroImages() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  // Get recent posts with depth 1 (what the frontend uses)
  const result1 = await payload.find({
    collection: 'posts',
    limit: 3,
    sort: '-publishedAt',
    depth: 1,
  })

  // Get recent posts with depth 2
  const result2 = await payload.find({
    collection: 'posts',
    limit: 3,
    sort: '-publishedAt',
    depth: 2,
  })

  console.log('=== DEPTH 1 (Current Frontend) ===\n')
  for (const post of result1.docs) {
    console.log(`Post: ${post.title}`)
    console.log(`Has heroImage: ${!!post.heroImage}`)
    console.log(`HeroImage type: ${typeof post.heroImage}`)

    if (post.heroImage && typeof post.heroImage === 'object') {
      console.log(`Image URL: ${post.heroImage.url || 'NO URL'}`)
      console.log(`Image has url property: ${post.heroImage.hasOwnProperty('url')}`)
    } else if (typeof post.heroImage === 'number') {
      console.log(`HeroImage is just an ID: ${post.heroImage}`)
    }
    console.log('')
  }

  console.log('\n=== DEPTH 2 ===\n')
  for (const post of result2.docs) {
    console.log(`Post: ${post.title}`)
    console.log(`Has heroImage: ${!!post.heroImage}`)
    console.log(`HeroImage type: ${typeof post.heroImage}`)

    if (post.heroImage && typeof post.heroImage === 'object') {
      console.log(`Image URL: ${post.heroImage.url || 'NO URL'}`)
      console.log(`Image has url property: ${post.heroImage.hasOwnProperty('url')}`)
    } else if (typeof post.heroImage === 'number') {
      console.log(`HeroImage is just an ID: ${post.heroImage}`)
    }
    console.log('')
  }

  process.exit(0)
}

checkHeroImages().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
