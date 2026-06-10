import Modal from './Modal.jsx'

const EMOJI_CHOICES = ['🏠', '🛍️', '💼', '🏖️', '✈️', '🎬', '🏟️', '🏞️', '🎓', '☕', '🍽️', '🎉']

// Add / edit a place: name, icon, optional pin-clearing, save/delete.
export default function PlaceModal({
  modal,
  canDelete,
  showClearPin,
  onPatch,
  onSave,
  onDelete,
  onClearPin,
  onClose,
}) {
  return (
    <Modal labelledBy="place-title" onClose={onClose} className="max-w-sm p-6">
      <h3 id="place-title" className="mb-4 font-display text-xl font-semibold text-ink">
        {modal.mode === 'add' ? 'New place' : 'Edit place'}
      </h3>

      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
        Name
      </label>
      <input
        type="text"
        autoFocus
        value={modal.name}
        onChange={(e) => onPatch({ name: e.target.value })}
        onKeyDown={(e) => e.key === 'Enter' && onSave()}
        placeholder="e.g. Gym, Beach, Downtown"
        className="w-full rounded-xl border border-line bg-cream px-4 py-3 text-sm text-ink placeholder-muted/70 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30"
      />

      <label className="mb-2 mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
        Icon
      </label>
      <div className="flex flex-wrap gap-2">
        {EMOJI_CHOICES.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onPatch({ emoji })}
            className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all duration-200 ${
              modal.emoji === emoji
                ? 'bg-terra/15 ring-2 ring-terra'
                : 'border border-line bg-cream hover:bg-line/40'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {showClearPin && (
        <button
          onClick={onClearPin}
          className="mt-4 text-sm font-medium text-red-600 hover:text-red-700"
        >
          📍 Clear pinned location
        </button>
      )}

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={!modal.name.trim()}
          className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          Save
        </button>
        {modal.mode === 'edit' && (
          <button
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? 'Delete place' : 'Keep at least one place'}
            className="rounded-xl bg-red-50 px-4 py-3 font-semibold text-red-600 ring-1 ring-red-200 transition-all duration-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Delete
          </button>
        )}
        <button
          onClick={onClose}
          className="rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
