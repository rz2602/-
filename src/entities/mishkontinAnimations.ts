import Phaser from 'phaser';
import { AssetKeys, CHARACTER_MOTION } from '../config/constants';

/** Shape of the JSON written by tools/build-mishkontin-atlas.mjs. */
export interface MishkontinManifest {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  anchor: { x: number; y: number; originX: number; originY: number };
  animations: Record<SourceSequence, number[]>;
}

/** Sequences as labelled on the supplied sprite sheet. */
export type SourceSequence = 'idle' | 'run' | 'jump' | 'fall' | 'land' | 'crouch' | 'hurt' | 'turn';

export const MishkontinAnims = {
  idle: 'mishkontin-idle',
  idleBlink: 'mishkontin-idle-blink',
  idleWink: 'mishkontin-idle-wink',
  run: 'mishkontin-run',
  jump: 'mishkontin-jump',
  fall: 'mishkontin-fall',
  land: 'mishkontin-land',
  crouch: 'mishkontin-crouch',
  crouchHold: 'mishkontin-crouch-hold',
  hurt: 'mishkontin-hurt',
  turn: 'mishkontin-turn',
} as const;

export type MishkontinAnimKey = (typeof MishkontinAnims)[keyof typeof MishkontinAnims];

interface AnimDef {
  key: MishkontinAnimKey;
  sequence: SourceSequence;
  /** Indices into the sequence (0-based, sheet numbering minus one). */
  frames: number[];
  frameRate: number;
  repeat: number;
}

/**
 * Animation choices per sheet sequence. Sheet IDLE frames 1,2,4 have open
 * eyes, 3 is a wink and 5,6 have closed eyes - so the plain loop uses the
 * open-eyed frames and the others become alternate idles.
 */
const ANIM_DEFS: AnimDef[] = [
  { key: MishkontinAnims.idle, sequence: 'idle', frames: [0, 1, 3, 1], frameRate: 3.5, repeat: -1 },
  { key: MishkontinAnims.idleBlink, sequence: 'idle', frames: [4, 5, 4], frameRate: 9, repeat: 0 },
  { key: MishkontinAnims.idleWink, sequence: 'idle', frames: [2, 2, 2, 2], frameRate: 6, repeat: 0 },
  { key: MishkontinAnims.run, sequence: 'run', frames: [0, 1, 2, 3, 4, 5, 6, 7, 8], frameRate: 14, repeat: -1 },
  // Sheet JUMP 1 is the on-ground anticipation pose; takeoff is instant, so start at 2.
  { key: MishkontinAnims.jump, sequence: 'jump', frames: [1, 2, 3], frameRate: 10, repeat: 0 },
  { key: MishkontinAnims.fall, sequence: 'fall', frames: [0, 1, 2, 3], frameRate: 8, repeat: -1 },
  { key: MishkontinAnims.land, sequence: 'land', frames: [0, 1, 2, 3, 4], frameRate: 24, repeat: 0 },
  { key: MishkontinAnims.crouch, sequence: 'crouch', frames: [3, 0], frameRate: 16, repeat: 0 },
  { key: MishkontinAnims.crouchHold, sequence: 'crouch', frames: [0, 1, 2, 1], frameRate: 4, repeat: -1 },
  { key: MishkontinAnims.hurt, sequence: 'hurt', frames: [0, 1, 2, 3, 4], frameRate: 8, repeat: 0 },
  { key: MishkontinAnims.turn, sequence: 'turn', frames: [0, 1, 2, 3, 4, 5], frameRate: 12, repeat: 0 },
];

