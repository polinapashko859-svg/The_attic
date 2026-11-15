export const SKETCH_BRANCHES = [
  {
    value: 'parchment',
    label: 'Старинные хроники',
    shortLabel: 'Хроники',
    icon: '✦',
    hint: 'Загадочные находки и истории из прошлого.'
  },
  {
    value: 'kraft',
    label: 'Дневник странника',
    shortLabel: 'Странник',
    icon: '⌖',
    hint: 'Дороги, путешествия и приключения.'
  },
  {
    value: 'linen',
    label: 'Уютные мысли',
    shortLabel: 'Уют',
    icon: '⌂',
    hint: 'Быт, рецепты и тёплые моменты.'
  },
  {
    value: 'pressed-flower',
    label: 'Гербарий воспоминаний',
    shortLabel: 'Гербарий',
    icon: '❀',
    hint: 'Личные истории, чувства и романтика.'
  }
];

export const normalizeSketchBranch = (value) => (
  value === 'handmade-cotton' ? 'linen' : value
);

