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

// This endpoint is driven by a cron (see vercel.json), which re-invokes it on a
// schedule — so there is no in-process self-chaining. Each invocation drains as
// many documents as it can within TIME_BUDGET_MS, processing them concurrently
// (CONCURRENCY at a time) since a paid Gemini key allows many requests/minute.
// Tunable via env:
//   TRANSLATE_CONCURRENCY      docs translated in parallel (default 8)
//   TRANSLATE_TIME_BUDGET_MS   wall-clock budget per invocation (default 250s;
//                              keep < your Vercel maxDuration of 300s on Pro)
const CONCURRENCY = Number(process.env.TRANSLATE_CONCURRENCY ?? 8)
const DELAY_MS = Number(process.env.TRANSLATE_DELAY_MS ?? 0)

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

  // Diagnostics: confirm which model + key + timing the running deployment is
  // actually using (env vars only take effect on deployments built after they
  // were saved). Surfaced both in logs and the response so it's observable
  // without dashboard access. The key is masked — only length + last 4 chars.
  const rawKey = process.env.GOOGLE_AI_STUDIO_KEY || ''
  const diag = {
    model: process.env.GEMINI_MODEL || 'gemini-flash-latest',
    keyLen: rawKey.length,
    keyTail: rawKey.slice(-4),
    concurrency: CONCURRENCY,
    delayMs: DELAY_MS,
    timeBudgetMs: Number(process.env.TRANSLATE_TIME_BUDGET_MS ?? 250_000),
  }
  console.log('[translate-backfill] diag:', JSON.stringify(diag))

  const payload = await getPayload({ config: configPromise })

  // Leave headroom under the Vercel maxDuration so the function returns cleanly
  // (the cron re-invokes us next tick to continue any remaining work).
  const startedAt = Date.now()
  const TIME_BUDGET_MS = Number(process.env.TRANSLATE_TIME_BUDGET_MS ?? 250_000)
  const timeLeft = () => TIME_BUDGET_MS - (Date.now() - startedAt)

  let apiCalls = 0
  let docsTranslated = 0
  let failed = 0
  let transientFails = 0
  const log: string[] = []

  // Translate one document fully and persist its en group. Returns 'done' on
  // success, or throws (caller records the failure). Never persists a partial
  // en — a doc is translated entirely or not at all, so idempotency (keyed on
  // en.title) can't mark a half-done doc as complete.
  const translateDoc = async (
    collection: TranslatableCollection,
    doc: any,
  ): Promise<void> => {
    const fields = FIELD_CONFIG[collection]
    const enData: Record<string, any> = {}
    let translatedAny = false

    for (const [path, type] of Object.entries(fields)) {
      const value = get(doc, path)
      if (value == null || (typeof value === 'string' && value.trim() === '')) continue
      if (DELAY_MS > 0) await sleep(DELAY_MS)
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

    if (!translatedAny) return
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

  try {
    // Build the work queue: every untranslated doc across all collections.
    const queue: Array<{ collection: TranslatableCollection; doc: any }> = []
    for (const collection of COLLECTIONS) {
      const result = await payload.find({
        collection: collection as any,
        where: { or: [{ 'en.title': { exists: false } }, { 'en.title': { equals: '' } }] },
        limit: 0, // all
        pagination: false,
        depth: 0,
        overrideAccess: true,
      })
      for (const doc of result.docs as any[]) {
        if (doc.en?.title != null && String(doc.en.title).trim() !== '') continue
        queue.push({ collection, doc })
      }
    }

    const totalToDo = queue.length
    let stoppedForTime = false

    // Concurrency-bounded worker pool: CONCURRENCY workers pull from the queue
    // until it's empty or the time budget runs low. A paid Gemini key handles
    // the parallelism comfortably, so one invocation drains a large batch.
    let cursor = 0
    const worker = async () => {
      while (cursor < queue.length) {
        if (timeLeft() < 20_000) {
          stoppedForTime = true
          return
        }
        const item = queue[cursor++]
        if (!item) return
        try {
          await translateDoc(item.collection, item.doc)
        } catch (docErr) {
          failed++
          const msg = docErr instanceof Error ? docErr.message : String(docErr)
          if (/\b(429|500|502|503|504)\b/.test(msg) || /quota|overloaded|rate|unavailable/i.test(msg)) {
            transientFails++
          }
          log.push(`[FAIL] ${item.collection}#${item.doc.id}: ${msg}`)
        }
      }
    }

    await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()))

    const remaining = totalToDo - docsTranslated // not-yet-done this run (incl. failures)

    return Response.json({
      success: failed === 0,
      diag,
      totalToDo,
      docsTranslated,
      failed,
      transientFails,
      apiCalls,
      remaining,
      stoppedForTime, // true = hit time budget; cron's next tick continues
      done: remaining === 0,
      log: log.slice(0, 50),
    })
  } catch (error) {
    return Response.json(
      {
        success: false,
        diag,
        docsTranslated,
        apiCalls,
        error: error instanceof Error ? error.message : 'Unknown error',
        log: log.slice(0, 50),
      },
      { status: 500 },
    )
  }
}
