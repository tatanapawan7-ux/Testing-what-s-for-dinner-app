import Modal from './Modal.jsx'

// Generic confirm dialog: a title, a message, and a confirm/cancel pair.
// tone="danger" renders the confirm button red (destructive actions).
export default function ConfirmModal({ labelId, title, message, confirmLabel, tone, onConfirm, onCancel }) {
  const confirmClasses =
    tone === 'danger'
      ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-[0_8px_20px_-6px_rgba(220,60,40,0.45)]'
      : 'bg-gradient-to-br from-terra to-terra-light shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)]'
  return (
    <Modal labelledBy={labelId} onClose={onCancel} className="max-w-sm p-6 text-center">
      <h3 id={labelId} className="font-display text-xl font-semibold text-ink">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted">{message}</p>
      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={onConfirm}
          className={`flex-1 rounded-xl px-4 py-3 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 active:scale-95 ${confirmClasses}`}
        >
          {confirmLabel}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
