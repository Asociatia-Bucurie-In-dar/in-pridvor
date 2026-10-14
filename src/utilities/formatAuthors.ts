import { Post } from '@/payload-types'

type Author = NonNullable<NonNullable<Post['populatedAuthors']>[number]>

/**
 * Formats an array of populatedAuthors from Posts into a prettified string,
 * using the conjunction and commas of the page language.
 * @example
 *
 * [Author1, Author2] becomes 'Author1 și Author2' (ro) / 'Author1 and Author2' (en)
 * [Author1, Author2, Author3] becomes 'Author1, Author2 și Author3' (ro) / 'Author1, Author2, and Author3' (en)
 *
 */
export const formatAuthors = (authors: Author[], locale = 'ro') => {
  // Ensure we don't have any authors without a name
  const authorNames = authors.map((author) => author.name).filter((name): name is string => Boolean(name))

  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(authorNames)
}
