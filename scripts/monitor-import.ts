import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function monitorImport() {
  const payload = await getPayload({ config: configPromise })

  console.log('📊 Import Progress Monitor')
  console.log('='.repeat(60))

  // Expected total
  const expectedTotal = 287

  // Poll every 2 seconds
  setInterval(async () => {
    try {
      const posts = await payload.find({
        collection: 'posts',
        limit: 1,
        sort: '-createdAt',
      })

      const categories = await payload.find({
        collection: 'categories',
        limit: 1,
      })

      const media = await payload.find({
        collection: 'media',
        limit: 1,
      })

      const progress = Math.round((posts.totalDocs / expectedTotal) * 100)
      const progressBar =
        '█'.repeat(Math.floor(progress / 2)) + '░'.repeat(50 - Math.floor(progress / 2))

      // Clear console
      console.clear()
      console.log('📊 Import Progress Monitor')
      console.log('='.repeat(60))
      console.log(`\n📝 Posts:      ${posts.totalDocs} / ${expectedTotal}`)
      console.log(`📁 Categories: ${categories.totalDocs}`)
      console.log(`🖼️  Media:      ${media.totalDocs}`)
      console.log(`\n[${progressBar}] ${progress}%`)

      if (posts.totalDocs > 0) {
        const latestPost = posts.docs[0]
        console.log(`\n🆕 Latest: "${latestPost.title}"`)
        console.log(`   Slug: ${latestPost.slug}`)
        console.log(`   Created: ${new Date(latestPost.createdAt).toLocaleTimeString()}`)
      }

      if (posts.totalDocs >= expectedTotal) {
        console.log('\n✅ Import appears to be complete!')
        console.log('\nPress Ctrl+C to exit monitor')
      } else {
        console.log(`\n⏳ Importing... (${expectedTotal - posts.totalDocs} remaining)`)
      }
    } catch (error) {
      console.error('Error checking progress:', error)
    }
  }, 2000)
}

monitorImport().catch((error) => {
  console.error('Monitor failed:', error)
  process.exit(1)
})
