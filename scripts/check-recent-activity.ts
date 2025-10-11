import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function checkRecentActivity() {
  const payload = await getPayload({ config: configPromise })

  console.log('🔍 Checking recent database activity...\n')

  // Check posts created in the last hour
  const oneHourAgo = new Date()
  oneHourAgo.setHours(oneHourAgo.getHours() - 1)

  const recentPosts = await payload.find({
    collection: 'posts',
    where: {
      createdAt: {
        greater_than: oneHourAgo.toISOString(),
      },
    },
    limit: 300,
    sort: '-createdAt',
  })

  console.log(`Posts created in the last hour: ${recentPosts.totalDocs}`)

  if (recentPosts.totalDocs > 0) {
    console.log('\nFirst 10:')
    recentPosts.docs.slice(0, 10).forEach((post, idx) => {
      console.log(`${idx + 1}. "${post.title}" - ${new Date(post.createdAt).toLocaleTimeString()}`)
    })
  }

  // Check the actual database ID range
  const allPosts = await payload.find({
    collection: 'posts',
    limit: 300,
    sort: 'id',
  })

  console.log(`\nTotal posts: ${allPosts.totalDocs}`)

  if (allPosts.totalDocs > 0) {
    const firstId = allPosts.docs[0].id
    const lastId = allPosts.docs[allPosts.docs.length - 1].id
    console.log(`ID range: ${firstId} to ${lastId}`)
  }

  process.exit(0)
}

checkRecentActivity().catch((error) => {
  console.error('Check failed:', error)
  process.exit(1)
})
