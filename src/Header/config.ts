import type { GlobalConfig } from 'payload'

import { link } from '@/fields/link'
import { revalidateHeader } from './hooks/revalidateHeader'

export const Header: GlobalConfig = {
  slug: 'header',
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'navItems',
      type: 'array',
      fields: [
        link({
          appearances: false,
          relationTo: ['pages'],
        }),
        {
          name: 'sublinks',
          type: 'array',
          fields: [
            link({
              appearances: false,
              relationTo: ['pages'],
              overrides: {
                label: 'Sublink',
              },
            }),
            {
              name: 'children',
              type: 'array',
              fields: [
                link({
                  appearances: false,
                  relationTo: ['pages'],
                  overrides: {
                    label: 'Sub-sublink',
                  },
                }),
              ],
              admin: {
                initCollapsed: true,
              },
            },
          ],
          admin: {
            initCollapsed: true,
          },
        },
      ],
      maxRows: 12,
      admin: {
        initCollapsed: true,
        components: {
          RowLabel: '@/Header/RowLabel#RowLabel',
        },
      },
    },
  ],
  hooks: {
    afterChange: [revalidateHeader],
  },
}
