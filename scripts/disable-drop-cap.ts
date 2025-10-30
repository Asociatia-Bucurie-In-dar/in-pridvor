import { getPayload } from 'payload'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

async function disableDropCapForAllPosts() {
  loadEnv({ path: resolve(process.cwd(), '.env') })

  const { default: payloadConfig } = await import('../src/payload.config')
  const payload = await getPayload({ config: payloadConfig })

  console.log('🔄 Disabling drop cap for all posts...')

  const limit = 100
  let page = 1
  let totalUpdated = 0

  while (true) {
    const result = await payload.find({
      collection: 'posts',
      limit,
      page,
      depth: 0,
      select: {
        id: true,
        title: true,
        enableDropCap: true,
      },
    })

    if (result.docs.length === 0) break

    for (const doc of result.docs) {
      const current = (doc as any).enableDropCap
      if (current === false) continue

      try {
        await payload.update({
          collection: 'posts',
          id: (doc as any).id,
          data: { enableDropCap: false },
          context: { disableRevalidate: true },
        })
        totalUpdated++
        console.log(`✅ Updated: ${(doc as any).title || (doc as any).id}`)
      } catch (e) {
        console.error(`❌ Failed: ${(doc as any).title || (doc as any).id}`, e)
      }
    }

    if (page >= result.totalPages) break
    page++
  }

  console.log(`\n🎉 Done. Updated ${totalUpdated} posts.`)
}

disableDropCapForAllPosts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })


