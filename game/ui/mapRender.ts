/** Procedural storybook rendering of the adventure map. */
import { creature } from '../data/creatures';
import { ARTIFACTS } from '../data/magic';
import { RES_INFO, SHRINE_INFO } from '../core/adventure';
import { tileAt } from '../core/map';
import type { GameState, Hero, MapObject, Town } from '../core/types';
import { darken, drawEmoji, drawFlag, drawHut, drawToken, drawTown, hash2, image, lighten, ownerColor } from './gfx';
import { HERO_PORTRAITS } from '../data/characters';

const BASE: Record<string, string> = {
  '.': '#79a84f',
  ',': '#7fae52',
  ':': '#79a84f',
  '=': '#3f7fb8',
  d: '#9a7a4e',
  h: '#86a258',
  s: '#5f7446',
  n: '#d5e0e8',
  T: '#4f7f3a',
  '^': '#8d8a72',
  '~': '#3f7fb8',
  M: '#8a8577',
};

function isWater(ch: string): boolean {
  return ch === '~' || ch === '=';
}

/** Renders static terrain for the whole map into an offscreen canvas. */
export function renderTerrain(s: GameState, T: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = s.w * T;
  c.height = s.h * T;
  const ctx = c.getContext('2d')!;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= s.w || y >= s.h ? 'T' : tileAt(s, x, y));

  // 1) ground
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const ch = at(x, y);
      const base = isWater(ch) ? BASE['.'] : BASE[ch] ?? BASE['.'];
      const v = hash2(x, y) * 0.12 - 0.06;
      ctx.fillStyle = v > 0 ? lighten(base, v) : darken(base, -v);
      ctx.fillRect(x * T, y * T, T + 1, T + 1);
      // grass tufts / flowers
      const px = x * T;
      const py = y * T;
      if (ch === '.' || ch === ':' || ch === 'T' || ch === 'h') {
        ctx.strokeStyle = '#ffffff22';
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 3; i++) {
          const gx = px + hash2(x, y, i + 1) * T;
          const gy = py + hash2(x, y, i + 9) * T;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 2, gy - 5);
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx + 2, gy - 5);
          ctx.stroke();
        }
      }
      if (ch === ',') {
        const cols = ['#f6e27a', '#f3a6c8', '#ffffff', '#c9a3f0'];
        for (let i = 0; i < 6; i++) {
          ctx.fillStyle = cols[i % cols.length];
          ctx.beginPath();
          ctx.arc(px + hash2(x, y, i + 3) * T, py + hash2(x, y, i + 13) * T, T * 0.035, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (ch === 's') {
        ctx.fillStyle = '#3e5a4a';
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(px + (0.2 + 0.6 * hash2(x, y, i)) * T, py + (0.25 + 0.5 * hash2(x, y, i + 5)) * T, T * 0.18, T * 0.08, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = '#2f4a22';
        ctx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) {
          const rx = px + hash2(x, y, i + 21) * T;
          const ry = py + hash2(x, y, i + 31) * T;
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx + 1, ry - T * 0.16);
          ctx.stroke();
        }
      }
      if (ch === 'h') {
        ctx.fillStyle = '#5f7a3c';
        ctx.beginPath();
        ctx.ellipse(px + T * 0.35, py + T * 0.62, T * 0.3, T * 0.18, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#6d8a45';
        ctx.beginPath();
        ctx.ellipse(px + T * 0.7, py + T * 0.45, T * 0.24, T * 0.15, 0, Math.PI, 0);
        ctx.fill();
      }
      if (ch === 'n') {
        ctx.fillStyle = '#b7c8d6';
        ctx.beginPath();
        ctx.ellipse(px + T * (0.3 + 0.4 * hash2(x, y, 3)), py + T * (0.62 + 0.2 * hash2(x, y, 4)), T * 0.3, T * 0.08, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f4f8fb';
        ctx.beginPath();
        ctx.ellipse(px + T * (0.25 + 0.5 * hash2(x, y, 5)), py + T * (0.3 + 0.2 * hash2(x, y, 6)), T * 0.26, T * 0.1, 0, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ffffffcc';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + hash2(x, y, i) * T, py + hash2(x, y, i + 7) * T, 2, 2);
      }
      if (ch === 'd') {
        ctx.fillStyle = '#7a5e3a';
        for (let i = 0; i < 4; i++) ctx.fillRect(px + hash2(x, y, i) * T, py + hash2(x, y, i + 7) * T, 3, 2);
      }
    }

  // 2) water as connected blobs
  ctx.fillStyle = '#3f7fb8';
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!isWater(at(x, y))) continue;
      const cx = x * T + T / 2;
      const cy = y * T + T / 2;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.62, 0, Math.PI * 2);
      ctx.fill();
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (isWater(at(x + dx, y + dy))) {
          ctx.lineWidth = T * 1.1;
          ctx.strokeStyle = '#3f7fb8';
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + dx * T, cy + dy * T);
          ctx.stroke();
        }
      }
    }
  // waves
  ctx.strokeStyle = '#8cc3ea88';
  ctx.lineWidth = 1.5;
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (at(x, y) !== '~') continue;
      for (let i = 0; i < 2; i++) {
        const wx = x * T + hash2(x, y, i + 40) * T * 0.7;
        const wy = y * T + hash2(x, y, i + 50) * T * 0.8 + 6;
        ctx.beginPath();
        ctx.arc(wx + 5, wy, 5, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      }
    }

  // 3) roads (and bridge planks)
  const roadish = (ch: string) => ch === ':' || ch === '=';
  ctx.lineCap = 'round';
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (!roadish(at(x, y))) continue;
      const cx = x * T + T / 2;
      const cy = y * T + T / 2;
      for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [-1, 1]]) {
        if (!roadish(at(x + dx, y + dy))) continue;
        if (dx !== 0 && dy !== 0 && (roadish(at(x + dx, y)) || roadish(at(x, y + dy)))) continue;
        ctx.strokeStyle = '#8e6d43';
        ctx.lineWidth = T * 0.42;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + dx * T, cy + dy * T);
        ctx.stroke();
        ctx.strokeStyle = '#d2b07a';
        ctx.lineWidth = T * 0.32;
        ctx.stroke();
      }
      ctx.fillStyle = '#d2b07a';
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      if (at(x, y) !== '=') continue;
      const horiz = isWater(at(x, y - 1)) || isWater(at(x, y + 1));
      ctx.fillStyle = '#9b6b3c';
      ctx.strokeStyle = '#5a3a1c';
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        if (horiz) {
          ctx.fillRect(x * T + i * (T / 5), y * T + T * 0.22, T / 5 - 2, T * 0.56);
          ctx.strokeRect(x * T + i * (T / 5), y * T + T * 0.22, T / 5 - 2, T * 0.56);
        } else {
          ctx.fillRect(x * T + T * 0.22, y * T + i * (T / 5), T * 0.56, T / 5 - 2);
          ctx.strokeRect(x * T + T * 0.22, y * T + i * (T / 5), T * 0.56, T / 5 - 2);
        }
      }
    }

  // 4) rocks / mountains / trees (sorted by row so they overlap nicely)
  for (let y = 0; y < s.h; y++)
    for (let x = 0; x < s.w; x++) {
      const ch = at(x, y);
      const px = x * T;
      const py = y * T;
      if (ch === '^' || ch === 'M') {
        const n = ch === 'M' ? 1 : 2;
        for (let i = 0; i < n; i++) {
          const bx = px + T * (n === 1 ? 0.5 : 0.3 + i * 0.4) + (hash2(x, y, i) - 0.5) * T * 0.15;
          const bh = T * (ch === 'M' ? 1.1 : 0.6 + hash2(x, y, i + 3) * 0.25);
          const bw = T * (ch === 'M' ? 0.62 : 0.34);
          const by = py + T * 0.92;
          ctx.fillStyle = '#7d7a6a';
          ctx.beginPath();
          ctx.moveTo(bx - bw, by);
          ctx.lineTo(bx - bw * 0.2, by - bh);
          ctx.lineTo(bx + bw, by);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#a3a08e';
          ctx.beginPath();
          ctx.moveTo(bx - bw * 0.2, by - bh);
          ctx.lineTo(bx + bw, by);
          ctx.lineTo(bx + bw * 0.1, by);
          ctx.closePath();
          ctx.fill();
          if (ch === 'M' || hash2(x, y, i + 8) > 0.6) {
            ctx.fillStyle = '#f4f6f8';
            ctx.beginPath();
            ctx.moveTo(bx - bw * 0.2, by - bh);
            ctx.lineTo(bx - bw * 0.42, by - bh * 0.72);
            ctx.lineTo(bx + bw * 0.12, by - bh * 0.76);
            ctx.closePath();
            ctx.fill();
          }
        }
      }
      if (ch === 'T') {
        for (let i = 0; i < 3; i++) {
          const tx = px + T * (0.2 + 0.6 * hash2(x, y, i + 60));
          const ty = py + T * (0.3 + 0.55 * hash2(x, y, i + 70));
          const r = T * (0.22 + 0.1 * hash2(x, y, i + 80));
          const pine = hash2(x, y, i + 90) > 0.55;
          ctx.fillStyle = '#00000033';
          ctx.beginPath();
          ctx.ellipse(tx + 3, ty + r * 0.9, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#5a3d22';
          ctx.fillRect(tx - 2, ty, 4, r * 0.9);
          if (pine) {
            ctx.fillStyle = '#24563a';
            ctx.beginPath();
            ctx.moveTo(tx, ty - r * 1.6);
            ctx.lineTo(tx - r, ty + r * 0.4);
            ctx.lineTo(tx + r, ty + r * 0.4);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#2f6e48';
            ctx.beginPath();
            ctx.moveTo(tx, ty - r * 1.6);
            ctx.lineTo(tx + r, ty + r * 0.4);
            ctx.lineTo(tx + r * 0.2, ty + r * 0.4);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.fillStyle = '#2f6b2c';
            ctx.beginPath();
            ctx.arc(tx, ty - r * 0.3, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4b8f3a';
            ctx.beginPath();
            ctx.arc(tx - r * 0.3, ty - r * 0.6, r * 0.55, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  return c;
}

// ---------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------

export function drawObject(ctx: CanvasRenderingContext2D, s: GameState, o: MapObject, px: number, py: number, T: number, time: number): void {
  const cx = px + T / 2;
  const cy = py + T / 2;
  const shadow = (w = 0.34) => {
    ctx.fillStyle = '#0004';
    ctx.beginPath();
    ctx.ellipse(cx, py + T * 0.86, T * w, T * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  switch (o.kind) {
    case 'monster': {
      const c = creature(o.cid);
      shadow(0.36);
      const bob = Math.sin(time / 500 + o.x * 1.7) * T * 0.03;
      drawToken(ctx, cx, cy + bob, T * 0.36, c.icon, { ring: o.guard ? '#d94c3c' : '#c9a35b', fill: '#4a3a2a', badge: c.badge });
      break;
    }
    case 'resource':
      shadow(0.25);
      drawEmoji(ctx, RES_INFO[o.res].icon, cx, cy + T * 0.08, T * 0.5);
      if (o.res === 'acorns') drawEmoji(ctx, '🌰', cx + T * 0.18, cy + T * 0.18, T * 0.34);
      break;
    case 'chest':
      shadow(0.28);
      drawEmoji(ctx, '🧰', cx, cy + T * 0.06, T * 0.52);
      break;
    case 'artifact': {
      const a = ARTIFACTS[o.art];
      const glow = 0.5 + 0.5 * Math.sin(time / 300);
      ctx.fillStyle = `rgba(255,230,140,${0.25 + glow * 0.25})`;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.36, 0, Math.PI * 2);
      ctx.fill();
      drawEmoji(ctx, a?.icon ?? '✨', cx, cy, T * 0.5);
      break;
    }
    case 'questItem': {
      const glow = 0.5 + 0.5 * Math.sin(time / 260);
      ctx.fillStyle = `rgba(255,240,170,${0.3 + glow * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.4, 0, Math.PI * 2);
      ctx.fill();
      drawEmoji(ctx, '📜', cx, cy, T * 0.52);
      break;
    }
    case 'mine': {
      drawHut(ctx, cx, cy, T * 0.9, ownerColor(o.owner), o.res === 'cheese' ? '#d9a23a' : o.res === 'stone' ? '#6d6a60' : '#7a4a2a');
      drawEmoji(ctx, RES_INFO[o.res].icon, cx - T * 0.26, cy + T * 0.22, T * 0.34);
      break;
    }
    case 'dwelling': {
      drawHut(ctx, cx, cy, T * 0.9, ownerColor(o.owner), '#4f7f3a');
      drawEmoji(ctx, creature(o.cid).icon, cx - T * 0.24, cy + T * 0.2, T * 0.36);
      break;
    }
    case 'shrine': {
      shadow(0.3);
      ctx.fillStyle = '#8f8a78';
      ctx.fillRect(cx - T * 0.22, cy + T * 0.12, T * 0.44, T * 0.18);
      drawEmoji(ctx, SHRINE_INFO[o.effect]?.icon ?? '✨', cx, cy - T * 0.04, T * 0.5);
      break;
    }
    case 'npc': {
      const p = HERO_PORTRAITS[o.npc] ?? null;
      shadow(0.32);
      const bob = Math.sin(time / 400 + o.y) * T * 0.03;
      if (o.npc === 'troshko') drawEmoji(ctx, '🛒', cx - T * 0.26, cy + T * 0.16, T * 0.42);
      drawToken(ctx, cx, cy + bob, T * 0.34, p?.icon ?? npcIcon(o.npc), { fill: '#6a5a3a', ring: '#f0d58a', badge: p?.badge });
      if (!o.doneFlag || !s.flags[o.doneFlag]) {
        const pulse = 1 + Math.sin(time / 200) * 0.12;
        drawEmoji(ctx, '❗', cx + T * 0.3, py + T * 0.12, T * 0.32 * pulse);
      }
      break;
    }
    case 'sign':
      shadow(0.2);
      ctx.fillStyle = '#6b4523';
      ctx.fillRect(cx - T * 0.04, cy - T * 0.15, T * 0.08, T * 0.5);
      ctx.fillStyle = '#c9975a';
      ctx.strokeStyle = '#5a3a1c';
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - T * 0.3, cy - T * 0.3, T * 0.6, T * 0.24);
      ctx.strokeRect(cx - T * 0.3, cy - T * 0.3, T * 0.6, T * 0.24);
      ctx.strokeStyle = '#7a5532';
      ctx.beginPath();
      ctx.moveTo(cx - T * 0.2, cy - T * 0.22);
      ctx.lineTo(cx + T * 0.2, cy - T * 0.22);
      ctx.moveTo(cx - T * 0.2, cy - T * 0.14);
      ctx.lineTo(cx + T * 0.12, cy - T * 0.14);
      ctx.stroke();
      break;
    case 'gate':
      drawEmoji(ctx, '🚪', cx, cy, T * 0.62);
      drawEmoji(ctx, '🔒', cx + T * 0.24, cy + T * 0.2, T * 0.3);
      break;
    case 'goal': {
      const glow = 0.5 + 0.5 * Math.sin(time / 300);
      ctx.fillStyle = `rgba(255,215,120,${0.25 + glow * 0.3})`;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.5, 0, Math.PI * 2);
      ctx.fill();
      drawEmoji(ctx, '⛩️', cx, cy, T * 0.66);
      break;
    }
    case 'event': {
      const a = 0.3 + 0.3 * Math.sin(time / 350 + o.x);
      ctx.fillStyle = `rgba(255,255,220,${a})`;
      ctx.beginPath();
      ctx.arc(cx, cy, T * 0.09, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function npcIcon(npc: string): string {
  return { mouselings: '🐭', troshko: '🦔', letokril: '🦇', belagor: '🦉', iskritsa: '🐿️', borko: '🐹' }[npc] ?? '🧑';
}

export function drawTownAt(ctx: CanvasRenderingContext2D, t: Town, px: number, py: number, T: number): void {
  drawTown(ctx, px + T / 2, py + T * 0.42, T * 1.25, t.faction, ownerColor(t.owner), t.special);
}

export function drawHero(ctx: CanvasRenderingContext2D, h: Hero, px: number, py: number, T: number, selected: boolean, time: number): void {
  const cx = px + T / 2;
  const base = py + T * 0.9;
  const col = ownerColor(h.owner);
  if (selected) {
    const pulse = 0.6 + 0.4 * Math.sin(time / 220);
    ctx.strokeStyle = `rgba(255,224,120,${pulse})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(cx, base, T * 0.4, T * 0.14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = col + 'aa';
  ctx.beginPath();
  ctx.ellipse(cx, base, T * 0.32, T * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  if (h.portrait === 'mishkontin') {
    const img = image('img/mishkontin-idle.webp');
    if (img.complete && img.naturalWidth) {
      const hgt = T * 1.15;
      const w = (img.naturalWidth / img.naturalHeight) * hgt;
      ctx.save();
      ctx.translate(cx, base);
      if (h.facing < 0) ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -hgt, w, hgt);
      ctx.restore();
      drawFlag(ctx, cx - T * 0.36, base - T * 0.2, T * 0.42, col);
      return;
    }
  }
  const p = HERO_PORTRAITS[h.portrait] ?? HERO_PORTRAITS.rat;
  drawToken(ctx, cx, base - T * 0.36, T * 0.34, p.icon, { fill: col, ring: '#f2d68a', badge: p.badge, flip: h.facing > 0 });
  drawFlag(ctx, cx - T * 0.36, base - T * 0.2, T * 0.42, col);
}
