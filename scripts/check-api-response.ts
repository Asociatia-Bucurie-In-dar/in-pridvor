#!/usr/bin/env tsx

/**
 * Check API Response - See what the API actually returns
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

async function checkApiResponse() {
  console.log('🔍 Check API Response')
  console.log('====================\n')

  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

  try {
    // Fetch one post without select parameter
    console.log(`📡 Fetching post from ${baseUrl}/api/posts...`)

    const response = await fetch(`${baseUrl}/api/posts?limit=1&depth=0`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const posts = data.docs || []

    if (posts.length > 0) {
      const post = posts[0]
      console.log(`Post: ${post.title}`)
      console.log(`Post ID: ${post.id}`)
      console.log(`Content type: ${typeof post.content}`)
      console.log(`Content value: ${post.content}`)

      if (post.content) {
        console.log(`Content keys: ${Object.keys(post.content).join(', ')}`)
      }

      // Show all available fields
      console.log(`\nAvailable fields: ${Object.keys(post).join(', ')}`)

      // Check if content is in a different field
      if (post.content === null && post.text) {
        console.log(`\nFound content in 'text' field: ${typeof post.text}`)
      }
      if (post.content === null && post.body) {
        console.log(`\nFound content in 'body' field: ${typeof post.body}`)
      }
    } else {
      console.log('❌ No posts found')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkApiResponse().catch(console.error)
