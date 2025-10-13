#!/usr/bin/env tsx

/**
 * Comprehensive Author Search
 *
 * This script searches all posts for author signatures and creates
 * a comprehensive list for database optimization
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

async function comprehensiveAuthorSearch() {
  console.log('🔍 Comprehensive Author Search')
  console.log('===============================\n')

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

    console.log(`📊 Found ${posts.length} posts to analyze\n`)

    // Known signatures to look for (expanded list)
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
      'Horia Țigănuș',
      'Crin-Triandafil Theodorescu',
      'Mănăstirea Diaconești',
      'Arhim. Sofronie',
      'Ierom. Rafail',
      'Pr. Cristian Muntean',
      'Dr. Daniela Ilioiu',
      'Pr. Silviu Cluci',
      'Pr. Crin-Triandafil Theodorescu',
    ]

    const authorStats: { [key: string]: { count: number; posts: string[]; rawName: string } } = {}
    const postsWithSignatures: Array<{
      id: string
      title: string
      author: string
      currentAuthors: string[]
    }> = []

    let processedPosts = 0
    let postsWithContent = 0

    posts.forEach((post: any) => {
      processedPosts++

      const content = extractFullText(post.content)

      if (content.length > 100) {
        postsWithContent++

        // Check for each known signature
        for (const signature of knownSignatures) {
          if (content.includes(signature)) {
            postsWithSignatures.push({
              id: post.id,
              title: post.title || 'Untitled',
              author: signature,
              currentAuthors:
                post.authors?.map((a: any) => (typeof a === 'string' ? a : a.id)) || [],
            })

            // Normalize the author name (remove titles, etc.)
            let normalizedName = signature
            if (signature.includes('Pr. ')) normalizedName = signature.replace('Pr. ', '')
            if (signature.includes('Dr. ')) normalizedName = signature.replace('Dr. ', '')
            if (signature.includes('Ierom. ')) normalizedName = signature.replace('Ierom. ', '')
            if (signature.includes('Arhim. ')) normalizedName = signature.replace('Arhim. ', '')
            if (signature.includes(' (Noica)'))
              normalizedName = normalizedName.replace(' (Noica)', '')

            // Update author stats
            const key = normalizedName.toLowerCase()
            if (!authorStats[key]) {
              authorStats[key] = { count: 0, posts: [], rawName: signature }
            }
            authorStats[key].count++
            authorStats[key].posts.push(post.title || 'Untitled')

            break // Only count the first signature found
          }
        }

        // Progress indicator
        if (postsWithContent % 50 === 0) {
          console.log(`📝 Processed ${postsWithContent} posts with content...`)
        }
      }
    })

    console.log(`\n📝 Posts with detected signatures: ${postsWithSignatures.length}`)
    console.log(`📊 Posts with content: ${postsWithContent}`)
    console.log(`📊 Total posts processed: ${processedPosts}\n`)

    // Show author statistics
    console.log('👥 Detected Authors (sorted by frequency):')
    console.log('='.repeat(80))

    const sortedAuthors = Object.entries(authorStats).sort(([, a], [, b]) => b.count - a.count)

    sortedAuthors.forEach(([name, stats], index) => {
      console.log(`${index + 1}. ${stats.rawName} → ${name} (${stats.count} posts)`)
      console.log(
        `   Posts: ${stats.posts.slice(0, 3).join(', ')}${stats.posts.length > 3 ? '...' : ''}`,
      )
    })

    // Show sample posts with signatures
    console.log('\n📋 Sample posts with signatures:')
    console.log('='.repeat(80))

    postsWithSignatures.slice(0, 15).forEach((post, index) => {
      console.log(`${index + 1}. ${post.title}`)
      console.log(`   Author: "${post.author}"`)
      console.log(`   Current authors: ${post.currentAuthors.length}`)
    })

    // Generate summary
    console.log('\n📊 Summary:')
    console.log('='.repeat(50))
    console.log(`Total posts analyzed: ${posts.length}`)
    console.log(`Posts with content: ${postsWithContent}`)
    console.log(`Posts with signatures: ${postsWithSignatures.length}`)
    console.log(`Unique authors detected: ${Object.keys(authorStats).length}`)

    // Show authors ready for creation
    console.log('\n🎯 Authors Ready for Creation:')
    console.log('='.repeat(50))
    const authorsForCreation = Object.entries(authorStats)
      .filter(([, stats]) => stats.count >= 1)
      .sort(([, a], [, b]) => b.count - a.count)

    authorsForCreation.forEach(([name, stats]) => {
      console.log(`✅ ${name} - ${stats.count} posts (raw: "${stats.rawName}")`)
    })

    // Generate the data structure for the database update script
    console.log('\n🚀 Database Update Data:')
    console.log('='.repeat(50))
    console.log('Copy this data for the database update script:')
    console.log('')
    console.log('const AUTHOR_MAPPINGS = {')
    postsWithSignatures.forEach((post) => {
      console.log(`  "${post.id}": "${post.author}",`)
    })
    console.log('}')

    console.log('\nconst AUTHOR_USERS = [')
    authorsForCreation.forEach(([name, stats]) => {
      console.log(
        `  { name: "${name}", email: "${name.toLowerCase().replace(/\s+/g, '.')}@in-pridvor.ro" },`,
      )
    })
    console.log(']')
  } catch (error) {
    console.error('❌ Error extracting authors:', error)
    console.log('\n💡 Make sure the development server is running: pnpm dev')
  }
}

comprehensiveAuthorSearch().catch(console.error)
