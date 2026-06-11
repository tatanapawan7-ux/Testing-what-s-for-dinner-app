// Data model + localStorage persistence helpers.

export function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function makeFood(name, image) {
  // No image yet → null; the heal effect fills seeded foods on first view, and
  // `placeholderImage` covers the gap. (Added foods pass the chosen photo.)
  const clean = name.trim()
  return { id: uid('food'), name: clean, image: image ?? null, tags: [] }
}

// A "place" is a named location with its own food list and an optional pinned
// GPS coordinate used for the "use my location" auto-switch.
export function makePlace(name, emoji, foodNames = []) {
  return {
    id: uid('place'),
    name: name.trim(),
    emoji,
    coords: null, // { lat, lng } once the user pins it
    foods: foodNames.map((n) => makeFood(n)),
  }
}

export function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

// Build the initial places, migrating any pre-existing flat `wfd-foods` list
// into a "Home" place so returning users keep their menu.
export function bootstrapPlaces() {
  const saved = loadState('wfd-places-v1', null)
  if (saved && Array.isArray(saved.places) && saved.places.length) return saved

  const home = makePlace('Home', '🏠')
  const oldFoods = loadState('wfd-foods', null)
  home.foods =
    Array.isArray(oldFoods) && oldFoods.length
      ? oldFoods
      : ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Thai'].map((n) => makeFood(n))

  const mall = makePlace('Mall', '🛍️', ['Burgers', 'Ramen', 'Sushi', 'Pizza', 'Dumplings'])
  const work = makePlace('Work', '💼', ['Salad', 'Sandwich', 'Curry', 'Noodles'])

  return { activePlaceId: home.id, places: [home, mall, work] }
}
