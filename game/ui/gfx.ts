import { CHARACTERS, HERO_PORTRAITS } from '../data/characters';
import { creature } from '../data/creatures';
import type { Owner } from '../core/types';

export const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

export const OWNER_COLOR: Record<string, string> = { player: '#3f9a4a', enemy: '#b23a3a', none: '#8a8a8a' };
export function ownerColor(o: Owner | undefined): string {
  return o ? OWNER_COLOR[o] : OWNER_COLOR.none;
}

const imgCache = new Map<string, HTMLImageElement>();
export function image(url: string, onload?: () => void): HTMLImageElement {
  let img = imgCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imgCache.set(url, img);
  }
  if (onload && !img.complete) img.addEventListener('load', onload, { once: true });
  return img;
}

export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (u) =>
        new Promise<void>((res) => {
          const img = image(u);
          if (img.complete) res();
          else {
            img.addEventListener('load', () => res(), { once: true });
            img.addEventListener('error', () => res(), { once: true });
          }
        }),
    ),
  ).then(() => undefined);
}

const emojiCache = new Map<string, HTMLCanvasElement>();
/** Renders an emoji once into an offscreen canvas (much faster to blit). */
export function emojiCanvas(emoji: string, px: number): HTMLCanvasElement {
  const size = Math.max(8, Math.round(px));
  const key = `${emoji}@${size}`;
  let c = emojiCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = Math.ceil(size * 1.3);
  const ctx = c.getContext('2d')!;
  ctx.font = `${size}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, c.width / 2, c.height / 2 + size * 0.06);
  emojiCache.set(key, c);
  return c;
}

export function drawEmoji(ctx: CanvasRenderingContext2D, emoji: string, x: number, y: number, size: number, flip = false): void {
  const c = emojiCanvas(emoji, size * 2 > 128 ? size : size * 2);
  const w = size * 1.3;
  if (flip) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(-1, 1);
    ctx.drawImage(c, -w / 2, -w / 2, w, w);
    ctx.restore();
  } else ctx.drawImage(c, x - w / 2, y - w / 2, w, w);
}

export function hash2(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Round token with a big glyph (creatures, NPCs, heroes without art). */
export function drawToken(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  icon: string,
  opts: { ring?: string; fill?: string; badge?: string; flip?: boolean; glow?: string } = {},
): void {
  ctx.save();
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = r * 0.8;
  }
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  g.addColorStop(0, opts.fill ? lighten(opts.fill, 0.35) : '#6b5a44');
  g.addColorStop(1, opts.fill ?? '#3a2e22');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(2, r * 0.12);
  ctx.strokeStyle = opts.ring ?? '#c9a35b';
  ctx.stroke();
  ctx.restore();
  drawEmoji(ctx, icon, x, y + r * 0.04, r * 1.25, opts.flip);
  if (opts.badge) drawEmoji(ctx, opts.badge, x + r * 0.62, y - r * 0.6, r * 0.62);
}

export function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amt));
  const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amt));
  const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amt));
  return `rgb(${r},${g},${b})`;
}

export function darken(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `rgb(${r},${g},${b})`;
}

/** Flag on a pole in owner colour. */
export function drawFlag(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string): void {
  ctx.strokeStyle = '#3a2a1a';
  ctx.lineWidth = Math.max(1.5, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.lineTo(x + s * 0.7, y - s * 0.82);
  ctx.lineTo(x, y - s * 0.62);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0006';
  ctx.lineWidth = 1;
  ctx.stroke();
}

/** Simple storybook castle / burrow. */
export function drawTown(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, faction: string, color: string, special?: string): void {
  const rats = faction === 'rats';
  const wall = rats ? '#5b5048' : special === 'sirengrad' ? '#efe3c4' : '#c9b48a';
  const roof = rats ? '#3b2f2a' : special === 'sirengrad' ? '#3f5ea8' : '#a4432f';
  const base = cy + s * 0.42;
  ctx.save();
  // shadow
  ctx.fillStyle = '#0005';
  ctx.beginPath();
  ctx.ellipse(cx, base + s * 0.04, s * 0.62, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  const tower = (x: number, w: number, h: number) => {
    ctx.fillStyle = wall;
    ctx.fillRect(x - w / 2, base - h, w, h);
    ctx.strokeStyle = '#0006';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x - w / 2, base - h, w, h);
    ctx.fillStyle = roof;
    ctx.beginPath();
    ctx.moveTo(x - w * 0.62, base - h);
    ctx.lineTo(x, base - h - w * (rats ? 0.6 : 1.1));
    ctx.lineTo(x + w * 0.62, base - h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  if (special === 'sirengrad') {
    // The old mill by the river: stone body, wooden roof and a big water wheel.
    const wx = cx + s * 0.36;
    const wy = base - s * 0.3;
    ctx.strokeStyle = '#5a3a1c';
    ctx.lineWidth = Math.max(1.5, s * 0.04);
    ctx.fillStyle = '#7a5532';
    ctx.beginPath();
    ctx.arc(wx, wy, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(wx, wy);
      ctx.lineTo(wx + Math.cos(a) * s * 0.32, wy + Math.sin(a) * s * 0.32);
      ctx.stroke();
    }
    ctx.fillStyle = '#d8ccb0';
    ctx.fillRect(cx - s * 0.42, base - s * 0.72, s * 0.62, s * 0.72);
    ctx.strokeStyle = '#0006';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(cx - s * 0.42, base - s * 0.72, s * 0.62, s * 0.72);
    ctx.fillStyle = '#8a4a2a';
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.5, base - s * 0.72);
    ctx.lineTo(cx - s * 0.11, base - s * 1.08);
    ctx.lineTo(cx + s * 0.28, base - s * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd98a';
    ctx.fillRect(cx - s * 0.3, base - s * 0.56, s * 0.1, s * 0.1);
    ctx.fillRect(cx - s * 0.04, base - s * 0.56, s * 0.1, s * 0.1);
    // The little gate of two pieces of bark.
    ctx.fillStyle = '#5a3a1c';
    ctx.fillRect(cx - s * 0.2, base - s * 0.2, s * 0.08, s * 0.2);
    ctx.fillRect(cx - s * 0.11, base - s * 0.2, s * 0.08, s * 0.2);
    drawFlag(ctx, cx - s * 0.11, base - s * 1.3, s * 0.3, color);
    ctx.restore();
    return;
  }
  if (special === 'oak' || special === 'camp') {
    // A glade under an old oak / a camp by the dry oak: roots, a trunk and burrow doors.
    const dry = special === 'camp';
    ctx.fillStyle = '#6b4523';
    ctx.fillRect(cx - s * 0.12, base - s * 0.75, s * 0.24, s * 0.75);
    ctx.fillStyle = dry ? '#8a7a5a' : '#4f7f3a';
    for (const [dx, dy, r] of [[0, -1.0, 0.38], [-0.3, -0.82, 0.28], [0.3, -0.82, 0.28]] as const) {
      ctx.beginPath();
      ctx.arc(cx + dx * s, base + dy * s, r * s * (dry ? 0.7 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#2a1a10';
    for (const dx of [-0.34, 0.34]) {
      ctx.beginPath();
      ctx.ellipse(cx + dx * s, base, s * 0.09, s * 0.12, 0, Math.PI, 0);
      ctx.fill();
    }
    if (dry) {
      ctx.fillStyle = '#e9dcc0';
      ctx.beginPath();
      ctx.moveTo(cx + s * 0.18, base);
      ctx.lineTo(cx + s * 0.4, base - s * 0.3);
      ctx.lineTo(cx + s * 0.62, base);
      ctx.closePath();
      ctx.fill();
    }
    drawFlag(ctx, cx, base - s * 1.45, s * 0.3, color);
    ctx.restore();
    return;
  }
  if (rats && special === 'tunnels') {
    // Black, tooth-like rocks around the mouth of the Dark Tunnels.
    ctx.fillStyle = '#26211e';
    for (const [dx, w, hgt] of [[-0.42, 0.3, 0.7], [-0.15, 0.32, 0.95], [0.15, 0.3, 0.85], [0.42, 0.28, 0.6]] as const) {
      ctx.beginPath();
      ctx.moveTo(cx + (dx - w / 2) * s, base);
      ctx.lineTo(cx + dx * s, base - hgt * s);
      ctx.lineTo(cx + (dx + w / 2) * s, base);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(cx, base, s * 0.2, s * 0.3, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#e04a2a';
    ctx.beginPath();
    ctx.arc(cx - s * 0.06, base - s * 0.14, s * 0.025, 0, Math.PI * 2);
    ctx.arc(cx + s * 0.06, base - s * 0.14, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
    drawFlag(ctx, cx - s * 0.15, base - s * 1.15, s * 0.3, color);
    ctx.restore();
    return;
  }
  if (rats) {
    // A heap-like burrow with a crooked tower.
    ctx.fillStyle = '#4a3f36';
    ctx.beginPath();
    ctx.ellipse(cx, base, s * 0.55, s * 0.42, 0, Math.PI, 0);
    ctx.fill();
    ctx.strokeStyle = '#0007';
    ctx.stroke();
    tower(cx + s * 0.2, s * 0.22, s * 0.62);
    ctx.fillStyle = '#1a1410';
    ctx.beginPath();
    ctx.ellipse(cx - s * 0.12, base, s * 0.14, s * 0.18, 0, Math.PI, 0);
    ctx.fill();
  } else {
    ctx.fillStyle = wall;
    ctx.fillRect(cx - s * 0.48, base - s * 0.34, s * 0.96, s * 0.34);
    ctx.strokeStyle = '#0006';
    ctx.strokeRect(cx - s * 0.48, base - s * 0.34, s * 0.96, s * 0.34);
    for (let i = 0; i < 5; i++) ctx.fillRect(cx - s * 0.48 + i * s * 0.22, base - s * 0.4, s * 0.1, s * 0.07);
    tower(cx - s * 0.42, s * 0.2, s * 0.55);
    tower(cx + s * 0.42, s * 0.2, s * 0.55);
    tower(cx, s * 0.26, s * (special === 'sirengrad' ? 0.95 : 0.75));
    ctx.fillStyle = '#3a2416';
    ctx.beginPath();
    ctx.ellipse(cx, base, s * 0.1, s * 0.16, 0, Math.PI, 0);
    ctx.fill();
  }
  drawFlag(ctx, cx + (rats ? s * 0.2 : 0), base - s * (rats ? 0.95 : special === 'sirengrad' ? 1.5 : 1.25), s * 0.32, color);
  ctx.restore();
}

/** Small hut used for mines and dwellings. */
export function drawHut(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number, color: string, roof = '#7a4a2a'): void {
  const base = cy + s * 0.32;
  ctx.fillStyle = '#0004';
  ctx.beginPath();
  ctx.ellipse(cx, base + 2, s * 0.45, s * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b89a6a';
  ctx.fillRect(cx - s * 0.32, base - s * 0.34, s * 0.64, s * 0.34);
  ctx.strokeStyle = '#0007';
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - s * 0.32, base - s * 0.34, s * 0.64, s * 0.34);
  ctx.fillStyle = roof;
  ctx.beginPath();
  ctx.moveTo(cx - s * 0.42, base - s * 0.32);
  ctx.lineTo(cx, base - s * 0.66);
  ctx.lineTo(cx + s * 0.42, base - s * 0.32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  drawFlag(ctx, cx + s * 0.3, base - s * 0.5, s * 0.32, color);
}

// ---------------------------------------------------------------------------
// Portraits (DOM)
// ---------------------------------------------------------------------------

/** A portrait element for a story character or hero portrait key. */
export function portraitEl(key: string, size: number, mood = 'idle'): HTMLElement {
  const ch = CHARACTERS[key];
  if (ch?.images) {
    const img = document.createElement('img');
    img.src = ch.images[mood] ?? ch.images.idle;
    img.alt = ch.name;
    img.style.height = `${size}px`;
    img.style.objectFit = 'contain';
    return img;
  }
  return portraitCanvas(key, size);
}

export function portraitCanvas(key: string, size: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  c.width = c.height = Math.round(size * dpr);
  c.style.width = c.style.height = `${size}px`;
  const ctx = c.getContext('2d')!;
  ctx.scale(dpr, dpr);
  drawPortrait(ctx, key, size / 2, size / 2, size / 2);
  return c;
}

export function portraitInfo(key: string): { icon: string; badge?: string; color: string } {
  if (key.startsWith('creature:')) {
    const cr = creature(key.slice(9));
    return { icon: cr.icon, badge: cr.badge, color: '#6b5a44' };
  }
  if (key.startsWith('town:')) return { icon: key.endsWith('rats') ? '🏚️' : '🏰', color: '#5a4630' };
  const ch = CHARACTERS[key];
  if (ch) return { icon: ch.icon, badge: ch.badge, color: ch.color };
  return HERO_PORTRAITS[key] ?? { icon: '❔', color: '#555' };
}

export function drawPortrait(ctx: CanvasRenderingContext2D, key: string, cx: number, cy: number, r: number): void {
  if (key === 'mishkontin') {
    const img = image('img/mishkontin-idle.webp');
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    const g = ctx.createRadialGradient(cx, cy - r * 0.3, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#9ccf7a');
    g.addColorStop(1, '#3f7d3a');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();
    if (img.complete && img.naturalWidth) {
      const hgt = r * 2.6;
      const w = (img.naturalWidth / img.naturalHeight) * hgt;
      ctx.drawImage(img, cx - w / 2 + r * 0.1, cy - r * 0.95, w, hgt);
    } else drawEmoji(ctx, '🐭', cx, cy, r * 1.3);
    ctx.restore();
    ctx.lineWidth = Math.max(2, r * 0.1);
    ctx.strokeStyle = '#d9b45f';
    ctx.beginPath();
    ctx.arc(cx, cy, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }
  const p = portraitInfo(key);
  drawToken(ctx, cx, cy, r - Math.max(2, r * 0.1) / 2, p.icon, { fill: p.color, badge: p.badge, ring: '#d9b45f' });
  if (key === 'belegor') {
    // The long scar from the eye to the tip of the snout.
    ctx.save();
    ctx.strokeStyle = '#e8d9c8';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.35, cy - r * 0.35);
    ctx.lineTo(cx + r * 0.3, cy + r * 0.25);
    ctx.stroke();
    ctx.strokeStyle = '#a33';
    ctx.lineWidth = Math.max(1, r * 0.03);
    ctx.stroke();
    ctx.restore();
  }
}
