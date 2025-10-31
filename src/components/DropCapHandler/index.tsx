'use client'

import { useEffect } from 'react'

/**
 * Client component that handles drop cap application by counting actual paragraph elements
 * This is more reliable than CSS :nth-of-type() when content has mixed elements (headings, blocks, etc.)
 */
export const DropCapHandler: React.FC<{
  containerSelector: string
  dropCapIndex?: number
}> = ({ containerSelector, dropCapIndex }) => {
  useEffect(() => {
    if (!dropCapIndex || dropCapIndex < 1) {
      // Remove drop cap class from all paragraphs if no index specified
      const container = document.querySelector(containerSelector)
      if (container) {
        container.querySelectorAll('p.drop-cap-target').forEach((p) => {
          p.classList.remove('drop-cap-target')
        })
      }
      return
    }

    let attempts = 0
    const maxAttempts = 20 // Try for up to 2 seconds (20 * 100ms)

    const applyDropCap = () => {
      attempts++

      const container = document.querySelector(containerSelector)
      if (!container) {
        if (attempts < maxAttempts) {
          setTimeout(applyDropCap, 100)
        }
        return
      }

      // Find all paragraphs in the container
      // The RichText component might render paragraphs in different structures
      const allParagraphs = container.querySelectorAll('p')
      const paragraphs: HTMLParagraphElement[] = Array.from(allParagraphs).filter((p) => {
        const text = p.textContent?.trim() || ''
        if (text.length === 0) {
          return false
        }

        // Filter out paragraphs that are inside blocks or other nested structures
        // Only keep paragraphs that are top-level content paragraphs
        let parent = p.parentElement
        while (parent && parent !== container) {
          // Skip if inside blocks or complex structures
          const classList = parent.classList
          if (
            classList.contains('block') ||
            classList.contains('media-block') ||
            classList.contains('banner-block') ||
            classList.contains('code-block') ||
            classList.contains('cta-block') ||
            classList.contains('video-embed-block') ||
            parent.tagName.toLowerCase() === 'blockquote' ||
            parent.tagName.toLowerCase() === 'aside'
          ) {
            return false
          }
          parent = parent.parentElement
        }
        return true
      }) as HTMLParagraphElement[]

      console.log(
        `Found ${paragraphs.length} top-level paragraphs in container (looking for paragraph ${dropCapIndex})`,
      )

      if (paragraphs.length < dropCapIndex) {
        console.log(
          `Not enough paragraphs yet (${paragraphs.length} < ${dropCapIndex}), retrying...`,
        )
        if (attempts < maxAttempts) {
          setTimeout(applyDropCap, 100)
        }
        return
      }

      // Remove drop cap class from all paragraphs and explicitly reset their first-letter styles
      paragraphs.forEach((p, index) => {
        p.classList.remove('drop-cap-target')

        // For the first paragraph, we need to explicitly remove any default drop cap styles
        // by adding a class that resets it
        if (index === 0 && dropCapIndex !== 1) {
          // Explicitly remove drop cap from first paragraph
          p.classList.add('drop-cap-reset')
        } else {
          p.classList.remove('drop-cap-reset')
        }
      })

      // Add drop cap class to the specified paragraph
      const targetParagraph = paragraphs[dropCapIndex - 1]
      if (targetParagraph) {
        targetParagraph.classList.add('drop-cap-target')

        // Double-check by inspecting the element
        const hasClass = targetParagraph.classList.contains('drop-cap-target')
        console.log(
          `✓ Applied drop cap to paragraph ${dropCapIndex} of ${paragraphs.length}`,
          targetParagraph.textContent?.substring(0, 50),
          `Class present: ${hasClass}`,
          `Element:`,
          targetParagraph,
        )

        // Verify it's not the first paragraph
        const isFirstParagraph = paragraphs.indexOf(targetParagraph) === 0
        if (isFirstParagraph && dropCapIndex !== 1) {
          console.error(
            `WARNING: Selected paragraph is the first paragraph, but dropCapIndex is ${dropCapIndex}`,
          )
        }
      } else {
        console.error(`Failed to find paragraph ${dropCapIndex}`)
      }
    }

    // Start trying
    applyDropCap()

    // Cleanup on unmount
    return () => {
      const container = document.querySelector(containerSelector)
      if (container) {
        container.querySelectorAll('p.drop-cap-target').forEach((p) => {
          p.classList.remove('drop-cap-target')
        })
      }
    }
  }, [containerSelector, dropCapIndex])

  return null
}
