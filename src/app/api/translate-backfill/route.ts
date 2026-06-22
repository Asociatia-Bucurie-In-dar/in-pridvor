import { getPayload } from 'payload'
import configPromise from '@payload-config'
import { translateToEnglish } from '@/utilities/ai/translate'

/**
 * One-time, self-draining RO -> EN backfill for existing content.
 *
 * Trigger it ONCE with the CRON_SECRET:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/translate-backfill
 *
 * Each invocation translates a small batch (BATCH_FIELDS Gemini calls) into the
 * additive `en_*` shadow fields, then — if work remains — re-invokes itself so
 * the backlog drains in the cloud without further action. It skips documents
 * that already have an English title, so it is idempotent and safe to re-hit if
 * a continuation is ever dropped. It NEVER touches Romanian source columns.
 *
 * Runs on the Node.js runtime; maxDuration is set high (Vercel caps it to your
 * plan's limit). The per-invocation batch keeps each run well under that cap.
 */
export const runtime = 'nodejs'
export const maxDuration = 300 // seconds; Vercel clamps to the plan limit
export const dynamic = 'force-dynamic'

// Fields to translate per collection — mirrors each collection's en group.
const COLLECTIONS = ['posts', 'pages', 'categories'] as const
type TranslatableCollection = (typeof COLLECTIONS)[number]

const FIELD_CONFIG: Record<TranslatableCollection, Record<string, 'text' | 'lexical'>> = {
  posts: { title: 'text', content: 'lexical', 'meta.title': 'text' },
  pages: { title: 'text', 'hero.richText': 'lexical', 'meta.title': 'text', 'meta.description': 'text' },
  categories: { title: 'text' },
}

// How many Gemini calls to make per invocation before stopping and chaining the
// next run, and the throttle between calls. Defaults are tuned for a paid-tier
// Gemini key and must keep a whole batch well under the serverless maxDuration
// (docs are only committed after all their fields translate, so a batch must
// finish, not get killed mid-doc). Override via env if your limits differ:
//   free tier:  TRANSLATE_DELAY_MS=4000  TRANSLATE_BATCH_FIELDS=10
// The wall-clock TIME_BUDGET_MS guard (below) is the real safety net — these are
// just upper bounds. BATCH_FIELDS is high so the time budget is what stops a
// batch on a paid key; DELAY_MS is small since paid limits are per-minute, not
// per-day. If you raise the Vercel maxDuration, also raise TRANSLATE_TIME_BUDGET_MS.
const BATCH_FIELDS = Number(process.env.TRANSLATE_BATCH_FIELDS ?? 300)
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS ?? 250)

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const get = (obj: any, path: string) =>
  path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), obj)

// Gemini sometimes returns transient 503 (overloaded) / 429 (rate) errors.
// Retry those a few times with exponential backoff before giving up.
const isTransient = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  return /\b(429|500|502|503|504)\b/.test(msg) || /overloaded|high demand|unavailable|rate/i.test(msg)
}

const translateWithRetry = async (value: any, type: 'text' | 'lexical', maxAttempts = 4) => {
  let attempt = 0
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await translateToEnglish(value, type)
    } catch (err) {
      attempt++
      if (attempt >= maxAttempts || !isTransient(err)) throw err
      await sleep(5_000 * attempt) // 5s, 10s, 15s backoff
    }
  }
}

const isAuthorized = (request: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false // fail closed if no secret configured
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.GOOGLE_AI_STUDIO_KEY) {
    return Response.json({ error: 'GOOGLE_AI_STUDIO_KEY is not set' }, { status: 500 })
  }

  const payload = await getPayload({ config: configPromise })

  // Stop the batch when EITHER the call budget OR a wall-clock budget is hit,
  // so the function always returns + chains before Vercel kills it mid-doc.
  // 45s leaves headroom under a 60s (Hobby) maxDuration; Pro (300s) just does
  // more docs per call-budget anyway.
  const startedAt = Date.now()
  const TIME_BUDGET_MS = Number(process.env.TRANSLATE_TIME_BUDGET_MS ?? 45_000)
  const budgetSpent = () => apiCalls >= BATCH_FIELDS || Date.now() - startedAt >= TIME_BUDGET_MS

  let apiCalls = 0
  let docsTranslated = 0
  let remaining = 0
  let failed = 0
  const log: string[] = []

  try {
    for (const collection of COLLECTIONS) {
      const fields = FIELD_CONFIG[collection]

      // Pull untranslated docs (en.title empty/missing). Fetch a generous page;
      // we only *process* until the per-invocation budget is spent, then count
      // the rest as "remaining" so the chained run picks them up.
      const result = await payload.find({
        collection: collection as any,
        where: {
          or: [{ 'en.title': { exists: false } }, { 'en.title': { equals: '' } }],
        },
        limit: 100,
        depth: 0,
        overrideAccess: true,
      })

      for (const doc of result.docs as any[]) {
        // Defensive: double-check it still needs translating.
        if (doc.en?.title != null && String(doc.en.title).trim() !== '') continue

        if (budgetSpent()) {
          remaining++ // budget spent — leave for the next chained invocation
          continue
        }

        // Isolate per-document failures: a doc that still errors after retries
        // is skipped and reported, never aborting the whole batch.
        try {
          const enData: Record<string, any> = {}
          let translatedAny = false

          // Translate ALL of this doc's fields once started — never break mid-doc,
          // or we'd persist a partial en (e.g. en.title only) and idempotency would
          // mark the doc done, leaving content/meta untranslated forever. The
          // budget is only checked at the doc boundary above.
          for (const [path, type] of Object.entries(fields)) {
            const value = get(doc, path)
            if (value == null || (typeof value === 'string' && value.trim() === '')) continue

            if (apiCalls > 0) await sleep(DELAY_MS) // throttle between Gemini calls
            apiCalls++
            const translated = await translateWithRetry(value, type)

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

          if (translatedAny) {
            await payload.update({
              collection: collection as any,
              id: doc.id,
              data: { en: enData },
              overrideAccess: true,
              context: { disableRevalidate: true }, // next/cache hooks can't run here
            })
            docsTranslated++
            log.push(`${collection}#${doc.id} -> "${enData.title ?? '(partial)'}"`)
          }
        } catch (docErr) {
          failed++
          remaining++ // let a later run retry this doc
          log.push(
            `[FAIL] ${collection}#${doc.id}: ${docErr instanceof Error ? docErr.message : String(docErr)}`,
          )
        }
      }
    }

    // Chain another invocation only if this run made real progress. If the
    // batch translated nothing and only produced failures (e.g. Gemini is
    // down), do NOT chain — that would be a tight loop hammering a dead API.
    // The caller can re-trigger manually once the upstream recovers.
    const madeProgress = docsTranslated > 0
    let chained = false
    if (remaining > 0 && madeProgress) {
      const url = new URL(request.url)
      const selfUrl = `${url.origin}${url.pathname}`
      void fetch(selfUrl, {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      }).catch(() => {
        /* fire-and-forget; if it fails, the endpoint can be re-hit manually */
      })
      chained = true
    }

    return Response.json({
      success: failed === 0,
      docsTranslated,
      failed,
      apiCalls,
      moreRemaining: remaining > 0,
      chainedNextRun: chained,
      stalled: remaining > 0 && !madeProgress, // re-trigger manually when upstream recovers
      log,
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        docsTranslated,
        apiCalls,
        error: error instanceof Error ? error.message : 'Unknown error',
        log,
      },
      { status: 500 },
    )
  }
}
