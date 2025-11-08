import { CollectionBeforeChangeHook } from 'payload'

const _getTimestamp = (value: unknown): number | null => {
  if (!value) return null

  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? null : time
  }

  return null
}

const _extractIncomingTimestamp = (data: Record<string, unknown>, req: any): number | null => {
  const fromData =
    _getTimestamp(data.updatedAt) ??
    _getTimestamp(data._updatedAt) ??
    _getTimestamp(data.createdAt) ??
    _getTimestamp(data._createdAt)

  if (fromData) return fromData

  const body = req?.body as Record<string, unknown> | undefined
  if (!body) return null

  return (
    _getTimestamp(body.updatedAt) ??
    _getTimestamp(body._updatedAt) ??
    _getTimestamp(body.createdAt) ??
    _getTimestamp(body._createdAt)
  )
}

export const preventStaleTitle: CollectionBeforeChangeHook = ({ data, originalDoc, req }) => {
  if (!data || !originalDoc || !req?.query) return

  const isAutosave = String(req.query.autosave) === 'true'
  if (!isAutosave) return

  const currentUpdatedAt = _getTimestamp(originalDoc.updatedAt)
  const incomingUpdatedAt = _extractIncomingTimestamp(data as Record<string, unknown>, req)

  if (!currentUpdatedAt || !incomingUpdatedAt) return
  if (incomingUpdatedAt >= currentUpdatedAt) return

  const currentTitle = originalDoc.title
  if (typeof currentTitle === 'string') {
    ;(data as Record<string, unknown>).title = currentTitle
  }

  const currentSlug = (originalDoc as Record<string, unknown>).slug
  if (typeof currentSlug === 'string') {
    ;(data as Record<string, unknown>).slug = currentSlug
  }
}
