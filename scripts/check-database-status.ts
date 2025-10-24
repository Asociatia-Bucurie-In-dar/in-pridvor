import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function checkDatabaseStatus() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  console.log('📊 DATABASE STATUS\n')
  console.log('='.repeat(60))

  // Count posts
  const postsCount = await payload.count({ collection: 'posts' })
  console.log(`📝 Total Posts: ${postsCount.totalDocs}`)

  // Count media
  const mediaCount = await payload.count({ collection: 'media' })
  console.log(`🖼️  Total Media: ${mediaCount.totalDocs}`)

  // Count categories
  const categoriesCount = await payload.count({ collection: 'categories' })
  console.log(`📂 Total Categories: ${categoriesCount.totalDocs}`)

  // Get all categories
  const categories = await payload.find({
    collection: 'categories',
    limit: 100,
    depth: 0,
  })

  console.log('\n📂 EXISTING CATEGORIES:\n')
  categories.docs.forEach((cat, idx) => {
    console.log(`${idx + 1}. ${cat.title} (slug: ${cat.slug})`)
  })

  // Check storage being used
  console.log('\n💾 STORAGE INFO:')
  console.log(`Storage: Cloudflare R2`)
  console.log(`Bucket: ${process.env.R2_BUCKET_NAME}`)
  console.log(`Public URL: ${process.env.R2_PUBLIC_URL}`)

  console.log('\n' + '='.repeat(60))
}

checkDatabaseStatus()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
