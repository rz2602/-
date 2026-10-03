'use strict';
// ===================== Смъртоносната гора — основна логика =====================

const cv = document.getElementById('game'), ctx = cv.getContext('2d');
let VW = 1280, VH = 720;
const $ = id => document.getElementById(id);

// ---------- Запис ----------
const SAVE_KEY = 'smartonosnata_gora_v1';
const SAVE_DEFAULT = { unlocked: 0, hero: 0, skin: 0, diff: 1, cleared: {}, finished: false, mute: false, started: false };
let save = loadSave();
function loadSave() {
  try { return Object.assign({}, SAVE_DEFAULT, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); }
  catch (e) { return Object.assign({}, SAVE_DEFAULT); }
}
function writeSave() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* без запис */ } }

// ---------- Спрайтове на героите (+ скинове) ----------
const FILTER_OK = (() => { try { const c = document.createElement('canvas').getContext('2d'); c.filter = 'blur(2px)'; return c.filter === 'blur(2px)'; } catch (e) { return false; } })();
const atlas = new Image();
let atlasReady = false;
atlas.onload = () => { atlasReady = true; };
atlas.src = 'assets/heroes.png';
const sheetCache = {};
function heroSheet(hi, si) {
  const key = hi + '_' + si;
  if (sheetCache[key]) return sheetCache[key];
  if (!atlasReady) return null;
  const H = HEROES[hi], sk = H.skins[si] || H.skins[0];
  const c = document.createElement('canvas'); c.width = CELL_W * 10; c.height = CELL_H;
  const g = c.getContext('2d');
  if (FILTER_OK && sk.filter !== 'none') g.filter = sk.filter;
  g.drawImage(atlas, 0, H.row * CELL_H, CELL_W * 10, CELL_H, 0, 0, CELL_W * 10, CELL_H);
  g.filter = 'none';
  if (!FILTER_OK && sk.tint) { g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.4; g.fillStyle = sk.tint; g.fillRect(0, 0, c.width, c.height); }
  sheetCache[key] = c; return c;
}
function drawHeroFrame(g, hi, si, frame, x, y, scale, flip, alpha = 1) {
  const sh = heroSheet(hi, si); if (!sh) return;
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1); g.globalAlpha = alpha;
  g.drawImage(sh, frame * CELL_W, 0, CELL_W, CELL_H, -ANCHOR_X * scale, -(CELL_H - 2) * scale, CELL_W * scale, CELL_H * scale);
  g.restore();
}

// ---------- Звук (WebAudio синтезатор) ----------
const AU = { ctx: null, master: null, music: null, bellT: 0 };
function audioInit() {
  if (AU.ctx) { if (AU.ctx.state === 'suspended') AU.ctx.resume(); return; }
  try {
    AU.ctx = new (window.AudioContext || window.webkitAudioContext)();
    AU.master = AU.ctx.createGain(); AU.master.gain.value = save.mute ? 0 : 0.5; AU.master.connect(AU.ctx.destination);
  } catch (e) { AU.ctx = null; }
}
const SFX = {
  shot: [880, 260, 0.08, 'square', 0.05], hit: [220, 90, 0.08, 'sawtooth', 0.08], hurt: [180, 50, 0.3, 'sawtooth', 0.18],
  pickup: [600, 1400, 0.18, 'triangle', 0.15], note: [400, 900, 0.35, 'sine', 0.12], ability: [260, 1000, 0.35, 'triangle', 0.15],
  boom: [140, 30, 0.5, 'sawtooth', 0.22], gate: [180, 420, 0.7, 'square', 0.08], die: [320, 50, 0.25, 'square', 0.07],
  melee: [320, 110, 0.1, 'triangle', 0.15], win: [523, 1046, 0.9, 'triangle', 0.15], ebullet: [500, 300, 0.06, 'sine', 0.03],
};
function sfx(name) {
  if (!AU.ctx || save.mute) return;
  const a = AU.ctx, t = a.currentTime, [f1, f2, d, wave, vol] = SFX[name];
  const o = a.createOscillator(), gn = a.createGain();
  o.type = wave; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + d);
  gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.001, t + d);
  o.connect(gn); gn.connect(AU.master); o.start(t); o.stop(t + d + 0.02);
}
const MUSIC_BASE = [110, 98, 123.47, 82.41, 92.5, 73.42];
function startMusic(li) {
  stopMusic(); if (!AU.ctx) return;
  const a = AU.ctx, base = MUSIC_BASE[li] || 98;
  const out = a.createGain(); out.gain.value = 0.05; out.connect(AU.master);
  const filt = a.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 380; filt.connect(out);
  const oscs = [base, base * 1.498, base * 0.5].map((f, i) => { const o = a.createOscillator(); o.type = i === 2 ? 'sine' : 'sawtooth'; o.frequency.value = f; o.detune.value = (i - 1) * 6; o.connect(filt); o.start(); return o; });
  const lfo = a.createOscillator(), lg = a.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 180; lfo.connect(lg); lg.connect(filt.frequency); lfo.start();
  AU.music = { out, filt, oscs: [...oscs, lfo], base };
}
function stopMusic() {
  if (!AU.music) return;
  const m = AU.music; AU.music = null;
  try { m.out.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.3); setTimeout(() => m.oscs.forEach(o => { try { o.stop(); } catch (e) { } }), 1200); } catch (e) { }
}
function musicTick(dt, intense) {
  if (!AU.music || save.mute) return;
  AU.bellT -= dt;
  if (AU.bellT > 0) return;
  AU.bellT = intense ? 0.28 : 0.9 + Math.random() * 0.9;
  const scale = [0, 3, 5, 7, 10, 12, 15], a = AU.ctx, t = a.currentTime;
  const f = AU.music.base * 4 * Math.pow(2, scale[Math.floor(Math.random() * scale.length)] / 12);
  const o = a.createOscillator(), g = a.createGain(); o.type = intense ? 'square' : 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(intense ? 0.025 : 0.04, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + 1.25);
}
function setMute(m) {
  save.mute = m; writeSave();
  if (AU.master) AU.master.gain.value = m ? 0 : 0.5;
  document.querySelectorAll('.muteBtn').forEach(b => b.textContent = m ? '🔇 Звук: изкл.' : '🔊 Звук: вкл.');
}

// ---------- Вход ----------
const keys = {};
const mouse = { x: VW / 2, y: VH / 2, down: false, right: false, last: -10 };
const touch = { active: false, mx: 0, my: 0, atk: false, ab: false, id: null };
let T = 0;

addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) && state === 'play') e.preventDefault();
  if (state === 'play') {
    if (e.code === 'KeyE') interact();
    if (e.code === 'Escape' || e.code === 'KeyP') pauseGame();
  } else if (state === 'paused' && (e.code === 'Escape' || e.code === 'KeyP')) resumeGame();
  else if (state === 'note' && (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Escape' || e.code === 'Space')) { e.preventDefault(); closeNote(); }
  if (e.code === 'KeyM') setMute(!save.mute);
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.down = mouse.right = false; });
function toCanvas(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * VW, y: (e.clientY - r.top) / r.height * VH }; }
cv.addEventListener('mousemove', e => { const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; mouse.last = T; });
cv.addEventListener('mousedown', e => { audioInit(); const p = toCanvas(e); mouse.x = p.x; mouse.y = p.y; mouse.last = T; if (e.button === 0) mouse.down = true; if (e.button === 2) mouse.right = true; });
addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; if (e.button === 2) mouse.right = false; });
cv.addEventListener('contextmenu', e => e.preventDefault());

