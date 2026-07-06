import * as migration_20251107_162500 from './20251107_162500';
import * as migration_20251107_170900 from './20251107_170900';
import * as migration_20260617_114928_add_en_fields from './20260617_114928_add_en_fields';

export const migrations = [
  {
    up: migration_20251107_162500.up,
    down: migration_20251107_162500.down,
    name: '20251107_162500',
  },
  {
    up: migration_20251107_170900.up,
    down: migration_20251107_170900.down,
    name: '20251107_170900',
  },
  {
    up: migration_20260617_114928_add_en_fields.up,
    down: migration_20260617_114928_add_en_fields.down,
    name: '20260617_114928_add_en_fields'
  },
];
