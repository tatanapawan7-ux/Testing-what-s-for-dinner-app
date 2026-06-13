# What's for Dinner? 🍽️

A mobile-first, single-page React app that helps you decide what to eat. Add your food
options, give the **Decision Wheel** a spin, and let fate pick your dinner — complete with
a celebratory winner modal and a persistent history of past spins.

**▶️ Live:** https://tatanapawan7-ux.github.io/Testing-what-s-for-dinner-app/

## Features

- 🎡 **Interactive decision wheel** with smooth, eased spin animation, spin sounds, and
  optional haptic buzz on mobile — plus opt-in **🤳 shake-to-spin**
- 📍 **Location profiles** — separate menus per place (Home, Mall, Work…), with optional
  GPS "use my location" auto-switch to the nearest place you've pinned
- 🍴 **Restaurants near me** — pull real nearby restaurants from OpenStreetMap (keyless, free)
  and spin the wheel among them to decide where to eat out
- ➕ **Menu management** — add dishes per place; each card has a ❤️ favorite, a one-tap **Edit**
  menu (rename · tags · change photo), and delete. Adding a dish shows a **photo picker** of
  matching images (TheMealDB + Openverse), or paste your own image link
- 🏷️ **Tags, favorites & filters** — tag dishes (veg, quick, treat…) and favourite the ones
  you love, then narrow the wheel before you spin: "only vegetarian", "only favourites" —
  or turn on **♥ Boost favorites** to give hearted dishes bigger slices and double odds
- ⭐ **Rate & refine** — star a dinner after you eat it; dishes show their average rating and
  the wheel quietly favours what you loved (and avoids what you didn't)
- 🔗 **Shareable menus** — send a whole menu to a friend as a link; one tap adds it to their
  wheel (no account needed — the dishes travel inside the URL)
- 🎉 **Winner modal** with a confetti burst + celebratory chime (sound has a mute toggle),
  and a **Share this pick** button — a generated photo card via the native share sheet,
  with text-share and clipboard fallbacks
- 👥 **Group spin** — pass the phone around, everyone vetoes one dish, and the wheel
  decides among what's left
- 🌙 **Dark mode** — a warm ember palette that follows your device's light/dark setting
- 📊 **Dinner stats** — total decided, eaten, and your top pick, summarised at a glance
- 🕑 **Dinner history** timeline (tagged by place), persisted in `localStorage`; remove a
  single spin or clear the whole log
- 💾 **Backup & restore** — export all your places, menus, and history as a JSON file and
  import it on any device (footer links)
- ♿ **Accessible** — labelled dialogs, Escape-to-close, screen-reader winner announcements,
  and `prefers-reduced-motion` support
- 📲 **Installable PWA** — add it to your home screen and it **works offline** (your menus
  and history live on your device)
- 📱 Responsive, mobile-first UI built with Tailwind CSS

## How to Use

1. **Pick a place** — tap a profile chip (Home, Mall, Work…) to load that menu, or hit
   **📍 Use my location** to auto-switch to the nearest place you've pinned.
2. **Build your menu** — type a dish, press **Add Food**, and choose a photo (or paste a link).
   On any card: tap ❤️ to favorite, **Edit** to rename / tag / change the photo, or ✕ to remove.
3. **Spin the wheel** — press **SPIN** and let it land on tonight's dinner. Toggle
   **Favor variety**, **Knock-out**, or **♥ Boost favorites** under the wheel for smarter
   picking, and 🔊/🔇 to control sound.
4. **Track it** — each result is logged to **Dinner History**; mark whether you actually
   **✅ Ate it** or **❌ Didn't**, and give it a ★ rating — the wheel learns what you love.
   Everything is saved in your browser, so it persists on refresh.

## Tech Stack

React 19 · Vite 8 · Tailwind CSS v4 · JavaScript (JSX)

## Getting Started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm test` | Run the Vitest suite |

## Project Notes

State and handlers live in `src/App.jsx`, the UI in `src/components/`, and pure logic
(photo search, storage, geolocation, picking, backup) in tested `src/lib/` modules. See
[`CLAUDE.md`](./CLAUDE.md) for architecture, conventions, and the Tailwind v4 setup.

Food imagery comes from TheMealDB and Openverse (no API key required), with a graceful
placeholder when an image can't load.

## Analytics (optional, off by default)

The app ships with **no tracker**. To enable privacy-friendly, cookieless page counts via
[GoatCounter](https://www.goatcounter.com) (free):

1. Create a free GoatCounter site — you'll get a `https://YOURCODE.goatcounter.com` URL.
2. In the repo, add an **Actions variable** named `GOATCOUNTER` set to
   `https://YOURCODE.goatcounter.com/count` (Settings → Secrets and variables → Actions →
   Variables). The next deploy picks it up.

It's loaded only when that variable is set and respects the browser's Do-Not-Track signal
(see `src/lib/analytics.js`). No cookies, no personal data.

## License

[MIT](./LICENSE) © tatanapawan7-ux
