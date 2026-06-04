import { useEffect, useMemo, useRef, useState } from 'react'

/* -------------------------------------------------------------------------- */
/*  Food photography                                                          */
/* -------------------------------------------------------------------------- */
// Curated, high-quality Unsplash photo IDs for common foods. Picking by
// keyword keeps the imagery crisp and relevant. Unknown foods fall back to a
// rotating pool of appetizing shots (varied with an `&sig=` cache-buster).
const FOOD_PHOTO_IDS = {
  pizza: 'photo-1513104890138-7c749659a591',
  sushi: 'photo-1579871494447-9811cf80d66c',
  burger: 'photo-1568901346375-23c9450c58cd',
  burgers: 'photo-1568901346375-23c9450c58cd',
  taco: 'photo-1565299624946-b28f40a0ae38',
  tacos: 'photo-1565299624946-b28f40a0ae38',
  thai: 'photo-1559314809-0d155014e29e',
  pasta: 'photo-1551183053-bf91a1d81141',
  spaghetti: 'photo-1551183053-bf91a1d81141',
  salad: 'photo-1512621776951-a57141f2eefd',
  ramen: 'photo-1569718212165-3a8278d5f624',
  steak: 'photo-1546964124-0cce460f38ef',
  curry: 'photo-1455619452474-d2be8b1e70cd',
  indian: 'photo-1455619452474-d2be8b1e70cd',
  sandwich: 'photo-1528735602780-2552fd46c7af',
  pancakes: 'photo-1567620905732-2d1ec7ab7445',
  breakfast: 'photo-1567620905732-2d1ec7ab7445',
  noodles: 'photo-1612929633738-8fe44f7ec841',
  chicken: 'photo-1604908176997-125f25cc6f3d',
  fried: 'photo-1604908176997-125f25cc6f3d',
  bbq: 'photo-1529193591184-b1d58069ecdd',
  barbecue: 'photo-1529193591184-b1d58069ecdd',
  dumplings: 'photo-1496116218417-1a781b1c416c',
  chinese: 'photo-1525755662778-989d0524087e',
  mexican: 'photo-1565299624946-b28f40a0ae38',
  seafood: 'photo-1559339352-11d035aa65de',
  fish: 'photo-1559339352-11d035aa65de',
  soup: 'photo-1547592180-85f173990554',
  dessert: 'photo-1551024601-bec78aea704b',
  cake: 'photo-1578985545062-69928b1d9587',
  vegan: 'photo-1512621776951-a57141f2eefd',
  vegetarian: 'photo-1512621776951-a57141f2eefd',
  korean: 'photo-1590301157890-4810ed352733',
  italian: 'photo-1513104890138-7c749659a591',
  japanese: 'photo-1579871494447-9811cf80d66c',
}

// Generic, always-appetizing fallbacks for unrecognised keywords.
const FALLBACK_PHOTO_IDS = [
  'photo-1504674900247-0877df9cc836',
  'photo-1476224203421-9ac39bcb3327',
  'photo-1493770348161-369560ae357d',
  'photo-1414235077428-338989a2e8c0',
  'photo-1540189549336-e6e99c3679fe',
]

function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // force 32-bit int
  }
  return Math.abs(hash)
}

