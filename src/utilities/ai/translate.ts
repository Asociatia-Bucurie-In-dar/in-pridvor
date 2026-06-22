import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

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
    // translating them as a batch, and writing them back into a deep clone of
    // the original structure. This guarantees the Lexical structure is
    // preserved exactly (only `text` values change) and avoids asking the model
    // to round-trip a large JSON blob — the failure mode that produced
    // unescaped-quote / invalid-JSON errors. JSON mode keeps the array valid.
    const cloned = JSON.parse(JSON.stringify(content))
    const textNodes = collectLexicalTextNodes(cloned)
    if (textNodes.length === 0) return cloned

    const strings = textNodes.map((n) => n.text)

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: { responseMimeType: 'application/json' },
    })

    const prompt = `
      You are an expert Romanian-to-English translator for a high-quality editorial platform.
      You will receive a JSON array of Romanian strings. Translate EACH string to English,
      preserving tone and nuance. Whitespace-only or punctuation-only strings must be
      returned unchanged.

      Return ONLY a JSON array of the translated strings, in the SAME ORDER and with the
      SAME LENGTH as the input array. Do not add, remove, merge, or reorder elements.

      Input array:
      ${JSON.stringify(strings)}
    `

    let translatedStrings: string[] | null = null
    let lastErr: unknown
    for (let attempt = 0; attempt < 2; attempt++) {
      const result = await model.generateContent(prompt)
      const response = await result.response
      try {
        const parsed = parseJsonFromModel(response.text())
        if (Array.isArray(parsed) && parsed.length === strings.length) {
          translatedStrings = parsed.map((s) => String(s))
          break
        }
        lastErr = new Error(
          `Translated array length ${Array.isArray(parsed) ? parsed.length : 'n/a'} != source ${strings.length}`,
        )
      } catch (e) {
        lastErr = e
        console.error(
          `Failed to parse Gemini lexical response (attempt ${attempt + 1}):`,
          response.text().slice(0, 300),
        )
      }
    }

    if (!translatedStrings) {
      throw lastErr instanceof Error
        ? lastErr
        : new Error('AI translation returned an invalid JSON structure.')
    }

    textNodes.forEach((node, i) => {
      node.text = translatedStrings![i]
    })
    return cloned
  } else {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
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
    model: 'gemini-2.5-flash',
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
