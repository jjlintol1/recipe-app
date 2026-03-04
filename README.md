# Recipes PWA 🍽️

A full-stack Progressive Web App for browsing, searching, and saving recipes from [TheMealDB](https://www.themealdb.com/), built with **React + Vite**, **Tailwind CSS**, **shadcn/ui**, and a **Node.js/Express** proxy server.

Works **offline** — your saved favourites are always available even without an internet connection.

---

## ✨ Features

| Feature                 | Details                                                    |
| ----------------------- | ---------------------------------------------------------- |
| 🔍 **Search**           | Full-text recipe search via the MealDB proxy               |
| 🗂 **Categories**       | Browse by category with visual chips                       |
| 📄 **Detail view**      | Full recipe: ingredients, instructions, YouTube, source    |
| ❤️ **Favorites**        | Save / unsave recipes; persisted in IndexedDB              |
| 📴 **Offline**          | Favorites + cached pages available without internet        |
| 📱 **Installable PWA**  | App manifest + service worker; add to home screen          |
| 🌙 **Dark mode**        | System / light / dark theme toggle                         |
| ⚡ **Skeleton loaders** | Smooth loading states for all views                        |
| 🔒 **Secure proxy**     | API key never exposed to the browser                       |
| ♿ **Accessible**       | Semantic HTML, ARIA labels, keyboard navigation, skip link |

---

## 🏗️ Tech Stack

**Client**

- React 18 + TypeScript
- Vite 5
- Tailwind CSS v3 + shadcn/ui primitives
- TanStack Query (React Query) v5
- React Router DOM v6
- `idb` (IndexedDB wrapper)
- Sonner (toasts)
- Lucide React (icons)
- Manual Service Worker (no Workbox)

**Server**

- Node.js ≥ 18 (ESM)
- Express 4
- helmet, cors, compression
- dotenv
- In-memory TTL cache

---

## 📁 Project Structure

```
recipes/
├── server/
│   ├── .env.example
│   ├── package.json
│   └── src/
│       ├── index.js               ← Express entry point
│       └── routes/
│           └── mealdb.js          ← Proxy routes + in-memory cache
│
├── client/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.cjs
│   ├── postcss.config.cjs
│   ├── package.json
│   ├── public/
│   │   ├── sw.js                  ← Service worker (served from root)
│   │   ├── manifest.webmanifest
│   │   ├── offline.html
│   │   └── icons/
│   │       ├── icon-192.svg / .png
│   │       └── icon-512.svg / .png
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── styles/globals.css
│       ├── lib/
│       │   ├── api.ts             ← Typed proxy client
│       │   ├── queryClient.ts     ← TanStack Query instance
│       │   └── utils.ts           ← cn() helper
│       ├── features/favorites/
│       │   ├── db.ts              ← IndexedDB helpers
│       │   └── useFavorites.ts    ← React Query hooks
│       ├── components/
│       │   ├── ui/                ← shadcn/ui primitives
│       │   ├── Header.tsx
│       │   ├── RecipeCard.tsx
│       │   ├── CategoryChips.tsx
│       │   ├── SkeletonCard.tsx
│       │   ├── EmptyState.tsx
│       │   ├── ErrorBoundary.tsx
│       │   ├── ThemeProvider.tsx
│       │   ├── ThemeToggle.tsx
│       │   └── OfflineToast.tsx
│       ├── pages/
│       │   ├── Home.tsx
│       │   ├── Details.tsx
│       │   └── Favorites.tsx
│       └── sw.js                  ← Source copy of the service worker
│
└── README.md
```

---

## 🚀 Setup & Running Locally

### Prerequisites

- **Node.js ≥ 18**
- **npm ≥ 9** (or pnpm / yarn)

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd recipes
```

### 2. Start the server

```bash
cd server
cp .env.example .env          # uses MEALDB_API_KEY=1 by default
npm install
npm run dev
# → http://localhost:3001
```

### 3. Start the client

```bash
cd ../client
npm install
npm run dev
# → http://localhost:5173
```

The Vite dev server proxies all `/api/*` requests to `localhost:3001`, so there are no CORS issues.

Open **http://localhost:5173** in your browser.

---

## 🔐 Environment Variables

### Server (`server/.env`)

| Variable          | Default                                 | Description                              |
| ----------------- | --------------------------------------- | ---------------------------------------- |
| `MEALDB_API_KEY`  | `1`                                     | TheMealDB API key (1 = free/dev)         |
| `MEALDB_API_BASE` | `https://www.themealdb.com/api/json/v1` | MealDB base URL                          |
| `PORT`            | `3001`                                  | Express server port                      |
| `CLIENT_ORIGIN`   | _(empty)_                               | CORS allow-list for your deployed client |

> ⚠️ **Never commit `.env` to source control.** It is listed in `.gitignore`.

---

## 🎨 shadcn/ui Setup Notes

The shadcn/ui primitives are **already included** as hand-written source files in `src/components/ui/`. If you want to use the official CLI to regenerate or add more components:

```bash
cd client

# One-time init (if starting fresh; skip if tsconfig already has paths)
npx shadcn-ui@latest init
# When prompted:
#   ✔ Style → Default
#   ✔ Base color → Zinc
#   ✔ Global CSS → src/styles/globals.css
#   ✔ CSS variables → Yes
#   ✔ Tailwind config → tailwind.config.cjs
#   ✔ Components alias → @/components
#   ✔ Utils alias → @/lib/utils

# Add additional components as needed, e.g.:
npx shadcn-ui@latest add accordion
npx shadcn-ui@latest add select
npx shadcn-ui@latest add sheet
```

---

## 📱 PWA Details

### How it works

1. **`public/manifest.webmanifest`** — declares the app name, icons, theme colour, display mode (`standalone`), and a shortcut to Favourites.
2. **`public/sw.js`** — registered by `index.html` via `navigator.serviceWorker.register('/sw.js')`.

### Service Worker caching strategies

| Request                                       | Strategy                                          | TTL        |
| --------------------------------------------- | ------------------------------------------------- | ---------- |
| App shell (`/`, `/index.html`, CSS/JS assets) | **Cache-First** (precached on install)            | Versioned  |
| `/api/categories`                             | **Stale-While-Revalidate**                        | Persistent |
| `/api/filter?c=…`                             | **Stale-While-Revalidate**                        | Persistent |
| `/api/meal/:id` & `/api/search`               | **Network-First** w/ cache fallback               | 5 min      |
| TheMealDB CDN images                          | **Stale-While-Revalidate**                        | Persistent |
| HTML navigations                              | **Network-First** → `index.html` → `offline.html` | —          |

### Testing offline

1. Open Chrome DevTools → **Application → Service Workers** → tick **Offline**.
2. Refresh the page — the app shell should load from cache.
3. Navigate to `/favorites` — your saved recipes should be fully visible.
4. Try to search — you should see an error state (no network) but offline toast.

### Updating the cache version

When you deploy new static assets, bump `CACHE_VERSION` in both `public/sw.js` and `src/sw.js`:

```js
const CACHE_VERSION = "v2"; // was 'v1'
```

This evicts all old caches on next activation.

---

## 🏗️ Build & Deploy

### Build the client

```bash
cd client
npm run build
# Output: client/dist/
```

### Deploy suggestions

| Part       | Platform                                                                                            |
| ---------- | --------------------------------------------------------------------------------------------------- |
| **Server** | [Render](https://render.com) (free tier Node.js service) — set env vars in the dashboard            |
| **Client** | [Vercel](https://vercel.com) or [Netlify](https://netlify.com) — point `dist/` as publish directory |

**Important:** In production, set the server's `CLIENT_ORIGIN` env var to your Vercel/Netlify URL so CORS is correctly configured.

Also update `vite.config.ts` if you need to adjust the dev proxy target port.

---

## 🔄 Caching Strategy Notes

### Changing a strategy

All strategies live in `public/sw.js` inside the `fetch` event listener. Each `if` block handles a specific URL pattern:

```js
// Switch /api/categories from SWR to Network-First:
if (url.pathname === "/api/categories") {
  event.respondWith(networkFirst(request, RUNTIME_CACHE)); // was staleWhileRevalidate
  return;
}
```

### Adding a new cached endpoint

1. Add a new `if` block in the `fetch` handler.
2. Choose `networkFirst` or `staleWhileRevalidate`.
3. Bump `CACHE_VERSION` and redeploy.

---

## ✅ Post-Generation Checklist

- [ ] **Replace placeholder icons** — convert `public/icons/icon-192.svg` and `icon-512.svg` to real PNGs (use [Squoosh](https://squoosh.app), Inkscape, or `sharp` CLI).
- [ ] **Set real API key** — update `MEALDB_API_KEY` in `server/.env` if you have a paid MealDB key.
- [ ] **Configure CORS** — set `CLIENT_ORIGIN` in server env vars when deploying to production.
- [ ] **Bump SW version** — change `CACHE_VERSION` in `public/sw.js` after first deployment so updates are picked up.
- [ ] **Add a `.gitignore`** at the repo root to exclude `node_modules`, `.env`, and `dist`.
- [ ] **(Optional)** Add `npx shadcn-ui@latest add` for any extra components (Accordion, Select, Sheet, etc.).
- [ ] **(Optional)** Add random meal button on the Home page using `GET /api/random`.
- [ ] **(Optional)** Add unit tests with Vitest + React Testing Library.

---

## 📜 License

MIT
