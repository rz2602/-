import Phaser from 'phaser';
import { IDLE_BEHAVIOUR } from '../config/constants';
import { MishkontinAnims, type MishkontinAnimKey } from './mishkontinAnimations';

/**
 * An optional idle animation that may play once the player has been idle for
 * at least `minIdleMs`. Future personality animations (looking around,
 * checking the satchel, sitting down...) are added by appending entries here
 * once the artwork exists - no other code needs to change.
 */
export interface IdleVariant {
  anim: MishkontinAnimKey;
  minIdleMs: number;
  weight: number;
}

const IDLE_VARIANTS: IdleVariant[] = [
  { anim: MishkontinAnims.idleBlink, minIdleMs: IDLE_BEHAVIOUR.alternateIdleAfterMs, weight: 3 },
  { anim: MishkontinAnims.idleWink, minIdleMs: IDLE_BEHAVIOUR.alternateIdleAfterMs, weight: 1 },
  // e.g. { anim: MishkontinAnims.lookAround, minIdleMs: 12000, weight: 2 },
  // e.g. { anim: MishkontinAnims.sitDown,    minIdleMs: 30000, weight: 1 },
];

/** Decides which idle animation Mishkontin should be showing. */
export class IdleBehaviour {
  private idleMs = 0;
  private nextVariantAtMs = 0;
  private playingVariant: MishkontinAnimKey | null = null;

  reset(): void {
    this.idleMs = 0;
    this.playingVariant = null;
    this.nextVariantAtMs = IDLE_BEHAVIOUR.alternateIdleAfterMs;
  }

  /** Advances idle time; returns the idle animation that should be playing. */
  update(deltaMs: number): MishkontinAnimKey {
    this.idleMs += deltaMs;
    if (this.playingVariant) return this.playingVariant;

    if (this.idleMs >= this.nextVariantAtMs) {
      const variant = this.pickVariant();
      if (variant) {
        this.playingVariant = variant.anim;
        return variant.anim;
      }
    }
    return MishkontinAnims.idle;
  }

  /** Call when a one-shot idle variant finished playing. */
  onVariantComplete(anim: string): void {
    if (anim !== this.playingVariant) return;
    this.playingVariant = null;
    this.nextVariantAtMs =
      this.idleMs +
      Phaser.Math.Between(IDLE_BEHAVIOUR.alternateIdleMinGapMs, IDLE_BEHAVIOUR.alternateIdleMaxGapMs);
  }

  get idleTimeMs(): number {
    return this.idleMs;
  }

  private pickVariant(): IdleVariant | null {
    let total = 0;
    for (const v of IDLE_VARIANTS) if (this.idleMs >= v.minIdleMs) total += v.weight;
    if (total === 0) return null;
    let roll = Math.random() * total;
    for (const v of IDLE_VARIANTS) {
      if (this.idleMs < v.minIdleMs) continue;
      roll -= v.weight;
      if (roll <= 0) return v;
    }
    return null;
  }
}
