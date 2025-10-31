import type { Block } from 'payload'

export const TitleBar: Block = {
  slug: 'titleBar',
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'prefix',
      type: 'text',
      admin: {
        description: 'Optional prefix text before the title (e.g., "Rubrica:")',
      },
    },
  ],
  interfaceName: 'TitleBarBlock',
}
