// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

async function fixMissingFeaturedImages() {
  // Import payload after env is loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('=== ANALYZING MISSING FEATURED IMAGES ===\n')

  // Get all posts
  const posts = await payload.find({
    collection: 'posts',
    depth: 2,
    limit: 1000
  })

  // Get all media
  const media = await payload.find({
    collection: 'media',
    limit: 1000
  })

  console.log(`Found ${posts.docs.length} posts and ${media.docs.length} media items\n`)

  // Create a map of media by filename for easier lookup
  const mediaByFilename = new Map()
  const mediaByOriginalUrl = new Map()
  
  for (const item of media.docs) {
    if (item.filename) {
      mediaByFilename.set(item.filename, item)
    }
    if (item.url) {
      // Extract filename from URL
      const urlParts = item.url.split('/')
      const filename = urlParts[urlParts.length - 1]
      if (filename) {
        mediaByOriginalUrl.set(filename, item)
      }
    }
  }

  console.log(`Media lookup maps created:\n- By filename: ${mediaByFilename.size} items\n- By URL filename: ${mediaByOriginalUrl.size} items\n`)

  const postsWithoutImages = []
  const postsWithImages = []

  for (const post of posts.docs) {
    const { title, heroImage, slug } = post
    
    if (!heroImage) {
      postsWithoutImages.push({
        id: post.id,
        title,
        slug
      })
    } else {
      postsWithImages.push({
        id: post.id,
        title,
        slug,
        hasImage: true
      })
    }
  }

  console.log(`Posts without images: ${postsWithoutImages.length}`)
  console.log(`Posts with images: ${postsWithImages.length}\n`)

  if (postsWithoutImages.length > 0) {
    console.log('=== POSTS WITHOUT IMAGES ===')
    postsWithoutImages.slice(0, 10).forEach((post, index) => {
      console.log(`${index + 1}. "${post.title}" (${post.slug})`)
      
      // Try to find a matching image by slug or title
      const possibleMatches = []
      
      // Look for images that might match this post
      for (const [filename, mediaItem] of mediaByFilename) {
        if (filename.toLowerCase().includes(post.slug.toLowerCase()) ||
            post.title.toLowerCase().includes(filename.toLowerCase().replace(/\.(jpg|jpeg|png|webp)$/i, ''))) {
          possibleMatches.push({
            filename,
            url: mediaItem.url,
            id: mediaItem.id
          })
        }
      }
      
      if (possibleMatches.length > 0) {
        console.log(`   Possible matches:`)
        possibleMatches.forEach(match => {
          console.log(`   - ${match.filename} (ID: ${match.id})`)
        })
      } else {
        console.log(`   No obvious matches found`)
      }
      console.log('')
    })
    
    if (postsWithoutImages.length > 10) {
      console.log(`... and ${postsWithoutImages.length - 10} more posts without images\n`)
    }
  }

  console.log('=== NEXT STEPS ===')
  console.log('1. Check if images exist in media collection but aren\'t linked')
  console.log('2. Re-import missing images from WordPress XML')
  console.log('3. Manually assign images to posts')
  console.log('4. Use a default/placeholder image for posts without images')

  process.exit(0)
}

fixMissingFeaturedImages().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
