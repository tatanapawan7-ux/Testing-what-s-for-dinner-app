import Modal from './Modal.jsx'

// A small labelled action sheet for a dish — spells out what each edit does,
// then opens the matching flow. Keeps the menu cards uncluttered.
function Row({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-cream px-4 py-3 text-left font-medium text-ink transition-all duration-200 hover:border-terra/40 hover:bg-terra/5"
    >
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      {label}
    </button>
  )
}

export default function EditDishMenu({ food, onRename, onTags, onPhoto, onClose }) {
  return (
    <Modal labelledBy="edit-title" onClose={onClose} className="max-w-sm p-6">
      <h3 id="edit-title" className="mb-4 font-display text-xl font-semibold text-ink">
        Edit <span className="text-terra">{food.name}</span>
      </h3>
      <div className="flex flex-col gap-2">
        <Row icon="✏️" label="Rename" onClick={onRename} />
        <Row icon="🏷️" label="Edit tags" onClick={onTags} />
        <Row icon="📷" label="Change photo" onClick={onPhoto} />
      </div>
      <button
        onClick={onClose}
        className="mt-4 w-full rounded-xl border border-line bg-cream px-4 py-3 font-medium text-ink/70 transition-all duration-300 hover:bg-line/40"
      >
        Cancel
      </button>
    </Modal>
  )
}
