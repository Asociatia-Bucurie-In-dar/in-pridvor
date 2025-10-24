import { getPayload } from 'payload'
import config from '@payload-config'
import { XMLParser } from 'fast-xml-parser'
import fs from 'fs'
import path from 'path'

async function checkReformatErrors() {
  console.log('🔍 Checking for reformat errors...\n')

  const payload = await getPayload({ config })

  // Read XML file
  const xmlFilePath = path.join(process.cwd(), 'inpridvor.WordPress.2025-10-24.xml')
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    textNodeName: 'text',
  })

  const xmlData = parser.parse(xmlContent)
  const items = xmlData.rss.channel.item || []

  // Create a map of slug -> content
  const contentMap = new Map<string, string>()
  items.forEach((item: any) => {
    if (item['wp:post_type'] === 'post' && item['wp:status'] === 'publish') {
      const slug = item['wp:post_name']
      const content = item['content:encoded'] || ''
      if (slug && content) {
        contentMap.set(slug, content)
      }
    }
  })

  // Get all posts from database
  const existingPosts = await payload.find({
    collection: 'posts',
    limit: 0,
    depth: 0,
  })

  console.log(`📊 Total posts in DB: ${existingPosts.totalDocs}`)
  console.log(`📊 Total posts in XML: ${contentMap.size}\n`)

  let postsWithNoSlug = 0
  let postsWithNoContent = 0
  let postsWithEmptyContent = 0

  const missingContentPosts: string[] = []
  const emptyContentPosts: string[] = []

  for (const post of existingPosts.docs) {
    if (!post.slug) {
      postsWithNoSlug++
      continue
    }

    const htmlContent = contentMap.get(post.slug)

    if (!htmlContent) {
      postsWithNoContent++
      missingContentPosts.push(`"${post.title}" (slug: ${post.slug})`)
    } else if (htmlContent.trim().length === 0) {
      postsWithEmptyContent++
      emptyContentPosts.push(`"${post.title}" (slug: ${post.slug})`)
    }
  }

  console.log('📋 Summary:')
  console.log(`- Posts with no slug: ${postsWithNoSlug}`)
  console.log(`- Posts with no matching XML content: ${postsWithNoContent}`)
  console.log(`- Posts with empty XML content: ${postsWithEmptyContent}`)
  console.log(`- Posts that should have been updated: ${existingPosts.totalDocs - postsWithNoSlug - postsWithNoContent - postsWithEmptyContent}`)

  if (missingContentPosts.length > 0) {
    console.log(`\n⚠️ First 20 posts missing XML content:`)
    missingContentPosts.slice(0, 20).forEach((post) => console.log(`  - ${post}`))
  }

  if (emptyContentPosts.length > 0) {
    console.log(`\n⚠️ First 20 posts with empty XML content:`)
    emptyContentPosts.slice(0, 20).forEach((post) => console.log(`  - ${post}`))
  }

  process.exit(0)
}

checkReformatErrors().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})

