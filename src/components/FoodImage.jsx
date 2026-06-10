import { placeholderImage } from '../lib/photos'

// Food <img> that falls back to a placeholder on error / missing src and avoids
// hotlink blocks via a no-referrer policy.
export default function FoodImage({ name, src, className }) {
  return (
    <img
      src={typeof src === 'string' && src ? src : placeholderImage(name)}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={(e) => {
        if (e.currentTarget.dataset.fb) return
        e.currentTarget.dataset.fb = '1'
        e.currentTarget.src = placeholderImage(name)
      }}
    />
  )
}
