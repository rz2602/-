/**
 * Versioned save data in localStorage.
 *
 * v0.1 only stores the last checkpoint and a few settings, but the shape
 * already has room for later systems (virtues, collectibles, story flags) so
 * future versions can extend it through `migrate()` instead of breaking saves.
 */

export const SAVE_VERSION = 1;
const STORAGE_KEY = 'mishkontin.save';

export interface GameSettings {
  debugMode: boolean;
}

export interface SaveData {
  version: typeof SAVE_VERSION;
  level: string;
  /** Id of the last activated checkpoint in `level`, or null for the level start. */
  checkpoint: string | null;
  settings: GameSettings;
  virtues: Record<string, number>;
  collectibles: Record<string, boolean>;
  storyFlags: Record<string, boolean>;
}

export const DEFAULT_LEVEL_ID = 'forest-test';

function createDefaultSave(): SaveData {
  return {
    version: SAVE_VERSION,
    level: DEFAULT_LEVEL_ID,
    checkpoint: null,
    settings: { debugMode: false },
    virtues: {},
    collectibles: {},
    storyFlags: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Upgrades older save formats. Only v1 exists so far; unknown data falls back to defaults. */
function migrate(raw: unknown): SaveData {
  const defaults = createDefaultSave();
  if (!isRecord(raw) || raw.version !== SAVE_VERSION) return defaults;

  const settings = isRecord(raw.settings) ? raw.settings : {};
  return {
    version: SAVE_VERSION,
    level: typeof raw.level === 'string' ? raw.level : defaults.level,
    checkpoint: typeof raw.checkpoint === 'string' ? raw.checkpoint : null,
    settings: {
      debugMode: typeof settings.debugMode === 'boolean' ? settings.debugMode : defaults.settings.debugMode,
    },
    virtues: isRecord(raw.virtues) ? (raw.virtues as Record<string, number>) : {},
    collectibles: isRecord(raw.collectibles) ? (raw.collectibles as Record<string, boolean>) : {},
    storyFlags: isRecord(raw.storyFlags) ? (raw.storyFlags as Record<string, boolean>) : {},
  };
}

export class SaveSystem {
  private static cache: SaveData | null = null;

  static load(): SaveData {
    if (this.cache) return this.cache;
    let parsed: unknown = null;
    try {
      const json = window.localStorage.getItem(STORAGE_KEY);
      parsed = json ? JSON.parse(json) : null;
    } catch {
      // Storage blocked (private mode) or corrupt JSON: play on with defaults.
      parsed = null;
    }
    this.cache = migrate(parsed);
    return this.cache;
  }

  static update(mutator: (data: SaveData) => void): SaveData {
    const data = this.load();
    mutator(data);
    this.write(data);
    return data;
  }

  static setCheckpoint(level: string, checkpointId: string | null): void {
    this.update((data) => {
      data.level = level;
      data.checkpoint = checkpointId;
    });
  }

  static getCheckpoint(level: string): string | null {
    const data = this.load();
    return data.level === level ? data.checkpoint : null;
  }

  static get settings(): GameSettings {
    return this.load().settings;
  }

  static updateSettings(patch: Partial<GameSettings>): void {
    this.update((data) => Object.assign(data.settings, patch));
  }

  /** Clears progress but keeps settings. */
  static resetProgress(): void {
    const settings = { ...this.load().settings };
    this.cache = { ...createDefaultSave(), settings };
    this.write(this.cache);
  }

  private static write(data: SaveData): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore quota/permission errors: progress simply isn't persisted.
    }
  }
}
