#!/usr/bin/env tsx

/**
 * Quick Author Signature Analysis
 * 
 * This script analyzes posts for author signatures without requiring
 * the full Payload environment setup.
 * 
 * Usage: npx tsx scripts/quick-author-analysis.ts
 */

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

// Signature patterns to detect
const SIGNATURE_PATTERNS = [
  // Patterns at the beginning of articles
  { 
    pattern: /Parintele\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s+ne\s+vorbeste/i, 
    type: 'beginning',
    description: 'Parintele Nume Prenume ne vorbeste'
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
  
  // Patterns at the end of articles (signatures)
  { 
    pattern: /([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m, 
    type: 'end',
    description: 'Name at end of article'
  },
  { 
    pattern: /Parintele\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m, 
    type: 'end',
    description: 'Parintele Nume Prenume at end'
  },
  { 
    pattern: /P\.\s*([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m, 
    type: 'end',
    description: 'P. Nume Prenume at end'
  },
  { 
    pattern: /Părintele\s+([A-Z][a-z]+\s+[A-Z][a-z]+)\s*$/m, 
    type: 'end',
    description: 'Părintele Nume Prenume at end'
  },
]

// Common Romanian names that might appear in signatures
const COMMON_ROMANIAN_NAMES = [
  'Ioan', 'Ion', 'Mihai', 'Gheorghe', 'Vasile', 'Nicolae', 'Petru', 'Andrei',
  'Dumitru', 'Alexandru', 'Constantin', 'Marin', 'Tudor', 'Radu', 'Cristian',
  'Maria', 'Elena', 'Ana', 'Ioana', 'Cristina', 'Andreea', 'Diana', 'Roxana',
  'Gabriela', 'Larisa', 'Simona', 'Carmen', 'Raluca', 'Alina', 'Daniela'
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
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[.,;:!?]+$/, '') // Remove trailing punctuation
    .replace(/^[.,;:!?]+/, '') // Remove leading punctuation
}

// Function to detect author signatures in content
function detectAuthorSignatures(content: string): Array<{name: string, type: string, confidence: number, pattern: string}> {
  const signatures: Array<{name: string, type: string, confidence: number, pattern: string}> = []
  
  for (const { pattern, type, description } of SIGNATURE_PATTERNS) {
    const matches = content.match(pattern)
    if (matches) {
      const name = normalizeName(matches[1])
      if (name && name.length > 3 && name.length < 50) {
        let confidence = 0.5
        
        // Increase confidence based on various factors
        if (isRomanianName(name)) confidence += 0.2
        if (type === 'beginning') confidence += 0.2 // Beginning patterns are more reliable
        if (name.split(' ').length === 2) confidence += 0.1 // Two-word names are typical
        
        signatures.push({
          name,
          type,
          confidence,
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

async function quickAuthorAnalysis() {
  console.log('🔍 Quick Author Signature Analysis')
  console.log('==================================\n')
  
  // Sample content for testing patterns
  const sampleContents = [
    'Parintele Ioan Popescu ne vorbeste despre...',
    'Mihai Dumitrescu scrie in articolul de astazi...',
    'Acesta este textul articolului...\n\nPărintele Vasile Ionescu',
    'Elena Popa ne invata despre...',
    'Textul articolului se termina aici.\n\nIoan Popescu',
    'P. Alexandru Marin',
  ]
  
  console.log('🧪 Testing signature detection on sample content:\n')
  
  sampleContents.forEach((content, index) => {
    console.log(`Sample ${index + 1}: "${content}"`)
    const signatures = detectAuthorSignatures(content)
    
    if (signatures.length > 0) {
      signatures.forEach(sig => {
        console.log(`  🎯 Found: "${sig.name}" (${sig.type}, ${(sig.confidence * 100).toFixed(0)}% confidence)`)
      })
    } else {
      console.log('  ❌ No signatures detected')
    }
    console.log('')
  })
  
  console.log('📋 Signature Patterns Used:')
  console.log('==========================')
  SIGNATURE_PATTERNS.forEach((pattern, index) => {
    console.log(`${index + 1}. ${pattern.description}`)
    console.log(`   Pattern: ${pattern.pattern}`)
    console.log(`   Type: ${pattern.type}\n`)
  })
  
  console.log('🇷🇴 Romanian Names Database:')
  console.log('============================')
  console.log(`Male names: ${COMMON_ROMANIAN_NAMES.filter(name => 
    ['Maria', 'Elena', 'Ana', 'Ioana', 'Cristina', 'Andreea', 'Diana', 'Roxana', 'Gabriela', 'Larisa', 'Simona', 'Carmen', 'Raluca', 'Alina', 'Daniela'].includes(name)
  ).length} names`)
  console.log(`Female names: ${COMMON_ROMANIAN_NAMES.filter(name => 
    !['Maria', 'Elena', 'Ana', 'Ioana', 'Cristina', 'Andreea', 'Diana', 'Roxana', 'Gabriela', 'Larisa', 'Simona', 'Carmen', 'Raluca', 'Alina', 'Daniela'].includes(name)
  ).length} names`)
  console.log(`Total: ${COMMON_ROMANIAN_NAMES.length} names`)
  
  console.log('\n✅ Analysis complete!')
  console.log('\nNext steps:')
  console.log('1. Run the full analysis: npx tsx scripts/analyze-author-signatures.ts')
  console.log('2. Create authors and update posts: npx tsx scripts/create-authors-and-update-posts.ts')
}

quickAuthorAnalysis().catch(console.error)
