import type { GlobalAfterChangeHook } from 'payload'

import { expireGlobal } from '@/utilities/revalidate'

export const revalidateFooter: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating footer`)

    // The footer is cached per locale (global_footer_ro / global_footer_en);
    // bust every locale so an edit propagates to all languages.
    expireGlobal('footer')
  }

  return doc
}
