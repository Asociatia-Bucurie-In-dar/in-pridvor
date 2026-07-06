import type { Field } from 'payload'

/**
 * Builds the additive, non-localized "English Translation" group. Stored as
 * flat `en_*` columns (all scalar — no blocks/arrays), so the resulting
 * migration is pure ADD COLUMN. Leave any field empty to fall back to Romanian.
 */
export const enGroup = (fields: Field[]): Field => ({
  name: 'en',
  label: 'English Translation',
  type: 'group',
  admin: {
    description: 'Optional. Any field left empty falls back to the Romanian source.',
  },
  fields,
})
