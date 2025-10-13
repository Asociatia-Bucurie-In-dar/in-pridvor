#!/usr/bin/env tsx

/**
 * Simple String Search - Just look for known signatures
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

async function simpleStringSearch() {
  console.log('🔍 Simple String Search for Authors')
  console.log('===================================\n')
  
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
    
    // Known signatures to look for
    const knownSignatures = [
      'Silvana Bașa',
      'George Olteanu',
      'Anca Stanciu',
      'Șerban Madgearu',
      'Cristian Muntean',
      'Daniela Ilioiu',
      'Rafail (Noica)',
      'Proclu Nicău',
      'Sofronie',
      'Silviu Cluci',
      'Horia Țigănuș'
    ]
    
    const authorStats: { [key: string]: { count: number, posts: string[] } } = {}
    const postsWithSignatures: Array<{
      id: string,
      title: string,
      author: string,
      currentAuthors: string[]
    }> = []
    
    posts.forEach((post: any) => {
      const content = extractFullText(post.content)
      
      if (content.length > 100) {
        // Check for each known signature
        for (const signature of knownSignatures) {
          if (content.includes(signature)) {
            postsWithSignatures.push({
              id: post.id,
              title: post.title || 'Untitled',
              author: signature,
              currentAuthors: post.authors?.map((a: any) => typeof a === 'string' ? a : a.id) || []
            })
            
            // Update author stats
            const key = signature.toLowerCase()
            if (!authorStats[key]) {
              authorStats[key] = { count: 0, posts: [] }
            }
            authorStats[key].count++
            authorStats[key].posts.push(post.title || 'Untitled')
            
            break // Only count the first signature found
          }
        }
      }
    })
    
    console.log(`📝 Posts with detected signatures: ${postsWithSignatures.length}\n`)
    
    // Show author statistics
    console.log('👥 Detected Authors (sorted by frequency):')
    console.log('=' .repeat(80))
    
    const sortedAuthors = Object.entries(authorStats)
      .sort(([,a], [,b]) => b.count - a.count)
    
    sortedAuthors.forEach(([name, stats], index) => {
      console.log(`${index + 1}. ${name} (${stats.count} posts)`)
      console.log(`   Posts: ${stats.posts.slice(0, 3).join(', ')}${stats.posts.length > 3 ? '...' : ''}`)
    })
    
    // Show sample posts with signatures
    console.log('\n📋 Sample posts with signatures:')
    console.log('=' .repeat(80))
    
    postsWithSignatures.slice(0, 15).forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`)
      console.log(`   Author: "${post.author}"`)
      console.log(`   Current authors: ${post.currentAuthors.length}`)
    })
    
    // Generate summary
    console.log('\n📊 Summary:')
    console.log('=' .repeat(50))
    console.log(`Total posts analyzed: ${posts.length}`)
    console.log(`Posts with signatures: ${postsWithSignatures.length}`)
    console.log(`Unique authors detected: ${Object.keys(authorStats).length}`)
    
    // Show authors ready for creation
    console.log('\n🎯 Authors Ready for Creation:')
    console.log('=' .repeat(50))
    const authorsForCreation = Object.entries(authorStats)
      .filter(([, stats]) => stats.count >= 1)
      .sort(([,a], [,b]) => b.count - a.count)
    
    authorsForCreation.forEach(([name, stats]) => {
      console.log(`✅ ${name} - ${stats.count} posts`)
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

simpleStringSearch().catch(console.error)
