import FoodImage from './FoodImage.jsx'

function formatDate(ts) {
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Dinner history: the stats strip, the timeline, and per-entry controls.
export default function History({ history, stats, onClearAll, onMarkEaten, onRate, onRemove }) {
  return (
    <section className="animate-float-up [animation-delay:240ms]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">Dinner History</h2>
        {history.length > 0 && (
          <button
            onClick={onClearAll}
            className="rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm transition-all duration-300 hover:border-terra/40 hover:text-ink"
          >
            Clear all
          </button>
        )}
      </div>

      {stats.total > 0 && (
        <div className={`mb-4 grid gap-2.5 ${stats.topRated ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3'}`}>
          <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
            <div className="flex h-8 items-center justify-center font-display font-bold text-terra">
              <span key={stats.total} className="animate-ping-once text-2xl">
                {stats.total}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              Decided
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
            <div className="flex h-8 items-center justify-center font-display text-2xl font-bold text-sage">
              {stats.eaten}
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              Eaten
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
            <div
              className="flex h-8 items-center justify-center truncate px-1 font-display text-base font-bold text-ink"
              title={stats.top || ''}
            >
              {stats.top || '—'}
            </div>
            <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
              Top pick
            </div>
          </div>
          {stats.topRated && (
            <div className="rounded-2xl border border-line bg-surface p-3 text-center shadow-soft">
              <div
                className="flex h-8 items-center justify-center truncate px-1 font-display text-base font-bold capitalize text-gold"
                title={`${stats.topRated.name} — ★ ${stats.topRated.avg.toFixed(1)}`}
              >
                ★ {stats.topRated.name}
              </div>
              <div className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted">
                Top rated
              </div>
            </div>
          )}
        </div>
      )}

      {history.length === 0 ? (
        <p className="rounded-2xl border border-line bg-surface px-4 py-6 text-center text-sm text-muted shadow-sm">
          No spins yet — your past decisions will appear here.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="animate-fade-in flex items-start gap-4 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <FoodImage
                name={entry.name}
                src={entry.image}
                className="h-14 w-14 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-ink">{entry.name}</p>
                  {entry.place && (
                    <span className="shrink-0 rounded-full border border-line bg-cream px-2 py-0.5 text-xs text-muted">
                      {entry.place.emoji} {entry.place.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted">Spun {formatDate(entry.time)}</p>
                {entry.eaten === true && (
                  <>
                    <p className="text-xs font-medium text-sage">
                      ✓ Ate this{entry.eatenAt ? ` · ${formatDate(entry.eatenAt)}` : ''}
                    </p>
                    {/* How was it? Stars feed the wheel's variety weighting. */}
                    <div className="mt-0.5 flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          onClick={() => onRate(entry.id, n)}
                          aria-label={`Rate ${entry.name} ${n} of 5`}
                          aria-pressed={entry.rating === n}
                          className={`text-base leading-none transition-transform duration-150 hover:scale-125 ${
                            entry.rating >= n ? 'text-gold' : 'text-line'
                          }`}
                        >
                          ★
                        </button>
                      ))}
                      {!entry.rating && (
                        <span className="ml-1 text-[11px] text-muted/70">How was it?</span>
                      )}
                    </div>
                  </>
                )}
                {entry.eaten === false && (
                  <p className="text-xs font-medium text-muted">✗ Didn’t go</p>
                )}
              </div>

              {/* Did you actually go eat this? */}
              <div className="flex shrink-0 flex-col items-stretch gap-1">
                <button
                  onClick={() => onMarkEaten(entry.id, true)}
                  aria-pressed={entry.eaten === true}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                    entry.eaten === true
                      ? 'bg-sage/20 text-[#5d6a4c] ring-1 ring-sage/40'
                      : 'border border-line bg-cream text-muted hover:text-ink'
                  }`}
                >
                  ✅ Ate it
                </button>
                <button
                  onClick={() => onMarkEaten(entry.id, false)}
                  aria-pressed={entry.eaten === false}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ${
                    entry.eaten === false
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                      : 'border border-line bg-cream text-muted hover:text-ink'
                  }`}
                >
                  ❌ Didn’t
                </button>
              </div>

              {/* Remove this entry from the log */}
              <button
                onClick={() => onRemove(entry.id)}
                aria-label={`Remove ${entry.name} from history`}
                title="Remove from history"
                className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-line bg-cream text-muted transition-all duration-300 hover:border-terra/40 hover:text-terra"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
