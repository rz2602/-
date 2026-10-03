'use strict';
// ===================== Чудовища и босове: спрайтове и поведение =====================
// Спрайтовете са в assets/monsters.webp, а координатите на кадрите — в MON_META (js/monster_meta.js).

const monAtlas = new Image();
let monReady = false;
monAtlas.onload = () => { monReady = true; };
monAtlas.src = 'assets/monsters.webp';

// Големите портрети на босовете (за началната им сцена)
const bossPortraits = new Image();
let portraitsReady = false;
bossPortraits.onload = () => { portraitsReady = true; document.querySelectorAll('canvas.bossThumb').forEach(drawBossThumb); };
bossPortraits.src = 'assets/boss_portraits.jpg';
const PORTRAIT = { doll: [0, 296], crane: [296, 271], maestro: [567, 233], leviathan: [800, 234], queen: [1034, 229], heart: [1263, 236] }, PORTRAIT_H = 320;
function portraitW(id, h) { return PORTRAIT[id][1] * h / PORTRAIT_H; }
function drawPortrait(g, id, x, y, h, color) {
  if (!portraitsReady || !PORTRAIT[id]) return;
  const [sx, sw] = PORTRAIT[id], w = portraitW(id, h);
  glow(g, x + w / 2, y + h / 2, Math.max(w, h) * 0.75, color, 0.35);
  g.save(); rrect(g, x, y, w, h, Math.min(18, h * 0.08)); g.clip();
  g.drawImage(bossPortraits, sx, 0, sw, PORTRAIT_H, x, y, w, h); g.restore();
  g.strokeStyle = color; g.lineWidth = Math.max(2, h / 110); rrect(g, x, y, w, h, Math.min(18, h * 0.08)); g.stroke();
}
function drawBossThumb(c) {
  const g = c.getContext('2d'), id = c.dataset.boss; g.clearRect(0, 0, c.width, c.height);
  const h = c.height - 6, w = portraitW(id, h); drawPortrait(g, id, (c.width - w) / 2, 3, h, c.dataset.color || '#fff');
}

// Височина на всяко чудовище в играта (пиксели)
const MON_H = { gloomy: 58, glitch: 56, brute: 104, watcher: 80, screecher: 54, mimic: 52 };
const ANIM_FPS = { idle: 7, walk: 10, hurt: 10, die: 10, teleport: 12, reveal: 10, attack: 10, punch: 9, charge: 10, slam: 7, shoot: 7, attack1: 6, attack2: 6, special: 8, phase2: 7 };
const idleHCache = {};
function monIdleH(name) {
  if (!idleHCache[name]) { const hs = MON_META[name].anims.idle.map(f => f[3]).sort((a, b) => a - b); idleHCache[name] = hs[hs.length >> 1]; }
  return idleHCache[name];
}
const tintCache = {};
function tintedFrame(name, anim, i, f, filter) {
  const key = name + anim + i + filter;
  if (tintCache[key]) return tintCache[key];
  const c = document.createElement('canvas'); c.width = f[2]; c.height = f[3];
  const g = c.getContext('2d'); g.filter = filter; g.drawImage(monAtlas, f[0], f[1], f[2], f[3], 0, 0, f[2], f[3]);
  return (tintCache[key] = c);
}
// Рисува кадър с котва в краката (x, y)
function drawMon(g, name, anim, t, x, y, faceRight, h, o = {}) {
  if (!monReady) return;
  const M = MON_META[name], frs = M.anims[anim] || M.anims.idle, n = frs.length;
  const fps = o.fps || ANIM_FPS[anim] || 8;
  let i = o.frame !== undefined ? Math.min(n - 1, o.frame) : o.once ? Math.min(n - 1, Math.floor(t * fps)) : Math.floor(t * fps) % n;
  if (i < 0) i = 0;
  const f = frs[i], s = h / monIdleH(name);
  const flip = (M.face === 'R') !== faceRight;
  g.save(); g.translate(x, y); if (flip) g.scale(-1, 1);
  if (o.alpha !== undefined) g.globalAlpha *= o.alpha;
  if (o.sy) g.scale(1, o.sy);
  let src = monAtlas, sx = f[0], sy = f[1];
  if (o.filter && o.filter !== 'none' && FILTER_OK) { src = tintedFrame(name, anim, i, f, o.filter); sx = 0; sy = 0; }
  g.drawImage(src, sx, sy, f[2], f[3], -f[4] * s, -f[3] * s, f[2] * s, f[3] * s);
  if (o.flash > 0) {
    g.globalCompositeOperation = 'lighter'; g.globalAlpha = Math.min(1, o.flash * 4);
    g.drawImage(src, sx, sy, f[2], f[3], -f[4] * s, -f[3] * s, f[2] * s, f[3] * s);
  }
  g.restore();
}
function animLen(name, anim) { const a = MON_META[name].anims[anim]; return a ? a.length / (ANIM_FPS[anim] || 8) : 0.5; }

// ---------- Създаване ----------
function makeEnemy(id, x, y, li, diff) {
  const D = MONSTERS[id], hp = D.hp * (1 + li * 0.12) * diff.enemyHp;
  return {
    id, x, y, r: D.r, hp, max: hp, name: D.bg, color: D.color, speed: D.speed * (1 + li * 0.04), dmg: D.dmg,
    face: Math.random() < 0.5 ? -1 : 1, active: false, dead: false, st: 'move', stT: 0, an: 'idle', at: Math.random() * 3, fr: undefined,
    cd: 1 + Math.random() * 1.5, cd2: 2 + Math.random() * 2, cd3: 3 + Math.random() * 3,
    flash: 0, frozen: 0, slow: 0, kbx: 0, kby: 0, wander: Math.random() * 6, hidden: id === 'mimic', blink: 0, blinkT: 2 + Math.random() * 4,
    summons: 0, lookT: 0, minion: false,
  };
}
function setAn(e, an, fr) { if (e.an !== an) { e.an = an; e.at = 0; } e.fr = fr; }
function freeSpotNear(x, y, rmin, rmax, r, needLos = true) {
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, d = rmin + Math.random() * (rmax - rmin);
    const nx = x + Math.cos(a) * d, ny = y + Math.sin(a) * d;
    if (!blocked(nx, ny, r) && (!needLos || los(nx, ny, x, y))) return { x: nx, y: ny };
  }
  return null;
}
function spawnMinion(id, x, y, boss) {
  const p = freeSpotNear(x, y, 40, 110, MONSTERS[id].r, false) || { x, y };
  const m = makeEnemy(id, p.x, p.y, lv.li, DIFF); m.active = true; m.minion = true; m.hidden = false;
  if (boss && lv.boss.phase === 2 && lv.boss.id === 'heart') m.cleansable = true;
  lv.enemies.push(m); burst(p.x, p.y, m.color, 16, 160, 0.5); return m;
}

