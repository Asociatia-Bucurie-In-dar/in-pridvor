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

export function generateSearchVariants(query: string): string[] {
  if (!query || query.length === 0) return []

  const lowerQuery = query.toLowerCase()
  const variants = new Set<string>()
  variants.add(query)

  function generateCombinations(current: string, index: number): void {
    if (index >= lowerQuery.length) {
      variants.add(current)
      return
    }

    const char = lowerQuery[index]
    if (!char) {
      generateCombinations(current, index + 1)
      return
    }

    const replacements = ROMANIAN_CHAR_MAP[char]

    if (replacements) {
      for (const replacement of replacements) {
        generateCombinations(current + replacement, index + 1)
      }
    } else {
      generateCombinations(current + char, index + 1)
    }
  }

  generateCombinations('', 0)

  return Array.from(variants)
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
