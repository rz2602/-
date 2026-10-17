import './ui/style.css';
import { botPlay, botPlayDay, botResolveUi } from './core/bot';
import type { GameState } from './core/types';
import { mountApp } from './ui/app';
import { initAudio } from './ui/audio';

initAudio();
const root = document.getElementById('app')!;
const app = mountApp(root);

/** Small hook used by the automated browser tests (and handy for debugging). */
declare global {
  interface Window {
    __game: {
      app: typeof app;
      state: () => GameState | null;
      botFinish: (maxDays?: number) => string | null;
      tile: (x: number, y: number) => { x: number; y: number } | null;
      botDays: (days: number) => void;
    };
  }
}

window.__game = {
  app,
  state: () => app.adventure?.s ?? null,
  tile: (x, y) => app.adventure?.tileCenterClient(x, y) ?? null,
  botDays: (days) => {
    const adv = app.adventure;
    if (!adv) return;
    for (const o of Array.from(root.querySelectorAll('.overlay, .combat'))) o.remove();
    botResolveUi(adv.s);
    for (let i = 0; i < days && adv.s.status === 'play'; i++) botPlayDay(adv.s);
    adv.s.toasts = [];
    adv.replaceState(adv.s);
  },
  botFinish: (maxDays = 60) => {
    const adv = app.adventure;
    if (!adv) return null;
    for (const o of Array.from(root.querySelectorAll('.overlay, .combat'))) o.remove();
    const s = adv.s;
    s.prompt = null;
    botResolveUi(s);
    botPlay(s, maxDays);
    adv.replaceState(s);
    if (s.status !== 'play') app.showEnd(s);
    return s.status;
  },
};