// ---------- Опасни зони (с предупреждение преди удара) ----------
function addZone(z) { lv.zones.push(Object.assign({ kind: 'circle', dmg: 1, done: false, color: '#ff3b4a' }, z, { max: z.t })); }
function inZone(z, x, y) {
  if (z.kind === 'circle') return Math.hypot(x - z.x, y - z.y) < z.r;
  const vx = z.x2 - z.x1, vy = z.y2 - z.y1, l2 = vx * vx + vy * vy || 1;
  const k = Math.max(0, Math.min(1, ((x - z.x1) * vx + (y - z.y1) * vy) / l2));
  return Math.hypot(x - (z.x1 + vx * k), y - (z.y1 + vy * k)) < z.w / 2;
}
function updateZones(dt) {
  lv.zones.forEach(z => {
    z.t -= dt;
    if (z.t <= 0 && !z.done) {
      z.done = true;
      const cx = z.kind === 'circle' ? z.x : (z.x1 + z.x2) / 2, cy = z.kind === 'circle' ? z.y : (z.y1 + z.y2) / 2;
      const fxCol = { roots: '#6a3a1a', seed: '#c04fff', cargo: '#c9a46a', hook: '#ffb347', water: '#5dffc0', ripple: '#5dffc0', tentacle: '#3f8f4a', slam: '#c04fff', grab: '#ff5fd8', melee: '#ffffff' }[z.fx] || z.color;
      burst(cx, cy, fxCol, z.fx === 'melee' ? 6 : 18, 220, 0.5, 5);
      if (z.fx !== 'melee') { ring(cx, cy, fxCol, z.kind === 'circle' ? z.r * 1.3 : 80, 0.35); shake = Math.max(shake, 0.2); }
      if (z.dmg > 0 && inZone(z, P.x, P.y)) {
        hurt(z.dmg, z.src);
        if (z.fx === 'grab' && lv.boss) { const a = Math.atan2(lv.boss.y - P.y, lv.boss.x - P.x); moveCircle(P, Math.cos(a) * 90, Math.sin(a) * 90); }
      }
      if (z.onDone) z.onDone(z);
    }
  });
  lv.zones = lv.zones.filter(z => z.t > -0.45);
}
function drawZones(g) {
  lv.zones.forEach(z => {
    if (z.t > 0) {
      const p = 1 - z.t / z.max, pulse = 0.55 + 0.35 * Math.sin(T * 18);
      g.save();
      if (z.kind === 'circle') {
        g.fillStyle = hexA(z.color, 0.12 + 0.15 * p); circle(g, z.x, z.y, z.r); g.fill();
        g.fillStyle = hexA(z.color, 0.3); circle(g, z.x, z.y, z.r * p); g.fill();
        g.strokeStyle = hexA(z.color, pulse); g.lineWidth = 3; circle(g, z.x, z.y, z.r); g.stroke();
        if (z.fx === 'cargo' || z.fx === 'seed') {
          const h = 420 * (1 - p);
          if (z.fx === 'cargo') { g.fillStyle = '#a07840'; g.fillRect(z.x - 22, z.y - 22 - h, 44, 40); g.strokeStyle = '#3b2f1c'; g.lineWidth = 3; g.strokeRect(z.x - 22, z.y - 22 - h, 44, 40); g.beginPath(); g.moveTo(z.x - 22, z.y - 22 - h); g.lineTo(z.x + 22, z.y + 18 - h); g.stroke(); }
          else { glow(g, z.x, z.y - h, 22, '#c04fff', 0.8); g.fillStyle = '#5a2a6a'; g.beginPath(); g.ellipse(z.x, z.y - h, 8, 11, 0, 0, 7); g.fill(); }
        }
        if (z.fx === 'ripple' || z.fx === 'water') { g.strokeStyle = hexA('#9fffe0', 0.6); g.lineWidth = 2; for (let k = 0; k < 3; k++) { circle(g, z.x, z.y, (z.r * ((T * 0.8 + k / 3) % 1))); g.stroke(); } }
      } else {
        const a = Math.atan2(z.y2 - z.y1, z.x2 - z.x1), L = Math.hypot(z.x2 - z.x1, z.y2 - z.y1);
        g.translate(z.x1, z.y1); g.rotate(a);
        g.fillStyle = hexA(z.color, 0.12 + 0.15 * p); g.fillRect(0, -z.w / 2, L, z.w);
        g.fillStyle = hexA(z.color, 0.3); g.fillRect(0, -z.w / 2, L * p, z.w);
        g.strokeStyle = hexA(z.color, pulse); g.lineWidth = 3; g.strokeRect(0, -z.w / 2, L, z.w);
      }
      g.restore();
    } else {
      // моментът на удара
      const k = Math.max(0, 1 + z.t / 0.45);
      g.save(); g.globalAlpha = k;
      if (z.fx === 'roots') {
        g.fillStyle = '#3a2210';
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; g.beginPath(); g.moveTo(z.x + Math.cos(a) * 16, z.y + Math.sin(a) * 7); g.lineTo(z.x + Math.cos(a) * 5, z.y - 46 * k); g.lineTo(z.x + Math.cos(a + 0.5) * 16, z.y + Math.sin(a + 0.5) * 7); g.fill(); }
      } else if (z.fx === 'water' || z.fx === 'ripple') {
        g.fillStyle = hexA('#9fffe0', 0.7); g.fillRect(z.x - 10, z.y - 90 * k, 20, 90 * k); glow(g, z.x, z.y, z.r, '#5dffc0', 0.6);
      } else if (z.fx === 'tentacle') {
        g.strokeStyle = '#2f6a3a'; g.lineCap = 'round'; g.lineWidth = z.w * 0.55; g.beginPath(); g.moveTo(z.x1, z.y1);
        g.quadraticCurveTo((z.x1 + z.x2) / 2 + Math.sin(T * 9) * 30, (z.y1 + z.y2) / 2 - 30, z.x2, z.y2); g.stroke(); g.lineCap = 'butt';
      } else if (z.fx === 'cargo') {
        g.fillStyle = '#8a6a3c'; g.fillRect(z.x - 24, z.y - 20, 48, 36); g.strokeStyle = '#3b2f1c'; g.lineWidth = 3; g.strokeRect(z.x - 24, z.y - 20, 48, 36);
      } else if (z.kind === 'circle') {
        g.strokeStyle = hexA(z.color, 0.8); g.lineWidth = 6; circle(g, z.x, z.y, z.r * (1.25 - k * 0.25)); g.stroke();
      }
      g.restore();
    }
  });
}

