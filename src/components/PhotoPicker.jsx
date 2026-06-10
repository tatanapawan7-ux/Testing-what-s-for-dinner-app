import Modal from './Modal.jsx'
import { placeholderImage } from '../lib/photos'

// Pick a photo for a dish: merged search results, a paste-your-own-link row,
// and confirm/default/cancel actions. `onUpdate` is the picker-state setter.
export default function PhotoPicker({ picker, onUpdate, onConfirm, onUseDefault, onClose }) {
  return (
    <Modal labelledBy="photo-title" onClose={onClose} className="max-w-md p-6">
      <h3 id="photo-title" className="font-display text-xl font-semibold text-ink">
        {picker.editId ? 'Change photo for' : 'Pick a photo for'}{' '}
        <span className="text-terra">{picker.name}</span>
      </h3>
      <p className="mb-4 mt-1 text-sm text-muted">
        Tap the one that looks right, or paste your own link below.
      </p>

      {picker.status === 'loading' && (
        <div className="flex h-40 items-center justify-center text-muted">Finding photos…</div>
      )}

      {picker.status === 'ok' && (
        <div className="grid grid-cols-4 gap-2">
          {picker.results.map((r) => {
            const selected = r.id === picker.selectedId
            return (
              <button
                key={r.id}
                onClick={() => onUpdate((p) => ({ ...p, selectedId: r.id }))}
                className={`relative aspect-square overflow-hidden rounded-xl transition-all duration-200 ${
                  selected ? 'ring-2 ring-terra' : 'ring-1 ring-line hover:ring-terra/40'
                }`}
              >
                <img
                  src={r.thumb}
                  alt={r.title}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = placeholderImage(picker.name)
                  }}
                />
                {selected && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-terra text-xs text-white">
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {(picker.status === 'empty' || picker.status === 'error') && (
        <p className="rounded-xl border border-line bg-cream px-4 py-6 text-center text-sm text-muted">
          {picker.status === 'error'
            ? 'Couldn’t reach the photo search.'
            : `No photos found for "${picker.name}".`}{' '}
          Paste a link below, or use a default image.
        </p>
      )}

      {/* Paste your own image link */}
      {picker.status !== 'loading' && (
        <div className="mt-4">
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
            Or paste an image link
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={picker.customUrl}
              onChange={(e) => {
                const v = e.target.value
                onUpdate((p) => ({
                  ...p,
                  customUrl: v,
                  selectedId: v.trim() ? 'custom' : (p.results[0]?.id ?? null),
                }))
              }}
              placeholder="https://…  (right-click an image → Copy image address)"
              className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 py-2 text-sm text-ink placeholder-muted/70 focus:border-terra/50 focus:outline-none focus:ring-2 focus:ring-terra/30"
            />
            {picker.customUrl.trim() && (
              <button
                onClick={() => onUpdate((p) => ({ ...p, selectedId: 'custom' }))}
                aria-label="Use pasted image"
                className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-lg transition-all duration-200 ${
                  picker.selectedId === 'custom' ? 'ring-2 ring-terra' : 'ring-1 ring-line'
                }`}
              >
                <img
                  src={picker.customUrl.trim()}
                  alt="preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    if (e.currentTarget.dataset.fb) return
                    e.currentTarget.dataset.fb = '1'
                    e.currentTarget.src = placeholderImage(picker.name)
                  }}
                />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center gap-2">
        <button
          onClick={onConfirm}
          disabled={
            picker.status === 'loading' ||
            picker.selectedId == null ||
            (picker.selectedId === 'custom' && !picker.customUrl.trim())
          }
          className="flex-1 rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {picker.editId ? 'Save photo' : 'Add to menu'}
        </button>
        <button
          onClick={onUseDefault}
          disabled={picker.status === 'loading'}
          className="rounded-xl border border-line bg-cream px-4 py-3 text-sm font-medium text-ink/70 transition-all duration-300 hover:bg-line/40 disabled:opacity-50"
        >
          Use default
        </button>
        <button
          onClick={onClose}
          className="rounded-xl border border-line bg-cream px-4 py-3 text-sm font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
        >
          Cancel
        </button>
      </div>

      <p className="mt-3 text-center text-[11px] text-muted/70">
        Photos via TheMealDB &amp; Openverse
      </p>
    </Modal>
  )
}
