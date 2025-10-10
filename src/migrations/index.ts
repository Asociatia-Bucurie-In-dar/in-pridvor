import * as migration_20251010_201038 from './20251010_201038';
import * as migration_20251010_202952 from './20251010_202952';

export const migrations = [
  {
    up: migration_20251010_201038.up,
    down: migration_20251010_201038.down,
    name: '20251010_201038',
  },
  {
    up: migration_20251010_202952.up,
    down: migration_20251010_202952.down,
    name: '20251010_202952'
  },
];