// ---------- Поведение на чудовищата ----------
function updateEnemy(e, dt) {
  e.flash -= dt; e.frozen -= dt; e.slow -= dt; e.at += dt; e.stT -= dt; e.hurtT = (e.hurtT || 0) - dt;
  if (e.kbx || e.kby) {
    const k = e.id === 'brute' ? 0.35 : 1;
    moveCircle(e, e.kbx * k * dt, e.kby * k * dt); e.kbx *= 0.85; e.kby *= 0.85;
    if (Math.abs(e.kbx) + Math.abs(e.kby) < 5) e.kbx = e.kby = 0;
  }
  if (e.id === 'node') return updateNode(e, dt);
  if (e.id === 'decoy') return updateDecoy(e, dt);
  const dx = P.x - e.x, dy = P.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (e.id === 'mimic' && e.hidden) return mimicHidden(e, dt, d);
  if (!e.active) {
    setAn(e, 'idle');
    if (d < 460 && los(e.x, e.y, P.x, P.y)) e.active = true;
    return;
  }
  if (e.frozen > 0) return;
  const locked = ['leap', 'charge', 'aim', 'bite', 'punch'].includes(e.st);
  if (!locked && Math.abs(dx) > 4) e.face = dx < 0 ? -1 : 1;
  if (P.shadow > 0 && !['stun', 'grounded'].includes(e.st)) {
    e.wander += dt; setAn(e, 'walk');
    moveCircle(e, Math.cos(e.wander) * e.speed * 0.3 * dt, Math.sin(e.wander * 1.3) * e.speed * 0.3 * dt);
    return;
  }
  const sp = e.speed * (e.slow > 0 ? 0.45 : 1);
  ENEMY_AI[e.id](e, dt, dx, dy, d, sp);
  const harmless = ['stun', 'grounded', 'tele'].includes(e.st);
  if (!harmless && d < e.r + P.r - 2) hurt(e.dmg, e.name);
}
function chase(e, sp, dt) { const [vx, vy] = flowDir(e); moveCircle(e, vx * sp * dt, vy * sp * dt); }
function keepDistance(e, dx, dy, d, sp, dt, near, far) {
  if (d > far) chase(e, sp, dt);
  else if (d < near) moveCircle(e, -dx / d * sp * dt, -dy / d * sp * dt);
  else { const s = Math.sin(T * 0.7 + e.wander) > 0 ? 1 : -1; moveCircle(e, -dy / d * sp * 0.5 * s * dt, dx / d * sp * 0.5 * s * dt); }
}
const ENEMY_AI = {
  // Мрачко: преследва, присяда (предупреждение) и скача
  gloomy(e, dt, dx, dy, d, sp) {
    e.cd -= dt;
    switch (e.st) {
      case 'crouch':
        setAn(e, 'attack', 0); e.windup = e.stT;
        if (e.stT <= 0) { e.st = 'leap'; e.stT = 0.38; e.lx = dx / d; e.ly = dy / d; setAn(e, 'attack'); e.at = 0.1; sfx('melee'); }
        break;
      case 'leap':
        if (!moveCircle(e, e.lx * sp * 4.2 * dt, e.ly * sp * 4.2 * dt)) e.stT = 0;
        if (e.stT <= 0) { e.st = 'rest'; e.stT = 0.5; e.cd = 1.3 + Math.random() * 0.6; }
        break;
      case 'rest': setAn(e, 'idle'); if (e.stT <= 0) e.st = 'move'; break;
      default:
        e.st = 'move'; setAn(e, e.hurtT > 0 ? 'hurt' : 'walk'); chase(e, sp, dt);
        if (d < 165 && e.cd <= 0 && los(e.x, e.y, P.x, P.y)) { e.st = 'crouch'; e.stT = 0.45; }
    }
  },
  // Гличко: държи разстояние, зарежда се (свети), стреля и се телепортира
  glitch(e, dt, dx, dy, d, sp) {
    e.cd -= dt;
    switch (e.st) {
      case 'charge':
        setAn(e, 'attack', Math.min(4, Math.floor((0.75 - e.stT) / 0.15))); e.windup = e.stT;
        if (e.stT <= 0) {
          enemyBullet(e.x, e.y - 18, Math.atan2(dy + 18, dx), 270 + lv.li * 10, '#7dff3a', e.name, 9);
          e.st = 'tele'; e.stT = 0.6; e.tp = false; setAn(e, 'teleport');
        }
        break;
      case 'tele':
        if (!e.tp && e.stT < 0.32) {
          e.tp = true; burst(e.x, e.y - 18, '#7dff3a', 14, 160, 0.4);
          const p = freeSpotNear(P.x, P.y, 170, 290, e.r); if (p) { e.x = p.x; e.y = p.y; }
          burst(e.x, e.y - 18, '#7dff3a', 14, 160, 0.4);
        }
        if (e.stT <= 0) { e.st = 'move'; e.cd = 1.5 + Math.random() * 1.2; }
        break;
      default:
        e.st = 'move'; setAn(e, e.hurtT > 0 ? 'hurt' : 'walk'); keepDistance(e, dx, dy, d, sp, dt, 190, 330);
        if (e.cd <= 0 && d < 470 && los(e.x, e.y, P.x, P.y)) { e.st = 'charge'; e.stT = 0.75; }
    }
  },
  // Кореняк: бавен танк — удар с ръка, засилване (удря се в стената и се зашеметява), удар в земята
  brute(e, dt, dx, dy, d, sp) {
    e.cd -= dt; e.cd2 -= dt; e.cd3 -= dt;
    switch (e.st) {
      case 'punch':
        if (!e.hitDone && e.stT < 0.25) {
          e.hitDone = true; burst(e.x + e.face * 50, e.y, '#c04fff', 12, 200, 0.4);
          const a = Math.atan2(dy, dx); let da = a - (e.face > 0 ? 0 : Math.PI); da = Math.atan2(Math.sin(da), Math.cos(da));
          if (d < e.r + P.r + 46 && Math.abs(da) < 1.3) { hurt(2, e.name); shake = 0.3; }
        }
        if (e.stT <= 0) { e.st = 'move'; e.cd = 1.6; }
        break;
      case 'aim':
        setAn(e, 'charge', 0);
        if (e.stT <= 0) { e.st = 'charge'; e.stT = 1.3; setAn(e, 'charge'); sfx('boom'); }
        break;
      case 'charge':
        e.face = e.lx < 0 ? -1 : 1;
        if (!moveCircle(e, e.lx * 430 * dt, e.ly * 430 * dt)) {
          e.st = 'stun'; e.stT = 1.8; shake = 0.5; burst(e.x + e.lx * 30, e.y, '#c9a46a', 20, 220, 0.5, 5); floater(e.x, e.y - 70, 'Зашеметен!', '#ffe680');
        } else if (d < e.r + P.r + 4 && !e.hitDone) { e.hitDone = true; hurt(2, e.name); moveCircle(P, e.lx * 70, e.ly * 70); }
        if (e.stT <= 0 && e.st === 'charge') { e.st = 'move'; e.cd2 = 5; }
        break;
      case 'stun': setAn(e, 'hurt'); if (e.stT <= 0) { e.st = 'move'; e.cd2 = 5; } break;
      case 'slam':
        if (e.stT <= 0) { e.st = 'move'; e.cd3 = 6.5; }
        break;
      default:
        e.st = 'move'; setAn(e, 'walk'); chase(e, sp, dt);
        if (d < 82 && e.cd <= 0) { e.st = 'punch'; e.stT = 0.6; e.hitDone = false; setAn(e, 'punch'); e.face = dx < 0 ? -1 : 1; }
        else if (d > 130 && d < 340 && e.cd2 <= 0 && los(e.x, e.y, P.x, P.y)) {
          e.st = 'aim'; e.stT = 0.85; e.lx = dx / d; e.ly = dy / d; e.hitDone = false;
          addZone({ kind: 'line', x1: e.x, y1: e.y, x2: e.x + e.lx * 380, y2: e.y + e.ly * 380, w: 56, t: 0.85, dmg: 0, src: e.name, color: '#ff8a3a' });
        } else if (d < 180 && e.cd3 <= 0) {
          e.st = 'slam'; e.stT = 1.4; setAn(e, 'slam');
          addZone({ x: e.x, y: e.y, r: 125, t: 0.95, dmg: 2, src: e.name, fx: 'slam', color: '#c04fff' });
        }
    }
  },
  // Наблюдателят: когато го гледаш — замръзва; когато се обърнеш — бързо се премества и стреля
  watcher(e, dt, dx, dy, d, sp) {
    e.cd -= dt;
    let da = Math.atan2(-dy, -dx) - P.aim; da = Math.atan2(Math.sin(da), Math.cos(da));
    const looked = Math.abs(da) < 0.7 && d < 560 && los(e.x, e.y, P.x, P.y);
    e.looked = looked;
    switch (e.st) {
      case 'aim':
        setAn(e, 'shoot', Math.min(2, Math.floor((0.9 - e.stT) / 0.3))); e.windup = e.stT;
        if (e.stT <= 0) { enemyBullet(e.x + e.face * 18, e.y - 30, Math.atan2(dy + 30, dx - e.face * 18), 320, '#ff9a2a', e.name, 10); e.st = 'recover'; e.stT = 0.45; setAn(e, 'shoot', 3); }
        break;
      case 'recover': if (e.stT <= 0) { e.st = 'move'; e.cd = 2.2 + Math.random(); } break;
      case 'tele':
        if (!e.tp && e.stT < 0.35) {
          e.tp = true; burst(e.x, e.y - 30, '#ff9a2a', 16, 160, 0.4);
          const bx = P.x - Math.cos(P.aim) * 170, by = P.y - Math.sin(P.aim) * 170;
          const p = !blocked(bx, by, e.r) && los(bx, by, P.x, P.y) ? { x: bx, y: by } : freeSpotNear(P.x, P.y, 140, 230, e.r);
          if (p) { e.x = p.x; e.y = p.y; }
        }
        if (e.stT <= 0) { e.st = 'move'; e.lookT = 0; }
        break;
      default:
        e.st = 'move';
        if (looked) { setAn(e, 'idle'); e.lookT += dt; moveCircle(e, dx / d * sp * 0.1 * dt, dy / d * sp * 0.1 * dt); }
        else {
          e.lookT = 0; setAn(e, 'walk');
          const tx = P.x - Math.cos(P.aim) * 200, ty = P.y - Math.sin(P.aim) * 200, td = Math.hypot(tx - e.x, ty - e.y) || 1;
          if (d > 380 || !los(e.x, e.y, P.x, P.y)) chase(e, sp, dt);
          else if (td > 20) moveCircle(e, (tx - e.x) / td * sp * dt, (ty - e.y) / td * sp * dt);
        }
        if (e.cd <= 0 && d < 480 && los(e.x, e.y, P.x, P.y)) { e.st = 'aim'; e.stT = 0.9; }
        else if (looked && e.lookT > 2.6 && lv.L.id === 'house') { e.st = 'tele'; e.stT = 0.7; e.tp = false; setAn(e, 'teleport'); }
    }
  },
  // Пискунът: зарежда писък (зелени вълни) и вика подкрепления — удари го, за да го прекъснеш
  screecher(e, dt, dx, dy, d, sp) {
    e.cd -= dt;
    switch (e.st) {
      case 'scream':
        setAn(e, 'attack'); e.windup = e.stT;
        e.ringT = (e.ringT || 0) - dt;
        if (e.ringT <= 0) { e.ringT = 0.3; ring(e.x + e.face * 20, e.y - 30, '#9dff3a', 70 + (2 - e.stT) * 40, 0.5); }
        if (e.stT <= 0) {
          e.st = 'move'; e.cd = 8; e.summons++;
          const pool = lv.li >= 5 && Math.random() < 0.35 ? ['gloomy', 'brute'] : ['gloomy', 'glitch'];
          pool.forEach(id => spawnMinion(id, e.x, e.y));
          say('Пискунът повика подкрепления!', 2, '#9dff3a'); sfx('gate');
        }
        break;
      case 'grounded': setAn(e, 'hurt'); if (e.stT <= 0) { e.st = 'move'; e.cd = 4; } break;
      default:
        e.st = 'move'; setAn(e, e.hurtT > 0 ? 'hurt' : 'walk');
        keepDistance(e, dx, dy, d, sp, dt, 150, 250);
        if (e.cd <= 0 && d < 430 && e.summons < 3 && los(e.x, e.y, P.x, P.y)) { e.st = 'scream'; e.stT = 2.0; say('Пискунът крещи — удари го!', 1.6, '#9dff3a'); }
    }
  },
  // Мимик: разкрит — гони и хапе
  mimic(e, dt, dx, dy, d, sp) {
    e.cd -= dt;
    switch (e.st) {
      case 'reveal': setAn(e, 'reveal'); if (e.stT <= 0) e.st = 'move'; break;
      case 'stun': setAn(e, 'hurt'); if (e.stT <= 0) e.st = 'move'; break;
      case 'bite':
        if (!e.hitDone && e.stT < 0.2) { e.hitDone = true; if (d < e.r + P.r + 32) hurt(1, e.name); }
        if (e.stT <= 0) { e.st = 'move'; e.cd = 1.1; }
        break;
      default:
        e.st = 'move'; setAn(e, 'walk'); chase(e, sp, dt);
        if (d < 62 && e.cd <= 0) { e.st = 'bite'; e.stT = 0.5; e.hitDone = false; setAn(e, 'attack'); }
    }
  },
};
function mimicHidden(e, dt, d) {
  setAn(e, 'idle', 0);
  e.blinkT -= dt; e.blink -= dt;
  if (e.blinkT <= 0) { e.blink = 0.35; e.blinkT = 3 + Math.random() * 3.5; }
  if (d < 72) { revealMimic(e); e.st = 'reveal'; e.stT = 0.6; say('Мимик! Сандъкът оживя!', 1.6, '#ff9a2a'); }
}
function revealMimic(e) { e.hidden = false; e.active = true; burst(e.x, e.y, '#ffb347', 14, 160, 0.4); sfx('hit'); }

