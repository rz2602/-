import Phaser from 'phaser';

/**
 * Small procedural EFFECT textures (gradients, glows, sparks, the waystone
 * glyph). These are lighting/FX helpers, not environment artwork, so they are
 * generated rather than shipped as files.
 */
export const FxTextures = {
  sky: 'fx-sky',
  haze: 'fx-haze',
  sunWash: 'fx-sun-wash',
  sunbeams: 'fx-sunbeams',
  lightShaft: 'fx-light-shaft',
  shadeDown: 'fx-shade-down',
  shadeSide: 'fx-shade-side',
  deepWater: 'fx-deep-water',
  glow: 'fx-glow',
  spark: 'fx-spark',
  droplet: 'fx-droplet',
  pawGlyph: 'fx-paw-glyph',
  understory: 'fx-understory',
  soil: 'fx-soil',
  earth: 'fx-earth',
} as const;

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return;
  paint(tex.getContext(), w, h);
  tex.refresh();
}

function vertical(ctx: CanvasRenderingContext2D, h: number, stops: Array<[number, string]>): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, color] of stops) g.addColorStop(at, color);
  return g;
}

export function generateForestFx(scene: Phaser.Scene): void {
  // Bright late-morning sky: clear blue above, warm pale haze at the horizon.
  make(scene, FxTextures.sky, 4, 512, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, '#3f8fd8'],
      [0.45, '#7fbbe8'],
      [0.75, '#c9e2ef'],
      [1, '#f2ead0'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  // Atmospheric haze band (transparent -> pale blue-white -> transparent).
  make(scene, FxTextures.haze, 4, 256, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, 'rgba(220, 236, 245, 0)'],
      [0.55, 'rgba(220, 236, 245, 0.55)'],
      [1, 'rgba(220, 236, 245, 0)'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  // Warm sunlight wash from the upper left (used with ADD blending).
  make(scene, FxTextures.sunWash, 512, 288, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.12, -h * 0.1, 10, w * 0.12, -h * 0.1, w * 0.95);
    g.addColorStop(0, 'rgba(255, 214, 140, 0.55)');
    g.addColorStop(0.45, 'rgba(255, 200, 120, 0.18)');
    g.addColorStop(1, 'rgba(255, 190, 110, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Soft diagonal sun shafts, horizontally tileable. (ctx.filter blur is a
  // progressive enhancement: browsers without it simply get crisper beams.)
  make(scene, FxTextures.sunbeams, 1024, 640, (ctx, _w, h) => {
    ctx.filter = 'blur(14px)';
    for (const [x, width, alpha] of [[90, 70, 0.16], [330, 120, 0.1], [700, 60, 0.13]] as const) {
      ctx.fillStyle = vertical(ctx, h, [
        [0, `rgba(255, 236, 180, ${alpha})`],
        [0.8, 'rgba(255, 236, 180, 0)'],
      ]);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width, 0);
      ctx.lineTo(x + width + 200, h);
      ctx.lineTo(x + 200, h);
      ctx.closePath();
      ctx.fill();
    }
  });

  // A single focused light shaft (checkpoint clearing).
  make(scene, FxTextures.lightShaft, 128, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(255, 230, 160, 0)');
    g.addColorStop(0.5, 'rgba(255, 230, 160, 1)');
    g.addColorStop(1, 'rgba(255, 230, 160, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = vertical(ctx, h, [
      [0, 'rgba(0,0,0,0.9)'],
      [1, 'rgba(0,0,0,0)'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  // Terrain depth shading (stretched over soil).
  make(scene, FxTextures.shadeDown, 4, 256, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, 'rgba(30, 18, 8, 0)'],
      [0.35, 'rgba(30, 18, 8, 0.35)'],
      [1, 'rgba(20, 12, 6, 0.75)'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });
  make(scene, FxTextures.shadeSide, 32, 4, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(20, 12, 6, 0.55)');
    g.addColorStop(1, 'rgba(20, 12, 6, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  // Inside of the terrain blocks, below the ground strip: warm soil fading into deep earth.
  make(scene, FxTextures.earth, 4, 256, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, '#5e4129'],
      [0.3, '#47311f'],
      [1, '#211710'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  make(scene, FxTextures.deepWater, 4, 256, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, '#2f7fb4'],
      [0.4, '#1d5f8e'],
      [1, '#0f3352'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  make(scene, FxTextures.glow, 128, 128, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255, 226, 140, 1)');
    g.addColorStop(0.35, 'rgba(255, 196, 90, 0.55)');
    g.addColorStop(1, 'rgba(255, 180, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

  make(scene, FxTextures.spark, 16, 16, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(255, 250, 220, 1)');
    g.addColorStop(0.4, 'rgba(255, 210, 110, 0.8)');
    g.addColorStop(1, 'rgba(255, 200, 90, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

  make(scene, FxTextures.droplet, 8, 8, (ctx, w) => {
    const g = ctx.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    g.addColorStop(0, 'rgba(240, 250, 255, 1)');
    g.addColorStop(1, 'rgba(170, 220, 250, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, w);
  });

  // Dark forest understory hanging below the mid-forest layer, so nothing pale
  // shows through gaps or below the background strips.
  make(scene, FxTextures.understory, 4, 512, (ctx, w, h) => {
    ctx.fillStyle = vertical(ctx, h, [
      [0, '#3c5a33'],
      [0.25, '#2a4224'],
      [1, '#16221a'],
    ]);
    ctx.fillRect(0, 0, w, h);
  });

  generateSoil(scene);

  // Golden mouse-paw glyph for the waystone (one pad + four toes).
  make(scene, FxTextures.pawGlyph, 64, 64, (ctx) => {
    ctx.shadowColor = 'rgba(255, 200, 90, 0.9)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#ffd877';
    ctx.beginPath();
    ctx.ellipse(32, 41, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, rx, ry, rot] of [
      [15, 26, 5, 6.5, -0.4],
      [25, 17, 5, 7, -0.15],
      [39, 17, 5, 7, 0.15],
      [49, 26, 5, 6.5, 0.4],
    ] as const) {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * Seamless, non-symmetric soil texture synthesised from the kit's soil sample:
 * many randomly placed, flipped, feather-masked patches stamped with
 * wrap-around. Avoids the "kaleidoscope" look of a mirror-tiled sample.
 */
function generateSoil(scene: Phaser.Scene): void {
  const SIZE = 256;
  const SAMPLE = 'terrain_fill';
  if (scene.textures.exists(FxTextures.soil) || !scene.textures.exists(SAMPLE)) return;
  const source = scene.textures.get(SAMPLE).getSourceImage() as CanvasImageSource & { width: number; height: number };
  // The sample is mirror-tiled 2x2; stamp only from its original quarter.
  const sampleW = Math.floor(source.width / 2);
  const sampleH = Math.floor(source.height / 2);

  make(scene, FxTextures.soil, SIZE, SIZE, (ctx) => {
    ctx.fillStyle = '#5c3e29';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const rand = new Phaser.Math.RandomDataGenerator(['forest-soil']);
    const patch = document.createElement('canvas');
    const pctx = patch.getContext('2d');
    if (!pctx) return;
    for (let i = 0; i < 90; i++) {
      const w = rand.between(26, Math.min(56, sampleW));
      const h = rand.between(20, Math.min(36, sampleH));
      patch.width = w;
      patch.height = h;
      pctx.save();
      if (rand.frac() < 0.5) {
        pctx.translate(w, 0);
        pctx.scale(-1, 1);
      }
      pctx.drawImage(source, rand.between(0, sampleW - w), rand.between(0, sampleH - h), w, h, 0, 0, w, h);
      pctx.restore();
      // Soft oval mask so stamps blend without seams.
      pctx.globalCompositeOperation = 'destination-in';
      const mask = pctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.55);
      mask.addColorStop(0, 'rgba(0,0,0,1)');
      mask.addColorStop(1, 'rgba(0,0,0,0)');
      pctx.fillStyle = mask;
      pctx.fillRect(0, 0, w, h);
      pctx.globalCompositeOperation = 'source-over';
      const x = rand.between(0, SIZE - 1);
      const y = rand.between(0, SIZE - 1);
      for (const ox of [-SIZE, 0, SIZE]) for (const oy of [-SIZE, 0, SIZE]) ctx.drawImage(patch, x - w / 2 + ox, y - h / 2 + oy);
    }
  });
}
