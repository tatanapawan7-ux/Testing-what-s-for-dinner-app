import Modal from './Modal.jsx'
import { formatDistance } from '../lib/geo'

const RADII = [
  [1000, '1 km'],
  [3000, '3 km'],
  [5000, '5 km'],
]

const TYPE_FILTERS = [
  ['all', 'All'],
  ['restaurant', 'Restaurants'],
  ['fast_food', 'Fast food'],
  ['cafe', 'Cafés'],
]

// Pick nearby restaurants (OpenStreetMap) to spin among: distance selector
// (re-queries), client-side type filter, multi-select list, and apply.
export default function NearbyModal({ modal, onChangeRadius, onSetFilter, onToggle, onApply, onClose }) {
  const filtered =
    modal.status === 'ok'
      ? modal.results.filter((r) => modal.typeFilter === 'all' || r.kind === modal.typeFilter)
      : []

  return (
    <Modal
      labelledBy="nearby-title"
      onClose={onClose}
      className="flex max-h-[85vh] max-w-md flex-col p-6"
    >
      <h3 id="nearby-title" className="font-display text-xl font-semibold text-ink">
        Restaurants near you
      </h3>
      <p className="mb-3 mt-1 text-sm text-muted">
        From OpenStreetMap. Pick the spots you&apos;d consider, then spin to decide.
      </p>

      {/* Distance selector (re-queries OSM) */}
      {modal.lat != null && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-muted">Within</span>
          {RADII.map(([r, label]) => (
            <button
              key={r}
              onClick={() => onChangeRadius(r)}
              aria-pressed={modal.radius === r}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                modal.radius === r
                  ? 'bg-terra text-white'
                  : 'border border-line bg-cream text-ink/70 hover:border-terra/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {modal.status === 'loading' && (
        <div className="flex h-40 items-center justify-center text-muted">
          Finding restaurants near you…
        </div>
      )}

      {(modal.status === 'empty' || modal.status === 'error') && (
        <p className="rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
          {modal.status === 'error'
            ? 'Couldn’t reach the restaurant search. Please try again.'
            : 'No restaurants found here. Try a wider distance above.'}
        </p>
      )}

      {modal.status === 'ok' && (
        <>
          {/* Type filter (client-side) */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {TYPE_FILTERS.map(([k, label]) => (
              <button
                key={k}
                onClick={() => onSetFilter(k)}
                aria-pressed={modal.typeFilter === k}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all duration-200 ${
                  modal.typeFilter === k
                    ? 'bg-ink text-white'
                    : 'border border-line bg-cream text-ink/70 hover:border-terra/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {filtered.length ? (
            <div className="-mx-1 flex-1 space-y-1.5 overflow-y-auto px-1">
              {filtered.map((r) => {
                const on = modal.selected.includes(r.name)
                const tags = [
                  r.cuisine,
                  r.kind === 'cafe' ? 'café' : r.kind === 'fast_food' ? 'fast food' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
                return (
                  <button
                    key={`${r.name}-${Math.round(r.dist)}`}
                    onClick={() => onToggle(r.name)}
                    aria-pressed={on}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ${
                      on ? 'border-terra/50 bg-terra/5' : 'border-line bg-cream hover:border-terra/30'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs ${
                        on ? 'border-terra bg-terra text-white' : 'border-line text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{r.name}</span>
                      <span className="block truncate text-xs capitalize text-muted">
                        {tags || 'restaurant'}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-muted">
                      {formatDistance(r.dist)}
                    </span>
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="flex-1 rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
              No matches for that filter.
            </p>
          )}
        </>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={onApply}
          disabled={modal.status !== 'ok' || modal.selected.length === 0}
          className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {modal.status === 'ok' && modal.selected.length > 0
            ? `Add ${modal.selected.length} to spin`
            : 'Add to spin'}
        </button>
        <button
          onClick={onClose}
          className="rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
        >
          Cancel
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted/70">
        Data © OpenStreetMap contributors
      </p>
    </Modal>
  )
}