// Възли на покварата (финален бос, фаза 2)
function updateNode(e, dt) {
  e.at += dt; e.cd -= dt;
  if (e.cd <= 0 && los(e.x, e.y, P.x, P.y)) { e.cd = 2.6 + Math.random(); enemyBullet(e.x, e.y, Math.atan2(P.y - e.y, P.x - e.x), 220, '#c04fff', 'Възел на покварата', 8); }
}
// Отражения на Огледалната кралица
function updateDecoy(e, dt) {
  e.life -= dt; e.cd -= dt; e.face = P.x < e.x ? -1 : 1; setAn(e, 'idle');
  if (e.cd <= 0) { e.cd = 2.2 + Math.random(); enemyBullet(e.x, e.y - 50, Math.atan2(P.y - e.y + 50, P.x - e.x), 260, '#d6a8ff', 'Отражение', 8); }
  if (e.life <= 0) { e.dead = true; burst(e.x, e.y - 40, '#d6a8ff', 16, 160, 0.5); }
}

// Удар по чудовище: връща множителя на щетите
function enemyOnHit(e) {
  let mul = 1;
  if (e.id === 'mimic' && e.hidden) { mul = 2; revealMimic(e); e.st = 'stun'; e.stT = 1.6; floater(e.x, e.y - 50, 'Изненада!', '#ffe680'); }
  if (e.st === 'stun' || e.st === 'grounded') mul *= 1.5;
  if (e.id === 'screecher' && e.st === 'scream') { e.st = 'grounded'; e.stT = 2.2; floater(e.x, e.y - 50, 'Прекъснат!', '#9dff3a'); }
  if (!['attack', 'punch', 'charge', 'slam', 'shoot'].includes(e.an)) e.hurtT = 0.25;
  e.active = true;
  return mul;
}
function killEnemy(e) {
  e.dead = true; sfx('die');
  if (e.id === 'decoy') { burst(e.x, e.y - 40, '#d6a8ff', 24, 200, 0.6); return; }
  if (e.id === 'node') {
    burst(e.x, e.y, '#c04fff', 30, 260, 0.8, 5); ring(e.x, e.y, '#a6ff5c', 90, 0.5); shake = 0.4;
    const left = lv.enemies.filter(n => n.id === 'node' && !n.dead).length;
    if (left > 0) say(`Възел на покварата унищожен! Остават ${left}.`, 2.2, '#a6ff5c'); else exposeHeart();
    return;
  }
  stats.kills++;
  const cleansed = !!e.cleansable || (lv.boss.id === 'heart' && lv.boss.phase === 2 && !lv.boss.dead);
  lv.corpses.push({ id: e.id, x: e.x, y: e.y, r: e.r, face: e.face, t: 0, cleansed });
  if (cleansed) { burst(e.x, e.y, '#c8ff6a', 24, 180, 0.8, 4); floater(e.x, e.y - 40, 'Пречистен!', '#c8ff6a'); }
  if (Math.random() < 0.13) lv.hearts.push({ x: e.x, y: e.y, got: false, amt: 1 });
}

// ---------- Рисуване на чудовищата ----------
function drawEnemy(g, e, t) {
  if (e.id === 'node') return drawNode(g, e, t);
  const H = MON_H[e.id] || 60, fly = e.id === 'glitch' || e.id === 'screecher';
  const feet = e.y + e.r * 0.8, lift = fly ? 16 + Math.sin(t * 4 + e.wander) * 4 : 0;
  if (e.id === 'decoy') {
    drawMon(g, 'queen', 'idle', e.at, e.x, feet, e.face > 0, lv.L.boss.h, { alpha: 0.88, flash: e.flash });
    return;
  }
  // сянка
  g.fillStyle = '#0006'; g.beginPath(); g.ellipse(e.x, feet, e.r * (fly ? 0.7 : 1.05), e.r * 0.3, 0, 0, 7); g.fill();
  if (e.frozen > 0) { g.fillStyle = '#9fe8ff44'; circle(g, e.x, e.y - H * 0.35, H * 0.55); g.fill(); }
  if (e.windup > 0 && ['crouch', 'charge', 'aim', 'scream'].includes(e.st)) {
    g.strokeStyle = `rgba(255,70,70,${0.5 + 0.4 * Math.sin(t * 28)})`; g.lineWidth = 2; circle(g, e.x, feet - 4, e.r + 6); g.stroke();
  }
  if (e.id === 'glitch' && e.st === 'charge') glow(g, e.x, feet - lift - H * 0.45, 30 + (0.75 - e.stT) * 50, '#7dff3a', 0.5);
  if (e.id === 'watcher' && e.st === 'aim') glow(g, e.x + e.face * 10, feet - H * 0.55, 20 + (0.9 - e.stT) * 40, '#ff9a2a', 0.6);
  const filter = e.id === 'gloomy' ? lv.L.monTint : undefined;
  let anim = e.an, o = { flash: e.flash, filter };
  if (e.id === 'mimic' && e.hidden) {
    if (e.blink > 0) { anim = 'reveal'; o.frame = 2; }
    o.sy = 1 + Math.sin(t * 2.2 + e.wander) * 0.025;
  }
  if (e.fr !== undefined) o.frame = e.fr;
  if (e.id === 'gloomy' && lv.L.id === 'house' && Math.sin(t * 1.7 + e.wander * 3) > 0.85) {
    drawMon(g, e.id, anim, e.at, e.x + 26 * Math.sin(t * 3), feet, e.face > 0, H, { alpha: 0.25, filter });
  }
  drawMon(g, e.id, anim, e.at, e.x, feet - lift, e.face > 0, H, o);
  if (e.st === 'stun' || e.st === 'grounded') {
    for (let i = 0; i < 3; i++) { const a = t * 4 + i * 2.1; g.fillStyle = '#ffe680'; star(g, e.x + Math.cos(a) * 18, feet - H - 6 + Math.sin(a) * 5, 5, 5); g.fill(); }
  }
  if (e.hp < e.max && !e.hidden) {
    const y = feet - lift - H - 10;
    g.fillStyle = '#000a'; g.fillRect(e.x - 16, y, 32, 5);
    g.fillStyle = '#ff4f6a'; g.fillRect(e.x - 15, y + 1, 30 * Math.max(0, e.hp / e.max), 3);
  }
}
function drawNode(g, e, t) {
  const pulse = 1 + Math.sin(t * 5 + e.wander) * 0.12;
  glow(g, e.x, e.y, 60 * pulse, '#c04fff', 0.55);
  g.fillStyle = '#2a0f3a'; circle(g, e.x, e.y, 18 * pulse); g.fill();
  g.strokeStyle = '#e09cff'; g.lineWidth = 3; circle(g, e.x, e.y, 18 * pulse); g.stroke();
  g.strokeStyle = '#3a2210'; g.lineWidth = 6;
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + t * 0.4; g.beginPath(); g.moveTo(e.x + Math.cos(a) * 18, e.y + Math.sin(a) * 18); g.lineTo(e.x + Math.cos(a) * 36, e.y + Math.sin(a) * 36); g.stroke(); }
  if (e.flash > 0) { g.fillStyle = `rgba(255,255,255,${e.flash * 3})`; circle(g, e.x, e.y, 20); g.fill(); }
  g.fillStyle = '#000a'; g.fillRect(e.x - 18, e.y - 34, 36, 5); g.fillStyle = '#c04fff'; g.fillRect(e.x - 17, e.y - 33, 34 * Math.max(0, e.hp / e.max), 3);
}
function drawCorpses(g, dt) {
  lv.corpses.forEach(c => {
    c.t += dt;
    const feet = c.y + c.r * 0.8;
    if (c.cleansed) {
      const k = Math.max(0, 1 - c.t / 1.2);
      glow(g, c.x, feet - 20, 50, '#c8ff6a', 0.6 * k);
      drawMon(g, c.id, 'idle', 0, c.x, feet - c.t * 40, c.face > 0, MON_H[c.id], { alpha: k * 0.8, filter: 'sepia(1) saturate(3) hue-rotate(40deg) brightness(1.4)' });
    } else {
      const len = animLen(c.id, 'die'), k = c.t < len ? 1 : Math.max(0, 1 - (c.t - len) / 0.5);
      if (c.boss) drawMon(g, c.id, 'die', c.t, c.x, feet, c.face > 0, c.h, { once: true, fps: 3, alpha: k });
      else drawMon(g, c.id, 'die', c.t, c.x, feet, c.face > 0, MON_H[c.id], { once: true, alpha: k });
    }
  });
  lv.corpses = lv.corpses.filter(c => c.t < (c.boss ? 3.5 : 1.6));
}

