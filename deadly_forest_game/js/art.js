'use strict';
// ===================== Рисуване: карта, врагове, босове, предмети =====================

function hash(x, y, s = 0) { const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453; return v - Math.floor(v); }
function rrect(g, x, y, w, h, r) { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); }
function circle(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); }
function glow(g, x, y, r, color, a = 0.5) {
  const gr = g.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, hexA(color, a)); gr.addColorStop(1, hexA(color, 0));
  g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
}
function hexA(hex, a) {
  if (hex[0] !== '#') return hex;
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
}
function shade(hex, f) {
  let h = hex.slice(1); if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16); const cl = v => Math.max(0, Math.min(255, Math.round(v)));
  const r = n >> 16 & 255, gg = n >> 8 & 255, b = n & 255;
  return f >= 0 ? `rgb(${cl(r + (255 - r) * f)},${cl(gg + (255 - gg) * f)},${cl(b + (255 - b) * f)})`
    : `rgb(${cl(r * (1 + f))},${cl(gg * (1 + f))},${cl(b * (1 + f))})`;
}

// ---------- Карта ----------
function renderMap(lv) {
  const { w, h, grid, L } = lv, P = L.pal;
  const c = document.createElement('canvas'); c.width = w * TILE; c.height = h * TILE;
  const g = c.getContext('2d');
  g.fillStyle = P.wallTop; g.fillRect(0, 0, c.width, c.height);
  const isWall = (x, y) => x < 0 || y < 0 || x >= w || y >= h || grid[y * w + x] === 1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!isWall(x, y)) drawFloor(g, L, x, y);
  }
  lv.decor.forEach(d => drawDecor(g, L, d));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (isWall(x, y)) drawWall(g, L, x, y, !isWall(x, y + 1), isWall);
  }
  lv.props.forEach(p => drawProp(g, L, p));
  if (L.id === 'forest') {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (isWall(x, y) && hash(x, y, 9) < 0.45) {
        const near = !isWall(x + 1, y) || !isWall(x - 1, y) || !isWall(x, y + 1) || !isWall(x, y - 1);
        const cx = x * TILE + 20 + (hash(x, y, 3) - 0.5) * 16, cy = y * TILE + 14 + (hash(x, y, 4) - 0.5) * 16;
        const r = (near ? 24 : 30) + hash(x, y, 5) * 14;
        g.fillStyle = '#06100a'; circle(g, cx + 4, cy + 6, r); g.fill();
        g.fillStyle = hash(x, y, 6) < 0.5 ? '#183a1e' : '#14301a'; circle(g, cx, cy, r); g.fill();
        g.fillStyle = '#21502a'; circle(g, cx - r * 0.3, cy - r * 0.3, r * 0.5); g.fill();
      }
    }
  }
  return c;
}

function drawFloor(g, L, x, y) {
  const P = L.pal, px = x * TILE, py = y * TILE, n = hash(x, y);
  switch (L.id) {
    case 'factory':
      g.fillStyle = (x + y) % 2 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      if (n < 0.05) { g.fillStyle = ['#ff6fa8', '#5fd4ff', '#ffd568'][Math.floor(n * 60) % 3]; circle(g, px + 20, py + 20, 3); g.fill(); }
      break;
    case 'warehouse':
      g.fillStyle = n < 0.5 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      if (n > 0.93) { g.strokeStyle = '#2a281f'; g.lineWidth = 1; g.beginPath(); g.moveTo(px + 5, py + 10); g.lineTo(px + 18, py + 22); g.lineTo(px + 30, py + 19); g.stroke(); }
      if (y % 8 === 0 && n < 0.6) { g.fillStyle = '#c9a43a55'; g.fillRect(px, py + 18, TILE, 4); }
      break;
    case 'circus':
      g.fillStyle = (x + y) % 2 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = '#c99a5a14'; g.fillRect(px + (n * 30), py + (hash(x, y, 2) * 30), 4, 4);
      if (n < 0.04) { g.fillStyle = ['#ffd568', '#ff5f8f', '#5fd4ff'][Math.floor(n * 75) % 3]; g.fillRect(px + 12, py + 15, 5, 3); }
      break;
    case 'canals':
      g.fillStyle = n < 0.5 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = '#00000033'; g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
      if (n > 0.85) { g.fillStyle = '#7fd0c022'; g.beginPath(); g.ellipse(px + 20, py + 22, 12, 5, 0, 0, 7); g.fill(); }
      break;
    case 'house':
      g.fillStyle = y % 2 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = '#00000030'; g.fillRect(px, py + TILE - 2, TILE, 2);
      if ((x + (y % 2) * 2) % 4 === 0) g.fillRect(px, py, 2, TILE);
      break;
    case 'forest': {
      g.fillStyle = n < 0.5 ? P.floor : P.floor2; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = '#2f4a22'; g.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const bx = px + hash(x, y, i + 10) * 36, by = py + hash(x, y, i + 20) * 36 + 4;
        g.beginPath(); g.moveTo(bx, by); g.lineTo(bx - 2, by - 6); g.moveTo(bx, by); g.lineTo(bx + 2, by - 7); g.stroke();
      }
      break;
    }
  }
}

