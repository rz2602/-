import Phaser from 'phaser';
import { BACKGROUND_GRADING, GAME_HEIGHT, GAME_WIDTH, SUN_SHAFTS } from '../../config/constants';
import { ForestDepth, ForestLayers, type VisualLayer } from './forestLayers';
import { FxTextures } from './forestFx';
import { getProductionAsset, ProductionKeys } from './productionAssets';

/**
 * Display scale (runtime texture px -> logical px) per parallax layer. The
 * masters are 2172 px wide, so 0.6 = 120% of native at 1440p (render scale 2)
 * and 90% at 1080p. Keep <= 0.625 (125% at 1440p).
 */
const LAYER_SCALE = { sky: 0.6, mountains: 0.6, distant: 0.6, mid: 0.62 } as const;

/**
 * Where each layer's artwork starts on screen when the camera is at its
 * lowest point (logical px). Sky = image top; the others = top edge of the
 * layer's opaque content band (see production-assets.json contentBand).
 */
const LAYOUT = { skyTop: 0, mountainsPeakTop: 88, distantBandTop: 296, midBandTop: 318 } as const;

/** Mountains: top of the tallest peak in the master (normalized), used to place the range. */
const MOUNTAINS_PEAK_TOP = 0.2;
/** Mountains: mirror-join column on the left end (normalized) - a local peak at source x 194. */
const MOUNTAINS_LEFT_JOIN = 0.0893;

const SHAFTS_SCROLL_X = 0.3;

/**
 * Sirengrad as its own world element (v2 backgrounds, gameplay): the whole
 * landmark image is drawn `width` logical px wide on the mountains layer
 * (scroll 0.10 / 0.05); its cliff line (geometry.baseY) sits at `baseScreenY`
 * when the camera is at its lowest point, so everything below it is hidden
 * behind the distant forest. Its keep stands where the castle of the original
 * mountains master stood at the final viewpoint (shifted by keepOffsetX so
 * the whole city fits the frame).
 */
/**
 * Wide separated background set (gameplay). Each layer repeats as plain
 * overlapping copies (no mirroring - mirrored copies made symmetric peaks and
 * doubled waterfalls). `overlap` is in logical px; `phase` moves the joins so
 * no join or repeated landmark lands behind Sirengrad at the final viewpoint.
 */
const WIDE_LAYERS = {
  mountains: { overlap: 70, phase: 300 },
  distant: { overlap: 40, phase: 0 },
  mid: { overlap: 36, phase: 0 },
} as const;

/** Wide mid layer: the understory starts this far above the bottom of its solid content band. */
const WIDE_UNDERSTORY_OVERLAP = 60;
/**
 * Wide mid layer, second row: offset down (share of the layer height), its own
 * phase, darker. Only rows below cropTop are drawn - the rest is hidden behind
 * the main row anyway (saves fill rate).
 */
const WIDE_MID_LOWER_ROW = { offset: 0.26, phase: 720, tint: 0xb4bcb0, cropTop: 0.55 } as const;

const SIRENGRAD = { width: 700, baseScreenY: 318, keepOffsetX: -60 } as const;
const SUN_WASH_ALPHA = 0.3;
/** The understory starts this far above the mid-forest artwork's bottom edge (hidden behind it). */
const UNDERSTORY_OVERLAP = 40;

/** Overlap between neighbouring strip images (logical px) so no seam shows at fractional positions. */
const STRIP_OVERLAP = 1;

export interface ForestBackdropOptions {
  worldWidth: number;
  cameraBottom: number;
  /**
   * Screen x (logical) of Sirengrad's centre when the camera is at its
   * right-most position. Default: the mountain range is right-aligned to the
   * screen, which puts Sirengrad centre-right at the final viewpoint.
   */
  sirengradScreenX?: number;
  /** Per-layer colour grading (BACKGROUND_GRADING). Default: on. The menu turns it off. */
  grading?: boolean;
  /** Sun-shaft strength. Default: SUN_SHAFTS.gameplayAlpha. */
  sunShaftAlpha?: number;
  /**
   * 'v2' (default, gameplay): v2 sky + Sirengrad as a separate world element
   * over castle-free mountains. 'approved-menu': the original sky and the
   * original mountains master with its built-in castle (the locked Main Menu).
   */
  backgroundSet?: 'v2' | 'approved-menu';
}

