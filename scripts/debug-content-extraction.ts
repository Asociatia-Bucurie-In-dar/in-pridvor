#!/usr/bin/env tsx

/**
 * Debug Content Extraction
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

async function debugContentExtraction() {
  console.log('🔍 Debug Content Extraction')
  console.log('===========================\n')

  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

  try {
    // Fetch just one post
    const response = await fetch(`${baseUrl}/api/posts?limit=1&depth=0`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    const posts = data.docs || []

    if (posts.length > 0) {
      const post = posts[0]
      console.log(`Post: ${post.title}`)
      console.log(`Content type: ${typeof post.content}`)

      if (post.content) {
        console.log(`Content keys: ${Object.keys(post.content).join(', ')}`)

        const fullText = extractFullText(post.content)
        console.log(`Extracted text length: ${fullText.length}`)

        if (fullText.length > 0) {
          console.log(`First 200 chars: "${fullText.substring(0, 200)}..."`)
          console.log(
            `Last 200 chars: "...${fullText.substring(Math.max(0, fullText.length - 200))}"`,
          )

          // Check for known signatures
          const signatures = ['Silvana Bașa', 'George Olteanu', 'Cristian Muntean']
          signatures.forEach((sig) => {
            if (fullText.includes(sig)) {
              console.log(`✅ Found signature: "${sig}"`)
            } else {
              console.log(`❌ Not found: "${sig}"`)
            }
          })
        } else {
          console.log('❌ No text extracted')
        }
      } else {
        console.log('❌ No content found')
      }
    } else {
      console.log('❌ No posts found')
    }
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

debugContentExtraction().catch(console.error)
