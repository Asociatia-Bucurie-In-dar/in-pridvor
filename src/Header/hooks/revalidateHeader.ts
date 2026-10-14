import type { GlobalAfterChangeHook } from 'payload'

import { expireGlobal } from '@/utilities/revalidate'

export const revalidateHeader: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating header`)

    // The header is cached per locale (global_header_ro / global_header_en);
    // bust every locale so an edit propagates to all languages.
    expireGlobal('header')
  }

  return doc
}
