// Share a whole menu as a link: the place (name, emoji, dish names + tags) is
// encoded as base64url JSON in the URL hash — no backend, no account. Images
// are not included; the heal effect refetches them on the receiving device.

const MAX_FOODS = 40

export function encodeMenu(place) {
  const payload = {
    v: 1,
    name: place.name,
    emoji: place.emoji,
    foods: place.foods
      .slice(0, MAX_FOODS)
      .map((f) => ({ name: f.name, ...(f.tags?.length ? { tags: f.tags } : {}) })),
  }
  // UTF-8-safe base64url (btoa alone chokes on non-Latin-1 dish names).
  const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(payload))))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// Decode + validate a shared menu. Returns a clean payload, or null when the
// hash isn't a usable menu (corrupt, wrong version, empty, hostile shapes).
export function decodeMenu(encoded) {
  try {
    let b64 = String(encoded).replace(/-/g, '+').replace(/_/g, '/')
    while (b64.length % 4) b64 += '='
    const d = JSON.parse(decodeURIComponent(escape(atob(b64))))
    if (!d || d.v !== 1 || typeof d.name !== 'string' || !Array.isArray(d.foods)) return null
    const foods = d.foods
      .slice(0, MAX_FOODS)
      .filter((f) => f && typeof f.name === 'string' && f.name.trim())
      .map((f) => ({
        name: f.name.trim().slice(0, 60),
        tags: Array.isArray(f.tags) ? f.tags.filter((t) => typeof t === 'string').slice(0, 10) : [],
      }))
    if (!foods.length) return null
    return {
      name: d.name.trim().slice(0, 40) || 'Shared menu',
      emoji: typeof d.emoji === 'string' && d.emoji ? d.emoji.slice(0, 4) : '🍽️',
      foods,
    }
  } catch {
    return null
  }
}
