// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

interface WordPressPost {
  title: string
  slug: string
  link: string
  pubDate: string
  creator: string
  guid: string
  content: string
  categories: string[]
  postType: string
  postId: string
  images: string[]
}

function extractPostsFromXML(xmlPath: string): WordPressPost[] {
  console.log('📖 Reading WordPress XML file...')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

  const posts: WordPressPost[] = []

  // Extract posts using regex
  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

  console.log(`📊 Found ${postMatches.length} items in XML file`)

  for (const postMatch of postMatches) {
    // Extract post type
    const postTypeMatch = postMatch.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/)
    if (!postTypeMatch || postTypeMatch[1] !== 'post') {
      continue // Skip non-post items
    }

    // Extract title
    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    if (!titleMatch) continue

    // Extract link
    const linkMatch = postMatch.match(/<link>(.*?)<\/link>/)
    if (!linkMatch) continue

    // Extract slug
    const slugMatch = postMatch.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)
    if (!slugMatch) continue

    // Extract publication date
    const pubDateMatch = postMatch.match(/<pubDate>(.*?)<\/pubDate>/)
    if (!pubDateMatch) continue

    // Extract creator
    const creatorMatch = postMatch.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)
    const creator = creatorMatch ? creatorMatch[1] : 'adminpdv'

    // Extract GUID
    const guidMatch = postMatch.match(/<guid isPermaLink="false">(.*?)<\/guid>/)
    if (!guidMatch) continue

    // Extract content
    const contentMatch = postMatch.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/,
    )
    const content = contentMatch ? contentMatch[1] : ''

    // Extract categories
    const categoryMatches =
      postMatch.match(
        /<category domain="category" nicename="[^"]*"><!\[CDATA\[(.*?)\]\]><\/category>/g,
      ) || []
    const categories = categoryMatches
      .map((match) => {
        const categoryMatch = match.match(/<!\[CDATA\[(.*?)\]\]>/)
        return categoryMatch ? categoryMatch[1] : ''
      })
      .filter(Boolean)

    // Extract post ID
    const postIdMatch = postMatch.match(/<wp:post_id>(.*?)<\/wp:post_id>/)
    const postId = postIdMatch ? postIdMatch[1] : ''

    // Extract images from content
    const imageMatches = content.match(/<img[^>]+src="([^"]+)"[^>]*>/g) || []
    const images = imageMatches
      .map((imgMatch) => {
        const srcMatch = imgMatch.match(/src="([^"]+)"/)
        return srcMatch ? srcMatch[1] : ''
      })
      .filter(Boolean)

    posts.push({
      title: titleMatch[1],
      slug: slugMatch[1],
      link: linkMatch[1],
      pubDate: pubDateMatch[1],
      creator,
      guid: guidMatch[1],
      content,
      categories,
      postType: 'post',
      postId,
      images,
    })
  }

  return posts
}

async function downloadAndUploadImage(imageUrl: string, payload: any): Promise<string | null> {
  try {
    console.log(`   📷 Downloading: ${imageUrl}`)

    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.log(`   ❌ Failed to download: ${response.status}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const filename = path.basename(new URL(imageUrl).pathname)

    console.log(`   📤 Uploading to R2: ${filename}`)

    const media = await payload.create({
      collection: 'media',
      data: {
        alt: filename.replace(/\.[^/.]+$/, ''), // Remove extension for alt text
      },
      file: {
        data: buffer,
        mimetype: response.headers.get('content-type') || 'image/jpeg',
        name: filename,
        size: buffer.byteLength,
      },
    })

    console.log(`   ✅ Uploaded: ${filename} (ID: ${media.id})`)
    return media.id
  } catch (error) {
    console.log(`   ❌ Error processing image ${imageUrl}:`, error)
    return null
  }
}

async function reUploadMissingImages() {
  console.log('🚀 Starting re-upload of missing images...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  // Extract posts from XML
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📝 Found ${xmlPosts.length} posts in XML file`)

  // Initialize Payload
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get all existing media files
  const existingMedia = await payload.find({
    collection: 'media',
    limit: 1000,
    depth: 0,
  })

  console.log(`📁 Found ${existingMedia.docs.length} existing media files in database`)

  // Collect all unique images from all posts
  const allImages = new Set<string>()
  for (const post of xmlPosts) {
    post.images.forEach((img) => allImages.add(img))
  }

  console.log(`🖼️  Found ${allImages.size} unique images in XML`)

  // Check which images are missing from R2
  const missingImages: string[] = []
  for (const imageUrl of allImages) {
    const filename = path.basename(new URL(imageUrl).pathname)
    const exists = existingMedia.docs.some((media) => media.filename === filename)

    if (exists) {
      // Check if it's actually accessible
      try {
        const media = existingMedia.docs.find((m) => m.filename === filename)
        if (media) {
          const response = await fetch(media.url)
          if (!response.ok) {
            console.log(`❌ Missing from R2: ${filename}`)
            missingImages.push(imageUrl)
          } else {
            console.log(`✅ Already in R2: ${filename}`)
          }
        }
      } catch (error) {
        console.log(`❌ Missing from R2: ${filename}`)
        missingImages.push(imageUrl)
      }
    } else {
      console.log(`❌ Not in database: ${filename}`)
      missingImages.push(imageUrl)
    }
  }

  console.log(`\n📊 Summary: ${missingImages.length} images need to be uploaded`)

  if (missingImages.length === 0) {
    console.log('🎉 All images are already uploaded!')
    return
  }

  // Upload missing images
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < missingImages.length; i++) {
    const imageUrl = missingImages[i]
    console.log(`\n📷 Processing ${i + 1}/${missingImages.length}: ${imageUrl}`)

    const mediaId = await downloadAndUploadImage(imageUrl, payload)
    if (mediaId) {
      successCount++
    } else {
      errorCount++
    }
  }

  console.log(`\n🎉 Upload complete!`)
  console.log(`✅ Successfully uploaded: ${successCount}`)
  console.log(`❌ Failed to upload: ${errorCount}`)

  process.exit(0)
}

reUploadMissingImages().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
