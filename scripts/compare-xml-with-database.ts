import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { getPayload } from 'payload'
import config from '../src/payload.config'

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
    const contentMatch = postMatch.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)
    if (!contentMatch) continue
    
    // Extract post ID
    const postIdMatch = postMatch.match(/<wp:post_id>(.*?)<\/wp:post_id>/)
    if (!postIdMatch) continue
    
    // Extract categories
    const categoryMatches = postMatch.match(/<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/g) || []
    const categories = categoryMatches.map(match => {
      const catMatch = match.match(/<category domain="category" nicename="([^"]*)"[^>]*><!\[CDATA\[([^\]]*)\]\]><\/category>/)
      return catMatch ? catMatch[2] : ''
    }).filter(cat => cat)
    
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
      postId: postIdMatch[1]
    })
  }
  
  return posts
}

async function compareXMLWithDatabase() {
  console.log('🔍 Comparing WordPress XML with database...\n')
  
  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')
  
  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }
  
  // Extract posts from XML
  const xmlPosts = extractPostsFromXML(xmlPath)
  console.log(`📝 Found ${xmlPosts.length} posts in XML file`)
  
  // Get posts from database
  console.log('📊 Fetching posts from database...')
  const payload = await getPayload({ config })
  
  const dbPosts = await payload.find({
    collection: 'posts',
    limit: 1000,
    depth: 0,
  })
  
  console.log(`📝 Found ${dbPosts.docs.length} posts in database`)
  
  // Create a set of existing slugs for quick lookup
  const existingSlugs = new Set(dbPosts.docs.map(post => post.slug))
  
  // Find new posts (not in database)
  const newPosts = xmlPosts.filter(post => !existingSlugs.has(post.slug))
  
  // Find posts that exist in both but might need updates
  const existingPosts = xmlPosts.filter(post => existingSlugs.has(post.slug))
  
  console.log('\n📊 COMPARISON RESULTS:')
  console.log(`   Total posts in XML: ${xmlPosts.length}`)
  console.log(`   Total posts in database: ${dbPosts.docs.length}`)
  console.log(`   New posts to import: ${newPosts.length}`)
  console.log(`   Existing posts: ${existingPosts.length}`)
  
  if (newPosts.length > 0) {
    console.log('\n🆕 NEW POSTS TO IMPORT:')
    newPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`)
      console.log(`   Slug: ${post.slug}`)
      console.log(`   Date: ${post.pubDate}`)
      console.log(`   Author: ${post.creator}`)
      console.log(`   Categories: ${post.categories.join(', ') || 'None'}`)
      console.log(`   Post ID: ${post.postId}`)
      console.log('')
    })
  } else {
    console.log('\n✅ No new posts to import - all XML posts already exist in database')
  }
  
  // Check for posts in database that are not in XML (might be manually created)
  const dbSlugs = new Set(xmlPosts.map(post => post.slug))
  const dbOnlyPosts = dbPosts.docs.filter(post => !dbSlugs.has(post.slug))
  
  if (dbOnlyPosts.length > 0) {
    console.log(`\n📝 POSTS IN DATABASE BUT NOT IN XML (${dbOnlyPosts.length}):`)
    dbOnlyPosts.forEach((post, index) => {
      console.log(`${index + 1}. ${post.title} (${post.slug})`)
    })
  }
  
  return {
    xmlPosts,
    dbPosts: dbPosts.docs,
    newPosts,
    existingPosts,
    dbOnlyPosts
  }
}

// Run the comparison
compareXMLWithDatabase()
  .then((result) => {
    console.log('\n✅ Comparison complete!')
    if (result?.newPosts.length > 0) {
      console.log(`\n🚀 Ready to import ${result.newPosts.length} new posts`)
    }
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during comparison:', error)
    process.exit(1)
  })
