import Modal from './Modal.jsx'
import FoodImage from './FoodImage.jsx'

// The celebration dialog shown when the wheel lands.
export default function WinnerModal({ winner, roundComplete, shareCopied, onClose, onSpinAgain, onShare }) {
  return (
    <Modal labelledBy="winner-title" onClose={onClose} className="max-w-sm overflow-hidden">
      <div className="relative h-60 w-full">
        <FoodImage name={winner.name} src={winner.image} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/10 to-transparent" />
      </div>
      <div className="px-6 pb-6 pt-1 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-terra">
          Tonight&apos;s pick
        </p>
        <h3 id="winner-title" className="mt-1.5 font-display text-4xl font-bold tracking-tight text-ink">
          {winner.name}
        </h3>
        {winner.lat != null && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${winner.lat},${winner.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-terra hover:underline"
          >
            Open in Maps ↗
          </a>
        )}
        <div className="mt-6 flex items-center gap-2">
          {!roundComplete && (
            <button
              onClick={onSpinAgain}
              className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-5 py-3 font-semibold text-white shadow-[0_10px_26px_-8px_rgba(194,99,47,0.55)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
            >
              Spin again
            </button>
          )}
          <button
            onClick={onClose}
            className={`rounded-xl px-5 py-3 font-medium transition-all duration-300 active:scale-95 ${
              roundComplete
                ? 'flex-1 bg-gradient-to-br from-terra to-terra-light text-white shadow-[0_10px_26px_-8px_rgba(194,99,47,0.55)] hover:-translate-y-0.5'
                : 'border border-line bg-cream text-ink/70 hover:bg-line/40'
            }`}
          >
            Close
          </button>
        </div>
        <button
          onClick={onShare}
          className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-cream px-4 py-2.5 text-sm font-medium text-ink/70 transition-all duration-300 hover:border-terra/40 hover:text-ink active:scale-95"
        >
          {shareCopied ? 'Copied to clipboard' : 'Share this pick'}
        </button>
      </div>
    </Modal>
  )
}
