/**
 * Bulk RO -> EN translation for existing content.
 *
 * Populates the additive `en_*` shadow fields on posts / pages / categories
 * using the same Gemini translator the admin "Translate to English" button
 * uses. It ONLY writes the `en` group — Romanian source columns are never
 * touched. Safe to stop and re-run: documents that already have an English
 * title are skipped, so a run resumes where the previous one left off.
 *
 * Usage (env vars must be loaded — see notes at bottom):
 *   pnpm tsx scripts/translate-existing-content.mts                # all collections
 *   pnpm tsx scripts/translate-existing-content.mts --dry-run      # preview only, no writes, no API calls
 *   pnpm tsx scripts/translate-existing-content.mts --collection=posts
 *   pnpm tsx scripts/translate-existing-content.mts --limit=10     # only first N docs per collection
 *   pnpm tsx scripts/translate-existing-content.mts --force        # re-translate even if en already exists
 *   pnpm tsx scripts/translate-existing-content.mts --delay=31000  # ms between API calls (default 31000)
 *
 * Requires GOOGLE_AI_STUDIO_KEY and POSTGRES_URL / PAYLOAD_SECRET in the env.
 */
import { getPayload } from 'payload'
import config from '../src/payload.config'
import { translateToEnglish } from '../src/utilities/ai/translate'

// ---- CLI args ---------------------------------------------------------------
const args = process.argv.slice(2)
const hasFlag = (name: string) => args.includes(`--${name}`)
const getOpt = (name: string, fallback?: string) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.split('=').slice(1).join('=') : fallback
}

const DRY_RUN = hasFlag('dry-run')
const FORCE = hasFlag('force')
const ONLY_COLLECTION = getOpt('collection') // 'posts' | 'pages' | 'categories' | undefined
const LIMIT = getOpt('limit') ? parseInt(getOpt('limit') as string, 10) : undefined
// Gemini free tier ~2 req/min. Default ~31s/call keeps us safely under it.
// If you have a paid key with higher limits, lower this (e.g. --delay=1500).
const DELAY_MS = getOpt('delay') ? parseInt(getOpt('delay') as string, 10) : 31_000

// Which fields to translate per collection — MUST mirror the en groups /
// translate endpoints defined on each collection config.
const FIELD_CONFIG: Record<string, Record<string, 'text' | 'lexical'>> = {
  posts: {
    title: 'text',
    content: 'lexical',
    'meta.title': 'text',
  },
  pages: {
    title: 'text',
    'hero.richText': 'lexical',
    'meta.title': 'text',
    'meta.description': 'text',
  },
  categories: {
    title: 'text',
  },
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = (obj: any, path: string) =>
  path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj)

let apiCalls = 0

const run = async () => {
  if (!DRY_RUN && !process.env.GOOGLE_AI_STUDIO_KEY) {
    console.error('✗ GOOGLE_AI_STUDIO_KEY is not set. Aborting (use --dry-run to preview without it).')
    process.exit(1)
  }

  const payload = await getPayload({ config })

  const collections = (ONLY_COLLECTION ? [ONLY_COLLECTION] : ['posts', 'pages', 'categories']).filter(
    (c) => FIELD_CONFIG[c],
  )

  const totals = { processed: 0, translated: 0, skipped: 0, failed: 0 }

  for (const collection of collections) {
    const fields = FIELD_CONFIG[collection]
    console.log(`\n=== Collection: ${collection} ===`)

    const result = await payload.find({
      collection: collection as any,
      limit: LIMIT ?? 0, // 0 = no limit in Payload
      pagination: false,
      depth: 0,
      overrideAccess: true,
    })

    console.log(`  Found ${result.docs.length} document(s).`)

    for (const doc of result.docs as any[]) {
      totals.processed++
      const id = doc.id
      const roTitle = doc.title ?? '(untitled)'

      // Resume/idempotency: skip docs that already have an English title.
      const alreadyTranslated = doc.en?.title != null && String(doc.en.title).trim() !== ''
      if (alreadyTranslated && !FORCE) {
        totals.skipped++
        console.log(`  - [skip] ${collection}#${id} "${roTitle}" (already has en.title)`)
        continue
      }

      // Build the en payload field-by-field, throttling each API call.
      const enData: Record<string, any> = {}
      let translatedAny = false

      try {
        for (const [path, type] of Object.entries(fields)) {
          const value = get(doc, path)
          if (value == null || (typeof value === 'string' && value.trim() === '')) continue

          if (DRY_RUN) {
            console.log(`      would translate ${collection}#${id} field "${path}" (${type})`)
            translatedAny = true
            continue
          }

          await sleep(apiCalls === 0 ? 0 : DELAY_MS) // throttle between API calls
          apiCalls++
          const translated = await translateToEnglish(value, type)

          // nest into en group, mirroring dot-path (e.g. meta.title -> en.meta.title)
          const keys = path.split('.')
          const leaf = keys.pop() as string
          let cursor = enData
          for (const k of keys) {
            cursor[k] = cursor[k] ?? {}
            cursor = cursor[k]
          }
          cursor[leaf] = translated
          translatedAny = true
        }

        if (!translatedAny) {
          totals.skipped++
          console.log(`  - [skip] ${collection}#${id} "${roTitle}" (no source content)`)
          continue
        }

        if (DRY_RUN) {
          totals.translated++
          console.log(`  - [dry-run] ${collection}#${id} "${roTitle}" would be updated`)
          continue
        }

        await payload.update({
          collection: collection as any,
          id,
          data: { en: enData },
          overrideAccess: true,
          // The collections' afterChange hooks call next/cache revalidate*,
          // which only works inside a Next.js request. Skip them here — the
          // hooks honor this flag. Deploy/ISR will revalidate naturally.
          context: { disableRevalidate: true },
        })
        totals.translated++
        console.log(`  - [done] ${collection}#${id} "${roTitle}" -> "${enData.title ?? '(no title)'}"`)
      } catch (err: any) {
        totals.failed++
        console.error(`  - [FAIL] ${collection}#${id} "${roTitle}": ${err?.message ?? err}`)
        // continue with the next doc — one failure must not abort the batch
      }
    }
  }

  console.log('\n=== Summary ===')
  console.log(`  processed: ${totals.processed}`)
  console.log(`  translated: ${totals.translated}`)
  console.log(`  skipped: ${totals.skipped}`)
  console.log(`  failed: ${totals.failed}`)
  console.log(`  api calls: ${apiCalls}`)
  if (DRY_RUN) console.log('  (dry run — no documents were modified)')

  process.exit(totals.failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
