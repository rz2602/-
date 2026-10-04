import Phaser from 'phaser';
import type { CheckpointVisual } from '../../systems/CheckpointSystem';
import type { PointDef } from '../LevelTypes';
import { ForestDepth } from './forestLayers';
import { FxTextures } from './forestFx';
import { getProductionAsset } from './productionAssets';

const STONE_KEY = 'env_waystone';
const RUNE_KEY = 'env_waystone_rune';
/** World height (logical px): the same on-screen size as the stone it replaces. */
const STONE_HEIGHT = 185;
/** Sink the measured ground contact this far into the grass (logical px). */
const BASE_SINK = 6;

const IDLE = { glyphAlpha: 0.25, glowAlpha: 0.15, glowScale: 0.9, moteFrequency: 1100 };
const LIT = { glyphAlpha: 1, glowAlpha: 1, glowScale: 2.3, moteFrequency: 220 };
const PULSE_MS = 1600;
const BURST_COUNT = 26;

/**
 * Magical forest waystone (production art, `prop_waystone_master`): a mossy
 * standing stone with a carved golden rune and a lantern. Faint rune and low
 * glow while inactive; once activated the rune lights up brightly, with a
 * glow, a spark burst and floating motes (behaviour unchanged).
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
    const asset = getProductionAsset(scene, STONE_KEY);
    const scale = STONE_HEIGHT / scene.textures.getFrame(STONE_KEY).height;
    const anchor = asset?.anchor ?? { x: 0.5, y: 1 };
    const stone = scene.add
      .image(at.x, at.y + BASE_SINK, STONE_KEY)
      .setOrigin(anchor.x, anchor.y)
      .setScale(scale)
      .setDepth(ForestDepth.groundDecor + 1);
    // Positions inside the stone, from normalized master coordinates.
    const toWorld = (nx: number, ny: number): [number, number] => [
      stone.x + (nx - anchor.x) * stone.displayWidth,
      stone.y + (ny - anchor.y) * stone.displayHeight,
    ];
    const geo = (asset?.geometry ?? {}) as { runeX?: number; runeY?: number };
    const [x, y] = toWorld(geo.runeX ?? 0.55, geo.runeY ?? 0.37);
    const runeBox = getProductionAsset(scene, RUNE_KEY)?.extractedFromMaster?.box ?? [0.44, 0.19, 0.66, 0.7];
    const [rx, ry] = toWorld(runeBox[0], runeBox[1]);

    this.glow = scene.add
      .image(x, y, FxTextures.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(ForestDepth.groundDecor + 1.5);
    // The stone's own carved rune lights up (golden rune pixels extracted from
    // the master, drawn additively at exactly the same scale and position).
    this.glyph = scene.add
      .image(rx, ry, RUNE_KEY)
      .setOrigin(0)
      .setScale(scale)
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
