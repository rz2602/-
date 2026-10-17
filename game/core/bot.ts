/**
 * A simple "player bot" used by the automated tests and the headless
 * playthrough: it answers dialogues/prompts and lets the adventure AI play the
 * forest side, then runs the rat turn and advances the day.
 */
import { availableChoices, closeDialogue, endPlayerTurn, finishBattle, resolvePrompt, startNewDay } from './adventure';
import { aiStep, newAiCursor, runAiTurn } from './ai';
import { autoResolve } from './combat';
import { applyLevelUp } from './hero';
import type { GameState } from './types';

export type ChoicePolicy = (s: GameState, dialogueId: string, count: number) => number;

/** Picks the first choice whose requirement is met. */
export const firstChoice: ChoicePolicy = (s, id) => {
  const list = availableChoices(s, id);
  const i = list.findIndex((c) => !c.requires || c.requires(s));
  return Math.max(0, i);
};

export function botResolveUi(s: GameState, policy: ChoicePolicy = firstChoice): void {
  for (let guard = 0; guard < 50; guard++) {
    if (s.battle) {
      autoResolve(s, s.battle);
      finishBattle(s);
      continue;
    }
    if (s.pendingDialogues.length) {
      const id = s.pendingDialogues[0];
      closeDialogue(s, id, policy(s, id, availableChoices(s, id).length));
      continue;
    }
    if (s.prompt) {
      resolvePrompt(s, 0);
      continue;
    }
    let changed = false;
    for (const h of s.heroes) {
      while (h.pendingLevelUps.length) {
        const o = h.pendingLevelUps.shift()!;
        applyLevelUp(h, o, o.options[0] ?? null);
        changed = true;
      }
    }
    if (!changed) return;
  }
}

export function botPlayDay(s: GameState, policy: ChoicePolicy = firstChoice): void {
  botResolveUi(s, policy);
  if (s.status !== 'play') return;
  const cur = newAiCursor('player');
  for (let i = 0; i < 3000; i++) {
    const r = aiStep(s, cur);
    botResolveUi(s, policy);
    if (r === 'done' || s.status !== 'play') break;
  }
  if (s.status !== 'play') return;
  endPlayerTurn(s);
  runAiTurn(s, 'enemy');
  botResolveUi(s, policy);
  if (s.status !== 'play') return;
  startNewDay(s);
  botResolveUi(s, policy);
}

export function botPlay(s: GameState, maxDays = 80, policy: ChoicePolicy = firstChoice): GameState {
  while (s.status === 'play' && s.day <= maxDays) botPlayDay(s, policy);
  botResolveUi(s, policy);
  return s;
}
