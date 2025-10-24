// Check existing categories in the database and compare with XML categories

const baseUrl = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'

async function checkExistingCategories() {
  console.log('🔍 Checking existing categories...')
  console.log('==================================\n')

  try {
    // Fetch existing categories
    const response = await fetch(`${baseUrl}/api/categories?limit=1000`)

    if (!response.ok) {
      console.log(`❌ Failed to fetch categories: ${response.statusText}`)
      return
    }

    const data = await response.json()
    const existingCategories = data.docs || []

    console.log(`📊 Found ${existingCategories.length} existing categories:`)
    console.log('----------------------------------------')

    existingCategories.forEach((category, index) => {
      console.log(`${index + 1}. ${category.title} (slug: ${category.slug})`)
    })

    // Now let's get the categories from the XML
    console.log('\n📖 Parsing XML for categories...')
    console.log('--------------------------------')

    const fs = await import('fs')
    const { parseString } = await import('xml2js')

    const xmlFilePath = '/Users/fabi/Documents/GitHub/in-pridvor/inpridvor.WordPress.2025-10-24.xml'
    const xmlContent = fs.default.readFileSync(xmlFilePath, 'utf-8')

    const xmlCategories = new Set<string>()

    parseString.default(xmlContent, (err, result) => {
      if (err) {
        console.error('❌ Error parsing XML:', err)
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

      console.log(`📊 Found ${xmlCategories.size} categories in XML:`)
      console.log('----------------------------------------')

      Array.from(xmlCategories)
        .sort()
        .forEach((category, index) => {
          console.log(`${index + 1}. ${category}`)
        })

      // Compare existing vs XML categories
      console.log('\n🔄 Comparing categories...')
      console.log('==========================')

      const existingTitles = existingCategories.map((cat) => cat.title)
      const xmlCategoriesArray = Array.from(xmlCategories)

      const missingCategories = xmlCategoriesArray.filter((cat) => !existingTitles.includes(cat))
      const existingMatches = xmlCategoriesArray.filter((cat) => existingTitles.includes(cat))

      console.log(`✅ Categories that already exist (${existingMatches.length}):`)
      existingMatches.forEach((cat) => {
        const existing = existingCategories.find((ec) => ec.title === cat)
        console.log(`  - ${cat} (ID: ${existing.id}, slug: ${existing.slug})`)
      })

      console.log(`\n❌ Categories that need to be created (${missingCategories.length}):`)
      missingCategories.forEach((cat) => {
        const slug = cat
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
        console.log(`  - ${cat} (slug: ${slug})`)
      })

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
    })
  } catch (error) {
    console.error('❌ Error checking categories:', error)
  }
}

checkExistingCategories().catch(console.error)
