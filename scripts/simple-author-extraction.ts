#!/usr/bin/env tsx

/**
 * Simple Author Extraction
 * 
 * This script manually extracts author signatures from the end of posts
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

// Function to extract author signature from the end of content
function extractAuthorFromEnd(content: string): string | null {
  // Get the last 500 characters
  const lastPart = content.substring(Math.max(0, content.length - 500))
  
  // Look for common signature patterns
  const patterns = [
    // Patterns with titles
    /Pr\.\s+([A-Z][a-z]+(?:\-[A-Z][a-z]+)?\s+[A-Z][a-z]+)/,
    /Dr\.\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /Ierom\.\s+([A-Z][a-z]+(?:\s+\([^)]+\))?)/,
    /monah\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    
    // Translation patterns
    /Traducere\s+de\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+\([^)]+\))?)/,
    
    // Book/volume patterns
    /Din\s+„.*"\.?\s*de\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /Din\s+volumul.*de\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    /Din\s+predica.*Traducere\s+de\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/,
    
    // Simple name patterns at the very end
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?=\s*$|Fotografie|Din|Traducere|Acuarelă|canvas)/,
  ]
  
  for (const pattern of patterns) {
    const matches = lastPart.match(pattern)
    if (matches && matches[1]) {
      let name = matches[1].trim()
      
      // Clean up the name
      name = name.replace(/\s*\([^)]*\)$/, '') // Remove parenthetical additions
      name = name.replace(/[.,;:!?]+$/, '') // Remove trailing punctuation
      
      // Validate the name (should be 2-3 words, reasonable length)
      const words = name.split(' ')
      if (words.length >= 2 && words.length <= 3 && name.length > 5 && name.length < 50) {
        // Check if it looks like a real name (starts with capital letters)
        if (words.every(word => /^[A-Z][a-z]+$/.test(word))) {
          return name
        }
      }
    }
  }
  
  return null
}

// Common Romanian names for validation
const ROMANIAN_NAMES = [
  'Ioan', 'Ion', 'Mihai', 'Gheorghe', 'Vasile', 'Nicolae', 'Petru', 'Andrei',
  'Dumitru', 'Alexandru', 'Constantin', 'Marin', 'Tudor', 'Radu', 'Cristian',
  'Maria', 'Elena', 'Ana', 'Ioana', 'Cristina', 'Andreea', 'Diana', 'Roxana',
  'Gabriela', 'Larisa', 'Simona', 'Carmen', 'Raluca', 'Alina', 'Daniela',
  'Silvana', 'George', 'Olteanu', 'Cristian', 'Muntean', 'Rafail', 'Noica',
  'Proclu', 'Nicău', 'Bașa', 'Ilioiu', 'Crin', 'Triandafil', 'Theodorescu',
  'Șerban', 'Madgearu', 'Anca', 'Stanciu', 'Sofronie', 'Cluci', 'Silviu',
  'Țigănuș', 'Horia', 'Popescu', 'Ionescu', 'Dumitrescu', 'Popa', 'Marin',
  'Stoica', 'Radu', 'Constantin', 'Nicolae', 'Vasile', 'Gheorghe', 'Mihai'
]

// Function to validate if a name looks Romanian
function isRomanianName(name: string): boolean {
  const nameParts = name.toLowerCase().split(' ')
  return nameParts.some(part => ROMANIAN_NAMES.some(romanianName => 
    part.includes(romanianName.toLowerCase()) || romanianName.toLowerCase().includes(part)
  ))
}

async function simpleAuthorExtraction() {
  console.log('🔍 Simple Author Extraction')
  console.log('===========================\n')
  
  const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'
  
  try {
    // Fetch posts from the API
    console.log(`📡 Fetching posts from ${baseUrl}/api/posts...`)
    
    const response = await fetch(`${baseUrl}/api/posts?limit=1000&depth=0&select=id,title,content,authors,publishedAt`)
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    const posts = data.docs || []
    
    console.log(`📊 Found ${posts.length} posts to analyze\n`)
    
    const authorStats: { [key: string]: { count: number, posts: string[], isRomanian: boolean } } = {}
    const postsWithSignatures: Array<{
      id: string,
      title: string,
      author: string,
      isRomanian: boolean,
      currentAuthors: string[]
    }> = []
    
    posts.forEach((post: any) => {
      const content = extractFullText(post.content)
      
      if (content.length > 100) {
        const author = extractAuthorFromEnd(content)
        
        if (author) {
          const isRomanian = isRomanianName(author)
          
          postsWithSignatures.push({
            id: post.id,
            title: post.title || 'Untitled',
            author,
            isRomanian,
            currentAuthors: post.authors?.map((a: any) => typeof a === 'string' ? a : a.id) || []
          })
          
          // Update author stats
          const key = author.toLowerCase()
          if (!authorStats[key]) {
            authorStats[key] = { count: 0, posts: [], isRomanian }
          }
          authorStats[key].count++
          authorStats[key].posts.push(post.title || 'Untitled')
          authorStats[key].isRomanian = isRomanian
        }
      }
    })
    
    console.log(`📝 Posts with detected signatures: ${postsWithSignatures.length}\n`)
    
    // Show author statistics
    console.log('👥 Detected Authors (sorted by frequency):')
    console.log('=' .repeat(80))
    
    const sortedAuthors = Object.entries(authorStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 25)
    
    sortedAuthors.forEach(([name, stats], index) => {
      const flag = stats.isRomanian ? '🇷🇴' : '❓'
      console.log(`${index + 1}. ${flag} ${name} (${stats.count} posts)`)
      console.log(`   Posts: ${stats.posts.slice(0, 3).join(', ')}${stats.posts.length > 3 ? '...' : ''}`)
    })
    
    // Show sample posts with signatures
    console.log('\n📋 Sample posts with signatures:')
    console.log('=' .repeat(80))
    
    postsWithSignatures.slice(0, 15).forEach((post, index) => {
      const flag = post.isRomanian ? '🇷🇴' : '❓'
      console.log(`${index + 1}. ${flag} ${post.title}`)
      console.log(`   Author: "${post.author}"`)
      console.log(`   Current authors: ${post.currentAuthors.length}`)
    })
    
    // Generate summary
    console.log('\n📊 Summary:')
    console.log('=' .repeat(50))
    console.log(`Total posts analyzed: ${posts.length}`)
    console.log(`Posts with signatures: ${postsWithSignatures.length}`)
    console.log(`Unique authors detected: ${Object.keys(authorStats).length}`)
    console.log(`Romanian names: ${Object.values(authorStats).filter(s => s.isRomanian).length}`)
    console.log(`Non-Romanian names: ${Object.values(authorStats).filter(s => !s.isRomanian).length}`)
    
    // Show authors ready for creation
    console.log('\n🎯 Authors Ready for Creation:')
    console.log('=' .repeat(50))
    const authorsForCreation = Object.entries(authorStats)
      .filter(([, stats]) => stats.count >= 1)
      .sort(([,a], [,b]) => b.count - a.count)
    
    authorsForCreation.forEach(([name, stats]) => {
      const flag = stats.isRomanian ? '🇷🇴' : '❓'
      console.log(`✅ ${flag} ${name} - ${stats.count} posts`)
    })
    
    console.log('\n🚀 Next Steps:')
    console.log('=' .repeat(50))
    console.log('1. Create author users for the detected names')
    console.log('2. Update posts to use the new authors instead of "Demo Author"')
    console.log(`3. Found ${authorsForCreation.length} authors ready for creation`)
    
  } catch (error) {
    console.error('❌ Error extracting authors:', error)
    console.log('\n💡 Make sure the development server is running: pnpm dev')
  }
}

simpleAuthorExtraction().catch(console.error)
