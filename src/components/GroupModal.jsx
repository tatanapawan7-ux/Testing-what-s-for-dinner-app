import Modal from './Modal.jsx'

// Pass-the-phone group spin: pick the group size, then each person vetoes one
// dish (or skips). After the last person, App spins among what's left.
export default function GroupModal({ modal, foods, onChooseSize, onVeto, onSkip, onClose }) {
  const vetoed = modal.stage === 'veto' ? modal.vetoed : []
  const vetoesLeft = foods.length - 2 - vetoed.length // keep ≥2 dishes spinnable

  return (
    <Modal labelledBy="group-title" onClose={onClose} className="max-w-sm p-6">
      {modal.stage === 'size' ? (
        <>
          <h3 id="group-title" className="font-display text-xl font-semibold text-ink">
            Group spin
          </h3>
          <p className="mb-4 mt-1 text-sm text-muted">
            Pass the phone around — everyone gets one veto, then the wheel decides among
            what&apos;s left. How many people?
          </p>
          <div className="flex flex-wrap gap-2">
            {[2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => onChooseSize(n)}
                className="flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-cream text-lg font-semibold text-ink transition-all duration-200 hover:border-terra/50 hover:bg-terra/10"
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="mt-6 w-full rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
          >
            Cancel
          </button>
        </>
      ) : (
        <>
          <h3 id="group-title" className="font-display text-xl font-semibold text-ink">
            Person {modal.current} of {modal.total}
          </h3>
          <p className="mb-4 mt-1 text-sm text-muted">
            {vetoesLeft > 0
              ? 'Tap one dish you really don’t want — or skip.'
              : 'All vetoes are used up — pass it on with a skip.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {foods.map((food) => {
              const out = vetoed.includes(food.id)
              return (
                <button
                  key={food.id}
                  onClick={() => onVeto(food.id)}
                  disabled={out || vetoesLeft <= 0}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                    out
                      ? 'border-line bg-cream text-muted/60 line-through'
                      : 'border-line bg-cream text-ink hover:border-red-300 hover:bg-red-50 hover:text-red-700 disabled:opacity-50'
                  }`}
                >
                  {food.name}
                </button>
              )
            })}
          </div>
          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={onSkip}
              className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
              {modal.current < modal.total ? 'Skip — pass it on' : 'Skip — spin!'}
            </button>
            <button
              onClick={onClose}
              className="rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
