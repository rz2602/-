import { availableChoices, closeDialogue } from '../core/adventure';
import type { GameState, VirtueId } from '../core/types';
import { VIRTUE_INFO } from '../core/hero';
import { CHARACTERS } from '../data/characters';
import { getScenario } from '../data/scenarios';
import { clear, h } from './dom';
import { portraitEl } from './gfx';
import { sfx } from './audio';

const VIRTUE_TAG: Record<VirtueId, string> = {
  courage: `${VIRTUE_INFO.courage.icon} Смелост`,
  kindness: `${VIRTUE_INFO.kindness.icon} Доброта`,
  wisdom: `${VIRTUE_INFO.wisdom.icon} Мъдрост`,
};

/** Plays the first pending dialogue; calls `done` after it closed (choices applied). */
export function playDialogue(root: HTMLElement, s: GameState, id: string, done: () => void): void {
  const d = getScenario(s.scenario).dialogues[id];
  if (!d) {
    closeDialogue(s, id, null);
    done();
    return;
  }
  const lines = d.lines.filter((l) => !l.requires || l.requires(s));
  const ov = h('div', { class: 'overlay', style: 'background:#0007;align-items:stretch;justify-content:stretch' });
  if (d.bg) ov.append(h('div', { class: 'dlg-bg', style: `background-image:url(${d.bg})` }));
  const portrait = h('div', { class: 'dlg-portrait' });
  const title = h('div', { class: 'dlg-title' }, d.title ?? '');
  const name = h('div', { class: 'dlg-name' });
  const text = h('div', { class: 'dlg-text' });
  const actions = h('div', { class: 'dlg-choices' });
  const box = h('div', { class: 'dlg-box' }, title, name, text, actions);
  ov.append(h('div', { class: 'dlg' }, portrait, box));
  root.append(ov);

  let i = 0;
  let typing: number | null = null;
  let full = '';

  const finishTyping = () => {
    if (typing != null) {
      clearInterval(typing);
      typing = null;
      text.textContent = full;
      renderActions();
    }
  };

  const close = (choice: number | null) => {
    window.removeEventListener('keydown', onKey, true);
    ov.remove();
    closeDialogue(s, id, choice);
    done();
  };

  const renderActions = () => {
    clear(actions);
    const last = i >= lines.length - 1;
    if (!last || !d.choices?.length) {
      const btn = h('button', { class: 'dlg-next primary', onclick: () => next() }, last ? 'Край ▸' : 'Напред ▸');
      actions.append(btn);
      return;
    }
    availableChoices(s, id).forEach((c, idx) => {
      const ok = !c.requires || c.requires(s);
      actions.append(
        h(
          'button',
          { disabled: !ok, onclick: () => ok && close(idx), 'data-choice': idx },
          h('span', null, `${idx + 1}. ${c.text}`),
          !ok && c.lockedHint ? h('span', { class: 'tag' }, `🔒 ${c.lockedHint}`) : c.virtue ? h('span', { class: 'tag' }, VIRTUE_TAG[c.virtue]) : null,
        ),
      );
    });
  };

  const show = () => {
    const line = lines[i];
    if (!line) {
      close(null);
      return;
    }
    const ch = CHARACTERS[line.who];
    sfx('page');
    clear(portrait);
    if (ch && line.who !== 'narrator') portrait.append(portraitEl(line.who, line.who === 'mishkontin' ? 200 : 150, line.mood ?? 'idle'));
    portrait.style.visibility = line.who === 'narrator' ? 'hidden' : 'visible';
    name.textContent = ch?.name ?? '';
    text.className = `dlg-text${line.who === 'narrator' ? ' narr' : ''}`;
    full = line.text;
    clear(actions);
    let k = 0;
    text.textContent = '';
    const speed = Math.max(8, 26 - Math.floor(full.length / 20));
    typing = window.setInterval(() => {
      k += 2;
      text.textContent = full.slice(0, k);
      if (k >= full.length) finishTyping();
    }, speed);
  };

  const next = () => {
    if (typing != null) {
      finishTyping();
      return;
    }
    if (i >= lines.length - 1) {
      if (!d.choices?.length) close(null);
      return;
    }
    i += 1;
    show();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (typing != null) finishTyping();
      else if (!(i >= lines.length - 1 && d.choices?.length)) next();
    } else if (/^[1-9]$/.test(e.key) && i >= lines.length - 1 && typing == null && d.choices?.length) {
      const btn = actions.querySelector(`button[data-choice="${Number(e.key) - 1}"]`) as HTMLButtonElement | null;
      if (btn && !btn.disabled) {
        e.stopPropagation();
        btn.click();
      }
    } else if (e.key === 'Escape') {
      e.stopPropagation();
    }
  };
  window.addEventListener('keydown', onKey, true);
  box.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    if (typing != null) finishTyping();
  });
  if (!lines.length) {
    i = 0;
    renderActions();
  } else show();
}
