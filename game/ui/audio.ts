/**
 * Procedural music and sound effects with the Web Audio API — no audio files.
 * The context starts on the first user gesture (browsers require it).
 */
import { getSetting, setSetting } from './save';

type Theme = 'menu' | 'map' | 'combat' | 'siege';
export type Sfx =
  | 'click'
  | 'step'
  | 'pickup'
  | 'coin'
  | 'build'
  | 'hit'
  | 'shoot'
  | 'spell'
  | 'morale'
  | 'levelup'
  | 'victory'
  | 'defeat'
  | 'week'
  | 'page'
  | 'error';

let ctx: AudioContext | null = null;
let master: GainNode;
let musicBus: GainNode;
let sfxBus: GainNode;
let noise: AudioBuffer;
let musicOn = getSetting('music', '1') === '1';
let sfxOn = getSetting('sfx', '1') === '1';
let wanted: Theme | null = null;
let playing: Theme | null = null;
let timer: number | null = null;
let nextTime = 0;
let step = 0;

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  try {
    ctx = new AC();
  } catch {
    return null;
  }
  master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  musicBus = ctx.createGain();
  musicBus.gain.value = musicOn ? 0.32 : 0;
  musicBus.connect(master);
  sfxBus = ctx.createGain();
  sfxBus.gain.value = sfxOn ? 0.6 : 0;
  sfxBus.connect(master);
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Call once at start-up: unlocks audio on the first tap / click / key. */
export function initAudio(): void {
  const unlock = () => {
    const c = ensure();
    if (c && c.state === 'suspended') void c.resume();
    if (wanted && !playing) startMusic(wanted);
  };
  for (const ev of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(ev, unlock, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) void ctx.suspend();
    else void ctx.resume();
  });
  // Every button gets a soft click.
  document.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest?.('button');
    if (b && !(b as HTMLButtonElement).disabled) sfx('click');
  }, true);
}

export function isMusicOn(): boolean {
  return musicOn;
}
export function isSfxOn(): boolean {
  return sfxOn;
}

export function setMusicOn(on: boolean): void {
  musicOn = on;
  setSetting('music', on ? '1' : '0');
  if (ctx) musicBus.gain.setTargetAtTime(on ? 0.32 : 0, ctx.currentTime, 0.1);
}

export function setSfxOn(on: boolean): void {
  sfxOn = on;
  setSetting('sfx', on ? '1' : '0');
  if (ctx) sfxBus.gain.setTargetAtTime(on ? 0.6 : 0, ctx.currentTime, 0.05);
}

// ---------------------------------------------------------------------------
// Instruments
// ---------------------------------------------------------------------------

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

function tone(dest: AudioNode, midi: number, t: number, dur: number, opts: { type?: OscillatorType; vol?: number; attack?: number; release?: number; detune?: number; glideTo?: number } = {}): void {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = opts.type ?? 'triangle';
  o.frequency.setValueAtTime(hz(midi), t);
  if (opts.glideTo != null) o.frequency.exponentialRampToValueAtTime(hz(opts.glideTo), t + dur);
  if (opts.detune) o.detune.value = opts.detune;
  const vol = opts.vol ?? 0.2;
  const a = opts.attack ?? 0.01;
  const r = opts.release ?? Math.min(0.4, dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + a);
  g.gain.setValueAtTime(vol, t + Math.max(a, dur - r));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02);
  o.connect(g);
  g.connect(dest);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noiseHit(dest: AudioNode, t: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass'): void {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f);
  f.connect(g);
  g.connect(dest);
  s.start(t);
  s.stop(t + dur + 0.02);
}

function kick(t: number, vol = 0.5): void {
  tone(musicBus, 45, t, 0.18, { type: 'sine', vol, attack: 0.002, release: 0.15, glideTo: 30 });
}

// ---------------------------------------------------------------------------
// Music: small hand-written loops in a storybook folk style
// ---------------------------------------------------------------------------

type Note = [number | null, number]; // midi, beats

interface Song {
  bpm: number;
  chords: number[][]; // one chord (midi notes) per bar
  melody: Note[]; // loops; total length = bars × 4 beats
  bass: 'whole' | 'pulse' | 'gallop';
  drums: boolean;
  lead: OscillatorType;
}

