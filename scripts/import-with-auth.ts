// Import posts with authentication

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

async function loginAndGetToken() {
  console.log('🔐 Attempting to authenticate...')

  // Try to login with admin credentials
  const loginResponse = await fetch(`${baseUrl}/api/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@example.com', // Default admin email
      password: 'admin', // Default admin password
    }),
  })

  if (loginResponse.ok) {
    const loginData = await loginResponse.json()
    return loginData.token
  }

  // Try alternative credentials
  const altLoginResponse = await fetch(`${baseUrl}/api/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@payloadcms.com',
      password: 'test',
    }),
  })

  if (altLoginResponse.ok) {
    const loginData = await altLoginResponse.json()
    return loginData.token
  }

  return null
}

async function importPostsWithAuth() {
  console.log('🚀 Starting authenticated post import...')
  console.log('======================================\n')

  try {
    // Try to authenticate
    const token = await loginAndGetToken()

    if (!token) {
      console.log('❌ Could not authenticate. Trying without authentication...')
      console.log('This might work if the API allows public access for some endpoints.')
    } else {
      console.log('✅ Authentication successful!')
    }

    // Read the generated posts data
    const postsFilePath = path.join(process.cwd(), 'import-data', 'posts-final-all.json')

    if (!fs.existsSync(postsFilePath)) {
      console.error('❌ Posts file not found:', postsFilePath)
      return
    }

    const postsData: PostData[] = JSON.parse(fs.readFileSync(postsFilePath, 'utf-8'))
    console.log(`📊 Found ${postsData.length} posts to import`)

    // Get Anca Stanciu user ID
    console.log('\n🔍 Finding Anca Stanciu user...')

    const headers: any = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `JWT ${token}`
    }

    const usersResponse = await fetch(
      `${baseUrl}/api/users?where[name][equals]=Anca Stanciu&limit=1`,
      {
        headers,
      },
    )

    if (!usersResponse.ok) {
      console.error('❌ Failed to fetch users:', usersResponse.statusText)
      const errorText = await usersResponse.text()
      console.log('Error response:', errorText)

      if (usersResponse.status === 403) {
        console.log('\n💡 Suggestion: The API requires authentication.')
        console.log('You may need to:')
        console.log('1. Check your Payload configuration for API access')
        console.log('2. Use the admin interface to import posts manually')
        console.log('3. Or configure API authentication properly')
      }
      return
    }

    const usersData = await usersResponse.json()
    const ancaUser = usersData.docs?.[0]

    if (!ancaUser) {
      console.error('❌ Anca Stanciu user not found')
      console.log(
        'Available users:',
        usersData.docs?.map((u) => u.name),
      )
      return
    }

    console.log(`✅ Found Anca Stanciu user: ID ${ancaUser.id}`)

    // Import first 5 posts as a test
    console.log('\n📝 Importing first 5 posts as test...')
    console.log('=====================================')

    let imported = 0
    let errors = 0
    const testPosts = postsData.slice(0, 5)

    for (const post of testPosts) {
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

        const response = await fetch(`${baseUrl}/api/posts`, {
          method: 'POST',
          headers,
          body: JSON.stringify(postPayload),
        })

        if (response.ok) {
          imported++
          console.log(`✅ Imported: "${post.title}"`)
        } else {
          const errorText = await response.text()
          errors++
          console.warn(`⚠️  Failed to import "${post.title}": ${response.status} ${errorText}`)
        }
      } catch (error) {
        errors++
        console.warn(`⚠️  Error importing "${post.title}":`, error)
      }
    }

    // Report results
    console.log('\n📊 Test Import Summary')
    console.log('======================')
    console.log(`Test posts: ${testPosts.length}`)
    console.log(`Imported: ${imported}`)
    console.log(`Errors: ${errors}`)

    if (imported > 0) {
      console.log('\n🎉 Test import successful!')
      console.log('You can now:')
      console.log('1. Check the admin interface to verify the test posts')
      console.log('2. If satisfied, run the full import')
      console.log('3. Or continue with manual import via admin interface')
    } else {
      console.log('\n❌ Test import failed.')
      console.log('Consider using the manual import approach via the admin interface.')
    }
  } catch (error) {
    console.error('❌ Import failed:', error)
  }
}

importPostsWithAuth().catch(console.error)
