import Modal from './Modal.jsx'

const SETTINGS = [
  {
    name: 'Favor variety',
    desc: 'Leans away from dishes you’ve eaten recently, and weighs in your ★ ratings and ♥ favorites. Everything stays possible — repeats are just less likely.',
  },
  {
    name: 'Knock-out',
    desc: 'Each winner is removed from the wheel until every dish has had a turn. Reset the round anytime.',
  },
  {
    name: '♥ Boost favorites',
    desc: 'Hearted dishes get double odds and visibly wider slices. (Appears once you ♥ a dish.)',
  },
  {
    name: '👥 Group spin',
    desc: 'Pass the phone around: everyone vetoes one dish, then the wheel decides among what’s left.',
  },
]

// Explains the four spin controls in one line each (opened by the ⓘ by the toggles).
export default function SpinHelpModal({ onClose }) {
  return (
    <Modal labelledBy="spinhelp-title" onClose={onClose} className="max-w-sm p-6">
      <h3 id="spinhelp-title" className="mb-4 font-display text-xl font-semibold text-ink">
        Spin settings
      </h3>
      <div className="flex flex-col gap-2.5">
        {SETTINGS.map((s) => (
          <div key={s.name} className="rounded-xl border border-line bg-cream px-4 py-3">
            <p className="font-semibold text-ink">{s.name}</p>
            <p className="mt-0.5 text-sm text-muted">{s.desc}</p>
          </div>
        ))}
      </div>
      <button
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
      >
        Got it
      </button>
    </Modal>
  )
}
