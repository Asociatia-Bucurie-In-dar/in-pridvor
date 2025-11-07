import * as migration_20251107_162500 from './20251107_162500'

export const migrations = [
  {
    up: migration_20251107_162500.up,
    down: migration_20251107_162500.down,
    name: '20251107_162500',
  },
]
