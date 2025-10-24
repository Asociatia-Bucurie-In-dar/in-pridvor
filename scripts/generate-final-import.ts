// Generate final import data using existing categories and Anca Stanciu user

import fs from 'fs'
import path from 'path'
import { parseString } from 'xml2js'

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

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

async function generateFinalImport() {
  const xmlFilePath = '/Users/fabi/Documents/GitHub/in-pridvor/inpridvor.WordPress.2025-10-24.xml'

  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found:', xmlFilePath)
    return
  }

  try {
    console.log('🎯 Final WordPress Import Generator')
    console.log('==================================\n')
    console.log('📝 Using existing categories and Anca Stanciu user\n')

    // Parse XML
    const posts = await parseWordPressXML(xmlFilePath)

    if (posts.length === 0) {
      console.log('❌ No posts found to import')
      return
    }

    // Fetch existing categories
    console.log('🔍 Fetching existing categories...')
    const response = await fetch(`${baseUrl}/api/categories?limit=1000`)

    if (!response.ok) {
      console.log(`❌ Failed to fetch categories: ${response.statusText}`)
      return
    }

    const data = await response.json()
    const existingCategories = data.docs || []

    console.log(`📊 Found ${existingCategories.length} existing categories`)

    // Create category mapping
    const categoryMapping: { [key: string]: string } = {}
    existingCategories.forEach((cat) => {
      categoryMapping[cat.title] = cat.id
    })

    // Collect categories from XML
    const xmlCategories = new Set<string>()
    posts.forEach((post) => {
      post.categories.forEach((cat) => xmlCategories.add(cat))
    })

    // Find missing categories
    const missingCategories = Array.from(xmlCategories).filter((cat) => !categoryMapping[cat])
    const existingMatches = Array.from(xmlCategories).filter((cat) => categoryMapping[cat])

    console.log(`✅ ${existingMatches.length} categories already exist`)
    console.log(`❌ ${missingCategories.length} categories need to be created`)

    // Generate posts data with correct category IDs
    const postsData = posts.map((post) => {
      const categoryIds = post.categories.map((cat) => categoryMapping[cat]).filter((id) => id) // Only include categories that exist

      return {
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
        categories: categoryIds, // Use existing category IDs
      }
    })

    // Write data to files
    const outputDir = path.join(process.cwd(), 'import-data')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Write missing categories data
    if (missingCategories.length > 0) {
      const missingCategoriesData = missingCategories.map((category) => ({
        title: category,
        slug: category
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, ''),
      }))

      fs.writeFileSync(
        path.join(outputDir, 'missing-categories.json'),
        JSON.stringify(missingCategoriesData, null, 2),
      )
    }

    // Write posts data (first 10 for testing)
    fs.writeFileSync(
      path.join(outputDir, 'posts-sample.json'),
      JSON.stringify(postsData.slice(0, 10), null, 2),
    )

    // Write all posts data
    fs.writeFileSync(path.join(outputDir, 'posts-all.json'), JSON.stringify(postsData, null, 2))

    // Generate final import instructions
    const instructions = `
# Final WordPress Import Instructions

## Generated Data Files:
- \`posts-sample.json\` - 10 sample posts for testing
- \`posts-all.json\` - All ${postsData.length} posts (assigned to Anca Stanciu)
${missingCategories.length > 0 ? `- \`missing-categories.json\` - ${missingCategories.length} categories to create` : ''}

## Import Steps:

${
  missingCategories.length > 0
    ? `
### 1. Create Missing Categories
Go to Payload Admin → Categories → Create New
Create these ${missingCategories.length} missing categories:
${missingCategories
  .map((cat) => {
    const slug = cat
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    return `- Title: ${cat}, Slug: ${slug}`
  })
  .join('\n')}
`
    : '### 1. All Categories Already Exist! 🎉'
}

### 2. Import Posts
All posts are ready to import with:
- ✅ All posts assigned to existing "Anca Stanciu" user
- ✅ All categories mapped to existing category IDs
- ✅ Proper slugs and content structure

## Category Mapping Used:
${existingMatches.map((cat) => `- "${cat}" → ID: ${categoryMapping[cat]}`).join('\n')}

## Summary:
- Total posts: ${postsData.length}
- Categories already exist: ${existingMatches.length}
- Categories to create: ${missingCategories.length}
- All posts assigned to: Anca Stanciu

## Next Steps:
1. ${missingCategories.length > 0 ? 'Create the missing categories' : 'All categories already exist!'}
2. Import posts using the generated JSON data
3. All posts will be properly linked to existing categories and Anca Stanciu user
`

    fs.writeFileSync(path.join(outputDir, 'FINAL-IMPORT-INSTRUCTIONS.md'), instructions)

    console.log('\n📁 Generated final import data files:')
    console.log('====================================')
    console.log(`✅ Posts: ${postsData.length} posts (all assigned to Anca Stanciu)`)
    console.log(`✅ Categories: ${existingMatches.length} existing categories mapped`)
    console.log(`✅ Sample: 10 posts for testing`)
    if (missingCategories.length > 0) {
      console.log(`✅ Missing categories: ${missingCategories.length} to create`)
    }
    console.log(`\n📂 Files saved to: ${outputDir}/`)
    console.log(`📖 Instructions: ${outputDir}/FINAL-IMPORT-INSTRUCTIONS.md`)

    if (missingCategories.length > 0) {
      console.log('\n❌ Categories to create:')
      console.log('------------------------')
      missingCategories.forEach((category) => {
        const slug = category
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        console.log(`- ${category} (slug: ${slug})`)
      })
    } else {
      console.log('\n🎉 All categories already exist!')
    }

    console.log('\n🎉 Final import data generation completed!')
    console.log('Next steps:')
    if (missingCategories.length > 0) {
      console.log('1. Create the missing categories in admin interface')
    }
    console.log('2. Import posts using the generated JSON data')
    console.log('3. All posts will be properly linked to existing categories and Anca Stanciu user')
  } catch (error) {
    console.error('❌ Data generation failed:', error)
  }
}

generateFinalImport().catch(console.error)
