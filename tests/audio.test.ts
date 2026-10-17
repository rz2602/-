import { expect, it } from 'vitest';
import { SONGS } from '../game/ui/audio';

it('every song melody fills its bars exactly (4 beats per bar)', () => {
  for (const [name, song] of Object.entries(SONGS)) {
    const beats = song.melody.reduce((n, [, d]) => n + d, 0);
    expect(beats, name).toBe(song.chords.length * 4);
  }
});
