import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import { parseStringPromise } from 'xml2js'
import fs from 'fs'
import path from 'path'

// Simple HTML to text conversion
function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[caption[^\]]*\]/g, '')
    .replace(/\[\/caption\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Create simple Lexical content
function createSimpleLexicalContent(text: string): any {
  const paragraphs = text.split('\n\n').filter(p => p.trim())
  
  const children = paragraphs.map(paragraph => ({
    type: 'paragraph',
    children: [
      {
        type: 'text',
        text: paragraph.trim(),
        format: 0,
        version: 1,
      },
    ],
    direction: 'ltr',
    format: '',
    indent: 0,
    version: 1,
  }))
  
  return {
    root: {
      type: 'root',
      children: children,
      direction: 'ltr',
      format: '',
      indent: 0,
      version: 1,
    },
  }
}

async function importWordPressSimple() {
  const payload = await getPayload({ config: configPromise })
  
  console.log('Starting SIMPLE WordPress import...')
  
  // Read the XML file
  const xmlPath = path.join(process.cwd(), 'inpridvor.WordPress.2025-10-11.xml')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')
  
  // Parse XML
  console.log('Parsing XML...')
  const result = await parseStringPromise(xmlContent)
  const items = result.rss.channel[0].item
  
  console.log(`Found ${items.length} items in XML`)
  
  // Filter only posts (not pages or attachments)
  const posts = items.filter((item: any) => {
    const postType = item['wp:post_type']?.[0]
    const status = item['wp:status']?.[0]
    return postType === 'post' && status === 'publish'
  })
  
  console.log(`Found ${posts.length} published posts to import`)
  
  // Get default author
  const users = await payload.find({
    collection: 'users',
    limit: 1,
  })
  
  const defaultAuthor = users.docs[0]?.id
  if (!defaultAuthor) {
    console.error('No users found. Please create at least one user first.')
    process.exit(1)
  }
  
  console.log(`Using author: ${users.docs[0].email}`)
  
  // Import each post with minimal content
  let imported = 0
  let skipped = 0
  let failed = 0
  
  for (let i = 0; i < Math.min(posts.length, 10); i++) { // Import only first 10 for testing
    const post = posts[i]
    
    try {
      const title = post.title?.[0] || 'Untitled'
      const slug = post['wp:post_name']?.[0] || `post-${i}`
      const content = post['content:encoded']?.[0] || ''
      const publishedAt = post['wp:post_date']?.[0] || new Date().toISOString()
      
      console.log(`\n📝 Importing: ${title}`)
      console.log(`   Slug: ${slug}`)
      
      // Check if post already exists
      const existing = await payload.find({
        collection: 'posts',
        where: {
          slug: {
            equals: slug,
          },
        },
        limit: 1,
      })
      
      if (existing.docs.length > 0) {
        console.log(`   ⏭️  Skipped (already exists)`)
        skipped++
        continue
      }
      
      // Convert content to simple text
      const textContent = htmlToText(content)
      const lexicalContent = createSimpleLexicalContent(textContent)
      
      // Create post with minimal data to avoid validation issues
      console.log(`   💾 Creating post...`)
      
      const postData: any = {
        title,
        slug,
        content: lexicalContent,
        publishedAt: new Date(publishedAt),
        authors: [defaultAuthor],
        _status: 'published',
      }
      
      const createdPost = await payload.create({
        collection: 'posts',
        data: postData,
        context: {
          disableRevalidate: true, // Disable revalidation to prevent script errors
        },
      })
      
      console.log(`   ✅ Imported successfully (ID: ${createdPost.id})`)
      imported++
      
    } catch (error) {
      console.error(`   ❌ Failed to import: ${error}`)
      failed++
    }
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('Import completed!')
  console.log(`✅ Imported: ${imported}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Failed: ${failed}`)
  console.log('='.repeat(50))
  
  process.exit(0)
}

// Run the import
importWordPressSimple().catch((error) => {
  console.error('Import failed:', error)
  process.exit(1)
})
