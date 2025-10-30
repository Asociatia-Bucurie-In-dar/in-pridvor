#!/usr/bin/env tsx

import { createRequire } from 'module'
import { config } from 'dotenv'
import { XMLParser } from 'fast-xml-parser'
import path from 'path'
import fs from 'fs'

const require = createRequire(import.meta.url)

config()

if (!process.env.POSTGRES_URL) {
  console.error('❌ POSTGRES_URL missing in .env')
  process.exit(1)
}

interface ParsedPost {
  title: string
  slug: string
  originalSlug?: string
  status: string
  postType: string
  content: string
  publishedDate: string
  categories: string[]
  reason?: string
  wpPostId?: string
}

class MissingPostsDiagnostic {
  private importedPosts = new Map<string, ParsedPost>()
  private skippedPosts = new Map<string, ParsedPost>()
  private errorPosts = new Map<string, ParsedPost>()
  private xmlPosts: ParsedPost[] = []

  async run() {
    console.log('🔍 Starting missing posts diagnostic...')
    console.log('─'.repeat(50))

    const xmlFilePath = process.argv[2]
    if (!xmlFilePath) {
      console.error('❌ Please provide XML file path as argument')
      console.log('Usage: pnpm exec tsx scripts/diagnose-missing-posts.ts <path-to-xml-file>')
      process.exit(1)
    }

    if (!fs.existsSync(xmlFilePath)) {
      console.error(`❌ XML file not found: ${xmlFilePath}`)
      process.exit(1)
    }

    try {
      const { Pool } = await import('pg')
      const pool = new Pool({
        connectionString: process.env.POSTGRES_URL,
      })

      console.log('📡 Connected to database')
      console.log('─'.repeat(50))

      await this.loadXmlPosts(xmlFilePath)
      await this.loadImportedPosts(pool)

      this.analyzeMissingPosts()

      this.printReport()

      await pool.end()
    } catch (error) {
      console.error('❌ Diagnostic failed:', error)
      process.exit(1)
    }
  }

