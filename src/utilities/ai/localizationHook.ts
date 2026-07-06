import type { CollectionAfterReadHook } from 'payload'
import { resolveLocaleContent } from '../i18n/resolveLocaleContent'

/**
 * Returns an afterRead hook that overlays English shadow-group values onto the
 * document, but ONLY when the public frontend explicitly requested English via
 * `req.context.locale === 'en'`. Admin reads, draft/version resolution, and
 * relationship population never set this flag, so they always see raw Romanian
 * source-of-truth fields plus the separate `en` group.
 */
export const withEnglishFallback = (fieldPaths: string[]): CollectionAfterReadHook => {
  return ({ doc, req }) => {
    const locale = (req?.context as { locale?: string } | undefined)?.locale
    if (locale !== 'en') return doc
    return resolveLocaleContent(doc, 'en', fieldPaths)
  }
}
