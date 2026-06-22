import { describe, it, expect } from 'vitest'
import { generateSearchVariants, normalizeRomanian } from './romanianSearch'

describe('generateSearchVariants', () => {
  it('returns [] for empty input', () => {
    expect(generateSearchVariants('')).toEqual([])
  })

  it('includes the raw query and a diacritic-free normalized form', () => {
    const v = generateSearchVariants('Sărbătoare')
    expect(v).toContain('Sărbătoare') // as typed
    expect(v).toContain('sarbatoare') // normalized
  })

  it('does NOT explode combinatorially (the cause of the stack overflow)', () => {
    // Previously this produced 4374 variants -> 13122 where-conditions ->
    // overflowed Payload's recursive query builder. It must now stay tiny.
    const v = generateSearchVariants('manastirea putna')
    expect(v.length).toBeLessThanOrEqual(3)
  })

  it('stays bounded for any length of diacritic-heavy query', () => {
    // A pathological all-mappable-chars query: would have been 3^n before.
    const v = generateSearchVariants('aaaaaaaaaaaaaaaaaaaa') // 20 chars
    expect(v.length).toBeLessThanOrEqual(3)
  })

  it('a realistic search builds a bounded number of where-conditions', () => {
    // Mirrors buildSearchConditions: variants across title + meta.title + slug.
    const variants = generateSearchVariants('manastirea putna')
    const conditions = [
      ...variants.map((x) => ({ title: { like: x } })),
      ...variants.map((x) => ({ 'meta.title': { like: x } })),
      ...variants.map((x) => ({ slug: { like: x } })),
    ]
    expect(conditions.length).toBeLessThanOrEqual(9) // 3 fields x <=3 variants
  })
})

describe('normalizeRomanian', () => {
  it('strips all Romanian diacritics to ASCII', () => {
    expect(normalizeRomanian('Sărbătoarea Mănăstirii')).toBe('sarbatoarea manastirii')
    expect(normalizeRomanian('ÎNȚELEPCIUNE')).toBe('intelepciune')
  })

  it('returns empty string for falsy input', () => {
    expect(normalizeRomanian('')).toBe('')
  })
})
