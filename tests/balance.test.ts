/**
 * Balance check: the test bot (the rat AI driving the forest side, retreating
 * from hopeless fights and picking the first available story choice) plays
 * every chapter on fixed seeds. Results are deterministic.
 */
import { describe, expect, it } from 'vitest';
import { campaignAfterVictory, newCampaign, newGame } from '../game/core/adventure';
import { botPlay } from '../game/core/bot';
import type { Difficulty, GameState } from '../game/core/types';
import { presetCampaign } from '../game/data/scenarios';

function summary(s: GameState): string {
  const m = s.heroes.find((h) => h.id === 'mishkontin');
  return `${s.status} on day ${s.day}, Mishkontin level ${m?.level}${s.endReason ? ` (${s.endReason.slice(0, 48)}…)` : ''}`;
}

describe('chapter 1 is winnable', () => {
  for (const diff of ['easy', 'normal', 'hard'] as Difficulty[]) {
    it(`on ${diff}`, () => {
      const results = [1, 2, 3, 4, 5].map((seed) => {
        const s = newGame('s1', newCampaign(diff), seed);
        botPlay(s, 60);
        console.log(`[s1 ${diff} seed ${seed}] ${summary(s)}`);
        return s.status;
      });
      if (diff !== 'hard') expect(results.every((r) => r === 'won')).toBe(true);
      else expect(results.filter((r) => r === 'won').length).toBeGreaterThanOrEqual(3);
    });
  }
});

describe('later chapters (started from the chapter menu)', () => {
  for (const [id, minWins] of [['s2', 2], ['s3', 1]] as const) {
    it(`${id} can be won`, () => {
      const wins = [1, 2, 3].filter((seed) => {
        const s = newGame(id, presetCampaign(id), seed);
        botPlay(s, 70);
        console.log(`[${id} preset seed ${seed}] ${summary(s)}`);
        return s.status === 'won';
      }).length;
      expect(wins).toBeGreaterThanOrEqual(minWins);
    });
  }
});

it('a whole campaign runs from chapter 1 onwards', () => {
  for (const seed of [11, 12]) {
    let c = newCampaign('normal');
    const parts: string[] = [];
    for (const id of ['s1', 's2', 's3']) {
      const s = newGame(id, c, seed);
      botPlay(s, 70);
      parts.push(`${id}: ${summary(s)}`);
      if (s.status !== 'won') break;
      c = campaignAfterVictory(s);
    }
    console.log(`[campaign seed ${seed}] ${parts.join(' | ')}`);
    expect(parts[0]).toMatch(/^s1: won/);
  }
});
