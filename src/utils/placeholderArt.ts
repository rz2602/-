import Phaser from 'phaser';

/**
 * TEMPORARY PLACEHOLDER ENVIRONMENT ART.
 *
 * Simple shapes drawn on canvases at startup, in a warm storybook-woodland
 * palette, so no external artwork is needed for v0.1. Every texture is keyed
 * by `PlaceholderTextures`; to replace one with final art, load an image with
 * the same key in PreloadScene - generation is skipped for existing keys.
 */
export const PlaceholderTextures = {
  sky: 'ph-sky',
  hillsFar: 'ph-hills-far',
  treesMid: 'ph-trees-mid',
  sunbeams: 'ph-sunbeams',
  soil: 'ph-soil',
  grass: 'ph-grass',
  platform: 'ph-platform',
  tree: 'ph-tree',
  bush: 'ph-bush',
  mushroom: 'ph-mushroom',
  signArrow: 'ph-sign-arrow',
  signCaution: 'ph-sign-caution',
  checkpointOff: 'ph-checkpoint-off',
  checkpointOn: 'ph-checkpoint-on',
  finish: 'ph-finish',
  button: 'ph-button',
} as const;

const PALETTE = {
  skyTop: '#8fc7d8',
  skyBottom: '#f6e6b4',
  hillFar: '#9cbf8a',
  hillFarShade: '#88ad78',
  treeMid: '#5f8c5a',
  treeMidDark: '#4d7a4b',
  soil: '#7a5233',
  soilDark: '#5e3d25',
  soilLight: '#946642',
  grass: '#6fae4c',
  grassLight: '#93cc63',
  grassDark: '#4f8a37',
  wood: '#9a6a3f',
  woodLight: '#bb8a55',
  woodDark: '#6e4626',
  leaf: '#4f8f45',
  leafLight: '#6cae55',
  trunk: '#6b4529',
  capRed: '#d9573f',
  capSpot: '#fff3dc',
  stem: '#f2e3c4',
  lanternGlow: 'rgba(255, 214, 120, 0.85)',
  gold: '#e8b443',
};

type Painter = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

function makeTexture(scene: Phaser.Scene, key: string, w: number, h: number, paint: Painter): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, w, h);
  if (!texture) return;
  paint(texture.getContext(), w, h);
  texture.refresh();
}

