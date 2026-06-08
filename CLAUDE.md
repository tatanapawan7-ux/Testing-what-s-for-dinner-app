# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## Working Guidelines

Behavioral guidelines to reduce common LLM coding mistakes. **Tradeoff:** they bias toward
caution over speed — for trivial tasks, use judgment.

1. **Think before coding.** State assumptions explicitly. If multiple interpretations exist,
   present them — don't pick silently. If a simpler approach exists, say so. If something is
   unclear, stop and ask.
2. **Simplicity first.** Write the minimum code that solves the problem — nothing
   speculative. No features beyond what was asked, no single-use abstractions, no unrequested
   configurability, no error handling for impossible cases. If 200 lines could be 50, rewrite.
3. **Surgical changes.** Touch only what the request needs. Match existing style; don't
   refactor or reformat working code. Remove orphans *your* change creates, but leave
   pre-existing dead code (mention it instead). Every changed line should trace to the request.
4. **Goal-driven execution.** Turn each task into a verifiable goal and loop until it passes
   (e.g. "fix the bug" → "write a test that reproduces it, then make it pass"). For multi-step
   work, state a brief `step → verify` plan first.

## Project Overview

**What's for Dinner?** is a mobile-first, single-page web app for deciding what to eat. The
centerpiece is an interactive **Decision Wheel**: add food options, spin, and a random winner
is celebrated in a modal. Foods are grouped into **location profiles** ("places" like Home,
Mall, Work), each with its own menu — switch manually or tap "use my location" to auto-switch
to the nearest GPS-pinned place. A persistent **dinner history** logs past spins.

The whole app is one component, `src/App.jsx`; state lives in `useState` and is mirrored to
`localStorage` so places, menus, and history survive refreshes.

## Tech Stack & Commands

React 19 · Vite 8 · JavaScript/JSX (**not** TypeScript) · Tailwind CSS v4 (`@tailwindcss/vite`)
· ESLint (flat config). Fonts are self-hosted via `@fontsource-variable/space-grotesk` (display)
and `@fontsource-variable/inter` (body), imported in `src/main.jsx`. Food images come from a
keyless multi-source search (TheMealDB + Openverse). **No test runner yet** — Vitest + React
Testing Library fits.

```bash
npm install      # install deps
npm run dev      # dev server with hot reload
npm run build    # production build to dist/
npm run preview  # serve the production build
npm run lint     # ESLint
```

Always run `npm run build` and `npm run lint` before committing — both must pass.

## Project Structure

```
index.html            # Vite entry (title + manifest, icons, OG/Twitter meta)
vite.config.js        # react() + tailwindcss() plugins
eslint.config.js      # ESLint flat config
public/
  favicon.svg            # on-brand "decision wheel" mark
  icon-192.png           # PWA icons (192/512 + maskable)
  icon-512.png
  icon-maskable-512.png
  apple-touch-icon.png
  og.png                 # 1200x630 social-share card
  manifest.webmanifest   # installable PWA manifest
src/
  main.jsx            # React root; imports ./index.css
  App.jsx             # the entire application
  index.css           # @import "tailwindcss" + custom keyframes
```

The icon set + `og.png` were generated from hand-written SVG via `sharp` (a one-off
build-time step, not a runtime dep); regenerate by re-rendering those SVGs if the mark changes.

**Tailwind v4** is configured in CSS, not JS — there is **no `tailwind.config.js` or
`postcss.config.js`**, and none are needed. It's enabled by the `@tailwindcss/vite` plugin
plus `@import "tailwindcss";` at the top of `src/index.css`. The app uses a **warm "light &
cream" theme**; the palette + fonts live in a CSS-first `@theme { … }` block in `index.css`
(color tokens `cream/cream-deep/surface/ink/muted/line/terra/terra-light/terra-deep/sage/gold`
→ utilities like `bg-terra`, `bg-surface`, `text-ink`, `border-line`; elevation tokens
`--shadow-soft/card/pop` → `shadow-soft/card/pop`; `--font-display`/`--font-sans` →
`font-display`/`font-sans`). Cards use `bg-surface` (warm white). The body sets the cream
background, soft static ambient glows (`body::before`) and a faint grain (`body::after`);
there's an on-brand `:focus-visible` ring and `::selection` tint. Custom animations
(`pop-in`, `fade-in`, `float-up`, `glow-pulse`, `ping-once`) are plain `@keyframes`, all
disabled/neutralised under `prefers-reduced-motion`. The aesthetic is deliberately restrained
(no looping shimmer/breathing effects) for a refined, professional feel.

## Architecture (`src/App.jsx`)

- **Food** = `{ id, name, image }`. `makeFood(name, image?)` builds one with a `uid()`;
  `image` is `null` until a photo is chosen/fetched. **No curated/Unsplash map** — all imagery
  comes from a keyless multi-source search.
- **Photo search** — `searchFoodImages(q, count)` merges **TheMealDB** (`searchMealDb`, nicer
  food photos, preferred) then **Openverse** (`searchOpenverse`, CC fallback), deduped; throws
  only if **both** sources fail. Results are `{ id, thumb, full, title }`.
- **Photo picker** (`photoPicker` state, opened by `openPhotoPicker(name, editId?)`): pick one of
  the merged results, **paste your own image link** (`customUrl`, `selectedId:'custom'`), or
  "Use default" (→ `null`, re-healed). `applyPhoto()` either adds a new food or, when `editId`
  is set, updates that food's image — the **🖼 button on each menu card** changes its photo.
  Degrades to a placeholder so it never breaks.