type LayerGrade = { readonly saturation: number; readonly contrast: number; readonly brightness: number };

const isNeutral = (g: LayerGrade): boolean => g.saturation === 0 && g.contrast === 0 && g.brightness === 1;

/**
 * Texture key of a colour-graded copy of `key` (created once, on first use).
 * Grading is a per-pixel colour change only: same size, same pixels, no blur
 * and no resampling, so the copy is drawn exactly like the original.
 */
function gradedTexture(scene: Phaser.Scene, key: string, grade: LayerGrade | undefined): string {
  if (!grade || isNeutral(grade)) return key;
  const gradedKey = `${key}#graded`;
  if (scene.textures.exists(gradedKey)) return gradedKey;
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = source.width;
  canvas.height = source.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return key;
  ctx.drawImage(source, 0, 0);
  let image: ImageData;
  try {
    image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return key; // pixels not readable (tainted canvas): draw the layer ungraded
  }
  const px = image.data;
  const sat = 1 + grade.saturation;
  const con = 1 + grade.contrast;
  const b = grade.brightness;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const r = px[i];
    const g = px[i + 1];
    const bl = px[i + 2];
    const luma = 0.299 * r + 0.587 * g + 0.114 * bl;
    px[i] = ((luma + (r - luma) * sat - 127.5) * con + 127.5) * b;
    px[i + 1] = ((luma + (g - luma) * sat - 127.5) * con + 127.5) * b;
    px[i + 2] = ((luma + (bl - luma) * sat - 127.5) * con + 127.5) * b;
  }
  ctx.putImageData(image, 0, 0);
  scene.textures.addCanvas(gradedKey, canvas);
  return gradedKey;
}

/**
 * A horizontally repeating strip drawn as a row of plain images (sampled 1:1
 * - no TileSprite power-of-two resampling). Copies either alternate between
 * normal and mirrored (every join matches pixel-for-pixel), or - for layers
 * with faded ends - repeat unmirrored with an overlap.
 */
class MirrorStrip {
  private readonly images: Phaser.GameObjects.Image[] = [];
  private readonly step: number;

  /** Added to the scroll offset; lets a strip choose where its joins fall. */
  phase = 0;

  /**
   * `repeat.overlap` (logical px): plain, unmirrored copies that overlap by
   * that much - for transparent layers whose ends fade out, so neighbouring
   * copies blend instead of meeting at a mirrored (symmetric) join.
   */
  constructor(scene: Phaser.Scene, key: string, scale: number, depth: number, private readonly repeat?: { overlap: number; cropTop?: number }) {
    const base = scene.textures.getFrame(key);
    this.step = base.width * scale - (repeat ? repeat.overlap : STRIP_OVERLAP);
    // Optional crop: draw only the rows below cropTop (share of the height).
    let frame: string | undefined;
    this.cropOffset = 0;
    if (repeat?.cropTop) {
      const top = Math.round(base.height * repeat.cropTop);
      frame = `crop${top}`;
      const tex = scene.textures.get(key);
      if (!tex.has(frame)) tex.add(frame, 0, 0, top, base.width, base.height - top);
      this.cropOffset = top * scale;
    }
    const count = Math.ceil(GAME_WIDTH / this.step) + 1;
    for (let i = 0; i < count; i++) {
      this.images.push(scene.add.image(0, 0, key, frame).setOrigin(0).setScale(scale).setScrollFactor(0).setDepth(depth));
    }
  }

  /** Logical px cropped off the top (positions stay those of the full image). */
  private readonly cropOffset: number;

  get height(): number {
    return this.images[0].displayHeight + this.cropOffset;
  }