  private async loadXmlPosts(xmlFilePath: string) {
    console.log('\n📄 Loading posts from XML file...')
    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: 'text',
      isArray: (name) => {
        if (name === 'wp:postmeta' || name === 'category') return true
        return false
      },
    })

    const xmlData = parser.parse(xmlContent)
    const posts = xmlData.rss.channel.item || []

    console.log(`   Found ${posts.length} items in XML`)

    const formatSlug = (str: string): string => {
      return str
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
    }

    for (const post of posts) {
      if (post['wp:post_type'] === 'post') {
        const title = post.title || 'Untitled'
        const rawSlug = post['wp:post_name'] || title
        const slug = formatSlug(rawSlug)
        const content = post['content:encoded'] || post.description || ''
        const status = post['wp:status'] || 'unknown'
        const postType = post['wp:post_type'] || 'unknown'
        const wpPostId = post['wp:post_id']

        const categories = Array.isArray(post.category)
          ? post.category
              .filter((cat: any) => {
                const domain = cat?.['@_domain'] || cat?.domain
                return domain === 'category'
              })
              .map((cat: any) => {
                return cat?.text || cat?.['#text'] || cat?.['@_nicename'] || cat?.nicename || cat
              })
              .filter((cat: any) => cat && typeof cat === 'string')
          : []

        const parsedPost: ParsedPost = {
          title,
          slug,
          originalSlug: post['wp:post_name'],
          status,
          postType,
          content,
          publishedDate: post.pubDate || '',
          categories,
          wpPostId,
        }

        this.xmlPosts.push(parsedPost)
      }
    }

    console.log(`   Found ${this.xmlPosts.length} posts in XML`)
  }

  private async loadImportedPosts(pool: any) {
    console.log('\n📊 Loading imported posts from database...')

    const result = await pool.query('SELECT id, title, slug FROM posts')
    const dbSlugs = new Set(result.rows.map((row: any) => row.slug))

    console.log(`   Found ${dbSlugs.size} posts in database`)

    for (const xmlPost of this.xmlPosts) {
      if (dbSlugs.has(xmlPost.slug)) {
        this.importedPosts.set(xmlPost.slug, xmlPost)
      } else {
        let reason = 'NOT FOUND IN DATABASE'

        if (xmlPost.status !== 'publish') {
          reason = `Status is "${xmlPost.status}" (only "publish" posts are imported)`
          this.skippedPosts.set(xmlPost.slug, { ...xmlPost, reason })
        } else if (!xmlPost.content || xmlPost.content.trim().length === 0) {
          reason = 'Content is empty (content field is required)'
          this.errorPosts.set(xmlPost.slug, { ...xmlPost, reason })
        } else {
          this.errorPosts.set(xmlPost.slug, { ...xmlPost, reason })
        }
      }
    }

    const duplicateSlugs = new Map<string, ParsedPost[]>()
    for (const post of this.xmlPosts) {
      if (!duplicateSlugs.has(post.slug)) {
        duplicateSlugs.set(post.slug, [])
      }
      duplicateSlugs.get(post.slug)!.push(post)
    }

    for (const [slug, posts] of duplicateSlugs) {
      if (posts.length > 1) {
        for (let i = 1; i < posts.length; i++) {
          const duplicatePost = posts[i]
          if (!this.importedPosts.has(slug)) {
            duplicatePost.reason = `Slug conflict: "${slug}" is used by "${posts[0].title}" (only first will be imported)`
            this.skippedPosts.set(`${slug}-${duplicatePost.wpPostId}`, duplicatePost)
          }
        }
      }
    }
  }

  private analyzeMissingPosts() {
    console.log('\n🔍 Analyzing missing posts...')
  }

  private printReport() {
    console.log('\n' + '='.repeat(50))
    console.log('📊 MISSING POSTS DIAGNOSTIC REPORT')
    console.log('='.repeat(50))

    console.log(`\n✅ Imported: ${this.importedPosts.size} posts`)
    console.log(`⚠️  Skipped: ${this.skippedPosts.size} posts`)
    console.log(`❌ Missing/Errors: ${this.errorPosts.size} posts`)
    console.log(`📝 Total in XML: ${this.xmlPosts.length} posts`)

    if (this.skippedPosts.size > 0) {
      console.log('\n' + '─'.repeat(50))
      console.log('⚠️  SKIPPED POSTS (by status or slug conflict):')
      console.log('─'.repeat(50))
      for (const [key, post] of this.skippedPosts) {
        console.log(`\n   Title: "${post.title}"`)
        console.log(`   Original Slug: ${post.originalSlug || 'N/A'}`)
        console.log(`   Normalized Slug: ${post.slug}`)
        console.log(`   Status: ${post.status}`)
        console.log(`   WordPress ID: ${post.wpPostId || 'N/A'}`)
        console.log(`   Reason: ${post.reason}`)
      }
    }

    if (this.errorPosts.size > 0) {
      console.log('\n' + '─'.repeat(50))
      console.log('❌ MISSING POSTS (not found in database):')
      console.log('─'.repeat(50))
      for (const [key, post] of this.errorPosts) {
        console.log(`\n   Title: "${post.title}"`)
        console.log(`   Original Slug: ${post.originalSlug || 'N/A'}`)
        console.log(`   Normalized Slug: ${post.slug}`)
        console.log(`   Status: ${post.status}`)
        console.log(`   WordPress ID: ${post.wpPostId || 'N/A'}`)
        console.log(`   Content Length: ${post.content.length} chars`)
        console.log(`   Reason: ${post.reason}`)
        if (post.categories.length > 0) {
          console.log(`   Categories: ${post.categories.join(', ')}`)
        }
      }
    }

    const missingCount = this.errorPosts.size + this.skippedPosts.size
    if (missingCount > 0) {
      console.log('\n' + '='.repeat(50))
      console.log('💡 RECOMMENDATIONS:')
      console.log('='.repeat(50))
      console.log('\n1. Check skipped posts - they may have non-publish status')
      console.log('2. Review slug conflicts - multiple posts may normalize to the same slug')
      console.log('3. Check server logs during import for validation errors')
      console.log('4. Verify posts with empty content are handled correctly')
      console.log('\nTo manually import missing posts:')
      console.log('  - Export them from WordPress as a separate XML')
      console.log('  - Or manually create them in the admin panel')
      console.log('  - Or modify the import script to handle edge cases')
    } else {
      console.log('\n✅ All posts from XML are imported!')
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const diagnostic = new MissingPostsDiagnostic()
  diagnostic.run().catch((error) => {
    console.error('❌ Diagnostic failed:', error)
    process.exit(1)
  })
}

