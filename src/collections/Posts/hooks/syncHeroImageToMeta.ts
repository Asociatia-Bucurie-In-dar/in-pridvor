import type { CollectionAfterReadHook, CollectionBeforeChangeHook } from 'payload'

import type { Post } from '@/payload-types'

type _Meta = NonNullable<Post['meta']>

const _cloneMeta = (meta: Post['meta']): _Meta => {
  if (!meta) return {}
  return { ...meta }
}

const _hasHeroKey = (data: Partial<Post>) => {
  return Object.prototype.hasOwnProperty.call(data, 'heroImage')
}

const _hasTitleKey = (data: Partial<Post>) => {
  return Object.prototype.hasOwnProperty.call(data, 'title')
}

const _isString = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0
}

export const syncHeroImageToMeta: CollectionBeforeChangeHook<Post> = ({ data, originalDoc }) => {
  if (!data) return

  const _data = data as Partial<Post>
  const _original = (originalDoc ?? {}) as Partial<Post>
  const _heroExists = _hasHeroKey(_data)
  const _heroValue = _heroExists ? _data.heroImage : _original.heroImage
  const _titleExists = _hasTitleKey(_data)
  const _titleValue = _titleExists ? _data.title : _original.title

  const _meta = _cloneMeta(_data.meta)

  if (_heroExists && _data.heroImage === null) {
    _meta.image = null
  } else if (_heroValue !== undefined) {
    _meta.image = _heroValue
  }

  if (_titleExists && _data.title === null) {
    _meta.title = null
  } else if (_isString(_titleValue)) {
    _meta.title = _titleValue
  }

  _data.meta = _meta
}

export const fillMetaFromHero: CollectionAfterReadHook<Post> = ({ doc }) => {
  if (!doc) return doc

  const _doc = doc as Post
  const _meta = _cloneMeta(_doc.meta)
  let _changed = false

  if (_doc.heroImage && _meta.image == null) {
    _meta.image = _doc.heroImage
    _changed = true
  }

  if (_isString(_doc.title) && !_isString(_meta.title)) {
    _meta.title = _doc.title
    _changed = true
  }

  if (!_changed) return doc

  return {
    ..._doc,
    meta: _meta,
  }
}