// Сензорно управление
const stick = $('stick'), knob = $('knob');
function showTouch() { $('touch').classList.remove('hidden'); document.body.classList.add('touchMode'); }
const IS_TOUCH = (() => { try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; } })();
if (IS_TOUCH) showTouch();
// На телефон показваме по-малка част от света, за да са героите и надписите по-едри
function setRes(w, h) {
  if (VW === w && VH === h) return;
  VW = w; VH = h; cv.width = w; cv.height = h; lightC.width = w; lightC.height = h; resize();
}
function goFullscreen() {
  try {
    const el = document.documentElement, req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req || document.fullscreenElement || document.webkitFullscreenElement) return;
    const p = req.call(el);
    const lock = () => { try { const o = screen.orientation; if (o && o.lock) o.lock('landscape').catch(() => { }); } catch (e) { } };
    if (p && p.then) p.then(lock).catch(() => { }); else lock();
  } catch (e) { }
}
addEventListener('touchstart', () => { if (!document.body.classList.contains('touchMode')) showTouch(); }, { passive: true });
stick.addEventListener('pointerdown', e => { e.preventDefault(); touch.id = e.pointerId; stick.setPointerCapture(e.pointerId); moveStick(e); });
stick.addEventListener('pointermove', e => { if (touch.id === e.pointerId) moveStick(e); });
const endStick = e => { if (touch.id !== e.pointerId) return; touch.id = null; touch.active = false; touch.mx = touch.my = 0; knob.style.transform = 'translate(-50%,-50%)'; };
stick.addEventListener('pointerup', endStick); stick.addEventListener('pointercancel', endStick);
function moveStick(e) {
  const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  let dx = e.clientX - cx, dy = e.clientY - cy; const m = Math.hypot(dx, dy), max = r.width * 0.38;
  if (m > max) { dx = dx / m * max; dy = dy / m * max; }
  touch.active = m > 8; touch.mx = dx / max; touch.my = dy / max;
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
}
const holdBtn = (el, prop) => {
  el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); touch[prop] = true; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => el.addEventListener(ev, () => { touch[prop] = false; }));
};
holdBtn($('tAtk'), 'atk'); holdBtn($('tAb'), 'ab');
$('tE').addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play') interact(); else if (state === 'note') closeNote(); });
$('tPause').addEventListener('pointerdown', e => { e.preventDefault(); if (state === 'play') pauseGame(); });

// ---------- Размер на екрана ----------
function resize() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  cv.style.width = VW * s + 'px'; cv.style.height = VH * s + 'px';
}
addEventListener('resize', resize); resize();

// ---------- Състояние ----------
let state = 'title';
let lv = null, P = null, DIFF = DIFFICULTIES[1];
let cam = { x: 0, y: 0 }, shake = 0;
let shots = [], bullets = [], parts = [], floaters = [], msgs = [];
let stats = { kills: 0, time: 0, secrets: 0, got: 0 };
let lightC = document.createElement('canvas'); lightC.width = VW; lightC.height = VH;
const lightG = lightC.getContext('2d');

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('show', s.id === id));
}

// ---------- Ниво ----------
function startLevel(li) {
  audioInit();
  DIFF = DIFFICULTIES[save.diff] || DIFFICULTIES[1];
  setRes(...(document.body.classList.contains('touchMode') ? [960, 540] : [1280, 720]));
  if (document.body.classList.contains('touchMode')) goFullscreen();
  lv = buildLevel(li, DIFF);
  const H = HEROES[save.hero];
  P = {
    x: lv.start.x, y: lv.start.y, r: 14, hi: save.hero, H, si: save.skin, hp: H.hp, max: H.hp,
    cd: 0, acd: 0, inv: 1.5, face: 1, aim: 0, moving: false, anim: 0, atkT: 0, shield: 0, shadow: 0, dash: 0, dashDir: 0, dashHit: new Set(), hazT: 0,
  };
  shots = []; bullets = []; parts = []; floaters = []; msgs = [];
  stats = { kills: 0, time: 0, secrets: 0, got: 0 };
  lv.startRoom.seen = true;
  cam.x = P.x - VW / 2; cam.y = P.y - VH / 2;
  state = 'play'; showScreen(null);
  startMusic(li);
  say(`${lv.L.icon} ${lv.L.name}`, 3);
  say(`Събери ${lv.L.item.count} × ${lv.L.item.name}`, 3.5);
}

function say(text, dur = 2.5, color = '#fff') { msgs.push({ text, t: dur, max: dur, color }); if (msgs.length > 4) msgs.shift(); }

function tileAt(x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) ? 1 : lv.grid[ty * lv.w + tx]; }
function solidT(tx, ty) { if (tx < 0 || ty < 0 || tx >= lv.w || ty >= lv.h) return true; const t = lv.grid[ty * lv.w + tx]; return t === 1 || t === 3 || t === 4; }
function blocked(x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE), y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (!solidT(tx, ty)) continue;
    const nx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE)), ny = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
    if ((x - nx) ** 2 + (y - ny) ** 2 < r * r) return true;
  }
  return false;
}
function moveCircle(o, dx, dy) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
  let hit = false;
  for (let i = 0; i < steps; i++) {
    const sx = dx / steps, sy = dy / steps;
    if (sx) { if (!blocked(o.x + sx, o.y, o.r)) o.x += sx; else hit = true; }
    if (sy) { if (!blocked(o.x, o.y + sy, o.r)) o.y += sy; else hit = true; }
  }
  return !hit;
}
function los(x1, y1, x2, y2) {
  const d = Math.hypot(x2 - x1, y2 - y1), n = Math.ceil(d / 16);
  for (let i = 1; i < n; i++) { const x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; if (solidT(Math.floor(x / TILE), Math.floor(y / TILE))) return false; }
  return true;
}
function roomAt(x, y) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); return lv.rooms.find(r => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h); }

function computeFlow() {
  const { w, h, flow } = lv; flow.fill(32767);
  const sx = Math.floor(P.x / TILE), sy = Math.floor(P.y / TILE);
  if (solidT(sx, sy)) return;
  const q = new Int32Array(w * h); let qh = 0, qt = 0;
  flow[sy * w + sx] = 0; q[qt++] = sy * w + sx;
  while (qh < qt) {
    const c = q[qh++], cx = c % w, cy = (c / w) | 0, d = flow[c] + 1;
    if (d > 40) continue;
    if (cx > 0 && !solidT(cx - 1, cy) && flow[c - 1] > d) { flow[c - 1] = d; q[qt++] = c - 1; }
    if (cx < w - 1 && !solidT(cx + 1, cy) && flow[c + 1] > d) { flow[c + 1] = d; q[qt++] = c + 1; }
    if (cy > 0 && !solidT(cx, cy - 1) && flow[c - w] > d) { flow[c - w] = d; q[qt++] = c - w; }
    if (cy < h - 1 && !solidT(cx, cy + 1) && flow[c + w] > d) { flow[c + w] = d; q[qt++] = c + w; }
  }
}
function flowDir(e) {
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (d < TILE * 2.2 && los(e.x, e.y, P.x, P.y)) return [dx / d, dy / d];
  const tx = Math.floor(e.x / TILE), ty = Math.floor(e.y / TILE), w = lv.w;
  let best = lv.flow[ty * w + tx], bx = 0, by = 0, found = false;
  for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
    if (!ox && !oy) continue;
    const nx = tx + ox, ny = ty + oy;
    if (solidT(nx, ny)) continue;
    if (ox && oy && (solidT(tx + ox, ty) || solidT(tx, ty + oy))) continue;
    const v = lv.flow[ny * w + nx];
    if (v < best) { best = v; bx = nx; by = ny; found = true; }
  }
  if (!found) return [dx / d, dy / d];
  const gx = bx * TILE + TILE / 2 - e.x, gy = by * TILE + TILE / 2 - e.y, gd = Math.hypot(gx, gy) || 1;
  return [gx / gd, gy / gd];
}

