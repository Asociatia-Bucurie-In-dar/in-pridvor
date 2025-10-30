import * as migration_20251030_211217 from './20251030_211217';

export const migrations = [
  {
    up: migration_20251030_211217.up,
    down: migration_20251030_211217.down,
    name: '20251030_211217'
  },
];
