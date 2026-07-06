const ROMANIAN_CHAR_MAP: Record<string, string[]> = {
  a: ['a', 'ă', 'â'],
  ă: ['a', 'ă', 'â'],
  â: ['a', 'ă', 'â'],
  i: ['i', 'î'],
  î: ['i', 'î'],
  s: ['s', 'ș', 'ş'],
  ș: ['s', 'ș', 'ş'],
  ş: ['s', 'ș', 'ş'],
  t: ['t', 'ț', 'ţ'],
  ț: ['t', 'ț', 'ţ'],
  ţ: ['t', 'ț', 'ţ'],
}

/**
 * Produce a SMALL, bounded set of spellings for a query rather than the full
 * 3^n diacritic permutation. The old permutation approach exploded to thousands
 * of variants for multi-word queries (e.g. "manastirea putna" -> 4374), and
 * once each variant became a `where.or` condition it overflowed Payload's
 * recursive query builder (`buildQueryFromSourceParams`) — the reported
 * "Maximum call stack size exceeded" crash.
 *
 * We return only legitimate forms:
 *  - the original query (as typed — matches stored diacritics)
 *  - lowercased
 *  - diacritic-free / normalized (matches ASCII typing against ASCII titles)
 *
 * `like` is case-insensitive substring matching, so this small set covers the
 * common cases without any combinatorial blowup. (Fully diacritic-insensitive
 * matching of ASCII input against diacritic-bearing stored titles would require
 * normalizing the column at the DB layer; see normalizeRomanian.)
 */
export function generateSearchVariants(query: string): string[] {
  if (!query || query.length === 0) return []

  const variants = new Set<string>([query, query.toLowerCase(), normalizeRomanian(query)])

  return Array.from(variants).filter((v) => v.length > 0)
}

export function normalizeRomanian(text: string): string {
  if (!text) return ''
  return text
    .toLowerCase()
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[șş]/g, 's')
    .replace(/[țţ]/g, 't')
}
