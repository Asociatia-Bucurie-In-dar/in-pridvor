// Improved WordPress import script based on previous learnings
// This version includes better author handling, error recovery, and progress tracking

import fs from 'fs'
import path from 'path'
import { parseString } from 'xml2js'

// Author mapping based on our previous analysis
const AUTHOR_MAPPING: { [key: string]: string } = {
  // Priests/Monks - add "Pr." prefix
  'Părintele Sofronie': 'Pr. Sofronie',
  'Părintele Rafail': 'Pr. Rafail',
  'Părintele Ioanichie': 'Pr. Ioanichie',
  'Părintele Arsenie': 'Pr. Arsenie',
  'Părintele Teofil': 'Pr. Teofil',
  'Părintele Dumitru': 'Pr. Dumitru',
  'Părintele Gheorghe': 'Pr. Gheorghe',
  'Părintele Vasile': 'Pr. Vasile',
  'Părintele Nicolae': 'Pr. Nicolae',
  'Părintele Mihai': 'Pr. Mihai',

  // Regular authors
  'Anca Stanciu': 'Anca Stanciu',
  'Alina Mirică': 'Alina Mirică',
  'Maria Popescu': 'Maria Popescu',
  'Elena Ionescu': 'Elena Ionescu',
  'Cristina Radu': 'Cristina Radu',
  'Andrei Munteanu': 'Andrei Munteanu',
  'Daniela Stoica': 'Daniela Stoica',
  'Mihaela Gheorghe': 'Mihaela Gheorghe',
  'Roxana Dumitrescu': 'Roxana Dumitrescu',
  'Gabriela Marin': 'Gabriela Marin',

  // Default fallback
  'Demo Author': 'Demo Author',
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
            author: AUTHOR_MAPPING[author] || author,
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

async function importPosts(posts: WordPressPost[]): Promise<ImportStats> {
  console.log('\n🚀 Starting import process...')
  console.log('==============================')

  const stats: ImportStats = {
    total: posts.length,
    imported: 0,
    skipped: 0,
    errors: 0,
    authors: new Set(),
    categories: new Set(),
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
  }, 5000)

  try {
    for (let i = 0; i < posts.length; i++) {
      const post = posts[i]

      try {
        // Track authors and categories
        stats.authors.add(post.author)
        post.categories.forEach((cat) => stats.categories.add(cat))

        // Here you would normally create the post in Payload
        // For now, we'll just simulate the import
        await new Promise((resolve) => setTimeout(resolve, 10)) // Simulate processing

        stats.imported++

        if (stats.imported % 50 === 0) {
          console.log(`✅ Imported ${stats.imported} posts...`)
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

  try {
    console.log('🎯 WordPress Import - Improved Version')
    console.log('=====================================\n')

    // Parse XML
    const posts = await parseWordPressXML(xmlFilePath)

    if (posts.length === 0) {
      console.log('❌ No posts found to import')
      return
    }

    // Import posts
    const stats = await importPosts(posts)

    // Final report
    console.log('\n📊 Import Summary')
    console.log('=================')
    console.log(`Total posts: ${stats.total}`)
    console.log(`Imported: ${stats.imported}`)
    console.log(`Skipped: ${stats.skipped}`)
    console.log(`Errors: ${stats.errors}`)
    console.log(`Success rate: ${((stats.imported / stats.total) * 100).toFixed(1)}%`)

    console.log('\n👥 Authors found:')
    console.log('-----------------')
    Array.from(stats.authors)
      .sort()
      .forEach((author) => {
        console.log(`- ${author}`)
      })

    console.log('\n📂 Categories found:')
    console.log('-------------------')
    Array.from(stats.categories)
      .sort()
      .forEach((category) => {
        console.log(`- ${category}`)
      })

    console.log('\n🎉 Import completed!')
    console.log('Next steps:')
    console.log('1. Run the SQL cleanup script to clear the database')
    console.log('2. Update this script to actually create posts in Payload')
    console.log('3. Run author assignment script after import')
  } catch (error) {
    console.error('❌ Import failed:', error)
  }
}

main().catch(console.error)
