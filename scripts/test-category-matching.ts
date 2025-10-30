import { createRequire } from 'module'
const require = createRequire(import.meta.url)

require('dotenv').config()

import { getPayload } from 'payload'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'
import { formatSlug } from '../src/fields/slug/formatSlug'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function testCategoryMatching() {
  console.log('🧪 Testing category matching logic...\n')

  const xmlPath = path.join(__dirname, '../inpridvor.WordPress.2025-10-24.xml')

  if (!fs.existsSync(xmlPath)) {
    console.error('❌ WordPress XML file not found at:', xmlPath)
    return
  }

  const config = await import('../src/payload.config')
  const payload = await getPayload({ config: config.default })

  console.log('📖 Loading categories from database...')
  const allCategories = await payload.find({
    collection: 'categories',
    limit: 0,
    depth: 0,
  })

  console.log(`✅ Found ${allCategories.docs.length} categories in database\n`)

  if (allCategories.docs.length === 0) {
    console.error('❌ No categories found in database!')
    return
  }

  console.log('📋 Categories in database:')
  const categoryMapBySlug = new Map<string, { id: number | string; title: string; slug: string }>()
  const categoryMapByTitle = new Map<string, { id: number | string; title: string; slug: string }>()

  for (const category of allCategories.docs) {
    const slug = category.slug || formatSlug(category.title || '')
    const categoryId = typeof category.id === 'number' ? category.id : category.id.toString()

    categoryMapBySlug.set(slug.toLowerCase().trim(), {
      id: categoryId,
      title: category.title || '',
      slug: slug,
    })

    categoryMapByTitle.set((category.title || '').toLowerCase().trim(), {
      id: categoryId,
      title: category.title || '',
      slug: slug,
    })

    console.log(`   - ID: ${categoryId}, Title: "${category.title}", Slug: "${slug}"`)
  }

  console.log('\n📄 Parsing WordPress XML...')
  const xmlContent = fs.readFileSync(xmlPath, 'utf-8')

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

  console.log(`✅ Found ${posts.length} items in XML\n`)

  const allXmlCategories = new Set<string>()
  const categoryPostMap = new Map<string, string[]>() // category -> [post titles]

  for (const post of posts) {
    if (post['wp:post_type'] === 'post' && post['wp:status'] === 'publish') {
      const title = post.title || 'Untitled'

      // Debug: log the category structure for first post
      if (!allXmlCategories.size) {
        console.log('\n🔍 Debugging category extraction from first post:')
        console.log('   Post title:', title)
        console.log('   post.category type:', typeof post.category)
        console.log('   post.category is array:', Array.isArray(post.category))
        console.log('   post.category value:', JSON.stringify(post.category, null, 2))
      }

      let categories: string[] = []

      if (Array.isArray(post.category)) {
        categories = post.category
          .filter((cat: any) => {
            const domain = cat?.['@_domain'] || cat?.domain
            return domain === 'category'
          })
          .map((cat: any) => {
            return cat?.['@_nicename'] || cat?.nicename || cat?.['#text'] || cat?.text || cat
          })
          .filter((cat: any) => cat && typeof cat === 'string')
      } else if (post.category) {
        const cat = post.category
        const domain = cat?.['@_domain'] || cat?.domain
        if (domain === 'category') {
          const catName =
            cat?.['@_nicename'] || cat?.nicename || cat?.['#text'] || cat?.text || cat
          if (catName && typeof catName === 'string') {
            categories = [catName]
          }
        }
      }

      if (!allXmlCategories.size && categories.length > 0) {
        console.log('   ✅ Extracted categories:', categories)
      } else if (!allXmlCategories.size && categories.length === 0) {
        console.log('   ⚠️  No categories extracted')
      }

      for (const catName of categories) {
        if (catName && typeof catName === 'string') {
          allXmlCategories.add(catName)
          if (!categoryPostMap.has(catName)) {
            categoryPostMap.set(catName, [])
          }
          categoryPostMap.get(catName)?.push(title)
        }
      }
    }
  }

  console.log(`📂 Found ${allXmlCategories.size} unique categories in XML:\n`)
  for (const catName of Array.from(allXmlCategories).sort()) {
    const posts = categoryPostMap.get(catName) || []
    console.log(`   - "${catName}" (used in ${posts.length} posts)`)
  }

  console.log('\n🔍 Testing matching logic...\n')

  let matchedCount = 0
  let unmatchedCount = 0
  const unmatched: string[] = []

  for (const xmlCategoryName of Array.from(allXmlCategories).sort()) {
    const xmlCategorySlug = formatSlug(xmlCategoryName).toLowerCase().trim()

    console.log(`\n📝 Testing: "${xmlCategoryName}"`)
    console.log(`   XML Slug: "${xmlCategorySlug}"`)

    let matchingCategory = categoryMapByTitle.get(xmlCategoryName.toLowerCase().trim())

    if (matchingCategory) {
      console.log(`   ✅ EXACT TITLE MATCH: "${matchingCategory.title}" (ID: ${matchingCategory.id}, Slug: "${matchingCategory.slug}")`)
      matchedCount++
    } else {
      console.log(`   ❌ No exact title match`)
      console.log(`   🔍 Trying slug-based fuzzy match...`)

      matchingCategory = categoryMapBySlug.get(xmlCategorySlug)

      if (matchingCategory) {
        console.log(`   ✅ SLUG MATCH: "${matchingCategory.title}" (ID: ${matchingCategory.id}, Slug: "${matchingCategory.slug}")`)
        matchedCount++
      } else {
        console.log(`   ❌ No slug match found`)
        console.log(`   📊 Checking all database slugs for similar ones:`)

        let foundSimilar = false
        for (const [dbSlug, dbCat] of categoryMapBySlug) {
          if (
            dbSlug.includes(xmlCategorySlug) ||
            xmlCategorySlug.includes(dbSlug) ||
            dbSlug.length > 0 &&
              xmlCategorySlug.length > 0 &&
              (dbSlug.startsWith(xmlCategorySlug.substring(0, 3)) ||
                xmlCategorySlug.startsWith(dbSlug.substring(0, 3)))
          ) {
            console.log(`      - Similar: "${dbCat.title}" (Slug: "${dbSlug}")`)
            foundSimilar = true
          }
        }

        if (!foundSimilar) {
          console.log(`      - No similar slugs found`)
        }

        unmatchedCount++
        unmatched.push(xmlCategoryName)
      }
    }
  }

  console.log('\n📊 SUMMARY:')
  console.log(`   ✅ Matched: ${matchedCount}/${allXmlCategories.size}`)
  console.log(`   ❌ Unmatched: ${unmatchedCount}/${allXmlCategories.size}`)

  if (unmatched.length > 0) {
    console.log(`\n❌ Unmatched categories from XML:`)
    for (const cat of unmatched) {
      const xmlSlug = formatSlug(cat).toLowerCase().trim()
      const posts = categoryPostMap.get(cat) || []
      console.log(`   - "${cat}" (slug: "${xmlSlug}") - used in ${posts.length} posts`)
    }
  }

  console.log('\n✅ Test completed!')
}

testCategoryMatching()
  .then(() => {
    console.log('\n✅ Test finished!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error during test:', error)
    process.exit(1)
  })