// Build an optimized Unsplash URL for a given food name + keyword match.
function imageForFood(name, size = 500) {
  const key = name.trim().toLowerCase().replace(/\s+/g, '')
  const words = name.trim().toLowerCase().split(/\s+/)

  let photoId = FOOD_PHOTO_IDS[key]
  if (!photoId) {
    // Try matching any single word in the name against the keyword map.
    const matchWord = words.find((w) => FOOD_PHOTO_IDS[w])
    photoId = matchWord ? FOOD_PHOTO_IDS[matchWord] : null
  }

  const hash = hashString(key || name)
  if (!photoId) {
    photoId = FALLBACK_PHOTO_IDS[hash % FALLBACK_PHOTO_IDS.length]
  }

  // `sig` keeps fallbacks visually distinct without breaking the CDN cache.
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${size}&q=80&sig=${hash % 1000}`
}

function makeFood(name) {
  const clean = name.trim()
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: clean,
    image: imageForFood(clean),
  }
}

/* -------------------------------------------------------------------------- */
/*  Defaults & persistence                                                    */
/* -------------------------------------------------------------------------- */
const DEFAULT_FOODS = ['Pizza', 'Sushi', 'Burgers', 'Tacos', 'Thai'].map(makeFood)

// Appetizing wheel palette — warm + vibrant, cycles per segment.
const WHEEL_COLORS = [
  '#f59e0b', '#f43f5e', '#10b981', '#3b82f6', '#8b5cf6',
  '#ec4899', '#ef4444', '#14b8a6', '#f97316', '#a855f7',
]

const SPIN_MS = 4800

function loadState(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */
export default function App() {
  const [foods, setFoods] = useState(() => loadState('wfd-foods', DEFAULT_FOODS))
  const [history, setHistory] = useState(() => loadState('wfd-history', []))
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState(null) // food object once spin resolves
  const winnerIndexRef = useRef(null)

  // Persist to localStorage.
  useEffect(() => {
    localStorage.setItem('wfd-foods', JSON.stringify(foods))
  }, [foods])
  useEffect(() => {
    localStorage.setItem('wfd-history', JSON.stringify(history))
  }, [history])

  // Clear transient error after a moment.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 2500)
    return () => clearTimeout(t)
  }, [error])

  const segAngle = useMemo(() => 360 / Math.max(foods.length, 1), [foods.length])

  // conic-gradient background for the wheel slices.
  const wheelBackground = useMemo(() => {
    if (foods.length === 0) return '#1e293b'
    const stops = foods
      .map((_, i) => {
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
        return `${color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`
      })
      .join(', ')
    return `conic-gradient(${stops})`
  }, [foods, segAngle])

  /* ----------------------------- Food actions ---------------------------- */
  function handleAddFood(e) {
    e.preventDefault()
    const name = input.trim()
    if (!name) {
      setError('Please type a food name first.')
      return
    }
    const exists = foods.some((f) => f.name.toLowerCase() === name.toLowerCase())
    if (exists) {
      setError(`"${name}" is already on the menu.`)
      return
    }
    setFoods((prev) => [...prev, makeFood(name)])
    setInput('')
    setError('')
  }

  function handleDelete(id) {
    if (foods.length <= 2) {
      setError('Keep at least 2 options to spin.')
      return
    }
    setFoods((prev) => prev.filter((f) => f.id !== id))
  }

  /* -------------------------------- Spin --------------------------------- */
  function handleSpin() {
    if (isSpinning || foods.length < 2) return
    setError('')

    const winnerIndex = Math.floor(Math.random() * foods.length)
    winnerIndexRef.current = winnerIndex

    // Land the winning segment's centre under the top pointer (0deg).
    const center = winnerIndex * segAngle + segAngle / 2
    const targetMod = (360 - center) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta < 0) delta += 360

    const fullSpins = 6
    setRotation(rotation + fullSpins * 360 + delta)
    setIsSpinning(true)
  }

  function handleSpinEnd() {
    if (!isSpinning) return
    setIsSpinning(false)
    const idx = winnerIndexRef.current
    if (idx == null || !foods[idx]) return
    const win = foods[idx]
    setWinner(win)
    setHistory((prev) => [
      { id: `${Date.now()}`, name: win.name, image: win.image, time: Date.now() },
      ...prev,
    ])
  }

  const canSpin = foods.length >= 2 && !isSpinning

  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-neutral-950 text-slate-100">
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="text-center">
          <h1 className="bg-gradient-to-r from-amber-300 via-orange-400 to-rose-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            What&apos;s for Dinner?
          </h1>
          <p className="mt-3 text-sm text-slate-400 sm:text-base">
            Can&apos;t decide? Give the wheel a spin and let fate plate your dinner. 🍽️
          </p>
        </header>

        {/* Wheel */}
        <section className="flex flex-col items-center">
          <div className="relative">
            {/* Pointer */}
            <div className="absolute -top-1 left-1/2 z-20 h-0 w-0 -translate-x-1/2 border-l-[14px] border-r-[14px] border-t-[26px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_3px_4px_rgba(0,0,0,0.5)]" />

            {/* Outer ring */}
            <div className="rounded-full bg-gradient-to-br from-amber-300 to-rose-400 p-1.5 shadow-2xl shadow-rose-500/20 sm:p-2">
              {/* Spinning disc */}
              <div
                onTransitionEnd={handleSpinEnd}
                className="relative h-72 w-72 rounded-full sm:h-96 sm:w-96"
                style={{
                  background: wheelBackground,
                  transform: `rotate(${rotation}deg)`,
                  transition: isSpinning
                    ? `transform ${SPIN_MS}ms cubic-bezier(0.1, 0.8, 0.3, 1)`
                    : 'none',
                }}
              >
                {/* Slice labels */}
                {foods.map((food, i) => {
                  const rotate = i * segAngle + segAngle / 2
                  return (
                    <div
                      key={food.id}
                      className="pointer-events-none absolute inset-0"
                      style={{ transform: `rotate(${rotate}deg)` }}
                    >
                      <span className="absolute left-1/2 top-3 max-w-[5.5rem] -translate-x-1/2 truncate text-center text-sm font-bold text-white [text-shadow:_0_1px_3px_rgb(0_0_0_/_70%)] sm:top-5 sm:max-w-[7rem] sm:text-base">
                        {food.name}
                      </span>
                    </div>
                  )
                })}

                {/* Subtle inner sheen */}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
              </div>
            </div>

            {/* Spin button (center hub) */}
            <button
              onClick={handleSpin}
              disabled={!canSpin}
              className="absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-amber-400 to-orange-500 text-base font-black uppercase tracking-wide text-white shadow-lg shadow-black/40 transition-all duration-300 hover:scale-110 hover:shadow-amber-400/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100 sm:h-24 sm:w-24 sm:text-lg"
            >
              {isSpinning ? '…' : 'Spin'}
            </button>
          </div>

          {error && (
            <p className="animate-fade-in mt-6 rounded-full bg-rose-500/15 px-4 py-2 text-sm font-medium text-rose-300 ring-1 ring-rose-500/30">
              {error}
            </p>
          )}
        </section>

        {/* Food management */}
        <section className="rounded-3xl bg-white/5 p-5 ring-1 ring-white/10 backdrop-blur sm:p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-100">Your Menu</h2>

          <form onSubmit={handleAddFood} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Add a dish… e.g. Ramen"
              className="min-w-0 flex-1 rounded-xl border-0 bg-slate-800/80 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 ring-1 ring-white/10 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-amber-400 sm:text-base"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-orange-500/40 active:scale-95 sm:text-base"
            >
              Add Food
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {foods.map((food) => (
              <div
                key={food.id}
                className="group animate-fade-in relative overflow-hidden rounded-2xl bg-slate-800/60 ring-1 ring-white/10 transition-all duration-300 hover:ring-amber-400/50"
              >
                <img
                  src={food.image}
                  alt={food.name}
                  loading="lazy"
                  className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-28"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2">
                  <span className="text-sm font-semibold text-white drop-shadow">{food.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(food.id)}
                  aria-label={`Remove ${food.name}`}
                  className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur transition-all duration-300 hover:bg-rose-500 group-hover:opacity-100"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* History */}
        <section>
          <h2 className="mb-4 text-lg font-bold text-slate-100">Dinner History</h2>
          {history.length === 0 ? (
            <p className="rounded-2xl bg-white/5 px-4 py-6 text-center text-sm text-slate-500 ring-1 ring-white/10">
              No spins yet — your past dinners will appear here. 🕑
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {history.map((entry) => (
                <li
                  key={entry.id}
                  className="animate-fade-in flex items-center gap-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10 transition-all duration-300 hover:bg-white/10"
                >
                  <img
                    src={entry.image}
                    alt={entry.name}
                    loading="lazy"
                    className="h-14 w-14 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-100">{entry.name}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(entry.time).toLocaleString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span className="text-xl">🍴</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="pb-4 pt-2 text-center text-xs text-slate-600">
          Built with React + Vite + Tailwind · Photos from Unsplash
        </footer>
      </div>

      {/* Winner modal */}
      {winner && (
        <div
          className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setWinner(null)}
        >
          <div
            className="animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl bg-slate-900 shadow-2xl ring-1 ring-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 w-full">
              <img
                src={imageForFood(winner.name, 800)}
                alt={winner.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
            </div>
            <div className="px-6 pb-6 pt-2 text-center">
              <p className="text-sm font-medium uppercase tracking-widest text-amber-400">
                🎉 Tonight&apos;s Dinner is
              </p>
              <h3 className="mt-1 text-3xl font-black text-white">{winner.name}!</h3>
              <button
                onClick={() => setWinner(null)}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
