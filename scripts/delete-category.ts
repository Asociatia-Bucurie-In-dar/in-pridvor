import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function deleteCategory() {
  const payload = await getPayload({ config: configPromise })

  console.log('🗑️  Finding and deleting "Cele mai noi" category...\n')

  // Find the category
  const categories = await payload.find({
    collection: 'categories',
    where: {
      title: {
        equals: 'Cele mai noi',
      },
    },
    limit: 1,
  })

  if (categories.docs.length === 0) {
    console.log('✅ Category "Cele mai noi" not found - already deleted or never existed')
    process.exit(0)
  }

  const category = categories.docs[0]
  console.log(`Found category: "${category.title}" (ID: ${category.id})`)

  // Find posts using this category
  const posts = await payload.find({
    collection: 'posts',
    where: {
      categories: {
        contains: category.id,
      },
    },
    limit: 1000,
  })

  console.log(`\nFound ${posts.totalDocs} posts using this category`)

  if (posts.totalDocs > 0) {
    console.log('\n📝 Removing category from posts...')

    for (const post of posts.docs) {
      // Remove the category from the post
      const updatedCategories = (post.categories || [])
        .filter((cat) => {
          if (typeof cat === 'object' && cat.id) {
            return cat.id !== category.id
          }
          return cat !== category.id
        })
        .map((cat) => (typeof cat === 'object' ? cat.id : cat))

      await payload.update({
        collection: 'posts',
        id: post.id,
        data: {
          categories: updatedCategories,
        },
        context: {
          disableRevalidate: true,
        },
      })

      console.log(`   ✅ Removed from: "${post.title}"`)
    }

    console.log(`\n✅ Updated ${posts.totalDocs} posts`)
  }

  // Delete the category
  console.log(`\n🗑️  Deleting category...`)
  await payload.delete({
    collection: 'categories',
    id: category.id,
  })

  console.log(`✅ Deleted category "${category.title}"`)

  process.exit(0)
}

deleteCategory().catch((error) => {
  console.error('Delete failed:', error)
  process.exit(1)
})
