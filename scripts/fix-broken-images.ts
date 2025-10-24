// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function fixBrokenImages() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('=== ANALYZING POSTS WITH BROKEN IMAGES ===\n')

  // Get all posts with depth 2 to populate image data
  const posts = await payload.find({
    collection: 'posts',
    depth: 2,
    limit: 1000,
  })

  console.log(`Found ${posts.docs.length} total posts\n`)

  const brokenImagePosts = []
  const validImagePosts = []
  const noImagePosts = []

  for (const post of posts.docs) {
    const { title, heroImage, meta } = post
    const { image: metaImage } = meta || {}

    // Check if heroImage exists and is valid
    const hasValidHeroImage =
      heroImage &&
      typeof heroImage === 'object' &&
      heroImage.url &&
      heroImage.width &&
      heroImage.height

    // Check if metaImage exists and is valid
    const hasValidMetaImage =
      metaImage &&
      typeof metaImage === 'object' &&
      metaImage.url &&
      metaImage.width &&
      metaImage.height

    if (hasValidHeroImage) {
      validImagePosts.push({
        title,
        type: 'hero',
        url: heroImage.url,
      })
    } else if (hasValidMetaImage) {
      validImagePosts.push({
        title,
        type: 'meta',
        url: metaImage.url,
      })
    } else if (heroImage && typeof heroImage === 'object') {
      // This is a broken image - object exists but missing required properties
      brokenImagePosts.push({
        id: post.id,
        title,
        heroImage: heroImage,
        issue: 'Object exists but missing required properties',
      })
    } else {
      // No image at all
      noImagePosts.push({
        id: post.id,
        title,
        heroImage: heroImage,
        metaImage: metaImage,
      })
    }
  }

  console.log(`✅ Posts with valid images: ${validImagePosts.length}`)
  console.log(`❌ Posts with broken image objects: ${brokenImagePosts.length}`)
  console.log(`📭 Posts with no images: ${noImagePosts.length}\n`)

  if (brokenImagePosts.length > 0) {
    console.log('=== BROKEN IMAGE POSTS ===')
    brokenImagePosts.forEach((post, index) => {
      console.log(`${index + 1}. "${post.title}"`)
      console.log(`   Issue: ${post.issue}`)
      console.log(`   HeroImage data:`, JSON.stringify(post.heroImage, null, 2))
      console.log('')
    })
  }

  if (noImagePosts.length > 0) {
    console.log('=== POSTS WITH NO IMAGES ===')
    noImagePosts.slice(0, 10).forEach((post, index) => {
      console.log(`${index + 1}. "${post.title}"`)
      console.log(`   HeroImage: ${post.heroImage}`)
      console.log(`   MetaImage: ${post.metaImage}`)
      console.log('')
    })

    if (noImagePosts.length > 10) {
      console.log(`... and ${noImagePosts.length - 10} more posts with no images\n`)
    }
  }

  // Ask user what to do
  console.log('=== OPTIONS TO FIX ===')
  console.log('1. Remove broken image objects (set to null)')
  console.log('2. Try to find and fix broken image references')
  console.log('3. Just report - no changes')

  if (brokenImagePosts.length > 0) {
    console.log(
      `\nFound ${brokenImagePosts.length} posts with broken image objects that need fixing.`,
    )
    console.log('These posts will show "No Image" until fixed.')
  }
}

fixBrokenImages().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
