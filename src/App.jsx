import { useEffect, useMemo, useRef, useState } from 'react'
import { needsImage, searchFoodImages } from './lib/photos'
import { uid, makeFood, makePlace, loadState, bootstrapPlaces } from './lib/storage'
import { distanceMeters, GEO_RADIUS_M, searchNearbyRestaurants } from './lib/geo'
import { weightedPick, buildPool, pickIndexWeighted, sliceLayout, readWheelAngle, SPIN_MS } from './lib/spin'
import { averageRatings, topRated } from './lib/ratings'
import { encodeMenu, decodeMenu } from './lib/sharemenu'
import { shakeDelta, isShake } from './lib/shake'
import { buildBackup, validateBackup, applyBackup } from './lib/backup'
import { buildShareCard } from './lib/sharecard'
import { filterByTags, usedTags } from './lib/tags'
import { celebrate, vibrate, getAudioContext, playFanfare, playWhoosh, playTick } from './lib/feedback'
import Wheel from './components/Wheel.jsx'
import PlaceBar from './components/PlaceBar.jsx'
import Menu from './components/Menu.jsx'
import History from './components/History.jsx'
import WinnerModal from './components/WinnerModal.jsx'
import PlaceModal from './components/PlaceModal.jsx'
import PhotoPicker from './components/PhotoPicker.jsx'
import NearbyModal from './components/NearbyModal.jsx'
import RenameModal from './components/RenameModal.jsx'
import GroupModal from './components/GroupModal.jsx'
import TagModal from './components/TagModal.jsx'
import TagFilter from './components/TagFilter.jsx'
import EditDishMenu from './components/EditDishMenu.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'

