/** Story speakers: name, look of the (simple) portrait. */
export interface Character {
  id: string;
  name: string;
  icon: string;
  /** Secondary glyph drawn on the portrait (crown, sword...). */
  badge?: string;
  color: string;
  /** Image portraits (Mishkontin only): mood -> url. */
  images?: Record<string, string>;
}

export const CHARACTERS: Record<string, Character> = {
  mishkontin: {
    id: 'mishkontin', name: 'Мишконтин', icon: '🐭', color: '#3f7d3a',
    images: {
      idle: 'img/mishkontin-idle.webp',
      happy: 'img/mishkontin-happy.webp',
      map: 'img/mishkontin-map.webp',
      surprised: 'img/mishkontin-surprised.webp',
    },
  },
  belagor: { id: 'belagor', name: 'Белагор', icon: '🦉', badge: '📜', color: '#8a96b8' },
  iskritsa: { id: 'iskritsa', name: 'Искрица', icon: '🐿️', badge: '🔥', color: '#d4622a' },
  letokril: { id: 'letokril', name: 'Летокрил', icon: '🦇', badge: '✉️', color: '#6a5a8c' },
  troshko: { id: 'troshko', name: 'Трошко', icon: '🦔', badge: '🎒', color: '#9a6b3c' },
  mortis: { id: 'mortis', name: 'Кралят Мортис', icon: '🐀', badge: '👑', color: '#8c2f39' },
  grizan: { id: 'grizan', name: 'Капитан Гризан', icon: '🐀', badge: '⚔️', color: '#6b4a3a' },
  shushumiga: { id: 'shushumiga', name: 'Шушумига', icon: '🐀', badge: '🎭', color: '#7a3f8c' },
  ruzha: { id: 'ruzha', name: 'Баба Ружа', icon: '🐭', badge: '🧶', color: '#a07a8c' },
  mouselings: { id: 'mouselings', name: 'Мишлетата', icon: '🐭', badge: '🐭', color: '#c9a35b' },
  narrator: { id: 'narrator', name: '', icon: '📖', color: '#5a4a32' },
  borko: { id: 'borko', name: 'Борко', icon: '🦫', badge: '🪵', color: '#7a5532' },
};

/** Portraits for heroes on the map / in battle (non-story heroes use these too). */
export const HERO_PORTRAITS: Record<string, { icon: string; badge?: string; color: string }> = {
  mishkontin: { icon: '🐭', color: '#3f7d3a' },
  iskritsa: { icon: '🐿️', badge: '🔥', color: '#d4622a' },
  rabbit: { icon: '🐇', color: '#7c8f5a' },
  beaver: { icon: '🦫', color: '#7a5532' },
  grizan: { icon: '🐀', badge: '⚔️', color: '#6b4a3a' },
  shushumiga: { icon: '🐀', badge: '🎭', color: '#7a3f8c' },
  mortis: { icon: '🐀', badge: '👑', color: '#8c2f39' },
  letokril: { icon: '🦇', badge: '✉️', color: '#6a5a8c' },
  rat: { icon: '🐀', color: '#5d5048' },
};
