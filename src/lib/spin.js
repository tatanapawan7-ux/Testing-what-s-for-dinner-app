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