// ===================== Босове =====================
function makeBoss(def, x, y, diff) {
  return {
    def, id: def.id, name: def.name, bg: def.bg, x, y, r: def.r, hp: def.hp * diff.enemyHp, max: def.hp * diff.enemyHp,
    color: def.color, speed: def.speed, h: def.h, phase: 1, active: false, dead: false, intro: 0, st: 'move', stT: 0,
    an: 'idle', at: 0, fr: undefined, cd: 2, pi: 0, flash: 0, frozen: 0, kbx: 0, kby: 0, face: -1, alpha: 1,
    submerged: def.id === 'leviathan', invuln: false, cleansing: 0, cleansed: false,
  };
}
function bossRoomPoint(margin = 2) {
  const br = lv.bossRoom;
  for (let i = 0; i < 20; i++) {
    const x = (br.x + margin + Math.random() * (br.w - margin * 2)) * TILE, y = (br.y + margin + Math.random() * (br.h - margin * 2)) * TILE;
    if (!blocked(x, y, 20)) return { x, y };
  }
  return { x: br.cx * TILE + 20, y: br.cy * TILE + 20 };
}
function bossCenter() { return { x: lv.bossRoom.cx * TILE + 20, y: lv.bossRoom.cy * TILE + 20 }; }

const BOSS_INTRO = 3.2;
function activateBoss(B) {
  B.active = true; B.intro = BOSS_INTRO; lv.arenaLocked = true;
  lv.gates.forEach(g => { lv.grid[g.y * lv.w + g.x] = 3; });
  shake = 0.7; sfx('boom');
  const br = lv.bossRoom, c = bossCenter(), x0 = (br.x + 2) * TILE + 20, x1 = (br.x + br.w - 3) * TILE + 20, y0 = (br.y + 2) * TILE + 20, y1 = (br.y + br.h - 3) * TILE + 20;
  if (B.id === 'crane') lv.bossObjs.push({ type: 'panel', x: x0, y: y0, cd: 0 }, { type: 'panel', x: x1, y: y1, cd: 0 });
  if (B.id === 'leviathan') lv.bossObjs.push({ type: 'valve', x: x0 + 40, y: y1 - 20, on: 0 }, { type: 'valve', x: x1 - 40, y: y0 + 20, on: 0 });
  if (B.id === 'heart' || B.id === 'leviathan') { B.x = c.x; B.y = c.y; }
}
function bossVulnerable(B) {
  if (B.intro > 0 || B.invuln || B.st === 'transform') return false;
  if (B.id === 'leviathan' && B.submerged) return false;
  return true;
}
function bossDmgMul(B) { return (B.st === 'stun' ? 1.5 : 1) * (B.exposed > 0 ? 1.5 : 1); }

function checkBossPhase() {
  const B = lv.boss;
  if (B.phase !== 1 || B.hp > B.max / 2) return;
  B.phase = 2; shake = 0.9; sfx('boom');
  lv.zones = []; bullets = [];
  switch (B.id) {
    case 'doll': B.st = 'transform'; B.stT = 1.4; setAn(B, 'phase2'); say('Черупката на куклата се пропука! (Фаза 2)', 3, '#ff5fd8'); break;
    case 'crane': B.st = 'transform'; B.stT = 1.2; setAn(B, 'phase2'); say('Кранозвярът се повреди и побесня! (Фаза 2)', 3, '#ffb347'); break;
    case 'maestro': B.st = 'transform'; B.stT = 1.2; setAn(B, 'phase2'); lv.lightsOut = true; say('Светлините угаснаха! Следи прожекторите. (Фаза 2)', 3.5, '#ffd568'); break;
    case 'leviathan': {
      B.st = 'transform'; B.stT = 1.4; B.submerged = false; setAn(B, 'phase2'); say('Водата се покачва! Арената се смалява. (Фаза 2)', 3.5, '#5dffc0');
      const br = lv.bossRoom;
      for (let y = br.y; y < br.y + br.h; y++) for (let x = br.x; x < br.x + br.w; x++) {
        const edge = x < br.x + 2 || x >= br.x + br.w - 2 || y < br.y + 2 || y >= br.y + br.h - 2;
        if (edge && lv.grid[y * lv.w + x] === 0) { lv.grid[y * lv.w + x] = 2; lv.hazards.push({ x, y }); }
      }
      break;
    }
    case 'queen': {
      B.st = 'transform'; B.stT = 1.2; setAn(B, 'phase2'); say('Около кралицата се появиха огромни огледала! (Фаза 2)', 3.5, '#d6a8ff');
      const br = lv.bossRoom;
      [[2, 2], [br.w - 3, 2], [2, br.h - 3], [br.w - 3, br.h - 3]].forEach(([ox, oy]) => lv.bossObjs.push({ type: 'mirror', x: (br.x + ox) * TILE + 20, y: (br.y + oy) * TILE + 20 }));
      break;
    }
    case 'heart': {
      B.invuln = true; B.st = 'corrupt'; setAn(B, 'phase2'); B.cd = 3;
      say('Сърцето не е истинският враг — то е покварено!', 4, '#c8ff6a'); say('ПРЕЧИСТИ СЪРЦЕТО: унищожи възлите на покварата!', 4.5, '#c8ff6a');
      const c = bossCenter();
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4, x = c.x + Math.cos(a) * 170, y = c.y + Math.sin(a) * 130;
        const hp = 14 * DIFF.enemyHp;
        lv.enemies.push({ id: 'node', x, y, r: 20, hp, max: hp, name: 'Възел на покварата', color: '#c04fff', active: true, dead: false, face: 1, at: 0, cd: 1 + i * 0.6, flash: 0, frozen: 0, slow: 0, kbx: 0, kby: 0, wander: i, st: 'node', stT: 0 });
      }
      break;
    }
  }
}
function exposeHeart() {
  const B = lv.boss; B.st = 'exposed';
  lv.enemies.forEach(e => { if (!e.dead && e.minion) { e.dead = true; lv.corpses.push({ id: e.id, x: e.x, y: e.y, r: e.r, face: e.face, t: 0, cleansed: true }); } });
  bullets = []; lv.zones = [];
  say('Сърцето е открито!', 3, '#c8ff6a');
  say(`Застани до него и използвай умението си (${document.body.classList.contains('touchMode') ? '✦' : 'Q'}), за да го пречистиш!`, 5, '#ffe680');
}
function startCleanse() {
  const B = lv.boss; B.st = 'cleansing'; B.cleansing = 3.2; sfx('win');
  lv.enemies.forEach(e => { if (!e.dead && e.id !== 'node') { e.dead = true; lv.corpses.push({ id: e.id, x: e.x, y: e.y, r: e.r, face: e.face, t: 0, cleansed: true }); } });
  bullets = []; lv.zones = [];
  say('Покварата изчезва…', 3, '#c8ff6a');
}
function killBoss() {
  const B = lv.boss; B.dead = true; B.active = false;
  shake = 1.2; sfx('boom'); setTimeout(() => sfx('win'), 400);
  if (B.id !== 'heart') {
    lv.corpses.push({ id: B.id, x: B.x, y: B.y, r: B.r, face: B.face, t: 0, boss: true, h: B.h });
    for (let i = 0; i < 4; i++) burst(B.x + (Math.random() - 0.5) * 80, B.y + (Math.random() - 0.5) * 80, i % 2 ? B.color : '#fff', 26, 300, 1, 5);
  } else {
    B.cleansed = true; B.st = 'cleansed';
    for (let i = 0; i < 6; i++) burst(B.x + (Math.random() - 0.5) * 120, B.y + (Math.random() - 0.5) * 120, i % 2 ? '#c8ff6a' : '#ffe680', 30, 260, 1.4, 5);
  }
  lv.enemies.forEach(e => { if (!e.dead && (e.minion || e.id === 'decoy' || e.id === 'node')) { e.dead = true; burst(e.x, e.y, e.color, 12, 150, 0.5); } });
  bullets = []; lv.zones = []; lv.orbs = []; lv.lightsOut = false;
  lv.arenaLocked = false; lv.gates.forEach(g => { lv.grid[g.y * lv.w + g.x] = 0; });
  lv.portal = B.id === 'heart' ? { x: B.x, y: B.y + 110 } : { x: B.x, y: B.y };
  say(B.id === 'heart' ? 'Сърцето на гората е пречистено!' : `${B.name} е победен!`, 3.5, '#7dff9a');
  say('Влез в портала, за да продължиш.', 4);
}