// ---------- Ефекти ----------
function burst(x, y, color, n = 12, speed = 160, life = 0.5, size = 3) {
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random() * 0.7); parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: life * (0.6 + Math.random() * 0.4), max: life, color, size }); }
}
function ring(x, y, color, r, life = 0.4) { parts.push({ type: 'ring', x, y, r, color, life, max: life }); }
function floater(x, y, text, color) { floaters.push({ x, y, text, color, t: 0.9 }); }

// ---------- Играч ----------
function aimAngle() {
  if (T - mouse.last < 2.5 && !document.body.classList.contains('touchMode')) {
    return Math.atan2(mouse.y + cam.y - (P.y - 6), mouse.x + cam.x - P.x);
  }
  let best = null, bd = 420;
  const cands = lv.enemies.filter(e => !e.dead && e.active && !e.hidden);
  if (lv.boss.active && !lv.boss.dead && bossVulnerable(lv.boss)) cands.push(lv.boss);
  cands.forEach(e => { const d = Math.hypot(e.x - P.x, e.y - P.y); if (d < bd && los(P.x, P.y, e.x, e.y)) { bd = d; best = e; } });
  if (best) return Math.atan2(best.y - P.y, best.x - P.x);
  return P.aim;
}

function playerDamage(base) { return base * (P.shadow > 0 ? 2 : 1); }

function doAttack() {
  const A = P.H.attack, a = aimAngle();
  P.aim = a; P.cd = A.cd; P.atkT = 0.3; P.face = Math.cos(a) < 0 ? -1 : 1;
  if (A.type === 'shot') {
    shots.push({ x: P.x + Math.cos(a) * 24, y: P.y - 6 + Math.sin(a) * 24, vx: Math.cos(a) * A.speed, vy: Math.sin(a) * A.speed, dmg: playerDamage(A.dmg), color: A.color, size: A.size, life: A.life, pierce: !!A.pierce, slow: A.slow || 0, splash: A.splash || 0, hit: new Set() });
    sfx('shot');
  } else {
    parts.push({ type: 'slash', x: P.x, y: P.y - 6, a, range: A.range, arc: A.arc, color: A.color, life: 0.18, max: 0.18 });
    sfx('melee');
    const targets = lv.enemies.filter(e => !e.dead);
    if (lv.boss.active && !lv.boss.dead) targets.push(lv.boss);
    targets.forEach(e => {
      const dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy);
      if (d > A.range + e.r) return;
      let da = Math.atan2(dy, dx) - a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) > A.arc / 2 && d > e.r + 10) return;
      hitTarget(e, playerDamage(A.dmg), dx / (d || 1) * A.knock, dy / (d || 1) * A.knock);
    });
  }
}

function doAbility() {
  const ab = P.H.ability; P.acd = ab.cd; sfx('ability');
  switch (ab.id) {
    case 'shield': P.shield = 3; say('Енергиен щит!', 1.5, P.H.color); break;
    case 'freeze':
      ring(P.x, P.y, '#bff4ff', 260, 0.6); burst(P.x, P.y, '#dff8ff', 40, 300, 0.7, 4);
      lv.enemies.forEach(e => { if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < 260) { e.frozen = 2.5; hitTarget(e, playerDamage(1), 0, 0); } });
      if (lv.boss.active && !lv.boss.dead && Math.hypot(lv.boss.x - P.x, lv.boss.y - P.y) < 300) { lv.boss.frozen = 1.2; hitTarget(lv.boss, playerDamage(2), 0, 0); }
      bullets = bullets.filter(b => Math.hypot(b.x - P.x, b.y - P.y) > 260);
      break;
    case 'repair': {
      const h = Math.min(P.max - P.hp, 2); P.hp += h; floater(P.x, P.y - 40, '+' + h + ' ❤', '#7dff9a'); burst(P.x, P.y, '#7dff9a', 20, 120, 0.6);
      break;
    }
    case 'dash': P.dash = 0.24; P.dashDir = aimAngle(); P.aim = P.dashDir; P.dashHit = new Set(); P.atkT = 0.3; P.face = Math.cos(P.dashDir) < 0 ? -1 : 1; break;
    case 'blink': {
      const a = aimAngle(); P.aim = a;
      ring(P.x, P.y, '#c77dff', 90, 0.4); burst(P.x, P.y, '#c77dff', 24, 220, 0.5);
      aoe(P.x, P.y, 95, playerDamage(3));
      let dist = 210;
      while (dist > 0 && (blocked(P.x + Math.cos(a) * dist, P.y + Math.sin(a) * dist, P.r) || !los(P.x, P.y, P.x + Math.cos(a) * dist, P.y + Math.sin(a) * dist))) dist -= 10;
      P.x += Math.cos(a) * dist; P.y += Math.sin(a) * dist; P.inv = Math.max(P.inv, 0.4);
      ring(P.x, P.y, '#c77dff', 90, 0.4); burst(P.x, P.y, '#e3b8ff', 24, 220, 0.5);
      aoe(P.x, P.y, 95, playerDamage(2));
      break;
    }
    case 'shadow': P.shadow = 3; burst(P.x, P.y, '#222', 30, 150, 0.6, 5); say('Сянка: невидим и двойни щети!', 1.6, '#ffb13b'); break;
  }
}
function aoe(x, y, r, dmg) {
  const t = lv.enemies.filter(e => !e.dead); if (lv.boss.active && !lv.boss.dead) t.push(lv.boss);
  t.forEach(e => { const d = Math.hypot(e.x - x, e.y - y); if (d < r + e.r) hitTarget(e, dmg, (e.x - x) / (d || 1) * 150, (e.y - y) / (d || 1) * 150); });
}

function hitTarget(e, dmg, kx, ky) {
  if (e.dead) return;
  const isBoss = e === lv.boss;
  if (isBoss) {
    if (!bossVulnerable(e)) { if (Math.random() < 0.3) floater(e.x, e.y - e.h * 0.6, e.submerged ? 'Под водата!' : '✖', '#cfd8dc'); return; }
    dmg *= bossDmgMul(e);
  } else dmg *= enemyOnHit(e);
  e.hp -= dmg; e.flash = 0.15;
  e.kbx += kx * (isBoss ? 0.12 : 1); e.kby += ky * (isBoss ? 0.12 : 1);
  floater(e.x + (Math.random() - 0.5) * 16, e.y - e.r - 20, Math.round(dmg * 10) / 10, '#ffe680');
  burst(e.x, e.y, e.color, 6, 120, 0.3);
  sfx('hit');
  if (isBoss) { checkBossPhase(); if (e.hp <= 0) { e.hp = 0; if (e.id === 'heart') checkBossPhase(); else killBoss(); } return; }
  if (e.hp <= 0) killEnemy(e);
}