export const SONGS: Record<Theme, Song> = {
  menu: {
    bpm: 72,
    lead: 'sine',
    bass: 'whole',
    drums: false,
    chords: [[48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 59], [48, 55, 64], [45, 52, 60], [41, 48, 57], [43, 50, 62]],
    melody: [
      [72, 1], [76, 1], [79, 2], [77, 1], [76, 1], [74, 2], [72, 1], [69, 1], [72, 1], [74, 1], [71, 3], [null, 1],
      [72, 1], [76, 1], [79, 1.5], [81, 0.5], [79, 1], [77, 1], [76, 2], [74, 1], [72, 1], [69, 1], [71, 1], [72, 3], [null, 1],
    ],
  },
  map: {
    bpm: 96,
    lead: 'triangle',
    bass: 'pulse',
    drums: false,
    chords: [[50, 57, 65], [48, 55, 64], [43, 50, 59], [45, 52, 60], [50, 57, 65], [41, 48, 57], [48, 55, 64], [50, 57, 62]],
    melody: [
      [62, 1], [65, 1], [67, 1], [69, 1], [67, 1.5], [65, 0.5], [64, 2], [62, 1], [67, 1], [71, 1], [69, 1], [69, 3], [null, 1],
      [74, 1], [72, 1], [69, 1], [67, 1], [65, 1.5], [67, 0.5], [69, 2], [67, 1], [65, 1], [64, 1], [60, 1], [62, 3], [null, 1],
    ],
  },
  combat: {
    bpm: 138,
    lead: 'square',
    bass: 'gallop',
    drums: true,
    chords: [[45, 52, 60], [41, 48, 57], [43, 50, 59], [40, 47, 56], [45, 52, 60], [41, 48, 57], [38, 45, 53], [40, 47, 56]],
    melody: [
      [69, 0.5], [69, 0.5], [72, 1], [71, 0.5], [69, 0.5], [67, 1], [65, 1], [67, 1], [69, 2], [67, 0.5], [65, 0.5], [64, 1], [64, 2], [null, 2],
      [69, 0.5], [72, 0.5], [76, 1], [74, 0.5], [72, 0.5], [71, 1], [72, 1], [69, 1], [65, 2], [64, 1], [62, 1], [64, 3], [null, 1], [69, 2], [null, 2],
    ],
  },
  siege: {
    bpm: 84,
    lead: 'triangle',
    bass: 'pulse',
    drums: true,
    chords: [[45, 52, 60], [43, 50, 59], [41, 48, 57], [40, 47, 56], [45, 52, 60], [48, 55, 64], [43, 50, 59], [40, 47, 56]],
    melody: [
      [69, 2], [72, 1], [71, 1], [67, 3], [null, 1], [65, 1], [67, 1], [69, 1], [71, 1], [68, 3], [null, 1],
      [69, 2], [76, 1], [74, 1], [72, 2], [71, 2], [67, 1], [69, 1], [71, 1], [72, 1], [69, 3], [null, 1],
    ],
  },
};

/** Melody as a list of [startBeat, midi, beats]. */
function timeline(song: Song): [number, number, number][] {
  const out: [number, number, number][] = [];
  let beat = 0;
  for (const [m, d] of song.melody) {
    if (m != null) out.push([beat, m, d]);
    beat += d;
  }
  return out;
}

/** Map music for a game state (the siege of chapter 3 has its own tune). */
export function mapTheme(s: { scenario: string }): Theme {
  return s.scenario === 's3' ? 'siege' : 'map';
}

let melodyLine: [number, number, number][] = [];

export function music(theme: Theme | null): void {
  wanted = theme;
  if (theme === playing) return;
  stopMusic();
  if (theme && ctx && ctx.state !== 'closed') startMusic(theme);
}

function stopMusic(): void {
  if (timer != null) clearInterval(timer);
  timer = null;
  playing = null;
}

function startMusic(theme: Theme): void {
  const c = ensure();
  if (!c) return;
  playing = theme;
  const song = SONGS[theme];
  melodyLine = timeline(song);
  nextTime = c.currentTime + 0.15;
  step = 0;
  const eighth = 60 / song.bpm / 2;
  const totalEighths = song.chords.length * 8;
  timer = window.setInterval(() => {
    if (!ctx || playing !== theme) return;
    while (nextTime < ctx.currentTime + 0.3) {
      scheduleEighth(song, step % totalEighths, nextTime, eighth);
      nextTime += eighth;
      step++;
    }
  }, 60);
}

