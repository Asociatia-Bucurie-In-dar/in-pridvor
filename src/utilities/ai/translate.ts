import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GOOGLE_AI_STUDIO_KEY || ''
const genAI = new GoogleGenerativeAI(apiKey)

/**
 * Translates content from Romanian to English using Gemini 2.5 Flash.
 * Handles both plain text and Lexical JSON structures.
 */
export const translateToEnglish = async (content: any, type: 'text' | 'lexical' = 'text') => {
  if (!apiKey) {
    throw new Error('GOOGLE_AI_STUDIO_KEY is not defined in environment variables.')
  }

  // Use gemini-2.5-flash for faster and cost-effective translation
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  if (type === 'lexical') {
    const prompt = `
      You are an expert translator specializing in Romanian to English translation for a high-quality editorial platform.
      Your task is to translate the following Lexical JSON content from Romanian to English.
      
      CRITICAL INSTRUCTIONS:
      1. ONLY translate the values of the "text" keys.
      2. DO NOT translate any other keys (e.g., "type", "format", "version", "style", "mode", "direction").
      3. PRESERVE the exact JSON structure.
      4. Maintain the tone and nuance of the original Romanian text.
      5. Return ONLY the translated JSON object, with no markdown formatting or extra text.
      
      JSON to translate:
      ${JSON.stringify(content)}
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text().trim().replace(/^```json/, '').replace(/```$/, '').trim()
    
    try {
      return JSON.parse(text)
    } catch (e) {
      console.error('Failed to parse Gemini response as JSON:', text)
      throw new Error('AI translation returned an invalid JSON structure.')
    }
  } else {
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

  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

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
  const text = response.text().trim().replace(/^```json/, '').replace(/```$/, '').trim()
  
  try {
    const translated = JSON.parse(text)
    // Extract only the content from the translated fields
    const result: Record<string, any> = {}
    for (const key in translated) {
      result[key] = translated[key].content
    }
    return result
  } catch (e) {
    console.error('Failed to parse Gemini response as JSON:', text)
    throw new Error('AI translation returned an invalid JSON structure.')
  }
}
