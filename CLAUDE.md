# CLAUDE.md

Guidance for AI assistants (and humans) working in this repository.

## ⚠️ Current Status: Empty Repository

As of this writing, **this repo contains no application code** — only this file.
The sections below describe the **agreed-upon plan of record** for the
"What's for Dinner" app: the intended stack, structure, and conventions to follow
when the project is first scaffolded. They are *not* a description of existing code.

> **When real code lands, update this file:** replace the "intended/empty" framing with
> the actual structure, and verify every command against the real `package.json` rather
> than trusting the defaults listed here.

## Project Overview

**What's for Dinner** is a web app that helps users decide what to cook — a meal/recipe
picker. Think: browse or randomize recipe ideas, filter by ingredients or cuisine, and
view recipe details. The exact feature set will evolve; keep this overview in sync.

## Tech Stack

| Concern | Choice |
| --- | --- |
| Framework | React 18+ |
| Build tool | Vite |
| Language | TypeScript |
| Testing | Vitest + React Testing Library |
| Linting | ESLint |
| Formatting | Prettier |
| Styling | CSS Modules (`*.module.css`) |

Stick to this stack unless there's a deliberate decision to change it (and update this
file if so).

## Getting Started (Scaffolding)

The project has not been initialized yet. To scaffold it into this existing repo:

```bash
# From the repo root (the directory already contains .git and this CLAUDE.md)
npm create vite@latest . -- --template react-ts
npm install
```

Then add the recommended dev tooling:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom \
  eslint prettier
```

## Development Commands

These are the **intended** scripts (Vite + Vitest defaults). Confirm against
`package.json` once scaffolded:

```bash
npm run dev        # Start the Vite dev server (hot reload)
npm run build      # Type-check + production build to dist/
npm run preview    # Serve the production build locally
npm run lint       # Run ESLint
npm test           # Run Vitest (add to package.json scripts)
```

## Intended Project Structure

```
.
├── CLAUDE.md            # This file
├── index.html           # Vite entry HTML
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/              # Static assets served as-is
└── src/
    ├── main.tsx         # App bootstrap / React root
    ├── App.tsx          # Root component
    ├── components/      # Reusable presentational components
    ├── pages/           # Route-level / view components (or views/)
    ├── hooks/           # Custom React hooks (useXxx)
    ├── lib/             # Utilities, API clients, helpers (or utils/)
    ├── data/            # Recipe / meal data, types, fixtures
    └── assets/          # Images, icons, fonts imported by components
```

## Conventions

- **TypeScript everywhere.** No plain `.js`/`.jsx` in `src/`. Type props and data shapes.
- **Functional components + hooks only.** No class components.
- **File naming:** `PascalCase` for component files (`RecipeCard.tsx`), `camelCase` for
  utilities and hooks (`useMealPicker.ts`, `formatTime.ts`).
- **Exports:** default export for a component (one per file); named exports for utilities.
- **Styling:** colocate styles with components as `ComponentName.module.css`.
- **State:** keep state local; lift it up only when genuinely shared. Reach for a global
  store only when prop-drilling becomes painful — document the choice here if you add one.
- **Data:** keep recipe/meal data and its types in `src/data/`; import types rather than
  redefining shapes.

## Git Workflow

- Work on **feature branches**, not the default branch.
- Write clear, descriptive commit messages. Conventional Commits style is encouraged
  (`feat:`, `fix:`, `docs:`, `chore:`).
- Do not push directly to the default branch; open a PR when changes are ready for review.

## Notes for AI Assistants

- This repo is empty today. If asked to "analyze the codebase," remember there isn't one
  yet — scaffold per the steps above or ask before inventing structure.
- After scaffolding or any significant change, **update this file** so it reflects reality.
- Always verify commands and dependencies against the actual `package.json` before running
  or documenting them.
