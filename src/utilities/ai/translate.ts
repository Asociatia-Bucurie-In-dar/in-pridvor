import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

// Model is configurable so it can be switched without a code change — the
// free tier enforces a per-day-per-model request quota, so when one model is
// exhausted you can point at another that still has headroom. Override with
// GEMINI_MODEL in the environment. (Paid billing removes the daily cap entirely.)
const MODEL_ID = process.env.GEMINI_MODEL || 'gemini-flash-latest'

/**
 * Robustly extract a JSON object from a model response that may be wrapped in
 * markdown fences or surrounded by stray prose. Returns the parsed value, or
 * throws if no valid JSON object can be recovered.
 */
const parseJsonFromModel = (raw: string): any => {
  let text = raw.trim()
  // Strip ```json ... ``` or ``` ... ``` fences anywhere in the string.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fence && fence[1]) text = fence[1].trim()
  try {
    return JSON.parse(text)
  } catch {
    // Fallback: grab the outermost {...} and try again.
    const first = text.indexOf('{')
    const last = text.lastIndexOf('}')
    if (first !== -1 && last > first) {
      return JSON.parse(text.slice(first, last + 1))
    }
    throw new Error('AI translation returned an invalid JSON structure.')
  }
}

/**
 * Walk a Lexical rich-text tree and collect every `text` string (in document
 * order). Returns the references so we can write translations back in place.
 */
const collectLexicalTextNodes = (root: any): any[] => {
  const nodes: any[] = []
  const visit = (node: any) => {
    if (!node || typeof node !== 'object') return
    if (typeof node.text === 'string' && node.text.trim() !== '') nodes.push(node)
    if (Array.isArray(node.children)) node.children.forEach(visit)
    // Lexical nests block content under `root.children`; also handle arrays.
    if (Array.isArray(node)) node.forEach(visit)
  }
  if (Array.isArray(root?.root?.children)) root.root.children.forEach(visit)
  else visit(root)
  return nodes
}

/**
 * Translates content from Romanian to English using Gemini 2.5 Flash.
 * Handles both plain text and Lexical JSON structures.
 */
export const translateToEnglish = async (content: any, type: 'text' | 'lexical' = 'text') => {
  if (!apiKey) {
    throw new Error('GOOGLE_AI_STUDIO_KEY is not defined in environment variables.')
  }

  if (type === 'lexical') {
    // Translate the Lexical tree by extracting only its text strings,
    // translating them, and writing them back into a deep clone of the original
    // structure. This preserves the Lexical structure exactly (only `text`
    // values change) and avoids round-tripping a large JSON blob.
    const cloned = JSON.parse(JSON.stringify(content))
    const textNodes = collectLexicalTextNodes(cloned)
    if (textNodes.length === 0) return cloned

    // Translate in CHARACTER-BOUNDED CHUNKS. A single request that asks for an
    // entire long article back as one JSON object can exceed Gemini's output
    // token limit and get truncated → invalid JSON. Chunking keeps every
    // response small enough to come back whole. Each chunk is a keyed object
    // ({"0": "..."}) translated and reinserted by key (missing keys keep the
    // original Romanian text — graceful per-string fallback).
    const model = genAI.getGenerativeModel({
      model: MODEL_ID,
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
    })

    const CHUNK_CHARS = 4000 // source chars per request (output stays well under cap)
    const chunks: number[][] = [] // arrays of textNode indices
    let current: number[] = []
    let currentChars = 0
    textNodes.forEach((n, i) => {
      const len = (n.text as string).length
      if (current.length > 0 && currentChars + len > CHUNK_CHARS) {
        chunks.push(current)
        current = []
        currentChars = 0
      }
      current.push(i)
      currentChars += len
    })
    if (current.length > 0) chunks.push(current)

    const translateChunk = async (indices: number[]): Promise<void> => {
      const sourceMap: Record<string, string> = {}
      indices.forEach((idx) => {
        sourceMap[String(idx)] = textNodes[idx]!.text
      })
      const prompt = `
        You are an expert Romanian-to-English translator for a high-quality editorial platform.
        You will receive a JSON object whose values are Romanian strings. Translate EACH value
        to English, preserving tone and nuance. Whitespace-only or punctuation-only values must
        be returned unchanged.

        Return ONLY a JSON object with the EXACT SAME KEYS, where each value is the English
        translation of the corresponding input value. Do not add, remove, or rename keys.

        Input object:
        ${JSON.stringify(sourceMap)}
      `
      let translatedMap: Record<string, any> | null = null
      let lastErr: unknown
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await model.generateContent(prompt)
        const response = await result.response
        try {
          const parsed = parseJsonFromModel(response.text())
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            translatedMap = parsed
            break
          }
          lastErr = new Error('Translated value is not a JSON object')
        } catch (e) {
          lastErr = e
          console.error(
            `Failed to parse Gemini lexical chunk (attempt ${attempt + 1}):`,
            response.text().slice(0, 300),
          )
        }
      }
      if (!translatedMap) {
        throw lastErr instanceof Error
          ? lastErr
          : new Error('AI translation returned an invalid JSON structure.')
      }
      indices.forEach((idx) => {
        const t = translatedMap![String(idx)]
        if (typeof t === 'string' && t.length > 0) textNodes[idx]!.text = t
      })
    }

    // Sequential per chunk keeps order/latency simple; documents themselves are
    // already translated in parallel by the backfill worker pool.
    for (const indices of chunks) {
      await translateChunk(indices)
    }
    return cloned
  } else {
    const model = genAI.getGenerativeModel({ model: MODEL_ID })
    const prompt = `
      Translate the following Romanian text to English.
      Maintain a professional and editorial tone suitable for a cultural publishing platform.
      Return only the translated text.

      Text to translate:
      "${content}"
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text().trim()
  }
}

/**
 * Translates multiple fields at once using a single Gemini prompt.
 * This is more token-efficient and ensures consistency.
 */
export const translateFields = async (fields: Record<string, { content: any; type: 'text' | 'lexical' }>) => {
  if (!apiKey) {
    throw new Error('GOOGLE_AI_STUDIO_KEY is not defined in environment variables.')
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    generationConfig: { responseMimeType: 'application/json' },
  })

  const prompt = `
    You are an expert translator specializing in Romanian to English translation for a high-quality editorial platform.
    Your task is to translate the following fields from Romanian to English.
    
    CRITICAL INSTRUCTIONS:
    1. For "text" type: Translate the plain text.
    2. For "lexical" type: ONLY translate the values of the "text" keys within the JSON. DO NOT translate any other keys.
    3. PRESERVE the exact structure of the provided object.
    4. Maintain the tone and nuance of the original Romanian text.
    5. Return ONLY the translated JSON object, with no markdown formatting or extra text.
    
    Object to translate:
    ${JSON.stringify(fields)}
  `

  const result = await model.generateContent(prompt)
  const response = await result.response
  const translated = parseJsonFromModel(response.text())
  // Extract only the content from the translated fields
  const out: Record<string, any> = {}
  for (const key in translated) {
    out[key] = translated[key].content
  }
  return out
}
