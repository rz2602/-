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