function drawWall(g, L, x, y, face) {
  const P = L.pal, px = x * TILE, py = y * TILE, n = hash(x, y, 1);
  if (!face) {
    g.fillStyle = P.wallTop; g.fillRect(px, py, TILE, TILE);
    if (L.id !== 'forest') { g.fillStyle = '#ffffff06'; if (n < 0.3) g.fillRect(px + 6, py + 6, 10, 10); }
    return;
  }
  g.fillStyle = P.face; g.fillRect(px, py, TILE, TILE);
  switch (L.id) {
    case 'factory':
    case 'canals':
      g.strokeStyle = '#00000040'; g.lineWidth = 2;
      for (let r = 0; r < 3; r++) {
        const yy = py + 4 + r * 12; g.beginPath(); g.moveTo(px, yy + 12); g.lineTo(px + TILE, yy + 12); g.stroke();
        const off = (r + x) % 2 ? 10 : 30; g.beginPath(); g.moveTo(px + off, yy); g.lineTo(px + off, yy + 12); g.stroke();
      }
      if (L.id === 'canals' && n < 0.4) { g.fillStyle = '#3f7a3a'; g.fillRect(px + n * 30, py + 26, 6, 14); }
      if (L.id === 'factory' && n < 0.12) { g.fillStyle = '#ffb347'; g.fillRect(px + 8, py + 10, 24, 14); g.fillStyle = '#2a1f35'; g.font = 'bold 9px sans-serif'; g.fillText('TOYS', px + 9, py + 21); }
      break;
    case 'warehouse':
      g.fillStyle = '#7a6440'; g.fillRect(px + 2, py + 4, TILE - 4, 16); g.fillRect(px + 2, py + 22, TILE - 4, 16);
      g.strokeStyle = '#3b2f1c'; g.lineWidth = 2; g.strokeRect(px + 2, py + 4, TILE - 4, 16); g.strokeRect(px + 2, py + 22, TILE - 4, 16);
      g.beginPath(); g.moveTo(px + 2, py + 4); g.lineTo(px + TILE - 2, py + 20); g.stroke();
      break;
    case 'circus':
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f4efe4' : '#b8203e'; g.fillRect(px + i * 10, py, 10, TILE); }
      g.fillStyle = '#00000030'; g.fillRect(px, py + 30, TILE, 10);
      if (x % 3 === 0) { g.fillStyle = '#ffd568'; circle(g, px + 20, py + 5, 3); g.fill(); }
      break;
    case 'house':
      g.fillStyle = '#ffffff10';
      for (let i = 0; i < 2; i++) { g.beginPath(); g.moveTo(px + 10 + i * 20, py + 6); g.lineTo(px + 16 + i * 20, py + 14); g.lineTo(px + 10 + i * 20, py + 22); g.lineTo(px + 4 + i * 20, py + 14); g.fill(); }
      g.fillStyle = '#1a1020'; g.fillRect(px, py + 32, TILE, 8);
      if (n < 0.08) { g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.strokeRect(px + 9, py + 6, 22, 20); g.fillStyle = '#4a2f5a'; g.fillRect(px + 11, py + 8, 18, 16); }
      break;
    case 'forest':
      g.fillStyle = '#1f150c'; for (let i = 0; i < 2; i++) g.fillRect(px + 8 + i * 18 + n * 4, py + 8, 6, 32);
      break;
  }
  g.fillStyle = '#ffffff18'; g.fillRect(px, py, TILE, 3);
}

function drawProp(g, L, p) {
  const x = p.x * TILE, y = p.y * TILE, s = TILE * 2, n = hash(p.x, p.y, 7);
  g.fillStyle = '#00000055'; g.beginPath(); g.ellipse(x + s / 2, y + s - 6, s / 2, 10, 0, 0, 7); g.fill();
  switch (L.id) {
    case 'factory': {
      const cols = ['#e2464f', '#3f8fe0', '#f2b33d', '#4fc06a'], col = cols[Math.floor(n * 4)];
      g.fillStyle = shade(col, -0.35); rrect(g, x + 6, y + 18, s - 12, s - 22, 8); g.fill();
      g.fillStyle = col; rrect(g, x + 6, y + 4, s - 12, s - 30, 8); g.fill();
      g.fillStyle = '#ffffffcc'; g.font = 'bold 30px Georgia,serif'; g.textAlign = 'center'; g.fillText('АБВГ'[Math.floor(n * 40) % 4], x + s / 2, y + 40); g.textAlign = 'left';
      break;
    }
    case 'warehouse':
      for (let i = 0; i < 2; i++) {
        const yy = y + 4 + i * 36;
        g.fillStyle = i ? '#8a6a3c' : '#a07c46'; g.fillRect(x + 4 + i * 4, yy, s - 8 - i * 8, 36);
        g.strokeStyle = '#3b2f1c'; g.lineWidth = 3; g.strokeRect(x + 4 + i * 4, yy, s - 8 - i * 8, 36);
        g.beginPath(); g.moveTo(x + 4 + i * 4, yy); g.lineTo(x + s - 4 - i * 4, yy + 36); g.stroke();
      }
      break;
    case 'circus':
      g.fillStyle = '#5a1530'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2 + 10, s / 2 - 4, s / 3, 0, 0, 7); g.fill();
      g.fillStyle = '#c0284a'; g.beginPath(); g.ellipse(x + s / 2, y + s / 2, s / 2 - 4, s / 3, 0, 0, 7); g.fill();
      g.strokeStyle = '#ffd568'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#ffd568'; star(g, x + s / 2, y + s / 2, 12, 5); g.fill();
      break;
    case 'canals':
      g.fillStyle = '#3d4f4c'; g.fillRect(x + 14, y + 4, s - 28, s - 10);
      g.fillStyle = '#4c625e'; g.fillRect(x + 10, y, s - 20, 12); g.fillRect(x + 10, y + s - 18, s - 20, 12);
      g.fillStyle = '#3f7a3a'; g.fillRect(x + 18, y + 12, 8, 30 + n * 20); g.fillRect(x + s - 30, y + 12, 6, 20);
      break;
    case 'house':
      g.fillStyle = '#d8d4cc'; g.beginPath(); g.moveTo(x + 8, y + s - 8); g.quadraticCurveTo(x + 4, y + 10, x + s / 2, y + 6);
      g.quadraticCurveTo(x + s - 4, y + 10, x + s - 8, y + s - 8); g.closePath(); g.fill();
      g.strokeStyle = '#a9a39a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 24, y + 20); g.lineTo(x + 20, y + s - 10); g.moveTo(x + 52, y + 18); g.lineTo(x + 58, y + s - 10); g.stroke();
      break;
    case 'forest':
      g.fillStyle = '#3a2614'; circle(g, x + s / 2, y + s / 2, s / 2 - 6); g.fill();
      g.strokeStyle = '#5a3c20'; g.lineWidth = 2;
      for (let r = 8; r < s / 2 - 8; r += 7) { circle(g, x + s / 2, y + s / 2, r); g.stroke(); }
      break;
  }
}

