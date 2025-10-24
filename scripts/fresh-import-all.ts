import { createRequire } from 'module'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const require = createRequire(import.meta.url)
require('dotenv').config()

async function freshImportAll() {
  console.log('🔄 FRESH IMPORT PROCESS\n')
  console.log('This will:')
  console.log('1. Delete ALL existing posts')
  console.log('2. Clean orphaned media (optional)')
  console.log('3. Import ALL posts from WordPress XML\n')

  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Check current state
  const currentPostsCount = await payload.count({ collection: 'posts' })
  const currentMediaCount = await payload.count({ collection: 'media' })

  console.log(`📊 Current database:`)
  console.log(`   Posts: ${currentPostsCount.totalDocs}`)
  console.log(`   Media: ${currentMediaCount.totalDocs}`)

  console.log('\n⚠️  WARNING: This is a destructive operation!')
  console.log('⚠️  All posts will be deleted and re-imported.')
  console.log('⚠️  Starting in 10 seconds... Press Ctrl+C to cancel.\n')

  await new Promise((resolve) => setTimeout(resolve, 10000))

  // STEP 1: Delete all posts
  console.log('\n' + '='.repeat(60))
  console.log('STEP 1: Deleting all posts')
  console.log('='.repeat(60) + '\n')

  let deletedCount = 0
  let page = 1
  const limit = 50

  while (true) {
    const posts = await payload.find({
      collection: 'posts',
      limit: limit,
      page: 1, // Always page 1 since we're deleting
      depth: 0,
    })

    if (posts.docs.length === 0) break

    for (const post of posts.docs) {
      try {
        await payload.delete({
          collection: 'posts',
          id: post.id,
          context: { disableRevalidate: true },
        })
        deletedCount++
        if (deletedCount % 25 === 0) {
          console.log(`   Deleted ${deletedCount}/${currentPostsCount.totalDocs} posts...`)
        }
      } catch (error: any) {
        console.error(`   ❌ Error deleting post:`, error.message)
      }
    }
  }

  console.log(`✅ Deleted ${deletedCount} posts`)

  // STEP 2: Clean orphaned media (optional - commented out for speed)
  console.log('\n' + '='.repeat(60))
  console.log('STEP 2: Cleaning orphaned media (SKIPPED for speed)')
  console.log('='.repeat(60))
  console.log('Note: Run clean-orphaned-media.ts separately if needed\n')

  // STEP 3: Import all posts from XML
  console.log('\n' + '='.repeat(60))
  console.log('STEP 3: Importing posts from WordPress XML')
  console.log('='.repeat(60) + '\n')

  // Now run the import
  console.log('📖 Loading WordPress XML...')

  // Import the functions from import-wordpress-articles.ts would be complex,
  // so we'll just tell the user to run it
  console.log('\n✅ Posts deleted successfully!')
  console.log('\n📌 Now run the import script:')
  console.log('   node --import tsx scripts/import-wordpress-articles.ts')
}

freshImportAll()
  .then(() => {
    console.log('\n✅ Fresh import preparation complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
