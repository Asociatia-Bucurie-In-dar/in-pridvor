import type { CollectionAfterReadHook, PayloadRequest } from 'payload'
import type { User } from 'src/payload-types'

type Author = Pick<User, 'id' | 'name'>

// Every post read runs this hook, so a listing of 12 cards used to fire a users
// query per author per card. Lookups are shared across all docs read in one request.
const authorsByRequest = new WeakMap<PayloadRequest, Map<User['id'], Promise<Author | null>>>()

const findAuthor = (req: PayloadRequest, id: User['id']) => {
  let cache = authorsByRequest.get(req)
  if (!cache) {
    cache = new Map()
    authorsByRequest.set(req, cache)
  }

  let author = cache.get(id)
  if (!author) {
    author = req.payload.findByID({
      id,
      collection: 'users',
      depth: 0,
      select: { name: true },
      disableErrors: true,
      req,
    })
    cache.set(id, author)
  }
  return author
}

// The `user` collection has access control locked so that users are not publicly accessible
// This means that we need to populate the authors manually here to protect user privacy
// GraphQL will not return mutated user data that differs from the underlying schema
// So we use an alternative `populatedAuthors` field to populate the user data, hidden from the admin UI
export const populateAuthors: CollectionAfterReadHook = async ({ doc, req }) => {
  if (doc?.authors) {
    const ids: User['id'][] = doc.authors
      .map((author: User | User['id'] | null) => (typeof author === 'object' ? author?.id : author))
      .filter((id: User['id'] | undefined | null) => id != null)

    const authorDocs = await Promise.all(ids.map((id) => findAuthor(req, id)))

    doc.populatedAuthors = authorDocs
      .filter((authorDoc): authorDoc is Author => Boolean(authorDoc))
      .map((authorDoc) => ({
        id: authorDoc.id,
        name: authorDoc.name,
      }))
  }

  return doc
}
