// Winner-picking + wheel-rotation logic.

export const SPIN_MS = 4800

// Read the wheel's current visual rotation (degrees, 0–360) from its transform.
export function readWheelAngle(el) {
  const t = el && getComputedStyle(el).transform
  if (!t || t === 'none') return 0
  const m = t.match(/matrix\(([^)]+)\)/)
  if (!m) return 0
  const [a, b] = m[1].split(',').map(Number)
  let deg = (Math.atan2(b, a) * 180) / Math.PI
  if (deg < 0) deg += 360
  return deg
}

// Build the eligible index pool for a spin: drop knocked-out dishes, any
// explicitly excluded ids (group vetoes), and — when an alternative exists —
// the immediately previous winner.
export function buildPool(foods, { knockout = false, roundWon = [], excludeIds = [], lastWinnerId = null } = {}) {
  let pool = foods.map((_, i) => i)
  if (knockout) pool = pool.filter((i) => !roundWon.includes(foods[i].id))
  if (excludeIds.length) pool = pool.filter((i) => !excludeIds.includes(foods[i].id))
  if (pool.length > 1 && lastWinnerId) {
    const filtered = pool.filter((i) => foods[i].id !== lastWinnerId)
    if (filtered.length) pool = filtered
  }
  return pool
}

// Slice geometry for the wheel. Normally equal slices; with the favorites
// boost on, hearted dishes get double-width slices (and matching odds).
// Returns [{ start, size, center }] in degrees, summing to 360.
export function sliceLayout(foods, boostFavs = false) {
  const weights = foods.map((f) => (boostFavs && f.fav ? 2 : 1))
  const total = weights.reduce((a, b) => a + b, 0) || 1
  let acc = 0
  return weights.map((w) => {
    const size = (w / total) * 360
    const slice = { start: acc, size, center: acc + size / 2 }
    acc += size
    return slice
  })
}

// Weighted random over pool entries; `weights` is aligned to `pool`.
export function pickIndexWeighted(pool, weights) {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let k = 0; k < pool.length; k++) {
    r -= weights[k]
    if (r <= 0) return pool[k]
  }
  return pool[pool.length - 1]
}

// Recency-weighted pick over candidate food indices: dishes appearing recently
// in `historyNames` (lowercased, newest first) get lower weight, so the wheel
// favours variety. Never-recent dishes get the highest weight. Optionally,
// hearted dishes get double weight (boostFavs) and the user's average star
// ratings nudge odds (ratings: Map of lowercased name → 1..5; 3★ is neutral).
export function weightedPick(pool, foods, historyNames, { boostFavs = false, ratings = null } = {}) {
  const recent = historyNames.slice(0, 30)
  const weights = pool.map((i) => {
    const f = foods[i]
    const idx = recent.indexOf(f.name.toLowerCase())
    let w = idx === -1 ? recent.length + 1 : idx + 1
    if (boostFavs && f.fav) w *= 2
    const avg = ratings?.get(f.name.toLowerCase())
    if (avg) w *= avg / 3
    return w
  })
  return pickIndexWeighted(pool, weights)
}
