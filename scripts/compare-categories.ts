// Compare existing categories with XML categories

import fs from 'fs'
import { parseString } from 'xml2js'

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

async function compareCategories() {
  console.log('🔍 Comparing existing vs XML categories...')
  console.log('==========================================\n')

  try {
    // Fetch existing categories
    const response = await fetch(`${baseUrl}/api/categories?limit=1000`)

    if (!response.ok) {
      console.log(`❌ Failed to fetch categories: ${response.statusText}`)
      return
    }

    const data = await response.json()
    const existingCategories = data.docs || []

    console.log(`📊 Found ${existingCategories.length} existing categories`)

    // Parse XML for categories
    const xmlFilePath = '/Users/fabi/Documents/GitHub/in-pridvor/inpridvor.WordPress.2025-10-24.xml'
    const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8')

    const xmlCategories = new Set<string>()

    await new Promise((resolve, reject) => {
      parseString(xmlContent, (err, result) => {
        if (err) {
          reject(err)
          return
        }

        const items = result.rss.channel[0].item || []

        for (const item of items) {
          const postType = item['wp:post_type']?.[0]
          const status = item['wp:status']?.[0]

          if (postType === 'post' && status === 'publish') {
            if (item.category) {
              for (const cat of item.category) {
                const catName = cat._ || cat
                if (typeof catName === 'string' && catName.trim()) {
                  xmlCategories.add(catName.trim())
                }
              }
            }
          }
        }

        resolve(undefined)
      })
    })

    console.log(`📊 Found ${xmlCategories.size} categories in XML`)

    // Compare categories
    const existingTitles = existingCategories.map((cat) => cat.title)
    const xmlCategoriesArray = Array.from(xmlCategories)

    const missingCategories = xmlCategoriesArray.filter((cat) => !existingTitles.includes(cat))
    const existingMatches = xmlCategoriesArray.filter((cat) => existingTitles.includes(cat))

    console.log('\n✅ Categories that already exist:')
    console.log('=================================')
    existingMatches.forEach((cat) => {
      const existing = existingCategories.find((ec) => ec.title === cat)
      console.log(`  - ${cat} (ID: ${existing.id}, slug: ${existing.slug})`)
    })

    console.log('\n❌ Categories that need to be created:')
    console.log('=====================================')
    if (missingCategories.length === 0) {
      console.log('  🎉 All categories already exist!')
    } else {
      missingCategories.forEach((cat) => {
        const slug = cat
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        console.log(`  - ${cat} (slug: ${slug})`)
      })
    }

    console.log('\n📋 Summary:')
    console.log('===========')
    console.log(`Total existing categories: ${existingCategories.length}`)
    console.log(`Total XML categories: ${xmlCategories.size}`)
    console.log(`Categories to create: ${missingCategories.length}`)
    console.log(`Categories to reuse: ${existingMatches.length}`)

    if (missingCategories.length > 0) {
      console.log('\n🎯 Next steps:')
      console.log('1. Create only the missing categories')
      console.log('2. Use existing category IDs for posts')
      console.log('3. Import posts with correct category relationships')
    } else {
      console.log('\n🎉 All categories already exist!')
      console.log('You can proceed directly to importing posts.')
    }

    // Generate category mapping for posts
    console.log('\n📝 Category ID mapping for posts:')
    console.log('=================================')
    xmlCategoriesArray.forEach((cat) => {
      const existing = existingCategories.find((ec) => ec.title === cat)
      if (existing) {
        console.log(`"${cat}" → ID: ${existing.id}`)
      }
    })
  } catch (error) {
    console.error('❌ Error comparing categories:', error)
  }
}

compareCategories().catch(console.error)
