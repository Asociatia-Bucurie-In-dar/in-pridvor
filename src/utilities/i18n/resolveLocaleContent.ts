/**
 * Overlays English shadow-group values onto a document's top-level fields when
 * the requested locale is 'en' and an English value EXISTS. Romanian is the
 * source of truth and the fallback. Pure and non-mutating.
 *
 * `fieldPaths` are dot-paths relative to the document root that have a matching
 * value inside `doc.en` (e.g. 'title' -> doc.en.title, 'meta.title' -> doc.en.meta.title).
 */
type AnyRecord = Record<string, any>

const get = (obj: AnyRecord | undefined, path: string): unknown => {
  if (!obj) return undefined
  return path.split('.').reduce<any>((acc, key) => (acc == null ? acc : acc[key]), obj)
}

// "Exists" means: not null/undefined, and (for strings) not blank.
const existsAsTranslation = (val: unknown): boolean => {
  if (val == null) return false
  if (typeof val === 'string') return val.trim().length > 0
  return true
}

const clonePathToLeaf = (root: AnyRecord, path: string): { parent: AnyRecord; leaf: string } => {
  const keys = path.split('.')
  const leaf = keys.pop() as string
  let cursor = root
  for (const key of keys) {
    cursor[key] = { ...(cursor[key] ?? {}) } // shallow-clone along the path so we never mutate the source
    cursor = cursor[key]
  }
  return { parent: cursor, leaf }
}

export const resolveLocaleContent = <T extends AnyRecord>(
  doc: T,
  locale: string,
  fieldPaths: string[],
): T => {
  if (locale !== 'en') return doc
  const en = (doc as AnyRecord).en
  if (!en) return doc

  const out: AnyRecord = { ...doc }

  for (const path of fieldPaths) {
    const enVal = get(en, path)
    if (!existsAsTranslation(enVal)) continue
    const { parent, leaf } = clonePathToLeaf(out, path)
    parent[leaf] = enVal
  }

  return out as T
}
