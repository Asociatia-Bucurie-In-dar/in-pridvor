import { getPayload } from 'payload'
import config from '../src/payload.config.js'

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

// Signature patterns to detect (same as analysis script)
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

async function createAuthorsAndUpdatePosts() {
  console.log('🚀 Creating authors and updating posts based on signatures...\n')
  
  try {
    const payload = await getPayload({ config })
    
    // Get all posts with content
    const posts = await payload.find({
      collection: 'posts',
      limit: 1000, // Get all posts
      select: {
        id: true,
        title: true,
        content: true,
        authors: true,
        publishedAt: true
      }
    })
    
    console.log(`📊 Found ${posts.docs.length} posts to process\n`)
    
    // First, collect all unique author names with high confidence
    const authorCandidates: { [key: string]: { name: string, count: number, confidence: number } } = {}
    
    posts.docs.forEach((post) => {
      const content = extractFullText(post.content)
      
      if (content.length > 100) { // Only analyze posts with substantial content
        const signatures = detectAuthorSignatures(content)
        
        signatures.forEach(sig => {
          if (sig.confidence >= 0.7) { // Only high confidence signatures
            const key = sig.name.toLowerCase()
            if (!authorCandidates[key]) {
              authorCandidates[key] = { name: sig.name, count: 0, confidence: sig.confidence }
            }
            authorCandidates[key].count++
            authorCandidates[key].confidence = Math.max(authorCandidates[key].confidence, sig.confidence)
          }
        })
      }
    })
    
    console.log(`👥 Found ${Object.keys(authorCandidates).length} potential authors\n`)
    
    // Create author users for high-confidence candidates
    const createdAuthors: { [key: string]: string } = {} // name -> user ID
    
    for (const [key, candidate] of Object.entries(authorCandidates)) {
      if (candidate.count >= 2 && candidate.confidence >= 0.7) { // At least 2 posts and high confidence
        try {
          // Check if user already exists
          const existingUsers = await payload.find({
            collection: 'users',
            where: {
              name: {
                equals: candidate.name
              }
            },
            limit: 1
          })
          
          if (existingUsers.docs.length > 0) {
            createdAuthors[key] = existingUsers.docs[0].id
            console.log(`✅ Author already exists: ${candidate.name} (${candidate.count} posts)`)
          } else {
            // Create new user
            const newUser = await payload.create({
              collection: 'users',
              data: {
                name: candidate.name,
                email: `${candidate.name.toLowerCase().replace(/\s+/g, '.')}@in-pridvor.ro`,
                password: 'temp-password-123' // Will need to be changed
              }
            })
            
            createdAuthors[key] = newUser.id
            console.log(`🆕 Created author: ${candidate.name} (${candidate.count} posts) - ID: ${newUser.id}`)
          }
        } catch (error) {
          console.error(`❌ Failed to create author ${candidate.name}:`, error)
        }
      }
    }
    
    console.log(`\n📝 Created/found ${Object.keys(createdAuthors).length} authors\n`)
    
    // Now update posts with proper authors
    let updatedPosts = 0
    
    for (const post of posts.docs) {
      const content = extractFullText(post.content)
      
      if (content.length > 100) {
        const signatures = detectAuthorSignatures(content)
        
        if (signatures.length > 0) {
          // Find the best author for this post
          const bestSignature = signatures.find(sig => 
            createdAuthors[sig.name.toLowerCase()] && sig.confidence >= 0.7
          )
          
          if (bestSignature) {
            const authorId = createdAuthors[bestSignature.name.toLowerCase()]
            
            try {
              await payload.update({
                collection: 'posts',
                id: post.id,
                data: {
                  authors: [authorId]
                },
                context: {
                  disableRevalidate: true // Skip revalidation during bulk update
                }
              })
              
              updatedPosts++
              console.log(`✅ Updated "${post.title}" → ${bestSignature.name} (${(bestSignature.confidence * 100).toFixed(0)}% confidence)`)
            } catch (error) {
              console.error(`❌ Failed to update post "${post.title}":`, error)
            }
          }
        }
      }
    }
    
    console.log(`\n🎉 Summary:`)
    console.log(`📊 Total posts processed: ${posts.docs.length}`)
    console.log(`👥 Authors created/found: ${Object.keys(createdAuthors).length}`)
    console.log(`📝 Posts updated with authors: ${updatedPosts}`)
    
    // Show final author statistics
    console.log(`\n👥 Final Authors:`)
    console.log('=' .repeat(50))
    for (const [key, candidate] of Object.entries(authorCandidates)) {
      if (createdAuthors[key]) {
        console.log(`✅ ${candidate.name} (${candidate.count} posts, ${(candidate.confidence * 100).toFixed(0)}% confidence)`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing authors and posts:', error)
  }
  
  process.exit(0)
}

createAuthorsAndUpdatePosts().catch(console.error)
