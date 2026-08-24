/** Shared tag catalog for list filters + admin editors */
export const TAG_GROUPS = [
  {
    name: 'Game modes',
    tags: ['Cube', 'Ship', 'Ball', 'UFO', 'Wave', 'Robot', 'Spider', 'Swing', 'Jetpack', 'Dual', '2 Player', 'Mini', 'Teleport'],
  },
  {
    name: 'Skill & gimmicks',
    tags: ['Memory', 'Timing', 'Sync', 'Spam', 'Flow', 'Sightread', 'Fast-Paced', 'Slow-Paced', 'Nerve Control', 'Bossfight', 'Puzzle', 'Platformer'],
  },
  {
    name: 'Era & version',
    tags: ['1.9', '2.0', '2.1', '2.2', 'Old-School', 'Modern'],
  },
  {
    name: 'Decoration & theme',
    tags: ['Hell Theme', 'Glow', 'Design', 'Art', 'Effect', 'Nine Circles', 'Tech', 'Minimalist', 'Layout'],
  },
  {
    name: 'Ranking',
    tags: ['Main List', 'Extended List', 'Legacy List', 'Impossible List', 'Server Hardest', 'Top 1 Potential', 'Unrated', 'Rated'],
  },
];

export const ALL_TAGS = TAG_GROUPS.flatMap((g) => g.tags);

export function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags.map((t) => String(t || '').trim()).filter(Boolean);
}
