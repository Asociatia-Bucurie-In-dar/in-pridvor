import type { CollectionAfterChangeHook } from 'payload'

import { expireTag } from '@/utilities/revalidate'

export const revalidateRedirects: CollectionAfterChangeHook = ({ doc, req: { payload } }) => {
  payload.logger.info(`Revalidating redirects`)

  expireTag('redirects')

  return doc
}
