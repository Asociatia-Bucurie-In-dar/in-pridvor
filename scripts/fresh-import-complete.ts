// Load environment variables first
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const dotenv = require('dotenv')
dotenv.config()

import fs from 'fs'
import path from 'path'

// Function to extract posts from XML
function extractPostsFromXML(xmlContent: string) {
  const posts: any[] = []
  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

  for (const postMatch of postMatches) {
    // Extract title
    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    const title = titleMatch ? titleMatch[1] : ''

    // Extract slug
    const slugMatch = postMatch.match(/<wp:post_name><!\[CDATA\[(.*?)\]\]><\/wp:post_name>/)
    const slug = slugMatch ? slugMatch[1] : ''

    // Extract publication date
    const pubDateMatch = postMatch.match(/<pubDate>(.*?)<\/pubDate>/)
    const pubDate = pubDateMatch ? pubDateMatch[1] : ''

    // Extract creator
    const creatorMatch = postMatch.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)
    const creator = creatorMatch ? creatorMatch[1] : ''

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

    // Skip if not a post or if it's a draft/private
    const postTypeMatch = postMatch.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/)
    const postType = postTypeMatch ? postTypeMatch[1] : ''
    const statusMatch = postMatch.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/)
    const status = statusMatch ? statusMatch[1] : ''

    if (postType !== 'post' || status !== 'publish') {
      continue
    }

    // Extract images from content
    const imageMatches = content.match(/<img[^>]+src="([^"]+)"[^>]*>/g) || []
    const images = imageMatches
      .map((imgMatch) => {
        const srcMatch = imgMatch.match(/src="([^"]+)"/)
        return srcMatch ? srcMatch[1] : ''
      })
      .filter(Boolean)

    posts.push({
      title,
      slug,
      pubDate,
      creator,
      content,
      categories,
      postId,
      images,
    })
  }

  return posts
}

// Function to convert WordPress content to Lexical
function convertToLexical(content: string, imageMap: Map<string, string>) {
  // Replace image URLs with upload nodes
  let lexicalContent = content
  for (const [originalUrl, mediaId] of imageMap) {
    const filename = path.basename(new URL(originalUrl).pathname)
    lexicalContent = lexicalContent.replace(
      new RegExp(`src="${originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
      `src="${mediaId}"`,
    )
  }

  // Convert to basic Lexical format
  return {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: lexicalContent,
              type: 'text',
              version: 1,
            },
          ],
          direction: 'ltr',
          format: '',
          indent: 0,
          type: 'paragraph',
          version: 1,
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  }
}

// Function to download and upload image to R2
async function downloadAndUploadImage(imageUrl: string, payload: any) {
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
        alt: filename,
        filename: filename,
        mimeType: response.headers.get('content-type') || 'image/jpeg',
        url: `${process.env.R2_PUBLIC_URL}/${filename}`,
        width: 800, // Default values, will be updated by Payload
        height: 600,
        size: buffer.byteLength,
      },
      file: {
        data: buffer,
        name: filename,
        size: buffer.byteLength,
        mimetype: response.headers.get('content-type') || 'image/jpeg',
      },
      context: { disableRevalidate: true },
    })

    console.log(`   ✅ Uploaded: ${media.id}`)
    return media.id
  } catch (error) {
    console.log(`   ❌ Error uploading ${imageUrl}:`, error)
    return null
  }
}

async function freshImportComplete() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  const payload = await getPayload({ config })

  console.log('🚀 Starting fresh import of all posts and images...')

  // Read XML file
  const xmlPath = path.join(process.cwd(), 'inpridvor.WordPress.2025-10-23.xml')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

  // Extract posts
  const xmlPosts = extractPostsFromXML(xmlContent)
  console.log(`📄 Found ${xmlPosts.length} posts in XML`)

  // Get existing categories
  const existingCategories = await payload.find({
    collection: 'categories',
    limit: 1000,
  })
  const categoryMap = new Map(
    existingCategories.docs.map((cat: any) => [cat.title.toLowerCase(), cat.id]),
  )

  // Get existing users
  const existingUsers = await payload.find({
    collection: 'users',
    limit: 1000,
  })
  const userMap = new Map(existingUsers.docs.map((user: any) => [user.name, user.id]))

  // Sort posts by date (newest first)
  xmlPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  let importedCount = 0
  let skippedCount = 0

  for (let i = 0; i < xmlPosts.length; i++) {
    const post = xmlPosts[i]
    console.log(`\n📝 Processing ${i + 1}/${xmlPosts.length}: ${post.title}`)

    // Check if post already exists
    const existingPost = await payload.find({
      collection: 'posts',
      where: {
        slug: {
          equals: post.slug,
        },
      },
      limit: 1,
    })

    if (existingPost.docs.length > 0) {
      console.log(`   ⏭️  Skipping (already exists): ${post.slug}`)
      skippedCount++
      continue
    }

    // Download and upload images
    const imageMap = new Map<string, string>()
    for (const imageUrl of post.images) {
      const mediaId = await downloadAndUploadImage(imageUrl, payload)
      if (mediaId) {
        imageMap.set(imageUrl, mediaId)
      }
    }

    // Convert content to Lexical
    const lexicalContent = convertToLexical(post.content, imageMap)

    // Map categories
    const categoryIds = post.categories
      .map((cat: string) => categoryMap.get(cat.toLowerCase()))
      .filter(Boolean)

    // Get or create user
    let userId = userMap.get(post.creator)
    if (!userId) {
      // Create new user
      const newUser = await payload.create({
        collection: 'users',
        data: {
          name: post.creator,
          email: `${post.creator.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          password: 'temp123',
        },
        context: { disableRevalidate: true },
      })
      userId = newUser.id
      userMap.set(post.creator, userId)
    }

    // Set hero image (first image from content)
    let heroImageId = null
    if (imageMap.size > 0) {
      const firstImageUrl = Array.from(imageMap.keys())[0]
      heroImageId = imageMap.get(firstImageUrl)
    }

    // Create post
    try {
      const newPost = await payload.create({
        collection: 'posts',
        data: {
          title: post.title,
          slug: post.slug,
          publishedAt: new Date(post.pubDate).toISOString(),
          authors: [userId],
          categories: categoryIds,
          content: lexicalContent,
          heroImage: heroImageId,
          status: 'published',
        },
        context: { disableRevalidate: true },
      })

      console.log(`   ✅ Created: ${newPost.id}`)
      importedCount++
    } catch (error) {
      console.log(`   ❌ Error creating post:`, error)
    }
  }

  console.log(`\n🎉 Import complete!`)
  console.log(`   ✅ Imported: ${importedCount} posts`)
  console.log(`   ⏭️  Skipped: ${skippedCount} posts`)
  console.log(`   📷 Images uploaded to R2`)

  process.exit(0)
}

freshImportComplete().catch(console.error)
