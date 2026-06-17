import type { PayloadHandler } from 'payload'
import { translateToEnglish } from './translate'

/**
 * Endpoint factory for `/:id/translate`. Reads the Romanian source, translates
 * each configured field, and writes results into the additive `en` group
 * (shadow mode only — never touches the Romanian columns or a Payload locale).
 *
 * fieldConfig maps a dot-path (relative to the doc and mirrored inside `en`)
 * to its content type.
 */
export const createTranslationHandler = (
  collectionSlug: string,
  fieldConfig: Record<string, 'text' | 'lexical'>,
): PayloadHandler => {
  return async (req) => {
    const id = req.routeParams?.id
    const { payload } = req
    if (!id) return Response.json({ error: 'Missing document ID' }, { status: 400 })

    try {
      const doc = await payload.findByID({ collection: collectionSlug as any, id: id as string })
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 })

      const enData: Record<string, any> = {}
      let hasContent = false

      for (const [path, type] of Object.entries(fieldConfig)) {
        const value = path.split('.').reduce<any>((acc, k) => (acc == null ? acc : acc[k]), doc)
        if (value == null || (typeof value === 'string' && value.trim() === '')) continue
        const translated = await translateToEnglish(value, type)
        // write into en group, preserving nesting (e.g. 'meta.title' -> en.meta.title)
        const keys = path.split('.')
        const leaf = keys.pop() as string
        let cursor = enData
        for (const k of keys) {
          cursor[k] = cursor[k] ?? {}
          cursor = cursor[k]
        }
        cursor[leaf] = translated
        hasContent = true
      }

      if (!hasContent) return Response.json({ error: 'No content found to translate' }, { status: 400 })

      await payload.update({ collection: collectionSlug as any, id: id as string, data: { en: enData } })
      return Response.json({ success: true })
    } catch (error: any) {
      return Response.json({ error: error?.message ?? 'Translation failed' }, { status: 500 })
    }
  }
}
