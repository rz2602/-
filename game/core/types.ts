import type { RngState } from './rng';

export type ResKey = 'acorns' | 'wood' | 'stone' | 'cheese';
export const RES_KEYS: readonly ResKey[] = ['acorns', 'wood', 'stone', 'cheese'];
export type Resources = Record<ResKey, number>;
export type Cost = Partial<Resources>;

export type PlayerId = 'player' | 'enemy';
export type Owner = PlayerId | null;
export type Faction = 'forest' | 'rats' | 'neutral';
export type VirtueId = 'courage' | 'kindness' | 'wisdom';
export const VIRTUES: readonly VirtueId[] = ['courage', 'kindness', 'wisdom'];

export type SkillId =
  | 'cartography'
  | 'logistics'
  | 'archery'
  | 'offense'
  | 'armor'
  | 'sorcery'
  | 'leadership'
  | 'luck'
  | 'estates';

export type SpellId =
  | 'arrow'
  | 'heal'
  | 'haste'
  | 'shield'
  | 'slow'
  | 'fireflies'
  | 'bless'
  | 'lightning'
  | 'farsight';

export interface Stack {
  cid: string;
  n: number;
}
export type Army = (Stack | null)[];
export const ARMY_SLOTS = 5;

export interface HeroAi {
  targetId: string | null;
  tx: number;
  ty: number;
  /** Raiders head straight for a target town; guards stay near home. */
  role: 'roam' | 'raider' | 'guard' | 'boss';
  homeTownId: string | null;
  /** Day from which a 'boss' hero starts hunting. */
  activeFrom: number;
}

export interface Hero {
  id: string;
  name: string;
  title: string;
  owner: PlayerId;
  faction: Faction;
  portrait: string;
  specialty: string;
  x: number;
  y: number;
  mp: number;
  level: number;
  xp: number;
  att: number;
  def: number;
  pow: number;
  kno: number;
  sp: number;
  skills: Partial<Record<SkillId, number>>;
  spells: SpellId[];
  artifacts: string[];
  army: Army;
  alive: boolean;
  /** Story heroes cannot be dismissed and their loss may end the scenario. */
  story: boolean;
  /** Object ids this hero already used (one-time-per-hero shrines). */
  visited: string[];
  /** Level-up choices waiting for the player (human heroes only). */
  pendingLevelUps: LevelUpOffer[];
  ai: HeroAi | null;
  facing: 1 | -1;
}

export interface LevelUpOffer {
  stat: 'att' | 'def' | 'pow' | 'kno';
  options: SkillId[];
}

export interface Town {
  id: string;
  name: string;
  faction: Faction;
  owner: Owner;
  x: number;
  y: number;
  built: string[];
  builtToday: boolean;
  available: Record<string, number>;
  garrison: Army;
  spells: SpellId[];
  /** Special story town flavour (e.g. Sirengrad). */
  special?: string;
}

interface ObjBase {
  id: string;
  x: number;
  y: number;
  /** Consumed objects are removed from the map (kept for ids / save stability). */
  done?: boolean;
}

export type MapObject =
  | (ObjBase & { kind: 'resource'; res: ResKey; amount: number })
  | (ObjBase & { kind: 'chest'; acorns: number; xp: number })
  | (ObjBase & { kind: 'artifact'; art: string })
  | (ObjBase & {
      kind: 'monster';
      cid: string;
      n: number;
      /** Custom name shown on hover (story guards). */
      label?: string;
      /** Monsters marked as joinable may offer to join a kind hero. */
      joinable?: boolean;
      /** Dialogue shown after this monster is defeated. */
      afterDialogue?: string;
      /** Flag set when defeated. */
      flag?: string;
      /** Never moves out of the way, never joins. */
      guard?: boolean;
    })
  | (ObjBase & { kind: 'mine'; res: ResKey; owner: Owner })
  | (ObjBase & { kind: 'dwelling'; cid: string; available: number; owner: Owner })
  | (ObjBase & { kind: 'shrine'; effect: ShrineEffect; value: number; spell?: SpellId; label?: string })
  | (ObjBase & { kind: 'npc'; npc: string; label: string; dialogue: string; repeatDialogue?: string; doneFlag?: string })
  | (ObjBase & { kind: 'event'; dialogue: string; onlyHuman?: boolean })
  | (ObjBase & { kind: 'sign'; text: string })
  | (ObjBase & { kind: 'questItem'; item: string; label: string; dialogue?: string })
  | (ObjBase & { kind: 'gate'; needFlag: string; label: string; lockedText: string })
  | (ObjBase & { kind: 'goal'; label: string; dialogue: string; flag: string });

export type ShrineEffect = 'att' | 'def' | 'pow' | 'kno' | 'xp' | 'spell' | 'mp' | 'sp' | 'reveal' | 'luckDay' | 'moraleDay';

export interface PlayerState {
  id: PlayerId;
  name: string;
  human: boolean;
  faction: Faction;
  res: Resources;
  explored: number[];
  /** Hero template ids that can be hired in this player's taverns. */
  heroPool: string[];
  /** Bonus to all AI income (difficulty). */
  incomeBonus: number;
}

export interface QuestEntry {
  id: string;
  title: string;
  text: string;
  done: boolean;
}

export interface Toast {
  text: string;
  icon?: string;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

export interface HeroCarry {
  level: number;
  xp: number;
  att: number;
  def: number;
  pow: number;
  kno: number;
  skills: Partial<Record<SkillId, number>>;
  spells: SpellId[];
  artifacts: string[];
}

export interface CampaignState {
  completed: string[];
  carry: Record<string, HeroCarry>;
  flags: Record<string, boolean>;
  virtues: Record<VirtueId, number>;
  items: string[];
  difficulty: Difficulty;
}

export interface GameState {
  v: number;
  scenario: string;
  day: number;
  w: number;
  h: number;
  terrain: string;
  objects: MapObject[];
  heroes: Hero[];
  towns: Town[];
  players: Record<PlayerId, PlayerState>;
  rng: RngState;
  flags: Record<string, boolean>;
  virtues: Record<VirtueId, number>;
  items: string[];
  quests: QuestEntry[];
  firedTriggers: string[];
  pendingDialogues: string[];
  toasts: Toast[];
  /** Short history shown in the adventure log. */
  log: string[];
  battle: import('./combat').Battle | null;
  status: 'play' | 'won' | 'lost';
  endReason: string;
  campaign: CampaignState;
  nextId: number;
  /** Day-scoped temporary bonuses: heroId -> {morale, luck} until end of day. */
  dayBonus: Record<string, { morale: number; luck: number }>;
  /** Weekly name shown at the start of a week. */
  weekName: string;
  /** A small non-story choice waiting for the player (chest, joining creatures...). */
  prompt: Prompt | null;
  /** Whose turn it is. The human always plays first each day. */
  turn: PlayerId;
  /** Scenario-specific counters (e.g. the day a town was lost). */
  vars: Record<string, number>;
}

export type Prompt =
  | { kind: 'chest'; heroId: string; objId: string; acorns: number; xp: number }
  | { kind: 'join'; heroId: string; objId: string; cid: string; n: number; cost: number }
  | { kind: 'info'; title: string; text: string; icon?: string };
