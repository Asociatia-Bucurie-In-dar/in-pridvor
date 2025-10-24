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

async function analyzeXMLPosts() {
  console.log('🔍 Analyzing WordPress XML posts...\n')
  
  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-23.xml')
  
  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }
  
  const posts = extractPostsFromXML(xmlPath)
  
  console.log(`📝 Found ${posts.length} posts in XML file:\n`)
  
  posts.forEach((post, index) => {
    console.log(`${index + 1}. ${post.title}`)
    console.log(`   Slug: ${post.slug}`)
    console.log(`   Date: ${post.pubDate}`)
    console.log(`   Author: ${post.creator}`)
    console.log(`   Categories: ${post.categories.join(', ') || 'None'}`)
    console.log(`   Post ID: ${post.postId}`)
    console.log(`   Content length: ${post.content.length} characters`)
    console.log('')
  })
  
  // Check for duplicate slugs
  const slugs = posts.map(p => p.slug)
  const duplicateSlugs = slugs.filter((slug, index) => slugs.indexOf(slug) !== index)
  
  if (duplicateSlugs.length > 0) {
    console.log('⚠️  Duplicate slugs found:')
    duplicateSlugs.forEach(slug => {
      const postsWithSlug = posts.filter(p => p.slug === slug)
      console.log(`   ${slug}: ${postsWithSlug.map(p => p.title).join(', ')}`)
    })
  } else {
    console.log('✅ No duplicate slugs found')
  }
  
  // Check for posts with no categories
  const uncategorizedPosts = posts.filter(p => p.categories.length === 0)
  if (uncategorizedPosts.length > 0) {
    console.log('\n⚠️  Posts without categories:')
    uncategorizedPosts.forEach(post => {
      console.log(`   - ${post.title}`)
    })
  } else {
    console.log('\n✅ All posts have categories')
  }
  
  return posts
}

// Run the analysis
analyzeXMLPosts()
  .then((posts) => {
    console.log('\n✅ Analysis complete!')
    console.log(`\n📊 Summary:`)
    console.log(`   Total posts: ${posts?.length || 0}`)
    console.log(`   Posts with categories: ${posts?.filter(p => p.categories.length > 0).length || 0}`)
    console.log(`   Posts without categories: ${posts?.filter(p => p.categories.length === 0).length || 0}`)
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during analysis:', error)
    process.exit(1)
  })
