import * as migration_20250214_061606 from './20250214_061606';

export const migrations = [
  {
    up: migration_20250214_061606.up,
    down: migration_20250214_061606.down,
    name: '20250214_061606'
  },
];
