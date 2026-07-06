import { describe, it, expect } from 'vitest'
import { resolveLocaleContent } from './resolveLocaleContent'

const base = () => ({
  title: 'Titlu',
  content: { ro: true },
  meta: { title: 'Meta RO', description: 'Desc RO' },
  en: {
    title: 'English Title',
    content: { en: true },
    meta: { title: 'Meta EN', description: 'Desc EN' },
  },
})

describe('resolveLocaleContent', () => {
  it('returns the doc unchanged when locale is ro', () => {
    const doc = base()
    const out = resolveLocaleContent(doc, 'ro', ['title', 'content', 'meta.title'])
    expect(out.title).toBe('Titlu')
    expect(out.content).toEqual({ ro: true })
    expect(out.meta.title).toBe('Meta RO')
  })

  it('overlays English top-level and nested fields when locale is en and value exists', () => {
    const doc = base()
    const out = resolveLocaleContent(doc, 'en', ['title', 'content', 'meta.title', 'meta.description'])
    expect(out.title).toBe('English Title')
    expect(out.content).toEqual({ en: true })
    expect(out.meta.title).toBe('Meta EN')
    expect(out.meta.description).toBe('Desc EN')
  })

  it('falls back to Romanian when an English field is null/undefined', () => {
    const doc = base()
    doc.en.title = null as any
    delete (doc.en as any).content
    const out = resolveLocaleContent(doc, 'en', ['title', 'content', 'meta.title'])
    expect(out.title).toBe('Titlu')            // null en -> ro
    expect(out.content).toEqual({ ro: true })  // missing en -> ro
    expect(out.meta.title).toBe('Meta EN')     // present en -> en
  })

  it('treats an empty string as "no translation" and falls back to Romanian', () => {
    const doc = base()
    doc.en.title = '   '
    const out = resolveLocaleContent(doc, 'en', ['title'])
    expect(out.title).toBe('Titlu')
  })

  it('falls back to Romanian when the whole en group is missing', () => {
    const doc: any = base()
    delete doc.en
    const out = resolveLocaleContent(doc, 'en', ['title', 'meta.title'])
    expect(out.title).toBe('Titlu')
    expect(out.meta.title).toBe('Meta RO')
  })

  it('does not mutate the input document', () => {
    const doc = base()
    const out = resolveLocaleContent(doc, 'en', ['title'])
    expect(doc.title).toBe('Titlu')   // original untouched
    expect(out).not.toBe(doc)
  })

  it('overlays a nested field even when the parent object had no such key in ro', () => {
    const doc: any = { meta: {}, en: { meta: { title: 'Only EN' } } }
    const out = resolveLocaleContent(doc, 'en', ['meta.title'])
    expect(out.meta.title).toBe('Only EN')
  })

  it('overlays falsy non-string English values (0, false) since only null/blank count as missing', () => {
    const doc: any = {
      count: 5,
      flag: true,
      en: { count: 0, flag: false },
    }
    const out = resolveLocaleContent(doc, 'en', ['count', 'flag'])
    expect(out.count).toBe(0)
    expect(out.flag).toBe(false)
  })

  it('does not mutate the source nested parent object when overlaying a nested field', () => {
    const doc = base()
    const out = resolveLocaleContent(doc, 'en', ['meta.title'])
    expect(doc.meta.title).toBe('Meta RO')
    expect(out.meta).not.toBe(doc.meta)
  })
})