function scheduleEighth(song: Song, i: number, t: number, eighth: number): void {
  const bar = Math.floor(i / 8);
  const inBar = i % 8;
  const chord = song.chords[bar];
  // pad
  if (inBar === 0) for (const n of chord) tone(musicBus, n + 12, t, eighth * 8, { type: 'sine', vol: 0.035, attack: 0.3, release: 0.6 });
  // bass
  const root = chord[0] - 12;
  if (song.bass === 'whole' && inBar === 0) tone(musicBus, root, t, eighth * 7, { type: 'sine', vol: 0.12, attack: 0.05 });
  if (song.bass === 'pulse' && inBar % 2 === 0) tone(musicBus, inBar === 4 ? root + 7 : root, t, eighth * 1.6, { type: 'triangle', vol: 0.1 });
  if (song.bass === 'gallop' && inBar !== 3 && inBar !== 7) tone(musicBus, inBar >= 4 ? root + 7 : root, t, eighth * 0.8, { type: 'sawtooth', vol: 0.045, release: 0.05 });
  // arpeggio sparkle on the map themes
  if (!song.drums && inBar % 2 === 1) tone(musicBus, chord[(inBar >> 1) % chord.length] + 24, t, eighth, { type: 'sine', vol: 0.025 });
  // drums
  if (song.drums) {
    if (inBar === 0 || inBar === 4) kick(t, 0.35);
    if (inBar === 2 || inBar === 6) noiseHit(musicBus, t, 0.12, 0.12, 1800);
    if (song.bpm > 120) noiseHit(musicBus, t, 0.03, 0.03, 7000, 'highpass');
  }
  // melody
  const beat = i / 2;
  for (const [start, m, d] of melodyLine) {
    if (start === beat) tone(musicBus, m, t, d * eighth * 2 * 0.92, { type: song.lead, vol: song.lead === 'square' ? 0.035 : 0.075, attack: 0.02, release: 0.15 });
  }
}

// ---------------------------------------------------------------------------
// Sound effects
// ---------------------------------------------------------------------------

let lastStep = 0;

export function sfx(name: Sfx): void {
  if (!sfxOn) return;
  const c = ensure();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + 0.01;
  const b = sfxBus;
  switch (name) {
    case 'click':
      tone(b, 84, t, 0.04, { type: 'sine', vol: 0.08, release: 0.03 });
      break;
    case 'page':
      noiseHit(b, t, 0.08, 0.05, 3000);
      break;
    case 'step':
      if (t - lastStep < 0.06) return;
      lastStep = t;
      noiseHit(b, t, 0.05, 0.08, 500 + Math.random() * 300, 'lowpass');
      break;
    case 'pickup':
      [76, 81, 88].forEach((m, i) => tone(b, m, t + i * 0.06, 0.12, { type: 'triangle', vol: 0.12 }));
      break;
    case 'coin':
      tone(b, 88, t, 0.06, { type: 'square', vol: 0.05 });
      tone(b, 93, t + 0.06, 0.14, { type: 'square', vol: 0.05 });
      break;
    case 'build':
      for (let i = 0; i < 3; i++) {
        noiseHit(b, t + i * 0.12, 0.08, 0.2, 900, 'lowpass');
        tone(b, 52, t + i * 0.12, 0.08, { type: 'square', vol: 0.05 });
      }
      break;
    case 'hit':
      noiseHit(b, t, 0.12, 0.25, 1200);
      tone(b, 50, t, 0.12, { type: 'square', vol: 0.08, glideTo: 38 });
      break;
    case 'shoot':
      noiseHit(b, t, 0.15, 0.12, 4000, 'highpass');
      tone(b, 79, t, 0.1, { type: 'sine', vol: 0.06, glideTo: 67 });
      break;
    case 'spell':
      [72, 76, 79, 84, 88].forEach((m, i) => tone(b, m, t + i * 0.05, 0.25, { type: 'sine', vol: 0.08 }));
      noiseHit(b, t, 0.4, 0.05, 6000, 'highpass');
      break;
    case 'morale':
      tone(b, 72, t, 0.1, { type: 'triangle', vol: 0.1 });
      tone(b, 79, t + 0.1, 0.2, { type: 'triangle', vol: 0.1 });
      break;
    case 'levelup':
      [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => tone(b, m, t + i * 0.07, 0.3, { type: 'triangle', vol: 0.1 }));
      break;
    case 'victory':
      [[67, 0], [72, 0.15], [76, 0.3], [79, 0.45], [84, 0.65]].forEach(([m, d]) => tone(b, m, t + d, d === 0.65 ? 0.9 : 0.18, { type: 'square', vol: 0.06 }));
      [48, 55, 64].forEach((m) => tone(b, m, t + 0.65, 0.9, { type: 'triangle', vol: 0.08 }));
      break;
    case 'defeat':
      [[67, 0], [63, 0.3], [60, 0.6], [55, 0.9]].forEach(([m, d]) => tone(b, m, t + d, 0.35, { type: 'triangle', vol: 0.1 }));
      break;
    case 'week':
      [79, 76, 72, 76, 79, 84].forEach((m, i) => tone(b, m, t + i * 0.09, 0.2, { type: 'sine', vol: 0.08 }));
      break;
    case 'error':
      tone(b, 50, t, 0.15, { type: 'square', vol: 0.06 });
      break;
  }
}
