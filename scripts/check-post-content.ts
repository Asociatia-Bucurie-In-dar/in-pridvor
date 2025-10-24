import { createRequire } from 'module'

const require = createRequire(import.meta.url)
require('dotenv').config()

async function checkPostContent() {
  const { getPayload } = await import('payload')
  const { default: config } = await import('../src/payload.config.js')
  const payload = await getPayload({ config })

  // Get a post that should have images
  const posts = await payload.find({
    collection: 'posts',
    where: {
      slug: {
        equals: 'intalnirea-necautata-cu-o-minune',
      },
    },
    limit: 1,
    depth: 2,
  })

  if (posts.docs.length === 0) {
    console.log('Post not found')
    return
  }

  const post = posts.docs[0]

  console.log('📝 Post:', post.title)
  console.log('\n🖼️  Hero Image:', post.heroImage)
  if (typeof post.heroImage === 'object' && post.heroImage) {
    console.log('   ID:', post.heroImage.id)
    console.log('   URL:', post.heroImage.url)
    console.log('   Filename:', post.heroImage.filename)
  }

  console.log('\n📄 Content structure:')
  console.log(JSON.stringify(post.content, null, 2))
}

checkPostContent()
  .then(() => {
    console.log('\n✅ Check complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
