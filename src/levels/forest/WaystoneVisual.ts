import Phaser from 'phaser';
import type { CheckpointVisual } from '../../systems/CheckpointSystem';
import type { PointDef } from '../LevelTypes';
import { forestAnchor } from './forestAssets';
import { ForestDepth } from './forestLayers';
import { FxTextures } from './forestFx';

const STONE_KEY = 'waystone';
const STONE_SCALE = 1.15;
const BASE_SINK = 4;
const GLYPH_SCALE = 0.5;

const IDLE = { glyphAlpha: 0.3, glowAlpha: 0.15, glowScale: 0.9, moteFrequency: 1100 };
const LIT = { glyphAlpha: 1, glowAlpha: 1, glowScale: 2.3, moteFrequency: 220 };
const PULSE_MS = 1600;
const BURST_COUNT = 26;

/**
 * Magical forest waystone: a mossy standing stone with a golden mouse-paw
 * glyph. Low glow while inactive; brighter glow, a spark burst and floating
 * motes once activated. (The stone comes from the environment kit with its
 * original symbol removed; the glyph and glow are drawn in code.)
 */
export class WaystoneVisual implements CheckpointVisual {
  private readonly glyph: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private pulse?: Phaser.Tweens.Tween;

  constructor(
    private readonly scene: Phaser.Scene,
    at: PointDef,
  ) {
    const stone = scene.add
      .image(at.x, at.y + BASE_SINK * STONE_SCALE, STONE_KEY)
      .setOrigin(0.5, 1)
      .setScale(STONE_SCALE)
      .setDepth(ForestDepth.groundDecor + 1);
    const [gx, gy] = forestAnchor(scene, STONE_KEY, 'glyph', [81, 44]);
    const x = stone.x + (gx - stone.width / 2) * STONE_SCALE;
    const y = stone.y - (stone.height - gy) * STONE_SCALE;

    this.glow = scene.add
      .image(x, y, FxTextures.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecor + 1.5);
    this.glyph = scene.add
      .image(x, y, FxTextures.pawGlyph)
      .setScale(GLYPH_SCALE)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecor + 2);

    this.motes = scene.add
      .particles(x, y, FxTextures.spark, {
        lifespan: 2400,
        frequency: IDLE.moteFrequency,
        speedY: { min: -26, max: -10 },
        speedX: { min: -8, max: 8 },
        scale: { start: 0.55, end: 0.15 },
        alpha: { start: 0.85, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-40, -10, 80, 70), quantity: 1 },
      })
      .setDepth(ForestDepth.effects);
    this.burst = scene.add
      .particles(x, y, FxTextures.spark, {
        lifespan: 900,
        speed: { min: 60, max: 170 },
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 1, end: 0 },
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(ForestDepth.effects);

    this.apply(IDLE);
  }

  setActive(active: boolean, animate: boolean): void {
    const look = active ? LIT : IDLE;
    if (animate) {
      this.scene.tweens.add({ targets: this.glyph, alpha: look.glyphAlpha, duration: 400 });
      this.scene.tweens.add({ targets: this.glow, alpha: look.glowAlpha, scale: look.glowScale, duration: 500, ease: 'Back.easeOut' });
      if (active) this.burst.explode(BURST_COUNT);
      this.scene.time.delayedCall(520, () => this.apply(look));
    } else {
      this.apply(look);
    }
  }

  private apply(look: typeof IDLE): void {
    this.pulse?.stop();
    this.glyph.setAlpha(look.glyphAlpha);
    this.glow.setAlpha(look.glowAlpha).setScale(look.glowScale);
    this.motes.frequency = look.moteFrequency;
    this.pulse = this.scene.tweens.add({
      targets: this.glow,
      alpha: look.glowAlpha * 0.7,
      scale: look.glowScale * 0.92,
      duration: PULSE_MS,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