// Общо придвижване на боса: държи разстояние до играча
function bossDrift(B, dt, rate, near = 150, far = 240) {
  const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1, sp = B.speed * rate * (P.shadow > 0 ? 0.3 : 1);
  if (sp <= 0) { setAn(B, 'idle'); return; }
  let moved = true;
  if (d > far) moveCircle(B, dx / d * sp * dt, dy / d * sp * dt);
  else if (d < near) moveCircle(B, -dx / d * sp * dt, -dy / d * sp * dt);
  else { moveCircle(B, -dy / d * sp * 0.5 * dt, dx / d * sp * 0.5 * dt); moved = Math.random() < 0.5; }
  setAn(B, moved ? 'walk' : 'idle');
}
function nextPattern(B) { return B.def.patterns[B.pi++ % B.def.patterns.length]; }
function meleeZone(B, r, t, dmg = 1) {
  const a = Math.atan2(P.y - B.y, P.x - B.x);
  addZone({ x: B.x + Math.cos(a) * (B.r + r * 0.5), y: B.y + Math.sin(a) * (B.r + r * 0.5), r, t, dmg, src: B.name, fx: 'melee', color: B.color });
}

function updateBoss(B, dt) {
  B.flash -= dt; B.at += dt; B.stT -= dt; B.frozen -= dt; B.exposed = (B.exposed || 0) - dt;
  if (B.intro > 0) { B.intro -= dt; setAn(B, 'idle'); B.face = P.x < B.x ? -1 : 1; return; }
  if (B.kbx || B.kby) { moveCircle(B, B.kbx * dt, B.kby * dt); B.kbx *= 0.85; B.kby *= 0.85; }
  const rate = (B.phase === 2 ? 1.4 : 1) * (B.frozen > 0 ? 0.4 : 1);
  const dx = P.x - B.x, dy = P.y - B.y, d = Math.hypot(dx, dy) || 1;
  if (!['spin'].includes(B.st) && Math.abs(dx) > 8) B.face = dx < 0 ? -1 : 1;
  if (B.st === 'transform') { if (B.stT <= 0) { B.st = 'move'; B.cd = 1; } return; }
  if (B.st === 'stun') { setAn(B, 'hurt'); if (B.stT <= 0) { B.st = 'move'; B.cd = 1; } return; }
  BOSS_AI[B.id](B, dt, dx, dy, d, rate);
  if (lv.orbs.length) updateOrbs(dt);
  const contact = !B.submerged && !['corrupt', 'exposed', 'cleansing'].includes(B.st) && B.alpha > 0.5;
  if (contact && d < B.r + P.r) hurt(1, B.name);
}

