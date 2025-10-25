import { createLocalReq, getPayload } from 'payload'
import config from '@payload-config'
import { headers } from 'next/headers'
import { formatSlug } from '@/fields/slug/formatSlug'

export const maxDuration = 300

export async function POST(): Promise<Response> {
  const payload = await getPayload({ config })
  const requestHeaders = await headers()

  const { user } = await payload.auth({ headers: requestHeaders })
  if (!user) return new Response('Action forbidden.', { status: 403 })

  const req = await createLocalReq({ user }, payload)

  let updated = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const all = await payload.find({ collection: 'posts', limit: 0, depth: 0, req })

    for (const doc of all.docs) {
      try {
        const current = typeof doc.slug === 'string' ? doc.slug : ''
        const source = (doc.title as string) || current || ''
        const next = formatSlug(source)

        if (!next) {
          skipped++
          continue
        }

        if (current !== next) {
          await payload.update({ collection: 'posts', id: doc.id, data: { slug: next }, req })
          updated++
        } else {
          skipped++
        }
      } catch (e: any) {
        errors.push(`Post ${doc.id}: ${e.message || e}`)
      }
    }

    return Response.json({ success: true, updated, skipped, total: all.totalDocs, errors })
  } catch (e: any) {
    payload.logger.error(e)
    return new Response('Failed to reformat slugs', { status: 500 })
  }
}
