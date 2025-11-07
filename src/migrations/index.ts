import * as migration_20251107_162500 from './20251107_162500'
import * as migration_20251107_170900 from './20251107_170900'

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
]
