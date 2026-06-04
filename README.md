# What's for Dinner? 🍽️

A mobile-first, single-page React app that helps you decide what to eat. Add your food
options, give the **Decision Wheel** a spin, and let fate pick your dinner — complete with
a celebratory winner modal and a persistent history of past spins.

## Features

- 🎡 **Interactive decision wheel** with smooth, eased spin animation
- 📍 **Location profiles** — separate menus per place (Home, Mall, Work…), with optional
  GPS "use my location" auto-switch to the nearest place you've pinned
- ➕ **Menu management** — add/remove dishes per place, each with an auto-matched food photo
- 🎉 **Winner modal** announcing tonight's dinner with a large image
- 🕑 **Dinner history** timeline (tagged by place), persisted in `localStorage`
- 📱 Responsive, mobile-first UI built with Tailwind CSS

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

## Project Notes

The whole app lives in `src/App.jsx`. See [`CLAUDE.md`](./CLAUDE.md) for architecture,
conventions, and the Tailwind v4 setup.

Food imagery comes from the Unsplash CDN (no API key required).
