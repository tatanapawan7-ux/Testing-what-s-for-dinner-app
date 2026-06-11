import FoodImage from './FoodImage.jsx'

// The active place's menu: the add-a-dish form and the food card grid.
export default function Menu({
  place,
  foods,
  input,
  knockout,
  roundWon,
  onInputChange,
  onSubmit,
  onEdit,
  onFavorite,
  onDelete,
  onShareMenu,
  ratings,
}) {
  const cornerBtn =
    'absolute top-2 flex h-8 w-8 items-center justify-center rounded-full text-white backdrop-blur transition-all duration-300'
  return (
    <section className="animate-float-up rounded-3xl border border-line bg-surface p-5 shadow-card [animation-delay:180ms] sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-ink">
          {place.emoji} {place.name}
          <span className="text-muted"> — Menu</span>
        </h2>
        {foods.length > 0 && (
          <button
            onClick={onShareMenu}
            title="Share this menu as a link"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm transition-all duration-300 hover:border-terra/40 hover:text-ink"
          >
            Share menu
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder="Add a dish… e.g. Ramen"
          className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder-muted/70 transition-all duration-300 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30 sm:text-base"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-gradient-to-br from-terra to-terra-light px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-6px_rgba(194,99,47,0.6)] active:scale-95 sm:text-base"
        >
          Add Food
        </button>
      </form>

      <div className="mt-5 grid grid-cols-2 gap-3.5">
        {foods.map((food) => {
          const picked = knockout && roundWon.includes(food.id)
          return (
            <div
              key={food.id}
              className={`group animate-fade-in relative overflow-hidden rounded-2xl border border-line bg-cream shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                picked ? 'opacity-55' : ''
              }`}
            >
              <FoodImage
                name={food.name}
                src={food.image}
                className="h-40 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-44"
              />

              {/* Favorite (top-left) */}
              <button
                onClick={() => onFavorite(food)}
                aria-label={food.fav ? `Unfavorite ${food.name}` : `Favorite ${food.name}`}
                aria-pressed={Boolean(food.fav)}
                title={food.fav ? 'Favorite' : 'Add to favorites'}
                className={`${cornerBtn} left-2 text-base hover:scale-110 ${
                  food.fav ? 'bg-red-500/85 hover:bg-red-500' : 'bg-[#2c2520]/55 hover:bg-[#2c2520]/75'
                }`}
              >
                {food.fav ? '♥' : '♡'}
              </button>

              {picked && (
                <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-terra shadow-sm">
                  ✓ picked
                </span>
              )}

              {/* Delete (top-right) */}
              <button
                onClick={() => onDelete(food)}
                aria-label={`Remove ${food.name}`}
                title="Remove"
                className={`${cornerBtn} right-2 bg-[#2c2520]/55 hover:bg-terra`}
              >
                ✕
              </button>

              {/* Name + tags + Edit */}
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-6">
                {(food.tags?.length ?? 0) > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {food.tags.map((t) => (
                      <span
                        key={t}
                        className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-medium capitalize text-white backdrop-blur-sm"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-white drop-shadow">
                      {food.name}
                    </span>
                    {ratings?.get(food.name.toLowerCase()) && (
                      <span className="shrink-0 rounded bg-gold/90 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                        ★ {ratings.get(food.name.toLowerCase()).toFixed(1)}
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => onEdit(food)}
                    aria-label={`Edit ${food.name}`}
                    className="shrink-0 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/30 active:scale-95"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