- **Seeded / legacy foods** start with `image: null`. A heal `useEffect` (keyed on
  `activePlaceId`, one gentle throttled pass per place per session, results persisted) fetches
  a photo via `searchFoodImages(name, 1)` for any food that is missing an image (or still has an
  old `images.unsplash.com` URL from a previous version), so starter menus fill in on first view.
- **Image loading** — all food images render through `<FoodImage>`, which sets
  `referrerPolicy="no-referrer"` (avoids hotlink blocks) and, on load error or `null` src,
  shows an inline-SVG `placeholderImage(name)` so a dead/blocked photo never breaks the layout.
- **Places** = `{ id, name, emoji, coords|null, foods[] }`. State is `places` + `activePlaceId`;
  the active place feeds the wheel/menu. Edit the current menu only via
  `updateActivePlaceFoods()`; add/edit/delete places via the `placeModal` (≥1 place always kept).
- **Geolocation** — `withPosition()` wraps `getCurrentPosition` (permission/timeout handling).
  "📌 Pin here" saves `coords` on the active place; "📍 Use my location" auto-switches to the
  nearest pinned place within `GEO_RADIUS_M` (250 m) via `distanceMeters()`. **Only works over
  HTTPS or localhost** (dev + GitHub Pages, not plain HTTP).
- **Persistence** — `{ activePlaceId, places }` → `localStorage` key `wfd-places-v1` via
  `bootstrapPlaces()` (migrates an old flat `wfd-foods` list into a "Home" place); history →
  `wfd-history`; spin prefs → `wfd-muted`, `wfd-variety`, `wfd-knockout`, `wfd-round`.
- **Wheel** — CSS `conic-gradient` slices + rotated labels; spin sets a large `rotation` with a
  `cubic-bezier(0.1, 0.8, 0.3, 1)` transition solved so the precomputed winner lands under the
  top pointer. **Smarter picking** (`handleSpin`): builds an eligible index pool — excludes the
  immediate previous winner (`lastWinnerId`), and, in **knock-out** mode, foods already in
  `roundWon` (cleared by `resetRound`); then picks uniformly or, when **variety** is on, via
  `weightedPick()` (recency-weighted from `history`). Two toggles + a round status sit under the
  wheel; the winner modal has a **Spin again** (`spinAgain`). `handleSpinEnd` reveals the winner
  and logs history (tagged with the place), then
  celebrates: `celebrate()` fires a `canvas-confetti` burst (skipped under `prefers-reduced-motion`)
  and `playFanfare()` plays a Web Audio chime + a `vibrate()` haptic buzz — all gated by the
  persisted mute toggle (`wfd-muted`). The winner modal also has a **Share this pick**
  (`shareWinner`) — Web Share API with a clipboard fallback (`shareCopied` feedback).
- **Spin sounds** (Web Audio, no assets) — `playWhoosh()` on launch, then `startTicking()` runs a
  `requestAnimationFrame` loop that reads the wheel's real rotation (`readWheelAngle`) and
  `playTick()`s as each segment passes the pointer, so clicks slow with the wheel; `stopTicking()`
  on spin end. All sounds honour `muted`.
- **History** — each entry `{ id, name, image, time, place, eaten: null|true|false, eatenAt }`;
  an "✅ Ate it / ❌ Didn't" control via `markEaten()` (older entries render as pending). Each
  entry has a ✕ to remove just that spin (`removeHistoryEntry`); a confirm-gated **Clear all**
  in the section header wipes the whole log (`clearHistory`). A compact 3-up **stats** strip
  (`stats` memo: total decided, eaten, top pick) sits above the list when history is non-empty.
- **Installable (PWA)** — `public/manifest.webmanifest` (standalone, themed) + icon set + apple
  touch icon make it home-screen installable; `index.html` carries description + OG/Twitter meta
  (absolute `og.png`). All `public/` paths and the Vite `base` are **relative** (`./`) so they
  resolve under the GitHub Pages subpath.
- **Edge cases** — empty/duplicate (per-place, case-insensitive) input blocked, removing a food
  asks via a confirm dialog (`confirmDelete`) and is blocked below 2 items, spin disabled while
  spinning or under 2 options, empty place shows a hint. Two
  auto-clearing toasts: `error` (validation, by the wheel) and `status` (location, by the bar).
- **Accessibility** — every modal is a labelled `role="dialog"` (`aria-modal`, `aria-labelledby`)
  and a window-level Escape handler closes whichever overlay is open (innermost first). The spin
  winner is announced to screen readers via a visually-hidden (`sr-only`) `aria-live="assertive"`
  region. Motion is gated on `prefers-reduced-motion` (see Tailwind/CSS notes).

Prefer extending these existing helpers over duplicating logic.

## Conventions

- JavaScript + JSX only; functional components + hooks (no TS, no class components).
- Styling is Tailwind utility classes inline, using the `@theme` tokens (`bg-terra`, `text-ink`,
  `border-line`, `font-display`, …); use `src/index.css` only for what utilities can't express
  (theme tokens, keyframes, body background/grain).
- `PascalCase` component files, `camelCase` helpers/variables.
- Keep state local; introduce a store/router only if scope genuinely grows (and document it).
- Route all food imagery through `searchFoodImages` (TheMealDB + Openverse) and render via `<FoodImage>`.

## Git & Notes

- Work on **feature branches**; clear, descriptive commits (Conventional Commits encouraged).
  Don't push to the default branch — open a PR when ready.
- The app is intentionally **one component**. If it grows, first split `App.jsx` into
  `components/` (Wheel, FoodManager, History, WinnerModal) + a `lib/` for helpers.
- After any significant change, **update this file** to match reality.
