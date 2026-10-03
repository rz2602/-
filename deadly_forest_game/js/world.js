'use strict';
// ===================== Генериране на ниво =====================
// Плочки: 0 под, 1 стена, 2 опасност (проходима), 3 порта (затворена), 4 препятствие

function RNG(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const GRID_CX = 4, GRID_CY = 3, CELL_TW = 15, CELL_TH = 13;

function buildLevel(li, diff) {
  const L = LEVELS[li];
  const rnd = RNG(((Date.now() & 0xffffff) ^ (li * 2654435761)) >>> 0);
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

  const w = GRID_CX * CELL_TW, h = GRID_CY * CELL_TH;
  const grid = new Uint8Array(w * h).fill(1);
  const setT = (x, y, v) => { if (x > 0 && y > 0 && x < w - 1 && y < h - 1) grid[y * w + x] = v; };
  const getT = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 1 : grid[y * w + x];

  // --- Стаи: по една във всяка клетка ---
  const rooms = [];
  for (let cy = 0; cy < GRID_CY; cy++) for (let cx = 0; cx < GRID_CX; cx++) {
    const rw = ri(8, 12), rh = ri(7, 10);
    const rx = cx * CELL_TW + ri(1, CELL_TW - rw - 1), ry = cy * CELL_TH + ri(1, CELL_TH - rh - 1);
    rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + (rw >> 1), cy: ry + (rh >> 1), gx: cx, gy: cy, i: rooms.length, seen: false });
    for (let y = ry; y < ry + rh; y++) for (let x = rx; x < rx + rw; x++) setT(x, y, 0);
  }
  const idx = (cx, cy) => cy * GRID_CX + cx;
  const neigh = i => {
    const r = rooms[i], out = [];
    if (r.gx > 0) out.push(idx(r.gx - 1, r.gy)); if (r.gx < GRID_CX - 1) out.push(idx(r.gx + 1, r.gy));
    if (r.gy > 0) out.push(idx(r.gx, r.gy - 1)); if (r.gy < GRID_CY - 1) out.push(idx(r.gx, r.gy + 1));
    return out;
  };

  // --- Лабиринт между клетките (DFS) ---
  const startI = idx(0, ri(0, GRID_CY - 1));
  const visited = new Set([startI]), edges = [], stack = [startI];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const opts = neigh(cur).filter(n => !visited.has(n));
    if (!opts.length) { stack.pop(); continue; }
    const n = pick(opts); visited.add(n); edges.push([cur, n]); stack.push(n);
  }
  // Най-далечната стая е на боса
  const adj = rooms.map(() => []);
  edges.forEach(([a, b]) => { adj[a].push(b); adj[b].push(a); });
  const dist = rooms.map(() => -1); dist[startI] = 0; const q = [startI];
  while (q.length) { const c = q.shift(); adj[c].forEach(n => { if (dist[n] < 0) { dist[n] = dist[c] + 1; q.push(n); } }); }
  let bossI = 0; dist.forEach((d, i) => { if (d > dist[bossI]) bossI = i; });
  // Боса има само един вход – правим стаята му по-голяма
  const br = rooms[bossI];
  {
    const cx0 = br.gx * CELL_TW, cy0 = br.gy * CELL_TH;
    for (let y = br.y; y < br.y + br.h; y++) for (let x = br.x; x < br.x + br.w; x++) setT(x, y, 1);
    br.w = CELL_TW - 3; br.h = CELL_TH - 3; br.x = cx0 + 1 + (CELL_TW - 2 - br.w >> 1); br.y = cy0 + 1 + (CELL_TH - 2 - br.h >> 1);
    br.cx = br.x + (br.w >> 1); br.cy = br.y + (br.h >> 1);
    for (let y = br.y; y < br.y + br.h; y++) for (let x = br.x; x < br.x + br.w; x++) setT(x, y, 0);
  }
  // Допълнителни връзки (кръгове), без стаята на боса
  const has = (a, b) => edges.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const extra = [];
  rooms.forEach((r, i) => neigh(i).forEach(n => { if (n > i && i !== bossI && n !== bossI && !has(i, n)) extra.push([i, n]); }));
  shuffle(extra).slice(0, ri(2, 3)).forEach(e => edges.push(e));

  // --- Коридори (широки 3 плочки) ---
  const carveH = (x1, x2, y) => { for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) for (let d = -1; d <= 1; d++) setT(x, y + d, 0); };
  const carveV = (y1, y2, x) => { for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let d = -1; d <= 1; d++) setT(x + d, y, 0); };
  edges.forEach(([a, b]) => {
    let A = rooms[a], B = rooms[b];
    if (b === bossI) { A = rooms[b]; B = rooms[a]; }
    if (A.gy === B.gy) { carveH(A.cx, B.cx, A.cy); carveV(A.cy, B.cy, B.cx); }
    else { carveV(A.cy, B.cy, A.cx); carveH(A.cx, B.cx, B.cy); }
  });

  // --- Порта пред стаята на боса ---
  const gates = [];
  for (let y = br.y - 1; y <= br.y + br.h; y++) for (let x = br.x - 1; x <= br.x + br.w; x++) {
    const ring = x === br.x - 1 || x === br.x + br.w || y === br.y - 1 || y === br.y + br.h;
    if (ring && getT(x, y) === 0) { grid[y * w + x] = 3; gates.push({ x, y }); }
  }

  const startRoom = rooms[startI];
  const normalRooms = rooms.filter(r => r !== startRoom && r !== br);

  // --- Препятствия 2x2 в стаите ---
  const props = [];
  normalRooms.forEach(r => {
    const n = ri(0, 2);
    for (let k = 0, tries = 0; k < n && tries < 20; tries++) {
      const px = ri(r.x + 2, r.x + r.w - 4), py = ri(r.y + 2, r.y + r.h - 4);
      let ok = true;
      for (let y = py - 1; y <= py + 2 && ok; y++) for (let x = px - 1; x <= px + 2; x++) if (getT(x, y) !== 0) { ok = false; break; }
      if (!ok) continue;
      for (let y = py; y <= py + 1; y++) for (let x = px; x <= px + 1; x++) grid[y * w + x] = 4;
      props.push({ x: px, y: py }); k++;
    }
  });

  // --- Опасни зони ---
  const hazards = [];
  const hzRooms = normalRooms.slice();
  for (let k = 0; k < L.hazard.patches; k++) {
    const r = pick(hzRooms);
    const pw = ri(2, 3), ph = ri(2, 3);
    const px = ri(r.x + 1, r.x + r.w - 1 - pw), py = ri(r.y + 1, r.y + r.h - 1 - ph);
    for (let y = py; y < py + ph; y++) for (let x = px; x < px + pw; x++) if (getT(x, y) === 0) { grid[y * w + x] = 2; hazards.push({ x, y }); }
  }

  // --- Свободни места ---
  const taken = [];
  const free = (r, margin = 1) => {
    for (let t = 0; t < 60; t++) {
      const x = ri(r.x + margin, r.x + r.w - 1 - margin), y = ri(r.y + margin, r.y + r.h - 1 - margin);
      if (getT(x, y) !== 0) continue;
      const px = x * TILE + TILE / 2, py = y * TILE + TILE / 2;
      if (taken.some(p => Math.hypot(p.x - px, p.y - py) < 60)) continue;
      const p = { x: px, y: py }; taken.push(p); return p;
    }
    const p = { x: r.cx * TILE + TILE / 2, y: r.cy * TILE + TILE / 2 }; return p;
  };
  const start = { x: startRoom.cx * TILE + TILE / 2, y: startRoom.cy * TILE + TILE / 2 };
  taken.push(start);

  const itemRooms = shuffle(normalRooms.slice());
  const items = [];
  for (let k = 0; k < L.item.count; k++) { const p = free(itemRooms[k % itemRooms.length]); items.push({ x: p.x, y: p.y, got: false }); }
  const noteRooms = shuffle(normalRooms.slice());
  const notes = L.notes.map((n, k) => { const p = free(noteRooms[k % noteRooms.length]); return { x: p.x, y: p.y, got: false, title: n.title, text: n.text }; });
  const hearts = [];
  for (let k = 0; k < 3; k++) { const p = free(pick(normalRooms)); hearts.push({ x: p.x, y: p.y, got: false, amt: 1 }); }

  // --- Врагове ---
  const enemies = [];
  const wsum = L.roster.reduce((s, r) => s + r[1], 0);
  const pickEnemy = () => { let r = rnd() * wsum; for (const [id, wt] of L.roster) { r -= wt; if (r <= 0) return id; } return L.roster[0][0]; };
  normalRooms.forEach(r => {
    const n = Math.max(1, Math.round((L.roomEnemies + rnd() * 1.5) * diff.count));
    for (let k = 0; k < n; k++) { const p = free(r); enemies.push(makeEnemy(pickEnemy(), p.x, p.y, li, diff)); }
  });
  // Мимиците се правят на сандъци из стаите
  const mimicRooms = shuffle(normalRooms.slice());
  for (let k = 0; k < L.mimics; k++) { const p = free(mimicRooms[k % mimicRooms.length]); enemies.push(makeEnemy('mimic', p.x, p.y, li, diff)); }

  // --- Декорация ---
  const decor = [];
  rooms.forEach(r => {
    for (let k = 0; k < 4; k++) {
      const x = ri(r.x, r.x + r.w - 1), y = ri(r.y, r.y + r.h - 1);
      if (getT(x, y) === 0) decor.push({ x: x * TILE + ri(8, 32), y: y * TILE + ri(8, 32), n: rnd() });
    }
  });

  const boss = makeBoss(L.boss, br.cx * TILE + TILE / 2, br.cy * TILE + TILE / 2, diff);

  const lv = {
    L, li, w, h, grid, rooms, startRoom, bossRoom: br, gates, gateOpen: false, arenaLocked: false,
    items, notes, hearts, enemies, boss, decor, props, hazards, start, portal: null, zones: [], corpses: [], bossObjs: [], orbs: [], lightsOut: false, flashT: 0,
    flow: new Int16Array(w * h), flowT: 0, rnd,
  };
  lv.mapCanvas = renderMap(lv);
  lv.minimap = renderMinimap(lv);
  return lv;
}

function renderMinimap(lv) {
  const S = 3, c = document.createElement('canvas'); c.width = lv.w * S; c.height = lv.h * S;
  const g = c.getContext('2d');
  for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
    const t = lv.grid[y * lv.w + x];
    if (t === 1) continue;
    g.fillStyle = t === 2 ? hexA(lv.L.hazard.color, 0.7) : t === 3 ? lv.L.pal.accent : t === 4 ? '#ffffff30' : '#ffffff90';
    g.fillRect(x * S, y * S, S, S);
  }
  return c;
}