function hurt(amount, src) {
  if (P.inv > 0 || P.dash > 0 || P.shield > 0 || state !== 'play') return;
  amount *= DIFF.dmg;
  P.hp = Math.max(0, P.hp - amount); P.inv = 1.0; shake = Math.max(shake, 0.3);
  floater(P.x, P.y - 40, '-' + amount, '#ff4f6a'); burst(P.x, P.y, '#ff4f6a', 14, 160, 0.4); sfx('hurt');
  if (P.hp <= 0) gameOver(src);
}

function interact() {
  if (interactBossObj()) return;
  for (const n of lv.notes) {
    if (!n.got && Math.hypot(n.x - P.x, n.y - P.y) < 60) {
      n.got = true; stats.secrets++; sfx('note');
      $('noteTitle').textContent = n.title; $('noteText').textContent = n.text;
      $('noteCount').textContent = `Тайна ${stats.secrets}/${lv.notes.length}`;
      state = 'note'; showScreen('sNote'); return;
    }
  }
}
function closeNote() { if (state !== 'note') return; state = 'play'; showScreen(null); }

// ---------- Обновяване ----------
function update(dt) {
  T += dt;
  if (state === 'ending') { updateEnding(dt); return; }
  if (state !== 'play') return;
  stats.time += dt;
  const L = lv.L, H = P.H;
  P.cd -= dt; P.acd -= dt; P.inv -= dt; P.atkT -= dt; P.shield -= dt; P.shadow -= dt; shake = Math.max(0, shake - dt);

  // Движение
  let mx = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
  let my = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
  if (touch.active) { mx = touch.mx; my = touch.my; }
  const ml = Math.hypot(mx, my);
  if (ml > 1) { mx /= ml; my /= ml; }
  if (P.dash > 0) {
    P.dash -= dt;
    moveCircle(P, Math.cos(P.dashDir) * 950 * dt, Math.sin(P.dashDir) * 950 * dt);
    burst(P.x, P.y, '#ff6a2c', 2, 60, 0.3, 4);
    const tg = lv.enemies.filter(e => !e.dead); if (lv.boss.active && !lv.boss.dead) tg.push(lv.boss);
    tg.forEach(e => { if (!P.dashHit.has(e) && Math.hypot(e.x - P.x, e.y - P.y) < e.r + 30) { P.dashHit.add(e); hitTarget(e, playerDamage(5), Math.cos(P.dashDir) * 300, Math.sin(P.dashDir) * 300); shake = 0.15; } });
  } else {
    const onHaz = tileAt(P.x, P.y) === 2;
    const sp = H.speed * (onHaz ? 0.8 : 1) * (P.shadow > 0 ? 1.15 : 1);
    P.moving = ml > 0.1;
    if (P.moving) { moveCircle(P, mx * sp * dt, my * sp * dt); P.anim += dt * (sp / 200); if (Math.abs(mx) > 0.2 && P.atkT <= 0) P.face = mx < 0 ? -1 : 1; P.aim = Math.atan2(my, mx); }
  }
  if (P.atkT > 0 && P.H.attack.type === 'shot') P.face = Math.cos(P.aim) < 0 ? -1 : 1;

  // Атака / умение
  if ((keys.Space || keys.KeyJ || mouse.down || touch.atk) && P.cd <= 0) doAttack();
  const abKey = keys.KeyQ || keys.KeyK || keys.ShiftLeft || keys.ShiftRight || mouse.right || touch.ab;
  if (abKey && lv.boss.st === 'exposed' && Math.hypot(lv.boss.x - P.x, lv.boss.y - P.y) < lv.boss.r + 90) startCleanse();
  else if (abKey && P.acd <= 0) doAbility();
  lv.flashT -= dt;

  // Опасни плочки
  if (tileAt(P.x, P.y) === 2) { P.hazT += dt; if (P.hazT > 0.15) hurt(1, L.hazard.name); } else P.hazT = 0;

  // Предмети
  lv.items.forEach(it => {
    if (it.got || Math.hypot(it.x - P.x, it.y - P.y) > 30) return;
    it.got = true; stats.got++; sfx('pickup'); burst(it.x, it.y, L.item.color, 26, 200, 0.7);
    say(`${L.item.name}: ${stats.got}/${L.item.count}`, 2.5, L.item.color);
    if (stats.got >= L.item.count) openGate();
  });
  lv.hearts.forEach(hp => {
    if (hp.got || P.hp >= P.max || Math.hypot(hp.x - P.x, hp.y - P.y) > 28) return;
    hp.got = true; P.hp = Math.min(P.max, P.hp + hp.amt); sfx('pickup'); floater(P.x, P.y - 40, '+1 ❤', '#ff8fa0');
  });

  // Стаи и арена
  const room = roomAt(P.x, P.y);
  if (room) room.seen = true;
  const B = lv.boss, br = lv.bossRoom;
  if (!B.active && !B.dead && room === br) {
    const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
    if (tx > br.x && tx < br.x + br.w - 1 && ty > br.y && ty < br.y + br.h - 1) {
      activateBoss(B);
    }
  }

  // Враговете
  lv.flowT -= dt; if (lv.flowT <= 0) { lv.flowT = 0.25; computeFlow(); }
  lv.enemies.forEach(e => { if (!e.dead) updateEnemy(e, dt); });
  for (let i = 0; i < lv.enemies.length; i++) {
    const a = lv.enemies[i]; if (a.dead || !a.active || a.hidden || a.st === 'node' || a.st === 'decoy') continue;
    for (let j = i + 1; j < lv.enemies.length; j++) {
      const b = lv.enemies[j]; if (b.dead || !b.active || b.hidden || b.st === 'node' || b.st === 'decoy') continue;
      const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy), m = a.r + b.r;
      if (d < m && d > 0.01) { const p = (m - d) / 2; moveCircle(a, -dx / d * p, -dy / d * p); moveCircle(b, dx / d * p, dy / d * p); }
    }
  }
  if ((B.active && !B.dead) || B.st === 'cleansing') updateBoss(B, dt);
  if (lv.enemies.length > 120) lv.enemies = lv.enemies.filter(e => !e.dead);

  updateZones(dt);

  // Снаряди на играча
  shots.forEach(s => {
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (solidT(Math.floor(s.x / TILE), Math.floor(s.y / TILE))) { s.life = 0; explodeShot(s); return; }
    const tg = lv.enemies.filter(e => !e.dead); if (B.active && !B.dead) tg.push(B);
    for (const e of tg) {
      if (s.hit.has(e) || Math.hypot(e.x - s.x, e.y - s.y) > e.r + s.size) continue;
      s.hit.add(e); hitTarget(e, s.dmg, s.vx * 0.25, s.vy * 0.25);
      if (s.slow) { e.slow = s.slow; }
      if (!s.pierce) { s.life = 0; explodeShot(s); break; }
    }
  });
  shots = shots.filter(s => s.life > 0);

  // Вражески снаряди
  bullets.forEach(b => {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (solidT(Math.floor(b.x / TILE), Math.floor(b.y / TILE))) { b.life = 0; burst(b.x, b.y, b.color, 4, 80, 0.2); return; }
    if (Math.hypot(b.x - P.x, b.y - P.y) < b.r + P.r) {
      if (P.shield > 0) {
        b.life = 0;
        shots.push({ x: b.x, y: b.y, vx: -b.vx * 1.4, vy: -b.vy * 1.4, dmg: 2, color: '#5fd4ff', size: 6, life: 1, pierce: false, slow: 0, splash: 0, hit: new Set() });
      } else { b.life = 0; hurt(1, b.src); }
    }
  });
  bullets = bullets.filter(b => b.life > 0);

  // Частици
  parts.forEach(p => { p.life -= dt; if (p.vx !== undefined) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; } });
  parts = parts.filter(p => p.life > 0);
  floaters.forEach(f => { f.t -= dt; f.y -= 40 * dt; }); floaters = floaters.filter(f => f.t > 0);
  msgs.forEach(m => m.t -= dt); msgs = msgs.filter(m => m.t > 0);

  // Портал
  if (lv.portal && Math.hypot(lv.portal.x - P.x, lv.portal.y - P.y) < 42) levelComplete();
  musicTick(dt, B.active && !B.dead);
}

