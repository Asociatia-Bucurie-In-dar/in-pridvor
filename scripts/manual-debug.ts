#!/usr/bin/env tsx

/**
 * Manual Debug - Check specific posts manually
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

async function manualDebug() {
  console.log('🔍 Manual Debug - Checking specific posts')
  console.log('==========================================\n')
  
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
  
  try {
    // Fetch just a few posts
    const response = await fetch(`${baseUrl}/api/posts?limit=5&depth=0`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const posts = data.docs || []
    
    posts.forEach((post: any, index: number) => {
      console.log(`--- Post ${index + 1}: ${post.title} ---`)
      
      const content = extractFullText(post.content)
      console.log(`Content length: ${content.length}`)
      
      if (content.length > 0) {
        // Show last 400 characters
        const lastPart = content.substring(Math.max(0, content.length - 400))
        console.log(`Last 400 characters:`)
        console.log(`"${lastPart}"`)
        console.log('')
        
        // Try to find signatures manually
        console.log('Manual signature detection:')
        
        // Look for "Silvana Bașa"
        if (lastPart.includes('Silvana Bașa')) {
          console.log('  ✅ Found: Silvana Bașa')
        }
        
        // Look for "George Olteanu"
        if (lastPart.includes('George Olteanu')) {
          console.log('  ✅ Found: George Olteanu')
        }
        
        // Look for "Pr. Cristian Muntean"
        if (lastPart.includes('Pr. Cristian Muntean')) {
          console.log('  ✅ Found: Pr. Cristian Muntean')
        }
        
        // Look for "Dr. Daniela Ilioiu"
        if (lastPart.includes('Dr. Daniela Ilioiu')) {
          console.log('  ✅ Found: Dr. Daniela Ilioiu')
        }
        
        // Look for "Ierom. Rafail"
        if (lastPart.includes('Ierom. Rafail')) {
          console.log('  ✅ Found: Ierom. Rafail')
        }
        
        // Look for "monah Proclu"
        if (lastPart.includes('monah Proclu')) {
          console.log('  ✅ Found: monah Proclu')
        }
        
        // Look for "Șerban Madgearu"
        if (lastPart.includes('Șerban Madgearu')) {
          console.log('  ✅ Found: Șerban Madgearu')
        }
        
        // Look for "Anca Stanciu"
        if (lastPart.includes('Anca Stanciu')) {
          console.log('  ✅ Found: Anca Stanciu')
        }
        
        console.log('')
      }
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

manualDebug().catch(console.error)
