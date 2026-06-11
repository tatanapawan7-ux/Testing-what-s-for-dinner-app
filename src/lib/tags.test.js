import { describe, it, expect } from 'vitest'
import { TAGS, filterByTags, usedTags } from './tags'

const foods = [
  { id: '1', name: 'Salad', tags: ['veg', 'healthy', 'quick'] },
  { id: '2', name: 'Burger', tags: ['treat'] },
  { id: '3', name: 'Stir-fry', tags: ['veg', 'quick'] },
  { id: '4', name: 'Mystery' }, // no tags field at all
]

describe('filterByTags', () => {
  it('returns everything for an empty/absent filter', () => {
    expect(filterByTags(foods, [])).toHaveLength(4)
    expect(filterByTags(foods, null)).toHaveLength(4)
  })

  it('keeps dishes that have a single tag', () => {
    expect(filterByTags(foods, ['veg']).map((f) => f.name)).toEqual(['Salad', 'Stir-fry'])
  })

  it('requires ALL active tags (intersection)', () => {
    expect(filterByTags(foods, ['veg', 'healthy']).map((f) => f.name)).toEqual(['Salad'])
    expect(filterByTags(foods, ['veg', 'treat'])).toEqual([]) // nothing has both
  })

  it('treats a missing tags field as no tags', () => {
    expect(filterByTags(foods, ['veg']).some((f) => f.name === 'Mystery')).toBe(false)
  })
})

describe('usedTags', () => {
  it('returns only the tags present in the menu, in TAGS order', () => {
    expect(usedTags(foods).map((t) => t.key)).toEqual(['veg', 'quick', 'healthy', 'treat'])
  })

  it('is empty when nothing is tagged', () => {
    expect(usedTags([{ id: 'x', name: 'Plain' }])).toEqual([])
  })

  it('ignores unknown tag keys', () => {
    expect(usedTags([{ id: 'y', name: 'Weird', tags: ['not-a-real-tag'] }])).toEqual([])
  })

  it('every curated tag has a key and label', () => {
    expect(TAGS.every((t) => t.key && t.label)).toBe(true)
  })
})
