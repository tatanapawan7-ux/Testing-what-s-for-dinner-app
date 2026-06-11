// Star-rating aggregation. Ratings live on history entries; a dish's average
// is matched by (lowercased) name, same as the recency weighting.

// Map of lowercased dish name → average rating (1..5), over rated entries only.
export function averageRatings(history) {
  const sums = new Map()
  for (const h of history) {
    if (typeof h.rating !== 'number') continue
    const k = h.name.toLowerCase()
    const s = sums.get(k) ?? { total: 0, n: 0 }
    s.total += h.rating
    s.n += 1
    sums.set(k, s)
  }
  return new Map([...sums].map(([k, s]) => [k, s.total / s.n]))
}

// The best-rated dish, or null when nothing is rated yet.
export function topRated(history) {
  let best = null
  for (const [name, avg] of averageRatings(history)) {
    if (!best || avg > best.avg) best = { name, avg }
  }
  return best
}
