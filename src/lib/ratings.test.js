import { describe, it, expect } from 'vitest'
import { averageRatings, topRated } from './ratings'

const history = [
  { name: 'Curry', rating: 5 },
  { name: 'curry', rating: 3 }, // same dish, different casing
  { name: 'Pizza', rating: 4 },
  { name: 'Salad', rating: null }, // unrated entries are ignored
  { name: 'Noodles' }, // no rating field at all
]

describe('averageRatings', () => {
  it('averages per dish, case-insensitively', () => {
    const r = averageRatings(history)
    expect(r.get('curry')).toBe(4)
    expect(r.get('pizza')).toBe(4)
  })

  it('ignores unrated entries', () => {
    const r = averageRatings(history)
    expect(r.has('salad')).toBe(false)
    expect(r.has('noodles')).toBe(false)
  })

  it('is empty for an empty history', () => {
    expect(averageRatings([]).size).toBe(0)
  })
})

describe('topRated', () => {
  it('returns the highest-average dish', () => {
    expect(topRated([...history, { name: 'Ramen', rating: 5 }])).toEqual({
      name: 'ramen',
      avg: 5,
    })
  })

  it('is null when nothing is rated', () => {
    expect(topRated([{ name: 'Pizza' }])).toBeNull()
  })
})
