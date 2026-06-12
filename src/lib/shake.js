// Shake detection for "shake to spin". Pure helpers; the devicemotion wiring
// (and iOS permission) lives in App. Acceleration is in m/s².
//
// Readings are compared SHAKE_SAMPLE_MS apart (not per 60Hz frame): between
// consecutive frames even a hard shake only moves the needle slightly, but
// ~80ms spans close to half a shake cycle, so the delta is large and unambiguous.

export const SHAKE_THRESHOLD = 14 // combined |Δx|+|Δy|+|Δz| that counts as a shake
export const SHAKE_SAMPLE_MS = 80 // compare readings this far apart
export const SHAKE_COOLDOWN_MS = 1200 // ignore further shakes for this long after one

// Total change in acceleration between two readings ({ x, y, z }).
export function shakeDelta(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z)
}

// A shake is a big enough jolt that's also past the cooldown since the last one.
export function isShake(delta, now, lastAt, { threshold = SHAKE_THRESHOLD, cooldown = SHAKE_COOLDOWN_MS } = {}) {
  return delta > threshold && now - lastAt > cooldown
}
