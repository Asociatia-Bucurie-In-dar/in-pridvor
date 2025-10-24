// Complete WordPress import script that actually creates posts in Payload
// Based on our learnings from previous attempts

import fs from 'fs'
import path from 'path'
import { parseString } from 'xml2js'

// Author mapping - we'll create these users
const AUTHOR_MAPPING: { [key: string]: { name: string; email: string } } = {
  'George Olteanu': { name: 'George Olteanu', email: 'george.olteanu@email.com' },
  adminpdv: { name: 'Admin Pridvor', email: 'admin@pridvor.com' },
  'Demo Author': { name: 'Demo Author', email: 'demo@email.com' },
}

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

interface ImportStats {
  total: number
  imported: number
  skipped: number
  errors: number
  authors: Set<string>
  categories: Set<string>
  createdUsers: string[]
  createdCategories: string[]
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

async function createUsers(stats: ImportStats): Promise<{ [key: string]: string }> {
  console.log('\n👥 Creating users...')
  console.log('===================')

  const userIds: { [key: string]: string } = {}

  for (const author of stats.authors) {
    const authorInfo = AUTHOR_MAPPING[author] || AUTHOR_MAPPING['Demo Author']

    try {
      // Create user via API
      const response = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: authorInfo.name,
          email: authorInfo.email,
          password: 'TempPassword123!',
          role: 'user',
        }),
      })

      if (response.ok) {
        const user = await response.json()
        userIds[author] = user.id
        stats.createdUsers.push(authorInfo.name)
        console.log(`✅ Created user: ${authorInfo.name}`)
      } else {
        console.warn(`⚠️  Failed to create user ${authorInfo.name}: ${response.statusText}`)
        // Use a fallback ID or create manually
        userIds[author] = 'fallback-user-id'
      }
    } catch (error) {
      console.warn(`⚠️  Error creating user ${authorInfo.name}:`, error)
      userIds[author] = 'fallback-user-id'
    }
  }

  return userIds
}

async function createCategories(stats: ImportStats): Promise<{ [key: string]: string }> {
  console.log('\n📂 Creating categories...')
  console.log('=========================')

  const categoryIds: { [key: string]: string } = {}

  for (const categoryName of stats.categories) {
    try {
      // Create category via API
      const response = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: categoryName,
          slug: categoryName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, ''),
        }),
      })

      if (response.ok) {
        const category = await response.json()
        categoryIds[categoryName] = category.id
        stats.createdCategories.push(categoryName)
        console.log(`✅ Created category: ${categoryName}`)
      } else {
        console.warn(`⚠️  Failed to create category ${categoryName}: ${response.statusText}`)
        categoryIds[categoryName] = 'fallback-category-id'
      }
    } catch (error) {
      console.warn(`⚠️  Error creating category ${categoryName}:`, error)
      categoryIds[categoryName] = 'fallback-category-id'
    }
  }

  return categoryIds
}

async function importPosts(
  posts: WordPressPost[],
  userIds: { [key: string]: string },
  categoryIds: { [key: string]: string },
): Promise<ImportStats> {
  console.log('\n🚀 Starting post import...')
  console.log('==========================')

  const stats: ImportStats = {
    total: posts.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    authors: new Set(),
    categories: new Set(),
    createdUsers: [],
    createdCategories: [],
  }

  // Create progress tracking
  const progressInterval = setInterval(() => {
    const progress = (
      ((stats.imported + stats.skipped + stats.errors) / stats.total) *
      100
    ).toFixed(1)
    console.log(
      `📊 Progress: ${progress}% (${stats.imported} imported, ${stats.skipped} skipped, ${stats.errors} errors)`,
    )
  }, 1000)

  try {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]

      try {
        // Get author ID
        const authorId = userIds[post.author] || userIds['Demo Author']

        // Get category IDs
        const postCategoryIds = post.categories
          .map((cat) => categoryIds[cat])
          .filter((id) => id && id !== 'fallback-category-id')

        // Create post data
        const postData = {
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
          author: authorId,
          categories: postCategoryIds,
          // Add other fields as needed
        }

        // Create post via API
        const response = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        })

        if (response.ok) {
          stats.imported++

          if (stats.imported % 25 === 0) {
            console.log(`✅ Imported ${stats.imported} posts...`)
          }
        } else {
          console.warn(`⚠️  Failed to import post "${post.title}": ${response.statusText}`)
          stats.errors++
        }
      } catch (error) {
        console.warn(`⚠️  Error importing post "${post.title}":`, error)
        stats.errors++
      }
    }
  } finally {
    clearInterval(progressInterval)
  }

  return stats
}

async function main() {
  const xmlFilePath = '/Users/fabi/Documents/GitHub/in-pridvor/inpridvor.WordPress.2025-10-24.xml'

  if (!fs.existsSync(xmlFilePath)) {
    console.error('❌ XML file not found:', xmlFilePath)
    return
  }

  if (!process.env.PAYLOAD_PUBLIC_SERVER_URL) {
    console.error('❌ PAYLOAD_PUBLIC_SERVER_URL environment variable not set')
    return
  }

  try {
    console.log('🎯 WordPress Import - Complete Version')
    console.log('=====================================\n')

    // Parse XML
    const posts = await parseWordPressXML(xmlFilePath)

    if (posts.length === 0) {
      console.log('❌ No posts found to import')
      return
    }

    // Collect stats
    const stats: ImportStats = {
      total: posts.length,
      imported: 0,
      skipped: 0,
      errors: 0,
      authors: new Set(),
      categories: new Set(),
      createdUsers: [],
      createdCategories: [],
    }

    // Collect unique authors and categories
    posts.forEach((post) => {
      stats.authors.add(post.author)
      post.categories.forEach((cat) => stats.categories.add(cat))
    })

    console.log(
      `📊 Found ${stats.authors.size} unique authors and ${stats.categories.size} unique categories`,
    )

    // Create users and categories
    const userIds = await createUsers(stats)
    const categoryIds = await createCategories(stats)

    // Import posts
    const importStats = await importPosts(posts, userIds, categoryIds)

    // Final report
    console.log('\n📊 Import Summary')
    console.log('=================')
    console.log(`Total posts: ${importStats.total}`)
    console.log(`Imported: ${importStats.imported}`)
    console.log(`Skipped: ${importStats.skipped}`)
    console.log(`Errors: ${importStats.errors}`)
    console.log(`Success rate: ${((importStats.imported / importStats.total) * 100).toFixed(1)}%`)

    console.log('\n👥 Users created:')
    console.log('----------------')
    stats.createdUsers.forEach((user) => {
      console.log(`- ${user}`)
    })

    console.log('\n📂 Categories created:')
    console.log('---------------------')
    stats.createdCategories.forEach((category) => {
      console.log(`- ${category}`)
    })

    console.log('\n🎉 Import completed!')
    console.log('Next steps:')
    console.log('1. Check the admin interface to verify posts')
    console.log('2. Run author assignment script if needed')
    console.log('3. Test the website functionality')
  } catch (error) {
    console.error('❌ Import failed:', error)
  }
}

main().catch(console.error)
