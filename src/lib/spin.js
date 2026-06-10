// Winner-picking logic for the wheel.

// Recency-weighted pick over candidate food indices: dishes appearing recently
// in `historyNames` (lowercased, newest first) get lower weight, so the wheel
// favours variety. Never-recent dishes get the highest weight.
export function weightedPick(pool, foods, historyNames) {
  const recent = historyNames.slice(0, 30)
  const weights = pool.map((i) => {
    const idx = recent.indexOf(foods[i].name.toLowerCase())
    return idx === -1 ? recent.length + 1 : idx + 1
  })
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let k = 0; k < pool.length; k++) {
    r -= weights[k]
    if (r <= 0) return pool[k]
  }
  return pool[pool.length - 1]
}
