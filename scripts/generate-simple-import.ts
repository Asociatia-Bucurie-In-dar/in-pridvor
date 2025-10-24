// Generate import data with all posts assigned to existing Anca Stanciu user
// This avoids the need to create new users

import fs from 'fs'
import path from 'path'
import { parseString } from 'xml2js'

interface WordPressPost {
  title: string
  content: string
  excerpt: string
  slug: string
  date: string
  status: string
  author: string
  categories: string[]
  tags: string[]
  featuredImage?: string
  attachments: string[]
}

async function parseWordPressXML(filePath: string): Promise<WordPressPost[]> {
  console.log('📖 Parsing WordPress XML file...')

  const xmlContent = fs.readFileSync(filePath, 'utf-8')

  return new Promise((resolve, reject) => {
    parseString(xmlContent, (err, result) => {
      if (err) {
        reject(err)
        return
      }

      const posts: WordPressPost[] = []
      const items = result.rss.channel[0].item || []

      console.log(`Found ${items.length} items in XML`)

      for (const item of items) {
        try {
          // Only process published posts
          const postType = item['wp:post_type']?.[0]
          const status = item['wp:status']?.[0]

          if (postType !== 'post' || status !== 'publish') {
            continue
          }

          const title = item.title?.[0] || 'Untitled'
          const content = item['content:encoded']?.[0] || ''
          const excerpt = item['excerpt:encoded']?.[0] || ''
          const slug = item['wp:post_name']?.[0] || ''
          const date = item['wp:post_date']?.[0] || new Date().toISOString()
          const author = item['dc:creator']?.[0] || 'Demo Author'

          // Extract categories
          const categories: string[] = []
          if (item.category) {
            for (const cat of item.category) {
              const catName = cat._ || cat
              if (typeof catName === 'string' && catName.trim()) {
                categories.push(catName.trim())
              }
            }
          }

          // Extract tags (same as categories for now)
          const tags = [...categories]

          // Extract featured image
          let featuredImage: string | undefined
          if (item['wp:meta_value']) {
            for (const meta of item['wp:meta_value']) {
              if (
                meta._ &&
                meta._.includes('http') &&
                (meta._.includes('.jpg') || meta._.includes('.png') || meta._.includes('.webp'))
              ) {
                featuredImage = meta._
                break
              }
            }
          }

          // Extract attachments
          const attachments: string[] = []
          if (item['wp:attachment_url']) {
            for (const attachment of item['wp:attachment_url']) {
              if (attachment && typeof attachment === 'string') {
                attachments.push(attachment)
              }
            }
          }

          posts.push({
            title,
            content,
            excerpt,
            slug,
            date,
            status,
            author: author,
            categories,
            tags,
            featuredImage,
            attachments,
          })
        } catch (error) {
          console.warn(`⚠️  Error parsing item:`, error)
        }
      }

      console.log(`✅ Parsed ${posts.length} published posts`)
      resolve(posts)
    })
  })
}

async function generateSimpleImport() {
  const xmlFilePath = '/Users/fabi/Documents/GitHub/in-pridvor/inpridvor.WordPress.2025-10-24.xml'

  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found:', xmlFilePath)
    return
  }

  try {
    console.log('🎯 Simple WordPress Import Generator')
    console.log('===================================\n')
    console.log('📝 All posts will be assigned to existing "Anca Stanciu" user\n')

    // Parse XML
    const posts = await parseWordPressXML(xmlFilePath)

    if (posts.length === 0) {
      console.log('❌ No posts found to import')
      return
    }

    // Collect unique categories
    const categories = new Set<string>()

    posts.forEach((post) => {
      post.categories.forEach((cat) => categories.add(cat))
    })

    console.log(`📊 Found ${categories.size} unique categories`)

    // Generate categories data
    const categoriesData = Array.from(categories).map((category) => ({
      title: category,
      slug: category
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    }))

    // Generate posts data - all assigned to Anca Stanciu
    const postsData = posts.map((post) => ({
      title: post.title,
      slug:
        post.slug ||
        post.title
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, ''),
      content: post.content,
      excerpt: post.excerpt,
      publishedDate: post.date,
      status: 'published',
      author: 'Anca Stanciu', // All posts assigned to existing user
      categories: post.categories, // Will need to be replaced with actual category IDs
    }))

    // Write data to files
    const outputDir = path.join(process.cwd(), 'import-data')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Write categories data
    fs.writeFileSync(
      path.join(outputDir, 'categories.json'),
      JSON.stringify(categoriesData, null, 2),
    )

    // Write posts data (first 10 for testing)
    fs.writeFileSync(
      path.join(outputDir, 'posts-sample.json'),
      JSON.stringify(postsData.slice(0, 10), null, 2),
    )

    // Write all posts data
    fs.writeFileSync(path.join(outputDir, 'posts-all.json'), JSON.stringify(postsData, null, 2))

    // Generate simplified import instructions
    const instructions = `
# Simple WordPress Import Instructions

## Generated Data Files:
- \`categories.json\` - ${categoriesData.length} categories to create  
- \`posts-sample.json\` - 10 sample posts for testing
- \`posts-all.json\` - All ${postsData.length} posts (all assigned to Anca Stanciu)

## Import Steps:

### 1. Create Categories  
Go to Payload Admin → Categories → Create New
Create these categories:
${categoriesData.map((cat) => `- Title: ${cat.title}, Slug: ${cat.slug}`).join('\n')}

### 2. Import Posts
After creating categories, you can:
- Use the Payload admin interface to create posts manually
- Or use the generated JSON data with a script that has proper authentication
- All posts will be assigned to the existing "Anca Stanciu" user

## Categories Found:
${Array.from(categories)
  .map((category) => `- ${category}`)
  .join('\n')}

## Next Steps:
1. Create the categories manually in the admin interface
2. Note down their IDs
3. Update the posts data with the correct category IDs
4. Import the posts (manually or via script with authentication)
5. All posts will be assigned to existing "Anca Stanciu" user

## Note:
- No need to create users - all posts assigned to existing "Anca Stanciu"
- Total posts: ${postsData.length}
- Total categories: ${categoriesData.length}
`

    fs.writeFileSync(path.join(outputDir, 'SIMPLE-IMPORT-INSTRUCTIONS.md'), instructions)

    console.log('\n📁 Generated simplified import data files:')
    console.log('==========================================')
    console.log(`✅ Categories: ${categoriesData.length} categories`)
    console.log(`✅ Posts: ${postsData.length} posts (all assigned to Anca Stanciu)`)
    console.log(`✅ Sample: 10 posts for testing`)
    console.log(`\n📂 Files saved to: ${outputDir}/`)
    console.log(`📖 Instructions: ${outputDir}/SIMPLE-IMPORT-INSTRUCTIONS.md`)

    console.log('\n📂 Categories to create:')
    console.log('------------------------')
    Array.from(categories).forEach((category) => {
      console.log(`- ${category}`)
    })

    console.log('\n🎉 Simplified data generation completed!')
    console.log('Next steps:')
    console.log('1. Check the generated files in import-data/')
    console.log('2. Follow the instructions in SIMPLE-IMPORT-INSTRUCTIONS.md')
    console.log('3. Create categories manually in admin interface')
    console.log('4. Import posts using the generated data')
    console.log('5. All posts will be assigned to existing "Anca Stanciu" user')
  } catch (error) {
    console.error('❌ Data generation failed:', error)
  }
}

generateSimpleImport().catch(console.error)
