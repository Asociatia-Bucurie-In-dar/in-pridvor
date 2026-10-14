import * as migration_20251107_162500 from './20251107_162500';
import * as migration_20251107_170900 from './20251107_170900';
import * as migration_20260617_114928_add_en_fields from './20260617_114928_add_en_fields';
import * as migration_20261014_060640_payload_3_90_upgrade from './20261014_060640_payload_3_90_upgrade';
import * as migration_20261014_070240_storage_object_key from './20261014_070240_storage_object_key';

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
    name: '20260617_114928_add_en_fields',
  },
  {
    up: migration_20261014_060640_payload_3_90_upgrade.up,
    down: migration_20261014_060640_payload_3_90_upgrade.down,
    name: '20261014_060640_payload_3_90_upgrade',
  },
  {
    up: migration_20261014_070240_storage_object_key.up,
    down: migration_20261014_070240_storage_object_key.down,
    name: '20261014_070240_storage_object_key'
  },
];