/** Deterministic pseudo-random numbers so placeholders look identical every run. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

/** Horizontally tileable wavy silhouette (sum of sines with whole periods). */
function wavySilhouette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: number,
  waves: Array<[periods: number, amplitude: number, phase: number]>,
  fill: string,
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 4) {
    let y = base;
    for (const [periods, amp, phase] of waves) y += Math.sin((x / w) * Math.PI * 2 * periods + phase) * amp;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function drawRoundTree(ctx: CanvasRenderingContext2D, cx: number, groundY: number, height: number, color: string, trunk: string): void {
  const trunkW = height * 0.09;
  ctx.fillStyle = trunk;
  ctx.fillRect(cx - trunkW / 2, groundY - height * 0.45, trunkW, height * 0.45);
  ctx.fillStyle = color;
  const r = height * 0.22;
  ctx.beginPath();
  ctx.arc(cx, groundY - height * 0.62, r * 1.1, 0, Math.PI * 2);
  ctx.arc(cx - r * 0.9, groundY - height * 0.5, r * 0.85, 0, Math.PI * 2);
  ctx.arc(cx + r * 0.9, groundY - height * 0.52, r * 0.9, 0, Math.PI * 2);
  ctx.arc(cx, groundY - height * 0.82, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
}

export function generatePlaceholderArt(scene: Phaser.Scene): void {
  makeTexture(scene, PlaceholderTextures.sky, 8, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(1, PALETTE.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  makeTexture(scene, PlaceholderTextures.hillsFar, 1024, 320, (ctx, w, h) => {
    wavySilhouette(ctx, w, h, 150, [[2, 40, 0.3], [5, 14, 1.2]], PALETTE.hillFarShade);
    wavySilhouette(ctx, w, h, 200, [[3, 30, 2.1], [7, 10, 0.4]], PALETTE.hillFar);
  });

  makeTexture(scene, PlaceholderTextures.treesMid, 1024, 420, (ctx, w, h) => {
    const rand = rng(7);
    wavySilhouette(ctx, w, h, 330, [[4, 12, 0.8]], PALETTE.treeMidDark);
    for (let i = 0; i < 14; i++) {
      const x = (i / 14) * w + rand() * 40;
      const height = 220 + rand() * 150;
      const color = i % 2 ? PALETTE.treeMid : PALETTE.treeMidDark;
      drawRoundTree(ctx, x, h - 40, height, color, PALETTE.treeMidDark);
      // Duplicate across the seam so the texture tiles.
      if (x < 120) drawRoundTree(ctx, x + w, h - 40, height, color, PALETTE.treeMidDark);
      if (x > w - 120) drawRoundTree(ctx, x - w, h - 40, height, color, PALETTE.treeMidDark);
    }
    ctx.fillStyle = PALETTE.treeMidDark;
    ctx.fillRect(0, h - 60, w, 60);
  });

  makeTexture(scene, PlaceholderTextures.sunbeams, 512, 512, (ctx, _w, h) => {
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, width] of [[90, 60], [230, 90], [380, 50]] as const) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, 'rgba(255, 240, 190, 0.35)');
      g.addColorStop(1, 'rgba(255, 240, 190, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width, 0);
      ctx.lineTo(x + width + 140, h);
      ctx.lineTo(x + 100, h);
      ctx.closePath();
      ctx.fill();
    }
  });

  makeTexture(scene, PlaceholderTextures.soil, 128, 128, (ctx, w, h) => {
    const rand = rng(11);
    ctx.fillStyle = PALETTE.soil;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) {
      ctx.fillStyle = rand() > 0.5 ? PALETTE.soilDark : PALETTE.soilLight;
      const x = rand() * w;
      const y = rand() * h;
      const r = 2 + rand() * 5;
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  makeTexture(scene, PlaceholderTextures.grass, 128, 40, (ctx, w) => {
    ctx.fillStyle = PALETTE.grassDark;
    ctx.fillRect(0, 14, w, 22);
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 10, w, 18);
    // Rounded tufts along the top edge, tileable (8 tufts per 128 px).
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.arc(i * 16, 12, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.grassLight;
    ctx.fillRect(0, 10, w, 4);
    // Ragged lower edge hanging over the soil.
    ctx.fillStyle = PALETTE.grassDark;
    for (let i = 0; i <= 16; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 8 - 4, 34);
      ctx.lineTo(i * 8, 40);
      ctx.lineTo(i * 8 + 4, 34);
      ctx.fill();
    }
  });

  makeTexture(scene, PlaceholderTextures.platform, 64, 28, (ctx, w, h) => {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(0, 4, w, h - 4);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(0, 4, w, h - 10);
    ctx.fillStyle = PALETTE.woodLight;
    ctx.fillRect(0, 4, w, 4);
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 14);
    ctx.bezierCurveTo(20, 11, 40, 17, 64, 14);
    ctx.stroke();
    // A little moss on top.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(0, 0, w, 5);
    ctx.fillStyle = PALETTE.grassLight;
    ctx.fillRect(0, 0, w, 2);
  });

  makeTexture(scene, PlaceholderTextures.tree, 260, 460, (ctx, w, h) => {
    const cx = w / 2;
    ctx.fillStyle = PALETTE.trunk;
    ctx.beginPath();
    ctx.moveTo(cx - 22, h);
    ctx.lineTo(cx - 14, h - 230);
    ctx.lineTo(cx + 14, h - 230);
    ctx.lineTo(cx + 26, h);
    ctx.closePath();
    ctx.fill();
    const blobs: Array<[number, number, number, string]> = [
      [cx - 60, 200, 70, PALETTE.leaf],
      [cx + 60, 210, 66, PALETTE.leaf],
      [cx, 150, 90, PALETTE.leaf],
      [cx - 30, 110, 60, PALETTE.leafLight],
      [cx + 35, 120, 50, PALETTE.leafLight],
    ];
    for (const [x, y, r, color] of blobs) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  makeTexture(scene, PlaceholderTextures.bush, 140, 70, (ctx, w, h) => {
    ctx.fillStyle = PALETTE.leaf;
    for (const [x, y, r] of [[35, 45, 30], [70, 35, 34], [105, 45, 30]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.leafLight;
    ctx.beginPath();
    ctx.arc(62, 26, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.clearRect(0, h - 4, w, 4);
  });

  makeTexture(scene, PlaceholderTextures.mushroom, 40, 44, (ctx) => {
    ctx.fillStyle = PALETTE.stem;
    ctx.fillRect(15, 20, 10, 24);
    ctx.fillStyle = PALETTE.capRed;
    ctx.beginPath();
    ctx.ellipse(20, 20, 18, 13, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = PALETTE.capSpot;
    for (const [x, y, r] of [[12, 15, 3], [24, 11, 3.5], [30, 17, 2.5]] as const) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const drawSign = (ctx: CanvasRenderingContext2D, symbol: (ctx: CanvasRenderingContext2D) => void) => {
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(37, 40, 10, 60);
    ctx.fillStyle = PALETTE.wood;
    ctx.fillRect(6, 8, 72, 42);
    ctx.strokeStyle = PALETTE.woodDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 8, 72, 42);
    symbol(ctx);
  };
  makeTexture(scene, PlaceholderTextures.signArrow, 84, 100, (ctx) =>
    drawSign(ctx, (c) => {
      c.fillStyle = '#fff4d6';
      c.beginPath();
      c.moveTo(20, 24);
      c.lineTo(46, 24);
      c.lineTo(46, 16);
      c.lineTo(64, 29);
      c.lineTo(46, 42);
      c.lineTo(46, 34);
      c.lineTo(20, 34);
      c.closePath();
      c.fill();
    }),
  );
  makeTexture(scene, PlaceholderTextures.signCaution, 84, 100, (ctx) =>
    drawSign(ctx, (c) => {
      c.fillStyle = PALETTE.gold;
      c.font = 'bold 34px sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('!', 42, 30);
    }),
  );

  const drawLantern = (ctx: CanvasRenderingContext2D, lit: boolean) => {
    if (lit) {
      const glow = ctx.createRadialGradient(40, 40, 4, 40, 40, 40);
      glow.addColorStop(0, PALETTE.lanternGlow);
      glow.addColorStop(1, 'rgba(255, 214, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 80, 80);
    }
    ctx.fillStyle = PALETTE.woodDark;
    ctx.fillRect(36, 50, 8, 110);
    ctx.fillRect(28, 156, 24, 4);
    ctx.fillStyle = '#3c3a34';
    ctx.fillRect(26, 22, 28, 4);
    ctx.fillRect(28, 52, 24, 4);
    ctx.fillStyle = lit ? '#ffe38a' : '#6d6a5e';
    ctx.fillRect(29, 26, 22, 26);
    ctx.strokeStyle = '#3c3a34';
    ctx.lineWidth = 2;
    ctx.strokeRect(29, 26, 22, 26);
    ctx.fillStyle = '#3c3a34';
    ctx.beginPath();
    ctx.moveTo(24, 22);
    ctx.lineTo(40, 10);
    ctx.lineTo(56, 22);
    ctx.closePath();
    ctx.fill();
  };
  makeTexture(scene, PlaceholderTextures.checkpointOff, 80, 160, (ctx) => drawLantern(ctx, false));
  makeTexture(scene, PlaceholderTextures.checkpointOn, 80, 160, (ctx) => drawLantern(ctx, true));

  makeTexture(scene, PlaceholderTextures.finish, 240, 280, (ctx, w, h) => {
    // Two posts with a garland banner: the end of the test course.
    ctx.fillStyle = PALETTE.trunk;
    ctx.fillRect(20, 40, 18, h - 40);
    ctx.fillRect(w - 38, 40, 18, h - 40);
    ctx.fillStyle = PALETTE.leaf;
    ctx.beginPath();
    ctx.arc(29, 40, 22, 0, Math.PI * 2);
    ctx.arc(w - 29, 40, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.moveTo(38, 60);
    ctx.quadraticCurveTo(w / 2, 100, w - 38, 60);
    ctx.lineTo(w - 38, 92);
    ctx.quadraticCurveTo(w / 2, 132, 38, 92);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.capRed;
    for (let i = 0; i < 7; i++) {
      const x = 52 + i * 23;
      const y = 104 + Math.sin((i / 6) * Math.PI) * 18;
      ctx.beginPath();
      ctx.moveTo(x - 8, y);
      ctx.lineTo(x + 8, y);
      ctx.lineTo(x, y + 18);
      ctx.closePath();
      ctx.fill();
    }
  });

  makeTexture(scene, PlaceholderTextures.button, 360, 72, (ctx, w, h) => {
    const r = 18;
    ctx.fillStyle = 'rgba(59, 42, 22, 0.85)';
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, r);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}
