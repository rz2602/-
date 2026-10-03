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