function explodeShot(s) {
  burst(s.x, s.y, s.color, 8, 140, 0.3);
  if (s.splash) { ring(s.x, s.y, s.color, s.splash, 0.3); aoe(s.x, s.y, s.splash, s.dmg * 0.6); }
}

function enemyBullet(x, y, a, speed, color, src, r = 7) {
  bullets.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r, color, life: 4, src });
  if (bullets.length % 4 === 0) sfx('ebullet');
}

function openGate() {
  if (lv.gateOpen) return;
  lv.gateOpen = true; sfx('gate'); shake = 0.3;
  lv.gates.forEach(g => { lv.grid[g.y * lv.w + g.x] = 0; burst(g.x * TILE + 20, g.y * TILE + 20, lv.L.pal.accent, 6, 120, 0.6); });
  say('Портата към боса се отвори! Виж картата горе вдясно.', 4, lv.L.pal.accent);
}

// ---------- Край на ниво / игра ----------
function levelComplete() {
  if (state !== 'play') return;
  state = 'levelDone'; stopMusic(); sfx('win');
  const li = lv.li, prev = save.cleared[li] || { secrets: 0 };
  save.cleared[li] = { secrets: Math.max(prev.secrets, stats.secrets), time: Math.round(stats.time) };
  save.unlocked = Math.max(save.unlocked, Math.min(LEVELS.length - 1, li + 1));
  writeSave();
  $('doneTitle').textContent = `${lv.L.icon} ${lv.L.name} е освободен${li === 5 ? 'а' : li === 4 ? 'а' : ''}!`;
  $('doneText').textContent = lv.L.outro;
  const mm = Math.floor(stats.time / 60), ss = String(Math.floor(stats.time % 60)).padStart(2, '0');
  $('doneStats').innerHTML = `<div><b>${stats.kills}</b><span>победени чудовища</span></div><div><b>${stats.secrets}/${lv.notes.length}</b><span>открити тайни</span></div><div><b>${mm}:${ss}</b><span>време</span></div>`;
  $('doneNext').textContent = li === LEVELS.length - 1 ? 'Към финала ✨' : `Напред: ${LEVELS[li + 1].icon} ${LEVELS[li + 1].name}`;
  showScreen('sDone');
}
function gameOver(src) {
  state = 'over'; stopMusic(); sfx('boom');
  $('overText').textContent = `${P.H.name} падна в битката${src ? ' (' + src + ')' : ''}. Но експедицията не се отказва!`;
  setTimeout(() => showScreen('sOver'), 600);
}
function pauseGame() { if (state !== 'play') return; state = 'paused'; showScreen('sPause'); }
function resumeGame() { state = 'play'; showScreen(null); mouse.down = false; }

// ---------- Рисуване ----------
let renderDt = 0, renderLast = 0;
function render() {
  const now = performance.now(); renderDt = state === 'play' ? Math.min(0.05, (now - renderLast) / 1000) : 0; renderLast = now;
  if (state === 'ending') { renderEnding(); return; }
  if (!lv) { renderMenuBg(); return; }
  const L = lv.L;
  const mw = lv.w * TILE, mh = lv.h * TILE;
  const tx = Math.max(0, Math.min(mw - VW, P.x - VW / 2)), ty = Math.max(0, Math.min(mh - VH, P.y - VH / 2));
  cam.x += (tx - cam.x) * 0.15; cam.y += (ty - cam.y) * 0.15;
  cam.x = Math.max(0, Math.min(mw - VW, cam.x)); cam.y = Math.max(0, Math.min(mh - VH, cam.y));
  const cx = Math.round(cam.x), cy = Math.round(cam.y);
  const sx = shake > 0 ? (Math.random() - 0.5) * 12 * Math.min(1, shake * 2) : 0, sy = shake > 0 ? (Math.random() - 0.5) * 12 * Math.min(1, shake * 2) : 0;

  ctx.fillStyle = L.pal.bg; ctx.fillRect(0, 0, VW, VH);
  ctx.save(); ctx.translate(-cx + sx, -cy + sy);
  ctx.drawImage(lv.mapCanvas, cx, cy, VW, VH, cx, cy, VW, VH);
  const inView = (x, y, m = 60) => x > cx - m && x < cx + VW + m && y > cy - m && y < cy + VH + m;
  lv.hazards.forEach(h => { if (inView(h.x * TILE, h.y * TILE)) drawHazard(ctx, L, h.x * TILE, h.y * TILE, T); });
  if (!lv.gateOpen || lv.arenaLocked) lv.gates.forEach(g => drawGate(ctx, L, g.x * TILE, g.y * TILE, T));
  if (lv.portal) drawPortal(ctx, lv.portal.x, lv.portal.y, T, L.pal.accent);
  drawZones(ctx);
  drawBossObjs(ctx, T);
  lv.items.forEach(it => { if (!it.got && inView(it.x, it.y)) drawItem(ctx, it, T, L); });
  lv.notes.forEach(n => { if (!n.got && inView(n.x, n.y)) drawNote(ctx, n, T); });
  lv.hearts.forEach(h => { if (!h.got && inView(h.x, h.y)) drawHeartPickup(ctx, h, T); });

  // Обекти, сортирани по Y
  const ents = [];
  lv.enemies.forEach(e => { if (!e.dead && inView(e.x, e.y)) ents.push({ y: e.y, f: () => drawEnemy(ctx, e, T) }); });
  if ((!lv.boss.dead || lv.boss.cleansed) && inView(lv.boss.x, lv.boss.y, 260)) ents.push({ y: lv.boss.y, f: () => drawBossSprite(ctx, lv.boss, T) });
  ents.push({ y: -1e9, f: () => drawCorpses(ctx, renderDt) });
  ents.push({ y: P.y, f: drawPlayer });
  ents.sort((a, b) => a.y - b.y).forEach(e => e.f());

  shots.forEach(s => {
    glow(ctx, s.x, s.y, s.size * 3.5, s.color, 0.6);
    ctx.fillStyle = '#fff'; circle(ctx, s.x, s.y, s.size * 0.55); ctx.fill();
    ctx.strokeStyle = s.color; ctx.lineWidth = s.size * 0.8; ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.03, s.y - s.vy * 0.03); ctx.stroke();
  });
  bullets.forEach(b => { glow(ctx, b.x, b.y, b.r * 2.6, b.color, 0.55); ctx.fillStyle = b.color; circle(ctx, b.x, b.y, b.r * 0.75); ctx.fill(); ctx.fillStyle = '#fff'; circle(ctx, b.x, b.y, b.r * 0.35); ctx.fill(); });
  parts.forEach(p => {
    const a = Math.max(0, p.life / p.max);
    if (p.type === 'ring') { ctx.strokeStyle = hexA(p.color, a); ctx.lineWidth = 4; circle(ctx, p.x, p.y, p.r * (1 - a * 0.7)); ctx.stroke(); }
    else if (p.type === 'slash') {
      ctx.strokeStyle = hexA(p.color, a); ctx.lineWidth = 10 * a + 2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.range * (1.1 - a * 0.3), p.a - p.arc / 2, p.a + p.arc / 2); ctx.stroke();
      ctx.strokeStyle = hexA('#ffffff', a * 0.8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, p.range * (1.0 - a * 0.3), p.a - p.arc / 3, p.a + p.arc / 3); ctx.stroke(); ctx.lineCap = 'butt';
    } else { ctx.fillStyle = hexA(p.color, a); ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); }
  });
  // подсказки
  lv.notes.forEach(n => { if (!n.got && Math.hypot(n.x - P.x, n.y - P.y) < 60) tag(ctx, document.body.classList.contains('touchMode') ? 'E — прочети' : '[E] Прочети', n.x, n.y - 34); });
  const tm = document.body.classList.contains('touchMode');
  lv.bossObjs.forEach(o => { if ((o.type === 'panel' || o.type === 'valve') && Math.hypot(o.x - P.x, o.y - P.y) < 70) tag(ctx, `${tm ? 'E —' : '[E]'} ${o.type === 'panel' ? 'Контролен панел' : 'Завърти вентила'}`, o.x, o.y - 40); });
  if (!lv.gateOpen && lv.gates.length && Math.hypot(lv.gates[0].x * TILE - P.x, lv.gates[0].y * TILE - P.y) < 140) tag(ctx, `Нужни са ${L.item.count} × ${L.item.name}`, lv.gates[0].x * TILE + 20, lv.gates[0].y * TILE - 16);
  floaters.forEach(f => { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.font = '900 16px Rubik,system-ui'; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = '#000'; ctx.strokeText(f.text, f.x, f.y); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y); ctx.globalAlpha = 1; });
  ctx.textAlign = 'left';
  ctx.restore();

  renderDarkness(cx - sx, cy - sy);
  if (lv.flashT > 0) { ctx.fillStyle = `rgba(214,168,255,${lv.flashT * 1.6})`; ctx.fillRect(0, 0, VW, VH); }
  renderHUD();
}

