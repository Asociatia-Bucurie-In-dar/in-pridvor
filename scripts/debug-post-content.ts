#!/usr/bin/env tsx

/**
 * Debug Post Content
 * 
 * This script examines the actual content structure of posts to understand
 * how signatures might be stored
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

async function debugPostContent() {
  console.log('🔍 Debug Post Content Structure')
  console.log('==============================\n')
  
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
  
  try {
    // Fetch a few posts to examine their content
    console.log(`📡 Fetching posts from ${baseUrl}/api/posts...`)
    
    const response = await fetch(`${baseUrl}/api/posts?limit=5&depth=0`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const posts = data.docs || []
    
    console.log(`📊 Examining ${posts.length} posts\n`)
    
    posts.forEach((post: any, index: number) => {
      console.log(`--- Post ${index + 1}: ${post.title} ---`)
      console.log(`ID: ${post.id}`)
      console.log(`Authors: ${post.authors?.length || 0}`)
      console.log(`Published: ${post.publishedAt}`)
      
      if (post.content) {
        console.log(`Content type: ${typeof post.content}`)
        console.log(`Content keys: ${Object.keys(post.content).join(', ')}`)
        
        if (post.content.root) {
          console.log(`Root type: ${typeof post.content.root}`)
          console.log(`Root keys: ${Object.keys(post.content.root).join(', ')}`)
          
          if (post.content.root.children) {
            console.log(`Children count: ${post.content.root.children.length}`)
            
            // Show first few children
            post.content.root.children.slice(0, 3).forEach((child: any, childIndex: number) => {
              console.log(`  Child ${childIndex + 1}: type=${child.type}, children=${child.children?.length || 0}`)
              if (child.children && child.children.length > 0) {
                child.children.slice(0, 2).forEach((grandchild: any, grandIndex: number) => {
                  console.log(`    Grandchild ${grandIndex + 1}: type=${grandchild.type}, text="${grandchild.text?.substring(0, 50) || 'no text'}..."`)
                })
              }
            })
          }
        }
        
        // Extract and show full text
        const fullText = extractFullText(post.content)
        console.log(`Full text length: ${fullText.length} characters`)
        console.log(`First 300 chars: "${fullText.substring(0, 300)}..."`)
        console.log(`Last 200 chars: "...${fullText.substring(Math.max(0, fullText.length - 200))}"`)
      } else {
        console.log('No content found')
      }
      
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error examining posts:', error)
    console.log('\n💡 Make sure the development server is running: pnpm dev')
  }
}

debugPostContent().catch(console.error)
