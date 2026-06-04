# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Project Overview

**What's for Dinner?** is a mobile-first, single-page web app that helps you decide
what to eat. The centerpiece is an interactive **Decision Wheel**: add your food
options, spin the wheel, and a winner is chosen at random with a celebratory modal.
The app also keeps a persistent **dinner history** log of past spins.

Food options are organized into **location profiles** ("places" like Home, Mall, Work),
each with its own menu. The user switches places manually, or taps "use my location" to
auto-switch to the nearest place they've pinned via GPS.

The entire app currently lives in a single component, `src/App.jsx`. State is held in
React `useState` and mirrored to `localStorage` so places, menus, and history survive
refreshes.

## Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | React 19 |
| Build tool | Vite 8 |
| Language | JavaScript (JSX) — **not** TypeScript |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Linting | ESLint (flat config, `eslint.config.js`) |
| Images | Unsplash CDN (no API key; curated photo IDs) |

There is **no test runner configured yet**. If you add tests, Vitest + React Testing
Library is the natural fit — wire up a `test` script and document it here.

## Development Commands

```bash
npm install        # Install dependencies
npm run dev        # Start the Vite dev server with hot reload
npm run build      # Production build to dist/
npm run preview    # Serve the production build locally
npm run lint       # Run ESLint over the project
```

Always run `npm run build` and `npm run lint` before committing — both must pass.

## Project Structure

```
.
├── CLAUDE.md            # This file
├── index.html           # Vite entry HTML (title: "What's for Dinner?")
├── package.json
├── vite.config.js       # React + Tailwind (@tailwindcss/vite) plugins
├── eslint.config.js     # ESLint flat config
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx         # React root; imports ./index.css
    ├── App.jsx          # The entire application (single component)
    └── index.css        # @import "tailwindcss" + custom keyframes
```

## Tailwind CSS Setup

This project uses **Tailwind v4**, which is configured almost entirely in CSS — there is
**no `tailwind.config.js` and no `postcss.config.js`**, and none are needed.

- The Vite plugin is registered in `vite.config.js`:
  ```js
  import tailwindcss from '@tailwindcss/vite'
  export default defineConfig({ plugins: [react(), tailwindcss()] })
  ```
- Tailwind is pulled in at the top of `src/index.css` with a single directive:
  ```css
  @import "tailwindcss";
  ```
- Custom animations (`animate-pop-in`, `animate-fade-in`) are defined as plain
  `@keyframes` + utility classes in `src/index.css`.

To add a Tailwind theme/config, use the CSS-first `@theme { … }` block in `index.css`
rather than creating a JS config file.

## How `src/App.jsx` Works

Key pieces, all in one file:

- **Food data** — each food is `{ id, name, image }`. `imageForFood(name, size)` maps a
  food name to a crisp Unsplash photo: it looks the keyword up in `FOOD_PHOTO_IDS`, falls
  back to a rotating pool (`FALLBACK_PHOTO_IDS`) keyed by a stable string hash, and appends
  `&sig=` to vary fallbacks. `makeFood(name)` builds a food object with a unique id (`uid()`).
- **Places (location profiles)** — a place is
  `{ id, name, emoji, coords: {lat,lng}|null, foods: [...] }`. `makePlace(name, emoji,
  foodNames)` builds one. State is `places` + `activePlaceId`; the active place's foods feed
  the wheel/menu. `updateActivePlaceFoods(updater)` is the single path for editing the
  current menu. Add/edit/delete places via the place modal (`placeModal` state); at least one
  place is always kept.
- **Geolocation** — `withPosition()` wraps `navigator.geolocation.getCurrentPosition` with
  permission/timeout handling. "📌 Pin here" stores the current `coords` on the active place;
  "📍 Use my location" finds the nearest pinned place within `GEO_RADIUS_M` (250 m) using the
  `distanceMeters()` haversine helper and auto-switches. **Geolocation only works over HTTPS
  or localhost** (so: dev server and GitHub Pages, but not a plain-HTTP host).
- **Persistence** — `{ activePlaceId, places }` loads from `localStorage` key
  `wfd-places-v1` via `bootstrapPlaces()` (which **migrates** an old flat `wfd-foods` list
  into a "Home" place); `history` uses `wfd-history`. Both are written back in `useEffect`s.
- **The wheel** — rendered with a CSS `conic-gradient` background (one color stop per
  segment from `WHEEL_COLORS`) plus absolutely-positioned, rotated labels. Spinning sets a
  large `rotation` value and a `cubic-bezier(0.1, 0.8, 0.3, 1)` CSS transition; the winner
  is computed up front and the rotation is solved so that segment lands under the top
  pointer. `onTransitionEnd` (`handleSpinEnd`) reveals the winner and appends to history
  (tagged with the active place).
- **Winner modal** — overlay celebrating the result with a large Unsplash image; closes on
  backdrop click or the Close button.
- **Edge cases handled** — empty/whitespace input is rejected, duplicate names (case-
  insensitive, per place) are blocked, deletion is prevented below 2 items, spinning is
  disabled while a spin is in progress or with fewer than 2 options, and an empty place
  shows a hint instead of a wheel. Two transient toasts auto-clear: `error` (food/spin
  validation, by the wheel) and `status` (location feedback, by the location bar).

When adding features, prefer extending these existing helpers over duplicating logic.

## Conventions

- **JavaScript + JSX** (no TypeScript). Keep files as `.jsx`/`.js`.
- **Functional components + hooks only.** No class components.
- **Styling is Tailwind utility classes** inline in JSX. Reach for `src/index.css` only
  for things utilities can't express (keyframes, global resets).
- **File naming:** `PascalCase` for component files (`App.jsx`); `camelCase` for helper
  functions and variables.
- **Keep state local.** This is a small app; only introduce a store/router if the scope
  genuinely grows — and document the decision here.
- **Images:** route all food imagery through `imageForFood()` so URLs stay consistent and
  optimized; add new known foods to `FOOD_PHOTO_IDS`.

## Git Workflow

- Work on **feature branches**, not the default branch.
- Write clear, descriptive commit messages. Conventional Commits style is encouraged
  (`feat:`, `fix:`, `docs:`, `chore:`).
- Do not push directly to the default branch; open a PR when changes are ready for review.

## Notes for AI Assistants

- The app is intentionally a **single component**. If it grows, the first refactor is to
  split `src/App.jsx` into `components/` (Wheel, FoodManager, History, WinnerModal) and a
  `lib/` for the image/helper utilities — update this file when you do.
- After any significant change, **update this file** so it reflects reality.
- Verify commands and dependencies against the actual `package.json`, and run
  `npm run build` + `npm run lint` to confirm changes compile cleanly.