function tag(g, text, x, y) {
  g.font = '700 13px Rubik,system-ui'; const w = g.measureText(text).width + 16;
  g.fillStyle = '#000b'; rrect(g, x - w / 2, y - 14, w, 22, 8); g.fill();
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(text, x, y + 2); g.textAlign = 'left';
}

function drawPlayer() {
  const H = P.H, F = H.frames;
  let fr;
  if (P.atkT > 0 || P.dash > 0) fr = F.attack[Math.min(2, Math.floor((0.3 - Math.max(0, P.atkT)) / 0.1))];
  else if (P.moving) fr = F.walk[Math.floor(P.anim * 9) % F.walk.length];
  else fr = F.idle[0];
  let alpha = 1;
  if (P.shadow > 0) alpha = 0.35;
  else if (P.inv > 0 && Math.floor(P.inv * 14) % 2) alpha = 0.45;
  const bob = !P.moving && P.atkT <= 0 ? Math.sin(T * 3) * 1.2 : 0;
  ctx.fillStyle = '#0007'; ctx.beginPath(); ctx.ellipse(P.x, P.y + 18, 18, 6, 0, 0, 7); ctx.fill();
  if (P.shield > 0) { glow(ctx, P.x, P.y - 8, 52, '#5fd4ff', 0.35); ctx.strokeStyle = `rgba(140,230,255,${0.6 + 0.3 * Math.sin(T * 12)})`; ctx.lineWidth = 3; circle(ctx, P.x, P.y - 8, 36); ctx.stroke(); }
  if (atlasReady) drawHeroFrame(ctx, P.hi, P.si, fr, P.x, P.y + 20 + bob, 0.72, P.face < 0, alpha);
  else { ctx.fillStyle = H.color; circle(ctx, P.x, P.y, 14); ctx.fill(); }
}

function renderDarkness(cx, cy) {
  const dark = lv.lightsOut ? 0.9 : lv.L.dark; if (dark <= 0) return;
  const g = lightG;
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, VW, VH);
  g.fillStyle = `rgba(0,0,0,${dark})`; g.fillRect(0, 0, VW, VH);
  g.globalCompositeOperation = 'destination-out';
  const light = (x, y, r, a = 1) => {
    x -= cx; y -= cy; if (x < -r || y < -r || x > VW + r || y > VH + r) return;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.6, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  };
  light(P.x, P.y, 290 + Math.sin(T * 7) * 4);
  lv.items.forEach(it => { if (!it.got) light(it.x, it.y, 90, 0.8); });
  lv.notes.forEach(n => { if (!n.got) light(n.x, n.y, 60, 0.6); });
  if (lv.portal) light(lv.portal.x, lv.portal.y, 200);
  if (lv.boss.active && !lv.lightsOut) light(lv.boss.x, lv.boss.y, 170, 0.7);
  if (lv.lightsOut) { const c = bossCenter(); for (let i = 0; i < 3; i++) { const a = T * (0.5 + i * 0.17) + i * 2.1; light(c.x + Math.cos(a) * 200, c.y + Math.sin(a * 1.3) * 130, 120, 0.95); } }
  lv.orbs.forEach(o => { if (o.x !== undefined) light(o.x, o.y, 50, 0.7); });
  lv.zones.forEach(z => { if (z.kind === 'circle' && z.t > 0) light(z.x, z.y, z.r + 20, 0.5); });
  lv.bossObjs.forEach(o => light(o.x, o.y, 70, 0.6));
  shots.forEach(s => light(s.x, s.y, 60, 0.6));
  bullets.slice(0, 40).forEach(b => light(b.x, b.y, 36, 0.5));
  if (!lv.gateOpen || lv.arenaLocked) lv.gates.forEach((gt, i) => { if (i % 2 === 0) light(gt.x * TILE + 20, gt.y * TILE + 20, 70, 0.5); });
  g.globalCompositeOperation = 'source-over';
  ctx.drawImage(lightC, 0, 0);
  if (lv.L.id === 'forest' || lv.L.id === 'canals') {
    const col = lv.L.id === 'forest' ? '90,140,90' : '80,140,120';
    for (let i = 0; i < 5; i++) {
      const fx = ((i * 397 + T * (12 + i * 4)) % (VW + 600)) - 300, fy = 120 + i * 130 + Math.sin(T * 0.3 + i) * 40;
      const gr = ctx.createRadialGradient(fx, fy, 0, fx, fy, 260); gr.addColorStop(0, `rgba(${col},0.08)`); gr.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = gr; ctx.fillRect(fx - 260, fy - 260, 520, 520);
    }
  }
}

