import { randomBytes } from 'node:crypto'
import type { CollectionBeforeValidateHook } from 'payload'

const _generateId = () => randomBytes(12).toString('hex')

export const ensureUniqueLayoutBlockIDs: CollectionBeforeValidateHook = ({ data }) => {
  if (!data) return data

  const layout = (data as Record<string, unknown>).layout
  if (!Array.isArray(layout)) return data

  const _seen = new Set<string>()

  const _nextId = (candidate: unknown): string => {
    if (typeof candidate === 'string' && candidate && !_seen.has(candidate)) {
      _seen.add(candidate)
      return candidate
    }

    let id = _generateId()
    while (_seen.has(id)) {
      id = _generateId()
    }
    _seen.add(id)
    return id
  }

  const nextLayout = layout.map((block) => {
    if (!block || typeof block !== 'object') return block

    const record = block as Record<string, unknown>
    const id = _nextId(record.id)
    return {
      ...record,
      id,
    }
  })

  return {
    ...(data as Record<string, unknown>),
    layout: nextLayout,
  }
}

