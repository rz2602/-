import { describe, expect, it } from 'vitest';
import { newCampaign, newGame } from '../game/core/adventure';
import { botPlay } from '../game/core/bot';

describe('bot plays S1', () => {
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`seed ${seed}`, () => {
      const s = newGame('s1', newCampaign('normal'), seed);
      botPlay(s, 60);
      const m = s.heroes.find((h) => h.id === 'mishkontin')!;
      console.log(seed, s.status, s.day, s.endReason, s.items, 'lvl', m.level, 'flags', Object.keys(s.flags).join(','));
      expect(s.status).not.toBe('play');
    });
  }
});