function renderHUD() {
  const L = lv.L, H = P.H;
  // Панел с героя
  ctx.fillStyle = '#05090cd0'; rrect(ctx, 14, 14, 300, 92, 16); ctx.fill();
  ctx.strokeStyle = hexA(H.color, 0.5); ctx.lineWidth = 2; ctx.stroke();
  ctx.save(); ctx.beginPath(); ctx.rect(20, 18, 70, 84); ctx.clip();
  if (atlasReady) drawHeroFrame(ctx, P.hi, P.si, H.frames.idle[0], 52, 100, 0.66, false);
  ctx.restore();
  ctx.fillStyle = '#fff'; ctx.font = '800 15px Rubik,system-ui'; ctx.fillText(H.name, 92, 36);
  for (let i = 0; i < P.max; i++) {
    const x = 102 + i * 22, y = 56, fill = Math.max(0, Math.min(1, P.hp - i));
    heartShape(ctx, x, y, 8, '#3a1d24');
    if (fill > 0) { ctx.save(); ctx.beginPath(); ctx.rect(x - 14, y - 14, 28 * fill, 28); ctx.clip(); heartShape(ctx, x, y, 8, '#ff4f6a'); ctx.restore(); }
  }
  // умение
  const ab = H.ability, ready = P.acd <= 0, pct = ready ? 1 : 1 - P.acd / ab.cd;
  ctx.fillStyle = '#ffffff18'; rrect(ctx, 92, 74, 210, 22, 8); ctx.fill();
  ctx.fillStyle = ready ? hexA(H.color, 0.85) : hexA(H.color, 0.35); rrect(ctx, 92, 74, 210 * pct, 22, 8); ctx.fill();
  ctx.fillStyle = ready ? '#081014' : '#fff'; ctx.font = '700 12px Rubik,system-ui';
  ctx.fillText(`${document.body.classList.contains('touchMode') ? '✦' : '[Q]'} ${ab.name}${ready ? '' : ' ' + Math.ceil(P.acd) + 'с'}`, 100, 89);

  // Цел
  const B = lv.boss;
  let obj;
  if (stats.got < L.item.count) obj = `🎯 Събери ${L.item.plural.toLowerCase()}: ${stats.got}/${L.item.count}`;
  else if (!B.dead && !B.active && B.st !== 'cleansing') obj = `🎯 Портата е отворена — намери ${B.name}`;
  else if (B.id === 'heart' && B.st === 'corrupt') obj = `✨ ПРЕЧИСТИ СЪРЦЕТО: възли ${lv.enemies.filter(e => e.id === 'node' && !e.dead).length}/4`;
  else if (B.id === 'heart' && B.st === 'exposed') obj = `✨ Използвай умението си до Сърцето!`;
  else if (B.st === 'cleansing') obj = '✨ Сърцето се пречиства…';
  else if (!B.dead) obj = `⚔ Победи ${B.name}!`;
  else obj = '✨ Влез в портала';
  ctx.font = '800 16px Rubik,system-ui'; const ow = ctx.measureText(obj).width + 30;
  ctx.fillStyle = '#05090cd0'; rrect(ctx, VW / 2 - ow / 2, 14, ow, 34, 14); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(obj, VW / 2, 37);
  ctx.font = '700 12px Rubik,system-ui'; ctx.fillStyle = '#ffffffaa'; ctx.fillText(`Ниво ${lv.li + 1}: ${L.name} · ${DIFF.name}`, VW / 2, 64);

  // Миникарта
  const S = 3, mmw = lv.w * S, mmh = lv.h * S, mx = VW - mmw - 18, my = 14;
  ctx.fillStyle = '#05090cd8'; rrect(ctx, mx - 6, my - 6 + 0, mmw + 12, mmh + 34, 12); ctx.fill();
  lv.rooms.forEach(r => {
    if (!r.seen) return;
    const x0 = r.gx * CELL_TW * S, y0 = r.gy * CELL_TH * S;
    ctx.drawImage(lv.minimap, x0, y0, CELL_TW * S, CELL_TH * S, mx + x0, my + y0, CELL_TW * S, CELL_TH * S);
  });
  if (lv.bossRoom.seen || lv.gateOpen) { ctx.fillStyle = B.dead ? '#7dff9a' : '#ff4f6a'; ctx.font = '12px system-ui'; ctx.fillText(B.dead ? '✓' : '☠', mx + lv.bossRoom.cx * S, my + lv.bossRoom.cy * S + 4); }
  lv.items.forEach(it => { if (!it.got && roomAt(it.x, it.y)?.seen) { ctx.fillStyle = L.item.color; ctx.fillRect(mx + it.x / TILE * S - 2, my + it.y / TILE * S - 2, 4, 4); } });
  ctx.fillStyle = '#fff'; circle(ctx, mx + P.x / TILE * S, my + P.y / TILE * S, 3); ctx.fill();
  ctx.textAlign = 'left'; ctx.font = '700 12px Rubik,system-ui'; ctx.fillStyle = '#ffe680';
  ctx.fillText(`🔎 Тайни: ${stats.secrets}/${lv.notes.length}`, mx, my + mmh + 20);
  ctx.fillStyle = '#ffffffaa'; ctx.fillText(`☠ ${stats.kills}`, mx + mmw - 40, my + mmh + 20);

  // Бос
  if (B.active && !B.dead && B.intro > 0) {
    const k = Math.min(1, (2.2 - B.intro) * 3, B.intro * 3);
    ctx.globalAlpha = Math.max(0, k); ctx.fillStyle = '#000b'; ctx.fillRect(0, VH / 2 - 80, VW, 150);
    ctx.textAlign = 'center'; ctx.font = '400 54px "Russo One",Rubik,system-ui'; ctx.fillStyle = B.color; ctx.fillText(B.name.toUpperCase(), VW / 2, VH / 2);
    ctx.font = '800 20px Rubik,system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(`${B.bg} · ${L.name}`, VW / 2, VH / 2 + 32);
    ctx.font = '700 15px Rubik,system-ui'; ctx.fillStyle = '#ffe680'; ctx.fillText(B.def.tip || '', VW / 2, VH / 2 + 56);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  }
  if (B.active && !B.dead && B.intro <= 0 && B.st !== 'cleansing') {
    const bw = 520, bx = VW / 2 - bw / 2, by = VH - 56;
    ctx.fillStyle = '#05090cd8'; rrect(ctx, bx - 10, by - 26, bw + 20, 50, 12); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '900 14px Rubik,system-ui'; ctx.textAlign = 'center'; ctx.fillText(`${B.name} · ${B.bg}${B.phase === 2 ? (B.id === 'heart' ? ' — ПРЕЧИСТИ СЪРЦЕТО' : ' — ФАЗА 2') : ''}`, VW / 2, by - 8);
    ctx.fillStyle = '#2a0d14'; rrect(ctx, bx, by, bw, 14, 7); ctx.fill();
    ctx.fillStyle = B.phase === 2 ? '#ff2a55' : B.color; rrect(ctx, bx, by, bw * Math.max(0, B.hp / B.max), 14, 7); ctx.fill();
    ctx.textAlign = 'left';
  }

  // Съобщения
  msgs.forEach((m, i) => {
    const a = Math.min(1, m.t * 2, (m.max - m.t) * 4);
    ctx.globalAlpha = a; ctx.font = '900 22px Rubik,system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 5; ctx.strokeStyle = '#000c'; ctx.strokeText(m.text, VW / 2, 130 + i * 32);
    ctx.fillStyle = m.color; ctx.fillText(m.text, VW / 2, 130 + i * 32);
    ctx.globalAlpha = 1; ctx.textAlign = 'left';
  });
  if (P.hp <= 1.01 && P.hp > 0) { ctx.fillStyle = `rgba(255,0,40,${0.12 + 0.08 * Math.sin(T * 6)})`; ctx.fillRect(0, 0, VW, VH); }
}

