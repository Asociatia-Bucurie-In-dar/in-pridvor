#!/usr/bin/env tsx

/**
 * Debug All Posts - Check what's happening with content extraction
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(process.cwd(), '.env') })

// Function to extract text from Lexical content
function extractTextFromLexical(node: any): string {
  if (typeof node === 'string') return node
  if (typeof node === 'object' && node !== null) {
    if (node.type === 'paragraph' && node.children) {
      return node.children.map(extractTextFromLexical).join('')
    }
    if (node.type === 'heading' && node.children) {
      return node.children.map(extractTextFromLexical).join('')
    }
    if (node.text) return node.text
    if (node.children) {
      return node.children.map(extractTextFromLexical).join('')
    }
  }
  return ''
}

// Function to extract full text from content
function extractFullText(content: any): string {
  if (!content || typeof content !== 'object' || !('root' in content)) {
    return ''
  }
  return extractTextFromLexical(content.root)
}

async function debugAllPosts() {
  console.log('🔍 Debug All Posts')
  console.log('==================\n')

  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

  try {
    // Fetch all posts
    console.log(`📡 Fetching posts from ${baseUrl}/api/posts...`)

    const response = await fetch(
      `${baseUrl}/api/posts?limit=1000&depth=0&select=id,title,content,authors,publishedAt`,
    )

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const posts = data.docs || []

    console.log(`📊 Found ${posts.length} posts\n`)

    let postsWithContent = 0
    let postsWithoutContent = 0
    let postsWithNullContent = 0
    let postsWithEmptyContent = 0
    let postsWithValidContent = 0

    posts.forEach((post: any, index: number) => {
      if (post.content === null || post.content === undefined) {
        postsWithNullContent++
        return
      }

      if (typeof post.content !== 'object') {
        postsWithEmptyContent++
        return
      }

      if (!post.content.root) {
        postsWithEmptyContent++
        return
      }

      postsWithContent++

      const fullText = extractFullText(post.content)

      if (fullText.length > 100) {
        postsWithValidContent++

        // Check first few posts for signatures
        if (index < 10) {
          console.log(`Post ${index + 1}: ${post.title}`)
          console.log(`  Content length: ${fullText.length}`)

          // Check for known signatures
          const signatures = ['Silvana Bașa', 'George Olteanu', 'Cristian Muntean']
          signatures.forEach((sig) => {
            if (fullText.includes(sig)) {
              console.log(`  ✅ Found: "${sig}"`)
            }
          })
          console.log('')
        }
      }

      // Progress indicator
      if ((index + 1) % 50 === 0) {
        console.log(`📝 Processed ${index + 1} posts...`)
      }
    })

    console.log('\n📊 Content Analysis Summary:')
    console.log('='.repeat(40))
    console.log(`Total posts: ${posts.length}`)
    console.log(`Posts with null/undefined content: ${postsWithNullContent}`)
    console.log(`Posts with empty/invalid content: ${postsWithEmptyContent}`)
    console.log(`Posts with content object: ${postsWithContent}`)
    console.log(`Posts with valid content (>100 chars): ${postsWithValidContent}`)
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugAllPosts().catch(console.error)
