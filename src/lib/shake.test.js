import { describe, it, expect } from 'vitest'
import { shakeDelta, isShake, SHAKE_THRESHOLD, SHAKE_COOLDOWN_MS } from './shake'

describe('shakeDelta', () => {
  it('is zero for an unchanged reading', () => {
    const r = { x: 1, y: 2, z: 9.8 }
    expect(shakeDelta(r, r)).toBe(0)
  })

  it('sums the absolute change on each axis', () => {
    expect(shakeDelta({ x: 0, y: 0, z: 0 }, { x: 3, y: -4, z: 2 })).toBe(9)
  })
})

describe('isShake', () => {
  it('fires on a hard jolt past the threshold (cooldown elapsed)', () => {
    expect(isShake(SHAKE_THRESHOLD + 5, 10_000, 0)).toBe(true)
  })

  it('ignores gentle motion below the threshold', () => {
    expect(isShake(SHAKE_THRESHOLD - 1, 10_000, 0)).toBe(false)
  })

  it('debounces repeats within the cooldown window', () => {
    const now = 10_000
    expect(isShake(50, now, now - (SHAKE_COOLDOWN_MS - 100))).toBe(false) // too soon
    expect(isShake(50, now, now - (SHAKE_COOLDOWN_MS + 100))).toBe(true) // past cooldown
  })

  it('honours custom threshold/cooldown options', () => {
    expect(isShake(8, 100, 0, { threshold: 5, cooldown: 50 })).toBe(true)
    expect(isShake(8, 100, 80, { threshold: 5, cooldown: 50 })).toBe(false)
  })
})
