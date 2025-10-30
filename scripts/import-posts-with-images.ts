import { createRequire } from 'module'
const require = createRequire(import.meta.url)

require('dotenv').config()

import { getPayload } from 'payload'
import type { Post, Category, User, Media } from '../src/payload-types'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { formatSlug } from '../src/fields/slug/formatSlug'

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
      contentMatch[1].match(/https:\/\/inpridvor\.ro\/wp-content\/uploads\/[^"'\s]+/g) || []
    const images = [...new Set(imageMatches)] // Remove duplicates

    // Generate slug from link
    const slug = linkMatch[1].replace('https://inpridvor.ro/', '').replace('/', '')

    posts.push({
      title: titleMatch[1],
      slug,
      link: linkMatch[1],
      pubDate: pubDateMatch[1],
      creator: creatorMatch[1],
      guid: guidMatch[1],
      content: contentMatch[1],
      categories,
      postType: postTypeMatch[1],
      postId: postIdMatch[1],
      images,
    })
  }

  return posts
}

function convertWordPressContentToLexical(
  content: string,
  imageMap: Map<string, { mediaId: string | number; r2Url: string }>,
) {
  // Convert WordPress Gutenberg blocks to Lexical format
  let processedContent = content

  // Replace image URLs with R2 URLs
  for (const [oldUrl, imageData] of imageMap) {
    processedContent = processedContent.replace(
      new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
      imageData.r2Url,
    )
  }

  // Remove WordPress block comments
  processedContent = processedContent.replace(/<!-- wp:[^>]*?-->/g, '')
  processedContent = processedContent.replace(/<!-- \/wp:[^>]*?-->/g, '')

  // Convert HTML to Lexical format using htmlToLexical
  // This function already extracts YouTube/Vimeo URLs and converts them to video embed blocks
  const { htmlToLexical } = require('../src/utilities/htmlToLexical')
  const lexicalContent = htmlToLexical(processedContent)

  return lexicalContent
}

async function downloadAndUploadImage(
  imageUrl: string,
  payload: any,
): Promise<{ mediaId: string | number; r2Url: string } | null> {
  try {
    const filename = path.basename(new URL(imageUrl).pathname)
    const filenameBase = filename.replace(/\.[^/.]+$/, '')
    
    // Check if image already exists in database by filename (R2 might have different extension)
    const existingMedia = await payload.find({
      collection: 'media',
      where: {
        or: [
          {
            filename: {
              equals: filename,
            },
          },
          {
            filename: {
              contains: filenameBase,
            },
          },
        ],
      },
      limit: 1,
      depth: 0,
    })

    if (existingMedia.docs.length > 0) {
      const media = existingMedia.docs[0]
      const r2Url = media.url || `${process.env.R2_PUBLIC_URL}/${media.filename}`
      console.log(`   📷 Image already exists: ${filename} → ${r2Url}`)
      return {
        mediaId: media.id,
        r2Url: r2Url,
      }
    }

    // Download image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      console.log(`   ⚠️  Failed to download image: ${imageUrl}`)
      return null
    }

    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/jpeg'

    // Upload to Payload (which will automatically upload to R2 if configured)
    const media = await payload.create({
      collection: 'media',
      data: {
        alt: filenameBase,
      },
      file: {
        data: Buffer.from(buffer),
        mimetype: contentType,
        name: filename,
        size: buffer.byteLength,
      },
    })

    // Get the R2 URL from the media object
    const r2Url = media.url || `${process.env.R2_PUBLIC_URL}/${media.filename}`
    
    console.log(`   📷 Uploaded image: ${filename} (ID: ${media.id}) → ${r2Url}`)
    return {
      mediaId: media.id,
      r2Url: r2Url,
    }
  } catch (error) {
    console.log(`   ❌ Error processing image ${imageUrl}:`, error)
    return null
  }
}

