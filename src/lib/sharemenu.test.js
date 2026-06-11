import { describe, it, expect } from 'vitest'
import { encodeMenu, decodeMenu } from './sharemenu'

const place = {
  id: 'p1',
  name: 'Work',
  emoji: '💼',
  coords: { lat: 1, lng: 2 }, // must NOT leak into the link
  foods: [
    { id: 'f1', name: 'Salad', image: 'https://x/y.jpg', tags: ['veg', 'quick'] },
    { id: 'f2', name: 'ก๋วยเตี๋ยว', image: null, tags: [] }, // non-Latin names survive
  ],
}

describe('encodeMenu / decodeMenu round-trip', () => {
  it('carries name, emoji, dish names and tags — nothing else', () => {
    const out = decodeMenu(encodeMenu(place))
    expect(out).toEqual({
      name: 'Work',
      emoji: '💼',
      foods: [
        { name: 'Salad', tags: ['veg', 'quick'] },
        { name: 'ก๋วยเตี๋ยว', tags: [] },
      ],
    })
    expect(encodeMenu(place)).not.toContain('lat') // no location leakage
  })

  it('produces a URL-safe string', () => {
    expect(encodeMenu(place)).toMatch(/^[A-Za-z0-9_-]+$/)
  })
})

describe('decodeMenu validation', () => {
  it('rejects garbage, wrong versions, and empty menus', () => {
    expect(decodeMenu('not-base64!!!')).toBeNull()
    expect(decodeMenu(btoa(JSON.stringify({ v: 2, name: 'x', foods: [{ name: 'a' }] })))).toBeNull()
    expect(decodeMenu(btoa(JSON.stringify({ v: 1, name: 'x', foods: [] })))).toBeNull()
    expect(decodeMenu(btoa(JSON.stringify({ v: 1, foods: [{ name: 'a' }] })))).toBeNull()
  })

  it('sanitises hostile shapes and caps sizes', () => {
    const big = {
      v: 1,
      name: 'n'.repeat(100),
      emoji: 7, // wrong type
      foods: Array.from({ length: 60 }, (_, i) => ({
        name: ` dish-${i} `,
        tags: i === 0 ? ['veg', 9, { evil: true }] : undefined,
      })),
    }
    const out = decodeMenu(btoa(JSON.stringify(big)))
    expect(out.name).toHaveLength(40)
    expect(out.emoji).toBe('🍽️')
    expect(out.foods).toHaveLength(40)
    expect(out.foods[0].name).toBe('dish-0')
    expect(out.foods[0].tags).toEqual(['veg']) // non-strings dropped
  })
})
