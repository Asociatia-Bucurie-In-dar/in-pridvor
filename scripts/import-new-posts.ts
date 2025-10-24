import { getPayload } from 'payload'
import config from '../src/payload.config'
import type { Post, Category, User } from '../src/payload-types'
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
    })
  }

  return posts
}

function convertWordPressContentToLexical(content: string) {
  // Convert WordPress Gutenberg blocks to Lexical format
  // This is a simplified conversion - you might need to enhance it based on your needs

  // Remove WordPress block comments
  let cleanContent = content.replace(/<!-- wp:[^>]*?-->/g, '')
  cleanContent = cleanContent.replace(/<!-- \/wp:[^>]*?-->/g, '')

  // Convert basic HTML to Lexical format
  const lexicalContent = {
    root: {
      children: [
        {
          children: [
            {
              detail: 0,
              format: 0,
              mode: 'normal',
              style: '',
              text: cleanContent,
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

  return lexicalContent
}

async function importNewPosts() {
  console.log('🚀 Starting import of new posts from WordPress XML...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  // Extract posts from XML
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📝 Found ${xmlPosts.length} posts in XML file`)

  // Initialize Payload
  const payload = await getPayload({ config })

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

  // Create category mapping
  const categoryMap = new Map<string, string>()
  for (const category of categories.docs) {
    categoryMap.set(category.title, category.id)
  }

  // Create user mapping (assuming adminpdv maps to first user, George Olteanu to second)
  const userMap = new Map<string, string>()
  if (users.docs.length > 0) {
    userMap.set('adminpdv', users.docs[0].id)
    if (users.docs.length > 1) {
      userMap.set('George Olteanu', users.docs[1].id)
    }
  }

  let importedCount = 0
  let skippedCount = 0
  let errorCount = 0

  console.log('\n📥 Starting import process...\n')

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

      // Map categories
      const categoryIds: string[] = []
      for (const categoryName of xmlPost.categories) {
        const categoryId = categoryMap.get(categoryName)
        if (categoryId) {
          categoryIds.push(categoryId)
        } else {
          console.log(`⚠️  Category not found: ${categoryName}`)
        }
      }

      // Map author
      const authorId = userMap.get(xmlPost.creator)
      if (!authorId) {
        console.log(`⚠️  Author not found: ${xmlPost.creator}, using first user`)
        userMap.set(xmlPost.creator, users.docs[0].id)
      }

      // Convert content to Lexical format
      const lexicalContent = convertWordPressContentToLexical(xmlPost.content)

      // Parse publication date
      const publishedAt = new Date(xmlPost.pubDate)

      // Create the post
      const newPost = await payload.create({
        collection: 'posts',
        data: {
          title: xmlPost.title,
          slug: xmlPost.slug,
          content: lexicalContent,
          categories: categoryIds,
          authors: [userMap.get(xmlPost.creator) || users.docs[0].id],
          publishedAt: publishedAt,
          _status: 'published',
        },
      })

      console.log(`✅ Imported: ${xmlPost.title} (ID: ${newPost.id})`)
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

  if (importedCount > 0) {
    console.log('\n🎉 Import completed successfully!')
  }
}

// Run the import
importNewPosts()
  .then(() => {
    console.log('\n✅ Import process finished!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during import:', error)
    process.exit(1)
  })
