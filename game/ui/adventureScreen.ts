import {
  dailyIncome,
  dayLabel,
  endPlayerTurn,
  finishBattle,
  heroStep,
  MINE_INFO,
  pathTo,
  playerHeroes,
  playerTowns,
  RES_INFO,
  resolvePrompt,
  SHRINE_INFO,
  startNewDay,
} from '../core/adventure';
import { aiStep, newAiCursor, type AiCursor } from '../core/ai';
import { heroMaxMp, maxSp, VIRTUE_INFO, virtueRank } from '../core/hero';
import { guardingMonster, heroAt, isExplored, objectAt, reveal, terrainDef, tileAt, townAt, type PathStep } from '../core/map';
import { visitTown } from '../core/town';
import type { GameState, Hero, MapObject, ResKey } from '../core/types';
import { RES_KEYS, VIRTUES } from '../core/types';
import { creature, sizeWord, stackLabel } from '../data/creatures';
import { ARTIFACTS, SPELLS } from '../data/magic';
import { getScenario } from '../data/scenarios';
import type { App } from './app';
import { CombatScreen } from './combatScreen';
import { playDialogue } from './dialogue';
import { clear, confirmBox, esc, h, hideTip, infoBox, modal, showTip } from './dom';
import { drawPortrait, image, portraitCanvas } from './gfx';
import { drawHero, drawObject, drawTownAt, renderTerrain } from './mapRender';
import { heroPanel, levelUpModal, questLog, saveLoadModal } from './panels';
import { saveGame } from './save';
import { TownScreen } from './townScreen';

const ZOOMS = [40, 48, 56, 64, 76];

export class AdventureScreen {
  readonly el: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mini: HTMLCanvasElement;
  private mapWrap: HTMLElement;
  private sidebar: HTMLElement;
  private topbar: HTMLElement;
  private status: HTMLElement;
  private toastBox: HTMLElement;
  private zoomIdx = 2;
  private T = ZOOMS[2];
  private terrainCache: HTMLCanvasElement | null = null;
  private fogCanvas: HTMLCanvasElement;
  private camX = 0;
  private camY = 0;
  private selId: string | null = null;
  private path: PathStep[] | null = null;
  private busy = false;
  private pumping = false;
  private hover: { x: number; y: number } | null = null;
  private raf = 0;
  private alive = true;
  private keys = new Set<string>();
  private drag: { x: number; y: number; cx: number; cy: number; moved: boolean } | null = null;
  private banner: HTMLElement | null = null;
  private aiCursor: AiCursor | null = null;
  private lastSideKey = '';

