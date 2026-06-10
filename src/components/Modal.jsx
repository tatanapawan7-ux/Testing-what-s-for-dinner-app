import { useEffect, useRef } from 'react'

// Shared dialog shell: backdrop, panel, ARIA wiring, and a focus trap. Focus
// moves into the panel on open, Tab cycles within it, and focus returns to the
// previously-focused element on close. (Escape is handled globally in App.)
export default function Modal({ labelledBy, onClose, className = '', children }) {
  const panelRef = useRef(null)

  useEffect(() => {
    const panel = panelRef.current
    const previouslyFocused = document.activeElement
    // Move focus into the dialog — unless a child (e.g. an autoFocus input)
    // already claimed it.
    if (panel && !panel.contains(document.activeElement)) panel.focus()

    function trapTab(e) {
      if (e.key !== 'Tab') return
      const focusables = panel.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (!focusables.length) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    panel?.addEventListener('keydown', trapTab)
    return () => {
      panel?.removeEventListener('keydown', trapTab)
      previouslyFocused?.focus?.()
    }
  }, [])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[#2c2520]/45 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`animate-pop-in w-full rounded-3xl border border-line bg-surface shadow-pop focus:outline-none ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
