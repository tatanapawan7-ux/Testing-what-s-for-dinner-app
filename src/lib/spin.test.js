import { describe, it, expect, vi, afterEach } from 'vitest'
import { weightedPick, buildPool } from './spin'

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
})
