import Phaser from 'phaser';
import { AssetKeys } from '../config/constants';

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
};

/** Personality / story animations (callable; gameplay input always interrupts). */
export type PersonalityAnimation = 'wave' | 'surprised' | 'readMap' | 'sit' | 'sleep' | 'blink';

export const PERSONALITY_V2: Record<PersonalityAnimation, { anim: string; loops: boolean }> = {
  blink: { anim: MishkontinV2Anims.idleBlink, loops: false },
  wave: { anim: MishkontinV2Anims.wave, loops: false },
  surprised: { anim: MishkontinV2Anims.surprised, loops: false },
  readMap: { anim: MishkontinV2Anims.readMap, loops: true },
  sit: { anim: MishkontinV2Anims.sit, loops: true },
  // Sleep settles down once, then the Z loop follows (see Mishkontin.onAnimationComplete).
  sleep: { anim: MishkontinV2Anims.sleep, loops: true },
};

/**
 * V2 animation choices (frame indices into each sheet; sheet = file in
 * art/masters/characters/mishkontin_v2). Frame rates are tuned against the
 * unchanged movement speeds; the run cadence also follows speed (Mishkontin.ts).
 */
const V2_DEFS: Array<{ key: string; sheet: string; frames: number[]; frameRate: number; repeat: number }> = [
  { key: MishkontinV2Anims.idle, sheet: 'idle', frames: [0, 1, 2, 3, 4, 5], frameRate: 5, repeat: -1 },
  { key: MishkontinV2Anims.idleBlink, sheet: 'blink', frames: [0, 1, 2, 1, 3], frameRate: 10, repeat: 0 },
  { key: MishkontinV2Anims.run, sheet: 'run', frames: [0, 1, 2, 3, 4, 5, 6, 7], frameRate: 12, repeat: -1 },
  // Sheet frame 0 is the on-ground anticipation; take-off is instant, so the launch starts at 1.
  { key: MishkontinV2Anims.jump, sheet: 'jump', frames: [1, 2, 3], frameRate: 10, repeat: 0 },
  { key: MishkontinV2Anims.fall, sheet: 'fall', frames: [0, 1, 2, 1], frameRate: 8, repeat: -1 },
  // Touch-down squash -> recover (land sheet frames 0-2 are airborne and not needed here).
  { key: MishkontinV2Anims.land, sheet: 'land', frames: [3, 4, 5], frameRate: 14, repeat: 0 },
  { key: MishkontinV2Anims.crouch, sheet: 'crouch', frames: [1, 2, 3], frameRate: 16, repeat: 0 },
  { key: MishkontinV2Anims.crouchHold, sheet: 'crouch', frames: [3], frameRate: 1, repeat: -1 },
  { key: MishkontinV2Anims.hurt, sheet: 'hurt', frames: [0, 1, 2, 3, 4], frameRate: 8, repeat: 0 },
  { key: MishkontinV2Anims.turn, sheet: 'turn', frames: [0, 1, 2, 3, 4, 5], frameRate: 12, repeat: 0 },
  { key: MishkontinV2Anims.wave, sheet: 'wave', frames: [0, 1, 2, 3, 2, 3, 4, 5], frameRate: 8, repeat: 0 },
  { key: MishkontinV2Anims.surprised, sheet: 'surprised', frames: [0, 1, 2, 2, 3], frameRate: 7, repeat: 0 },
  { key: MishkontinV2Anims.readMap, sheet: 'read_map', frames: [0, 1, 2, 3, 4, 5], frameRate: 3, repeat: -1 },
  { key: MishkontinV2Anims.sit, sheet: 'sit', frames: [0, 1, 2, 3, 4, 5], frameRate: 3, repeat: -1 },
  { key: MishkontinV2Anims.sleep, sheet: 'sleep', frames: [0, 1], frameRate: 2, repeat: 0 },
  { key: MishkontinV2Anims.sleepLoop, sheet: 'sleep', frames: [2, 3], frameRate: 1.5, repeat: -1 },
];

export function getMishkontinV2Manifest(scene: Phaser.Scene): MishkontinV2Manifest {
  return scene.cache.json.get(AssetKeys.mishkontinV2Manifest) as MishkontinV2Manifest;
}

export function registerMishkontinV2Animations(scene: Phaser.Scene, manifest: MishkontinV2Manifest): void {
  for (const def of V2_DEFS) {
    if (scene.anims.exists(def.key)) continue;
    const frames = manifest.animations[def.sheet];
    scene.anims.create({
      key: def.key,
      frames: def.frames.map((i) => ({ key: AssetKeys.mishkontinV2, frame: frames[i] })),
      frameRate: def.frameRate,
      repeat: def.repeat,
    });
  }
}

/** All V2 animation keys (for the developer animation lab). */
export const V2_ANIMATION_KEYS = V2_DEFS.map((d) => d.key);
