// Shake detection for "shake to spin". Pure helpers; the devicemotion wiring
// (and iOS permission) lives in App. Acceleration is in m/s² — a vigorous
// phone shake swings well past the threshold between consecutive readings.

export const SHAKE_THRESHOLD = 16 // combined |Δx|+|Δy|+|Δz| that counts as a shake
export const SHAKE_COOLDOWN_MS = 1200 // ignore further shakes for this long after one

// Total change in acceleration between two readings ({ x, y, z }).
export function shakeDelta(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)
}

// A shake is a big enough jolt that's also past the cooldown since the last one.
export function isShake(delta, now, lastAt, { threshold = SHAKE_THRESHOLD, cooldown = SHAKE_COOLDOWN_MS } = {}) {
  return delta > threshold && now - lastAt > cooldown
}
