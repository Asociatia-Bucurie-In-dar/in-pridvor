import type { CollectionAfterReadHook } from 'payload'

export const populateAuthors: CollectionAfterReadHook = async ({ doc, req, req: { payload } }) => {
  if (doc?.authors) {
    const authorIds = doc.authors
      .map((a: any) => (typeof a === 'object' ? a?.id : a))
      .filter(Boolean)

    if (authorIds.length === 0) {
      doc.populatedAuthors = []
      return doc
    }

    const result = await payload.find({
      collection: 'users',
      where: { id: { in: authorIds } },
      limit: authorIds.length,
      depth: 0,
      select: { id: true, name: true } as any,
      req,
    })

    doc.populatedAuthors = result.docs.map((d) => ({
      id: d.id,
      name: (d as any).name,
    }))
  }

  return doc
}