function star(g, x, y, r, n) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) { const a = i * Math.PI / n - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath();
}

function drawDecor(g, L, d) {
  const x = d.x, y = d.y, n = d.n;
  switch (L.id) {
    case 'factory':
      g.strokeStyle = '#8a7a9a'; g.lineWidth = 3; circle(g, x, y, 7); g.stroke();
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + n; g.fillStyle = '#8a7a9a'; g.fillRect(x + Math.cos(a) * 9 - 2, y + Math.sin(a) * 9 - 2, 4, 4); }
      break;
    case 'warehouse':
      g.fillStyle = '#6b5a3a'; for (let i = 0; i < 3; i++) g.fillRect(x - 16, y - 10 + i * 8, 32, 5);
      break;
    case 'circus':
      g.fillStyle = '#f4efe4'; for (let i = 0; i < 5; i++) { circle(g, x + (hash(x, i) - 0.5) * 20, y + (hash(y, i) - 0.5) * 14, 3); g.fill(); }
      break;
    case 'canals':
      g.fillStyle = '#1b2a29'; g.beginPath(); g.ellipse(x, y, 18, 8, 0, 0, 7); g.fill();
      g.fillStyle = '#5fbfb022'; g.beginPath(); g.ellipse(x - 3, y - 2, 10, 3, 0, 0, 7); g.fill();
      break;
    case 'house':
      g.fillStyle = '#5a1f2a'; g.fillRect(x - 22, y - 14, 44, 28); g.strokeStyle = '#c9a050'; g.lineWidth = 2; g.strokeRect(x - 19, y - 11, 38, 22);
      break;
    case 'forest':
      if (n < 0.5) { g.fillStyle = '#e8e0d0'; g.fillRect(x - 2, y - 2, 4, 8); g.fillStyle = n < 0.25 ? '#c0392b' : '#8e44ad'; g.beginPath(); g.arc(x, y - 2, 7, Math.PI, 0); g.fill(); }
      else { g.fillStyle = '#4a5a4a'; g.beginPath(); g.ellipse(x, y, 12, 8, 0, 0, 7); g.fill(); g.fillStyle = '#5f705f'; g.beginPath(); g.ellipse(x - 2, y - 2, 8, 5, 0, 0, 7); g.fill(); }
      break;
  }
}

function drawHazard(g, L, px, py, t, seed) {
  const c = L.hazard.color, n = hash(px, py);
  switch (L.id) {
    case 'factory':
      g.fillStyle = '#1e1824'; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = '#222'; g.lineWidth = 4; g.beginPath(); g.moveTo(px, py + 20); g.bezierCurveTo(px + 12, py + 8, px + 26, py + 32, px + 40, py + 18); g.stroke();
      if (Math.sin(t * 13 + n * 30) > 0.6) { g.strokeStyle = c; g.lineWidth = 2; g.beginPath(); g.moveTo(px + 20, py + 20); g.lineTo(px + 14, py + 10); g.lineTo(px + 24, py + 14); g.lineTo(px + 18, py + 4); g.stroke(); glow(g, px + 20, py + 18, 22, c, 0.4); }
      break;
    case 'warehouse':
      g.fillStyle = '#3a3a36'; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = hexA(c, 0.6 + 0.3 * Math.sin(t * 3 + n * 9));
      for (let i = 0; i < 4; i++) { const sx = px + hash(px, i) * 32 + 4, sy = py + hash(py, i) * 32 + 4; g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + 6, sy + 3); g.lineTo(sx + 1, sy + 8); g.fill(); }
      break;
    case 'circus':
      g.fillStyle = '#2a0f1a'; g.fillRect(px, py, TILE, TILE);
      glow(g, px + 20, py + 20, 26, c, 0.35 + 0.15 * Math.sin(t * 8 + n * 7));
      g.strokeStyle = c; g.lineWidth = 3; circle(g, px + 20, py + 20, 12 + Math.sin(t * 6 + n * 5) * 2); g.stroke();
      break;
    case 'canals':
      g.fillStyle = '#18401e'; g.fillRect(px, py, TILE, TILE);
      g.fillStyle = hexA(c, 0.35); g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = hexA('#b8ffb0', 0.35); g.lineWidth = 1.5; const rr = ((t * 14 + n * 40) % 18);
      g.beginPath(); g.ellipse(px + 20, py + 20, rr, rr * 0.5, 0, 0, 7); g.stroke();
      if (n < 0.3) { g.fillStyle = '#b8ffb088'; circle(g, px + 10 + n * 40, py + 12 + Math.sin(t * 3 + n) * 3, 2.5); g.fill(); }
      break;
    case 'house':
      g.fillStyle = '#1c0f24'; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = hexA(c, 0.4 + 0.4 * Math.sin(t * 2.5 + n * 6)); g.lineWidth = 2;
      g.strokeRect(px + 4, py + 4, TILE - 8, TILE - 8); g.beginPath(); g.moveTo(px + 10, py + 30); g.lineTo(px + 20, py + 10); g.lineTo(px + 30, py + 30); g.closePath(); g.stroke();
      break;
    case 'forest':
      g.fillStyle = '#140c18'; g.fillRect(px, py, TILE, TILE);
      g.strokeStyle = '#3d1f45'; g.lineWidth = 3;
      for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(px + hash(px, i) * 40, py + 40); g.quadraticCurveTo(px + 20, py + 10 + i * 6, px + hash(py, i) * 40, py); g.stroke(); }
      g.fillStyle = hexA(c, 0.5 + 0.3 * Math.sin(t * 4 + n * 5));
      for (let i = 0; i < 5; i++) { const sx = px + hash(px + i, py) * 36 + 2, sy = py + hash(px, py + i) * 36 + 2; g.beginPath(); g.moveTo(sx, sy - 5); g.lineTo(sx + 3, sy + 3); g.lineTo(sx - 3, sy + 3); g.fill(); }
      break;
  }
}

