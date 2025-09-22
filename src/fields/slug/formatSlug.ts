import type { FieldHook } from 'payload'

export const formatSlug = (val: string): string => {
  // Map Romanian diacritics to base Latin characters
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

  // Replace diacritics with base characters
  const normalized = val.replace(/[ăâîșțĂÂÎȘȚ]/g, (char) => diacriticsMap[char] || char)

  return normalized
    .replace(/ /g, '-') // Replace spaces with hyphens
    .replace(/[^\w-]+/g, '') // Remove non-word characters except hyphens
    .toLowerCase() // Convert to lowercase
}

export const formatSlugHook =
  (fallback: string): FieldHook =>
  ({ data, operation, value }) => {
    if (typeof value === 'string') {
      return formatSlug(value)
    }

    if (operation === 'create' || !data?.slug) {
      const fallbackData = data?.[fallback] || data?.[fallback]

      if (fallbackData && typeof fallbackData === 'string') {
        return formatSlug(fallbackData)
      }
    }

    return value
  }
