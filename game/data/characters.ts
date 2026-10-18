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
  iskritsa: { id: 'iskritsa', name: 'Искрица', icon: '🐭', badge: '✨', color: '#d9b77a' },
  shushulka: { id: 'shushulka', name: 'Баба Шушулка', icon: '🐭', badge: '🌿', color: '#9a9488' },
  letko: { id: 'letko', name: 'Летко', icon: '🦅', badge: '🩹', color: '#a8782f' },
  letokril: { id: 'letokril', name: 'Летокрил', icon: '🦅', badge: '✨', color: '#b8892f' },
  zlatokril: { id: 'zlatokril', name: 'Крал Златокрил', icon: '🦅', badge: '👑', color: '#d9a62c' },
  mama: { id: 'mama', name: 'Мама', icon: '🐭', badge: '💗', color: '#b07a8c' },
  tate: { id: 'tate', name: 'Татко', icon: '🐭', badge: '🔨', color: '#7a6a52' },
  belegor: { id: 'belegor', name: 'Белегор', icon: '🐀', badge: '🗡️', color: '#3b3431' },
  mortis: { id: 'mortis', name: 'Крал Мортис', icon: '🐀', badge: '👑', color: '#cfc8bd' },
  zubodrobko: { id: 'zubodrobko', name: 'Зъбодробко', icon: '🦦', badge: '🦷', color: '#2e2a2a' },
  zelendol: { id: 'zelendol', name: 'Едрият мишок от Зелендол', icon: '🐭', badge: '🎒', color: '#7d8a62' },
  fieldmouse: { id: 'fieldmouse', name: 'Бащата полска мишка', icon: '🐭', badge: '🌾', color: '#b59a5a' },
  fieldmum: { id: 'fieldmum', name: 'Майката полска мишка', icon: '🐭', badge: '🌾', color: '#c2a06a' },
  oldsquirrel: { id: 'oldsquirrel', name: 'Старата катерица', icon: '🐿️', badge: '🌲', color: '#8a5a32' },
  vole: { id: 'vole', name: 'Полевката', icon: '🐹', badge: '🌾', color: '#8a6a42' },
  hare: { id: 'hare', name: 'Заекът', icon: '🐇', color: '#7c8f5a' },
  eagles: { id: 'eagles', name: 'Орлите', icon: '🦅', color: '#8a6a32' },
  rats: { id: 'rats', name: 'Плъховете', icon: '🐀', color: '#4a403a' },
  townsfolk: { id: 'townsfolk', name: 'Освободените мишки', icon: '🐭', badge: '🎉', color: '#c9a35b' },
  narrator: { id: 'narrator', name: '', icon: '📖', color: '#5a4a32' },
};

/** Portraits for heroes on the map / in battle (non-story heroes use these too). */
export const HERO_PORTRAITS: Record<string, { icon: string; badge?: string; color: string }> = {
  mishkontin: { icon: '🐭', color: '#3f7d3a' },
  iskritsa: { icon: '🐭', badge: '✨', color: '#d9b77a' },
  hare: { icon: '🐇', color: '#7c8f5a' },
  oldsquirrel: { icon: '🐿️', badge: '🌲', color: '#8a5a32' },
  belegor: { icon: '🐀', badge: '🗡️', color: '#3b3431' },
  mortis: { icon: '🐀', badge: '👑', color: '#cfc8bd' },
  rat: { icon: '🐀', color: '#5d5048' },
  shushulka: { icon: '🐭', badge: '🌿', color: '#9a9488' },
  letko: { icon: '🦅', badge: '🩹', color: '#a8782f' },
  zelendol: { icon: '🐭', badge: '🎒', color: '#7d8a62' },
  fieldmouse: { icon: '🐭', badge: '🌾', color: '#b59a5a' },
  oldsquirrel2: { icon: '🐿️', color: '#8a5a32' },
  hareelder: { icon: '🐇', badge: '🌾', color: '#7c8f5a' },
  vole: { icon: '🐹', badge: '🌾', color: '#8a6a42' },
  mama: { icon: '🐭', badge: '💗', color: '#b07a8c' },
  zubodrobko: { icon: '🦦', badge: '🦷', color: '#2e2a2a' },
  fire: { icon: '🔥', color: '#7a2a1a' },
  cells: { icon: '⛓️', color: '#3a3430' },
};
