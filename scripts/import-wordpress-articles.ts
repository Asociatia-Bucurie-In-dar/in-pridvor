import type { Post, Category, User, Media } from '../src/payload-types'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as https from 'https'
import * as http from 'http'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Load environment variables BEFORE importing payload config
require('dotenv').config()

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
  excerpt: string
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

    // Check if post is published
    const statusMatch = postMatch.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/)
    if (!statusMatch || statusMatch[1] !== 'publish') {
      continue // Skip non-published posts
    }

    // Extract title
    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    if (!titleMatch) continue

    // Extract link
    const linkMatch = postMatch.match(/<link>(.*?)<\/link>/)
    if (!linkMatch) continue

    // Extract pubDate
    const pubDateMatch = postMatch.match(/<pubDate>(.*?)<\/pubDate>/)
    if (!pubDateMatch) continue

    // Extract creator
    const creatorMatch = postMatch.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>/)
    if (!creatorMatch) continue

    // Extract guid
    const guidMatch = postMatch.match(/<guid isPermaLink="false">(.*?)<\/guid>/)
    if (!guidMatch) continue

    // Extract content
    const contentMatch = postMatch.match(
      /<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/,
    )
    if (!contentMatch) continue

    // Extract excerpt
    const excerptMatch = postMatch.match(
      /<excerpt:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/excerpt:encoded>/,
    )
    const excerpt = excerptMatch ? excerptMatch[1] : ''

    // Extract post ID
    const postIdMatch = postMatch.match(/<wp:post_id>(.*?)<\/wp:post_id>/)
    if (!postIdMatch) continue

    // Extract categories
    const categoryMatches =
      postMatch.match(
        /<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/g,
      ) || []
    const categories = categoryMatches
      .map((match) => {
        const catMatch = match.match(
          /<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/,
        )
        return catMatch ? catMatch[2] : ''
      })
      .filter((cat) => cat)

    // Extract images from content
    const imageMatches =
      contentMatch[1].match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp)/gi) || []
    const images = [...new Set(imageMatches)] // Remove duplicates

    // Generate slug from link
    const slug = linkMatch[1].replace('https://inpridvor.ro/', '').replace(/\/$/, '')

    posts.push({
      title: titleMatch[1],
      slug,
      link: linkMatch[1],
      pubDate: pubDateMatch[1],
      creator: creatorMatch[1],
      guid: guidMatch[1],
      content: contentMatch[1],
      excerpt,
      categories,
      postType: postTypeMatch[1],
      postId: postIdMatch[1],
      images,
    })
  }

  return posts
}

