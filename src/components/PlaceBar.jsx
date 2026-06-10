// Place chips + edit/add buttons, the location actions, and the status toast.
export default function PlaceBar({
  places,
  activePlaceId,
  locating,
  status,
  onSwitch,
  onEdit,
  onAdd,
  onUseLocation,
  onPinHere,
  onNearby,
}) {
  const locationButton =
    'rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium text-ink/80 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-md disabled:opacity-60'
  return (
    <section className="-mx-4 animate-float-up px-4 [animation-delay:60ms] sm:mx-0 sm:px-0">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {places.map((p) => {
          const active = p.id === activePlaceId
          return (
            <button
              key={p.id}
              onClick={() => onSwitch(p.id)}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 ${
                active
                  ? 'bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.55)]'
                  : 'border border-line bg-surface text-ink/70 shadow-sm hover:-translate-y-0.5 hover:border-terra/40 hover:text-ink'
              }`}
            >
              <span>{p.emoji}</span>
              <span>{p.name}</span>
              {p.coords && <span title="Location pinned">📍</span>}
            </button>
          )
        })}
        <button
          onClick={onEdit}
          aria-label="Edit current place"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-md"
        >
          ✎
        </button>
        <button
          onClick={onAdd}
          aria-label="Add a place"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-lg text-ink/60 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-ink hover:shadow-md"
        >
          ＋
        </button>
      </div>

      {/* Location bar */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <button onClick={onUseLocation} disabled={locating} className={locationButton}>
          {locating ? '… Locating' : '📍 Use my location'}
        </button>
        <button onClick={onPinHere} disabled={locating} className={locationButton}>
          📌 Pin here
        </button>
        <button onClick={onNearby} disabled={locating} className={locationButton}>
          🍴 Near me
        </button>
      </div>
      {status && (
        <p className="animate-fade-in mt-3 text-center text-sm font-medium text-terra">{status}</p>
      )}
    </section>
  )
}
