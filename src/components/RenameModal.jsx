import { useState } from 'react'
import Modal from './Modal.jsx'

// Rename a dish. `existingNames` is the active place's other dish names
// (lowercased) so duplicates are blocked before saving.
export default function RenameModal({ target, existingNames, onSave, onClose }) {
  const [value, setValue] = useState(target.name)
  const clean = value.trim()
  const duplicate = existingNames.includes(clean.toLowerCase())
  const canSave = clean.length > 0 && !duplicate

  function save() {
    if (canSave) onSave(clean)
  }

  return (
    <Modal labelledBy="rename-title" onClose={onClose} className="max-w-sm p-6">
      <h3 id="rename-title" className="mb-4 font-display text-xl font-semibold text-ink">
        Rename <span className="text-terra">{target.name}</span>
      </h3>
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && save()}
        className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder-muted/70 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30"
      />
      {duplicate && (
        <p className="mt-2 text-xs font-medium text-red-600">
          “{clean}” is already on this menu.
        </p>
      )}
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={save}
          disabled={!canSave}
          className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
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
