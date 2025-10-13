#!/usr/bin/env tsx

/**
 * Debug Signatures
 * 
 * This script examines the exact format of signatures in posts
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

async function debugSignatures() {
  console.log('🔍 Debug Signature Patterns')
  console.log('==========================\n')
  
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
  
  try {
    // Fetch a few posts to examine their signatures
    console.log(`📡 Fetching posts from ${baseUrl}/api/posts...`)
    
    const response = await fetch(`${baseUrl}/api/posts?limit=10&depth=0`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const posts = data.docs || []
    
    console.log(`📊 Examining ${posts.length} posts for signatures\n`)
    
    posts.forEach((post: any, index: number) => {
      console.log(`--- Post ${index + 1}: ${post.title} ---`)
      
      const content = extractFullText(post.content)
      
      if (content.length > 100) {
        // Get the last 300 characters to see signatures
        const lastPart = content.substring(Math.max(0, content.length - 300))
        console.log(`Last 300 characters:`)
        console.log(`"${lastPart}"`)
        
        // Try to find patterns manually
        const lines = lastPart.split('\n').filter(line => line.trim().length > 0)
        const lastLines = lines.slice(-5) // Last 5 non-empty lines
        
        console.log(`Last 5 non-empty lines:`)
        lastLines.forEach((line, lineIndex) => {
          console.log(`  ${lineIndex + 1}: "${line}"`)
          
          // Check if this looks like a signature
          const trimmed = line.trim()
          if (trimmed.length > 3 && trimmed.length < 50 && /^[A-Z]/.test(trimmed)) {
            console.log(`    🎯 Potential signature: "${trimmed}"`)
          }
        })
        
        // Also check for patterns that might indicate author info
        const authorPatterns = [
          /Pr\.\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
          /Părintele\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
          /monah\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
          /Ierom\.\s+[A-Z][a-z]+/,
          /Traducere\s+de\s+[A-Z][a-z]+\s+[A-Z][a-z]+/,
          /^[A-Z][a-z]+\s+[A-Z][a-z]+$/,
        ]
        
        console.log(`Pattern matches:`)
        authorPatterns.forEach((pattern, patternIndex) => {
          const matches = lastPart.match(pattern)
          if (matches) {
            console.log(`  Pattern ${patternIndex + 1}: "${matches[0]}"`)
          }
        })
      }
      
      console.log('')
    })
    
  } catch (error) {
    console.error('❌ Error examining signatures:', error)
    console.log('\n💡 Make sure the development server is running: pnpm dev')
  }
}

debugSignatures().catch(console.error)
