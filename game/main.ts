import './ui/style.css';
import { botPlay, botResolveUi } from './core/bot';
import type { GameState } from './core/types';
import { mountApp } from './ui/app';

const root = document.getElementById('app')!;
const app = mountApp(root);

/** Small hook used by the automated browser tests (and handy for debugging). */
declare global {
  interface Window {
    __game: {
      app: typeof app;
      state: () => GameState | null;
      botFinish: (maxDays?: number) => string | null;
    };
  }
}

window.__game = {
  app,
  state: () => app.adventure?.s ?? null,
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
