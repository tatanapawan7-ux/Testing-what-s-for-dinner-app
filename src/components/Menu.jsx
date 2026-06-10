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
  onChangePhoto,
  onRename,
  onDelete,
}) {
  return (
    <section className="animate-float-up rounded-3xl border border-line bg-surface p-5 shadow-card [animation-delay:180ms] sm:p-6">
      <h2 className="mb-4 font-display text-lg font-semibold text-ink">
        {place.emoji} {place.name}
        <span className="text-muted"> — Menu</span>
      </h2>

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

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                className="h-24 w-full object-cover transition-transform duration-300 group-hover:scale-105 sm:h-28"
              />
              {picked && (
                <span className="absolute left-2 top-2 rounded-full bg-surface/90 px-2 py-0.5 text-[11px] font-semibold text-terra shadow-sm">
                  ✓ picked
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/75 to-transparent px-3 py-2">
                <span className="truncate text-sm font-semibold text-white drop-shadow">
                  {food.name}
                </span>
                <span className="flex shrink-0 items-center gap-1.5">
                  <button
                    onClick={() => onRename(food)}
                    aria-label={`Rename ${food.name}`}
                    title="Rename"
                    className="text-sm leading-none text-white opacity-90 transition-opacity duration-300 hover:opacity-100"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => onChangePhoto(food.name, food.id)}
                    aria-label={`Change photo for ${food.name}`}
                    title="Change photo"
                    className="text-base leading-none opacity-90 transition-opacity duration-300 hover:opacity-100"
                  >
                    🖼
                  </button>
                </span>
              </div>
              <button
                onClick={() => onDelete(food)}
                aria-label={`Remove ${food.name}`}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-[#2c2520]/55 text-white backdrop-blur transition-all duration-300 hover:bg-terra"
              >
                ✕
              </button>
            </div>
          )
        })}
      </div>
    </section>
  )
}
