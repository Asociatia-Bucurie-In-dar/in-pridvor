import * as migration_20250211_180251_initial from './20250211_180251_initial';
import * as migration_20250213_162905_initial from './20250213_162905_initial';

export const migrations = [
  {
    up: migration_20250211_180251_initial.up,
    down: migration_20250211_180251_initial.down,
    name: '20250211_180251_initial',
  },
  {
    up: migration_20250213_162905_initial.up,
    down: migration_20250213_162905_initial.down,
    name: '20250213_162905_initial'
  },
];