export function registerMishkontinAnimations(scene: Phaser.Scene, manifest: MishkontinManifest): void {
  for (const def of ANIM_DEFS) {
    if (scene.anims.exists(def.key)) continue;
    const sequence = manifest.animations[def.sequence];
    scene.anims.create({
      key: def.key,
      frames: def.frames.map((i) => ({ key: AssetKeys.mishkontin, frame: sequence[i] })),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}

export function getMishkontinManifest(scene: Phaser.Scene): MishkontinManifest {
  return scene.cache.json.get(AssetKeys.mishkontinManifest) as MishkontinManifest;
}

// ------------------------------------------------------------------------
// Mishkontin V2 (high-resolution animation set, tools/build-mishkontin-v2.mjs)
// ------------------------------------------------------------------------

/** Runtime manifest written by tools/build-mishkontin-v2.mjs. */
export interface MishkontinV2Manifest {
  runtimePxPerLogical: number;
  cell: { width: number; height: number };
  anchor: { x: number; y: number };
  animations: Record<string, string[]>;
}

/** The animations the gameplay character needs, whichever art set is active. */
export interface CharacterAnimSet {
  idle: string;
  idleVariants: Array<{ anim: string; weight: number }>;
  run: string;
  jump: string;
  fall: string;
  land: string;
  crouch: string;
  crouchHold: string;
  hurt: string;
  turn: string;
  /** Optional polish animations (V2): calm descent, long-fall loop, getting up from a crouch. */
  fallLong?: string;
  crouchRise?: string;
}

export const LegacyAnimSet: CharacterAnimSet = {
  idle: MishkontinAnims.idle,
  idleVariants: [
    { anim: MishkontinAnims.idleBlink, weight: 3 },
    { anim: MishkontinAnims.idleWink, weight: 1 },
  ],
  run: MishkontinAnims.run,
  jump: MishkontinAnims.jump,
  fall: MishkontinAnims.fall,
  land: MishkontinAnims.land,
  crouch: MishkontinAnims.crouch,
  crouchHold: MishkontinAnims.crouchHold,
  hurt: MishkontinAnims.hurt,
  turn: MishkontinAnims.turn,
};

export const MishkontinV2Anims = {
  idle: 'mishkontin2-idle',
  idleBlink: 'mishkontin2-idle-blink',
  run: 'mishkontin2-run',
  jump: 'mishkontin2-jump',
  fall: 'mishkontin2-fall',
  land: 'mishkontin2-land',
  crouch: 'mishkontin2-crouch',
  crouchHold: 'mishkontin2-crouch-hold',
  crouchRise: 'mishkontin2-crouch-rise',
  fallLong: 'mishkontin2-fall-long',
  blinkSheet: 'mishkontin2-blink',
  hurt: 'mishkontin2-hurt',
  turn: 'mishkontin2-turn',
  wave: 'mishkontin2-wave',
  surprised: 'mishkontin2-surprised',
  readMap: 'mishkontin2-read-map',
  sit: 'mishkontin2-sit',
  sleep: 'mishkontin2-sleep',
  sleepLoop: 'mishkontin2-sleep-loop',
} as const;

export const V2AnimSet: CharacterAnimSet = {
  idle: MishkontinV2Anims.idle,
  // Blink only: the other personality animations are never triggered randomly.
  idleVariants: [{ anim: MishkontinV2Anims.idleBlink, weight: 1 }],
  run: MishkontinV2Anims.run,
  jump: MishkontinV2Anims.jump,
  fall: MishkontinV2Anims.fall,
  land: MishkontinV2Anims.land,
  crouch: MishkontinV2Anims.crouch,
  crouchHold: MishkontinV2Anims.crouchHold,
  hurt: MishkontinV2Anims.hurt,
  turn: MishkontinV2Anims.turn,
  fallLong: MishkontinV2Anims.fallLong,
  crouchRise: MishkontinV2Anims.crouchRise,
};

/** Personality / story animations (callable; gameplay input always interrupts). */
export type PersonalityAnimation = 'wave' | 'surprised' | 'readMap' | 'sit' | 'sleep' | 'blink';

export const PERSONALITY_V2: Record<PersonalityAnimation, { anim: string; loops: boolean }> = {
  blink: { anim: MishkontinV2Anims.blinkSheet, loops: false },
  wave: { anim: MishkontinV2Anims.wave, loops: false },
  surprised: { anim: MishkontinV2Anims.surprised, loops: false },
  readMap: { anim: MishkontinV2Anims.readMap, loops: true },
  sit: { anim: MishkontinV2Anims.sit, loops: true },
  // Sleep settles down once, then the Z loop follows (see Mishkontin.onAnimationComplete).
  sleep: { anim: MishkontinV2Anims.sleep, loops: true },
};

/**
 * V2 animation choices. Frames are [sheet, index] or [sheet, index, ms] (a
 * per-frame duration replaces the frame rate for that frame). Sheets = files
 * in art/masters/characters/mishkontin_v2.
 *
 * Notes from the movement polish pass (art/MISHKONTIN_V2_MOVEMENT_POLISH_REPORT.md):
 * - idle sheet frame 2 has closed eyes and frames 3-4 change expression, so
 *   looping all six made Mishkontin blink every 1.2 s and pull faces; the
 *   loop uses the calm open-eyed frames and the blink reuses idle frame 2
 *   (same pose - the separate blink sheet is drawn in a different pose).
 * - fall sheet frames 0-2 are a frantic flail; the calm jump frame 4 is the
 *   descent, the flail only plays on long falls.
 */
type V2Frame = [sheet: string, index: number, ms?: number];
/** Frames are explicit, or `{ allOf: sheet }` = every frame of that sheet in order (the run: 8 now, 12 later). */
type V2Def = { key: string; frames: V2Frame[] | { allOf: string }; frameRate: number | { cycleMs: number }; repeat: number };
const V2_DEFS: V2Def[] = [
  { key: MishkontinV2Anims.idle, frames: [['idle', 0, 620], ['idle', 1, 520], ['idle', 5, 600], ['idle', 1, 520]], frameRate: 2, repeat: -1 },
  { key: MishkontinV2Anims.idleBlink, frames: [['idle', 0, 60], ['idle', 2, 130], ['idle', 0, 90]], frameRate: 10, repeat: 0 },
  { key: MishkontinV2Anims.blinkSheet, frames: [['blink', 0], ['blink', 1], ['blink', 2], ['blink', 1], ['blink', 3]], frameRate: 10, repeat: 0 },
  { key: MishkontinV2Anims.run, frames: { allOf: 'run' }, frameRate: { cycleMs: CHARACTER_MOTION.runCycleMs }, repeat: -1 },
  // Launch is brief, the rise reads longer; the peak pose (3) holds until the apex has passed.
  { key: MishkontinV2Anims.jump, frames: [['jump', 1, 70], ['jump', 2, 150], ['jump', 3]], frameRate: 10, repeat: 0 },
  { key: MishkontinV2Anims.fall, frames: [['jump', 4]], frameRate: 1, repeat: 0 },
  { key: MishkontinV2Anims.fallLong, frames: [['fall', 1, 220], ['fall', 2, 220]], frameRate: 5, repeat: -1 },
  // Impact squash -> low -> recover; landing into a run cuts in after the squash.
  { key: MishkontinV2Anims.land, frames: [['land', 3, 60], ['land', 4, 80], ['land', 5, 120]], frameRate: 14, repeat: 0 },
  { key: MishkontinV2Anims.crouch, frames: [['crouch', 1, 50], ['crouch', 2, 50], ['crouch', 3]], frameRate: 16, repeat: 0 },
  { key: MishkontinV2Anims.crouchHold, frames: [['crouch', 3]], frameRate: 1, repeat: -1 },
  { key: MishkontinV2Anims.crouchRise, frames: [['crouch', 2, 50], ['crouch', 1, 60]], frameRate: 16, repeat: 0 },
  { key: MishkontinV2Anims.hurt, frames: [0, 1, 2, 3, 4].map((i) => ['hurt', i] as V2Frame), frameRate: 8, repeat: 0 },
  { key: MishkontinV2Anims.turn, frames: [0, 1, 2, 3, 4, 5].map((i) => ['turn', i] as V2Frame), frameRate: 12, repeat: 0 },
  { key: MishkontinV2Anims.wave, frames: [0, 1, 2, 3, 2, 3, 4, 5].map((i) => ['wave', i] as V2Frame), frameRate: 8, repeat: 0 },
  { key: MishkontinV2Anims.surprised, frames: [['surprised', 0], ['surprised', 1], ['surprised', 2, 280], ['surprised', 3]], frameRate: 7, repeat: 0 },
  { key: MishkontinV2Anims.readMap, frames: [0, 1, 2, 3, 4, 5].map((i) => ['read_map', i] as V2Frame), frameRate: 3, repeat: -1 },
  { key: MishkontinV2Anims.sit, frames: [0, 1, 2, 3, 4, 5].map((i) => ['sit', i] as V2Frame), frameRate: 3, repeat: -1 },
  { key: MishkontinV2Anims.sleep, frames: [['sleep', 0], ['sleep', 1]], frameRate: 2, repeat: 0 },
  { key: MishkontinV2Anims.sleepLoop, frames: [['sleep', 2], ['sleep', 3]], frameRate: 1.5, repeat: -1 },
];

export function getMishkontinV2Manifest(scene: Phaser.Scene): MishkontinV2Manifest {
  return scene.cache.json.get(AssetKeys.mishkontinV2Manifest) as MishkontinV2Manifest;
}

export function registerMishkontinV2Animations(scene: Phaser.Scene, manifest: MishkontinV2Manifest): void {
  for (const def of V2_DEFS) {
    if (scene.anims.exists(def.key)) continue;
    const frames: V2Frame[] = Array.isArray(def.frames) ? def.frames : manifest.animations[def.frames.allOf].map((_, i) => [(def.frames as { allOf: string }).allOf, i]);
    scene.anims.create({
      key: def.key,
      frames: frames.map(([sheet, i, ms]) => ({ key: AssetKeys.mishkontinV2, frame: manifest.animations[sheet][i], ...(ms ? { duration: ms } : {}) })),
      frameRate: typeof def.frameRate === 'number' ? def.frameRate : (frames.length * 1000) / def.frameRate.cycleMs,
      repeat: def.repeat,
    });
  }
}

/** All V2 animation keys (for the developer animation lab). */
export const V2_ANIMATION_KEYS = V2_DEFS.map((d) => d.key);