function drawGate(g, L, px, py, t) {
  g.fillStyle = '#0c0a10'; g.fillRect(px, py, TILE, TILE);
  g.fillStyle = L.pal.accent;
  for (let i = 0; i < 4; i++) g.fillRect(px + 4 + i * 10, py, 4, TILE);
  g.fillRect(px, py + 8, TILE, 4); g.fillRect(px, py + 28, TILE, 4);
  glow(g, px + 20, py + 20, 26, L.pal.accent, 0.18 + 0.1 * Math.sin(t * 4));
}

function drawPortal(g, x, y, t, color) {
  glow(g, x, y, 90, color, 0.5);
  for (let i = 0; i < 3; i++) {
    g.strokeStyle = hexA(color, 0.8 - i * 0.2); g.lineWidth = 5 - i;
    g.beginPath(); g.ellipse(x, y, 34 - i * 8, 46 - i * 10, 0, t * (2 + i) , t * (2 + i) + 4.6); g.stroke();
  }
  g.fillStyle = '#ffffffaa'; circle(g, x, y, 8 + Math.sin(t * 5) * 2); g.fill();
}

// ---------- Предмети ----------
function drawItem(g, it, t, L) {
  const c = L.item.color, y = it.y + Math.sin(t * 3 + it.x) * 4;
  glow(g, it.x, y, 38, c, 0.5);
  g.save(); g.translate(it.x, y);
  switch (L.item.shape) {
    case 'gear':
      g.rotate(t * 1.5); g.fillStyle = c;
      for (let i = 0; i < 8; i++) { g.save(); g.rotate(i * Math.PI / 4); g.fillRect(-3, -15, 6, 7); g.restore(); }
      circle(g, 0, 0, 11); g.fill(); g.fillStyle = '#5a3a10'; circle(g, 0, 0, 4); g.fill(); break;
    case 'key':
      g.rotate(Math.sin(t * 2) * 0.3); g.strokeStyle = c; g.lineWidth = 4; circle(g, -8, 0, 7); g.stroke();
      g.fillStyle = c; g.fillRect(-1, -2, 18, 4); g.fillRect(11, 0, 3, 7); g.fillRect(15, 0, 3, 5); break;
    case 'ticket':
      g.rotate(Math.sin(t * 2) * 0.15); g.fillStyle = c; rrect(g, -17, -10, 34, 20, 4); g.fill();
      g.fillStyle = '#6c2c55'; g.font = 'bold 9px sans-serif'; g.textAlign = 'center'; g.fillText('TICKET', 0, 4); break;
    case 'valve':
      g.rotate(t); g.strokeStyle = c; g.lineWidth = 4; circle(g, 0, 0, 13); g.stroke();
      g.beginPath(); g.moveTo(-13, 0); g.lineTo(13, 0); g.moveTo(0, -13); g.lineTo(0, 13); g.stroke();
      g.fillStyle = '#ddd'; circle(g, 0, 0, 4); g.fill(); break;
    case 'shard':
      g.rotate(Math.sin(t * 1.7) * 0.4); g.fillStyle = c; g.beginPath(); g.moveTo(0, -16); g.lineTo(9, -2); g.lineTo(4, 15); g.lineTo(-8, 6); g.closePath(); g.fill();
      g.fillStyle = '#ffffffaa'; g.beginPath(); g.moveTo(0, -12); g.lineTo(4, -2); g.lineTo(-2, 2); g.fill(); break;
    case 'seed':
      g.fillStyle = c; g.beginPath(); g.ellipse(0, 0, 9, 12, 0, 0, 7); g.fill();
      g.fillStyle = '#4caf50'; g.beginPath(); g.ellipse(6, -12, 7, 3, -0.6, 0, 7); g.fill();
      g.fillStyle = '#ffffffbb'; circle(g, -3, -4, 3); g.fill(); break;
  }
  g.restore();
}

function drawNote(g, n, t) {
  const y = n.y + Math.sin(t * 2 + n.x) * 2;
  glow(g, n.x, y, 30, '#fff3c4', 0.25 + 0.1 * Math.sin(t * 4));
  g.save(); g.translate(n.x, y); g.rotate(-0.1);
  g.fillStyle = '#efe2b4'; g.fillRect(-10, -13, 20, 26); g.fillStyle = '#9c8a5c';
  for (let i = 0; i < 4; i++) g.fillRect(-6, -8 + i * 5, 12, 1.5);
  g.restore();
  g.fillStyle = '#ffe680'; g.font = 'bold 14px system-ui'; g.textAlign = 'center'; g.fillText('?', n.x + 12, y - 14); g.textAlign = 'left';
}

function drawHeartPickup(g, p, t) {
  const y = p.y + Math.sin(t * 4 + p.x) * 3;
  glow(g, p.x, y, 26, '#ff4f6a', 0.4);
  heartShape(g, p.x, y, 9, '#ff4f6a');
}
function heartShape(g, x, y, s, col) {
  g.fillStyle = col; g.beginPath(); g.moveTo(x, y + s * 0.9);
  g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.4, x, y - s * 0.5);
  g.bezierCurveTo(x + s * 0.7, y - s * 1.4, x + s * 1.6, y - s * 0.2, x, y + s * 0.9); g.fill();
}

// ---------- Врагове ----------
function eyes(g, x1, x2, y, r, col) {
  glow(g, x1, y, r * 3, col, 0.5); glow(g, x2, y, r * 3, col, 0.5);
  g.fillStyle = col; circle(g, x1, y, r); g.fill(); circle(g, x2, y, r); g.fill();
}

