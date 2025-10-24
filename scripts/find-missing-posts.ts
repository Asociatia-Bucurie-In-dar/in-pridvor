import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const require = createRequire(import.meta.url)
require('dotenv').config()

interface WordPressPost {
  title: string
  slug: string
  pubDate: string
  postId: string
}

function extractPostsFromXML(xmlPath: string): WordPressPost[] {
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
  const posts: WordPressPost[] = []
  const postMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/g) || []

  for (const postMatch of postMatches) {
    const postTypeMatch = postMatch.match(/<wp:post_type><!\[CDATA\[(.*?)\]\]><\/wp:post_type>/)
    if (!postTypeMatch || postTypeMatch[1] !== 'post') continue

    const statusMatch = postMatch.match(/<wp:status><!\[CDATA\[(.*?)\]\]><\/wp:status>/)
    if (!statusMatch || statusMatch[1] !== 'publish') continue

    const titleMatch = postMatch.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)
    const linkMatch = postMatch.match(/<link>(.*?)<\/link>/)
    const pubDateMatch = postMatch.match(/<pubDate>(.*?)<\/pubDate>/)
    const postIdMatch = postMatch.match(/<wp:post_id>(.*?)<\/wp:post_id>/)

    if (!titleMatch || !linkMatch || !pubDateMatch || !postIdMatch) continue

    const slug = linkMatch[1].replace('https://inpridvor.ro/', '').replace(/\/$/, '')

    posts.push({
      title: titleMatch[1],
      slug,
      pubDate: pubDateMatch[1],
      postId: postIdMatch[1],
    })
  }

  return posts
}

async function findMissingPosts() {
  console.log('🔍 Finding missing posts...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')
  const xmlPosts = extractPostsFromXML(xmlPath)

  console.log(`📝 XML posts: ${xmlPosts.length}`)

  // Sort XML posts by date (newest first)
  xmlPosts.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())

  console.log(`\n📅 Date range in XML:`)
  console.log(`   Newest: ${xmlPosts[0].pubDate} - ${xmlPosts[0].title}`)
  console.log(
    `   Oldest: ${xmlPosts[xmlPosts.length - 1].pubDate} - ${xmlPosts[xmlPosts.length - 1].title}`,
  )

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get all posts from database
  const allDbPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })

  console.log(`\n📊 Database posts: ${allDbPosts.docs.length}`)

  // Create set of database slugs
  const dbSlugs = new Set(allDbPosts.docs.map((post) => post.slug))

  // Find missing posts
  const missingPosts = xmlPosts.filter((post) => !dbSlugs.has(post.slug))

  console.log(`\n❌ Missing posts: ${missingPosts.length}\n`)

  if (missingPosts.length > 0) {
    console.log('='.repeat(60))
    console.log('MISSING POSTS (sorted by date, newest first):')
    console.log('='.repeat(60))

    missingPosts.forEach((post, idx) => {
      console.log(`\n${idx + 1}. ${post.title}`)
      console.log(`   Slug: ${post.slug}`)
      console.log(`   Date: ${post.pubDate}`)
      console.log(`   Post ID: ${post.postId}`)
    })
  }

  // Also check the 10 newest posts in XML
  console.log('\n\n='.repeat(60))
  console.log('TOP 10 NEWEST POSTS IN XML:')
  console.log('='.repeat(60))

  for (let i = 0; i < 10 && i < xmlPosts.length; i++) {
    const post = xmlPosts[i]
    const inDb = dbSlugs.has(post.slug)
    console.log(`\n${i + 1}. ${post.title}`)
    console.log(`   Date: ${post.pubDate}`)
    console.log(`   Status: ${inDb ? '✅ IN DATABASE' : '❌ MISSING'}`)
  }
}

findMissingPosts()
  .then(() => {
    console.log('\n\n✅ Analysis complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
