import type { Cost, GameState, MapObject, PlayerId, Resources, SpellId, VirtueId, Army } from './types';

/** Things that happen in the world; triggers listen to these. */
export type GameEvent =
  | { t: 'start' }
  | { t: 'day' }
  | { t: 'visit'; objId: string; heroId: string }
  | { t: 'enter'; x: number; y: number; heroId: string }
  | { t: 'defeatMonster'; objId: string; heroId: string }
  | { t: 'defeatHero'; heroId: string; by: PlayerId }
  | { t: 'capture'; townId: string; by: PlayerId }
  | { t: 'dialogueEnd'; id: string };

export type Action =
  | { a: 'dialogue'; id: string }
  | { a: 'flag'; flag: string; value?: boolean }
  | { a: 'virtue'; v: VirtueId; n: number }
  | { a: 'res'; res: Cost; who?: PlayerId }
  | { a: 'item'; item: string }
  | { a: 'artifact'; art: string; hero?: string }
  | { a: 'troops'; cid: string; n: number; hero?: string }
  | { a: 'quest'; id: string; title: string; text: string }
  | { a: 'questDone'; id: string }
  | { a: 'reveal'; x: number; y: number; r: number }
  | { a: 'spawnHero'; tpl: string; owner: PlayerId; x: number; y: number; role?: 'roam' | 'raider' | 'guard' | 'boss'; army?: [string, number][]; activeFrom?: number; targetTown?: string }
  | { a: 'removeObj'; id: string }
  | { a: 'addObj'; obj: MapObject }
  | { a: 'xp'; n: number; hero?: string }
  | { a: 'spell'; spell: SpellId; hero?: string }
  | { a: 'win' }
  | { a: 'lose'; reason: string }
  | { a: 'toast'; text: string; icon?: string }
  | { a: 'call'; fn: (s: GameState) => void };

export interface Trigger {
  id: string;
  when: (s: GameState, e: GameEvent) => boolean;
  actions: Action[];
  repeat?: boolean;
}

export type Speaker = string;

export interface DialogueLine {
  who: Speaker;
  text: string;
  mood?: 'idle' | 'happy' | 'map' | 'surprised';
  /** Line is skipped unless this returns true. */
  requires?: (s: GameState) => boolean;
}

export interface DialogueChoice {
  text: string;
  virtue?: VirtueId;
  actions: Action[];
  /** Hidden unless this returns true. */
  requires?: (s: GameState) => boolean;
  /** Shown (greyed) explanation when `requires` fails; if absent the choice is hidden. */
  lockedHint?: string;
}

export interface Dialogue {
  id: string;
  title?: string;
  bg?: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  /** Actions applied when a dialogue without choices closes. */
  after?: Action[];
}

export interface LegendTown {
  kind: 'town';
  id: string;
  name: string;
  faction: 'forest' | 'rats';
  owner: PlayerId | null;
  built: string[];
  garrison?: [string, number][];
  special?: string;
}

export interface LegendHero {
  kind: 'hero';
  tpl: string;
  owner: PlayerId;
  carry?: boolean;
  army?: [string, number][];
  role?: 'roam' | 'raider' | 'guard' | 'boss';
  activeFrom?: number;
  targetTown?: string;
}

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type LegendObject = DistOmit<MapObject, 'x' | 'y' | 'id'> & { id?: string };

export interface LegendEntry {
  terrain?: string;
  town?: LegendTown;
  hero?: LegendHero;
  obj?: LegendObject;
}

export interface ScenarioDef {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  bg: string;
  intro: string[];
  goals: string[];
  /** Rows of the map; characters are terrain or legend keys. */
  map: string[];
  legend: Record<string, LegendEntry>;
  startRes: Record<PlayerId, Resources>;
  heroPool: Record<PlayerId, string[]>;
  triggers: Trigger[];
  dialogues: Record<string, Dialogue>;
  /** Called after every event; return a result to end the scenario. */
  checkEnd: (s: GameState) => { status: 'won' | 'lost'; reason: string } | null;
  /** Dialogue shown when the scenario is won (may branch on flags). */
  victoryDialogue: (s: GameState) => string;
  weekNames?: string[];
  /** Extra setup hook (e.g. adapt the map to campaign flags). */
  setup?: (s: GameState) => void;
  /** Starting armies for campaign heroes whose army is not carried over. */
  carryArmies?: Record<string, Army>;
}