function parseHTMLToLexical(html: string, imageMap: Map<string, string>): any {
  // Replace old image URLs with new media IDs in the HTML first
  let processedHTML = html

  // Remove WordPress block comments
  processedHTML = processedHTML.replace(/<!-- wp:[^>]*?-->/g, '')
  processedHTML = processedHTML.replace(/<!-- \/wp:[^>]*?-->/g, '')

  // Parse HTML and convert to Lexical
  const children: any[] = []

  // Split by paragraph tags
  const paragraphs = processedHTML.split(/<\/?p[^>]*>/).filter((p) => p.trim())

  for (const para of paragraphs) {
    let paraText = para.trim()
    if (!paraText) continue

    // Handle images
    const imgMatch = paraText.match(/<img[^>]+src="([^"]+)"[^>]*>/i)
    if (imgMatch) {
      const imgUrl = imgMatch[0]
      const srcMatch = imgMatch[1]

      // Check if we have this image in our map
      const mediaId = imageMap.get(srcMatch)

      if (mediaId) {
        // Create an upload node (Lexical image block)
        children.push({
          type: 'upload',
          version: 1,
          relationTo: 'media',
          value: mediaId,
        })
      }

      // Remove the image tag from the text
      paraText = paraText.replace(/<img[^>]*>/gi, '')
    }

    // Clean HTML tags but preserve basic formatting
    paraText = paraText
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '$1')
      .replace(/<em>(.*?)<\/em>/gi, '$1')
      .replace(/<\/?[^>]+(>|$)/g, '') // Remove remaining HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#8222;/g, '„')
      .replace(/&#8221;/g, '"')
      .replace(/&#8220;/g, '"')
      .replace(/&#8211;/g, '–')
      .replace(/&#8230;/g, '…')
      .trim()

    if (!paraText) continue

    // Create paragraph node
    const textNodes: any[] = []

    // Check for italic and bold patterns
    const parts = paraText.split(/(<em>.*?<\/em>|<strong>.*?<\/strong>)/g)

    for (const part of parts) {
      if (!part) continue

      let format = 0
      let text = part

      if (part.startsWith('<em>')) {
        format |= 1 // Italic
        text = part.replace(/<\/?em>/g, '')
      }
      if (part.startsWith('<strong>')) {
        format |= 2 // Bold
        text = part.replace(/<\/?strong>/g, '')
      }

      textNodes.push({
        type: 'text',
        version: 1,
        text: text,
        format: format,
        mode: 'normal',
        style: '',
        detail: 0,
      })
    }

    children.push({
      type: 'paragraph',
      version: 1,
      children: textNodes,
      direction: 'ltr',
      format: '',
      indent: 0,
    })
  }

  return {
    root: {
      type: 'root',
      version: 1,
      children: children,
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }
}

async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http

    protocol
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          console.log(`   ⚠️  Failed to download image (status ${response.statusCode}): ${url}`)
          resolve(null)
          return
        }

        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', () => resolve(null))
      })
      .on('error', () => {
        console.log(`   ❌ Error downloading image: ${url}`)
        resolve(null)
      })
  })
}

async function uploadImageToPayload(imageUrl: string, payload: any): Promise<string | null> {
  try {
    // Check if already uploaded
    const existingMedia = await payload.find({
      collection: 'media',
      where: {
        alt: {
          equals: imageUrl,
        },
      },
      limit: 1,
      depth: 0,
    })

    if (existingMedia.docs.length > 0) {
      console.log(`   ✓ Image already exists: ${path.basename(imageUrl)}`)
      return existingMedia.docs[0].id
    }

    // Download the image
    const buffer = await downloadImage(imageUrl)
    if (!buffer) {
      return null
    }

    const filename = path.basename(new URL(imageUrl).pathname)

    // Determine mimetype
    let mimetype = 'image/jpeg'
    if (filename.endsWith('.png')) mimetype = 'image/png'
    else if (filename.endsWith('.gif')) mimetype = 'image/gif'
    else if (filename.endsWith('.webp')) mimetype = 'image/webp'

    // Upload to Payload
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: imageUrl, // Store original URL for deduplication
      },
      file: {
        data: buffer,
        mimetype: mimetype,
        name: filename,
        size: buffer.length,
      },
    })

    console.log(`   ✓ Uploaded image: ${filename} (ID: ${media.id})`)
    return media.id
  } catch (error) {
    console.log(`   ❌ Error uploading image ${imageUrl}:`, error)
    return null
  }
}

