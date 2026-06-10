import { describe, it, expect, vi, afterEach } from 'vitest'
import { placeholderImage, needsImage, searchFoodImages } from './photos'

describe('needsImage', () => {
  it('flags missing, non-string, and dead-Unsplash images', () => {
    expect(needsImage(null)).toBe(true)
    expect(needsImage('')).toBe(true)
    expect(needsImage(3)).toBe(true) // old versions stored array indices
    expect(needsImage('https://images.unsplash.com/photo-1')).toBe(true)
  })

  it('accepts a normal image URL', () => {
    expect(needsImage('https://www.themealdb.com/images/r.jpg')).toBe(false)
  })
})

describe('placeholderImage', () => {
  it('returns an inline SVG data URI containing the (sanitised) name', () => {
    const uri = placeholderImage('Pad <Thai> & Co')
    expect(uri.startsWith('data:image/svg+xml,')).toBe(true)
    const svg = decodeURIComponent(uri.slice('data:image/svg+xml,'.length))
    expect(svg).toContain('Pad Thai')
    expect(svg).not.toContain('<Thai>') // <>& stripped, no SVG injection
  })

  it('never throws on empty input', () => {
    expect(placeholderImage('')).toContain('Food')
  })
})

describe('searchFoodImages', () => {
  afterEach(() => vi.unstubAllGlobals())

  // Stub fetch per-API: TheMealDB and Openverse get different payloads.
  function stubApis({ mealdb, openverse }) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).includes('themealdb.com')) {
          if (mealdb === 'fail') throw new Error('network')
          return { ok: true, json: async () => ({ meals: mealdb }) }
        }
        if (openverse === 'fail') throw new Error('network')
        return { ok: true, json: async () => ({ results: openverse }) }
      }),
    )
  }

  it('prefers TheMealDB results and dedupes against Openverse by thumb', async () => {
    stubApis({
      mealdb: [{ idMeal: '1', strMealThumb: 'https://img/A.jpg', strMeal: 'Pad Thai' }],
      openverse: [
        { id: 'o1', thumbnail: 'https://img/A.jpg' }, // duplicate of mealdb → dropped
        { id: 'o2', thumbnail: 'https://img/B.jpg' },
      ],
    })
    const results = await searchFoodImages('pad thai')
    expect(results.map((r) => r.id)).toEqual(['mdb-1', 'o2'])
  })

  it('caps results at the requested count', async () => {
    stubApis({
      mealdb: [],
      openverse: [
        { id: 'o1', thumbnail: 'https://img/1.jpg' },
        { id: 'o2', thumbnail: 'https://img/2.jpg' },
        { id: 'o3', thumbnail: 'https://img/3.jpg' },
      ],
    })
    expect(await searchFoodImages('x', 2)).toHaveLength(2)
  })

  it('still returns results when one source fails', async () => {
    stubApis({ mealdb: 'fail', openverse: [{ id: 'o1', thumbnail: 'https://img/1.jpg' }] })
    expect(await searchFoodImages('x')).toHaveLength(1)
  })

  it('throws only when both sources fail', async () => {
    stubApis({ mealdb: 'fail', openverse: 'fail' })
    await expect(searchFoodImages('x')).rejects.toThrow('photo search failed')
  })
})
