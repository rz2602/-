import type { DialogueLine } from '../../core/scenario';
import type { GameState, Resources } from '../../core/types';

type Mood = DialogueLine['mood'];

/** Short-hand for a dialogue line. */
export function L(who: string, text: string, mood?: Mood, requires?: (s: GameState) => boolean): DialogueLine {
  return { who, text, mood, requires };
}

export const has = (flag: string) => (s: GameState) => !!s.flags[flag];
export const hasNot = (flag: string) => (s: GameState) => !s.flags[flag];
export const hasRes = (r: Partial<Resources>) => (s: GameState) =>
  (Object.keys(r) as (keyof Resources)[]).every((k) => s.players.player.res[k] >= (r[k] ?? 0));

export const res = (acorns = 0, wood = 0, stone = 0, cheese = 0): Resources => ({ acorns, wood, stone, cheese });
