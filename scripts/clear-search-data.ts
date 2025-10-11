import 'dotenv/config'
import { getPayload } from 'payload'
import configPromise from '../src/payload.config'

async function clearSearchData() {
  const payload = await getPayload({ config: configPromise })

  console.log('🗑️  Clearing search data...\n')

  try {
    // Try to get search collection
    const search = await payload.find({
      collection: 'search' as any,
      limit: 1000,
    })

    console.log(`Found ${search.totalDocs} search documents`)

    // Delete all search documents
    for (const doc of search.docs) {
      await payload.delete({
        collection: 'search' as any,
        id: doc.id,
      })
    }

    console.log(`✅ Deleted ${search.totalDocs} search documents`)
  } catch (error) {
    console.log(`⚠️  Search collection doesn't exist or is already empty`)
  }

  console.log('\n✅ Search data cleared!')
  process.exit(0)
}

clearSearchData().catch((error) => {
  console.error('Clear failed:', error)
  process.exit(1)
})
