import type { FieldHook } from 'payload'

const getByPath = (source: Record<string, unknown> | undefined, path: string): unknown => {
  if (!source) return undefined
  if (!path.includes('.')) return source[path]

  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key]
    }
    return undefined
  }, source)
}

export const formatSlug = (val: string): string => {
  const diacriticsMap: { [key: string]: string } = {
    ă: 'a',
    â: 'a',
    î: 'i',
    ș: 's',
    ț: 't',
    Ă: 'A',
    Â: 'A',
    Î: 'I',
    Ș: 'S',
    Ț: 'T',
  }

  const normalized = val.replace(/[ăâîșțĂÂÎȘȚ]/g, (char) => diacriticsMap[char] || char)

  return normalized
    .replace(/ /g, '-')
    .replace(/[^\w-]+/g, '')
    .toLowerCase()
}

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    const dataRecord = (data as Record<string, unknown>) || {}
    const fallbackValue = getByPath(dataRecord, fallback)
    const slugLock =
      typeof dataRecord.slugLock === 'boolean'
        ? dataRecord.slugLock
        : typeof getByPath(dataRecord, 'slugLock') === 'boolean'
          ? (getByPath(dataRecord, 'slugLock') as boolean)
          : false

    if (slugLock) {
      if (typeof fallbackValue === 'string' && fallbackValue.trim().length > 0) {
        return formatSlug(fallbackValue)
      }
      return ''
    }

    if (typeof value === 'string') {
      return formatSlug(value)
    }

    if (operation === 'create' || !dataRecord.slug) {
      if (typeof fallbackValue === 'string' && fallbackValue.trim().length > 0) {
        return formatSlug(fallbackValue)
      }
    }

    return value
  }