function drawEnemy(g, e, t) {
  const s = e.r / 16, ph = e.anim;
  g.save(); g.translate(e.x, e.y);
  if (e.frozen > 0) { g.fillStyle = '#9fe8ff55'; circle(g, 0, 0, e.r + 8); g.fill(); }
  g.fillStyle = '#0006'; g.beginPath(); g.ellipse(0, e.r * 0.9, e.r, e.r * 0.32, 0, 0, 7); g.fill();
  if (e.windup > 0) { g.strokeStyle = '#ff3b3b'; g.lineWidth = 2; circle(g, 0, 0, e.r + 6 + Math.sin(t * 30) * 2); g.stroke(); }
  g.scale(e.face * s, s);
  const C = e.color, bob = Math.sin(ph * 2) * 1.5;
  switch (e.look) {
    case 'toy':
      g.fillStyle = '#333'; g.fillRect(-7, 8, 5, 8 + Math.sin(ph * 2) * 2); g.fillRect(2, 8, 5, 8 - Math.sin(ph * 2) * 2);
      g.fillStyle = C; rrect(g, -10, -6 + bob, 20, 18, 4); g.fill();
      g.fillStyle = '#ddd'; circle(g, 0, -13 + bob, 9); g.fill();
      eyes(g, -3, 4, -14 + bob, 2, '#ff3030');
      g.save(); g.translate(-12, 2 + bob); g.rotate(ph * 1.5); g.fillStyle = '#c9a43a'; g.fillRect(-1, -6, 2, 12); g.beginPath(); g.ellipse(0, -7, 4, 2.5, 0, 0, 7); g.ellipse(0, 7, 4, 2.5, 0, 0, 7); g.fill(); g.restore();
      break;
    case 'plush':
      g.fillStyle = C; circle(g, 0, 4 + bob, 13); g.fill(); circle(g, 0, -11 + bob, 11); g.fill();
      circle(g, -9, -19 + bob, 4.5); g.fill(); circle(g, 9, -19 + bob, 4.5); g.fill();
      g.fillStyle = shade(C, 0.3); g.beginPath(); g.ellipse(2, -6 + bob, 5, 4, 0, 0, 7); g.fill();
      eyes(g, -4, 5, -13 + bob, 2.2, '#ff2020');
      g.strokeStyle = '#2a1508'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-3, -5 + bob); g.lineTo(-1, -3 + bob); g.lineTo(1, -5 + bob); g.lineTo(3, -3 + bob); g.lineTo(5, -5 + bob); g.stroke();
      g.beginPath(); g.moveTo(0, -4 + bob); g.lineTo(0, 14 + bob); g.stroke();
      break;
    case 'crate': {
      const open = Math.max(0, Math.sin(ph * 1.5)) * 0.5 + (e.windup > 0 ? 0.5 : 0);
      g.fillStyle = shade(C, -0.3); g.fillRect(-15, -6, 30, 22);
      g.fillStyle = '#300'; g.fillRect(-13, -6, 26, 6);
      g.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(-12 + i * 6, -6); g.lineTo(-9 + i * 6, -1); g.lineTo(-6 + i * 6, -6); g.fill(); }
      eyes(g, -5, 5, -3, 1.6, '#ffd000');
      g.save(); g.translate(-15, -6); g.rotate(-open); g.fillStyle = C; g.fillRect(0, -10, 30, 10); g.strokeStyle = '#3b2f1c'; g.lineWidth = 1.5; g.strokeRect(0, -10, 30, 10); g.restore();
      g.strokeStyle = '#3b2f1c'; g.lineWidth = 1.5; g.strokeRect(-15, -6, 30, 22); g.beginPath(); g.moveTo(-15, 16); g.lineTo(15, 0); g.stroke();
      break;
    }
    case 'rat':
      g.strokeStyle = '#6a5060'; g.lineWidth = 2; g.beginPath(); g.moveTo(-12, 4); g.quadraticCurveTo(-24, 10 + Math.sin(ph * 3) * 6, -28, -2); g.stroke();
      g.fillStyle = C; g.beginPath(); g.ellipse(0, 4, 14, 9, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(12, 0, 8, 6, 0.2, 0, 7); g.fill();
      g.fillStyle = '#6a5060'; circle(g, 9, -6, 3.5); g.fill();
      eyes(g, 14, 14, -1, 1.6, '#ff2a2a');
      break;
    case 'clown':
      g.fillStyle = C; rrect(g, -12, 2 + bob, 24, 16, 6); g.fill();
      g.fillStyle = '#f2f2f2'; circle(g, 0, -10 + bob, 12); g.fill();
      g.fillStyle = C; circle(g, -11, -15 + bob, 6); g.fill(); circle(g, 11, -15 + bob, 6); g.fill();
      g.fillStyle = '#ff2a3a'; circle(g, 0, -8 + bob, 3.5); g.fill();
      g.fillStyle = '#2a0a1a'; circle(g, -4.5, -13 + bob, 2.2); g.fill(); circle(g, 4.5, -13 + bob, 2.2); g.fill();
      g.strokeStyle = '#c0102a'; g.lineWidth = 2; g.beginPath(); g.arc(0, -6 + bob, 7, 0.2, Math.PI - 0.2); g.stroke();
      break;
    case 'ball': {
      const by = -Math.abs(Math.sin(ph * 2)) * 8;
      g.fillStyle = C; circle(g, 0, by, 14); g.fill();
      g.fillStyle = '#ffd568'; g.fillRect(-14, by - 3, 28, 6);
      g.fillStyle = '#fff'; circle(g, -5, by - 4, 4); g.fill(); circle(g, 5, by - 4, 4); g.fill();
      g.fillStyle = '#000'; circle(g, -4, by - 4, 2); g.fill(); circle(g, 6, by - 4, 2); g.fill();
      g.strokeStyle = '#000'; g.lineWidth = 2; g.beginPath(); g.moveTo(-9, by - 10); g.lineTo(-2, by - 7); g.moveTo(9, by - 10); g.lineTo(2, by - 7); g.stroke();
      break;
    }
    case 'slime': {
      const sq = Math.sin(ph * 3) * 2;
      g.fillStyle = hexA(C, 0.9); g.beginPath(); g.moveTo(-16 - sq, 12);
      g.quadraticCurveTo(-18, -14 + sq, 0, -16 + sq); g.quadraticCurveTo(18, -14 + sq, 16 + sq, 12); g.closePath(); g.fill();
      g.fillStyle = '#ffffff44'; g.beginPath(); g.ellipse(-6, -8 + sq, 4, 6, -0.4, 0, 7); g.fill();
      g.fillStyle = '#fff'; circle(g, -4, -3, 4); g.fill(); circle(g, 6, -3, 4); g.fill();
      g.fillStyle = '#000'; circle(g, -3, -2, 2); g.fill(); circle(g, 7, -2, 2); g.fill();
      break;
    }
    case 'tentacle': {
      g.fillStyle = '#0c1514'; g.beginPath(); g.ellipse(0, 12, 14, 5, 0, 0, 7); g.fill();
      g.strokeStyle = C; g.lineCap = 'round';
      let px = 0, py = 12;
      for (let i = 1; i <= 6; i++) {
        const nx = Math.sin(ph * 1.5 + i * 0.7) * (i * 1.6), ny = 12 - i * 6;
        g.lineWidth = 12 - i * 1.4; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny;
      }
      g.lineCap = 'butt'; g.fillStyle = '#ffe14d'; circle(g, px, py, 4); g.fill(); g.fillStyle = '#000'; g.fillRect(px - 1, py - 3, 2, 6);
      break;
    }
    case 'ghost': {
      g.globalAlpha *= 0.55 + 0.25 * Math.sin(t * 5 + e.x);
      const fy = Math.sin(t * 3 + e.y) * 4;
      g.fillStyle = C; g.beginPath(); g.moveTo(-14, 14 + fy); g.lineTo(-14, -4 + fy); g.arc(0, -4 + fy, 14, Math.PI, 0);
      g.lineTo(14, 14 + fy); for (let i = 0; i < 4; i++) g.quadraticCurveTo(10.5 - i * 7, 8 + fy + (i % 2) * 10, 7 - i * 7, 14 + fy); g.fill();
      g.fillStyle = '#05050a'; g.beginPath(); g.ellipse(-5, -5 + fy, 3, 5, 0, 0, 7); g.ellipse(5, -5 + fy, 3, 5, 0, 0, 7); g.fill();
      g.beginPath(); g.ellipse(0, 5 + fy, 3, 4, 0, 0, 7); g.fill();
      break;
    }
    case 'doll':
      g.fillStyle = '#5a1f3a'; g.beginPath(); g.moveTo(-12, 16); g.lineTo(0, -2 + bob); g.lineTo(12, 16); g.fill();
      g.fillStyle = '#2a1a10'; circle(g, 0, -12 + bob, 12); g.fill();
      g.fillStyle = C; circle(g, 0, -10 + bob, 10); g.fill();
      g.fillStyle = '#000'; circle(g, -4, -11 + bob, 2.6); g.fill(); circle(g, 4, -11 + bob, 2.6); g.fill();
      g.strokeStyle = '#3a2a2a'; g.lineWidth = 1; g.beginPath(); g.moveTo(3, -19 + bob); g.lineTo(1, -14 + bob); g.lineTo(5, -10 + bob); g.lineTo(3, -5 + bob); g.stroke();
      g.fillStyle = '#a0203a'; g.fillRect(-3, -4 + bob, 6, 1.5);
      break;
    case 'mirror':
      g.fillStyle = '#c9a050'; g.beginPath(); g.ellipse(0, -2, 14, 19, 0, 0, 7); g.fill();
      g.fillStyle = C; g.beginPath(); g.ellipse(0, -2, 11, 16, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff55'; g.beginPath(); g.ellipse(-4, -8, 3, 7, 0.3, 0, 7); g.fill();
      g.fillStyle = '#10142a'; circle(g, 0, -6, 5); g.fill(); g.fillRect(-5, -1, 10, 10);
      eyes(g, -2, 2, -7, 1.2, '#ff3060');
      break;
    case 'root':
      g.strokeStyle = shade(C, -0.2); g.lineWidth = 4; g.lineCap = 'round';
      for (let i = 0; i < 4; i++) { const a = -0.4 + i * 0.4 + Math.PI / 2, wv = Math.sin(ph * 3 + i) * 0.3; g.beginPath(); g.moveTo(0, 6); g.quadraticCurveTo(Math.cos(a + wv) * 12, 10, Math.cos(a) * 16 - 8 + i * 4, 18); g.stroke(); }
      g.lineCap = 'butt'; g.fillStyle = C; g.beginPath(); g.moveTo(-12, 10); g.quadraticCurveTo(-14, -14, -2, -20 + bob); g.quadraticCurveTo(12, -16, 12, 10); g.closePath(); g.fill();
      g.strokeStyle = shade(C, 0.25); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-6, 6); g.quadraticCurveTo(-8, -8, -2, -16); g.stroke();
      eyes(g, -4, 4, -6 + bob, 2.2, '#9dff4a');
      break;
    case 'wolf':
      g.fillStyle = C; g.fillRect(-12, 6, 4, 10 + Math.sin(ph * 3) * 3); g.fillRect(8, 6, 4, 10 - Math.sin(ph * 3) * 3);
      g.beginPath(); g.ellipse(-2, 4, 16, 9, 0, 0, 7); g.fill();
      g.beginPath(); g.moveTo(-16, 2); g.quadraticCurveTo(-26, -8, -22, -12); g.lineTo(-14, 0); g.fill();
      g.beginPath(); g.ellipse(13, -4, 9, 7, -0.2, 0, 7); g.fill();
      g.beginPath(); g.moveTo(8, -9); g.lineTo(10, -18); g.lineTo(14, -9); g.moveTo(14, -9); g.lineTo(18, -16); g.lineTo(19, -6); g.fill();
      g.beginPath(); g.moveTo(18, -4); g.lineTo(26, -1); g.lineTo(18, 2); g.fill();
      eyes(g, 14, 17, -5, 1.6, '#5fe8ff');
      break;
    case 'spore': {
      const pf = 1 + Math.sin(ph * 2) * 0.05;
      g.fillStyle = '#e8e0d0'; g.fillRect(-6, -2, 12, 18);
      g.fillStyle = C; g.beginPath(); g.ellipse(0, -4, 17 * pf, 12 * pf, 0, Math.PI, 0); g.fill();
      g.fillStyle = '#f6e6ff'; circle(g, -7, -9, 2.5); g.fill(); circle(g, 4, -12, 2); g.fill(); circle(g, 9, -6, 2); g.fill();
      eyes(g, -3, 3, 4, 1.5, '#ff3060');
      break;
    }
  }
  g.restore();
  if (e.flash > 0) { g.fillStyle = `rgba(255,255,255,${e.flash * 2.5})`; circle(g, e.x, e.y, e.r + 2); g.fill(); }
  if (e.hp < e.max) {
    g.fillStyle = '#000a'; g.fillRect(e.x - 16, e.y - e.r - 14, 32, 5);
    g.fillStyle = '#ff4f6a'; g.fillRect(e.x - 15, e.y - e.r - 13, 30 * Math.max(0, e.hp / e.max), 3);
  }
}

