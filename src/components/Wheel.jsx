import { useMemo } from 'react'
import { SPIN_MS, sliceLayout } from '../lib/spin'

// Curated warm earth/jewel palette — harmonious, premium, cycles per segment.
const WHEEL_COLORS = [
  '#d2703a', '#e0a458', '#8e9b7c', '#c98b6b',
  '#a6603c', '#6e8b7b', '#d98e73', '#b08968',
]

// The decision wheel: disc, pointer, spin hub, error toast, and the
// variety/knock-out controls. Spin mechanics (winner choice, rotation target)
// live in App; this renders the given rotation and reports interactions up.
export default function Wheel({
  foods,
  favBoost,
  showFavBoost,
  rotation,
  isSpinning,
  canSpin,
  roundComplete,
  remaining,
  knockout,
  variety,
  error,
  emptyLabel = 'Add some food below to fill the wheel',
  wheelRef,
  onSpin,
  onSpinEnd,
  onToggleVariety,
  onToggleKnockout,
  onToggleFavBoost,
  onResetRound,
  canGroup,
  onGroupSpin,
  hint,
}) {
  // Slice geometry (favorites get wider slices when the boost is on) and the
  // conic-gradient background built from it.
  const layout = useMemo(() => sliceLayout(foods, favBoost), [foods, favBoost])
  const wheelBackground = useMemo(() => {
    if (foods.length === 0) return 'radial-gradient(circle at 50% 38%, #dca97e, #a6603c)'
    const stops = layout
      .map((s, i) => {
        const color = WHEEL_COLORS[i % WHEEL_COLORS.length]
        return `${color} ${s.start}deg ${s.start + s.size}deg`
      })
      .join(', ')
    return `conic-gradient(${stops})`
  }, [foods.length, layout])

  // Crowded wheels (9+ slices) get smaller, tighter labels so they stay legible.
  const crowded = foods.length > 8
  const labelClasses = crowded
    ? 'max-w-[4.5rem] text-xs sm:max-w-[6rem] sm:text-sm'
    : 'max-w-[5.5rem] text-sm sm:max-w-[7rem] sm:text-base'

  return (
    <section className="flex animate-float-up flex-col items-center [animation-delay:120ms]">
      <div className="relative">
        {/* Ambient glow behind the wheel (flares while spinning) */}
        <div
          className={`pointer-events-none absolute inset-0 -z-10 rounded-full bg-terra/30 blur-3xl transition-opacity duration-500 ${
            isSpinning ? 'opacity-90' : 'opacity-50'
          }`}
        />

        {/* Pointer — a polished gem pin (visual only; landing math is independent) */}
        <div className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2 drop-shadow-[0_5px_6px_rgba(120,80,40,0.4)]">
          <svg width="30" height="38" viewBox="0 0 32 40" fill="none" aria-hidden="true">
            <path d="M16 39 L4.5 18 A12 12 0 1 1 27.5 18 Z" fill="url(#ptr)" />
            <circle cx="16" cy="16" r="4.6" fill="#fffdf9" />
            <circle cx="16" cy="16" r="4.6" fill="none" stroke="#c2632f" strokeWidth="1.3" />
            <defs>
              <linearGradient id="ptr" x1="16" y1="4" x2="16" y2="39" gradientUnits="userSpaceOnUse">
                <stop stopColor="#3a302a" />
                <stop offset="1" stopColor="#231d18" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Outer ring — a tactile gradient bezel */}
        <div className="rounded-full bg-gradient-to-br from-surface to-cream-deep p-2.5 shadow-[0_28px_70px_-20px_rgba(120,80,40,0.55)] ring-1 ring-line sm:p-3">
          {/* Spinning disc */}
          <div
            ref={wheelRef}
            onTransitionEnd={onSpinEnd}
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
              const rotate = layout[i].center
              return (
                <div
                  key={food.id}
                  className="pointer-events-none absolute inset-0"
                  style={{ transform: `rotate(${rotate}deg)` }}
                >
                  <span
                    className={`absolute left-1/2 top-3 -translate-x-1/2 truncate text-center font-bold tracking-wide text-white [text-shadow:_0_1px_3px_rgb(60_36_20_/_55%)] sm:top-5 ${labelClasses}`}
                  >
                    {food.name}
                  </span>
                </div>
              )
            })}

            {foods.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-white/90 [text-shadow:_0_1px_2px_rgb(60_36_20_/_45%)]">
                {emptyLabel}
              </div>
            )}

            {/* Glossy sheen + hairline rim */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle_at_32%_24%,rgba(255,255,255,0.4),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-black/5" />
          </div>
        </div>

        {/* Spin button (center hub) */}
        <button
          onClick={onSpin}
          disabled={!canSpin}
          className={`absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-[5px] border-surface bg-gradient-to-br from-terra-light via-terra to-terra-deep text-base font-bold uppercase tracking-wider text-white shadow-[0_10px_28px_-6px_rgba(194,99,47,0.6)] transition-all duration-300 hover:scale-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100 sm:h-24 sm:w-24 sm:text-lg ${
            canSpin ? 'animate-glow-pulse' : ''
          }`}
        >
          <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent" />
          <span className="relative">{isSpinning ? '…' : roundComplete ? 'Done' : 'Spin'}</span>
        </button>
      </div>

      {error && (
        <p className="animate-fade-in mt-6 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      {/* Smarter-spin settings */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={onToggleVariety}
          aria-pressed={variety}
          title="Recent meals become less likely (ratings & favorites count too)"
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
            variety
              ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
              : 'border border-line bg-surface text-ink/70 shadow-sm hover:border-terra/40'
          }`}
        >
          Favor variety
        </button>
        <button
          onClick={onToggleKnockout}
          aria-pressed={knockout}
          title="Winners are removed until every dish has had a turn"
          className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
            knockout
              ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
              : 'border border-line bg-surface text-ink/70 shadow-sm hover:border-terra/40'
          }`}
        >
          Knock-out
        </button>
        {showFavBoost && (
          <button
            onClick={onToggleFavBoost}
            aria-pressed={favBoost}
            title="Give hearted dishes double odds (bigger slices)"
            className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
              favBoost
                ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
                : 'border border-line bg-surface text-ink/70 shadow-sm hover:border-terra/40'
            }`}
          >
            ♥ Boost favorites
          </button>
        )}
        <button
          onClick={onGroupSpin}
          disabled={!canGroup}
          title={canGroup ? 'Everyone vetoes one, then spin' : 'Needs at least 3 dishes'}
          className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink/70 shadow-sm transition-all duration-300 hover:border-terra/40 disabled:opacity-50"
        >
          👥 Group spin
        </button>
      </div>
      {/* One-line explanation of whatever was just toggled (auto-clears). */}
      {hint && (
        <p
          role="status"
          className="animate-fade-in mt-3 max-w-sm text-center text-sm text-muted"
        >
          {hint}
        </p>
      )}
      {knockout && (
        <div className="mt-3 flex items-center justify-center gap-3 text-sm text-muted">
          {roundComplete ? (
            <>
              <span className="font-medium text-terra">Round complete — everything’s been picked!</span>
              <button
                onClick={onResetRound}
                className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink/80 shadow-sm transition-all duration-300 hover:border-terra/40"
              >
                ↺ Reset round
              </button>
            </>
          ) : (
            <>
              <span>
                {remaining} of {foods.length} left this round
              </span>
              {remaining < foods.length && (
                <button
                  onClick={onResetRound}
                  className="rounded-full border border-line bg-surface px-3 py-1 font-medium text-ink/80 shadow-sm transition-all duration-300 hover:border-terra/40"
                >
                  ↺ Reset
                </button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  )
}