// Фон за менютата
function renderMenuBg() {
  ctx.fillStyle = '#050a07'; ctx.fillRect(0, 0, VW, VH);
}

// ---------- Финал ----------
let ending = null;
const ENDING_BLD = [[40, 330, 120, 390], [170, 280, 80, 440], [260, 360, 160, 360], [430, 250, 70, 470], [520, 340, 140, 380], [880, 310, 110, 410], [1000, 270, 90, 450], [1100, 350, 160, 370]];
function startEnding() {
  setRes(1280, 720);
  state = 'ending'; showScreen('sEnd'); $('endBtns').classList.add('hidden');
  save.finished = true; writeSave();
  ending = { t: 0, line: -1, windows: [] };
  const r = RNG(77);
  ENDING_BLD.forEach(([x, y, w]) => {
    for (let wy = y + 16; wy < 640; wy += 26) for (let wx = x + 10; wx < x + w - 14; wx += 22) if (r() < 0.6) ending.windows.push({ x: wx, y: wy, on: 1 + r() * 26, w: 9 });
  });
  audioInit(); stopMusic(); startMusic(0); sfx('win');
}
function updateEnding(dt) {
  ending.t += dt;
  const li = Math.floor(ending.t / 3.4);
  if (li !== ending.line && li < ENDING_LINES.length) { ending.line = li; }
  if (ending.t > ENDING_LINES.length * 3.4 + 1.5) $('endBtns').classList.remove('hidden');
  musicTick(dt, false);
}
function renderEnding() {
  const t = ending.t, light = Math.min(1, t / 20);
  const sky = ctx.createLinearGradient(0, 0, 0, VH);
  sky.addColorStop(0, `rgb(${10 + 60 * light},${12 + 90 * light},${30 + 140 * light})`);
  sky.addColorStop(1, `rgb(${20 + 200 * light},${12 + 120 * light},${20 + 60 * light})`);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, VW, VH);
  // слънце
  glow(ctx, VW * 0.7, 520 - light * 260, 260, '#ffd27a', 0.6 * light);
  ctx.fillStyle = `rgba(255,220,140,${light})`; circle(ctx, VW * 0.7, 520 - light * 260, 46); ctx.fill();
  // виенско колело (зад сградите)
  ctx.strokeStyle = '#0d0b14'; ctx.lineWidth = 5; circle(ctx, 960, 250, 110); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 + t * 0.15 * light;
    ctx.beginPath(); ctx.moveTo(960, 250); ctx.lineTo(960 + Math.cos(a) * 110, 250 + Math.sin(a) * 110); ctx.stroke();
    if (t > 8) { glow(ctx, 960 + Math.cos(a) * 110, 250 + Math.sin(a) * 110, 18, i % 2 ? '#ffd568' : '#ff6fa8', 0.9); }
  }
  // силует на града
  ctx.fillStyle = '#0d0b14';
  ENDING_BLD.forEach(([x, y, w, h]) => ctx.fillRect(x, y, w, h));
  ctx.fillRect(470, 180, 20, 80); // комин на фабриката
  // цирк
  ctx.beginPath(); ctx.moveTo(660, 720); ctx.lineTo(660, 400); ctx.lineTo(760, 300); ctx.lineTo(860, 400); ctx.lineTo(860, 720); ctx.fill();
  if (light > 0.3) { for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? `rgba(255,80,110,${light})` : `rgba(255,240,220,${light})`; ctx.beginPath(); ctx.moveTo(760, 300); ctx.lineTo(670 + i * 50, 400); ctx.lineTo(695 + i * 50, 400); ctx.fill(); } }
  // прозорци
  ending.windows.forEach(wi => { if (t > wi.on * 0.6) { ctx.fillStyle = '#ffd97a'; ctx.fillRect(wi.x, wi.y, wi.w, wi.w * 1.3); } });
  // гора отпред
  for (let i = 0; i < 26; i++) {
    const x = i * 52 - 20, hgt = 120 + (i * 37 % 60);
    const g = Math.floor(20 + 120 * light);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.3)},${g},${Math.floor(g * 0.4)})`;
    ctx.beginPath(); ctx.moveTo(x, VH); ctx.lineTo(x + 30, VH - hgt); ctx.lineTo(x + 60, VH); ctx.fill();
  }
  // светулки
  for (let i = 0; i < 40; i++) {
    const x = (i * 97 + Math.sin(t * 0.5 + i) * 40) % VW, y = 520 + Math.sin(t * 0.8 + i * 1.3) * 120;
    glow(ctx, x, y, 10, '#d8ff8a', 0.5 + 0.4 * Math.sin(t * 3 + i));
  }
  // текст
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 40, VW, 120);
  const line = ending.line, lastL = line === ENDING_LINES.length - 1;
  if (line >= 0) {
    const lt = t - line * 3.4, a = lastL ? Math.min(1, lt * 1.5) : Math.min(1, lt * 1.5, (3.4 - lt) * 1.5);
    ctx.globalAlpha = Math.max(0, a); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 34px Rubik,system-ui';
    ctx.fillText(ENDING_LINES[Math.min(line, ENDING_LINES.length - 1)], VW / 2, 112); ctx.globalAlpha = 1;
  }
  if (t > ENDING_LINES.length * 3.4) {
    ctx.textAlign = 'center'; ctx.font = '400 64px "Russo One",Rubik,system-ui';
    ctx.lineWidth = 8; ctx.strokeStyle = '#000a'; ctx.strokeText('СЛЕДВА: ЧАСТ 2', VW / 2, 330);
    ctx.fillStyle = '#ffd568'; ctx.fillText('СЛЕДВА: ЧАСТ 2', VW / 2, 330);
    const out = (txt, y, font, col) => { ctx.font = font; ctx.lineWidth = 5; ctx.strokeStyle = '#000c'; ctx.strokeText(txt, VW / 2, y); ctx.fillStyle = col; ctx.fillText(txt, VW / 2, y); };
    out('Благодарим ти, че освободи града!', 372, '700 20px Rubik,system-ui', '#fff');
    out('Monsters & Survivors', 430, '400 30px "Russo One",Rubik,system-ui', '#fff');
    out('По идея на Радоил и приятели', 462, '700 18px Rubik,system-ui', '#d8ff8a');
  }
  ctx.textAlign = 'left';
}

// ---------- Главен цикъл ----------
let last = performance.now();
function loop(now) {
  const dt = Math.min(0.033, (now - last) / 1000); last = now;
  update(dt);
  render();
  if (state === 'select') renderPreviews();
  document.body.classList.toggle('playing', state === 'play' || state === 'paused');
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
