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
