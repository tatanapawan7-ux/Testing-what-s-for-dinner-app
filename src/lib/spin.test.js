import { describe, it, expect, vi, afterEach } from 'vitest'
import { weightedPick, buildPool, sliceLayout, pickIndexWeighted } from './spin'

describe('sliceLayout', () => {
  it('gives equal slices normally', () => {
    const l = sliceLayout([{ name: 'a' }, { name: 'b', fav: true }], false)
    expect(l.map((s) => s.size)).toEqual([180, 180])
    expect(l[0]).toEqual({ start: 0, size: 180, center: 90 })
  })

  it('doubles favorited slices when the boost is on, still summing to 360', () => {
    const l = sliceLayout([{ name: 'a' }, { name: 'b', fav: true }, { name: 'c' }], true)
    expect(l.map((s) => s.size)).toEqual([90, 180, 90])
    expect(l[2].start + l[2].size).toBeCloseTo(360)
    expect(l[1].center).toBe(90 + 90) // contiguous slices
  })
})

describe('pickIndexWeighted', () => {
  afterEach(() => vi.restoreAllMocks())

  it('lands according to the weights', () => {
    // weights [1, 3]: r in [0,1) → first, [1,4) → second
    vi.spyOn(Math, 'random').mockReturnValue(0.2) // r = 0.8
    expect(pickIndexWeighted([7, 9], [1, 3])).toBe(7)
    vi.spyOn(Math, 'random').mockReturnValue(0.3) // r = 1.2
    expect(pickIndexWeighted([7, 9], [1, 3])).toBe(9)
  })
})

describe('buildPool', () => {
  const f = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]

  it('includes everything by default', () => {
    expect(buildPool(f)).toEqual([0, 1, 2, 3])
  })

  it('drops knocked-out dishes only in knockout mode', () => {
    expect(buildPool(f, { knockout: true, roundWon: ['b', 'd'] })).toEqual([0, 2])
    expect(buildPool(f, { knockout: false, roundWon: ['b', 'd'] })).toEqual([0, 1, 2, 3])
  })

  it('drops vetoed ids', () => {
    expect(buildPool(f, { excludeIds: ['a', 'c'] })).toEqual([1, 3])
  })

  it('avoids the previous winner when an alternative exists', () => {
    expect(buildPool(f, { lastWinnerId: 'a' })).toEqual([1, 2, 3])
    // …but keeps it when it is the only candidate left
    expect(buildPool(f, { excludeIds: ['b', 'c', 'd'], lastWinnerId: 'a' })).toEqual([0])
  })

  it('stacks all filters together', () => {
    expect(
      buildPool(f, { knockout: true, roundWon: ['d'], excludeIds: ['a'], lastWinnerId: 'b' }),
    ).toEqual([2])
  })
})

afterEach(() => vi.restoreAllMocks())

const foods = [{ name: 'Pizza' }, { name: 'Sushi' }]
const pool = [0, 1]

describe('weightedPick', () => {
  it('always returns an index from the pool', () => {
    for (let i = 0; i < 50; i++) {
      expect(pool).toContain(weightedPick(pool, foods, ['pizza', 'sushi']))
    }
  })

  it('weights a recent dish low and a never-recent dish high', () => {
    // history: pizza was just picked → weight 1; sushi unseen → weight 2 (len+1).
    // Total 3: r in [0,1) → pizza, r in [1,3) → sushi.
    const history = ['pizza']
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    expect(weightedPick(pool, foods, history)).toBe(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.4) // r = 1.2 → past pizza's band
    expect(weightedPick(pool, foods, history)).toBe(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.99)
    expect(weightedPick(pool, foods, history)).toBe(1)
  })

  it('treats all dishes equally with no history', () => {
    // Equal weights (1 each in an empty history → len+1 = 1): midpoint splits.
    vi.spyOn(Math, 'random').mockReturnValue(0.49)
    expect(weightedPick(pool, foods, [])).toBe(0)
    vi.spyOn(Math, 'random').mockReturnValue(0.51)
    expect(weightedPick(pool, foods, [])).toBe(1)
  })

  it('only counts the 30 most recent history entries', () => {
    // Pizza appears only at index 35 → outside the window → same top weight as sushi.
    const history = Array(35).fill('other').concat(['pizza'])
    vi.spyOn(Math, 'random').mockReturnValue(0.49)
    expect(weightedPick(pool, foods, history)).toBe(0) // equal weights → midpoint split
  })

  it('matches names case-insensitively via lowercased history', () => {
    // The caller lowercases history; food names are matched lowercased too.
    vi.spyOn(Math, 'random').mockReturnValue(0.0)
    expect(weightedPick([0], [{ name: 'PIZZA' }], ['pizza'])).toBe(0)
  })

  it('doubles a favorite with boostFavs on', () => {
    // No history → base weights 1 each; fav doubles Sushi: [1, 2], total 3.
    const favFoods = [{ name: 'Pizza' }, { name: 'Sushi', fav: true }]
    vi.spyOn(Math, 'random').mockReturnValue(0.35) // r = 1.05 → past Pizza's 1
    expect(weightedPick(pool, favFoods, [], { boostFavs: true })).toBe(1)
    expect(weightedPick(pool, favFoods, [], { boostFavs: false })).toBe(0) // r = 0.7
  })

  it('nudges by star ratings (3★ neutral)', () => {
    // ratings: pizza 1★ → ×1/3, sushi 5★ → ×5/3 ⇒ weights [1/3, 5/3], total 2.
    const ratings = new Map([['pizza', 1], ['sushi', 5]])
    vi.spyOn(Math, 'random').mockReturnValue(0.2) // r = 0.4 → past pizza's 1/3
    expect(weightedPick(pool, foods, [], { ratings })).toBe(1)
    vi.spyOn(Math, 'random').mockReturnValue(0.1) // r = 0.2 → inside pizza's slice
    expect(weightedPick(pool, foods, [], { ratings })).toBe(0)
  })
})