// ---------- Босове ----------
function drawBoss(g, b, t) {
  const s = b.r / 40, C = b.color;
  g.save(); g.translate(b.x, b.y);
  g.fillStyle = '#0008'; g.beginPath(); g.ellipse(0, b.r * 0.95, b.r * 1.1, b.r * 0.3, 0, 0, 7); g.fill();
  glow(g, 0, 0, b.r * 2.2, C, b.phase === 2 ? 0.35 : 0.18);
  if (b.windup > 0) { g.strokeStyle = '#ff3b3b'; g.lineWidth = 3; circle(g, 0, 0, b.r + 10 + Math.sin(t * 30) * 3); g.stroke(); }
  g.scale(s, s);
  const bob = Math.sin(t * 2) * 3;
  switch (b.look) {
    case 'puppet': {
      g.strokeStyle = '#ddd8'; g.lineWidth = 1;
      [-26, -12, 12, 26].forEach((x, i) => { g.beginPath(); g.moveTo(x * 1.5, -120); g.lineTo(x, -10 + Math.sin(t * 3 + i) * 6); g.stroke(); });
      g.fillStyle = '#5a3a20'; g.fillRect(-40, -122, 80, 8);
      g.fillStyle = '#b07a48'; g.fillRect(-12, 20, 8, 22 + Math.sin(t * 3) * 4); g.fillRect(4, 20, 8, 22 - Math.sin(t * 3) * 4);
      g.fillStyle = C; rrect(g, -18, -6 + bob, 36, 30, 6); g.fill();
      g.fillStyle = '#ffd568'; g.fillRect(-18, 4 + bob, 36, 4);
      g.fillStyle = '#b07a48'; g.save(); g.translate(-20, -2 + bob); g.rotate(Math.sin(t * 3) * 0.6 + 0.3); g.fillRect(-4, 0, 7, 28); g.restore();
      g.save(); g.translate(20, -2 + bob); g.rotate(-Math.sin(t * 3 + 1) * 0.6 - 0.3); g.fillRect(-3, 0, 7, 28); g.restore();
      g.fillStyle = '#d9a46c'; circle(g, 0, -24 + bob, 20); g.fill();
      g.fillStyle = '#e86a6a'; circle(g, -11, -18 + bob, 4); g.fill(); circle(g, 11, -18 + bob, 4); g.fill();
      eyes(g, -7, 7, -27 + bob, 4, b.phase === 2 ? '#ff2020' : '#1a0a00');
      g.strokeStyle = '#3a1a0a'; g.lineWidth = 2; g.beginPath(); g.moveTo(-8, -14 + bob); g.lineTo(-8, -6 + bob); g.moveTo(8, -14 + bob); g.lineTo(8, -6 + bob); g.moveTo(-8, -14 + bob); g.lineTo(8, -14 + bob); g.stroke();
      g.fillStyle = '#3a1a0a'; g.beginPath(); g.moveTo(-16, -40 + bob); g.lineTo(-10, -52 + bob); g.lineTo(-2, -42 + bob); g.lineTo(6, -54 + bob); g.lineTo(16, -40 + bob); g.fill();
      break;
    }
    case 'golem':
      g.fillStyle = '#7a5a30'; g.fillRect(-36, 0 + bob, 20, 34); g.fillRect(16, 0 + bob, 20, 34);
      [[-26, -12, 52, 40], [-20, 26, 18, 18], [2, 26, 18, 18]].forEach(([x, y, w, h]) => {
        g.fillStyle = C; g.fillRect(x, y + bob, w, h); g.strokeStyle = '#3b2f1c'; g.lineWidth = 3; g.strokeRect(x, y + bob, w, h);
        g.beginPath(); g.moveTo(x, y + bob); g.lineTo(x + w, y + h + bob); g.stroke();
      });
      g.save(); g.translate(-44, -2 + bob); g.rotate(Math.sin(t * 2) * 0.3); g.fillStyle = C; g.fillRect(-10, -6, 20, 36); g.strokeStyle = '#3b2f1c'; g.strokeRect(-10, -6, 20, 36); g.restore();
      g.save(); g.translate(44, -2 + bob); g.rotate(-Math.sin(t * 2) * 0.3); g.fillStyle = C; g.fillRect(-10, -6, 20, 36); g.strokeStyle = '#3b2f1c'; g.strokeRect(-10, -6, 20, 36); g.restore();
      g.fillStyle = shade(C, -0.2); g.fillRect(-16, -40 + bob, 32, 28); g.strokeStyle = '#3b2f1c'; g.strokeRect(-16, -40 + bob, 32, 28);
      g.fillStyle = '#100'; g.fillRect(-12, -30 + bob, 24, 8);
      eyes(g, -6, 6, -26 + bob, 3, b.phase === 2 ? '#ff3020' : '#ffd000');
      break;
    case 'ringmaster':
      g.fillStyle = '#222'; g.fillRect(-14, 24, 10, 20); g.fillRect(4, 24, 10, 20);
      g.fillStyle = C; rrect(g, -24, -6 + bob, 48, 36, 10); g.fill();
      g.fillStyle = '#ffd568'; for (let i = 0; i < 3; i++) { circle(g, 0, 2 + i * 9 + bob, 2.5); g.fill(); }
      g.strokeStyle = '#ffd568'; g.lineWidth = 3; g.beginPath(); g.moveTo(28, 40); g.lineTo(34, -10 + bob); g.stroke(); g.fillStyle = '#fff'; circle(g, 34, -12 + bob, 5); g.fill();
      g.fillStyle = '#f2f2f2'; circle(g, 0, -24 + bob, 22); g.fill();
      g.fillStyle = '#e84161'; circle(g, -20, -32 + bob, 10); g.fill(); circle(g, 20, -32 + bob, 10); g.fill();
      g.fillStyle = '#ff2a3a'; circle(g, 0, -20 + bob, 5); g.fill();
      eyes(g, -8, 8, -28 + bob, 3.5, b.phase === 2 ? '#ff0040' : '#35152b');
      g.strokeStyle = '#c0102a'; g.lineWidth = 3; g.beginPath(); g.arc(0, -16 + bob, 13, 0.15, Math.PI - 0.15); g.stroke();
      g.fillStyle = '#1a1a1a'; g.fillRect(-16, -62 + bob, 32, 18); g.fillRect(-24, -46 + bob, 48, 5);
      g.fillStyle = '#c0284a'; g.fillRect(-16, -50 + bob, 32, 4);
      break;
    case 'slimeking': {
      const sq = Math.sin(t * 3) * 4;
      g.fillStyle = hexA(C, 0.92); g.beginPath(); g.moveTo(-44 - sq, 34);
      g.quadraticCurveTo(-50, -30 + sq, 0, -38 + sq); g.quadraticCurveTo(50, -30 + sq, 44 + sq, 34); g.closePath(); g.fill();
      g.fillStyle = '#ffffff33'; g.beginPath(); g.ellipse(-18, -16 + sq, 8, 14, -0.4, 0, 7); g.fill();
      [[-14, -6, 7], [12, -10, 9], [0, 10, 5], [24, 8, 4], [-26, 12, 4]].forEach(([x, y, r]) => { g.fillStyle = '#fff'; circle(g, x, y + sq * 0.5, r); g.fill(); g.fillStyle = b.phase === 2 ? '#b00' : '#000'; circle(g, x + 1, y + 1 + sq * 0.5, r * 0.5); g.fill(); });
      g.fillStyle = '#ffd568'; g.beginPath(); g.moveTo(-18, -34 + sq); g.lineTo(-18, -50 + sq); g.lineTo(-9, -42 + sq); g.lineTo(0, -54 + sq); g.lineTo(9, -42 + sq); g.lineTo(18, -50 + sq); g.lineTo(18, -34 + sq); g.fill();
      break;
    }
    case 'mask':
      for (let i = 0; i < 5; i++) { const a = t * 1.2 + i * Math.PI * 2 / 5; g.fillStyle = '#bfeaffaa'; g.save(); g.translate(Math.cos(a) * 56, Math.sin(a) * 40); g.rotate(a); g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 0); g.lineTo(0, 9); g.lineTo(-5, 0); g.fill(); g.restore(); }
      g.fillStyle = '#2a1040'; g.beginPath(); g.moveTo(-30, 0 + bob); g.quadraticCurveTo(0, 70 + bob, 30, 0 + bob); g.fill();
      g.fillStyle = '#f2ecff'; g.beginPath(); g.ellipse(0, -10 + bob, 30, 36, 0, Math.PI / 2, Math.PI * 1.5); g.fill();
      g.fillStyle = C; g.beginPath(); g.ellipse(0, -10 + bob, 30, 36, 0, -Math.PI / 2, Math.PI / 2); g.fill();
      g.fillStyle = '#05000a'; g.beginPath(); g.ellipse(-12, -18 + bob, 7, 4, 0.3, 0, 7); g.ellipse(12, -18 + bob, 7, 4, -0.3, 0, 7); g.fill();
      eyes(g, -12, 12, -18 + bob, 2.5, '#ff40c0');
      g.strokeStyle = '#05000a'; g.lineWidth = 3; g.beginPath(); g.arc(0, 2 + bob, 14, b.phase === 2 ? Math.PI + 0.3 : 0.3, b.phase === 2 ? -0.3 : Math.PI - 0.3); g.stroke();
      break;
    case 'heart': {
      g.strokeStyle = '#2a1608'; g.lineCap = 'round';
      for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2 + 0.3, wv = Math.sin(t * 2 + i) * 0.15; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 10); g.quadraticCurveTo(Math.cos(a + wv) * 40, 10 + Math.sin(a + wv) * 26, Math.cos(a) * 70, 14 + Math.sin(a) * 40); g.stroke(); }
      g.lineCap = 'butt';
      g.fillStyle = '#1e120a'; g.beginPath(); g.moveTo(-30, 30); g.quadraticCurveTo(-40, -40, -10, -70); g.lineTo(10, -70); g.quadraticCurveTo(40, -40, 30, 30); g.closePath(); g.fill();
      g.strokeStyle = '#3a2410'; g.lineWidth = 3;
      for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(-20 + i * 12, 26); g.quadraticCurveTo(-24 + i * 14, -20, -8 + i * 6, -64); g.stroke(); }
      g.strokeStyle = '#140a04'; g.lineWidth = 5;
      [[-10, -68, -34, -96], [10, -68, 30, -100], [0, -70, 0, -104], [-20, -50, -50, -70], [20, -50, 48, -74]].forEach(([a, b2, c, d]) => { g.beginPath(); g.moveTo(a, b2); g.lineTo(c, d); g.stroke(); });
      const pulse = 1 + Math.sin(t * (b.phase === 2 ? 9 : 5)) * 0.12;
      glow(g, 0, -14, 50 * pulse, '#ff2a55', 0.7);
      g.save(); g.translate(0, -14); g.scale(pulse, pulse); heartShape(g, 0, 0, 16, '#ff2a55'); g.restore();
      g.fillStyle = '#ffb0c0'; circle(g, -5, -20, 3); g.fill();
      break;
    }
  }
  g.restore();
  if (b.flash > 0) { g.fillStyle = `rgba(255,255,255,${b.flash * 2})`; circle(g, b.x, b.y, b.r); g.fill(); }
}