async function importPostsWithImages() {
  console.log('🚀 Starting import of posts with images from WordPress XML...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-24.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  // Extract posts from XML
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📝 Found ${xmlPosts.length} posts in XML file`)

  // Initialize Payload with dynamic import to ensure dotenv loads first
  const config = await import('../src/payload.config')
  const payload = await getPayload({ config: config.default })

  // Get existing users to map authors
  const users = await payload.find({
    collection: 'users',
    limit: 1000,
    depth: 0,
  })

  console.log(`👥 Found ${users.docs.length} users in database`)

  // Get existing categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 1000,
    depth: 0,
  })

  console.log(`📂 Found ${categories.docs.length} categories in database`)

  // Create category mapping by slug (fuzzy matching)
  const categoryMapBySlug = new Map<string, { id: number | string; title: string; slug: string }>()
  const categoryMapByTitle = new Map<string, { id: number | string; title: string; slug: string }>()
  const createdCategoriesInSession = new Map<string, number | string>() // category title -> id

  for (const category of categories.docs) {
    const slug = category.slug || formatSlug(category.title)
    const categoryId = typeof category.id === 'number' ? category.id : category.id.toString()

    categoryMapBySlug.set(slug.toLowerCase().trim(), {
      id: categoryId,
      title: category.title,
      slug: slug,
    })

    // Also map by title for exact matches
    categoryMapByTitle.set(category.title.toLowerCase().trim(), {
      id: categoryId,
      title: category.title,
      slug: slug,
    })
  }

  console.log(`📋 Created category maps: ${categoryMapBySlug.size} by slug, ${categoryMapByTitle.size} by title`)

  // Helper function to create a new category
  async function getOrCreateCategory(
    categoryName: string,
  ): Promise<number | string | null> {
    if (!categoryName || typeof categoryName !== 'string') {
      return null
    }

    const categorySlug = formatSlug(categoryName).toLowerCase().trim()

    // First check if we just created it in this session
    if (createdCategoriesInSession.has(categoryName)) {
      return createdCategoriesInSession.get(categoryName)!
    }

    // Try slug match FIRST (since XML often gives us slugs/nice names)
    let matchingCategory = categoryMapBySlug.get(categorySlug)

    // If not found by slug, try exact title match
    if (!matchingCategory) {
      matchingCategory = categoryMapByTitle.get(categoryName.toLowerCase().trim())
    }

    if (matchingCategory) {
      return matchingCategory.id
    }

    // Category doesn't exist - create it
    try {
      console.log(`   ➕ Creating new category: "${categoryName}" (slug: "${categorySlug}")`)
      const newCategory = await payload.create({
        collection: 'categories',
        data: {
          title: categoryName,
        },
      })

      const newCategoryId =
        typeof newCategory.id === 'number'
          ? newCategory.id
          : parseInt(String(newCategory.id), 10)

      if (!isNaN(newCategoryId)) {
        const newCategorySlug = newCategory.slug || formatSlug(categoryName)

        // Add to maps for future matches in this session
        categoryMapBySlug.set(newCategorySlug.toLowerCase().trim(), {
          id: newCategoryId,
          title: categoryName,
          slug: newCategorySlug,
        })
        categoryMapByTitle.set(categoryName.toLowerCase().trim(), {
          id: newCategoryId,
          title: categoryName,
          slug: newCategorySlug,
        })
        createdCategoriesInSession.set(categoryName, newCategoryId)

        console.log(`   ✅ Created category: "${categoryName}" (ID: ${newCategoryId})`)
        return newCategoryId
      }
    } catch (error: any) {
      console.error(`   ❌ Failed to create category "${categoryName}":`, error.message)
      return null
    }

    return null
  }

  // Create user mapping
  const userMap = new Map<string, string>()
  if (users.docs.length > 0) {
    userMap.set('adminpdv', users.docs[0].id)
    if (users.docs.length > 1) {
      userMap.set('George Olteanu', users.docs[1].id)
    }
  }

  // Collect all unique images from all posts
  const allImages = new Set<string>()
  for (const post of xmlPosts) {
    post.images.forEach((img) => allImages.add(img))
  }

  console.log(`🖼️  Found ${allImages.size} unique images to process`)

  // Download and upload images to R2
  const imageMap = new Map<string, { mediaId: string | number; r2Url: string }>() // old URL -> {mediaId, r2Url}
  let imageCount = 0

  console.log(`\n🖼️  Uploading images to R2 bucket...\n`)
  
  for (const imageUrl of allImages) {
    console.log(`📷 Processing image ${++imageCount}/${allImages.size}: ${imageUrl}`)
    const imageData = await downloadAndUploadImage(imageUrl, payload)
    if (imageData) {
      imageMap.set(imageUrl, imageData)
    }
  }
  
  console.log(`\n✅ Processed ${imageMap.size}/${allImages.size} images to R2\n`)

  let importedCount = 0
  let skippedCount = 0
  let errorCount = 0

  console.log('\n📥 Starting post import process...\n')

  for (const xmlPost of xmlPosts) {
    try {
      // Check if post already exists
      const existingPost = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: xmlPost.slug,
          },
        },
        limit: 1,
        depth: 0,
      })

      if (existingPost.docs.length > 0) {
        console.log(`⏭️  Skipping existing post: ${xmlPost.title}`)
        skippedCount++
        continue
      }

      // Map categories using fuzzy slug matching (with auto-creation)
      const categoryIds: (number | string)[] = []

      for (const categoryName of xmlPost.categories) {
        const categoryId = await getOrCreateCategory(categoryName)
        if (categoryId) {
          categoryIds.push(categoryId)
        } else {
          console.log(`   ⚠️  Failed to get/create category: "${categoryName}"`)
        }
      }

      if (categoryIds.length === 0 && xmlPost.categories.length > 0) {
        console.log(`   ⚠️  Post "${xmlPost.title}" has NO categories assigned`)
      }

      // Map author
      const authorId = userMap.get(xmlPost.creator)
      if (!authorId) {
        console.log(`⚠️  Author not found: ${xmlPost.creator}, using first user`)
        userMap.set(xmlPost.creator, users.docs[0].id)
      }

      // Convert content to Lexical format with updated image URLs
      const lexicalContent = convertWordPressContentToLexical(xmlPost.content, imageMap)

      // Parse publication date
      const publishedAt = new Date(xmlPost.pubDate)

      // Get the first image as hero image if available
      let heroImageId: string | number | undefined
      if (xmlPost.images.length > 0) {
        const imageData = imageMap.get(xmlPost.images[0])
        if (imageData) {
          heroImageId = imageData.mediaId
        }
      }

      // Create the post
      // Ensure category IDs are numbers if Payload expects numbers
      const categoryIdsFinal = categoryIds.map((id) => {
        if (typeof id === 'string') {
          const numId = parseInt(id, 10)
          return isNaN(numId) ? id : numId
        }
        return id
      })
      
      const newPost = await payload.create({
        collection: 'posts',
        data: {
          title: xmlPost.title,
          slug: xmlPost.slug,
          content: lexicalContent,
          categories: categoryIdsFinal.length > 0 ? categoryIdsFinal : undefined,
          authors: [userMap.get(xmlPost.creator) || users.docs[0].id],
          publishedAt: publishedAt,
          heroImage: heroImageId,
          _status: 'published',
        },
        context: {
          disableRevalidate: true,
        },
      })

      console.log(`✅ Imported: ${xmlPost.title} (ID: ${newPost.id})`)
      if (xmlPost.images.length > 0) {
        console.log(`   🖼️  Images: ${xmlPost.images.length}`)
      }
      importedCount++
    } catch (error) {
      console.error(`❌ Error importing post "${xmlPost.title}":`, error)
      errorCount++
    }
  }

  console.log('\n📊 IMPORT SUMMARY:')
  console.log(`   Total posts in XML: ${xmlPosts.length}`)
  console.log(`   Successfully imported: ${importedCount}`)
  console.log(`   Skipped (already exist): ${skippedCount}`)
  console.log(`   Errors: ${errorCount}`)
  console.log(`   Images processed: ${imageMap.size}`)

  if (importedCount > 0) {
    console.log('\n🎉 Import completed successfully!')
  }
}

// Run the import
importPostsWithImages()
  .then(() => {
    console.log('\n✅ Import process finished!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during import:', error)
    process.exit(1)
  })
