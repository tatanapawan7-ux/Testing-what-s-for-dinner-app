// Dish tags: a small curated set, plus pure helpers for filtering a menu and
// discovering which tags a menu actually uses (for the filter bar).

export const TAGS = [
  { key: 'veg', label: 'Veg' },
  { key: 'vegan', label: 'Vegan' },
  { key: 'quick', label: 'Quick' },
  { key: 'healthy', label: 'Healthy' },
  { key: 'cheap', label: 'Cheap' },
  { key: 'spicy', label: 'Spicy' },
  { key: 'treat', label: 'Treat' },
]

const KEYS = new Set(TAGS.map((t) => t.key))

// Dishes carrying ALL of the active tags (an empty filter ⇒ every dish).
export function filterByTags(foods, activeTags) {
  if (!activeTags || activeTags.length === 0) return foods
  return foods.filter((f) => activeTags.every((t) => (f.tags ?? []).includes(t)))
}

// The tag definitions actually present in a menu, in TAGS order — so the filter
// bar only offers tags that would do something.
export function usedTags(foods) {
  const present = new Set()
  for (const f of foods) for (const t of f.tags ?? []) if (KEYS.has(t)) present.add(t)
  return TAGS.filter((t) => present.has(t.key))
}
