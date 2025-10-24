// Import posts using Payload SDK (like the seed script)

import { getPayload } from 'payload'
import config from '../src/payload.config'
import fs from 'fs'
import path from 'path'

interface PostData {
  title: string
  slug: string
  content: string
  excerpt: string
  publishedDate: string
  status: string
  author: string
  categories: string[]
}

async function importPostsWithPayload() {
  console.log('🚀 Starting Payload SDK post import...')
  console.log('====================================\n')

  try {
    const payload = await getPayload({ config })

    // Read the generated posts data
    const postsFilePath = path.join(process.cwd(), 'import-data', 'posts-final-all.json')

    if (!fs.existsSync(postsFilePath)) {
      console.error('❌ Posts file not found:', postsFilePath)
      return
    }

    const postsData: PostData[] = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'))
    console.log(`📊 Found ${postsData.length} posts to import`)

    // Get Anca Stanciu user
    console.log('\n🔍 Finding Anca Stanciu user...')
    const users = await payload.find({
      collection: 'users',
      where: {
        name: {
          equals: 'Anca Stanciu',
        },
      },
      limit: 1,
    })

    if (users.docs.length === 0) {
      console.error('❌ Anca Stanciu user not found')
      console.log(
        'Available users:',
        users.docs?.map((u) => u.name),
      )
      return
    }

    const ancaUser = users.docs[0]
    console.log(`✅ Found Anca Stanciu user: ID ${ancaUser.id}`)

    // Import posts in batches
    console.log('\n📝 Importing posts...')
    console.log('====================')

    let imported = 0
    let errors = 0
    const errorsList: string[] = []
    const batchSize = 10

    for (let i = 0; i < postsData.length; i += batchSize) {
      const batch = postsData.slice(i, i + batchSize)

      console.log(
        `\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(postsData.length / batchSize)} (posts ${i + 1}-${Math.min(i + batchSize, postsData.length)})`,
      )

      for (const post of batch) {
        try {
          const postPayload = {
            title: post.title,
            slug: post.slug,
            content: post.content,
            excerpt: post.excerpt,
            publishedDate: post.publishedDate,
            status: post.status,
            author: ancaUser.id,
            categories: post.categories,
          }

          await payload.create({
            collection: 'posts',
            depth: 0,
            context: {
              disableRevalidate: true,
            },
            data: postPayload,
          })

          imported++
          if (imported % 25 === 0) {
            console.log(`✅ Imported ${imported} posts...`)
          }
        } catch (error) {
          errors++
          errorsList.push(`Post "${post.title}": ${error}`)
          console.warn(`⚠️  Error importing "${post.title}":`, error)
        }
      }

      // Small delay between batches
      if (i + batchSize < postsData.length) {
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }

    // Final report
    console.log('\n📊 Import Summary')
    console.log('=================')
    console.log(`Total posts: ${postsData.length}`)
    console.log(`Imported: ${imported}`)
    console.log(`Errors: ${errors}`)
    console.log(`Success rate: ${((imported / postsData.length) * 100).toFixed(1)}%`)

    if (errors > 0) {
      console.log('\n❌ Errors encountered:')
      console.log('=====================')
      errorsList.slice(0, 10).forEach((error) => {
        console.log(`- ${error}`)
      })
      if (errorsList.length > 10) {
        console.log(`... and ${errorsList.length - 10} more errors`)
      }
    }

    if (imported > 0) {
      console.log('\n🎉 Import completed successfully!')
      console.log('Next steps:')
      console.log('1. Check the admin interface to verify posts')
      console.log('2. Test the website to ensure everything works')
      console.log('3. All posts are assigned to Anca Stanciu')
      console.log('4. All categories are properly linked')
    }
  } catch (error) {
    console.error('❌ Import failed:', error)
  }
}

importPostsWithPayload().catch(console.error)
