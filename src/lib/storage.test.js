import { describe, it, expect, vi, beforeEach } from 'vitest'
import { uid, makeFood, makePlace, loadState, bootstrapPlaces } from './storage'

// Minimal localStorage stand-in (tests run in Node, which has none).
function stubStorage(initial = {}) {
  const store = new Map(Object.entries(initial))
  vi.stubGlobal('localStorage', {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  })
}

beforeEach(() => stubStorage())

describe('uid', () => {
  it('prefixes and produces distinct ids', () => {
    const a = uid('food')
    const b = uid('food')
    expect(a).toMatch(/^food-/)
    expect(a).not.toBe(b)
  })
})

describe('makeFood / makePlace', () => {
  it('trims the name and defaults image to null', () => {
    const f = makeFood('  Ramen  ')
    expect(f.name).toBe('Ramen')
    expect(f.image).toBeNull()
    expect(f.id).toMatch(/^food-/)
  })

  it('keeps a provided image', () => {
    expect(makeFood('Pho', 'https://img/pho.jpg').image).toBe('https://img/pho.jpg')
  })

  it('builds a place with seeded foods and no pin', () => {
    const p = makePlace(' Gym ', '🏟️', ['Salad', 'Wrap'])
    expect(p.name).toBe('Gym')
    expect(p.coords).toBeNull()
    expect(p.foods.map((f) => f.name)).toEqual(['Salad', 'Wrap'])
  })
})

describe('loadState', () => {
  it('returns the fallback when the key is missing', () => {
    expect(loadState('nope', 'fb')).toBe('fb')
  })

  it('parses stored JSON', () => {
    stubStorage({ k: JSON.stringify({ a: 1 }) })
    expect(loadState('k', null)).toEqual({ a: 1 })
  })

  it('returns the fallback on corrupt JSON instead of throwing', () => {
    stubStorage({ k: '{not json' })
    expect(loadState('k', 'fb')).toBe('fb')
  })
})

describe('bootstrapPlaces', () => {
  it('seeds Home/Mall/Work on first run, active on Home', () => {
    const boot = bootstrapPlaces()
    expect(boot.places.map((p) => p.name)).toEqual(['Home', 'Mall', 'Work'])
    expect(boot.activePlaceId).toBe(boot.places[0].id)
    expect(boot.places[0].foods.map((f) => f.name)).toEqual([
      'Pizza',
      'Sushi',
      'Burgers',
      'Tacos',
      'Thai',
    ])
  })

  it('migrates a legacy flat wfd-foods list into Home', () => {
    const old = [{ id: 'f1', name: 'Pho', image: null }]
    stubStorage({ 'wfd-foods': JSON.stringify(old) })
    const boot = bootstrapPlaces()
    expect(boot.places[0].foods).toEqual(old)
    expect(boot.places).toHaveLength(3) // Mall/Work still seeded
  })

  it('returns saved places untouched when they exist', () => {
    const saved = {
      activePlaceId: 'p9',
      places: [{ id: 'p9', name: 'Custom', emoji: '☕', coords: null, foods: [] }],
    }
    stubStorage({ 'wfd-places-v1': JSON.stringify(saved) })
    expect(bootstrapPlaces()).toEqual(saved)
  })
})