/* -------------------------------------------------------------------------- */
/*  App                                                                       */
/* -------------------------------------------------------------------------- */
export default function App() {
  // Load places once — the lazy initializer runs bootstrapPlaces a single time,
  // so both states derive from the same generated id set.
  const [boot] = useState(bootstrapPlaces)
  const [places, setPlaces] = useState(boot.places)
  const [activePlaceId, setActivePlaceId] = useState(boot.activePlaceId)
  const [history, setHistory] = useState(() => loadState('wfd-history', []))

  const [input, setInput] = useState('')
  const [error, setError] = useState('') // food/spin validation (shown by the wheel)
  const [status, setStatus] = useState('') // location feedback (shown by the location bar)
  const [locating, setLocating] = useState(false)
  const [placeModal, setPlaceModal] = useState(null) // { mode:'add'|'edit', id?, name, emoji }
  // Photo picker shown when adding a food: { name, status, results, selectedId }
  const [photoPicker, setPhotoPicker] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null) // food pending removal
  const [confirmClearHistory, setConfirmClearHistory] = useState(false) // history wipe pending
  // Nearby-restaurants picker: { status:'loading'|'ok'|'empty'|'error', results, selected: string[] }
  const [nearbyModal, setNearbyModal] = useState(null)
  const [importConfirm, setImportConfirm] = useState(null) // parsed backup awaiting confirm
  const [backupMsg, setBackupMsg] = useState('') // inline feedback by the footer buttons
  const [renameTarget, setRenameTarget] = useState(null) // food being renamed
  const [tagTarget, setTagTarget] = useState(null) // food whose tags are being edited
  const [editDish, setEditDish] = useState(null) // food whose edit action sheet is open
  const [spinHint, setSpinHint] = useState('') // one-line hint shown when a toggle flips
  const [activeTags, setActiveTags] = useState([]) // wheel filter (transient, per place)
  // Group spin: { stage:'size' } → { stage:'veto', total, current, vetoed: [foodIds] }
  const [groupModal, setGroupModal] = useState(null)
  const groupVetoesRef = useRef([]) // vetoes applied to the very next spin only
  const [muted, setMuted] = useState(() => loadState('wfd-muted', false))
  const [shake, setShake] = useState(() => loadState('wfd-shake', false)) // shake-to-spin
  const [isTouch] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches,
  )
  // 'light' | 'dark' | null (= follow the system preference)
  const [theme, setTheme] = useState(() => loadState('wfd-theme', null))
  const [shareCopied, setShareCopied] = useState(false) // brief "copied!" feedback

  // Smarter spinning
  const [variety, setVariety] = useState(() => loadState('wfd-variety', true))
  const [knockout, setKnockout] = useState(() => loadState('wfd-knockout', false))
  const [favBoost, setFavBoost] = useState(() => loadState('wfd-favboost', false))
  // A shared menu arriving via a #menu= link, decoded once on load.
  const [importMenu, setImportMenu] = useState(() => {
    const m = window.location.hash.match(/^#menu=(.+)$/)
    return m ? decodeMenu(m[1]) : null
  })
  const [roundWon, setRoundWon] = useState(() => loadState('wfd-round', [])) // food ids won this round
  const lastWinnerId = useRef(null)

  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [winner, setWinner] = useState(null) // food object once spin resolves
  const winnerIndexRef = useRef(null)
  const spinListRef = useRef([]) // the exact list a spin is resolving over
  const shakeRef = useRef({ x: null, y: null, z: null, lastAt: 0 }) // last motion reading
  const onShakeRef = useRef(() => {}) // latest "what a shake should do", refreshed each render
  const wheelRef = useRef(null) // the rotating disc, read for spin tick sounds
  const tickRafRef = useRef(null)

  /* ------------------------------ Persistence ----------------------------- */
  useEffect(() => {
    // Persist a valid active id even if the current one was just deleted.
    const validId = places.some((p) => p.id === activePlaceId) ? activePlaceId : places[0]?.id
    localStorage.setItem('wfd-places-v1', JSON.stringify({ activePlaceId: validId, places }))
  }, [places, activePlaceId])
  useEffect(() => {
    localStorage.setItem('wfd-history', JSON.stringify(history))
  }, [history])
  useEffect(() => {
    localStorage.setItem('wfd-muted', JSON.stringify(muted))
  }, [muted])
  useEffect(() => {
    localStorage.setItem('wfd-shake', JSON.stringify(shake))
  }, [shake])
  // Apply the theme: toggle the .dark class and keep browser chrome in sync.
  const isDark =
    theme === 'dark' ||
    (theme !== 'light' &&
      typeof matchMedia !== 'undefined' &&
      matchMedia('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    localStorage.setItem('wfd-theme', JSON.stringify(theme))
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark ? '#211a14' : '#f8f3ec')
  }, [theme, isDark])
  useEffect(() => {
    localStorage.setItem('wfd-variety', JSON.stringify(variety))
  }, [variety])
  useEffect(() => {
    localStorage.setItem('wfd-knockout', JSON.stringify(knockout))
  }, [knockout])
  useEffect(() => {
    localStorage.setItem('wfd-favboost', JSON.stringify(favBoost))
  }, [favBoost])
  useEffect(() => {
    localStorage.setItem('wfd-round', JSON.stringify(roundWon))
  }, [roundWon])

  // Auto-clear transient toasts.
  useEffect(() => {
    if (!error) return
    const t = setTimeout(() => setError(''), 2500)
    return () => clearTimeout(t)
  }, [error])
  useEffect(() => {
    if (!status) return
    const t = setTimeout(() => setStatus(''), 3500)
    return () => clearTimeout(t)
  }, [status])
  useEffect(() => {
    if (!backupMsg) return
    const t = setTimeout(() => setBackupMsg(''), 3500)
    return () => clearTimeout(t)
  }, [backupMsg])
  useEffect(() => {
    if (!spinHint) return
    const t = setTimeout(() => setSpinHint(''), 30000)
    return () => clearTimeout(t)
  }, [spinHint])

  // Close whichever overlay is open on Escape (innermost first).
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key !== 'Escape') return
      if (photoPicker) setPhotoPicker(null)
      else if (placeModal) setPlaceModal(null)
      else if (nearbyModal) setNearbyModal(null)
      else if (confirmDelete) setConfirmDelete(null)
      else if (confirmClearHistory) setConfirmClearHistory(false)
      else if (importConfirm) setImportConfirm(null)
      else if (importMenu) setImportMenu(null)
      else if (renameTarget) setRenameTarget(null)
      else if (tagTarget) setTagTarget(null)
      else if (editDish) setEditDish(null)
      else if (groupModal) setGroupModal(null)
      else if (winner) setWinner(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [photoPicker, placeModal, nearbyModal, confirmDelete, confirmClearHistory, importConfirm, importMenu, renameTarget, tagTarget, editDish, groupModal, winner])

  /* ------------------------------- Derived -------------------------------- */
  const activePlace = useMemo(
    () => places.find((p) => p.id === activePlaceId) ?? places[0],
    [places, activePlaceId],
  )
  const foods = useMemo(() => activePlace?.foods ?? [], [activePlace])
  // The wheel spins among dishes matching the active filter ('fav' + tags; all
  // when none).
  const wheelFoods = useMemo(() => {
    let wf = filterByTags(foods, activeTags.filter((t) => t !== 'fav'))
    if (activeTags.includes('fav')) wf = wf.filter((f) => f.fav)
    return wf
  }, [foods, activeTags])
  // Filter chips: a "Favorites" chip (when any dish is favourited) + used tags.
  const filterChips = useMemo(() => {
    const chips = usedTags(foods)
    return foods.some((f) => f.fav) ? [{ key: 'fav', label: '♥ Favorites' }, ...chips] : chips
  }, [foods])
  // What's actually ON the wheel: in knock-out mode, already-won dishes are
  // removed (not just excluded from the pick) so their slices disappear.
  const remainingFoods = useMemo(
    () => (knockout ? wheelFoods.filter((f) => !roundWon.includes(f.id)) : wheelFoods),
    [knockout, wheelFoods, roundWon],
  )
  // Slice geometry (favorites get wider slices when boosted) and star averages.
  const layout = useMemo(() => sliceLayout(remainingFoods, favBoost), [remainingFoods, favBoost])
  const ratings = useMemo(() => averageRatings(history), [history])

  // Heal seeded / legacy foods (no image, or a dead Unsplash URL) by fetching a
  // photo from Openverse the first time their place is viewed — one gentle pass
  // per place per session; results persist, so it's a one-time cost.
  const placesRef = useRef(places)
  useEffect(() => {
    placesRef.current = places
  }, [places])
  const healedPlaces = useRef(new Set())
  useEffect(() => {
    const place = placesRef.current.find((p) => p.id === activePlaceId) ?? placesRef.current[0]
    if (!place || healedPlaces.current.has(place.id)) return
    healedPlaces.current.add(place.id) // mark up front so re-renders don't re-enter
    const needs = place.foods.filter((f) => needsImage(f.image))
    if (!needs.length) return
    let cancelled = false
    ;(async () => {
      for (const food of needs) {
        if (cancelled) break
        try {
          const [first] = await searchFoodImages(food.imageQuery || food.name, 1)
          const image = first?.full || first?.thumb
          if (image && !cancelled) {
            setPlaces((prev) =>
              prev.map((p) =>
                p.id === place.id
                  ? {
                      ...p,
                      foods: p.foods.map((f) =>
                        f.id === food.id ? { ...f, image } : f,
                      ),
                    }
                  : p,
              ),
            )
          }
        } catch {
          // leave the placeholder in place
        }
        await new Promise((r) => setTimeout(r, 600)) // be gentle on the API
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activePlaceId])

  /* ----------------------------- Food actions ---------------------------- */
  function updateActivePlaceFoods(updater) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === activePlace.id ? { ...p, foods: updater(p.foods) } : p)),
    )
  }

  // Open the photo picker for a dish — `editId` set means we're changing an
  // existing food's photo (not adding a new one). Searches both sources.
  function openPhotoPicker(name, editId = null) {
    setError('')
    setPhotoPicker({ name, editId, status: 'loading', results: [], selectedId: null, customUrl: '' })
    const same = (p) => p && p.name === name && p.editId === editId
    searchFoodImages(name, 8)
      .then((results) =>
        setPhotoPicker((p) =>
          same(p)
            ? { ...p, status: results.length ? 'ok' : 'empty', results, selectedId: results[0]?.id ?? null }
            : p,
        ),
      )
      .catch(() => setPhotoPicker((p) => (same(p) ? { ...p, status: 'error' } : p)))
  }

  // Validate the input, then open the picker to add a new dish.
  function handleAddFood(e) {
    e.preventDefault()
    const name = input.trim()
    if (!name) {
      setError('Please type a food name first.')
      return
    }
    if (foods.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      setError(`"${name}" is already on ${activePlace.name}'s menu.`)
      return
    }
    openPhotoPicker(name)
  }

  // Apply the chosen image — either updating an existing food or adding a new one.
  function applyPhoto(image) {
    const pp = photoPicker
    if (!pp) return
    if (pp.editId) {
      updateActivePlaceFoods((list) =>
        list.map((f) => (f.id === pp.editId ? { ...f, image: image ?? null } : f)),
      )
    } else {
      updateActivePlaceFoods((list) => [...list, makeFood(pp.name, image)])
      setInput('')
    }
    setError('')
    setPhotoPicker(null)
  }

  function confirmPhoto() {
    const pp = photoPicker
    const image =
      pp.selectedId === 'custom'
        ? pp.customUrl.trim()
        : pp.results.find((r) => r.id === pp.selectedId)?.full
    applyPhoto(image)
  }

  // Ask before removing — but keep the min-2 guard up front (no dialog if blocked).
  function requestDelete(food) {
    if (foods.length <= 2) {
      setError('Keep at least 2 options to spin.')
      return
    }
    setConfirmDelete(food)
  }

  function handleDelete(id) {
    updateActivePlaceFoods((list) => list.filter((f) => f.id !== id))
  }

  function confirmRemove() {
    if (confirmDelete) handleDelete(confirmDelete.id)
    setConfirmDelete(null)
  }

  // Rename a dish in place (photo and id are kept).
  function handleRename(name) {
    updateActivePlaceFoods((list) =>
      list.map((f) => (f.id === renameTarget.id ? { ...f, name: name.trim() } : f)),
    )
    setRenameTarget(null)
  }

  // Save the chosen tags onto a dish.
  function handleTags(tags) {
    updateActivePlaceFoods((list) =>
      list.map((f) => (f.id === tagTarget.id ? { ...f, tags } : f)),
    )
    setTagTarget(null)
  }

  // Toggle a dish as a favourite.
  function toggleFavorite(food) {
    updateActivePlaceFoods((list) =>
      list.map((f) => (f.id === food.id ? { ...f, fav: !f.fav } : f)),
    )
  }

  /* ----------------------------- Place actions --------------------------- */
  function switchPlace(id) {
    if (isSpinning) return
    setActivePlaceId(id)
    setActiveTags([]) // a filter from one menu shouldn't carry to another
    setError('')
  }

  function openAddPlace() {
    setPlaceModal({ mode: 'add', name: '', emoji: '🍽️' })
  }
  function openEditPlace() {
    setPlaceModal({ mode: 'edit', id: activePlace.id, name: activePlace.name, emoji: activePlace.emoji })
  }
  function savePlace() {
    const name = placeModal.name.trim()
    if (!name) return
    if (placeModal.mode === 'add') {
      const place = makePlace(name, placeModal.emoji)
      setPlaces((prev) => [...prev, place])
      setActivePlaceId(place.id)
    } else {
      setPlaces((prev) =>
        prev.map((p) => (p.id === placeModal.id ? { ...p, name, emoji: placeModal.emoji } : p)),
      )
    }
    setPlaceModal(null)
  }
  function deletePlace() {
    if (places.length <= 1) return
    setPlaces((prev) => prev.filter((p) => p.id !== placeModal.id))
    setPlaceModal(null)
  }
  function clearPin() {
    setPlaces((prev) => prev.map((p) => (p.id === placeModal.id ? { ...p, coords: null } : p)))
  }

  /* ----------------------------- Geolocation ----------------------------- */
  function withPosition(onOk) {
    if (!('geolocation' in navigator)) {
      setStatus('⚠️ Location isn’t available on this device.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        onOk({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        setLocating(false)
        setStatus(
          err.code === err.PERMISSION_DENIED
            ? '⚠️ Location permission denied.'
            : '⚠️ Couldn’t get your location.',
        )
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  function handleUseLocation() {
    withPosition((here) => {
      const pinned = places.filter((p) => p.coords)
      if (!pinned.length) {
        setStatus('No places pinned yet — use 📌 Pin here to save this spot.')
        return
      }
      let nearest = null
      let best = Infinity
      for (const p of pinned) {
        const d = distanceMeters(here, p.coords)
        if (d < best) {
          best = d
          nearest = p
        }
      }
      if (nearest && best <= GEO_RADIUS_M) {
        setActivePlaceId(nearest.id)
        setStatus(`📍 Switched to ${nearest.emoji} ${nearest.name}`)
      } else {
        setStatus(`No saved place within ${GEO_RADIUS_M}m — 📌 Pin here to save it.`)
      }
    })
  }

  function handlePinHere() {
    withPosition((here) => {
      setPlaces((prev) => prev.map((p) => (p.id === activePlace.id ? { ...p, coords: here } : p)))
      setStatus(`📌 Pinned ${activePlace.emoji} ${activePlace.name} to your location.`)
    })
  }

  // Find eateries around the user's current location, then open the picker.
  function handleNearby() {
    withPosition((here) => runNearbySearch(here.lat, here.lng, 3000))
  }

  // Query OSM at a given radius. Re-run by the distance pills; keeps the resolved
  // position so changing radius never re-prompts for location.
  function runNearbySearch(lat, lng, radius) {
    setNearbyModal({ status: 'loading', results: [], selected: [], lat, lng, radius, typeFilter: 'all' })
    searchNearbyRestaurants(lat, lng, radius)
      .then((results) =>
        setNearbyModal((m) =>
          m && m.radius === radius && m.status === 'loading'
            ? {
                ...m,
                status: results.length ? 'ok' : 'empty',
                results,
                selected: results.slice(0, 12).map((r) => r.name),
              }
            : m,
        ),
      )
      .catch(() =>
        setNearbyModal((m) =>
          m && m.radius === radius ? { ...m, status: 'error', results: [], selected: [] } : m,
        ),
      )
  }

  // Toggle a restaurant in the picker's selection.
  function toggleNearby(name) {
    setNearbyModal((m) =>
      m
        ? {
            ...m,
            selected: m.selected.includes(name)
              ? m.selected.filter((n) => n !== name)
              : [...m.selected, name],
          }
        : m,
    )
  }

  // Drop the chosen restaurants into a dedicated "Nearby" place and switch to it,
  // so the existing wheel/spin/history all work on real nearby spots. Each food
  // carries its coords (for "Open in Maps") and a cuisine-based image query.
  function applyNearby() {
    const chosen = nearbyModal.results.filter((r) => nearbyModal.selected.includes(r.name))
    if (!chosen.length) return
    const foods = chosen.map((r) => ({
      ...makeFood(r.name),
      lat: r.lat,
      lng: r.lng,
      imageQuery: r.cuisine || (r.kind === 'cafe' ? 'cafe' : 'restaurant food'),
    }))
    const existing = places.find((p) => p.name === 'Nearby')
    if (existing) {
      setPlaces((prev) => prev.map((p) => (p.id === existing.id ? { ...p, foods } : p)))
      setActivePlaceId(existing.id)
      healedPlaces.current.delete(existing.id) // let the refreshed spots heal their images
    } else {
      const place = makePlace('Nearby', '🍴')
      place.foods = foods
      setPlaces((prev) => [...prev, place])
      setActivePlaceId(place.id)
    }
    setNearbyModal(null)
    setStatus(`🍴 Added ${foods.length} nearby ${foods.length === 1 ? 'spot' : 'spots'} to spin`)
  }

  /* --------------------------- Spin tick sounds -------------------------- */
  // Click each time a segment passes the pointer. We read the wheel's real
  // rotation per frame, so clicks naturally start as a fast buzz and slow to
  // distinct ticks as the wheel decelerates. (Capped to one click per frame.)
  function startTicking() {
    if (muted) return
    const el = wheelRef.current
    if (!el) return
    const seg = 360 / Math.max(remainingFoods.length, 1)
    let prev = readWheelAngle(el)
    let traveled = 0
    let nextTick = seg
    const step = () => {
      const cur = readWheelAngle(el)
      let d = cur - prev
      if (d < -180) d += 360 // crossed the 360→0 wrap
      if (d < 0) d = 0 // ignore sub-pixel jitter
      traveled += d
      prev = cur
      let played = false
      while (traveled >= nextTick) {
        nextTick += seg
        if (!played) {
          playTick()
          played = true
        }
      }
      tickRafRef.current = requestAnimationFrame(step)
    }
    tickRafRef.current = requestAnimationFrame(step)
  }
  function stopTicking() {
    if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current)
    tickRafRef.current = null
  }
  // Stop any in-flight tick loop on unmount.
  useEffect(() => () => {
    if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current)
  }, [])

  /* -------------------------------- Spin --------------------------------- */
  function handleSpin() {
    // In knock-out the wheel shrinks to the last survivor, so 1 is spinnable.
    if (isSpinning || remainingFoods.length < (knockout ? 1 : 2)) return
    setError('')

    // Resume the audio context on this user gesture so the win chime can play.
    if (!muted) getAudioContext()?.resume?.()

    // Spin over the dishes actually on the wheel (won ones already removed);
    // capture them so the result is stable even if the menu changes mid-spin.
    const list = remainingFoods
    spinListRef.current = list

    // Build the eligible pool (group vetoes, last winner), then pick.
    const pool = buildPool(list, {
      excludeIds: groupVetoesRef.current,
      lastWinnerId: lastWinnerId.current,
    })
    if (pool.length === 0) return // round complete (spin is disabled, but guard anyway)
    // Variety mode: recency + ratings + boost; otherwise uniform (or 2:1 for
    // boosted favorites, matching their visually wider slices).
    const winnerIndex = variety
      ? weightedPick(pool, list, history.map((h) => h.name.toLowerCase()), {
          boostFavs: favBoost,
          ratings,
        })
      : pickIndexWeighted(pool, pool.map((i) => (favBoost && list[i].fav ? 2 : 1)))
    winnerIndexRef.current = winnerIndex

    // Land the winning segment's centre under the top pointer (0deg).
    const center = layout[winnerIndex].center
    const targetMod = (360 - center) % 360
    const currentMod = ((rotation % 360) + 360) % 360
    let delta = targetMod - currentMod
    if (delta < 0) delta += 360

    const fullSpins = 6
    setRotation(rotation + fullSpins * 360 + delta)
    setIsSpinning(true)

    if (!muted) {
      playWhoosh()
      startTicking()
      vibrate(18)
    }
    // Safety net: stop ticking even if the transitionend event is missed.
    setTimeout(stopTicking, SPIN_MS + 300)
  }

  function handleSpinEnd() {
    stopTicking()
    if (!isSpinning) return
    setIsSpinning(false)
    groupVetoesRef.current = [] // group vetoes apply to one spin only
    const idx = winnerIndexRef.current
    const list = spinListRef.current
    if (idx == null || !list[idx]) return
    const win = list[idx]
    lastWinnerId.current = win.id
    if (knockout) setRoundWon((prev) => (prev.includes(win.id) ? prev : [...prev, win.id]))
    setWinner(win)
    celebrate()
    if (!muted) {
      playFanfare()
      vibrate([35, 25, 90])
    }
    setHistory((prev) => [
      {
        id: uid('hist'),
        name: win.name,
        image: win.image,
        time: Date.now(),
        place: { name: activePlace.name, emoji: activePlace.emoji },
      },
      ...prev,
    ])
  }

  // Close the winner and immediately spin again.
  function spinAgain() {
    setWinner(null)
    setTimeout(() => handleSpin(), 120)
  }

  /* --------------------------- Spin-setting hints ------------------------- */
  // Each toggle flip briefly explains what the new state means (under the row).
  function toggleVariety() {
    const next = !variety
    setVariety(next)
    setSpinHint(
      next
        ? 'Favor variety on — recent meals become less likely; ★ ratings and ♥ favorites count too.'
        : 'Favor variety off — every dish has equal odds.',
    )
  }
  function toggleKnockout() {
    const next = !knockout
    setKnockout(next)
    if (next) setRoundWon([]) // turning it on starts a fresh round (full wheel)
    setSpinHint(
      next
        ? 'Knock-out on — each winner leaves the wheel until every dish has had a turn.'
        : 'Knock-out off — winners stay on the wheel.',
    )
  }
  function toggleFavBoost() {
    const next = !favBoost
    setFavBoost(next)
    setSpinHint(
      next
        ? 'Boost on — hearted dishes get double odds and wider slices.'
        : 'Boost off — favorites are back to normal odds.',
    )
  }

  // Shake-to-spin: enabling requests motion access on iOS (must run inside the
  // tap), then the devicemotion effect below listens while `shake` is on.
  async function toggleShake() {
    if (shake) {
      setShake(false)
      return
    }
    const DME = typeof window !== 'undefined' && window.DeviceMotionEvent
    if (DME && typeof DME.requestPermission === 'function') {
      try {
        if ((await DME.requestPermission()) !== 'granted') {
          setStatus('⚠️ Motion access denied — shake to spin needs it.')
          return
        }
      } catch {
        setStatus('⚠️ Motion isn’t available on this device.')
        return
      }
    }
    setShake(true)
    setStatus('🤳 Shake to spin on — give your phone a shake!')
  }

  /* ------------------------------ Group spin ------------------------------ */
  // Pass-the-phone mode: each person may veto one dish, then the wheel spins
  // among what's left. Vetoes apply to that one spin only.
  function startGroupSpin() {
    if (isSpinning || remainingFoods.length < 3) return
    setGroupModal({ stage: 'size' })
  }

  function chooseGroupSize(total) {
    setGroupModal({ stage: 'veto', total, current: 1, vetoed: [] })
  }

  // A veto is allowed only while ≥2 dishes would remain.
  function groupVeto(foodId) {
    setGroupModal((m) => {
      if (!m || m.stage !== 'veto') return m
      const vetoed =
        m.vetoed.includes(foodId) || m.vetoed.length >= foods.length - 2
          ? m.vetoed
          : [...m.vetoed, foodId]
      return advanceGroup({ ...m, vetoed })
    })
  }

  function groupSkip() {
    setGroupModal((m) => (m && m.stage === 'veto' ? advanceGroup(m) : m))
  }

  // Next person, or — after the last one — fire the spin with the vetoes.
  function advanceGroup(m) {
    if (m.current < m.total) return { ...m, current: m.current + 1 }
    groupVetoesRef.current = m.vetoed
    setTimeout(() => handleSpin(), 150)
    return null
  }

  // Share the winning pick. Preferred: a canvas-rendered image card via the
  // native share sheet (pre-rendered when the winner appears, so the share
  // stays inside the tap's user-activation window); falls back to plain text
  // share, then to the clipboard.
  const shareCardRef = useRef(null)
  useEffect(() => {
    shareCardRef.current = null
    if (!winner) return
    let cancelled = false
    buildShareCard(winner).then((blob) => {
      if (!cancelled) shareCardRef.current = blob
    })
    return () => {
      cancelled = true
    }
  }, [winner])

  async function shareWinner(food) {
    if (!food) return
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const text = `Tonight's pick: ${food.name}. Decided with the What's for Dinner wheel.`
    if (typeof navigator !== 'undefined' && navigator.share) {
      // Rich image card first, when the platform can share files.
      const blob = shareCardRef.current
      if (blob && navigator.canShare) {
        const file = new File([blob], 'tonights-pick.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({ files: [file], title: "What's for Dinner?", text: `${text} ${url}` })
            return
          } catch (e) {
            if (e?.name === 'AbortError') return // user closed the sheet
            // otherwise fall through to the plain share
          }
        }
      }
      try {
        await navigator.share({ title: "What's for Dinner?", text, url })
      } catch {
        // user dismissed the share sheet — nothing to do
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url ? `${text} ${url}` : text)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setError('Sharing isn’t supported on this device.')
    }
  }
  // Knock-out: clear the active place's foods from the won-this-round set.
  function resetRound() {
    const ids = new Set(wheelFoods.map((f) => f.id))
    setRoundWon((prev) => prev.filter((id) => !ids.has(id)))
  }

  /* ----------------------------- History actions ------------------------- */
  // Record whether the user actually went and ate the suggested dinner.
  // Tapping the already-selected status clears it back to "pending".
  function markEaten(id, value) {
    setHistory((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e
        const next = e.eaten === value ? null : value
        return {
          ...e,
          eaten: next,
          eatenAt: next === true ? Date.now() : null,
          // A rating only makes sense for a dinner that was actually eaten.
          rating: next === true ? e.rating : null,
        }
      }),
    )
  }

  // Star a dinner you ate (1–5); tapping the same star clears it.
  function rateEntry(id, value) {
    setHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rating: e.rating === value ? null : value } : e)),
    )
  }

  // Remove a single history entry (low-stakes — it's just a log, so no confirm).
  function removeHistoryEntry(id) {
    setHistory((prev) => prev.filter((e) => e.id !== id))
  }

  // Wipe the whole log (confirm-gated, like food deletion).
  function clearHistory() {
    setHistory([])
    setConfirmClearHistory(false)
  }

  /* ----------------------------- Backup actions --------------------------- */
  // Download everything (places, history, prefs) as one JSON file.
  function exportData() {
    const blob = new Blob([JSON.stringify(buildBackup(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `whats-for-dinner-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setBackupMsg('Backup downloaded.')
  }

  // Parse + validate a chosen backup file, then ask before overwriting.
  async function handleImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    let data
    try {
      data = JSON.parse(await file.text())
    } catch {
      setBackupMsg('That file isn’t valid JSON.')
      return
    }
    const problem = validateBackup(data)
    if (problem) {
      setBackupMsg(problem)
      return
    }
    setImportConfirm(data)
  }

  // Write the backup and reload so all state rehydrates consistently.
  function confirmImport() {
    applyBackup(importConfirm)
    window.location.reload()
  }

  // Lightweight dinner stats derived from history — a sticky, fun summary.
  const stats = useMemo(() => {
    const counts = new Map()
    for (const h of history) counts.set(h.name, (counts.get(h.name) ?? 0) + 1)
    let top = null
    let topN = 0
    for (const [name, n] of counts) {
      if (n > topN) {
        topN = n
        top = name
      }
    }
    return {
      total: history.length,
      top,
      eaten: history.filter((h) => h.eaten === true).length,
      topRated: topRated(history),
    }
  }, [history])

  /* ----------------------------- Shared menus ----------------------------- */
  // Share the active menu as a link (the dishes travel inside the URL hash).
  async function shareMenu() {
    const url = `${window.location.origin}${window.location.pathname}#menu=${encodeMenu(activePlace)}`
    const text = `My "${activePlace.name}" dinner menu — open to add it to your wheel:`
    if (navigator.share) {
      try {
        await navigator.share({ title: "What's for Dinner?", text, url })
        return
      } catch (e) {
        if (e?.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      setStatus('🔗 Menu link copied — send it to a friend')
    } catch {
      setStatus('⚠️ Couldn’t copy the link.')
    }
  }

  // Clean a #menu= hash off the URL after load so reloads don't re-prompt.
  useEffect(() => {
    if (window.location.hash.startsWith('#menu=')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }, [])

  // Accept a shared menu: add it as a new place and switch to it.
  function confirmImportMenu() {
    const place = makePlace(importMenu.name, importMenu.emoji)
    place.foods = importMenu.foods.map((f) => ({ ...makeFood(f.name), tags: f.tags }))
    setPlaces((prev) => [...prev, place])
    setActivePlaceId(place.id)
    setImportMenu(null)
    setStatus(`✨ Added "${importMenu.name}" with ${importMenu.foods.length} dishes`)
  }

  // Round is complete once every dish in the (filtered) menu has been knocked out.
  const roundComplete = knockout && wheelFoods.length > 0 && remainingFoods.length === 0
  const remaining = remainingFoods.length
  const canSpin = remainingFoods.length >= (knockout ? 1 : 2) && !isSpinning && !roundComplete
  const editingPlace = placeModal?.id ? places.find((p) => p.id === placeModal.id) : null

  /* ----------------------------- Shake to spin ---------------------------- */
  // Any overlay open ⇒ ignore shakes (don't spin behind a dialog).
  const anyOverlayOpen = Boolean(
    winner || placeModal || photoPicker || nearbyModal || confirmDelete || confirmClearHistory ||
      importConfirm || importMenu || renameTarget || tagTarget || editDish || groupModal,
  )
  // Keep the shake action pointing at the latest guards/handler (no stale closure).
  onShakeRef.current = () => {
    if (canSpin && !anyOverlayOpen) handleSpin()
  }
  // Listen for device shakes only while enabled.
  useEffect(() => {
    if (!shake) return
    function onMotion(e) {
      const a = e.accelerationIncludingGravity
      if (!a || a.x == null) return
      const s = shakeRef.current
      if (s.x !== null) {
        const now = Date.now()
        if (isShake(shakeDelta(s, a), now, s.lastAt)) {
          s.lastAt = now
          onShakeRef.current()
        }
      }
      s.x = a.x
      s.y = a.y
      s.z = a.z
    }
    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [shake])

  /* -------------------------------------------------------------------------- */
  return (
    <div className="min-h-screen text-ink">
      {/* Screen-reader-only announcement of the latest spin result. */}
      <p className="sr-only" role="status" aria-live="assertive">
        {winner ? `Tonight's dinner is ${winner.name}` : ''}
      </p>

      <div className="relative mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        {/* Theme + sound toggles */}
        <div className="absolute right-4 top-4 z-10 flex items-center gap-2 sm:right-6">
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-base shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            {isDark ? '☀️' : '🌙'}
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Sound off' : 'Sound on'}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-base shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {isTouch && (
            <button
              onClick={toggleShake}
              aria-pressed={shake}
              aria-label={shake ? 'Turn off shake to spin' : 'Turn on shake to spin'}
              title="Shake to spin"
              className={`flex h-10 w-10 items-center justify-center rounded-full border text-base shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                shake ? 'border-terra bg-terra/15 text-terra' : 'border-line bg-surface'
              }`}
            >
              🤳
            </button>
          )}
        </div>

        {/* Header */}
        <header className="animate-float-up text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-terra/90">
            Decide in one spin
          </p>
          <h1 className="mt-3 font-display text-[2.7rem] font-bold leading-[0.95] tracking-tight text-ink sm:text-6xl">
            What&apos;s for{' '}
            <span className="bg-gradient-to-br from-terra to-terra-deep bg-clip-text text-transparent">
              Dinner?
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm text-muted sm:text-base">
            Choose a place, spin the wheel, and get your answer in seconds.
          </p>
        </header>

        <PlaceBar
          places={places}
          activePlaceId={activePlace.id}
          locating={locating}
          status={status}
          onSwitch={switchPlace}
          onEdit={openEditPlace}
          onAdd={openAddPlace}
          onUseLocation={handleUseLocation}
          onPinHere={handlePinHere}
          onNearby={handleNearby}
        />

        {filterChips.length > 0 && (
          <TagFilter
            tags={filterChips}
            active={activeTags}
            count={wheelFoods.length}
            total={foods.length}
            disabled={isSpinning}
            onToggle={(key) =>
              setActiveTags((a) => (a.includes(key) ? a.filter((k) => k !== key) : [...a, key]))
            }
            onClear={() => setActiveTags([])}
          />
        )}

        <Wheel
          foods={remainingFoods}
          favBoost={favBoost}
          showFavBoost={foods.some((f) => f.fav)}
          rotation={rotation}
          isSpinning={isSpinning}
          canSpin={canSpin}
          roundComplete={roundComplete}
          remaining={remaining}
          roundTotal={wheelFoods.length}
          knockout={knockout}
          variety={variety}
          error={error}
          emptyLabel={
            roundComplete
              ? 'Every dish has had a turn — reset the round to go again'
              : activeTags.length
                ? 'No dishes match these filters'
                : 'Add some food below to fill the wheel'
          }
          wheelRef={wheelRef}
          onSpin={handleSpin}
          onSpinEnd={handleSpinEnd}
          onToggleVariety={toggleVariety}
          onToggleKnockout={toggleKnockout}
          onToggleFavBoost={toggleFavBoost}
          onResetRound={resetRound}
          canGroup={remainingFoods.length >= 3 && !isSpinning}
          onGroupSpin={startGroupSpin}
          hint={spinHint}
        />

        <Menu
          place={activePlace}
          foods={foods}
          input={input}
          knockout={knockout}
          roundWon={roundWon}
          onInputChange={setInput}
          onSubmit={handleAddFood}
          onEdit={setEditDish}
          onFavorite={toggleFavorite}
          onDelete={requestDelete}
          onShareMenu={shareMenu}
          ratings={ratings}
        />

        <History
          history={history}
          stats={stats}
          onClearAll={() => setConfirmClearHistory(true)}
          onMarkEaten={markEaten}
          onRate={rateEntry}
          onRemove={removeHistoryEntry}
        />

        <footer className="pb-4 pt-2 text-center text-xs text-muted/70">
          <div className="mb-2 flex items-center justify-center gap-3">
            <button
              onClick={exportData}
              className="font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline"
            >
              Export data
            </button>
            <span aria-hidden="true">·</span>
            <label className="cursor-pointer font-medium text-muted underline-offset-2 transition-colors hover:text-ink hover:underline">
              Import data
              <input
                type="file"
                accept="application/json,.json"
                onChange={handleImportFile}
                className="sr-only"
              />
            </label>
          </div>
          {backupMsg && <p className="animate-fade-in mb-2 font-medium text-terra">{backupMsg}</p>}
          Built with React + Vite + Tailwind · Photos from TheMealDB &amp; Openverse
        </footer>
      </div>

      {/* Winner modal */}
      {winner && (
        <WinnerModal
          winner={winner}
          roundComplete={roundComplete}
          shareCopied={shareCopied}
          onClose={() => setWinner(null)}
          onSpinAgain={spinAgain}
          onShare={() => shareWinner(winner)}
        />
      )}

      {/* Add / edit place modal */}
      {placeModal && (
        <PlaceModal
          modal={placeModal}
          canDelete={places.length > 1}
          showClearPin={Boolean(editingPlace?.coords)}
          onPatch={(patch) => setPlaceModal((m) => ({ ...m, ...patch }))}
          onSave={savePlace}
          onDelete={deletePlace}
          onClearPin={clearPin}
          onClose={() => setPlaceModal(null)}
        />
      )}

      {/* Photo picker (shown when adding a food) */}
      {photoPicker && (
        <PhotoPicker
          picker={photoPicker}
          onUpdate={setPhotoPicker}
          onConfirm={confirmPhoto}
          onUseDefault={() => applyPhoto(undefined)}
          onClose={() => setPhotoPicker(null)}
        />
      )}

      {/* Confirm remove food */}
      {confirmDelete && (
        <ConfirmModal
          labelId="confirm-delete-title"
          title="Remove this dish?"
          tone="danger"
          confirmLabel="Remove"
          message={
            <>
              <span className="font-semibold text-ink">{confirmDelete.name}</span> will be removed
              from {activePlace.emoji} {activePlace.name}.
            </>
          }
          onConfirm={confirmRemove}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {/* Confirm clear history */}
      {confirmClearHistory && (
        <ConfirmModal
          labelId="confirm-clear-title"
          title="Clear all history?"
          tone="danger"
          confirmLabel="Clear all"
          message={`This removes all ${history.length} ${
            history.length === 1 ? 'entry' : 'entries'
          } from your dinner history. This can’t be undone.`}
          onConfirm={clearHistory}
          onCancel={() => setConfirmClearHistory(false)}
        />
      )}

      {/* Restaurants near me (OpenStreetMap) */}
      {nearbyModal && (
        <NearbyModal
          modal={nearbyModal}
          onChangeRadius={(r) => runNearbySearch(nearbyModal.lat, nearbyModal.lng, r)}
          onSetFilter={(k) => setNearbyModal((m) => (m ? { ...m, typeFilter: k } : m))}
          onToggle={toggleNearby}
          onApply={applyNearby}
          onClose={() => setNearbyModal(null)}
        />
      )}

      {/* Confirm import backup (overwrites current data) */}
      {importConfirm && (
        <ConfirmModal
          labelId="import-title"
          title="Restore this backup?"
          confirmLabel="Restore"
          message={`It contains ${importConfirm['wfd-places-v1'].places.length} ${
            importConfirm['wfd-places-v1'].places.length === 1 ? 'place' : 'places'
          } and ${(importConfirm['wfd-history'] ?? []).length} history ${
            (importConfirm['wfd-history'] ?? []).length === 1 ? 'entry' : 'entries'
          }. Your current places, menus, and history will be replaced.`}
          onConfirm={confirmImport}
          onCancel={() => setImportConfirm(null)}
        />
      )}

      {/* Group spin (pass-the-phone vetoes) */}
      {groupModal && (
        <GroupModal
          modal={groupModal}
          foods={remainingFoods}
          onChooseSize={chooseGroupSize}
          onVeto={groupVeto}
          onSkip={groupSkip}
          onClose={() => setGroupModal(null)}
        />
      )}

      {/* Rename a dish */}
      {renameTarget && (
        <RenameModal
          target={renameTarget}
          existingNames={foods
            .filter((f) => f.id !== renameTarget.id)
            .map((f) => f.name.toLowerCase())}
          onSave={handleRename}
          onClose={() => setRenameTarget(null)}
        />
      )}

      {/* Tag a dish */}
      {tagTarget && (
        <TagModal target={tagTarget} onSave={handleTags} onClose={() => setTagTarget(null)} />
      )}

      {/* Import a shared menu (from a #menu= link) */}
      {importMenu && (
        <ConfirmModal
          labelId="import-menu-title"
          title={`Add "${importMenu.name}" menu?`}
          confirmLabel="Add menu"
          message={`Someone shared ${importMenu.foods.length} ${
            importMenu.foods.length === 1 ? 'dish' : 'dishes'
          } with you: ${importMenu.foods
            .slice(0, 8)
            .map((f) => f.name)
            .join(', ')}${importMenu.foods.length > 8 ? '…' : ''}. It'll be added as a new place.`}
          onConfirm={confirmImportMenu}
          onCancel={() => setImportMenu(null)}
        />
      )}

      {/* Edit a dish (action sheet → rename / tags / photo) */}
      {editDish && (
        <EditDishMenu
          food={editDish}
          onRename={() => {
            setRenameTarget(editDish)
            setEditDish(null)
          }}
          onTags={() => {
            setTagTarget(editDish)
            setEditDish(null)
          }}
          onPhoto={() => {
            openPhotoPicker(editDish.name, editDish.id)
            setEditDish(null)
          }}
          onClose={() => setEditDish(null)}
        />
      )}
    </div>
  )
}
