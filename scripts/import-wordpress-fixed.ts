import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'
import { parseStringPromise } from 'xml2js'
import fs from 'fs'
import path from 'path'
import https from 'https'
import http from 'http'

// Helper to convert WordPress HTML to Lexical JSON format
function htmlToLexical(html: string): any {
  // Remove WordPress block comments
  let cleanHtml = html.replace(/<!-- \/wp:[^>]+ -->/g, '')
  cleanHtml = cleanHtml.replace(/<!-- wp:[^>]+ -->/g, '')
  
  // Split by paragraphs and headings
  const elements = cleanHtml.split(/(?=<[ph])/i)
  
  const children: any[] = []
  
  for (const element of elements) {
    const trimmed = element.trim()
    if (!trimmed) continue
    
    // Check for headings
    const headingMatch = trimmed.match(/<h([1-6])[^>]*>(.*?)<\/h[1-6]>/i)
    if (headingMatch) {
      const level = headingMatch[1]
      const text = stripHtmlTags(headingMatch[2])
      children.push({
        type: 'heading',
        tag: `h${level}`,
        children: [
          {
            type: 'text',
            text: text,
            format: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
      continue
    }
    
    // Check for paragraphs
    const paragraphMatch = trimmed.match(/<p[^>]*>(.*?)<\/p>/is)
    if (paragraphMatch) {
      const content = paragraphMatch[1]
      const textChildren = parseInlineHtml(content)
      
      // Skip empty paragraphs
      if (textChildren.length === 0 || (textChildren.length === 1 && textChildren[0].text.trim() === '')) {
        continue
      }
      
      children.push({
        type: 'paragraph',
        children: textChildren,
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
      continue
    }
  }
  
  // If no children were parsed, create a simple paragraph
  if (children.length === 0) {
    const plainText = stripHtmlTags(html)
    if (plainText.trim()) {
      children.push({
        type: 'paragraph',
        children: [
          {
            type: 'text',
            text: plainText,
            format: 0,
            version: 1,
          },
        ],
        direction: 'ltr',
        format: '',
        indent: 0,
        version: 1,
      })
    }
  }
  
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

// Parse inline HTML (bold, italic, links, etc.)
function parseInlineHtml(html: string): any[] {
  const children: any[] = []
  
  // Simple regex-based parser for inline elements
  const regex = /<(strong|b|em|i|a[^>]*)>([^<]*)<\/(strong|b|em|i|a)>|([^<]+)/gi
  let match
  let lastIndex = 0
  
  while ((match = regex.exec(html)) !== null) {
    const tag = match[1]
    const content = match[2] || match[4]
    
    if (!content || content.trim() === '') continue
    
    const text = stripHtmlTags(content)
    if (!text.trim()) continue
    
    let format = 0
    
    if (tag) {
      const tagLower = tag.toLowerCase()
      if (tagLower === 'strong' || tagLower === 'b') {
        format = 1 // bold
      } else if (tagLower === 'em' || tagLower === 'i') {
        format = 2 // italic
      } else if (tagLower.startsWith('a')) {
        // Handle links
        const hrefMatch = html.substring(match.index).match(/<a[^>]+href=["']([^"']+)["'][^>]*>/)
        if (hrefMatch) {
          children.push({
            type: 'link',
            fields: {
              url: hrefMatch[1],
              linkType: 'custom',
            },
            children: [
              {
                type: 'text',
                text: text,
                format: 0,
                version: 1,
              },
            ],
            direction: 'ltr',
            format: '',
            indent: 0,
            version: 3,
          })
          continue
        }
      }
    }
    
    children.push({
      type: 'text',
      text: text,
      format: format,
      version: 1,
    })
  }
  
  // If no matches, just add plain text
  if (children.length === 0) {
    const plainText = stripHtmlTags(html)
    if (plainText.trim()) {
      children.push({
        type: 'text',
        text: plainText,
        format: 0,
        version: 1,
      })
    }
  }
  
  return children
}

// Strip HTML tags
function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[caption[^\]]*\]/g, '')
    .replace(/\[\/caption\]/g, '')
    .trim()
}

// Download image from URL
async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          // Handle redirects
          if (response.headers.location) {
            downloadImage(response.headers.location).then(resolve).catch(reject)
            return
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download image: ${response.statusCode}`))
          return
        }

        const chunks: Buffer[] = []
        response.on('data', (chunk) => chunks.push(chunk))
        response.on('end', () => resolve(Buffer.concat(chunks)))
        response.on('error', reject)
      })
      .on('error', reject)
  })
}

// Main import function
async function importWordPress() {
  const payload = await getPayload({ config: configPromise })
  
  console.log('Starting WordPress import...')
  
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
  
  // Get or create default author
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
  
  // Track categories
  const categoryMap = new Map<string, string>()
  
  // Import each post
  let imported = 0
  let skipped = 0
  let failed = 0
  
  for (const post of posts) {
    try {
      const title = post.title?.[0] || 'Untitled'
      const slug = post['wp:post_name']?.[0] || ''
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
      
      // Get categories
      const categories: string[] = []
      if (post.category) {
        for (const cat of post.category) {
          const catName = cat._ || cat
          if (!catName || catName === 'Uncategorized') continue
          
          // Check if category exists in our map
          if (!categoryMap.has(catName)) {
            // Try to find existing category
            const existingCat = await payload.find({
              collection: 'categories',
              where: {
                title: {
                  equals: catName,
                },
              },
              limit: 1,
            })
            
            if (existingCat.docs.length > 0) {
              categoryMap.set(catName, existingCat.docs[0].id)
            } else {
              // Create new category
              const newCat = await payload.create({
                collection: 'categories',
                data: {
                  title: catName,
                },
              })
              categoryMap.set(catName, newCat.id)
              console.log(`   📁 Created category: ${catName}`)
            }
          }
          
          categories.push(categoryMap.get(catName)!)
        }
      }
      
      // Handle featured image
      let heroImageId: string | undefined
      const postMeta = post['wp:postmeta']
      if (postMeta && Array.isArray(postMeta)) {
        const thumbnailMeta = postMeta.find(
          (meta: any) => meta['wp:meta_key']?.[0] === '_thumbnail_id',
        )
        
        if (thumbnailMeta) {
          const thumbnailId = thumbnailMeta['wp:meta_value']?.[0]
          
          // Find the attachment in the items
          const attachment = items.find(
            (item: any) =>
              item['wp:post_id']?.[0] === thumbnailId && item['wp:post_type']?.[0] === 'attachment',
          )
          
          if (attachment) {
            const attachmentUrl = attachment['wp:attachment_url']?.[0]
            const attachmentTitle = attachment['title']?.[0] || 'Image'
            
            if (attachmentUrl) {
              try {
                console.log(`   🖼️  Downloading featured image...`)
                const imageBuffer = await downloadImage(attachmentUrl)
                
                // Get file extension
                const ext = path.extname(attachmentUrl).split('?')[0] || '.jpg'
                const filename = `${slug}-featured${ext}`
                
                // Upload to Payload
                const uploadedImage = await payload.create({
                  collection: 'media',
                  data: {
                    alt: attachmentTitle,
                  },
                  file: {
                    data: imageBuffer,
                    mimetype: `image/${ext.replace('.', '')}`,
                    name: filename,
                    size: imageBuffer.length,
                  },
                })
                
                heroImageId = uploadedImage.id
                console.log(`   ✅ Featured image uploaded`)
              } catch (imageError) {
                console.log(`   ⚠️  Failed to download featured image: ${imageError}`)
              }
            }
          }
        }
      }
      
      // Convert content to Lexical format
      const lexicalContent = htmlToLexical(content)
      
      // Create post - DISABLE REVALIDATION HOOKS TEMPORARILY
      console.log(`   💾 Creating post...`)
      const createdPost = await payload.create({
        collection: 'posts',
        data: {
          title,
          slug,
          content: lexicalContent,
          publishedAt: new Date(publishedAt),
          authors: [defaultAuthor],
          categories: categories,
          heroImage: heroImageId,
          _status: 'published',
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
importWordPress().catch((error) => {
  console.error('Import failed:', error)
  process.exit(1)
})
