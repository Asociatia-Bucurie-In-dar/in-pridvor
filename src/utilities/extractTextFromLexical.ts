/**
 * Extracts plain text from Lexical editor content
 * @param content - The Lexical content object
 * @param maxLength - Maximum character length (default: 200)
 * @returns Truncated plain text with ellipsis
 */
export function extractTextFromLexical(content: any, maxLength: number = 200): string {
  if (!content || !content.root || !content.root.children) {
    return ''
  }

  let text = ''

  const extractFromNode = (node: any): void => {
    if (!node) return

    // Handle text nodes
    if (node.type === 'text' && node.text) {
      text += node.text
    }

    // Handle line breaks
    if (node.type === 'linebreak') {
      text += ' '
    }

    // Recursively process children
    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        if (text.length >= maxLength) break
        extractFromNode(child)
      }
    }
  }

  // Process all root children
  for (let i = 0; i < content.root.children.length; i++) {
    if (text.length >= maxLength) break

    const child = content.root.children[i]

    // Add space between paragraphs (but not before the first one)
    if (i > 0 && (child.type === 'paragraph' || child.type === 'heading')) {
      text += ' '
    }

    extractFromNode(child)
  }

  // Clean up whitespace - preserve single spaces but collapse multiple consecutive spaces
  text = text.replace(/\s{2,}/g, ' ').trim()

  // Truncate and add ellipsis
  if (text.length > maxLength) {
    text = text.substring(0, maxLength).trim()
    // Try to break at last word boundary
    const lastSpace = text.lastIndexOf(' ')
    if (lastSpace > maxLength * 0.8) {
      text = text.substring(0, lastSpace)
    }
    text += '...'
  }

  return text
}