  tint(color: number): void {
    for (const image of this.images) image.setTint(color);
  }


  /** `offsetX` = how far the layer has scrolled (logical px). */
  get stepWidth(): number {
    return this.step;
  }

  place(scrollOffset: number, y: number): void {
    const offsetX = scrollOffset + this.phase;
    const first = Math.floor(offsetX / this.step);
    const start = first * this.step - offsetX;
    this.images.forEach((image, i) => {
      // Odd copies are mirrored: their left edge equals the previous copy's right edge.
      image.setFlipX(!this.repeat && (first + i) % 2 !== 0).setPosition(start + i * this.step, y + this.cropOffset);
    });
  }
}

interface MovingLayer {
  /** Strips scroll horizontally; plain images only move vertically. */
  target: MirrorStrip | Phaser.GameObjects.Image | Phaser.GameObjects.TileSprite;
  scrollX: number;
  scrollY: number;
  screenY: number;
}

/**
 * Parallax layers 0-3, each an INDEPENDENT transparent illustration:
 *
 *   0 sky (opaque, 0.05) -> 1 mountains + Sirengrad (0.10)
 *   -> 2 distant forest (0.20) -> 3 mid forest (0.40)
 *
 * plus a sky gradient fallback, soft sun shafts, a warm sun wash and a dark
 * understory below the mid forest. The mountains are placed as unique world
 * images so Sirengrad appears exactly once (see buildMountains).
 */
