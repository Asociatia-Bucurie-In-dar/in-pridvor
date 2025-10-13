#!/usr/bin/env tsx

/**
 * Updated Author Analysis with Correct Patterns
 * 
 * This script analyzes posts for author signatures using patterns
 * that match the actual format found in the articles
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

// Updated signature patterns based on actual content analysis
const SIGNATURE_PATTERNS = [
  // Patterns at the beginning of articles
  { 
    pattern: /Parintele\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+ne\s+vorbeste/i, 
    type: 'beginning',
    description: 'Parintele Nume Prenume ne vorbeste'
  },
  { 
    pattern: /Ne\s+vorbește\s+Părintele\s+([A-Z][a-z]+)/i, 
    type: 'beginning',
    description: 'Ne vorbește Părintele Nume'
  },
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+ne\s+vorbeste/i, 
    type: 'beginning',
    description: 'Nume Prenume ne vorbeste'
  },
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+scrie/i, 
    type: 'beginning',
    description: 'Nume Prenume scrie'
  },
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+spune/i, 
    type: 'beginning',
    description: 'Nume Prenume spune'
  },
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+ne\s+invata/i, 
    type: 'beginning',
    description: 'Nume Prenume ne invata'
  },
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s+ne\s+indruma/i, 
    type: 'beginning',
    description: 'Nume Prenume ne indruma'
  },
  
  // Patterns at the end of articles (signatures) - based on actual content
  { 
    pattern: /^([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'Name at end of article (standalone)',
    confidence: 0.8
  },
  { 
    pattern: /^([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m, 
    type: 'end',
    description: 'Name at end with optional whitespace',
    confidence: 0.8
  },
  { 
    pattern: /Pr\.\s+([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'Pr. Nume Prenume at end',
    confidence: 0.9
  },
  { 
    pattern: /Părintele\s+([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'Părintele Nume Prenume at end',
    confidence: 0.9
  },
  { 
    pattern: /monah\s+([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'monah Nume Prenume at end',
    confidence: 0.9
  },
  { 
    pattern: /Ierom\.\s+([A-Z][a-z]+(?:\s+\([^)]+\))?)$/m, 
    type: 'end',
    description: 'Ierom. Nume (with optional parentheses)',
    confidence: 0.9
  },
  { 
    pattern: /Traducere\s+de\s+([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+\([^)]+\))?)$/m, 
    type: 'end',
    description: 'Traducere de Nume Prenume (with optional parentheses)',
    confidence: 0.9
  },
  { 
    pattern: /Din\s+volumul.*de\s+([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'Din volumul... de Nume Prenume',
    confidence: 0.8
  },
  { 
    pattern: /Din\s+„.*"\.?\s*de\s+([A-Z][a-z]+\s+[A-Z][a-z]+)$/m, 
    type: 'end',
    description: 'Din "..." de Nume Prenume',
    confidence: 0.8
  },
]

// Common Romanian names
const COMMON_ROMANIAN_NAMES = [
  'Ioan', 'Ion', 'Mihai', 'Gheorghe', 'Vasile', 'Nicolae', 'Petru', 'Andrei',
  'Dumitru', 'Alexandru', 'Constantin', 'Marin', 'Tudor', 'Radu', 'Cristian',
  'Maria', 'Elena', 'Ana', 'Ioana', 'Cristina', 'Andreea', 'Diana', 'Roxana',
  'Gabriela', 'Larisa', 'Simona', 'Carmen', 'Raluca', 'Alina', 'Daniela',
  'Silvana', 'George', 'Olteanu', 'Cristian', 'Muntean', 'Rafail', 'Noica',
  'Proclu', 'Nicău', 'Bașa'
]

// Function to check if a name looks like a Romanian name
function isRomanianName(name: string): boolean {
  const nameParts = name.toLowerCase().split(' ')
  return nameParts.some(part => COMMON_ROMANIAN_NAMES.some(romanianName => 
    part.includes(romanianName.toLowerCase()) || romanianName.toLowerCase().includes(part)
  ))
}

// Function to clean and normalize names
function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/, '')
    .replace(/^[.,;:!?]+/, '')
    .replace(/\s*\([^)]*\)$/, '') // Remove parenthetical additions like "(Noica)"
}

// Function to detect author signatures in content
function detectAuthorSignatures(content: string): Array<{name: string, type: string, confidence: number, pattern: string}> {
  const signatures: Array<{name: string, type: string, confidence: number, pattern: string}> = []
  
  for (const { pattern, type, description, confidence: baseConfidence = 0.5 } of SIGNATURE_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      const name = normalizeName(matches[1])
      if (name && name.length > 2 && name.length < 50) {
        let confidence = baseConfidence
        
        // Increase confidence based on various factors
        if (isRomanianName(name)) confidence += 0.2
        if (type === 'beginning') confidence += 0.1 // Beginning patterns are more reliable
        if (name.split(' ').length === 2) confidence += 0.1 // Two-word names are typical
        
        signatures.push({
          name,
          type,
          confidence: Math.min(confidence, 1.0), // Cap at 1.0
          pattern: description
        })
      }
    }
  }
  
  // Remove duplicates and sort by confidence
  const uniqueSignatures = signatures.reduce((acc, current) => {
    const existing = acc.find(item => item.name.toLowerCase() === current.name.toLowerCase())
    if (!existing || current.confidence > existing.confidence) {
      return [...acc.filter(item => item.name.toLowerCase() !== current.name.toLowerCase()), current]
    }
    return acc
  }, [] as typeof signatures)
  
  return uniqueSignatures.sort((a, b) => b.confidence - a.confidence)
}

async function updatedAuthorAnalysis() {
  console.log('🔍 Updated Author Signature Analysis')
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
    
    const authorStats: { [key: string]: { count: number, posts: string[], confidence: number } } = {}
    const postsWithSignatures: Array<{
      id: string,
      title: string,
      signatures: Array<{name: string, type: string, confidence: number, pattern: string}>,
      currentAuthors: string[]
    }> = []
    
    posts.forEach((post: any) => {
      const content = extractFullText(post.content)
      
      if (content.length > 100) {
        const signatures = detectAuthorSignatures(content)
        
        if (signatures.length > 0) {
          postsWithSignatures.push({
            id: post.id,
            title: post.title || 'Untitled',
            signatures,
            currentAuthors: post.authors?.map((a: any) => typeof a === 'string' ? a : a.id) || []
          })
          
          // Update author stats
          signatures.forEach(sig => {
            const key = sig.name.toLowerCase()
            if (!authorStats[key]) {
              authorStats[key] = { count: 0, posts: [], confidence: sig.confidence }
            }
            authorStats[key].count++
            authorStats[key].posts.push(post.title || 'Untitled')
            authorStats[key].confidence = Math.max(authorStats[key].confidence, sig.confidence)
          })
        }
      }
    })
    
    console.log(`📝 Posts with detected signatures: ${postsWithSignatures.length}\n`)
    
    // Show author statistics
    console.log('👥 Detected Authors (sorted by frequency):')
    console.log('=' .repeat(80))
    
    const sortedAuthors = Object.entries(authorStats)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 20)
    
    sortedAuthors.forEach(([name, stats], index) => {
      console.log(`${index + 1}. ${name} (${stats.count} posts, confidence: ${(stats.confidence * 100).toFixed(0)}%)`)
      console.log(`   Posts: ${stats.posts.slice(0, 3).join(', ')}${stats.posts.length > 3 ? '...' : ''}`)
    })
    
    // Show sample posts with signatures
    console.log('\n📋 Sample posts with signatures:')
    console.log('=' .repeat(80))
    
    postsWithSignatures.slice(0, 10).forEach((post, index) => {
      console.log(`\n${index + 1}. ${post.title}`)
      console.log(`   Current authors: ${post.currentAuthors.length}`)
      post.signatures.forEach(sig => {
        console.log(`   🎯 ${sig.type}: "${sig.name}" (${(sig.confidence * 100).toFixed(0)}% confidence, ${sig.pattern})`)
      })
    })
    
    // Generate summary
    console.log('\n📊 Summary:')
    console.log('=' .repeat(50))
    console.log(`Total posts analyzed: ${posts.length}`)
    console.log(`Posts with signatures: ${postsWithSignatures.length}`)
    console.log(`Unique authors detected: ${Object.keys(authorStats).length}`)
    console.log(`High confidence authors (>70%): ${Object.values(authorStats).filter(s => s.confidence > 0.7).length}`)
    
    // Show high-confidence authors for creation
    console.log('\n🎯 Recommended Authors for Creation:')
    console.log('=' .repeat(50))
    const highConfidenceAuthors = Object.entries(authorStats)
      .filter(([, stats]) => stats.confidence > 0.7 && stats.count >= 2)
      .sort(([,a], [,b]) => b.count - a.count)
    
    highConfidenceAuthors.forEach(([name, stats]) => {
      console.log(`✅ ${name} - ${stats.count} posts (${(stats.confidence * 100).toFixed(0)}% confidence)`)
    })
    
  } catch (error) {
    console.error('❌ Error analyzing signatures:', error)
    console.log('\n💡 Make sure the development server is running: pnpm dev')
  }
}

updatedAuthorAnalysis().catch(console.error)
