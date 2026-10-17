import {
  actDefend,
  actFlee,
  actMelee,
  actMove,
  actShoot,
  activeUnit,
  actWait,
  aiAct,
  alive,
  attackHexes,
  autoResolve,
  battleHero,
  canCast,
  canFlee,
  canShoot,
  castSpell,
  COLS,
  hexDistance,
  hexIndex,
  hexNeighbors,
  hexQ,
  hexR,
  killedHp,
  previewAttack,
  reachable,
  ROWS,
  unitAt,
  unitAttack,
  unitById,
  unitDefense,
  unitMorale,
  unitSpeed,
  validSpellTarget,
  type Battle,
  type BUnit,
} from '../core/combat';
import { creature, hasAbility, stackLabel } from '../data/creatures';
import { SPELLS } from '../data/magic';
import type { GameState, SpellId } from '../core/types';
import type { App } from './app';
import { clear, esc, h, hideTip, modal, showTip } from './dom';
import { drawEmoji, drawPortrait, drawToken, hash2 } from './gfx';
import { creatureTip } from './widgets';
import { mapTheme, music, sfx } from './audio';

const SQ3 = Math.sqrt(3);

function drawRock(ctx: CanvasRenderingContext2D, x: number, y: number, R: number): void {
  ctx.fillStyle = '#0004';
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.45, R * 0.7, R * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8b8a80';
  ctx.beginPath();
  ctx.moveTo(x - R * 0.65, y + R * 0.45);
  ctx.lineTo(x - R * 0.45, y - R * 0.2);
  ctx.lineTo(x - R * 0.05, y - R * 0.5);
  ctx.lineTo(x + R * 0.45, y - R * 0.25);
  ctx.lineTo(x + R * 0.65, y + R * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#b3b1a5';
  ctx.beginPath();
  ctx.moveTo(x - R * 0.45, y - R * 0.2);
  ctx.lineTo(x - R * 0.05, y - R * 0.5);
  ctx.lineTo(x + R * 0.05, y + R * 0.1);
  ctx.closePath();
  ctx.fill();
}

function drawStump(ctx: CanvasRenderingContext2D, x: number, y: number, R: number): void {
  ctx.fillStyle = '#0004';
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.45, R * 0.6, R * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a4f2a';
  ctx.fillRect(x - R * 0.4, y - R * 0.2, R * 0.8, R * 0.6);
  ctx.beginPath();
  ctx.ellipse(x, y + R * 0.4, R * 0.4, R * 0.14, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = '#d9b07a';
  ctx.beginPath();
  ctx.ellipse(x, y - R * 0.2, R * 0.4, R * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9a6b3c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y - R * 0.2, R * 0.22, R * 0.08, 0, 0, Math.PI * 2);
  ctx.stroke();
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  t0: number;
}

const BG: Record<string, [string, string]> = {
  grass: ['#7aa653', '#55803a'],
  dirt: ['#a8875a', '#7a5e3a'],
  hills: ['#8aa35e', '#62783f'],
  swamp: ['#6c7f50', '#45573a'],
  snow: ['#eef3f6', '#b9c7d2'],
  town: ['#9c9583', '#6f6a5c'],
};

export class CombatScreen {
  private el: HTMLElement;
  private field: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logEl: HTMLElement;
  private infoEl: HTMLElement;
  private hint: HTMLElement;
  private buttons: HTMLElement;
  private b: Battle;
  private R = 34;
  private ox = 0;
  private oy = 0;
  private drawPos = new Map<number, { x: number; y: number }>();
  private anims: { dur: number; t0: number | null; step: (k: number) => void; done?: () => void }[] = [];
  private floaters: Floater[] = [];
  private flash = new Map<number, number>();
  private hoverHex: number | null = null;
  private mouse = { x: 0, y: 0 };
  private casting: SpellId | null = null;
  private auto = false;
  private alive = true;
  private raf = 0;
  private aiTimer: number | null = null;
  private ended = false;
  private startCounts: Map<number, number>;

  constructor(
    private app: App,
    private s: GameState,
    private onDone: () => void,
  ) {
    this.b = s.battle!;
    this.canvas = h('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.hint = h('div', { class: 'combat-hint' }, '');
    this.field = h('div', { class: 'combat-field' }, this.canvas, this.hint, h('div', { class: 'rotate-hint' }, '📱↻ Завърти телефона за по-голямо поле'));
    this.logEl = h('div', { class: 'combat-log' });
    this.infoEl = h('div', { style: 'min-width:210px;max-width:260px;font-size:13px' });
    this.buttons = h('div', { class: 'row wrap', style: 'justify-content:flex-end;max-width:380px' });
    this.el = h('div', { class: 'combat' }, this.field, h('div', { class: 'combat-bar' }, this.infoEl, this.logEl, this.buttons));
    this.startCounts = new Map(this.b.units.map((u) => [u.uid, u.n]));
  }

  mount(): void {
    music('combat');
    this.app.root.append(this.el);
    this.b.events = [];
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey, true);
    this.canvas.addEventListener('pointermove', this.onMove);
    // Touch: the tap position decides the target / attack side; long-press shows info.
    let press: number | null = null;
    this.canvas.addEventListener('pointerdown', (e) => {
      this.onMove(e);
      if (e.pointerType === 'mouse') return;
      press = window.setTimeout(() => {
        press = null;
        this.longPressed = true;
        this.onRight(e);
      }, 550);
    });
    const endPress = () => {
      if (press != null) clearTimeout(press);
      press = null;
    };
    this.canvas.addEventListener('pointerup', endPress);
    this.canvas.addEventListener('pointercancel', endPress);
    this.canvas.addEventListener('mouseleave', () => {
      this.hoverHex = null;
      hideTip();
    });
    this.canvas.addEventListener('click', this.onClick);
    this.canvas.addEventListener('contextmenu', this.onRight);
    for (const u of this.b.units) this.drawPos.set(u.uid, this.center(hexIndex(u.q, u.r)));
    this.renderBar();
    this.loop();
    this.schedule();
  }

  private destroy(): void {
    this.alive = false;
    music(mapTheme(this.s));
    cancelAnimationFrame(this.raf);
    if (this.aiTimer) clearTimeout(this.aiTimer);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey, true);
    hideTip();
    this.el.remove();
  }

  // -------------------------------------------------------------------------
  // Geometry
  // -------------------------------------------------------------------------

  private resize = (): void => {
    const r = this.field.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(r.width * dpr);
    this.canvas.height = Math.floor(r.height * dpr);
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const side = Math.min(150, r.width * 0.12);
    const availW = r.width - side * 2;
    const availH = r.height - 30;
    this.R = Math.max(16, Math.min(availW / ((COLS + 0.5) * SQ3), availH / ((ROWS - 1) * 1.5 + 2)));
    const gw = (COLS + 0.5) * SQ3 * this.R;
    const gh = ((ROWS - 1) * 1.5 + 2) * this.R;
    this.ox = (r.width - gw) / 2;
    this.oy = (r.height - gh) / 2 + 6;
    for (const u of this.b.units) this.drawPos.set(u.uid, this.center(hexIndex(u.q, u.r)));
  };

  private center(i: number): { x: number; y: number } {
    const q = hexQ(i);
    const r = hexR(i);
    return { x: this.ox + SQ3 * this.R * (q + 0.5 * (r & 1)) + (SQ3 * this.R) / 2, y: this.oy + this.R + r * 1.5 * this.R };
  }

  private hexAt(x: number, y: number): number | null {
    let best: number | null = null;
    let bd = Infinity;
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = this.center(i);
      const d = (c.x - x) ** 2 + (c.y - y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return bd <= this.R * this.R ? best : null;
  }

  // -------------------------------------------------------------------------
  // Flow
  // -------------------------------------------------------------------------

  private humanTurn(): boolean {
    const u = activeUnit(this.b);
    return !!u && !this.auto && this.b.sides[u.side].human && !this.b.over;
  }

  /** After animations finish: let the AI act, or wait for the player. */
  private schedule(): void {
    if (!this.alive) return;
    this.renderBar();
    if (this.anims.length) return;
    if (this.b.over) {
      if (!this.ended) {
        this.ended = true;
        window.setTimeout(() => this.showResult(), 450);
      }
      return;
    }
    if (this.humanTurn()) return;
    if (this.aiTimer) return;
    this.aiTimer = window.setTimeout(
      () => {
        this.aiTimer = null;
        if (!this.alive || this.b.over) return;
        aiAct(this.s, this.b);
        this.consumeEvents();
      },
      this.auto ? 140 : 420,
    );
  }

  private consumeEvents(): void {
    const evs = this.b.events.splice(0);
    for (const e of evs) {
      if (e.t === 'move') {
        const pts = [e.from, ...e.path].map((i) => this.center(i));
        const uid = e.uid;
        const per = this.auto ? 45 : 85;
        for (let k = 1; k < pts.length; k++) {
          const a = pts[k - 1];
          const bb = pts[k];
          this.anims.push({ dur: per, t0: null, step: (t) => this.drawPos.set(uid, { x: a.x + (bb.x - a.x) * t, y: a.y + (bb.y - a.y) * t }) });
        }
      } else if (e.t === 'hit') {
        const target = e.target;
        const isRanged = e.ranged;
        this.anims.push({ dur: 1, t0: null, step: () => {}, done: () => sfx(isRanged ? 'shoot' : 'hit') });
        const att = unitById(this.b, e.uid);
        const tu = unitById(this.b, target);
        if (e.ranged && att && tu) {
          const a = this.drawPos.get(att.uid)!;
          const dst = this.drawPos.get(target)!;
          const proj = { x: a.x, y: a.y };
          const icon = creature(att.cid).badge === '🏹' ? '➶' : '🌰';
          this.anims.push({
            dur: 220,
            t0: null,
            step: (t) => {
              proj.x = a.x + (dst.x - a.x) * t;
              proj.y = a.y + (dst.y - a.y) * t - Math.sin(t * Math.PI) * this.R;
              this.projectile = { ...proj, icon };
            },
            done: () => (this.projectile = null),
          });
        } else if (att) {
          const a = { ...this.drawPos.get(att.uid)! };
          const dst = this.drawPos.get(target)!;
          this.anims.push({
            dur: 160,
            t0: null,
            step: (t) => {
              const k = Math.sin(t * Math.PI) * 0.35;
              this.drawPos.set(att.uid, { x: a.x + (dst.x - a.x) * k, y: a.y + (dst.y - a.y) * k });
            },
          });
        }
        this.anims.push({
          dur: 260,
          t0: null,
          step: (t) => this.flash.set(target, 1 - t),
          done: () => {
            this.flash.delete(target);
            const p = this.drawPos.get(target)!;
            this.floaters.push({ x: p.x, y: p.y - this.R * 0.6, text: `${e.lucky ? '🍀 ' : ''}-${e.dmg}${e.killed ? ` (☠${e.killed})` : ''}`, color: e.lucky ? '#ffe36a' : '#ff8a7a', t0: performance.now() });
          },
        });
      } else if (e.t === 'spell') {
        const targets = e.targets;
        const icon = SPELLS[e.spell].icon;
        sfx('spell');
        this.anims.push({
          dur: 420,
          t0: null,
          step: (t) => {
            this.spellFx = { icon, targets, t };
          },
          done: () => {
            this.spellFx = null;
            for (const uid of targets) {
              const p = this.drawPos.get(uid);
              if (p && e.dmg) this.floaters.push({ x: p.x, y: p.y - this.R * 0.6, text: `-${e.dmg}`, color: '#9fd8ff', t0: performance.now() });
            }
          },
        });
      } else if (e.t === 'morale') {
        const p = this.drawPos.get(e.uid);
        if (e.good) sfx('morale');
        if (p) this.floaters.push({ x: p.x, y: p.y - this.R, text: e.good ? '🙂 Морал!' : '😟 Страх', color: e.good ? '#b8ff9a' : '#ffb0a0', t0: performance.now() });
      }
    }
    // Snap positions of units that did not animate.
    this.anims.push({
      dur: 1,
      t0: null,
      step: () => {},
      done: () => {
        for (const u of this.b.units) this.drawPos.set(u.uid, this.center(hexIndex(u.q, u.r)));
      },
    });
    this.renderLog();
  }

  private projectile: { x: number; y: number; icon: string } | null = null;
  private spellFx: { icon: string; targets: number[]; t: number } | null = null;

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private onMove = (e: MouseEvent): void => {
    const r = this.canvas.getBoundingClientRect();
    this.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
    this.hoverHex = this.hexAt(this.mouse.x, this.mouse.y);
    this.updateHint(e.clientX, e.clientY);
  };

  private updateHint(cx: number, cy: number): void {
    const b = this.b;
    const hx = this.hoverHex;
    const u = activeUnit(b);
    let text = '';
    this.canvas.style.cursor = 'default';
    if (hx != null) {
      const t = unitAt(b, hexQ(hx), hexR(hx));
      if (this.casting) {
        text = validSpellTarget(b, u?.side ?? 0, this.casting, hx) ? `✨ ${SPELLS[this.casting].name} върху това място` : 'Не може да се избере.';
        this.canvas.style.cursor = 'crosshair';
      } else if (t && u && this.humanTurn()) {
        if (t.side !== u.side) {
          if (canShoot(b, u)) {
            text = `🏹 ${previewAttack(this.s, b, t, true, 0)}`;
            this.canvas.style.cursor = 'crosshair';
          } else {
            const from = this.pickAttackHex(t);
            if (from != null) {
              const moved = from === hexIndex(u.q, u.r) ? 0 : (reachable(this.s, b, u).get(from)?.length ?? 0);
              text = `⚔️ ${previewAttack(this.s, b, t, false, moved)}`;
              this.canvas.style.cursor = 'pointer';
            } else text = 'Не може да стигне до тази цел този рунд.';
          }
        } else text = `${stackLabel(t.cid, t.n)} (десен бутон — подробности)`;
      } else if (t) text = `${stackLabel(t.cid, t.n)} (десен бутон — подробности)`;
      else if (u && this.humanTurn() && reachable(this.s, b, u).has(hx)) {
        text = '🥾 Премести се тук';
        this.canvas.style.cursor = 'pointer';
      }
    }
    if (!text && u) text = this.humanTurn() ? `Ред е на: ${stackLabel(u.cid, u.n)}` : `Ход на противника: ${stackLabel(u.cid, u.n)}`;
    this.hint.textContent = text;
    void cx;
    void cy;
  }

  /** The hex adjacent to the target from which to attack, chosen by mouse direction. */
  private pickAttackHex(t: BUnit): number | null {
    const u = activeUnit(this.b);
    if (!u) return null;
    const options = attackHexes(this.s, this.b, u, t);
    if (!options.length) return null;
    const tc = this.center(hexIndex(t.q, t.r));
    const ang = Math.atan2(this.mouse.y - tc.y, this.mouse.x - tc.x);
    let best = options[0];
    let bd = Infinity;
    for (const o of options) {
      const c = this.center(o);
      const a = Math.atan2(c.y - tc.y, c.x - tc.x);
      let d = Math.abs(a - ang);
      if (d > Math.PI) d = Math.PI * 2 - d;
      if (o === hexIndex(u.q, u.r)) d -= 0.4;
      if (d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }

  private longPressed = false;

  private onClick = (): void => {
    if (this.longPressed) {
      this.longPressed = false;
      return;
    }
    if (this.anims.length || !this.humanTurn()) return;
    const b = this.b;
    const hx = this.hoverHex;
    const u = activeUnit(b);
    if (hx == null || !u) return;
    if (this.casting) {
      if (castSpell(this.s, b, u.side, this.casting, hx)) {
        this.casting = null;
        this.consumeEvents();
      }
      return;
    }
    const t = unitAt(b, hexQ(hx), hexR(hx));
    let ok = false;
    if (t && t.side !== u.side) {
      if (canShoot(b, u)) ok = actShoot(this.s, b, t.uid);
      else {
        const from = this.pickAttackHex(t);
        if (from != null) ok = actMelee(this.s, b, t.uid, from);
      }
    } else if (!t) ok = actMove(this.s, b, hx);
    if (ok) this.consumeEvents();
  };

  private onRight = (e: MouseEvent): void => {
    if (e.cancelable) e.preventDefault();
    if (this.casting) {
      this.casting = null;
      this.renderBar();
      return;
    }
    const hx = this.hoverHex;
    if (hx == null) return;
    const t = unitAt(this.b, hexQ(hx), hexR(hx));
    if (!t) return;
    const eff = t.effects.map((x) => ({ haste: '💨 Бързина', shield: '🛡️ Кора', slow: '💧 Кал', bless: '🎵 Песен', web: '🕸️ Паяжина' })[x.id] + ` (${x.rounds})`).join(', ');
    showTip(
      e.clientX,
      e.clientY,
      `${creatureTip(t.cid, t.n)}<br><br>В битката: ⚔️${unitAttack(this.s, this.b, t)} 🛡️${unitDefense(this.s, this.b, t)} 💨${unitSpeed(this.s, this.b, t)} 🙂${unitMorale(this.s, this.b, t)}<br>❤️ Горният има ${t.hpTop}/${creature(t.cid).hp}${t.shots ? ` · 🏹 ${t.shots}` : ''}${eff ? `<br>${esc(eff)}` : ''}`,
    );
    window.setTimeout(hideTip, 3500);
  };

  private onKey = (e: KeyboardEvent): void => {
    if (this.app.root.querySelector('.overlay')) return;
    const k = e.key.toLowerCase();
    if (k === 'escape') {
      e.stopPropagation();
      this.casting = null;
      this.renderBar();
    } else if (k === 'w' && this.humanTurn() && !this.anims.length) this.doWait();
    else if (k === 'd' && this.humanTurn() && !this.anims.length) this.doDefend();
    else if (k === 'c' && this.humanTurn()) this.openBook();
    else if (k === 'a') this.toggleAuto();
    e.stopPropagation();
  };

  private doWait(): void {
    if (actWait(this.s, this.b) || actDefend(this.s, this.b)) this.consumeEvents();
  }
  private doDefend(): void {
    if (actDefend(this.s, this.b)) this.consumeEvents();
  }

  private humanSide(): 0 | 1 {
    return this.b.sides[0].human ? 0 : 1;
  }

  private toggleAuto(): void {
    this.auto = !this.auto;
    this.casting = null;
    this.renderBar();
    this.schedule();
  }

  private quick(): void {
    // Resolve instantly, then show the result.
    this.anims = [];
    this.b.events = [];
    autoResolve(this.s, this.b);
    this.b.events = [];
    for (const u of this.b.units) this.drawPos.set(u.uid, this.center(hexIndex(u.q, u.r)));
    this.renderLog();
    this.schedule();
  }

  private flee(): void {
    actFlee(this.b, this.humanSide());
    this.schedule();
  }

  private openBook(): void {
    const side = this.humanSide();
    const hero = battleHero(this.s, this.b, side);
    if (!hero) return;
    const book = h('div', { class: 'spellbook' });
    let close = () => {};
    const combatSpells = hero.spells.filter((sp) => SPELLS[sp].target !== 'adventure');
    if (!combatSpells.length) book.append(h('div', null, 'Героят не знае бойни магии. Построй Библиотека.'));
    for (const sp of combatSpells) {
      const ok = canCast(this.s, this.b, side, sp) && this.humanTurn();
      book.append(
        h('div', {
          class: `spell${ok ? '' : ' off'}`,
          onclick: () => {
            if (!ok) return;
            close();
            this.casting = sp;
            this.renderBar();
          },
        },
        h('div', { class: 'nm' }, `${SPELLS[sp].icon} ${SPELLS[sp].name}`),
        h('div', { style: 'font-size:13px' }, `${SPELLS[sp].cost} магия · ${SPELLS[sp].desc}`)),
      );
    }
    close = modal(this.app.root, h('div', null, h('h2', null, `📖 Магиите на ${hero.name} (✨ ${hero.sp})`), this.b.sides[side].castThisRound ? h('p', null, 'Вече направи магия този рунд.') : null, book), { parch: true });
  }

  private renderBar(): void {
    const b = this.b;
    const u = activeUnit(b);
    clear(this.infoEl);
    if (u) {
      const c = creature(u.cid);
      this.infoEl.append(
        h('div', { style: 'font-weight:800;font-size:15px' }, `${c.icon} ${stackLabel(u.cid, u.n)}`),
        h('div', { class: 'muted' }, `⚔️${unitAttack(this.s, b, u)} 🛡️${unitDefense(this.s, b, u)} 💥${c.dmin}–${c.dmax} 💨${unitSpeed(this.s, b, u)}${u.shots ? ` 🏹${u.shots}` : ''}`),
        h('div', { class: 'muted' }, `Рунд ${b.round}${this.auto ? ' · ⚡ авто' : ''}`),
      );
    }
    clear(this.buttons);
    const human = this.humanTurn() && !this.anims.length;
    const side = this.humanSide();
    const hero = battleHero(this.s, b, side);
    if (this.casting) {
      this.buttons.append(h('span', { style: 'font-weight:800' }, `✨ ${SPELLS[this.casting].name}: избери цел`), h('button', { onclick: () => { this.casting = null; this.renderBar(); } }, 'Отказ'));
      return;
    }
    this.buttons.append(
      h('button', { disabled: !human, title: 'Изчакай до края на рунда (W)', onclick: () => this.doWait() }, '⏳ Изчакай'),
      h('button', { disabled: !human, title: 'Отбрана: +20% защита (D)', onclick: () => this.doDefend() }, '🛡️ Защита'),
      h('button', { disabled: !human || !hero, title: 'Магии (C)', onclick: () => this.openBook() }, '📖 Магия'),
      h('button', { class: this.auto ? 'primary' : '', disabled: b.over, title: 'Автоматична битка (A)', onclick: () => this.toggleAuto() }, this.auto ? '⏸ Ръчно' : '🤖 Авто'),
      h('button', { disabled: b.over, title: 'Изиграй битката веднага', onclick: () => this.quick() }, '⚡ Бързо'),
      h('button', { class: 'danger', disabled: !canFlee(b, side) || b.over, title: 'Героят отстъпва към най-близкия град и губи армията си', onclick: () => this.flee() }, '🏳️ Бягство'),
    );
  }

  private renderLog(): void {
    clear(this.logEl);
    for (const line of this.b.log.slice(-40)) this.logEl.append(h('div', null, line));
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }

  private showResult(): void {
    const b = this.b;
    const side = this.humanSide();
    const won = b.winner === side;
    const fled = b.fled === side;
    const lossesOf = (sd: 0 | 1) =>
      b.units
        .filter((u) => u.side === sd && u.slot >= 0)
        .map((u) => ({ cid: u.cid, lost: Math.max(0, (this.startCounts.get(u.uid) ?? u.startN) - u.n) }))
        .filter((x) => x.lost > 0);
    const list = (sd: 0 | 1) => {
      const l = lossesOf(sd);
      return l.length ? l.map((x) => h('div', null, `${creature(x.cid).icon} ${stackLabel(x.cid, x.lost)}`)) : [h('div', { class: 'muted' }, 'Без загуби')];
    };
    const xp = won ? killedHp(b, side) + (b.kind === 'hero' ? 500 : 0) : 0;
    sfx(won ? 'victory' : 'defeat');
    let close = () => {};
    const box = h(
      'div',
      { class: 'endscreen', style: 'width:min(560px,90vw)' },
      h('div', { class: 'big' }, fled ? '🏳️ Отстъпление' : won ? '🏆 Победа!' : '💀 Поражение'),
      h('p', { style: 'font-size:16px' }, fled ? 'Героят се изтегли към най-близкия град. Армията му се разпиля.' : won ? `${b.sides[side].name} спечели битката.${xp ? ` Опит: около ${xp}.` : ''}` : `${b.sides[side].name} загуби битката.`),
      h('div', { class: 'result-grid' },
        h('div', null, h('h3', null, `Загуби: ${b.sides[0].name}`), ...list(0)),
        h('div', null, h('h3', null, `Загуби: ${b.sides[1].name}`), ...list(1))),
      h('div', { class: 'spacer' }),
      h('button', { class: 'primary', onclick: () => { close(); this.destroy(); this.onDone(); } }, 'Продължи'),
    );
    close = modal(this.app.root, box, { closable: false });
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private loop = (): void => {
    if (!this.alive) return;
    const now = performance.now();
    // advance animations (sequential)
    while (this.anims.length) {
      const a = this.anims[0];
      if (a.t0 == null) a.t0 = now;
      const k = Math.min(1, (now - a.t0) / a.dur);
      a.step(k);
      if (k < 1) break;
      this.anims.shift();
      a.done?.();
      if (!this.anims.length) this.schedule();
    }
    this.draw(now);
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(now: number): void {
    const ctx = this.ctx;
    const r = this.field.getBoundingClientRect();
    const b = this.b;
    const [c1, c2] = BG[b.terrain] ?? BG.grass;
    const g = ctx.createLinearGradient(0, 0, 0, r.height);
    g.addColorStop(0, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, r.width, r.height);
    // scattered decoration
    for (let i = 0; i < 40; i++) {
      const x = hash2(i, 3) * r.width;
      const y = hash2(i, 7) * r.height;
      ctx.fillStyle = '#ffffff10';
      ctx.beginPath();
      ctx.arc(x, y, 3 + hash2(i, 9) * 6, 0, Math.PI * 2);
      ctx.fill();
    }

    const u = activeUnit(b);
    const human = this.humanTurn() && !this.anims.length;
    const reach = u && human && !this.casting ? reachable(this.s, b, u) : new Map<number, number[]>();
    const R = this.R;
    // hex grid
    for (let i = 0; i < COLS * ROWS; i++) {
      const c = this.center(i);
      this.hexPath(c.x, c.y, R * 0.97);
      if (reach.has(i)) {
        ctx.fillStyle = '#ffffff30';
        ctx.fill();
      }
      ctx.strokeStyle = '#00000030';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // hover
    if (this.hoverHex != null && human) {
      const c = this.center(this.hoverHex);
      this.hexPath(c.x, c.y, R * 0.97);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      const t = unitAt(b, hexQ(this.hoverHex), hexR(this.hoverHex));
      if (t && u && t.side !== u.side && !canShoot(b, u) && !this.casting) {
        const from = this.pickAttackHex(t);
        if (from != null) {
          const fc = this.center(from);
          this.hexPath(fc.x, fc.y, R * 0.97);
          ctx.fillStyle = '#ffe08a55';
          ctx.fill();
        }
      }
      if (this.casting && SPELLS[this.casting].target === 'area') {
        for (const [q, rr] of hexNeighbors(hexQ(this.hoverHex), hexR(this.hoverHex))) {
          const nc = this.center(hexIndex(q, rr));
          this.hexPath(nc.x, nc.y, R * 0.97);
          ctx.fillStyle = '#ffb04a44';
          ctx.fill();
        }
      }
    }
    // obstacles
    for (const o of b.obstacles) {
      const c = this.center(o);
      if (hash2(o, 1) > 0.5) drawRock(ctx, c.x, c.y, R);
      else drawStump(ctx, c.x, c.y, R);
    }
    // heroes at the sides
    for (const sd of [0, 1] as const) {
      const side = b.sides[sd];
      const x = sd === 0 ? Math.max(48, this.ox - 56) : Math.min(r.width - 48, this.ox + (COLS + 0.5) * SQ3 * R + 56);
      const y = this.oy + R * 3;
      if (side.heroId) {
        drawPortrait(ctx, side.portrait, x, y, Math.min(46, R * 1.3));
        ctx.font = '800 14px Nunito, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000b';
        ctx.strokeText(side.name, x, y + Math.min(46, R * 1.3) + 18);
        ctx.fillStyle = '#fff3d6';
        ctx.fillText(side.name, x, y + Math.min(46, R * 1.3) + 18);
      }
    }
    // units
    const units = [...b.units].filter((x) => x.n > 0).sort((a, c) => a.r - c.r);
    for (const un of units) {
      const p = this.drawPos.get(un.uid) ?? this.center(hexIndex(un.q, un.r));
      const c = creature(un.cid);
      const isActive = u && un.uid === u.uid;
      const fl = this.flash.get(un.uid) ?? 0;
      const ring = un.side === 0 ? '#5fd06a' : '#e05a4a';
      ctx.fillStyle = '#0005';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + R * 0.62, R * 0.62, R * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      if (isActive) {
        const pulse = 0.5 + 0.5 * Math.sin(now / 160);
        ctx.strokeStyle = `rgba(255,224,120,${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R * 0.8, 0, Math.PI * 2);
        ctx.stroke();
      }
      drawToken(ctx, p.x, p.y, R * 0.68, c.icon, {
        ring,
        fill: fl > 0 ? '#ff6a5a' : un.side === 0 ? '#3e5a34' : '#5a3434',
        badge: c.badge,
        flip: un.side === 0,
      });
      if (hasAbility(un.cid, 'immobile')) continue;
      // count plate
      const txt = String(un.n);
      ctx.font = `800 ${Math.round(R * 0.38)}px Nunito, sans-serif`;
      const w = ctx.measureText(txt).width + 10;
      ctx.fillStyle = un.side === 0 ? '#2f6b2c' : '#7a2a24';
      ctx.fillRect(p.x + R * 0.2, p.y + R * 0.4, w, R * 0.42);
      ctx.strokeStyle = '#000a';
      ctx.lineWidth = 1;
      ctx.strokeRect(p.x + R * 0.2, p.y + R * 0.4, w, R * 0.42);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, p.x + R * 0.2 + w / 2, p.y + R * 0.62);
      ctx.textBaseline = 'alphabetic';
      // effects
      un.effects.forEach((e, i) => {
        const icon = { haste: '💨', shield: '🛡️', slow: '💧', bless: '🎵', web: '🕸️' }[e.id];
        drawEmoji(ctx, icon, p.x - R * 0.6 + i * R * 0.34, p.y - R * 0.72, R * 0.3);
      });
      if (un.defending) drawEmoji(ctx, '🛡️', p.x - R * 0.62, p.y + R * 0.5, R * 0.34);
    }
    // projectile & spell
    if (this.projectile) drawEmoji(ctx, this.projectile.icon, this.projectile.x, this.projectile.y, R * 0.5);
    if (this.spellFx) {
      for (const uid of this.spellFx.targets) {
        const p = this.drawPos.get(uid);
        if (!p) continue;
        const t = this.spellFx.t;
        ctx.globalAlpha = 1 - t;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 + t * 3;
          drawEmoji(ctx, this.spellFx.icon, p.x + Math.cos(a) * R * 0.7 * (1 - t * 0.4), p.y + Math.sin(a) * R * 0.7 * (1 - t * 0.4) - t * R * 0.3, R * 0.42);
        }
        ctx.globalAlpha = 1;
      }
    }
    // floaters
    this.floaters = this.floaters.filter((f) => now - f.t0 < 1300);
    for (const f of this.floaters) {
      const k = (now - f.t0) / 1300;
      ctx.globalAlpha = 1 - k;
      ctx.font = `800 ${Math.round(R * 0.48)}px Nunito, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000';
      ctx.strokeText(f.text, f.x, f.y - k * R);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y - k * R);
      ctx.globalAlpha = 1;
    }
    // turn order strip
    this.drawQueue(ctx, r.width);
    void alive;
    void hexDistance;
  }

  private drawQueue(ctx: CanvasRenderingContext2D, width: number): void {
    const b = this.b;
    const ids = [b.active, ...b.queue, ...b.waitQueue].filter((x): x is number => x != null);
    const units = ids.map((id) => unitById(b, id)).filter((u): u is BUnit => !!u && u.n > 0).slice(0, 12);
    const size = 30;
    const x0 = width - units.length * (size + 4) - 10;
    units.forEach((u, i) => {
      drawToken(ctx, x0 + i * (size + 4) + size / 2, this.oy - 2 > size ? this.oy - size / 2 - 4 : size / 2 + 40, size / 2 - 1, creature(u.cid).icon, {
        ring: u.side === 0 ? '#5fd06a' : '#e05a4a',
        fill: i === 0 ? '#8a6a2a' : '#3a2e22',
      });
    });
  }

  private hexPath(x: number, y: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const px = x + r * Math.cos(a);
      const py = y + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
}
