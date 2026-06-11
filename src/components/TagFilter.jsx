// The tag filter bar above the wheel: chips for the tags used in this menu.
// Selecting tags narrows the wheel (App applies the filter).
export default function TagFilter({ tags, active, count, total, disabled, onToggle, onClear }) {
  return (
    <div className="-mt-2 flex animate-float-up flex-wrap items-center justify-center gap-1.5 [animation-delay:90ms]">
      <span className="mr-1 text-xs font-medium text-muted">Filter:</span>
      {tags.map((t) => {
        const on = active.includes(t.key)
        return (
          <button
            key={t.key}
            onClick={() => onToggle(t.key)}
            disabled={disabled}
            aria-pressed={on}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all duration-200 disabled:opacity-50 ${
              on
                ? 'border-terra bg-terra text-white'
                : 'border-line bg-surface text-ink/70 hover:border-terra/40'
            }`}
          >
            {t.label}
          </button>
        )
      })}
      {active.length > 0 && (
        <button
          onClick={onClear}
          className="rounded-full px-2.5 py-1 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Clear ({count}/{total})
        </button>
      )}
    </div>
  )
}
