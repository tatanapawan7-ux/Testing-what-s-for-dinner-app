import { describe, it, expect, vi, afterEach } from 'vitest'
import { distanceMeters, formatDistance, searchNearbyRestaurants } from './geo'

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    const p = { lat: 13.7563, lng: 100.5018 }
    expect(distanceMeters(p, p)).toBe(0)
  })

  it('matches the known scale of one degree of latitude (~111.2 km)', () => {
    const d = distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })
    expect(d).toBeGreaterThan(110_000)
    expect(d).toBeLessThan(112_500)
  })

  it('is symmetric', () => {
    const a = { lat: 13.7563, lng: 100.5018 } // Bangkok
    const b = { lat: 18.7883, lng: 98.9853 } // Chiang Mai
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6)
  })
})

describe('formatDistance', () => {
  it('uses metres below 1 km', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(999.4)).toBe('999 m')
  })

  it('uses one-decimal kilometres from 1 km up', () => {
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(2345)).toBe('2.3 km')
  })
})

describe('searchNearbyRestaurants', () => {
  afterEach(() => vi.unstubAllGlobals())

  const overpass = (elements) => ({
    ok: true,
    json: async () => ({ elements }),
  })

  it('parses nodes and ways, sorts nearest-first, and cleans cuisine tags', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        overpass([
          // a way (polygon building) — coords come from `center`
          {
            type: 'way',
            center: { lat: 13.76, lon: 100.51 },
            tags: { name: 'Far Bistro', amenity: 'restaurant', cuisine: 'thai;seafood' },
          },
          // a node, closer than the way
          {
            type: 'node',
            lat: 13.7564,
            lon: 100.5018,
            tags: { name: 'Close Cafe', amenity: 'cafe', cuisine: 'ice_cream' },
          },
        ]),
      ),
    )
    const results = await searchNearbyRestaurants(13.7563, 100.5018)
    expect(results.map((r) => r.name)).toEqual(['Close Cafe', 'Far Bistro'])
    expect(results[0].cuisine).toBe('ice cream') // underscores cleaned
    expect(results[1].cuisine).toBe('thai') // first of multi-value tag
    expect(results[0].kind).toBe('cafe')
    expect(results[0].lat).toBeCloseTo(13.7564)
    expect(results[0].dist).toBeLessThan(results[1].dist)
  })

  it('skips unnamed elements and dedupes by name (case-insensitive)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        overpass([
          { type: 'node', lat: 1, lon: 1, tags: { amenity: 'restaurant' } }, // no name
          { type: 'node', lat: 1, lon: 1, tags: { name: 'Twin', amenity: 'restaurant' } },
          { type: 'node', lat: 1.001, lon: 1, tags: { name: 'TWIN', amenity: 'restaurant' } },
        ]),
      ),
    )
    const results = await searchNearbyRestaurants(1, 1)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Twin')
  })

  it('throws on an HTTP error so the caller can show an error state', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 504 })))
    await expect(searchNearbyRestaurants(1, 1)).rejects.toThrow('Overpass HTTP 504')
  })
})
