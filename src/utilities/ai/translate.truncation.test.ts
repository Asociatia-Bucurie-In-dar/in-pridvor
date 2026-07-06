import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Reproduces the production "truncation" failure deterministically WITHOUT the
 * network: the real bug is that Gemini caps its OUTPUT tokens, so when the whole
 * article's text is requested back in one JSON object the response is cut off
 * mid-string → invalid JSON → the doc fails. We mock the SDK with a fake model
 * that does exactly that: it translates a keyed JSON object, but if its response
 * would exceed a max-output size it returns a TRUNCATED (invalid) JSON string —
 * just like the live API. The chunking in translate.ts must keep each request's
 * response under that cap so a large article still translates fully.
 */

// Simulated model output cap (chars), chosen to mirror real Gemini headroom:
// large enough that ONE source chunk (CHUNK_CHARS ~4000 in translate.ts) plus
// translation expansion + JSON overhead fits comfortably, but small enough that
// a whole multi-paragraph article does NOT — so the test fails if chunking is
// removed and passes only when chunking keeps each request under the cap.
const SIM_OUTPUT_CAP = 12000

let generateCalls = 0

vi.mock('@google/generative-ai', () => {
  class GoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: async (prompt: string) => {
          generateCalls++
          // Extract the keyed input object from the prompt (last {...} block).
          const first = prompt.indexOf('{')
          const last = prompt.lastIndexOf('}')
          const sourceMap = JSON.parse(prompt.slice(first, last + 1))
          // "Translate" each value by prefixing — deterministic, no network.
          const out: Record<string, string> = {}
          for (const k of Object.keys(sourceMap)) {
            out[k] = 'EN:' + sourceMap[k]
          }
          let text = JSON.stringify(out)
          // Simulate the output-token cap: truncate over-long responses.
          if (text.length > SIM_OUTPUT_CAP) {
            text = text.slice(0, SIM_OUTPUT_CAP) // cut mid-JSON -> invalid
          }
          return { response: { text: () => text } }
        },
      }
    }
  }
  return { GoogleGenerativeAI }
})

import { translateToEnglish } from './translate'

const makeArticle = (paragraphs: number, sentencePerPara: string) => ({
  root: {
    type: 'root',
    version: 1,
    children: Array.from({ length: paragraphs }, () => ({
      type: 'paragraph',
      version: 1,
      children: [{ type: 'text', text: sentencePerPara, format: 0, version: 1 }],
    })),
  },
})

beforeEach(() => {
  generateCalls = 0
})

describe('lexical translation under a simulated output-token cap', () => {
  it('translates a SHORT article in a single request (no truncation)', async () => {
    const doc = makeArticle(2, 'Aceasta este o propoziție scurtă în limba română.')
    const out: any = await translateToEnglish(doc, 'lexical')
    expect(out.root.children).toHaveLength(2)
    // every paragraph translated (prefixed), none left as raw Romanian
    for (const p of out.root.children) {
      expect(p.children[0].text.startsWith('EN:')).toBe(true)
    }
    expect(generateCalls).toBe(1)
  })

  it('translates a LONG article fully by chunking under the cap', async () => {
    // ~30 paragraphs of substantial text -> total well over SIM_OUTPUT_CAP, so
    // a single-request approach WOULD truncate. Chunking must split it.
    const longSentence =
      'Marea, marea, marea, de patru ori la mare, ar fi fost o extravaganță în copilăria mea din anii nouăzeci, și totuși iată-mă aici, privind valurile.'
    const doc = makeArticle(30, longSentence)

    const out: any = await translateToEnglish(doc, 'lexical')

    // Structure preserved + EVERY paragraph translated (no truncation losses).
    expect(out.root.children).toHaveLength(30)
    const untranslated = out.root.children.filter(
      (p: any) => !p.children[0].text.startsWith('EN:'),
    )
    expect(untranslated).toHaveLength(0)

    // Proof it actually chunked: more than one request was made, and every
    // per-request response stayed under the simulated cap.
    expect(generateCalls).toBeGreaterThan(1)
  })

  it('preserves non-text nodes (e.g. linebreak) across chunked translation', async () => {
    const span = (t: string) => ({ type: 'text', text: t, format: 0, version: 1 })
    const longSentence = 'O propoziție lungă în română care ocupă spațiu considerabil în text. '.repeat(3)
    const doc = {
      root: {
        type: 'root',
        version: 1,
        children: [
          { type: 'paragraph', version: 1, children: [span(longSentence)] },
          {
            type: 'paragraph',
            version: 1,
            children: [span(longSentence), { type: 'linebreak', version: 1 }, span(longSentence)],
          },
          ...Array.from({ length: 20 }, () => ({
            type: 'paragraph',
            version: 1,
            children: [span(longSentence)],
          })),
        ],
      },
    }
    const out: any = await translateToEnglish(doc, 'lexical')
    // linebreak node still present and intact
    expect(out.root.children[1].children[1].type).toBe('linebreak')
    // surrounding text translated
    expect(out.root.children[1].children[0].text.startsWith('EN:')).toBe(true)
    expect(out.root.children[1].children[2].text.startsWith('EN:')).toBe(true)
  })
})
