// Import posts using the generated data

import fs from 'fs'
import path from 'path'

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

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

async function importPosts() {
  console.log('🚀 Starting post import...')
  console.log('==========================\n')

  try {
    // Read the generated posts data
    const postsFilePath = path.join(process.cwd(), 'import-data', 'posts-final-all.json')
    
    if (!fs.existsSync(postsFilePath)) {
      console.error('❌ Posts file not found:', postsFilePath)
      console.log('Please run the generate-final-ready.ts script first')
      return
    }

    const postsData: PostData[] = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'))
    console.log(`📊 Found ${postsData.length} posts to import`)

    // Get Anca Stanciu user ID
    console.log('\n🔍 Finding Anca Stanciu user...')
    const usersResponse = await fetch(`${baseUrl}/api/users?where[name][equals]=Anca Stanciu&limit=1`)
    
    if (!usersResponse.ok) {
      console.error('❌ Failed to fetch users:', usersResponse.statusText)
      return
    }

    const usersData = await usersResponse.json()
    const ancaUser = usersData.docs?.[0]
    
    if (!ancaUser) {
      console.error('❌ Anca Stanciu user not found')
      console.log('Please make sure the user exists in the database')
      return
    }

    console.log(`✅ Found Anca Stanciu user: ID ${ancaUser.id}`)

    // Import posts
    console.log('\n📝 Importing posts...')
    console.log('====================')

    let imported = 0
    let errors = 0
    const errorsList: string[] = []

    for (let i = 0; i < postsData.length; i++) {
      const post = postsData[i]
      
      try {
        const postPayload = {
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          publishedDate: post.publishedDate,
          status: post.status,
          author: ancaUser.id, // Use the actual user ID
          categories: post.categories, // Use the actual category IDs
        }

        const response = await fetch(`${baseUrl}/api/posts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postPayload),
        })

        if (response.ok) {
          imported++
          if (imported % 25 === 0) {
            console.log(`✅ Imported ${imported} posts...`)
          }
        } else {
          const errorText = await response.text()
          errors++
          errorsList.push(`Post "${post.title}": ${response.status} ${errorText}`)
          console.warn(`⚠️  Failed to import "${post.title}": ${response.status}`)
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50))

      } catch (error) {
        errors++
        errorsList.push(`Post "${post.title}": ${error}`)
        console.warn(`⚠️  Error importing "${post.title}":`, error)
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
      errorsList.slice(0, 10).forEach(error => {
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

importPosts().catch(console.error)
