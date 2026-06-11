import { useState } from 'react'
import Modal from './Modal.jsx'
import { TAGS } from '../lib/tags'

// Toggle the curated tags on a dish. Applies on Save (so Cancel undoes).
export default function TagModal({ target, onSave, onClose }) {
  const [selected, setSelected] = useState(target.tags ?? [])

  const toggle = (key) =>
    setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]))

  return (
    <Modal labelledBy="tags-title" onClose={onClose} className="max-w-sm p-6">
      <h3 id="tags-title" className="font-display text-xl font-semibold text-ink">
        Tag <span className="text-terra">{target.name}</span>
      </h3>
      <p className="mb-4 mt-1 text-sm text-muted">
        Tags let you filter the wheel — e.g. spin only the quick or vegetarian dishes.
      </p>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((t) => {
          const on = selected.includes(t.key)
          return (
            <button
              key={t.key}
              onClick={() => toggle(t.key)}
              aria-pressed={on}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
                on
                  ? 'border-terra bg-terra text-white'
                  : 'border-line bg-cream text-ink/70 hover:border-terra/40'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={() => onSave(selected)}
          className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