const BOSS_AI = {
  // Счупената кукла: замах, хващане, въртене
  doll(B, dt, dx, dy, d, rate) {
    switch (B.st) {
      case 'swipe': case 'grab': if (B.stT <= 0) { B.st = 'move'; B.cd = 1.5 / rate; } break;
      case 'spin':
        setAn(B, 'special'); B.spinT = (B.spinT || 0) - dt;
        moveCircle(B, dx / d * B.speed * 1.4 * rate * dt, dy / d * B.speed * 1.4 * rate * dt);
        if (B.spinT <= 0) { B.spinT = 0.4; const n = B.phase === 2 ? 10 : 8; for (let i = 0; i < n; i++) enemyBullet(B.x, B.y - 30, i / n * Math.PI * 2 + T, 200, B.def.bullet, B.name, 8); }
        if (B.stT <= 0) { B.st = 'move'; B.cd = 1.8 / rate; }
        break;
      default:
        bossDrift(B, dt, rate, 120, 200); B.cd -= dt * rate;
        if (B.cd > 0) break;
        switch (nextPattern(B)) {
          case 'swipe': B.st = 'swipe'; B.stT = 0.9; setAn(B, 'attack1'); meleeZone(B, 95, 0.65, 1); break;
          case 'grab': B.st = 'grab'; B.stT = 1.1; setAn(B, 'attack2'); addZone({ x: P.x, y: P.y, r: 70, t: 0.95, dmg: 1, src: B.name, fx: 'grab', color: '#ff5fd8' }); break;
          case 'spin': B.st = 'spin'; B.stT = 2.6; say('Куклата се завърта — бягай!', 1.4, '#ff5fd8'); break;
        }
    }
  },
  // Кранозвярът: кука, хвърляне на товар, падащи контейнери; контролните панели го обездвижват
  crane(B, dt, dx, dy, d, rate) {
    lv.bossObjs.forEach(o => { if (o.type === 'panel') o.cd -= dt; });
    if (B.st !== 'move') { if (B.stT <= 0) { B.st = 'move'; B.cd = 1.7 / rate; } return; }
    bossDrift(B, dt, rate, 130, 220); B.cd -= dt * rate;
    if (B.cd > 0) return;
    const pat = nextPattern(B);
    B.st = pat; B.stT = 1.2;
    if (pat === 'slam') {
      setAn(B, 'attack1'); addZone({ x: P.x, y: P.y, r: 80, t: 1.0, dmg: 2, src: B.name, fx: 'hook', color: '#ffb347' });
      if (B.phase === 2) for (let i = 0; i < 2; i++) { const p = bossRoomPoint(); addZone({ x: p.x, y: p.y, r: 55, t: 1.4, dmg: 1, src: B.name, fx: 'cargo', color: '#ffb347' }); }
    } else if (pat === 'throw') {
      setAn(B, 'attack2'); addZone({ x: P.x, y: P.y, r: 62, t: 1.1, dmg: 1, src: B.name, fx: 'cargo', color: '#ffb347' });
    } else {
      setAn(B, 'special'); B.stT = 1.8; say('Отгоре падат контейнери!', 1.5, '#ffb347');
      const n = B.phase === 2 ? 9 : 6;
      for (let i = 0; i < n; i++) { const p = i === 0 ? { x: P.x, y: P.y } : bossRoomPoint(); addZone({ x: p.x, y: p.y, r: 55, t: 1.2 + i * 0.12, dmg: 1, src: B.name, fx: 'cargo', color: '#ffb347' }); }
    }
  },
  // Маестро Смях: бастун, призоваване, въртележка; във фаза 2 — тъмнина и прожектори
  maestro(B, dt, dx, dy, d, rate) {
    if (B.phase === 2) {
      B.vanish = (B.vanish || 3.5) - dt;
      if (B.vanish <= 0 && B.st === 'move') {
        B.vanish = 3.5; burst(B.x, B.y - 50, '#ffd568', 20, 200, 0.5);
        const p = bossRoomPoint(3); B.x = p.x; B.y = p.y; burst(B.x, B.y - 50, '#ffd568', 20, 200, 0.5);
      }
    }
    if (B.st !== 'move') { if (B.stT <= 0) { B.st = 'move'; B.cd = 1.6 / rate; } return; }
    bossDrift(B, dt, rate, 120, 210); B.cd -= dt * rate;
    if (B.cd > 0) return;
    const pat = nextPattern(B);
    B.st = pat; B.stT = 0.9;
    if (pat === 'cane') { setAn(B, 'attack1'); meleeZone(B, 90, 0.6, 1); }
    else if (pat === 'summon') {
      setAn(B, 'attack2'); B.stT = 1.1;
      const alive = lv.enemies.filter(e => e.minion && !e.dead).length;
      for (let i = 0; i < Math.min(2, 5 - alive); i++) spawnMinion(i ? 'glitch' : 'gloomy', B.x, B.y, true);
      say('Маестрото призова играчките си!', 1.6, '#ffd568');
    } else {
      setAn(B, 'special'); B.stT = 1.2;
      const c = bossCenter();
      lv.orbs = [];
      for (let i = 0; i < 8; i++) lv.orbs.push({ cx: c.x, cy: c.y, R: 150, a: i / 8 * Math.PI * 2, w: 1.5, t: 4.5 });
      if (B.phase === 2) for (let i = 0; i < 10; i++) lv.orbs.push({ cx: c.x, cy: c.y, R: 255, a: i / 10 * Math.PI * 2, w: -1.1, t: 4.5 });
      say('Въртележката се завъртя!', 1.5, '#ffd568');
    }
  },
  // Левиатанът: под водата е неуязвим; изскача при ухапване; вентилите го извеждат на повърхността
  leviathan(B, dt, dx, dy, d, rate) {
    const valves = lv.bossObjs.filter(o => o.type === 'valve');
    valves.forEach(v => { v.on -= dt; });
    if (valves.length && valves.every(v => v.on > 0) && B.submerged) {
      valves.forEach(v => { v.on = 0; });
      B.submerged = false; B.st = 'surface'; B.stT = 5; B.exposed = 5; setAn(B, 'hurt');
      say('Водата спадна — слабото място е открито!', 3, '#5dffc0'); burst(B.x, B.y, '#5dffc0', 40, 260, 0.8);
    }
    switch (B.st) {
      case 'surface':
        if (B.an !== 'attack1' || B.at > animLen('leviathan', 'attack1')) setAn(B, B.exposed > 0 ? 'hurt' : 'idle');
        if (B.stT <= 0) { B.submerged = true; B.st = 'move'; B.cd = 1.2; burst(B.x, B.y, '#5dffc0', 30, 220, 0.6); }
        break;
      case 'wait': if (B.stT <= 0) { B.st = 'move'; B.cd = 1.4 / rate; } break;
      default: {
        B.st = 'move'; setAn(B, 'walk');
        if (B.submerged) { const sp = 90 * rate; if (d > 60) moveCircle(B, dx / d * sp * dt, dy / d * sp * dt); }
        B.cd -= dt * rate;
        if (B.cd > 0) break;
        const pat = nextPattern(B);
        if (pat === 'bite') {
          B.st = 'wait'; B.stT = 1.2;
          addZone({ x: P.x, y: P.y, r: 75, t: 1.05, dmg: 2, src: B.name, fx: 'ripple', color: '#5dffc0', onDone: z => {
            B.x = z.x; B.y = z.y; B.submerged = false; B.st = 'surface'; B.stT = 2.6; setAn(B, 'attack1');
          } });
        } else if (pat === 'tentacle') {
          B.st = 'wait'; B.stT = 1.3; setAn(B, 'attack2');
          const n = B.phase === 2 ? 3 : 2, br = lv.bossRoom;
          for (let i = 0; i < n; i++) {
            const horiz = (i + B.pi) % 2 === 0, off = (Math.random() - 0.5) * 140;
            const z = horiz ? { x1: br.x * TILE, y1: P.y + off * (i ? 1 : 0), x2: (br.x + br.w) * TILE, y2: P.y + off * (i ? 1 : 0) }
              : { x1: P.x + off * (i ? 1 : 0), y1: br.y * TILE, x2: P.x + off * (i ? 1 : 0), y2: (br.y + br.h) * TILE };
            addZone(Object.assign({ kind: 'line', w: 60, t: 1.1 + i * 0.15, dmg: 1, src: B.name, fx: 'tentacle', color: '#5dffc0' }, z));
          }
        } else {
          B.st = 'wait'; B.stT = 1.5; setAn(B, 'special');
          const n = B.phase === 2 ? 9 : 6;
          for (let i = 0; i < n; i++) { const p = i === 0 ? { x: P.x, y: P.y } : bossRoomPoint(); addZone({ x: p.x, y: p.y, r: 50, t: 1.1 + i * 0.1, dmg: 1, src: B.name, fx: 'water', color: '#5dffc0' }); }
        }
      }
    }
  },
  // Огледалната кралица: огледални парчета, отражения (само истинската хвърля сянка), смяна на стаята
  queen(B, dt, dx, dy, d, rate) {
    if (B.phase === 2) {
      B.mirT = (B.mirT || 3) - dt;
      const mirrors = lv.bossObjs.filter(o => o.type === 'mirror');
      if (B.mirT <= 0 && B.st === 'move' && mirrors.length) {
        B.mirT = 3; const m = mirrors[Math.floor(Math.random() * mirrors.length)];
        burst(B.x, B.y - 50, '#d6a8ff', 20, 200, 0.5); B.x = m.x; B.y = m.y + 40; burst(B.x, B.y - 50, '#d6a8ff', 20, 200, 0.5);
      }
      B.watchT = (B.watchT || 6) - dt;
      if (B.watchT <= 0 && mirrors.length) {
        B.watchT = 9;
        if (lv.enemies.filter(e => e.minion && !e.dead && e.id === 'watcher').length < 2) { const m = mirrors[Math.floor(Math.random() * mirrors.length)]; spawnMinion('watcher', m.x, m.y + 40, true); say('От огледалото излезе Наблюдател!', 1.8, '#ff9a2a'); }
      }
    }
    if (B.st !== 'move') { if (B.stT <= 0) { B.st = 'move'; B.cd = 1.6 / rate; } return; }
    bossDrift(B, dt, rate, 160, 260); B.cd -= dt * rate;
    if (B.cd > 0) return;
    const pat = nextPattern(B), a = Math.atan2(dy + 50, dx);
    B.st = pat; B.stT = 0.9;
    if (pat === 'shards') {
      setAn(B, 'attack1'); const n = B.phase === 2 ? 7 : 5;
      for (let i = 0; i < n; i++) enemyBullet(B.x, B.y - 50, a + (i - (n - 1) / 2) * 0.17, 300, B.def.bullet, B.name, 8);
    } else if (pat === 'reflection') {
      setAn(B, 'attack2'); B.stT = 1;
      lv.enemies.forEach(e => { if (e.id === 'decoy') e.dead = true; });
      const spots = [B, bossRoomPoint(3), bossRoomPoint(3), bossRoomPoint(3)].map(p => ({ x: p.x, y: p.y }));
      for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
      B.x = spots[0].x; B.y = spots[0].y;
      spots.slice(1).forEach(p => { burst(p.x, p.y - 50, '#d6a8ff', 14, 160, 0.4); lv.enemies.push({ id: 'decoy', x: p.x, y: p.y, r: 30, hp: 1, max: 1, name: 'Отражение', color: '#d6a8ff', active: true, dead: false, face: 1, at: 0, an: 'idle', cd: 1.5 + Math.random(), life: 7, flash: 0, frozen: 0, slow: 0, kbx: 0, kby: 0, wander: 0, st: 'decoy', stT: 0 }); });
      say('Коя е истинската? Само тя хвърля сянка!', 2.4, '#d6a8ff');
    } else {
      setAn(B, 'special'); B.stT = 1.1; lv.flashT = 0.35;
      burst(B.x, B.y - 50, '#d6a8ff', 24, 220, 0.5);
      const p = bossRoomPoint(3); B.x = p.x; B.y = p.y;
      for (let k = 0; k < 14; k++) enemyBullet(B.x, B.y - 50, k / 14 * Math.PI * 2, 230, B.def.bullet, B.name, 8);
      say('Стаята се промени!', 1.4, '#d6a8ff');
    }
  },
  // Сърцето на гората: корени, семена-бомби, горска буря; във фаза 2 — пречистване
  heart(B, dt, dx, dy, d, rate) {
    if (B.st === 'cleansing') {
      B.cleansing -= dt; setAn(B, 'idle');
      if (Math.random() < 0.5) burst(B.x + (Math.random() - 0.5) * 140, B.y - Math.random() * 140, Math.random() < 0.5 ? '#c8ff6a' : '#ffe680', 2, 80, 1, 4);
      if (B.cleansing <= 0) killBoss();
      return;
    }
    if (B.st === 'exposed') { setAn(B, 'hurt'); return; }
    if (B.st === 'corrupt') {
      setAn(B, 'phase2'); B.cd -= dt;
      B.spawnT = (B.spawnT || 4) - dt;
      if (B.spawnT <= 0) { B.spawnT = 6; if (lv.enemies.filter(e => e.minion && !e.dead).length < 4) { const m = spawnMinion(Math.random() < 0.5 ? 'gloomy' : 'glitch', B.x, B.y + 90, true); m.cleansable = true; } }
      if (B.cd <= 0) { B.cd = 3.2; addZone({ x: P.x, y: P.y, r: 40, t: 1.0, dmg: 1, src: B.name, fx: 'roots', color: '#c04fff' }); }
      return;
    }
    if (B.st === 'storm') {
      setAn(B, 'special'); B.spinT = (B.spinT || 0) - dt;
      if (B.spinT <= 0) { B.spinT = 0.09; B.spin = (B.spin || 0) + 0.31; for (let k = 0; k < 2; k++) enemyBullet(B.x, B.y - 60, B.spin + k * Math.PI, 190, k ? '#a6ff5c' : '#c04fff', B.name, 7); }
      if (B.stT <= 0) { B.st = 'move'; B.cd = 1.6; }
      return;
    }
    if (B.st !== 'move') { if (B.stT <= 0) { B.st = 'move'; B.cd = 1.5 / rate; } return; }
    setAn(B, 'idle'); B.cd -= dt * rate;
    if (B.cd > 0) return;
    const pat = nextPattern(B);
    B.st = pat; B.stT = 1.2;
    if (pat === 'roots') {
      setAn(B, 'attack1'); addZone({ x: P.x, y: P.y, r: 42, t: 0.9, dmg: 1, src: B.name, fx: 'roots', color: '#c04fff' });
      for (let i = 0; i < 4; i++) addZone({ x: P.x + (Math.random() - 0.5) * 280, y: P.y + (Math.random() - 0.5) * 280, r: 42, t: 0.95 + i * 0.1, dmg: 1, src: B.name, fx: 'roots', color: '#c04fff' });
    } else if (pat === 'seeds') {
      setAn(B, 'attack2');
      for (let i = 0; i < 6; i++) { const p = i < 2 ? { x: P.x + (Math.random() - 0.5) * 80, y: P.y + (Math.random() - 0.5) * 80 } : bossRoomPoint(); addZone({ x: p.x, y: p.y, r: 58, t: 1.4 + i * 0.1, dmg: 1, src: B.name, fx: 'seed', color: '#c04fff' }); }
    } else { B.st = 'storm'; B.stT = 2.6; say('Горска буря!', 1.4, '#a6ff5c'); }
  },
};

