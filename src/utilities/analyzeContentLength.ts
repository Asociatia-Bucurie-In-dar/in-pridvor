import type { DefaultTypedEditorState } from '@payloadcms/richtext-lexical'

/**
 * Analyzes RichText content to determine if it's substantial enough for a drop cap
 * This runs server-side and is SEO-friendly
 */
export const shouldShowDropCap = (content: DefaultTypedEditorState): boolean => {
  if (!content?.root?.children) return false

  // Find the first paragraph node
  const firstParagraph = content.root.children.find(
    (child: any) =>
      child.type === 'paragraph' &&
      child.children &&
      child.children.length > 0 &&
      child.children.some(
        (textChild: any) =>
          textChild.type === 'text' && textChild.text && textChild.text.trim().length > 0,
      ),
  )

  if (!firstParagraph) return false

  // Get the text content from the first paragraph
  const getTextContent = (node: any): string => {
    if (node.type === 'text') {
      return node.text || ''
    }
    if (node.children) {
      return node.children.map(getTextContent).join('')
    }
    return ''
  }

  const firstParagraphText = getTextContent(firstParagraph).trim()

  // Estimate line count based on text length
  // Using more conservative estimates for better accuracy
  const estimatedCharactersPerLine = 50 // Reduced from 60
  const estimatedLines = Math.ceil(firstParagraphText.length / estimatedCharactersPerLine)

  // Also check if the paragraph has enough words (another indicator)
  const wordCount = firstParagraphText.split(/\s+/).filter((word) => word.length > 0).length
  const estimatedWordsPerLine = 10 // Reduced from 12
  const estimatedLinesFromWords = Math.ceil(wordCount / estimatedWordsPerLine)

  // Show drop cap if either estimation suggests 3+ lines
  // But also require minimum character/word thresholds
  const hasMinimumLength = firstParagraphText.length >= 150 // At least 150 characters
  const hasMinimumWords = wordCount >= 25 // At least 25 words

  return (
    (estimatedLines >= 3 || estimatedLinesFromWords >= 3) && hasMinimumLength && hasMinimumWords
  )
}