  constructor(
    private app: App,
    public s: GameState,
  ) {
    this.canvas = h('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.mini = h('canvas', { class: 'minimap' });
    this.fogCanvas = document.createElement('canvas');
    this.mapWrap = h('div', { class: 'mapwrap' }, this.canvas);
    this.toastBox = h('div', { class: 'toasts' });
    this.mapWrap.append(this.toastBox);
    this.topbar = h('div', { class: 'topbar' });
    this.sidebar = h('div', { class: 'sidebar' });
    this.status = h('div', { class: 'statusbar' }, 'Щракни върху поле, за да видиш пътя. Щракни пак, за да тръгнеш.');
    this.el = h('div', { class: 'screen adv' }, this.topbar, this.mapWrap, this.sidebar, this.status);
    this.bindInput();
    const first = playerHeroes(s, 'player')[0];
    this.selId = first?.id ?? null;
    image('img/mishkontin-idle.webp', () => this.refreshSidebar(true));
  }

  mount(): void {
    this.app.root.append(this.el);
    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    const hero = this.selected();
    if (hero) this.centerOn(hero.x, hero.y);
    this.refreshAll();
    this.loop();
    if (this.s.turn === 'enemy') this.runAi();
    else this.pump();
  }

  destroy(): void {
    this.alive = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    hideTip();
    this.el.remove();
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  selected(): Hero | undefined {
    const h = this.s.heroes.find((x) => x.id === this.selId && x.alive && x.owner === 'player');
    return h;
  }

  private resize = (): void => {
    const r = this.mapWrap.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.floor(r.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(r.height * dpr));
    this.canvas.style.width = `${r.width}px`;
    this.canvas.style.height = `${r.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.clampCam();
    this.drawMinimap();
  };

  private viewW(): number {
    return this.canvas.width / Math.min(2, window.devicePixelRatio || 1);
  }
  private viewH(): number {
    return this.canvas.height / Math.min(2, window.devicePixelRatio || 1);
  }

  private clampCam(): void {
    const maxX = Math.max(0, this.s.w * this.T - this.viewW());
    const maxY = Math.max(0, this.s.h * this.T - this.viewH());
    this.camX = Math.max(Math.min(this.camX, maxX), Math.min(0, (this.s.w * this.T - this.viewW()) / 2));
    this.camY = Math.max(Math.min(this.camY, maxY), Math.min(0, (this.s.h * this.T - this.viewH()) / 2));
    if (this.s.w * this.T < this.viewW()) this.camX = (this.s.w * this.T - this.viewW()) / 2;
    if (this.s.h * this.T < this.viewH()) this.camY = (this.s.h * this.T - this.viewH()) / 2;
  }

  centerOn(x: number, y: number): void {
    this.camX = x * this.T + this.T / 2 - this.viewW() / 2;
    this.camY = y * this.T + this.T / 2 - this.viewH() / 2;
    this.clampCam();
  }

  private ensureVisible(x: number, y: number): void {
    const px = x * this.T - this.camX;
    const py = y * this.T - this.camY;
    const m = this.T * 2;
    if (px < m || py < m || px > this.viewW() - m || py > this.viewH() - m) this.centerOn(x, y);
  }

  private tileFromEvent(e: MouseEvent): { x: number; y: number } | null {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left + this.camX) / this.T);
    const y = Math.floor((e.clientY - r.top + this.camY) / this.T);
    if (x < 0 || y < 0 || x >= this.s.w || y >= this.s.h) return null;
    return { x, y };
  }

  private setZoom(dir: number): void {
    const idx = Math.max(0, Math.min(ZOOMS.length - 1, this.zoomIdx + dir));
    if (idx === this.zoomIdx) return;
    const cx = (this.camX + this.viewW() / 2) / this.T;
    const cy = (this.camY + this.viewH() / 2) / this.T;
    this.zoomIdx = idx;
    this.T = ZOOMS[idx];
    this.terrainCache = null;
    this.camX = cx * this.T - this.viewW() / 2;
    this.camY = cy * this.T - this.viewH() / 2;
    this.clampCam();
  }

  // -------------------------------------------------------------------------
  // Input
  // -------------------------------------------------------------------------

  private bindInput(): void {
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.drag = { x: e.clientX, y: e.clientY, cx: this.camX, cy: this.camY, moved: false };
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.alive) return;
      if (this.drag && e.buttons & 1) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) this.drag.moved = true;
        if (this.drag.moved) {
          this.camX = this.drag.cx - dx;
          this.camY = this.drag.cy - dy;
          this.clampCam();
        }
      }
    });
    window.addEventListener('mouseup', (e) => {
      if (!this.alive || !this.drag) return;
      const d = this.drag;
      this.drag = null;
      if (!d.moved && e.target === this.canvas) {
        const t = this.tileFromEvent(e);
        if (t) this.clickTile(t.x, t.y);
      }
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const t = this.tileFromEvent(e);
      this.hover = t;
      if (t) {
        const info = this.describe(t.x, t.y);
        this.status.textContent = info.replace(/<[^>]+>/g, '');
      }
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.hover = null;
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const t = this.tileFromEvent(e);
      if (t) this.inspect(t.x, t.y, e.clientX, e.clientY);
    });
    this.canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.setZoom(e.deltaY < 0 ? 1 : -1);
      },
      { passive: false },
    );
    this.mini.addEventListener('mousedown', (e) => {
      const r = this.mini.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * this.s.w;
      const y = ((e.clientY - r.top) / r.height) * this.s.h;
      this.centerOn(Math.floor(x), Math.floor(y));
    });
  }

  private onKey = (e: KeyboardEvent): void => {
    if (this.app.root.querySelector('.overlay') || this.busy) return;
    const k = e.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'w', 's', 'd'].includes(k)) {
      this.keys.add(k);
      e.preventDefault();
    } else if (k === 'e') this.endTurn();
    else if (k === 'h') this.nextHero();
    else if (k === 't') this.openTown();
    else if (k === ' ' || k === 'enter') {
      e.preventDefault();
      if (this.path) this.walk();
    } else if (k === 'c') {
      const hh = this.selected();
      if (hh) this.centerOn(hh.x, hh.y);
    } else if (k === '+' || k === '=') this.setZoom(1);
    else if (k === '-') this.setZoom(-1);
    else if (k === 'q') questLog(this.app.root, this.s);
    else if (k === 'escape') this.app.gameMenu(this);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private clickTile(x: number, y: number): void {
    if (this.busy || this.s.turn !== 'player' || this.s.status !== 'play') return;
    const s = this.s;
    const own = heroAt(s, x, y);
    const hero = this.selected();
    if (own && own.owner === 'player') {
      if (hero && own.id === hero.id) {
        const t = townAt(s, x, y);
        if (t && t.owner === 'player') this.openTown(t.id);
        else this.openHero(own);
      } else {
        this.select(own);
      }
      return;
    }
    const town = townAt(s, x, y);
    if (town && town.owner === 'player' && (!hero || (hero.x === x && hero.y === y))) {
      this.openTown(town.id);
      return;
    }
    if (!hero) return;
    const end = this.pathEnd();
    if (this.path && end && end.x === x && end.y === y) {
      this.walk();
      return;
    }
    if (!isExplored(s, 'player', x, y)) {
      this.status.textContent = 'Там още не си бил. Опитай „Поглед от високо“ или се приближи.';
      return;
    }
    const p = pathTo(s, hero, x, y);
    if (!p) {
      this.path = null;
      if (town && town.owner === 'player') this.openTown(town.id);
      else this.status.textContent = 'Не може да се стигне дотам.';
      return;
    }
    this.path = p;
    const today = p.filter((st) => st.cost <= hero.mp).length;
    const days = Math.ceil(p[p.length - 1].cost / heroMaxMp(hero));
    this.status.textContent = `Път: ${p.length} полета. ${today === p.length ? 'Стигаш днес.' : `Около ${days} ${days === 1 ? 'ден' : 'дни'}.`} Щракни пак (или Интервал), за да тръгнеш.`;
  }

  private pathEnd(): PathStep | null {
    return this.path && this.path.length ? this.path[this.path.length - 1] : null;
  }

  select(hero: Hero): void {
    this.selId = hero.id;
    this.path = null;
    this.centerOn(hero.x, hero.y);
    this.refreshSidebar(true);
  }

  private nextHero(): void {
    const list = playerHeroes(this.s, 'player');
    if (!list.length) return;
    const i = list.findIndex((x) => x.id === this.selId);
    this.select(list[(i + 1) % list.length]);
  }

  // -------------------------------------------------------------------------
  // Movement
  // -------------------------------------------------------------------------

  private walk(): void {
    const hero = this.selected();
    if (!hero || !this.path || this.busy) return;
    this.busy = true;
    const stepOnce = () => {
      if (!this.alive) return;
      const p = this.path?.[0];
      if (!p) {
        this.busy = false;
        this.afterWalk(hero);
        return;
      }
      const r = heroStep(this.s, hero, p.x, p.y);
      if (r === 'moved') {
        this.path!.shift();
        this.ensureVisible(hero.x, hero.y);
        this.refreshTop();
        if (this.path!.length) {
          window.setTimeout(stepOnce, 95);
          return;
        }
      }
      if (r === 'blocked' && hero.mp < 100) this.status.textContent = `${hero.name} е изморен за днес. Натисни „Край на хода“.`;
      if (r !== 'moved') this.path = r === 'blocked' ? this.path : null;
      else this.path = null;
      this.busy = false;
      this.afterWalk(hero);
    };
    stepOnce();
  }

  private afterWalk(hero: Hero): void {
    const t = townAt(this.s, hero.x, hero.y);
    if (t && t.owner === 'player') {
      visitTown(this.s, hero, t);
      this.pump(() => this.openTown(t.id));
      return;
    }
    this.pump();
  }

  // -------------------------------------------------------------------------
  // Event pump: battle -> dialogues -> prompts -> level-ups -> end
  // -------------------------------------------------------------------------

  pump(then?: () => void): void {
    if (this.pumping) return;
    this.pumping = true;
    const s = this.s;
    const next = () => {
      this.pumping = false;
      this.pump(then);
    };
    this.showToasts();
    this.refreshAll();
    if (s.battle) {
      const cs = new CombatScreen(this.app, s, () => {
        finishBattle(s);
        next();
      });
      cs.mount();
      return;
    }
    if (s.pendingDialogues.length) {
      playDialogue(this.app.root, s, s.pendingDialogues[0], next);
      return;
    }
    if (s.prompt) {
      this.showPrompt(next);
      return;
    }
    const lvl = s.heroes.find((x) => x.alive && x.owner === 'player' && x.pendingLevelUps.length);
    if (lvl) {
      levelUpModal(this.app.root, s, lvl, next);
      return;
    }
    if (s.status !== 'play') {
      this.pumping = false;
      this.app.showEnd(s);
      return;
    }
    this.pumping = false;
    if (!this.selected()) {
      const first = playerHeroes(s, 'player')[0];
      if (first) this.select(first);
    }
    then?.();
  }

  private showPrompt(next: () => void): void {
    const s = this.s;
    const p = s.prompt!;
    if (p.kind === 'info') {
      infoBox(this.app.root, p.title, p.text, p.icon, () => {
        resolvePrompt(s, 0);
        next();
      });
      return;
    }
    let close = () => {};
    const choose = (i: number) => {
      close();
      resolvePrompt(s, i);
      next();
    };
    if (p.kind === 'chest') {
      const box = h(
        'div',
        { style: 'max-width:440px;text-align:center' },
        h('div', { class: 'emoji', style: 'font-size:54px' }, '🧰'),
        h('h3', null, 'Сандък със съкровище!'),
        h('p', null, 'Какво ще вземеш?'),
        h('div', { class: 'row', style: 'justify-content:center' },
          h('button', { class: 'primary', onclick: () => choose(0) }, `🌰 ${p.acorns} жълъда`),
          h('button', { class: 'primary', onclick: () => choose(1) }, `⭐ ${p.xp} опит`),
        ),
      );
      close = modal(this.app.root, box, { closable: false, parch: true });
    } else if (p.kind === 'join') {
      const c = creature(p.cid);
      const can = s.players.player.res.acorns >= p.cost;
      const box = h(
        'div',
        { style: 'max-width:460px;text-align:center' },
        h('div', { class: 'emoji', style: 'font-size:54px' }, c.icon),
        h('h3', null, `${stackLabel(p.cid, p.n)} искат да тръгнат с теб!`),
        h('p', null, 'Добротата ти е позната в гората. Те няма да се бият — питат дали могат да станат твои приятели.'),
        h('div', { class: 'row wrap', style: 'justify-content:center' },
          h('button', { class: 'primary', disabled: !can, onclick: () => choose(0) }, p.cost ? `Приеми (${p.cost} 🌰)` : 'Приеми безплатно'),
          h('button', { onclick: () => choose(1) }, '⚔️ Битка'),
          h('button', { onclick: () => choose(2) }, 'Отмини'),
        ),
      );
      close = modal(this.app.root, box, { closable: false, parch: true });
    }
  }

  private showToasts(): void {
    const list = this.s.toasts.splice(0);
    for (const t of list) {
      const el = h('div', { class: 'toast' }, t.icon ? h('span', { class: 'emoji' }, `${t.icon} `) : null, t.text);
      this.toastBox.append(el);
      window.setTimeout(() => el.remove(), 3800);
      while (this.toastBox.children.length > 5) this.toastBox.firstElementChild?.remove();
    }
  }

  // -------------------------------------------------------------------------
  // Turns
  // -------------------------------------------------------------------------

  endTurn(): void {
    if (this.busy || this.s.turn !== 'player' || this.s.status !== 'play') return;
    const tired = playerHeroes(this.s, 'player').filter((x) => x.mp >= heroMaxMp(x) * 0.5);
    const go = () => {
      endPlayerTurn(this.s);
      this.runAi();
    };
    if (tired.length) confirmBox(this.app.root, `${tired.map((x) => x.name).join(', ')} още може да се движи. Да приключа ли хода?`, 'Край на хода', go);
    else go();
  }

  private runAi(): void {
    this.busy = true;
    this.path = null;
    this.banner = h('div', { class: 'turn-banner' }, '🐀 Ходът на плъховете…');
    this.mapWrap.append(this.banner);
    this.aiCursor = newAiCursor('enemy');
    const tick = () => {
      if (!this.alive) return;
      let delay = 0;
      for (let n = 0; n < 40; n++) {
        const r = aiStep(this.s, this.aiCursor!);
        if (r === 'done') {
          this.finishAi();
          return;
        }
        if (r === 'battle') {
          this.refreshAll();
          new CombatScreen(this.app, this.s, () => {
            finishBattle(this.s);
            this.showToasts();
            if (this.s.status !== 'play') {
              this.busy = false;
              this.banner?.remove();
              this.pump();
              return;
            }
            window.setTimeout(tick, 200);
          }).mount();
          return;
        }
        // Animate moves the player can see.
        const id = this.aiCursor!.heroIds[this.aiCursor!.idx];
        const mover = id ? this.s.heroes.find((x) => x.id === id) : undefined;
        if (mover && mover.alive && isExplored(this.s, 'player', mover.x, mover.y)) {
          this.ensureVisible(mover.x, mover.y);
          delay = 110;
          break;
        }
      }
      this.refreshTop();
      window.setTimeout(tick, delay);
    };
    window.setTimeout(tick, 300);
  }

  private finishAi(): void {
    this.banner?.remove();
    this.banner = null;
    if (this.s.status === 'play') {
      startNewDay(this.s);
      saveGame(this.s, 'auto');
    }
    this.busy = false;
    const hero = this.selected() ?? playerHeroes(this.s, 'player')[0];
    if (hero) this.select(hero);
    this.pump();
  }

  // -------------------------------------------------------------------------
  // Panels
  // -------------------------------------------------------------------------

  openTown(id?: string): void {
    const towns = playerTowns(this.s, 'player');
    const hero = this.selected();
    const town = (id && towns.find((t) => t.id === id)) || (hero && towns.find((t) => t.x === hero.x && t.y === hero.y)) || towns[0];
    if (!town) return;
    new TownScreen(this.app, this.s, town, () => {
      this.refreshAll();
      this.pump();
    }).open();
  }

  openHero(hero?: Hero): void {
    const hh = hero ?? this.selected();
    if (hh) heroPanel(this.app.root, this.s, hh, () => this.refreshAll());
  }

  private castAdventure(): void {
    const hero = this.selected();
    if (!hero) return;
    const sp = SPELLS.farsight;
    if (!hero.spells.includes('farsight')) {
      infoBox(this.app.root, 'Няма магии за картата', `${hero.name} не знае магии за картата.`, '📖');
      return;
    }
    if (hero.sp < sp.cost) {
      infoBox(this.app.root, 'Няма достатъчно мана', `Нужни са ${sp.cost} точки магия.`, '📖');
      return;
    }
    hero.sp -= sp.cost;
    reveal(this.s, 'player', hero.x, hero.y, 9);
    this.s.toasts.push({ text: `${hero.name} разгръща картата и оглежда околността.`, icon: '🗺️' });
    this.refreshAll();
    this.showToasts();
  }

  private inspect(x: number, y: number, cx: number, cy: number): void {
    showTip(cx, cy, this.describe(x, y, true));
    window.setTimeout(hideTip, 2600);
  }

  private describe(x: number, y: number, rich = false): string {
    const s = this.s;
    if (!isExplored(s, 'player', x, y)) return 'Неизследвано';
    const t = townAt(s, x, y);
    if (t) return `${t.name} (${t.owner === 'player' ? 'твой град' : t.owner === 'enemy' ? 'град на плъховете' : 'ничий'})`;
    const hh = heroAt(s, x, y);
    if (hh) {
      const army = rich ? `<br>${esc(armyWords(hh))}` : '';
      return `${hh.name}, ${hh.title} — ниво ${hh.level}${army}`;
    }
    const o = objectAt(s, x, y);
    const terr = terrainDef(tileAt(s, x, y)).name;
    const g = guardingMonster(s, x, y);
    const warn = g && g.kind === 'monster' && !o ? ` ⚔️ Пазено от ${creature(g.cid).plural.toLowerCase()}!` : '';
    if (!o) return terr + warn;
    return objectText(s, o, rich);
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------

  private loop = (): void => {
    if (!this.alive) return;
    const sp = 14;
    if (this.keys.has('arrowleft') || this.keys.has('a')) this.camX -= sp;
    if (this.keys.has('arrowright') || this.keys.has('d')) this.camX += sp;
    if (this.keys.has('arrowup') || this.keys.has('w')) this.camY -= sp;
    if (this.keys.has('arrowdown') || this.keys.has('s')) this.camY += sp;
    if (this.keys.size) this.clampCam();
    this.draw();
    this.raf = requestAnimationFrame(this.loop);
  };

  private draw(): void {
    const s = this.s;
    const ctx = this.ctx;
    const T = this.T;
    const time = performance.now();
    if (!this.terrainCache) this.terrainCache = renderTerrain(s, T);
    const vw = this.viewW();
    const vh = this.viewH();
    ctx.fillStyle = '#0d0b08';
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-Math.round(this.camX), -Math.round(this.camY));
    ctx.drawImage(this.terrainCache, 0, 0);

    const x0 = Math.max(0, Math.floor(this.camX / T) - 1);
    const y0 = Math.max(0, Math.floor(this.camY / T) - 1);
    const x1 = Math.min(s.w - 1, Math.ceil((this.camX + vw) / T) + 1);
    const y1 = Math.min(s.h - 1, Math.ceil((this.camY + vh) / T) + 1);
    const inView = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;

    // hover highlight
    if (this.hover && !this.busy) {
      ctx.strokeStyle = '#fff8';
      ctx.lineWidth = 2;
      ctx.strokeRect(this.hover.x * T + 1, this.hover.y * T + 1, T - 2, T - 2);
    }

    // path
    const hero = this.selected();
    if (this.path && hero) {
      let left = hero.mp;
      let prev = 0;
      this.path.forEach((p, i) => {
        const cost = p.cost - prev;
        prev = p.cost;
        left -= cost;
        const ok = left >= 0;
        const cx = p.x * T + T / 2;
        const cy = p.y * T + T / 2;
        const last = i === this.path!.length - 1;
        ctx.fillStyle = ok ? '#7fe06a' : '#e8b04a';
        ctx.strokeStyle = '#0008';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (last) {
          ctx.arc(cx, cy, T * 0.16, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = ok ? '#2f6b22' : '#7a4a10';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(cx - T * 0.1, cy - T * 0.1);
          ctx.lineTo(cx + T * 0.1, cy + T * 0.1);
          ctx.moveTo(cx + T * 0.1, cy - T * 0.1);
          ctx.lineTo(cx - T * 0.1, cy + T * 0.1);
          ctx.stroke();
        } else {
          ctx.arc(cx, cy, T * 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      });
    }

    // things, sorted by row
    type Item = { y: number; draw: () => void };
    const items: Item[] = [];
    for (const t of s.towns) {
      if (!inView(t.x, t.y) || !isExplored(s, 'player', t.x, t.y)) continue;
      items.push({ y: t.y + 0.1, draw: () => drawTownAt(ctx, t, t.x * T, t.y * T, T) });
    }
    for (const o of s.objects) {
      if (o.done || !inView(o.x, o.y) || !isExplored(s, 'player', o.x, o.y)) continue;
      items.push({ y: o.y, draw: () => drawObject(ctx, s, o, o.x * T, o.y * T, T, time) });
    }
    for (const hh of s.heroes) {
      if (!hh.alive || !inView(hh.x, hh.y) || !isExplored(s, 'player', hh.x, hh.y)) continue;
      items.push({ y: hh.y + 0.2, draw: () => drawHero(ctx, hh, hh.x * T, hh.y * T, T, hh.id === this.selId, time) });
    }
    items.sort((a, b) => a.y - b.y);
    for (const it of items) it.draw();

    // town names
    ctx.font = `700 ${Math.round(T * 0.24)}px Nunito, sans-serif`;
    ctx.textAlign = 'center';
    for (const t of s.towns) {
      if (!inView(t.x, t.y) || !isExplored(s, 'player', t.x, t.y)) continue;
      const tx = t.x * T + T / 2;
      const ty = t.y * T + T * 1.18;
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#000b';
      ctx.strokeText(t.name, tx, ty);
      ctx.fillStyle = '#fff3d6';
      ctx.fillText(t.name, tx, ty);
    }

    // fog (soft edges via a scaled low-res mask)
    this.drawFog(ctx);
    ctx.restore();
  }

  private drawFog(ctx: CanvasRenderingContext2D): void {
    const s = this.s;
    const fc = this.fogCanvas;
    if (fc.width !== s.w + 2 || fc.height !== s.h + 2) {
      fc.width = s.w + 2;
      fc.height = s.h + 2;
    }
    const fctx = fc.getContext('2d')!;
    const img = fctx.createImageData(fc.width, fc.height);
    const ex = s.players.player.explored;
    for (let y = -1; y <= s.h; y++)
      for (let x = -1; x <= s.w; x++) {
        const inside = x >= 0 && y >= 0 && x < s.w && y < s.h;
        const fog = !inside || !ex[y * s.w + x];
        const i = ((y + 1) * fc.width + (x + 1)) * 4;
        img.data[i] = 12;
        img.data[i + 1] = 10;
        img.data[i + 2] = 8;
        img.data[i + 3] = fog ? 255 : 0;
      }
    fctx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    const T = this.T;
    ctx.drawImage(fc, -1.5 * T, -1.5 * T, (s.w + 2) * T, (s.h + 2) * T);
    ctx.globalAlpha = 0.85;
    ctx.drawImage(fc, -1.5 * T, -1.5 * T, (s.w + 2) * T, (s.h + 2) * T);
    ctx.globalAlpha = 1;
  }

  private drawMinimap(): void {
    const s = this.s;
    const m = this.mini;
    const scale = 4;
    m.width = s.w * scale;
    m.height = s.h * scale;
    const ctx = m.getContext('2d')!;
    const col: Record<string, string> = { T: '#2f5a26', '~': '#3f7fb8', '=': '#9b6b3c', '^': '#8d8a72', M: '#9a968a', s: '#55683e', h: '#7c9550', ':': '#d2b07a', n: '#dfe8ee', d: '#9a7a4e' };
    for (let y = 0; y < s.h; y++)
      for (let x = 0; x < s.w; x++) {
        if (!isExplored(s, 'player', x, y)) ctx.fillStyle = '#0c0a08';
        else ctx.fillStyle = col[tileAt(s, x, y)] ?? '#6f9a48';
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    for (const o of s.objects) {
      if (o.done || !isExplored(s, 'player', o.x, o.y)) continue;
      if (o.kind === 'mine' || o.kind === 'dwelling') {
        ctx.fillStyle = o.owner === 'player' ? '#5fd06a' : o.owner === 'enemy' ? '#e05050' : '#ddd';
        ctx.fillRect(o.x * scale, o.y * scale, scale, scale);
      }
    }
    for (const t of s.towns) {
      if (!isExplored(s, 'player', t.x, t.y)) continue;
      ctx.fillStyle = t.owner === 'player' ? '#5fd06a' : t.owner === 'enemy' ? '#e05050' : '#ddd';
      ctx.fillRect(t.x * scale - scale, t.y * scale - scale, scale * 3, scale * 3);
    }
    for (const hh of s.heroes) {
      if (!hh.alive || !isExplored(s, 'player', hh.x, hh.y)) continue;
      ctx.fillStyle = hh.owner === 'player' ? '#b8ffb0' : '#ffb0a0';
      ctx.fillRect(hh.x * scale, hh.y * scale, scale, scale);
    }
    // view rectangle
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect((this.camX / this.T) * scale, (this.camY / this.T) * scale, (this.viewW() / this.T) * scale, (this.viewH() / this.T) * scale);
  }

  refreshAll(): void {
    this.refreshTop();
    this.refreshSidebar(true);
  }

  refreshTop(): void {
    const s = this.s;
    const inc = dailyIncome(s, 'player');
    clear(this.topbar);
    for (const k of RES_KEYS as ResKey[]) {
      this.topbar.append(
        h('div', { class: 'res', title: RES_INFO[k].name },
          h('span', { class: 'emoji' }, RES_INFO[k].icon),
          String(s.players.player.res[k]),
          inc[k] ? h('small', null, `+${inc[k]}`) : null),
      );
    }
    const vbox = h('div', { class: 'row', style: 'gap:6px' });
    for (const v of VIRTUES) {
      const r = virtueRank(s, v);
      const chip = h('span', { class: 'virtue-chip' }, h('span', { class: 'emoji' }, VIRTUE_INFO[v].icon), String(s.virtues[v] ?? 0));
      chip.addEventListener('mousemove', (e) => showTip(e.clientX, e.clientY, `<b>${VIRTUE_INFO[v].name}: ${s.virtues[v] ?? 0}</b><br>${VIRTUE_INFO[v].ranks[r]}<br><span style="opacity:.7">Ранг 1 от 2 т., ранг 2 от 4 т.</span>`));
      chip.addEventListener('mouseleave', hideTip);
      vbox.append(chip);
    }
    this.topbar.append(vbox);
    this.topbar.append(h('div', { class: 'day' }, `${dayLabel(s.day)} · ${getScenario(s.scenario).title}`));
    this.drawMinimap();
  }

  refreshSidebar(force = false): void {
    const s = this.s;
    const key = JSON.stringify([this.selId, s.heroes.map((x) => [x.id, x.alive, x.mp, x.level, x.owner]), s.towns.map((t) => t.owner), s.turn]);
    if (!force && key === this.lastSideKey) return;
    this.lastSideKey = key;
    const sb = this.sidebar;
    clear(sb);
    sb.append(this.mini);
    sb.append(h('div', { class: 'side-title' }, 'Герои'));
    const hl = h('div', { class: 'card-list' });
    for (const hh of playerHeroes(s, 'player')) {
      const pic = portraitCanvas(hh.portrait, 40);
      pic.className = 'pic';
      const mpPct = Math.max(0, Math.min(100, (hh.mp / heroMaxMp(hh)) * 100));
      const card = h(
        'div',
        { class: `hero-card${hh.id === this.selId ? ' sel' : ''}`, onclick: () => (hh.id === this.selId ? this.openHero(hh) : this.select(hh)) },
        pic,
        h('div', { class: 'grow' },
          h('div', { style: 'font-weight:800' }, `${hh.name} `, h('span', { class: 'muted', style: 'font-weight:600' }, `ниво ${hh.level}`)),
          h('div', { class: 'muted', style: 'font-size:12px' }, `✨ ${hh.sp}/${maxSp(hh, s)}`),
          h('div', { class: 'mpbar' }, h('div', { style: `width:${mpPct}%` }))),
      );
      hl.append(card);
    }
    sb.append(hl);
    const towns = playerTowns(s, 'player');
    if (towns.length) {
      sb.append(h('div', { class: 'side-title' }, 'Градове'));
      const tl = h('div', { class: 'card-list' });
      for (const t of towns) {
        const pic = h('canvas', { width: 40, height: 40, style: 'width:40px;height:40px' });
        const c = pic.getContext('2d')!;
        drawPortrait(c, `town:${t.faction}`, 20, 20, 19);
        tl.append(h('div', { class: 'town-card', onclick: () => this.openTown(t.id), ondblclick: () => this.centerOn(t.x, t.y) }, pic, h('div', { class: 'grow', style: 'font-weight:800' }, t.name, h('div', { class: 'muted', style: 'font-size:12px;font-weight:600' }, t.builtToday ? 'Днес се строи' : 'Може да се строи'))));
      }
      sb.append(tl);
    }
    const btn = (label: string, title: string, fn: () => void, cls = '') => h('button', { class: cls, title, onclick: fn }, label);
    sb.append(
      h('div', { class: 'side-buttons' },
        btn('🧭 Герой', 'Информация за героя', () => this.openHero()),
        btn('🏰 Град', 'Отвори град (T)', () => this.openTown()),
        btn('🗺️ Магия', 'Магия за картата: Поглед от високо', () => this.castAdventure()),
        btn('📌 Задачи', 'Задачи и цели (Q)', () => questLog(this.app.root, s)),
        btn('💾 Запис', 'Запис и зареждане', () => saveLoadModal(this.app, this.s, this)),
        btn('☰ Меню', 'Меню (Esc)', () => this.app.gameMenu(this)),
        btn('➡️ Следващ герой', 'Следващ герой (H)', () => this.nextHero(), 'wide'),
        btn('⏳ Край на хода', 'Край на хода (E)', () => this.endTurn(), 'wide primary'),
      ),
    );
  }

  /** Test hook: let the bot finish the current human day instantly. */
  replaceState(s: GameState): void {
    this.s = s;
    this.terrainCache = null;
    this.path = null;
    const first = playerHeroes(s, 'player')[0];
    this.selId = first?.id ?? null;
    if (first) this.centerOn(first.x, first.y);
    this.refreshAll();
  }
}

function armyWords(hh: Hero): string {
  return hh.army
    .filter((st) => st && st.n > 0)
    .map((st) => (hh.owner === 'player' ? stackLabel(st!.cid, st!.n) : `${sizeWord(st!.n)} ${creature(st!.cid).plural.toLowerCase()}`))
    .join(', ');
}

export function objectText(s: GameState, o: MapObject, rich: boolean): string {
  switch (o.kind) {
    case 'monster': {
      const c = creature(o.cid);
      const base = o.label ?? `${sizeWord(o.n)} ${c.plural.toLowerCase()}`;
      return rich ? `<b>${esc(base)}</b><br>~${o.n} ${esc(c.plural.toLowerCase())}<br>⚔️${c.att} 🛡️${c.def} ❤️${c.hp} 💨${c.spd}<br>${esc(c.desc)}` : `${base} (~${o.n})`;
    }
    case 'resource':
      return `${RES_INFO[o.res].name}: ${o.amount}`;
    case 'chest':
      return 'Сандък със съкровище';
    case 'artifact':
      return `Артефакт: ${ARTIFACTS[o.art]?.name ?? o.art}${rich ? `<br>${esc(ARTIFACTS[o.art]?.desc ?? '')}` : ''}`;
    case 'mine':
      return `${MINE_INFO[o.res].name} (+${MINE_INFO[o.res].perDay} ${RES_INFO[o.res].icon}/ден) — ${o.owner === 'player' ? 'твоя' : o.owner === 'enemy' ? 'на плъховете' : 'ничия'}`;
    case 'dwelling':
      return `Жилище: ${creature(o.cid).plural} (${o.available} за наемане)`;
    case 'shrine':
      return o.label ?? SHRINE_INFO[o.effect]?.name ?? 'Светилище';
    case 'npc':
      return o.label;
    case 'sign':
      return 'Табела';
    case 'questItem':
      return o.label;
    case 'gate':
      return o.label;
    case 'goal':
      return o.label;
    case 'event':
      return 'Нещо интересно…';
  }
  void s;
  return '';
}