async function importWordPressArticles() {
  console.log('🚀 Starting WordPress article import...\n')

  // Verify environment variables are loaded
  if (!process.env.PAYLOAD_SECRET) {
    console.error('❌ PAYLOAD_SECRET environment variable is not set!')
    console.error('Please make sure the .env file exists and contains PAYLOAD_SECRET')
    process.exit(1)
  }

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  // Extract posts from XML
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📝 Found ${xmlPosts.length} published posts in XML file\n`)

  // Dynamically import payload after env vars are loaded
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')

  // Initialize Payload
  const payload = await getPayload({ config })

  // Get all existing posts to compare by slug
  const existingPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  console.log(`📊 Found ${existingPosts.docs.length} posts in database`)

  // Create a set of existing slugs for fast lookup
  const existingSlugs = new Set(existingPosts.docs.map((post) => post.slug))

  // Find posts that don't exist yet
  const newPosts = xmlPosts.filter((post) => !existingSlugs.has(post.slug))

  console.log(`🆕 Found ${newPosts.length} new posts to import\n`)

  if (newPosts.length === 0) {
    console.log('✅ No new posts to import! All XML posts already exist.')
    return
  }

  // Sort new posts by date (newest first) so latest articles appear first
  newPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  console.log(`📅 Date range of new posts:`)
  console.log(`   Newest: ${newPosts[0].pubDate} - ${newPosts[0].title}`)
  console.log(
    `   Oldest: ${newPosts[newPosts.length - 1].pubDate} - ${newPosts[newPosts.length - 1].title}`,
  )
  console.log(``)

  // Get categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📂 Found ${categories.docs.length} categories in database`)

  // Create category mapping
  const categoryMap = new Map<string, string>()
  for (const category of categories.docs) {
    categoryMap.set(category.title, category.id)
  }

  // Get users
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    depth: 0,
  })

  console.log(`👥 Found ${users.docs.length} users in database`)

  // Create user mapping
  const userMap = new Map<string, string>()
  if (users.docs.length > 0) {
    userMap.set('adminpdv', users.docs[0].id)
    userMap.set('admin', users.docs[0].id)
    if (users.docs.length > 1) {
      userMap.set('George Olteanu', users.docs[1].id)
    }
  }

  // Statistics
  let importedCount = 0
  let skippedCount = 0
  let errorCount = 0

  console.log('\n📥 Starting import process...\n')

  // Import posts
  for (const xmlPost of newPosts) {
    try {
      console.log(`\n📝 Processing: ${xmlPost.title}`)
      console.log(`   Slug: ${xmlPost.slug}`)

      // Map categories
      const categoryIds: string[] = []
      for (const categoryName of xmlPost.categories) {
        const categoryId = categoryMap.get(categoryName)
        if (categoryId) {
          categoryIds.push(categoryId)
        } else {
          console.log(`   ⚠️  Category not found: ${categoryName}`)
        }
      }

      // Map author
      let authorId = userMap.get(xmlPost.creator)
      if (!authorId) {
        console.log(`   ⚠️  Author "${xmlPost.creator}" not found, using first user`)
        authorId = users.docs[0].id
      }

      // Process images
      const imageMap = new Map<string, string>()

      if (xmlPost.images.length > 0) {
        console.log(`   🖼️  Processing ${xmlPost.images.length} images...`)

        for (const imageUrl of xmlPost.images) {
          const mediaId = await uploadImageToPayload(imageUrl, payload)
          if (mediaId) {
            imageMap.set(imageUrl, mediaId)
          }
        }
      }

      // Convert content to Lexical
      const lexicalContent = parseHTMLToLexical(xmlPost.content, imageMap)

      // Parse publication date
      const publishedAt = new Date(xmlPost.pubDate)

      // Get hero image (first image if available)
      let heroImageId: string | undefined
      if (xmlPost.images.length > 0 && imageMap.has(xmlPost.images[0])) {
        heroImageId = imageMap.get(xmlPost.images[0])
      }

      // Create the post
      const newPost = await payload.create({
        collection: 'posts',
        data: {
          title: xmlPost.title,
          slug: xmlPost.slug,
          content: lexicalContent,
          categories: categoryIds,
          authors: [authorId],
          publishedAt: publishedAt.toISOString(),
          heroImage: heroImageId,
          _status: 'published',
        },
        context: {
          disableRevalidate: true, // Disable Next.js revalidation during import
        },
      })

      console.log(`   ✅ Imported successfully (ID: ${newPost.id})`)
      importedCount++
    } catch (error: any) {
      console.error(`   ❌ Error importing post:`, error.message)
      errorCount++
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 IMPORT SUMMARY')
  console.log('='.repeat(60))
  console.log(`Total posts in XML: ${xmlPosts.length}`)
  console.log(`New posts found: ${newPosts.length}`)
  console.log(`Successfully imported: ${importedCount}`)
  console.log(`Errors: ${errorCount}`)
  console.log('='.repeat(60))

  if (importedCount > 0) {
    console.log('\n🎉 Import completed successfully!')
  }
}

// Run the import
importWordPressArticles()
  .then(() => {
    console.log('\n✅ Import process finished!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Fatal error during import:', error)
    process.exit(1)
  })