function updateOrbs(dt) {
  lv.orbs.forEach(o => {
    o.t -= dt; o.a += o.w * dt;
    const x = o.cx + Math.cos(o.a) * o.R, y = o.cy + Math.sin(o.a) * o.R * 0.75;
    o.x = x; o.y = y;
    if (Math.hypot(P.x - x, P.y - y) < 22 + P.r * 0.5) hurt(1, 'Въртележката');
  });
  lv.orbs = lv.orbs.filter(o => o.t > 0);
}

// Действие [E] до панел или вентил в арената
function interactBossObj() {
  for (const o of lv.bossObjs) {
    if (Math.hypot(o.x - P.x, o.y - P.y) > 70) continue;
    if (o.type === 'panel') {
      if (o.cd > 0) { say(`Панелът се презарежда (${Math.ceil(o.cd)} с)`, 1.2); return true; }
      o.cd = 12; const B = lv.boss;
      if (B.active && !B.dead) { B.st = 'stun'; B.stT = 3.2; lv.zones = []; say('Кранозвярът е обездвижен!', 2, '#ffb347'); }
      burst(o.x, o.y, '#5fd4ff', 24, 220, 0.6); sfx('gate'); return true;
    }
    if (o.type === 'valve') {
      o.on = 8; burst(o.x, o.y, '#5dffc0', 20, 180, 0.5); sfx('pickup');
      const n = lv.bossObjs.filter(v => v.type === 'valve' && v.on > 0).length;
      if (n < 2) say(`Вентил ${n}/2 — завърти и другия (8 с)!`, 2, '#5dffc0');
      return true;
    }
  }
  return false;
}

// ---------- Рисуване на боса и арената ----------
function drawBossObjs(g, t) {
  lv.bossObjs.forEach(o => {
    if (o.type === 'panel') {
      g.fillStyle = '#2a2f36'; rrect(g, o.x - 20, o.y - 26, 40, 46, 6); g.fill();
      g.fillStyle = o.cd > 0 ? '#ff4f6a' : '#5fd4ff'; rrect(g, o.x - 13, o.y - 19, 26, 16, 3); g.fill();
      if (o.cd <= 0) glow(g, o.x, o.y - 11, 30, '#5fd4ff', 0.4 + 0.2 * Math.sin(t * 5));
      g.fillStyle = '#ffd568'; circle(g, o.x - 7, o.y + 8, 4); g.fill(); g.fillStyle = '#7dff9a'; circle(g, o.x + 7, o.y + 8, 4); g.fill();
    } else if (o.type === 'valve') {
      g.save(); g.translate(o.x, o.y); g.rotate(o.on > 0 ? t * 3 : 0);
      glow(g, 0, 0, 34, '#5dffc0', o.on > 0 ? 0.6 : 0.25);
      g.strokeStyle = o.on > 0 ? '#5dffc0' : '#ff6b5a'; g.lineWidth = 5; circle(g, 0, 0, 16); g.stroke();
      g.beginPath(); g.moveTo(-16, 0); g.lineTo(16, 0); g.moveTo(0, -16); g.lineTo(0, 16); g.stroke();
      g.restore();
    } else if (o.type === 'mirror') {
      glow(g, o.x, o.y - 30, 60, '#b45cff', 0.3);
      g.fillStyle = '#c9a050'; g.beginPath(); g.ellipse(o.x, o.y - 30, 30, 46, 0, 0, 7); g.fill();
      g.fillStyle = '#2a1a4a'; g.beginPath(); g.ellipse(o.x, o.y - 30, 24, 40, 0, 0, 7); g.fill();
      g.fillStyle = '#ffffff33'; g.beginPath(); g.ellipse(o.x - 8, o.y - 44, 5, 14, 0.3, 0, 7); g.fill();
    }
  });
  lv.orbs.forEach(o => { if (o.x === undefined) return; glow(g, o.x, o.y, 26, '#ffd568', 0.7); g.fillStyle = '#ffe9a0'; circle(g, o.x, o.y, 11); g.fill(); g.fillStyle = '#c0284a'; star(g, o.x, o.y, 7, 5); g.fill(); });
}
function drawBossSprite(g, B, t) {
  const feet = B.y + B.r * 0.8;
  if (B.id === 'leviathan' && B.submerged && B.st !== 'transform') {
    g.fillStyle = '#0c2a24cc'; g.beginPath(); g.ellipse(B.x, B.y, 70, 28, 0, 0, 7); g.fill();
    g.strokeStyle = hexA('#9fffe0', 0.5); g.lineWidth = 2;
    for (let k = 0; k < 3; k++) { const rr = 30 + ((t * 30 + k * 25) % 75); g.beginPath(); g.ellipse(B.x, B.y, rr, rr * 0.4, 0, 0, 7); g.stroke(); }
    glow(g, B.x - 14, B.y - 6, 14, '#ffb347', 0.8); glow(g, B.x + 14, B.y - 6, 14, '#ffb347', 0.8);
    return;
  }
  { g.fillStyle = '#0008'; g.beginPath(); g.ellipse(B.x, feet, B.r * 1.15, B.r * 0.32, 0, 0, 7); g.fill(); }
  if (B.cleansed || B.st === 'cleansing') glow(g, B.x, feet - B.h * 0.5, B.h * 1.3, '#c8ff6a', 0.5 + 0.15 * Math.sin(t * 3));
  else glow(g, B.x, feet - B.h * 0.5, B.h * 0.9, B.color, B.phase === 2 ? 0.3 : 0.16);
  if (B.st === 'stun') for (let i = 0; i < 4; i++) { const a = t * 4 + i * 1.6; g.fillStyle = '#ffe680'; star(g, B.x + Math.cos(a) * 34, feet - B.h - 8 + Math.sin(a) * 8, 7, 5); g.fill(); }
  const o = { flash: B.flash, alpha: B.alpha };
  if (B.cleansed || B.st === 'cleansing') o.filter = 'sepia(0.6) saturate(2.2) hue-rotate(35deg) brightness(1.25)';
  if (B.st === 'exposed') o.flash = 0.06 + 0.06 * Math.sin(t * 8);
  let anim = B.an;
  if (B.cleansed) anim = 'idle';
  // Във фаза 2 босът изглежда различно (кадрите от реда „Phase 2“)
  if (B.phase === 2 && !B.cleansed && B.st !== 'cleansing' && (anim === 'idle' || anim === 'walk')) anim = 'phase2';
  drawMon(g, B.id, anim, B.at, B.x, feet, B.face > 0, B.h, o);
  if (B.exposed > 0) { g.strokeStyle = `rgba(93,255,192,${0.5 + 0.4 * Math.sin(t * 10)})`; g.lineWidth = 3; circle(g, B.x, feet - B.h * 0.5, B.h * 0.55); g.stroke(); }
  if (B.st === 'exposed' && Math.hypot(P.x - B.x, P.y - B.y) < B.r + 90) tag(g, document.body.classList.contains('touchMode') ? '✦ Пречисти сърцето' : '[Q] Пречисти сърцето', B.x, feet - B.h - 18);
}
