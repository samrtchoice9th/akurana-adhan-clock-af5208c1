

# Fix: App Not Updating After Republish (Stale Cache)

## Root Cause

The service worker (`sw.js`) has a **static cache name** (`akurana-prayer-v3`) that never changes between deploys. When you republish:

1. The old service worker stays active and serves cached files
2. Even though it uses "network-first" for JS/CSS, the **service worker file itself** is cached by the browser — so the new SW never installs
3. The `skipWaiting()` only runs on install, but install never triggers because the browser thinks the SW hasn't changed (same URL with same query params)

Additionally, Vite already adds content hashes to JS/CSS filenames (e.g., `index-abc123.js`), so caching those is redundant and harmful — the old SW intercepts requests for new hashed filenames and returns stale cached versions.

## Fix Strategy

### 1. Auto-versioned cache name using a build timestamp
Inject a `BUILD_VERSION` constant into `sw.js` so every deploy gets a new cache name. This triggers the install event → old caches get deleted → fresh content loads.

### 2. Simplify the fetch handler
Since Vite already hashes asset filenames, the SW only needs to cache the small set of static assets (icons, manifest). For everything else (HTML, JS, CSS), go **network-only** — no caching. This eliminates stale cache entirely.

### 3. Add an update-on-reload mechanism
In `main.tsx`, detect when a new SW is waiting and immediately activate it, then reload the page. This ensures users get the update on their next visit without manual cache clearing.

### 4. Force one-time cache bust for existing 200+ users
Increment the cache name from `v3` to `v4`. On activate, the old `v3` cache gets deleted. Combined with `skipWaiting()` + `clients.claim()`, existing users will get the new version on next page load.

## Files to Modify

| File | Change |
|------|--------|
| `public/sw.js` | New versioned cache name (`v4`), network-only for HTML/JS/CSS, keep cache-first only for icons/manifest |
| `src/main.tsx` | Add SW update detection — when new SW is waiting, call `skipWaiting` and reload |
| `vite.config.ts` | Define `__BUILD_VERSION__` as a global constant injected at build time |

## Key Behavior After Fix
- **Existing users**: On next visit, new SW installs (different cache name), deletes old cache, `skipWaiting()` activates immediately, page reloads with fresh content
- **Future deploys**: Each build gets a new `BUILD_VERSION`, triggering the same clean update cycle automatically
- **No manual action needed** by any of the 200+ users