export class ForestBackdrop {
  private readonly moving: MovingLayer[] = [];
  private readonly cameraBottom: number;
  private readonly grading: typeof BACKGROUND_GRADING | undefined;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly options: ForestBackdropOptions,
  ) {
    this.cameraBottom = options.cameraBottom;
    this.grading = (options.grading ?? true) && BACKGROUND_GRADING.enabled ? BACKGROUND_GRADING : undefined;

    // Gradient behind everything: never an empty canvas, whatever the camera does.
    scene.add
      .image(0, 0, FxTextures.sky)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.sky.depth - 1);

    const v2 = (options.backgroundSet ?? 'v2') === 'v2';
    const sky = this.addStrip(v2 ? ProductionKeys.skyV2 : ProductionKeys.sky, this.grading?.sky, ForestLayers.sky, LAYER_SCALE.sky, LAYOUT.skyTop);
    // The sky has its sun near the right edge, so a mirror join there would show
    // two suns. Phase the strip so the whole camera range ends inside one
    // unmirrored copy: the only join falls on the sun-free left edge.
    const skyTravel = Math.max(0, options.worldWidth - GAME_WIDTH) * ForestLayers.sky.scrollX;
    sky.phase = sky.stepWidth - (GAME_WIDTH + skyTravel);
    sky.place(0, LAYOUT.skyTop);
    this.buildMountains(v2);

    const shafts = scene.add
      .tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, FxTextures.sunbeams)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(ForestDepth.lightShafts)
      .setAlpha(options.sunShaftAlpha ?? SUN_SHAFTS.gameplayAlpha)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.moving.push({ target: shafts, scrollX: SHAFTS_SCROLL_X, scrollY: 0, screenY: 0 });

    const distantKey = v2 ? ProductionKeys.forestDistantV2 : ProductionKeys.forestDistant;
    this.addStrip(distantKey, this.grading?.distantForest, ForestLayers.distantForest, LAYER_SCALE.distant, this.bandTopToImageY(distantKey, LAYER_SCALE.distant, LAYOUT.distantBandTop), v2 ? WIDE_LAYERS.distant : undefined);
    const midKey = v2 ? ProductionKeys.forestMidV2 : ProductionKeys.forestMid;
    const midY = this.bandTopToImageY(midKey, LAYER_SCALE.mid, LAYOUT.midBandTop);
    const mid = this.addStrip(midKey, this.grading?.midForest, ForestLayers.midForest, LAYER_SCALE.mid, midY, v2 ? WIDE_LAYERS.mid : undefined);

    // The wide mid layer fades into mist at its bottom. A second, lower and
    // slightly darker row of the same layer (behind it, other phase) continues
    // the forest downward, and the understory starts behind that row's solid
    // content - so high camera views never show a flat band or a straight edge.
    let understoryY = midY + mid.height - UNDERSTORY_OVERLAP;
    if (v2) {
      const midBottom = getProductionAsset(scene, midKey)?.contentBand?.bottom ?? 1;
      const lowerY = midY + mid.height * WIDE_MID_LOWER_ROW.offset;
      const lower = this.addStrip(midKey, this.grading?.midForest, { ...ForestLayers.midForest, depth: ForestLayers.midForest.depth - 0.25 }, LAYER_SCALE.mid, lowerY, { overlap: WIDE_LAYERS.mid.overlap, phase: WIDE_MID_LOWER_ROW.phase, cropTop: WIDE_MID_LOWER_ROW.cropTop });
      lower.tint(WIDE_MID_LOWER_ROW.tint);
      understoryY = lowerY + mid.height * midBottom - WIDE_UNDERSTORY_OVERLAP;
    }
    const understory = scene.add
      .image(0, understoryY, FxTextures.understory)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestLayers.midForest.depth - 0.5);
    this.moving.push({ target: understory, scrollX: 0, scrollY: ForestLayers.midForest.scrollY, screenY: understoryY });

    scene.add
      .image(0, 0, FxTextures.sunWash)
      .setOrigin(0)
      .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
      .setScrollFactor(0)
      .setDepth(ForestDepth.sunWash)
      .setAlpha(SUN_WASH_ALPHA)
      .setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Call every frame (or once for static scenes such as menus). */
  update(camera: Phaser.Cameras.Scene2D.Camera): void {
    // 0 when the camera is at its lowest point, growing as it rises.
    const rise = this.cameraBottom - GAME_HEIGHT - camera.scrollY;
    for (const layer of this.moving) {
      const y = layer.screenY + rise * layer.scrollY;
      const t = layer.target;
      if (t instanceof MirrorStrip) t.place(camera.scrollX * layer.scrollX, y);
      else {
        if (t instanceof Phaser.GameObjects.TileSprite) t.tilePositionX = camera.scrollX * layer.scrollX;
        t.y = y;
      }
    }
  }

  private addStrip(key: string, grade: LayerGrade | undefined, layer: VisualLayer, scale: number, screenY: number, repeat?: { overlap: number; phase: number; cropTop?: number }): MirrorStrip {
    const strip = new MirrorStrip(this.scene, gradedTexture(this.scene, key, grade), scale, layer.depth, repeat);
    if (repeat) strip.phase = repeat.phase;
    strip.place(0, screenY);
    this.moving.push({ target: strip, scrollX: layer.scrollX, scrollY: layer.scrollY, screenY });
    return strip;
  }

  /** Image top y that puts the layer's content band top at `bandTop` on screen. */
  private bandTopToImageY(key: string, scale: number, bandTop: number): number {
    const asset = getProductionAsset(this.scene, key);
    const frameHeight = this.scene.textures.getFrame(key).height;
    return bandTop - (asset?.contentBand?.top ?? 0) * frameHeight * scale;
  }

  /**
   * Layer 1. The full range (with Sirengrad) is placed ONCE, right-aligned to
   * the screen at the end of the level, so the city is seen from the final
   * viewpoint. Further left the range is extended with alternately mirrored
   * copies of its castle-free left part only - no duplicate castle can appear.
   * Images use Phaser scroll factors (0.10 / 0.05) so they parallax naturally.
   */
  private buildMountains(separateSirengrad: boolean): void {
    const asset = getProductionAsset(this.scene, ProductionKeys.mountains);
    // Gameplay only uses the original master's geometry (to place Sirengrad), not its pixels.
    const key = separateSirengrad ? ProductionKeys.mountains : gradedTexture(this.scene, ProductionKeys.mountains, this.grading?.mountains);
    const texture = this.scene.textures.get(key);
    const { width: W, height: H } = texture.getSourceImage() as HTMLImageElement;
    const s = LAYER_SCALE.mountains;
    const { scrollX, scrollY, depth } = ForestLayers.mountains;

    const joinL = Math.round(MOUNTAINS_LEFT_JOIN * W);
    const joinR = Math.round((asset?.castleFreeEnd ?? 0.5) * W);
    if (!texture.has('full')) texture.add('full', 0, joinL, 0, W - joinL, H);
    if (!texture.has('filler')) texture.add('filler', 0, joinL, 0, joinR - joinL, H);

    // Layer position for the camera at the bottom; scroll factors do the rest.
    const y = LAYOUT.mountainsPeakTop - MOUNTAINS_PEAK_TOP * H * s + (this.cameraBottom - GAME_HEIGHT) * scrollY;
    const maxScroll = Math.max(0, this.options.worldWidth - GAME_WIDTH);
    const fillerWidth = (joinR - joinL) * s;
    const castleCentre = (0.68 * W - joinL) * s; // Sirengrad's centre inside the 'full' frame
    // Right-align the solid part of the range (its tapered tip stays just off-screen).
    const solidRight = (asset?.solidColumns?.right ?? 1) * W;
    const rightAligned = maxScroll * scrollX + GAME_WIDTH - (solidRight - joinL) * s;
    const x = this.options.sirengradScreenX === undefined
      ? rightAligned
      : maxScroll * scrollX + this.options.sirengradScreenX - castleCentre;

    if (separateSirengrad) {
      // Wide set: the mountains-only layer, repeated as overlapping copies ...
      const wideKey = ProductionKeys.mountainsV2;
      const wideH = this.scene.textures.getFrame(wideKey).height;
      const peakTop = (getProductionAsset(this.scene, wideKey)?.geometry?.peakTopY as number | undefined) ?? 0.21;
      this.addStrip(wideKey, this.grading?.mountains, ForestLayers.mountains, s, LAYOUT.mountainsPeakTop - peakTop * wideH * s, WIDE_LAYERS.mountains);
      // ... and Sirengrad once, where the original castle stood at the viewpoint.
      this.addSirengrad(x + castleCentre, scrollX, scrollY, depth + 0.5);
      return;
    }

    this.addMountainImage(key, 'full', x, y, false, s, scrollX, scrollY, depth);
    // Extension copies leftwards until the layer covers the screen at scroll 0.
    let left = x;
    for (let mirrored = true; left > 0; mirrored = !mirrored) {
      left -= fillerWidth;
      this.addMountainImage(key, 'filler', left, y, mirrored, s, scrollX, scrollY, depth);
    }
  }

  /** Sirengrad landmark, keep centred on world x `keepX` (mountains layer coordinates). */
  private addSirengrad(keepX: number, scrollX: number, scrollY: number, depth: number): void {
    const asset = getProductionAsset(this.scene, ProductionKeys.sirengrad);
    const geo = (asset?.geometry ?? {}) as { keepX?: number; baseY?: number };
    const key = gradedTexture(this.scene, ProductionKeys.sirengrad, this.grading?.mountains);
    const frame = this.scene.textures.getFrame(key);
    this.scene.add
      .image(keepX + SIRENGRAD.keepOffsetX, SIRENGRAD.baseScreenY + (this.cameraBottom - GAME_HEIGHT) * scrollY, key)
      .setOrigin(geo.keepX ?? 0.6, geo.baseY ?? 0.88)
      .setScale(SIRENGRAD.width / frame.width)
      .setScrollFactor(scrollX, scrollY)
      .setDepth(depth);
  }

  private addMountainImage(key: string, frame: string, x: number, y: number, flipX: boolean, s: number, sx: number, sy: number, depth: number): void {
    this.scene.add
      .image(x, y, key, frame)
      .setOrigin(0)
      .setScale(s)
      .setFlipX(flipX)
      .setScrollFactor(sx, sy)
      .setDepth(depth);
  }
}
